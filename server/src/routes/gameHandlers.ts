import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Chess, Move } from 'chess.js';
import { ChessAI, AIDifficulty } from '../services/chessAI';

interface GameState {
  fen: string;
  isGameOver: boolean;
  isCheck: boolean;
  turn: 'w' | 'b';
  history: Move[];
  lastMove?: Move;
}

interface Game {
  id: string;
  chess: Chess;
  ai?: ChessAI;
  isAIGame: boolean;
  players: {
    white?: string;
    black?: string;
  };
}

const games = new Map<string, Game>();

export function initializeGameHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createGame', (config: { isAIGame: boolean, aiDifficulty?: AIDifficulty }) => {
      const gameId = uuidv4();
      const game: Game = {
        id: gameId,
        chess: new Chess(),
        isAIGame: config.isAIGame,
        players: {
          white: socket.id
        }
      };

      if (config.isAIGame) {
        game.ai = new ChessAI();
        if (config.aiDifficulty) {
          game.ai.setDifficulty(config.aiDifficulty);
        }
        game.players.black = 'AI';
      }

      games.set(gameId, game);
      socket.join(gameId);

      const gameState = getGameState(game);
      socket.emit('gameCreated', { gameId, ...gameState });
    });

    socket.on('joinGame', (gameId: string) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      if (game.isAIGame) {
        socket.emit('error', 'Cannot join AI game');
        return;
      }

      if (!game.players.black) {
        game.players.black = socket.id;
        socket.join(gameId);
        io.to(gameId).emit('playerJoined', { 
          gameId,
          players: game.players,
          ...getGameState(game)
        });
      } else {
        socket.emit('error', 'Game is full');
      }
    });

    socket.on('makeMove', async ({ gameId, from, to }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      // Verify it's the player's turn
      const playerColor = game.players.white === socket.id ? 'w' : 'b';
      if (game.chess.turn() !== playerColor) {
        socket.emit('error', 'Not your turn');
        return;
      }

      try {
        const move = game.chess.move({ from, to });
        if (move) {
          const gameState = getGameState(game);
          io.to(gameId).emit('gameUpdate', gameState);

          // If it's an AI game and it's AI's turn
          if (game.isAIGame && game.ai && game.chess.turn() === 'b' && !game.chess.isGameOver()) {
            try {
              const aiFen = game.chess.fen();
              const aiMove = await game.ai.getBestMove(aiFen);
              const [aiFrom, aiTo] = aiMove.match(/.{1,2}/g) || [];
              
              if (aiFrom && aiTo) {
                game.chess.move({ from: aiFrom, to: aiTo });
                const aiGameState = getGameState(game);
                io.to(gameId).emit('gameUpdate', aiGameState);
              }
            } catch (error) {
              console.error('AI move error:', error);
              socket.emit('error', 'AI move failed');
            }
          }
        }
      } catch (error) {
        socket.emit('error', 'Invalid move');
      }
    });

    socket.on('getPossibleMoves', ({ gameId, square }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      try {
        const moves = game.chess.moves({ 
          square,
          verbose: true 
        });
        socket.emit('possibleMoves', { square, moves });
      } catch (error) {
        socket.emit('error', 'Invalid square');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Handle game cleanup or forfeit if player disconnects
      for (const [gameId, game] of games.entries()) {
        if (game.players.white === socket.id || game.players.black === socket.id) {
          io.to(gameId).emit('playerDisconnected', {
            gameId,
            playerId: socket.id
          });
          
          // If it's an AI game, clean up AI resources
          if (game.isAIGame && game.ai) {
            game.ai.cleanup();
          }
          
          games.delete(gameId);
        }
      }
    });
  });
}

function getGameState(game: Game): GameState {
  const history = game.chess.history({ verbose: true });
  return {
    fen: game.chess.fen(),
    isGameOver: game.chess.isGameOver(),
    isCheck: game.chess.isCheck(),
    turn: game.chess.turn(),
    history,
    lastMove: history[history.length - 1]
  };
} 