declare global {
  interface Window {
    electron: {
      openDirectory: () => Promise<string[]>;
      openFile: () => Promise<string[]>;
      readMetadata: (filePath: string) => Promise<any>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      downloadTrack: (videoId: string, title?: string, artist?: string) => Promise<any>;
      getDownloadPath: (videoId: string) => Promise<string | null>;
      getStorageSize: () => Promise<number>;
      openDownloadFolder: () => Promise<boolean>;
      onDownloadProgress: (callback: (data: any) => void) => void;
      saveData: (key: string, data: any) => Promise<boolean>;
      loadData: (key: string) => Promise<any>;
      setAutoStart: (enabled: boolean) => Promise<boolean>;
      clearCache: () => Promise<boolean>;
      log: (level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) => Promise<boolean>;
      exportLogs: () => Promise<string | null>;
      getSystemPerf: () => Promise<{ ramMB: number; uptime: number; platform: string; arch: string }>;
    };
  }
}

export { };
