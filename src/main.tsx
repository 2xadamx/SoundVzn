import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './utils/webCompat';

// ── OAuth Popup Callback ──────────────────────────────────────────────────────
// When Google/Discord redirects back to our origin inside a popup,
// send the URL params to the opener and keep this lightweight page instead of mounting the app again.
const isOAuthPopup = !!window.opener && window.opener !== window && (!!window.location.search || !!window.location.hash);
if (isOAuthPopup) {
    try {
        window.opener.postMessage({
            type: 'svzn_oauth_callback',
            search: window.location.search,
            hash: window.location.hash,
        }, window.location.origin);
        document.body.innerHTML = '<div style="background:#020205;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">Autenticacion completada. Puedes cerrar esta ventana.</div>';
    } catch (_) {}
}
// ─────────────────────────────────────────────────────────────────────────────

// FIX INSTANTÁNEO ERROR 431: Limpiar cookies y datos corruptos.
document.cookie.split(";").forEach((c) => {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// Limpiar token si es demasiado grande (>10KB = token corrupto o con demasiados datos)
const existingToken = localStorage.getItem('svzn_token');
if (existingToken && existingToken.length > 10000) {
    console.warn('[Main] Token demasiado grande, limpiando sesión...');
    localStorage.removeItem('svzn_token');
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('svzn_refresh');
    localStorage.removeItem('clear_431_done');
}

if (localStorage.getItem('clear_431_done') !== 'true') {
    localStorage.removeItem('svzn_token');
    localStorage.removeItem('auth_access_token');
    localStorage.setItem('clear_431_done', 'true');
}

// Lazy load App to ensure webCompat is initialized and reduce initial bundle pressure
const mountApp = async () => {
  try {
    const { default: App } = await import('./App');
    const root = document.getElementById('root');
    if (root) {
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
  } catch (err) {
    console.error('[Main] Failed to mount application:', err);
    const root = document.getElementById('root');
    if (root) {
      const panel = document.createElement('div');
      panel.style.cssText = 'color:#ff5555;background:#1a1a1a;padding:20px;height:100vh;font-family:monospace;overflow:auto;';

      const title = document.createElement('h1');
      title.style.cssText = 'font-size:24px;margin-bottom:10px;';
      title.textContent = 'Render Error';

      const message = document.createElement('p');
      message.style.cssText = 'font-size:16px;color:#fff;';
      message.textContent = err instanceof Error ? err.message : String(err);

      const stack = document.createElement('pre');
      stack.style.cssText = 'background:#000;padding:10px;border-radius:5px;margin-top:10px;';
      stack.textContent = err instanceof Error ? err.stack || 'No stack trace' : 'No stack trace';

      panel.append(title, message, stack);
      root.replaceChildren(panel);
    }
  }
};

if (!isOAuthPopup) {
  mountApp();
}
