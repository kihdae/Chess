import { Chess, Move, Square } from "chess.js";
import { EventEmitter } from "events";
import { ChessAI } from "./chessAI";
import { GameAnalyticsService } from "../services/gameAnalytics";

export interface GameState {
  fen: string;
  isGameOver: boolean;
  isCheck: boolean;
  turn: "w" | "b";
  history: Move[];
  lastMove?: Move;
  chat: ChatMessage[];
  analytics?: {
    averageMoveTime: number;
    totalCaptures: number;
    openingName: string;
    materialAdvantage: Record<string, number>;
    checks: number;
  };
}

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

export interface GameConfig {
  isAIGame?: boolean;
  aiDifficulty?: "easy" | "medium" | "hard";
}

export class ChessGame extends EventEmitter {
  private game: Chess;
  private gameId: string;
  private ai?: ChessAI;
  private chat: ChatMessage[] = [];
  private isAIGame: boolean;
  private analyticsService: GameAnalyticsService;
  private moveStartTime: number = 0;
  private dbGameId?: number;
  private whitePlayerId?: number;
  private blackPlayerId?: number;

  constructor(gameId: string, config: GameConfig = {}) {
    super();
    this.game = new Chess();
    this.gameId = gameId;
    this.isAIGame = config.isAIGame || false;
    this.analyticsService = new GameAnalyticsService();

    if (this.isAIGame) {
      this.ai = new ChessAI();
      if (config.aiDifficulty) {
        this.ai.setDifficulty(config.aiDifficulty);
      }
    }

    // Start move timer
    this.moveStartTime = Date.now();
  }

  public async initializeGame(whitePlayerId: number, blackPlayerId: number) {
    this.whitePlayerId = whitePlayerId;
    this.blackPlayerId = blackPlayerId;
    // Initialize game in database and get the ID
    // This will be implemented in database service
  }

  public getGameId(): string {
    return this.gameId;
  }

  public async getState(): Promise<GameState> {
    const history = this.game.history({ verbose: true });
    let analytics;

    if (this.dbGameId) {
      try {
        analytics = await this.analyticsService.getGameAnalytics(this.dbGameId);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      }
    }

    return {
      fen: this.game.fen(),
      isGameOver: this.game.isGameOver(),
      isCheck: this.game.isCheck(),
      turn: this.game.turn(),
      history,
      lastMove: history[history.length - 1],
      chat: this.chat,
      analytics,
    };
  }

  public async makeMove(from: string, to: string): Promise<boolean> {
    try {
      const move = this.game.move({ from, to });
      if (move) {
        const timeSpent = Date.now() - this.moveStartTime;
        this.moveStartTime = Date.now();

        // Update analytics if we have database IDs
        if (this.dbGameId && (this.whitePlayerId || this.blackPlayerId)) {
          const currentPlayerId =
            this.game.turn() === "w" ? this.blackPlayerId : this.whitePlayerId;
          if (currentPlayerId) {
            await this.analyticsService.analyzeMoveAndUpdateStats(
              this.dbGameId,
              currentPlayerId,
              Math.floor(this.game.moveNumber() / 2),
              `${from}${to}`,
              timeSpent,
              this.game.fen(),
              this.game.fen()
            );
          }
        }

        this.emit("moveCompleted", await this.getState());

        if (
          this.isAIGame &&
          this.ai &&
          this.game.turn() === "b" &&
          !this.game.isGameOver()
        ) {
          await this.makeAIMove();
        }

        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async makeAIMove(): Promise<boolean> {
    if (!this.ai) return false;

    try {
      const bestMove = await this.ai.getBestMove(this.game.fen());
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);

      const move = this.game.move({ from, to });
      if (move) {
        this.emit("moveCompleted", this.getState());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public isValidMove(from: string, to: string): boolean {
    try {
      const moves = this.game.moves({ verbose: true });
      return moves.some((move) => move.from === from && move.to === to);
    } catch {
      return false;
    }
  }

  public getPossibleMoves(square: string): string[] {
    try {
      const moves = this.game.moves({
        square: square as Square,
        verbose: true,
      });
      return moves.map((move) => move.to);
    } catch {
      return [];
    }
  }

  public addChatMessage(username: string, message: string): void {
    const chatMessage = {
      username,
      message,
      timestamp: Date.now(),
    };
    this.chat.push(chatMessage);
    this.emit("chatMessage", chatMessage);
  }

  public resetGame(): void {
    this.game.reset();
    this.emit("gameReset", this.getState());
  }

  public cleanup(): void {
    if (this.ai) {
      this.ai.cleanup();
    }
  }
}
