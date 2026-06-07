/**
 * SoundVzn Web Compatibility Bridge
 * Ensures the app doesn't crash when running outside of Electron.
 */

const isElectron = !!(window as any).electron;

export const webCompat = {
  isElectron,
  
  // Safe wrapper for Electron calls
  async callElectron<T>(method: string, ...args: any[]): Promise<T | null> {
    if (isElectron && (window as any).electron?.[method]) {
      try {
        return await (window as any).electron[method](...args);
      } catch (e) {
        console.warn(`[WebCompat] Electron call failed: ${method}`, e);
        return null;
      }
    }
    return null;
  },

  // Storage Fallback
  async loadData(key: string): Promise<any> {
    if (isElectron) return this.callElectron('loadData', key);
    try {
      const val = localStorage.getItem(`svzn_db_${key}`);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async saveData(key: string, data: any): Promise<boolean> {
    if (isElectron) return !!(await this.callElectron('saveData', key, data));
    try {
      localStorage.setItem(`svzn_db_${key}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
};

// Initialize global window object if missing
if (!isElectron) {
    (window as any).electron = {
        loadData: (key: string) => webCompat.loadData(key),
        saveData: (key: string, data: any) => webCompat.saveData(key, data),
        minimize: () => {},
        maximize: () => {},
        close: () => {},
        log: (lvl: string, msg: string) => console.log(`[${lvl}] ${msg}`),
        getSystemPerf: () => Promise.resolve({ ramMB: 0, uptime: 0, platform: 'web', arch: 'wasm' })
    };
    console.log('[WebCompat] Virtual Electron Bridge initialized for Web Mode.');
}
