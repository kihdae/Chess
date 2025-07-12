declare module 'stockfish' {
  export class Engine {
    constructor();
    onmessage: (msg: string) => void;
    postMessage(command: string): void;
  }
} 