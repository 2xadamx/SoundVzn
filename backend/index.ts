import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { mailer } from './mailer.js';
import { authController } from './authController.js';
import { SessionGuard } from './utils/sessionGuard.js';
import { registerYouTubeRoutes } from './internal/youtube.js';
import { logInfo } from './internal/logger.js';
import { externalHttpConfig } from './utils/httpClient.js';
import { db } from './db/index.js';
import * as secrets from './secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// En producción (dist/index.js): __dirname = backend/dist/ → subir 2 niveles
// En desarrollo (ts-node): __dirname = backend/ → subir 1 nivel
const envPath1 = path.join(__dirname, '..', '.env');      // desarrollo (ts-node)
const envPath2 = path.join(__dirname, '../..', '.env');    // producción (dist/)
dotenv.config({ path: envPath1 });
if (!process.env.JWT_SECRET) {
  dotenv.config({ path: envPath2 });
}
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
console.log('[Config] PORT from env:', process.env.PORT || '(not set, using default)');
console.log('[Config] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('[Config] JWT_SECRET present:', !!process.env.JWT_SECRET);

const isDevServer = process.env.NODE_ENV !== 'production';
const isLocalhostIp = (ip: string) =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  LASTFM_API_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} = secrets;

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as any,
  });
}

import { createServer } from 'node:http';
import { SocketService } from './services/SocketService.js';

const app = express();
const httpServer = createServer(app);
const socketService = new SocketService(httpServer);

// CORS Configuration — dinámica para soportar dominio de producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5200',
  'http://127.0.0.1:5200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
try {
  // Soporte para múltiples URLs (separadas por coma)
  if (process.env.FRONTEND_URL) {
    (process.env.FRONTEND_URL || '').split(',').forEach(url => {
      const trimmedUrl = url.trim();
      if (trimmedUrl && !allowedOrigins.includes(trimmedUrl)) {
        allowedOrigins.push(trimmedUrl);
      }
    });
  }
  // Soporte para subdominios Cloud Run / producción
  if (process.env.PRODUCTION_URL) {
    (process.env.PRODUCTION_URL || '').split(',').forEach(url => {
      const trimmedUrl = url.trim();
      if (trimmedUrl && !allowedOrigins.includes(trimmedUrl)) {
        allowedOrigins.push(trimmedUrl);
      }
    });
  }
} catch (e) {
  console.error('[CORS] Error parsing frontend URLs:', e);
}

app.use(cors({
  origin: (origin, callback) => {
    // Permitir CUALQUIER origen para evitar problemas con nuevas URLs
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-SoundVzn-Identity']
}));

app.use(cookieParser());

// ——— SECURITY REINFORCEMENT ———
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Managed by Vite in dev
}));

// Global Rate Limiting (Prevent DDoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { error: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// REINFORCEMENT: Anti-CSRF Identity Guard
// Rutas exentas: webhooks, callbacks OAuth, y rutas de auth social que el backend llama directamente
const CSRF_EXEMPT_PATHS = [
  '/api/payments/webhook',
  '/api/auth/set-token',
  '/api/auth/google/login',
  '/api/auth/discord/login',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/reset-request',
  '/api/auth/reset-password',
  '/api/auth/verify',
  '/api/auth/resend-verification',
];

app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const isExempt = CSRF_EXEMPT_PATHS.some(p => req.path.startsWith(p));
  if (isExempt) return next();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const identity = req.headers['x-soundvzn-identity'];
    if (identity !== 'SVZN-CORE-AUTH') {
      console.warn(`[Security] CSRF ATTEMPT DETECTED from IP: ${req.ip} path: ${req.path}`);
      return res.status(403).json({ error: 'Security Identity Verification Failed' });
    }
  }
  next();
});

import { requestSanitizer } from './middleware/sanitizer.js';

// ... (Rest of imports)

import { sentinel } from './middleware/sentinel.js';

// ... (In middlewares)
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook') return next();
  return express.json()(req, res, next);
});
app.use(requestSanitizer);
app.use(sentinel); // REINFORCEMENT: Active Security Guard

// REINFORCEMENT: Audit & Performance Tracer
app.use((req, _res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  
  _res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[Performance] SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms`);
    }
    // Async audit logging could be added here
  });
  next();
});

// HEADER DEBUG LOGGER — disabled in production to avoid disk I/O on every request
// app.use((req, res, next) => { ... });

// Auth Rate Limiting (Prevent Brute Force)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 login attempts per hour
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor intenta en una hora.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/google', authLimiter);

app.use((req, res, next) => {
  // Allow popups to communicate with opener (needed for OAuth popup flow)
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  logInfo(`[${req.method}] ${req.url} from ${req.ip}`);
  next();
});

// Webhook route
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (endpointSecret && sig && stripe) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error(`[Webhook] Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer_email) {
        await mailer.sendProActivationEmail(session.customer_email, 'Usuario Pro');
      }
      break;
    }
    default:
      console.log(`[Webhook] Evento no manejado: ${event.type}`);
  }
  res.json({ received: true });
});

const YT_USER_AGENT = process.env.YT_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
registerYouTubeRoutes(app, YT_USER_AGENT);

// ——— Unified Auth Polling State ———
let pendingAuth = {
  token: null as string | null,
  code: null as string | null
};

app.get('/api/auth/poll', (_req: Request, res: Response) => {
  const result = { ...pendingAuth };
  pendingAuth.token = null;
  pendingAuth.code = null;
  res.json(result);
});

app.post('/api/auth/set-token', (req: Request, res: Response) => {
  const { token, code } = req.body;
  if (token || code) {
    pendingAuth.token = token || null;
    pendingAuth.code = code || null;
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Token/Code missing' });
});

// Health check for frontend
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'online', 
    version: '1.0.1-shifted',
    timestamp: Date.now(),
  });
});

// OAuth Callback handler
app.get('/callback', (req: Request, res: Response) => {
  const code = req.query.code as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Google code flow: redirect to frontend with code in query param
  // The frontend's LoginScreen useEffect will pick it up and call /api/auth/google/login
  if (code) {
    return res.redirect(`${frontendUrl}/?code=${encodeURIComponent(code)}`);
  }

  // Discord implicit flow: token arrives in the URL hash (#access_token=...)
  // The browser doesn't send the hash to the server, so we serve a tiny page
  // that reads the hash and redirects to the frontend with it preserved.
  res.send(`<!DOCTYPE html>
<html>
  <head><title>SoundVzn Auth</title></head>
  <body style="background:#020205;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);padding:40px;border-radius:32px;">
      <h2 style="color:#0ea5e9;margin:0 0 8px 0;">Autenticando...</h2>
      <p style="opacity:0.5;font-size:13px;">Redirigiendo a SoundVzn</p>
    </div>
    <script>
      // Discord sends the token in the URL hash — forward it to the frontend
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        window.location.replace('${frontendUrl}/' + hash);
      } else {
        window.location.replace('${frontendUrl}/');
      }
    </script>
  </body>
</html>`);
});

app.post('/api/auth/discord/login', async (req: Request, res: Response) => {
  try {
    const { access_token } = req.body;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
    const result = await authController.discordLogin(access_token, ip);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/google/login', async (req: Request, res: Response) => {
  try {
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
    const result = await authController.googleLogin(req.body, ip);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Spotify Token Logic
let spotifyCachedToken: string | null = null;
let spotifyTokenExpiresAt: number = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyCachedToken && now < spotifyTokenExpiresAt - 60000) return spotifyCachedToken;

  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    }
  });
  
  spotifyCachedToken = response.data.access_token;
  spotifyTokenExpiresAt = now + response.data.expires_in * 1000;
  return spotifyCachedToken;
}

import { Logger } from './utils/logger.js';
import { ExternalService } from './services/ExternalService.js';

// ... (Rest of imports)

app.post('/api/spotify-token', async (_req, res) => {
  try {
    const token = await ExternalService.getSpotifyToken();
    res.json({ access_token: token });
  } catch (err: any) {
    Logger.error('[API] Spotify token request failed', err.message);
    res.status(502).json({ error: 'Fallo en servicio externo' });
  }
});

// Health check
app.get('/', (req, res) => res.send('SoundVzn Backend Online'));

// ──────────── AUTH MIDDLEWARE ────────────────────────────────────────────────
function authenticateToken(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // REINFORCEMENT: Prefer Cookie Session (Enterprise Grade)
  if (!token) {
    token = SessionGuard.getToken(req);
  }

  if (!token) return res.status(401).json({ error: 'No token provided' });
  const payload = authController.verifyAccessToken(token);
  if (!payload) return res.status(403).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

function optionalAuthenticate(req: any, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token) token = SessionGuard.getToken(req);
  if (token) {
    const payload = authController.verifyAccessToken(token);
    if (payload) req.user = payload;
  }
  next();
}

const metadataAuth = isDevServer ? optionalAuthenticate : authenticateToken;
const userDataAuth = isDevServer ? optionalAuthenticate : authenticateToken;

// ──────────── MISSING AUTH ROUTES ────────────────────────────────────────────
app.post('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const ip = req.ip || '127.0.0.1';
    await authController.verifyCode(email, code, ip);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const ip = req.ip || '127.0.0.1';
    const result = await authController.resendVerificationCode(email, ip);
    res.json({ success: true, dev_code: result.dev_code });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Missing refresh token' });
    const data = await authController.refreshAuthToken(refresh_token);
    res.json(data);
  } catch (err: any) { res.status(401).json({ error: err.message }); }
});

if (isDevServer) {
  app.post('/api/auth/dev-restore', async (req: Request, res: Response) => {
    const ip = req.ip || '127.0.0.1';
    if (!isLocalhostIp(ip)) {
      return res.status(403).json({ error: 'Solo disponible en localhost' });
    }
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requerido' });
      const data = authController.restoreDevSession(email, ip);
      SessionGuard.setSession(res, data.access_token);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
}

app.post('/api/auth/reset-request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const ip = req.ip || '127.0.0.1';
    const result = await authController.requestPasswordReset(email, ip);
    res.json({ success: true, dev_code: result?.dev_code });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    const ip = req.ip || '127.0.0.1';
    await authController.resetPasswordWithOTP(email, code, newPassword, ip);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ──────────── CORE USER ENDPOINTS (PRIORITY) ───────────────────────────────
app.get('/api/user/continue-listening', userDataAuth, (req: any, res: Response) => {
  if (!req.user) return res.json([]);
  console.log(`[API] Success: Fetching continue-listening for user ${req.user.id}`);
  res.json([]);
});

app.post('/api/auth/update-profile', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, username, bio, avatar, banner, genres, anthem } = req.body;
    console.log(`[API] Updating profile for user ${req.user.id}: name=${name}`);
    const updatedUser = await authController.updateProfile(req.user.id, { name, username, bio, avatar, banner, genres, anthem });
    res.json({ success: true, user: updatedUser });
  } catch (err: any) { 
    console.error(`[API] Update profile failure: ${err.message}`);
    res.status(400).json({ error: err.message }); 
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res: Response) => {
  return authController.me(req, res);
});

// ──────────── EXTERNAL APIS PROXY (Spotify & Deezer) ─────────────────────────

app.get(/^\/api\/spotify\/(.*)/, async (req: any, res: Response) => {
  try {
    const spotifyPath = req.params[0] || '';
    const queryParams = req.url.split('?')[1] || '';
    const token = await ExternalService.getSpotifyToken();
    
    const targetUrl = `https://api.spotify.com/v1/${spotifyPath}${queryParams ? '?' + queryParams : ''}`;
    
    const response = await axios.get(targetUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 10000,
      ...externalHttpConfig,
    });
    
    res.json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message;
    console.error(`[Spotify Proxy] Error ${status}: ${message}`);
    res.status(status).json({ error: message });
  }
});

app.get(/^\/api\/deezer\/(.*)/, async (req: any, res: Response) => {
  try {
    const deezerPath = req.params[0] || '';
    const queryParams = req.url.split('?')[1] || '';
    
    const targetUrl = `https://api.deezer.com/${deezerPath}${queryParams ? '?' + queryParams : ''}`;
    
    const response = await axios.get(targetUrl, { timeout: 10000, ...externalHttpConfig });
    res.json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// Public profile by user UUID
app.get('/api/user/:userId', authenticateToken, (req: any, res: Response) => {
  try {
    // Use the global DB instance
    const targetUser = db.prepare('SELECT id, svzn_id, name, username, avatar, banner, bio, tier, anthem FROM users WHERE id = ?').get(req.params.userId) as any;
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    let anthemData = null;
    if (targetUser.anthem) {
      try { anthemData = JSON.parse(targetUser.anthem); } catch (e) {}
    }

    res.json({
      id: targetUser.id,
      svzn_id: targetUser.svzn_id,
      name: targetUser.name,
      username: targetUser.username,
      avatar: targetUser.avatar,
      banner: targetUser.banner,
      bio: targetUser.bio || 'No bio yet',
      tier: targetUser.tier,
      anthem: anthemData
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:userId/playlists', authenticateToken, (req: any, res: Response) => {
  try {
    const playlists = authController.social.getUserPlaylists(req.params.userId);
    res.json(playlists);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:userId/friends', authenticateToken, (req: any, res: Response) => {
  try {
    const friends = authController.social.getUserFriends(req.params.userId);
    res.json(friends);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:userId/anthem', authenticateToken, (req: any, res: Response) => {
  try {
    const anthem = authController.social.getUserAnthem(req.params.userId);
    res.json({ anthem });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});


// ──────────── AUTH ENDPOINTS ────────────────────────────────────────────────
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, username } = req.body;
    const ip = req.ip || '127.0.0.1';
    const result = await authController.signup(email, password, name, username || '', ip);
    res.json({ success: true, dev_code: result.dev_code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || '127.0.0.1';
    await authController.login(req, res); // Updated to handle res directly
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  await authController.logout(req, res);
});

app.get('/api/auth/check-username', async (req: Request, res: Response) => {
  try {
    const u = req.query.u as string;
    if (!u || u.length < 2) return res.json({ available: false });
    const exists = authController.social.checkUsernameExists(u.toLowerCase());
    res.json({ available: !exists });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ──────────── SOCIAL ROUTES ──────────────────────────────────────────────────
app.get('/api/social/friends', authenticateToken, (req: any, res: Response) => {
  try {
    const friends = authController.social.getFriendsPool(req.user.id);
    res.json(friends);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/request', authenticateToken, (req: any, res: Response) => {
  try {
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: 'Target is required' });
    const result = authController.social.addFriendByTarget(req.user.id, target);
    if (result) res.json({ success: true, status: result.status || 'REQUEST_SENT' });
    else res.status(404).json({ error: 'User not found or already added' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/social/friends/:id', authenticateToken, (req: any, res: Response) => {
  try {
    const success = authController.social.removeFriend(req.user.id, req.params.id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/friends/:id/pin', authenticateToken, (req: any, res: Response) => {
  try {
    const ok = authController.social.togglePin(req.user.id, req.params.id);
    res.json({ success: ok });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/friends/:id/mute', authenticateToken, (req: any, res: Response) => {
  try {
    const ok = authController.social.toggleMute(req.user.id, req.params.id);
    res.json({ success: ok });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/social/search', authenticateToken, (req: any, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length < 1) return res.json([]);
    const results = authController.social.searchUsers(q.trim(), req.user.id);
    res.json(results);
  } catch (err: any) { 
    console.error(`[Social API Error] ${err.message}`, err.stack);
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/social/requests', authenticateToken, (req: any, res: Response) => {
  try {
    const requests = authController.social.getPendingRequests(req.user.id);
    res.json(requests);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/respond', authenticateToken, (req: any, res: Response) => {
  try {
    const { senderId, accept } = req.body;
    const ok = authController.social.respondRequest(req.user.id, senderId, accept);
    res.json({ success: ok });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/status', authenticateToken, (req: any, res: Response) => {
  try {
    const success = authController.social.updateActivity(req.user.id, req.body);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/:id/playlists', authenticateToken, (req: any, res: Response) => {
  try {
    const playlists = authController.social.getUserPlaylists(req.params.id);
    res.json(playlists);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/user/:id/playlists', authenticateToken, (req: any, res: Response) => {
  try {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
    const success = authController.social.savePlaylist(req.user.id, req.body);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/notes', authenticateToken, (req: any, res: Response) => {
  try {
    const success = authController.social.saveNote(req.user.id, req.body);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/social/notes', authenticateToken, (req: any, res: Response) => {
  try {
    const success = authController.social.deleteNote(req.user.id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/social/messages/:friendId', authenticateToken, (req: any, res: Response) => {
  try {
    const msgs = authController.social.getChat(req.user.id, req.params.friendId);
    res.json(msgs);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/social/messages/:friendId/clear', authenticateToken, (req: any, res: Response) => {
  try {
    const ok = authController.social.clearChat(req.user.id, req.params.friendId);
    res.json({ success: ok });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/messages', authenticateToken, (req: any, res: Response) => {
  try {
    const { targetId, type, content, trackData } = req.body;
    if (!targetId) return res.status(400).json({ error: 'targetId es requerido' });
    const safeContent = typeof content === 'string' ? content : '';
    const ok = authController.social.sendMessage(req.user.id, targetId, type, safeContent, trackData);
    res.json({ success: ok });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/marketplace/inventory', authenticateToken, (req: any, res: Response) => {
  try {
    const items = authController.social.getUserInventory(req.user.id);
    res.json(items);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Note Interactions ──────────────────────────────────────────────────────────
app.get('/api/social/notes/:noteOwnerId/interactions', authenticateToken, (req: any, res: Response) => {
  try {
    const result = authController.social.getNoteInteractions(req.params.noteOwnerId);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/notes/like', authenticateToken, (req: any, res: Response) => {
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: 'noteId required' });
    const result = authController.social.toggleLike(noteId, req.user.id);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/social/notes/reply', authenticateToken, (req: any, res: Response) => {
  try {
    const { noteId, text } = req.body;
    if (!noteId || !text) return res.status(400).json({ error: 'noteId and text required' });
    const ok = authController.social.addNoteReply(noteId, req.user.id, text);
    res.json({ success: ok });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/stats', authenticateToken, (req: any, res: Response) => {
  try {
    const targetId = (req.query.userId as string) || req.user.id;
    const stats = authController.getUserStats(targetId);
    res.json(stats);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Log playback (scrobble) ──────────────────────────────────────────────────
app.post('/api/user/scrobble', authenticateToken, (req: any, res: Response) => {
  try {
    const { trackId, trackName, artist, album, durationMs } = req.body;
    if (!trackName || !artist) return res.status(400).json({ error: 'trackName and artist required' });
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO play_history (id, user_id, track_id, track_name, artist, album, duration_ms, played_at, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, req.user.id, trackId || id, trackName, artist, album || '', durationMs || 0, Date.now());
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5200;
httpServer.listen(PORT, () => {
  console.log(`[SoundVzn] Enterprise Core ONLINE on port ${PORT}`);
  Logger.info(`[System] Backend frequency established on ${PORT}`);
});

// GLOBAL ERROR BOUNDARY
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error]', err);
  logInfo(`CRITICAL ERROR: ${err.message}`);
  res.status(500).json({ 
    error: 'Error interno del servidor', 
    message: err.message,
    stack: err.stack 
  });
});

// GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});
