export {};

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isRabby?: boolean;
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
      on?: (eventName: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (eventName: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}
