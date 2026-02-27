import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import type { Request, Response, NextFunction } from 'express';
import type Stripe from 'stripe';

const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
import path from 'path';
const StripeClient = require('stripe');
import { mailer } from './mailer';
import { authController } from './authController';
import { registerYouTubeRoutes } from './backend/youtube';
import { logInfo } from './backend/logger';


// Backend: solo variables SIN prefijo VITE_ (VITE_ es solo para frontend en Vite)
const projectRoot = process.cwd();
const envPath = path.resolve(projectRoot, '.env');
dotenv.config({ path: envPath });
console.log('[Backend] Loading env from:', envPath);
if (!process.env.JWT_SECRET) {
  // Fallback a userData si no está en root (raro, pero preventivo)
  const fallbackEnv = path.resolve(process.env.SOUNDVZN_USER_DATA || projectRoot, '.env');
  dotenv.config({ path: fallbackEnv });
  console.log('[Backend] JWT_SECRET missing, trying fallback env:', fallbackEnv);
}

console.log('[Backend] Spotify Client ID loaded:', !!process.env.SPOTIFY_CLIENT_ID);
console.log('[Backend] Last.fm API Key loaded:', !!(process.env.LAST_FM_API_KEY || process.env.VITE_LASTFM_API_KEY));
console.log('[Backend] Stripe Secret Key loaded:', !!process.env.STRIPE_SECRET_KEY);
logInfo(`Backend env loaded path=${envPath}`);

const stripe = new StripeClient(process.env.STRIPE_SECRET_KEY || '');

const app = express();

// CORS Configuration - Ultra Robust
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Webhook route MUST be before express.json() for Stripe signatures
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event | undefined;

  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret) as Stripe.Event;
    } else {
      event = JSON.parse(req.body.toString()) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`[Webhook] Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!event) return res.status(400).send('Event unknown');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer_email) {
        await mailer.sendProActivationEmail(session.customer_email, 'Usuario Pro');
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('❌ Suscripción cancelada:', subscription.id);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('💰 Factura pagada:', invoice.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('⚠️ Pago de factura fallido:', invoice.id);
      break;
    }
    default:
      console.log(`[Webhook] Evento no manejado: ${event.type}`);
  }
  res.json({ received: true });
});

app.use(express.json());
const SPOTIFY_HTTP_TIMEOUT_MS = 5000;
const STREAM_HTTP_TIMEOUT_MS = 60000; // Increased to 1 min for stability
const YT_USER_AGENT =
  process.env.YT_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

registerYouTubeRoutes(app, YT_USER_AGENT);
// Auth Polling State
let pendingAuthToken: string | null = null;

app.get('/api/auth/poll', (_req: Request, res: Response) => {
  if (pendingAuthToken) {
    const token = pendingAuthToken;
    pendingAuthToken = null;
    return res.json({ token });
  }
  res.json({ token: null });
});

app.get('/api/auth/callback', (req: Request, res: Response) => {
  const { token } = req.query;
  if (token) {
    pendingAuthToken = token as string;
    return res.send(`
      <div style="background:#020205;color:white;height:100vh;display:flex;align-items:center;justify-center;font-family:sans-serif;text-align:center;">
        <div>
          <h1 style="color:#0ea5e9">Autenticación Exitosa</h1>
          <p>Puedes cerrar esta ventana y volver a SoundVizion.</p>
        </div>
      </div>
    `);
  }
  res.status(400).send('Invalid token');
});

// Proxy for local files to bypass Chrome security
app.get('/api/local/file', (req: Request, res: Response) => {
  let filePath = req.query.path as string;
  if (!filePath) return res.status(400).send('Missing path');

  // Clean file:/// prefix and decode
  filePath = filePath.replace(/^file:\/\/\/?/, '');
  filePath = decodeURIComponent(filePath);

  // Normalize Windows paths (/C:/ -> C:/)
  if (/^\/[a-zA-Z]:/.test(filePath)) {
    filePath = filePath.substring(1);
  }

  console.log(`[Proxy] Serving local file: ${filePath}`);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[Proxy] Error serving file ${filePath}:`, err);
      if (!res.headersSent) res.status(500).send('Error serving file');
    }
  });
});

// ——— FASE 1.1: Backend Spotify Robusto ———
let spotifyCachedToken: string | null = null;
let spotifyTokenExpiresAt: number = 0;
const SPOTIFY_TOKEN_MARGIN_MS = 60 * 1000; // Renovar 1 min antes de expirar

// Backend: SOLO variables de entorno directas. NUNCA usar fallback a VITE_* para secretos.
function getSpotifyCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL: Spotify Client ID or Secret missing in backend environment.');
    return null;
  }
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

async function fetchSpotifyToken(): Promise<{ access_token: string; expires_in: number }> {
  const creds = getSpotifyCredentials();
  if (!creds) {
    throw new Error('Spotify Client ID o Client Secret no configurados en el backend. Usa SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en .env');
  }

  const body = 'grant_type=client_credentials';
  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      body,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        timeout: SPOTIFY_HTTP_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: (s: number) => s === 200,
      }
    );
    return { access_token: response.data.access_token, expires_in: response.data.expires_in };
  } catch (error: any) {
    console.error('Error fetching Spotify token:', error.response?.data || error.message);
    throw error;
  }
}

async function getSpotifyTokenBackend(): Promise<string> {
  const now = Date.now();
  // Return cached token if valid
  if (spotifyCachedToken && now < spotifyTokenExpiresAt - SPOTIFY_TOKEN_MARGIN_MS) {
    return spotifyCachedToken;
  }

  console.log('Refreshing Spotify token...');
  const data = await fetchSpotifyToken();
  spotifyCachedToken = data.access_token;
  spotifyTokenExpiresAt = now + data.expires_in * 1000;
  console.log('Spotify token refreshed successfully.');
  return spotifyCachedToken;
}



// Health Check Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.send('SoundVizion Backend API is running correctly.');
});

// Diagnostic Endpoint para el usuario
app.get('/api/debug/diagnostic', async (_req: Request, res: Response) => {
  const lastfmKey = (process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY || '').trim();
  const spotifyCreds = getSpotifyCredentials();

  const diagnostic: any = {
    env: {
      SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
      lastfm_api_key: !!lastfmKey,
      google_client_id: !!process.env.VITE_GOOGLE_CLIENT_ID,
      envPath: envPath,
      userDataPath: projectRoot,
    },

    version: '4.3_diag',
    spotifyStatus: 'Not tested',
    lastfmStatus: 'Checking...',
  };

  // Test Last.fm
  try {
    if (lastfmKey) {
      const lfmTest = await axios.get(`https://ws.audioscrobbler.com/2.0/?method=artist.getTopTracks&artist=Radiohead&api_key=${lastfmKey}&format=json&limit=1`, { timeout: 3000 });
      diagnostic.lastfmStatus = lfmTest.data ? 'OK' : 'Empty response';
    } else {
      diagnostic.lastfmStatus = 'MISSING_KEY';
    }
  } catch (err: any) {
    diagnostic.lastfmStatus = `ERROR: ${err.response?.status || err.message} - ${JSON.stringify(err.response?.data || {})}`;
  }

  // Test Spotify
  try {
    if (spotifyCreds) {
      const token = await getSpotifyTokenBackend();
      diagnostic.spotifyStatus = token ? 'OK (Token obtained)' : 'FAILED (No token)';
    } else {
      diagnostic.spotifyStatus = 'MISSING_CREDS';
    }
  } catch (err: any) {
    diagnostic.spotifyStatus = `ERROR: ${err.response?.status || err.message} - ${JSON.stringify(err.response?.data || {})}`;
  }

  res.json(diagnostic);
});

// ——— FASE 1.5: OAuth Bridge for Electron ———
// Este endpoint sirve una página HTML que extrae el token del fragmento # y lo envía al servidor
app.get('/callback', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <body style="background: #050505; color: white; font-family: sans-serif; display: flex; flex-direction: column; items-center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
        <h1 style="font-weight: 900; letter-spacing: -2px; margin-bottom: 8px;">SOUNDVIZION</h1>
        <p style="color: rgba(255,255,255,0.4); font-weight: bold; font-size: 14px;">AUTENTICACIÓN COMPLETADA</p>
        <div style="margin-top: 32px; padding: 16px 32px; background: rgba(255,255,255,0.05); border: 1px border rgba(255,255,255,0.1); border-radius: 24px;">
          <p id="status">Sincronizando con la aplicación...</p>
        </div>
        <script>
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const token = params.get('access_token');
          
          if (token) {
            fetch('/api/auth/set-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            })
            .then(() => {
              document.getElementById('status').innerText = '✅ ¡Listo! Puedes cerrar esta pestaña y volver a SoundVizion.';
              document.getElementById('status').style.color = '#10b981';
            })
            .catch(err => {
              document.getElementById('status').innerText = '❌ Error al sincronizar. Inténtalo de nuevo.';
              document.getElementById('status').style.color = '#ef4444';
            });
          } else {
            document.getElementById('status').innerText = '❌ No se encontró token de acceso.';
          }
        </script>
      </body>
    </html>
  `);
});

let latestGoogleToken: string | null = null;

app.post('/api/auth/set-token', (req: Request, res: Response) => {
  latestGoogleToken = req.body.token;
  console.log('✅ Google Token captured via callback');
  res.json({ success: true });
});

app.get('/api/auth/poll', (_req: Request, res: Response) => {
  if (latestGoogleToken) {
    const token = latestGoogleToken;
    latestGoogleToken = null; // Consumir una sola vez
    return res.json({ token });
  }
  res.json({ token: null });
});

// ——— FASE 5: Mega Security Auth Endpoints ———

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await authController.signup(email, password, name, ip);
    res.json({ success: true, message: 'OTP sent', dev_code: result.dev_code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    await authController.verifyCode(email, code, ip);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await authController.resendVerificationCode(email, ip);
    res.json({ success: true, dev_code: result.dev_code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const data = await authController.login(email, password, ip);
    res.json(data);
  } catch (err: any) {
    const status = err.message.includes('NO_VERIFICADA') ? 403 : 401;
    res.status(status).json({ error: err.message });
  }
});

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Missing refresh token' });
    const data = await authController.refreshAuthToken(refresh_token);
    res.json(data);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/reset-request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await authController.requestPasswordReset(email, ip);
    res.json({ success: true, dev_code: result?.dev_code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    await authController.resetPasswordWithOTP(email, code, newPassword, ip);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Auth Middleware Helper
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  const user = authController.verifyAccessToken(token);
  if (!user) return res.status(403).json({ error: 'Token invalid or expired' });

  req.user = user;
  next();
};

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

app.get('/api/auth/security-dashboard', authenticateToken, (req: any, res) => {
  try {
    const data = authController.getSecurityDashboard(req.user.id);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/update-profile', authenticateToken, async (req: any, res) => {
  try {
    const { name } = req.body;
    await authController.updateProfile(req.user.id, { name });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/audit-logs', authenticateToken, (req: any, res) => {
  try {
    const logs = authController.getAuditLogs(req.user.id);
    res.json({ logs });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// MANDATORY Endpoint requested by user: POST /api/spotify-token
app.post('/api/spotify-token', async (_req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const expiresIn = Math.max(0, Math.floor((spotifyTokenExpiresAt - Date.now()) / 1000));
    return res.json({ access_token: token, expires_in: expiresIn });
  } catch (error: any) {
    console.error('Error al obtener token de Spotify en backend:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to get Spotify token from backend',
      details: error.response?.data || error.message,
    });
  }
});

// Proxy endpoints for search and data using the backend token
// GET /api/spotify/search?q=...&type=track|artist|album&limit=...
app.get('/api/spotify/search', async (req: Request, res: Response) => {
  const { q, type = 'track', limit = '20' } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: SPOTIFY_HTTP_TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data;
    console.error('Spotify search error:', data || error.message);
    return res.status(status).json(data || { error: 'Spotify search failed' });
  }
});

// GET /api/spotify/albums/:id
app.get('/api/spotify/albums/:id', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(`https://api.spotify.com/v1/albums/${req.params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: SPOTIFY_HTTP_TIMEOUT_MS,
    });
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify album failed' });
  }
});

// GET /api/spotify/albums/:id/tracks
app.get('/api/spotify/albums/:id/tracks', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(`https://api.spotify.com/v1/albums/${req.params.id}/tracks?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: SPOTIFY_HTTP_TIMEOUT_MS,
    });
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify album tracks failed' });
  }
});

// GET /api/spotify/albums?ids=id1,id2,...
app.get('/api/spotify/albums', async (req: Request, res: Response) => {
  const ids = req.query.ids as string;
  if (!ids) return res.status(400).json({ error: 'Missing ids query' });
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(`https://api.spotify.com/v1/albums?ids=${ids}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: SPOTIFY_HTTP_TIMEOUT_MS,
    });
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify albums failed' });
  }
});

// GET /api/spotify/artists/:id
app.get('/api/spotify/artists/:id', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(`https://api.spotify.com/v1/artists/${req.params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: SPOTIFY_HTTP_TIMEOUT_MS,
    });
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify artist failed' });
  }
});

// GET /api/spotify/artists/:id/top-tracks?market=US
app.get('/api/spotify/artists/:id/top-tracks', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const market = (req.query.market as string) || 'US';
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${req.params.id}/top-tracks?market=${market}`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: SPOTIFY_HTTP_TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify top tracks failed' });
  }
});

// GET /api/spotify/artists/:id/albums
app.get('/api/spotify/artists/:id/albums', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const limit = (req.query.limit as string) || '20';
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${req.params.id}/albums?limit=${limit}&include_groups=album,single`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: SPOTIFY_HTTP_TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify artist albums failed' });
  }
});

// GET /api/spotify/artists/:id/related-artists
app.get('/api/spotify/artists/:id/related-artists', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${req.params.id}/related-artists`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: SPOTIFY_HTTP_TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify related artists failed' });
  }
});

// GET /api/spotify/playlists/:id
app.get('/api/spotify/playlists/:id', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${req.params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: SPOTIFY_HTTP_TIMEOUT_MS,
    });
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify playlist failed' });
  }
});

// GET /api/spotify/browse/new-releases?limit=...
app.get('/api/spotify/browse/new-releases', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const limit = (req.query.limit as string) || '20';
    const response = await axios.get(
      `https://api.spotify.com/v1/browse/new-releases?limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: SPOTIFY_HTTP_TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify new-releases failed' });
  }
});

// GET /api/spotify/recommendations?seed_tracks=...&limit=...
app.get('/api/spotify/recommendations', async (req: Request, res: Response) => {
  try {
    const token = await getSpotifyTokenBackend();
    const seedTracks = (req.query.seed_tracks as string) || '';
    const limit = (req.query.limit as string) || '20';
    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: SPOTIFY_HTTP_TIMEOUT_MS }
    );
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: 'Spotify recommendations failed' });
  }
});

// Last.fm: solo LASTFM_API_KEY en backend
app.get('/api/lastfm/trackInfo', async (req: Request, res: Response) => {
  const LASTFM_API_KEY = process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY;
  const { artist, track } = req.query;

  if (!LASTFM_API_KEY) {
    console.error('ERROR: Last.fm API Key no configurada en el backend.');
    return res.status(500).json({ error: 'Last.fm API Key not configured in backend' });
  }
  if (!artist || !track) {
    return res.status(400).json({ error: 'Missing artist or track for Last.fm trackInfo' });
  }

  try {
    const response = await axios.get(
      `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist as string)}&track=${encodeURIComponent(track as string)}&format=json`
    );
    res.json(response.data);
  } catch (error: any) {
    const isSuspended = error.response?.data?.error === 26;
    if (isSuspended) {
      return res.status(200).json({ error: 'service_unavailable', message: 'Last.fm key suspended' });
    }
    console.error('Error al obtener info de track de Last.fm desde el backend:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to get Last.fm track info from backend', details: error.response?.data });
  }
});

app.get('/api/lastfm/artistInfo', async (req: Request, res: Response) => {
  const LASTFM_API_KEY = process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY;
  const { artist } = req.query;

  if (!LASTFM_API_KEY) {
    console.error('ERROR: Last.fm API Key no configurada en el backend.');
    return res.status(500).json({ error: 'Last.fm API Key not configured in backend' });
  }
  if (!artist) {
    return res.status(400).json({ error: 'Missing artist for Last.fm artistInfo' });
  }

  try {
    const response = await axios.get(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist as string)}&format=json`
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Error al obtener info de artista de Last.fm desde el backend:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to get Last.fm artist info from backend', details: error.response?.data });
  }
});

function isAllowedDeezerPreviewUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith('dzcdn.net')) return true;
    if (host.endsWith('deezer.com')) return true;
    return false;
  } catch {
    return false;
  }
}

app.get('/api/deezer/preview', async (req: Request, res: Response) => {
  const url = (req.query.url as string) || '';
  if (!url || !isAllowedDeezerPreviewUrl(url)) {
    return res.status(400).json({ error: 'Invalid preview url' });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': YT_USER_AGENT,
      'Referer': 'https://www.deezer.com/',
      'Origin': 'https://www.deezer.com',
    };

    // BUG FIX (Arquitectura 7.1): Range support for Deezer previews
    if (req.headers.range) {
      headers['Range'] = String(req.headers.range);
    }

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const response = await axios.get(url, {
      responseType: 'stream',
      headers,
      signal: controller.signal,
      timeout: 0,
      maxRedirects: 3,
      validateStatus: (s: number) => s >= 200 && s < 400,
    });

    res.status(response.status);

    // Exact mapping of audio headers
    const h = response.headers;
    if (h['content-type']) res.setHeader('Content-Type', h['content-type']);
    if (h['content-length']) res.setHeader('Content-Length', h['content-length']);
    if (h['accept-ranges']) res.setHeader('Accept-Ranges', h['accept-ranges']);
    if (h['content-range']) res.setHeader('Content-Range', h['content-range']);
    if (h['cache-control']) res.setHeader('Cache-Control', h['cache-control']);

    if (!res.getHeader('Accept-Ranges')) res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);
  } catch (error: any) {
    if (axios.isCancel(error)) return;
    console.error('Deezer preview proxy error:', error.response?.status || '', error.message || error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy preview' });
    }
  }
});

// ——— FASE 2.0: Stripe & Payments (v4.9.7) ———
app.post('/api/payments/create-checkout-session', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID_PRO.includes('_TEST_')) {
    return res.status(400).json({
      error: 'STRIPE_PRICE_ID_PRO no configurado o inválido. Por favor, crea un producto en tu Dashboard de Stripe y añade el ID real al archivo .env'
    });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID_PRO,
        quantity: 1,
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
      },
      customer_email: email,
      return_url: `http://localhost:5199/#/profile?session_id={CHECKOUT_SESSION_ID}&success=true`,
    });

    res.json({ clientSecret: session.client_secret });
  } catch (error: any) {
    console.error('[Stripe] Error creating checkout session:', error.message);
    // Asegurar que incluso los errores devuelvan cabeceras CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: error.message, hint: 'Verifica que tu STRIPE_PRICE_ID_PRO sea válido en tu cuenta de Stripe.' });
  }
});

app.post('/api/payments/create-portal-session', async (req: Request, res: Response) => {
  const { customerId, email } = req.body;
  try {
    let finalCustomerId = customerId;

    if (!finalCustomerId && email) {
      const customers = await stripe.customers.list({ email: email, limit: 1 });
      if (customers.data.length > 0) {
        finalCustomerId = customers.data[0].id;
      }
    }

    if (!finalCustomerId) {
      return res.status(400).json({ error: 'No se encontró un cliente de Stripe asociado a este usuario.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: finalCustomerId,
      return_url: 'http://localhost:5199/#/profile',
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments/confirm-success', async (req: Request, res: Response) => {
  const { sessionId, email, name } = req.body;
  console.log(`[Stripe] Confirming success for session: ${sessionId}, email: ${email}`);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`[Stripe] Session retrieved, status: ${session.payment_status}`);

    if (session.payment_status === 'paid' || session.subscription) {
      console.log(`[Stripe] Sending Pro activation email to: ${email}`);
      try {
        await mailer.sendProActivationEmail(email, name || 'Usuario');
        console.log(`[Stripe] Email sent successfully`);
      } catch (mailErr: any) {
        console.error(`[Stripe] Mailer error:`, mailErr.message);
      }

      res.json({
        success: true,
        customerId: session.customer,
        subscriptionId: session.subscription
      });
    } else {
      console.warn(`[Stripe] Session not paid yet: ${session.payment_status}`);
      res.status(400).json({ success: false, status: session.payment_status });
    }
  } catch (error: any) {
    console.error(`[Stripe] Confirmation error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/welcome-email', async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).end();
  await mailer.sendWelcomeEmail(email, name || 'Usuario');
  res.json({ success: true });
});

const BACKEND_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export function startBackendApi() {
  const server = app.listen(BACKEND_PORT, '0.0.0.0', () => {
    console.log(`FASE 1.1: Backend Spotify Robusto iniciado en puerto ${BACKEND_PORT}`);
    logInfo(`Backend started port=${BACKEND_PORT}`);
  });

  // CRITICAL: Disable all timeouts for audio streaming
  server.timeout = 0;
  server.keepAliveTimeout = 0;
  server.headersTimeout = 0;
}
