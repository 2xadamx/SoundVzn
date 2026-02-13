declare global {
  interface Window {
    electron: {
      openDirectory: () => Promise<string[]>;
      openFile: () => Promise<string[]>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

export {};
