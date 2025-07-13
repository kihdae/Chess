import Stockfish, { Engine } from 'stockfish';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export class ChessAI {
  private engine: Engine;
  private isReady: boolean = false;
  private moveTime: number = 1000; 
  private skillLevel: number = 10; // Default to medium difficulty (range: 0-20)

  constructor() {
    this.engine = Stockfish();
    this.initializeEngine();
  }

  private initializeEngine(): void {
    this.engine.onmessage = (msg: string) => {
      if (msg === 'readyok') {
        this.isReady = true;
      }
    };

    // Initialize engine with standard settings
    this.engine.postMessage('uci');
    this.engine.postMessage('isready');
    this.engine.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
  }

  public async getBestMove(fen: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Engine not ready'));
        return;
      }

      let moveTimeout: NodeJS.Timeout;

      const messageHandler = (msg: string) => {
        const bestMove = msg.match(/bestmove\s+(\S+)/);
        if (bestMove) {
          clearTimeout(moveTimeout);
          this.engine.onmessage = () => {}; 
          resolve(bestMove[1]);
        }
      };

      this.engine.onmessage = messageHandler;

      // Set position and calculate
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go movetime ${this.moveTime}`);

      // Set a timeout in case engine doesn't respond
      moveTimeout = setTimeout(() => {
        this.engine.onmessage = () => {}; 
        reject(new Error('Engine timeout'));
      }, this.moveTime + 1000);
    });
  }

  public setDifficulty(level: AIDifficulty): void {
    switch (level) {
      case 'easy':
        this.moveTime = 500;
        this.skillLevel = 5;
        break;
      case 'medium':
        this.moveTime = 1000;
        this.skillLevel = 10;
        break;
      case 'hard':
        this.moveTime = 2000;
        this.skillLevel = 20;
        break;
    }

    this.engine.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
  }

  public cleanup(): void {
    this.engine.postMessage('quit');
  }
}

// Singleton instance for the AI
let aiInstance: ChessAI | null = null;

export function getAI(): ChessAI {
  if (!aiInstance) {
    aiInstance = new ChessAI();
  }
  return aiInstance;
} 