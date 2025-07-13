declare module 'stockfish' {
  export interface Engine {
    onmessage: (msg: string) => void;
    postMessage: (cmd: string) => void;
  }

  export default function Stockfish(): Engine;
} 