import { Engine } from 'stockfish';

export class ChessAI {
  private engine: Engine;
  private isReady: boolean = false;
  private moveTime: number = 1000; // Time to think in milliseconds

  constructor() {
    this.engine = new Engine();
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
  }

  public async getBestMove(fen: string): Promise<string> {
    return new Promise((resolve) => {
      // Wait for engine to be ready
      const waitForEngine = () => {
        if (!this.isReady) {
          // Use window.setTimeout in browser environment
          if (typeof window !== 'undefined') {
            window.setTimeout(waitForEngine, 100);
          } else {
            // Use global setTimeout in Node.js environment
            global.setTimeout(waitForEngine, 100);
          }
          return;
        }

        this.engine.onmessage = (msg: string) => {
          const bestMove = msg.match(/bestmove\s+(\S+)/);
          if (bestMove) {
            resolve(bestMove[1]);
          }
        };

        // Set position and calculate
        this.engine.postMessage(`position fen ${fen}`);
        this.engine.postMessage(`go movetime ${this.moveTime}`);
      };

      waitForEngine();
    });
  }

  public setDifficulty(level: 'easy' | 'medium' | 'hard'): void {
    // Adjust engine parameters based on difficulty
    switch (level) {
      case 'easy':
        this.moveTime = 500;
        this.engine.postMessage('setoption name Skill Level value 5');
        break;
      case 'medium':
        this.moveTime = 1000;
        this.engine.postMessage('setoption name Skill Level value 10');
        break;
      case 'hard':
        this.moveTime = 2000;
        this.engine.postMessage('setoption name Skill Level value 20');
        break;
    }
  }

  public cleanup(): void {
    this.engine.postMessage('quit');
  }
} 