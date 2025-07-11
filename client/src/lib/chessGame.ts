import { Chess, Move, Square } from 'chess.js';
import { EventEmitter } from 'events';

export interface GameState {
  fen: string;
  isGameOver: boolean;
  isCheck: boolean;
  turn: 'w' | 'b';
  history: Move[];
}

export class ChessGame extends EventEmitter {
  private game: Chess;
  private gameId: string;

  constructor(gameId: string) {
    super();
    this.game = new Chess();
    this.gameId = gameId;
  }

  public getGameId(): string {
    return this.gameId;
  }

  public getState(): GameState {
    return {
      fen: this.game.fen(),
      isGameOver: this.game.isGameOver(),
      isCheck: this.game.isCheck(),
      turn: this.game.turn(),
      history: this.game.history({ verbose: true })
    };
  }

  public makeMove(from: string, to: string): boolean {
    try {
      const move = this.game.move({ from, to });
      if (move) {
        this.emit('moveCompleted', this.getState());
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  public isValidMove(from: string, to: string): boolean {
    try {
      const moves = this.game.moves({ verbose: true });
      return moves.some(move => move.from === from && move.to === to);
    } catch (error) {
      return false;
    }
  }

  public getPossibleMoves(square: string): string[] {
    try {
      const moves = this.game.moves({ square: square as Square, verbose: true });
      return moves.map(move => move.to);
    } catch (error) {
      return [];
    }
  }

  public resetGame(): void {
    this.game.reset();
    this.emit('gameReset', this.getState());
  }
} 