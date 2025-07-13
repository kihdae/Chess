import { Chess, Move, Square } from 'chess.js';
import { EventEmitter } from 'events';
import { Socket } from 'socket.io-client';
import { getSocket } from '../app/api/socket/route';

export interface GameState {
  fen: string;
  isGameOver: boolean;
  isCheck: boolean;
  turn: 'w' | 'b';
  history: Move[];
  lastMove?: Move;
}

export interface GameConfig {
  isAIGame?: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export class ChessGame extends EventEmitter {
  private game: Chess;
  private gameId?: string;
  private socket: Socket;
  private isAIGame: boolean;

  constructor(config: GameConfig = {}) {
    super();
    this.game = new Chess();
    this.socket = getSocket();
    this.isAIGame = config.isAIGame || false;

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('gameCreated', (data: { gameId: string } & GameState) => {
      this.gameId = data.gameId;
      this.game.load(data.fen);
      this.emit('gameCreated', data);
    });

    this.socket.on('gameUpdate', (state: GameState) => {
      this.game.load(state.fen);
      this.emit('gameUpdate', state);
    });

    this.socket.on('playerJoined', (data: { gameId: string, players: any } & GameState) => {
      this.game.load(data.fen);
      this.emit('playerJoined', data);
    });

    this.socket.on('playerDisconnected', (data: { gameId: string, playerId: string }) => {
      this.emit('playerDisconnected', data);
    });

    this.socket.on('possibleMoves', (data: { square: Square, moves: Move[] }) => {
      this.emit('possibleMoves', data);
    });

    this.socket.on('error', (error: string) => {
      this.emit('error', error);
    });
  }

  public createGame() {
    this.socket.emit('createGame', {
      isAIGame: this.isAIGame
    });
  }

  public joinGame(gameId: string) {
    this.socket.emit('joinGame', gameId);
  }

  public makeMove(from: Square, to: Square) {
    if (!this.gameId) {
      this.emit('error', 'No active game');
      return;
    }

    this.socket.emit('makeMove', {
      gameId: this.gameId,
      from,
      to
    });
  }

  public getPossibleMoves(square: Square) {
    if (!this.gameId) {
      this.emit('error', 'No active game');
      return;
    }

    this.socket.emit('getPossibleMoves', {
      gameId: this.gameId,
      square
    });
  }

  public getState(): GameState {
    return {
      fen: this.game.fen(),
      isGameOver: this.game.isGameOver(),
      isCheck: this.game.isCheck(),
      turn: this.game.turn(),
      history: this.game.history({ verbose: true }),
      lastMove: this.game.history({ verbose: true }).pop()
    };
  }

  public cleanup() {
    this.socket.off();
    this.removeAllListeners();
  }
}
