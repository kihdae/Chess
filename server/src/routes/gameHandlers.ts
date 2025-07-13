import { Server, Socket } from 'socket.io';
import { Chess } from 'chess.js';
import { db } from '../db';
import { games, moves, players } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

interface GameState {
  gameId: number;
  chess: Chess;
  players: {
    white?: { id: number; username: string };
    black?: { id: number; username: string };
  };
  spectators: string[];
  moveNumber: number;
}
const activeGames = new Map<number, GameState>();

export const setupGameHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinGame', async ({ gameId, username, role }) => {
      try {
        const player = await db.query.players.findFirst({
          where: eq(players.username, username)
        });

        if (!player) {
          socket.emit('error', 'Player not found');
          return;
        }

        const gameState = activeGames.get(gameId) || {
          gameId,
          chess: new Chess(),
          players: {
            white: undefined,
            black: undefined
          },
          spectators: [],
          moveNumber: 0
        };

        if (role === 'spectator') {
          gameState.spectators.push(socket.id as never);
        } else if (!gameState.players[role as keyof typeof gameState.players]) {
          gameState.players[role as keyof typeof gameState.players] = {
            id: player.id,
            username: player.username
          };

          if (!activeGames.has(gameId)) {
            await db.insert(games).values({
              id: gameId,
              whitePlayerId: gameState.players.white?.id as number,
              blackPlayerId: gameState.players.black?.id as number,
              startTime: new Date(),
              totalMoves: 0,
              isAIGame: false
            });
          }
        } else {
          socket.emit('error', 'Role already taken');
          return;
        }

        activeGames.set(gameId, gameState);
        socket.join(gameId.toString());
        
        // Notify room of new player
        io.to(gameId.toString()).emit('gameState', {
          fen: gameState.chess.fen(),
          players: {
            white: gameState.players.white?.username as string,
            black: gameState.players.black?.username as string
          },
          spectators: gameState.spectators.length
        });
      } catch (error) {
        console.error('Error in joinGame:', error);
        socket.emit('error', 'Internal server error');
      }
    });

    socket.on('move', async ({ gameId, from, to, promotion }) => {
      const gameState = activeGames.get(gameId);
      if (!gameState) {
        socket.emit('error', 'Game not found');
        return;
      }

      try {
        const move = gameState.chess.move({ from, to, promotion });
        if (move) {
          gameState.moveNumber++;

          // Save move to database
          await db.insert(moves).values({
            gameId: gameState.gameId,
            playerId: gameState.players[gameState.chess.turn() === 'w' ? 'black' : 'white']?.id || null,
            moveNumber: gameState.moveNumber,
            move: move.san,
            timeSpent: 0, 
            fen: gameState.chess.fen(),
            isCheck: gameState.chess.isCheck(),
            isCapture: move.captured ? true : false
          });

          await db.update(games)
            .set({ 
              totalMoves: gameState.moveNumber,
              finalFen: gameState.chess.fen()
            })
            .where(eq(games.id, gameId));

          // If game is over, update final state
          if (gameState.chess.isGameOver()) {
            let result = '1/2-1/2'; // Default to draw
            if (gameState.chess.isCheckmate()) {
              // If it's checkmate, the player who just moved won
              result = gameState.chess.turn() === 'w' ? '0-1' : '1-0';
            }

            await db.update(games)
              .set({ 
                endTime: new Date(),
                result,
                finalFen: gameState.chess.fen()
              })
              .where(eq(games.id, gameId));

            if (result !== '1/2-1/2') {
              const winner = result === '1-0' ? 'white' : 'black';
              const loser = result === '1-0' ? 'black' : 'white';

              if (gameState.players[winner]?.id) {
                await db.update(players)
                  .set({ 
                    wins: sql`${players.wins} + 1`,
                    totalGames: sql`${players.totalGames} + 1`
                  })
                  .where(eq(players.id, gameState.players[winner].id));
              }

              if (gameState.players[loser]?.id) {
                await db.update(players)
                  .set({ 
                    losses: sql`${players.losses} + 1`,
                    totalGames: sql`${players.totalGames} + 1`
                  })
                  .where(eq(players.id, gameState.players[loser].id));
              }
            } else {
              // Update draw statistics for both players
              for (const role of ['white', 'black']) {
                if (gameState.players[role as keyof typeof gameState.players]?.id) {
                  await db.update(players)
                    .set({ 
                      draws: sql`${players.draws} + 1`,
                      totalGames: sql`${players.totalGames} + 1`
                    })
                    .where(eq(players.id, gameState.players[role as keyof typeof gameState.players]?.id as number));
                }
              }
            }
          }

          // Broadcast new state
          io.to(gameId.toString()).emit('gameState', {
            fen: gameState.chess.fen(),
            lastMove: move,
            isGameOver: gameState.chess.isGameOver()
          });
        }
      } catch (error) {
        console.error('Error in move:', error);
        socket.emit('error', 'Invalid move');
      }
    });

    // Handle chat messages
    socket.on('chat', ({ gameId, username, message }) => {
      io.to(gameId.toString()).emit('chat', { username, message });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Remove player/spectator from active games
      activeGames.forEach((state, gameId) => {
        if (state.players.white?.username === socket.id) {
          state.players.white = undefined;
        }
        if (state.players.black?.username === socket.id) {
          state.players.black = undefined;
        }
        state.spectators = state.spectators.filter(id => id !== socket.id);
        
        if (!state.players.white && !state.players.black && !state.spectators.length) {
          activeGames.delete(gameId);
        } else {
          io.to(gameId.toString()).emit('gameState', {
            players: {
              white: state.players.white?.username as string,
              black: state.players.black?.username as string
            },
            spectators: state.spectators.length
          });
        }
      });
    });
  });
}; 