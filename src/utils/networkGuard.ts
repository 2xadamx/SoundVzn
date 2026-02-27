let guardInstalled = false;
let offlineModeEnabled = false;
let originalFetch: typeof fetch | null = null;
let originalSend: typeof XMLHttpRequest.prototype.send | null = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.fetch === 'function';
}

function safelyReject(): Promise<Response> {
  return Promise.reject(new Error('SoundVizion está en modo offline.'));
}

export function installNetworkGuard() {
  if (!isBrowser() || guardInstalled) return;

  guardInstalled = true;
  originalFetch = window.fetch.bind(window);
  window.fetch = (...args: Parameters<typeof fetch>) => {
    if (offlineModeEnabled) return safelyReject();
    return originalFetch!(...args);
  };

  originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args: Parameters<typeof XMLHttpRequest.prototype.send>) {
    if (offlineModeEnabled) {
      setTimeout(() => {
        this.dispatchEvent(new ProgressEvent('error'));
        this.dispatchEvent(new ProgressEvent('abort'));
      }, 0);
      this.abort();
      return;
    }
    return originalSend!.apply(this, args);
  };
}

export function removeNetworkGuard() {
  if (!guardInstalled) return;
  guardInstalled = false;
  if (originalFetch) window.fetch = originalFetch;
  if (originalSend) XMLHttpRequest.prototype.send = originalSend;
}

export function setNetworkOffline(enabled: boolean) {
  offlineModeEnabled = enabled;
}

export function isNetworkOffline() {
  return offlineModeEnabled;
}
