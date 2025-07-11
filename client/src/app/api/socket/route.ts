import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ChessGame } from '../../../lib/chessGame';

// Store active games in memory
const games = new Map<string, ChessGame>();
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createGame', () => {
    const gameId = uuidv4();
    const game = new ChessGame(gameId);
    games.set(gameId, game);
    
    game.on('moveCompleted', (state) => {
      io.to(gameId).emit('gameUpdate', state);
    });

    game.on('gameReset', (state) => {
      io.to(gameId).emit('gameReset', state);
    });
    
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, ...game.getState() });
  });

  socket.on('joinGame', (gameId: string) => {
    const game = games.get(gameId);
    if (game) {
      socket.join(gameId);
      socket.emit('gameJoined', { gameId, ...game.getState() });
    } else {
      socket.emit('error', 'Game not found');
    }
  });

  socket.on('makeMove', ({ gameId, from, to }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    if (!game.isValidMove(from, to)) {
      socket.emit('error', 'Invalid move');
      return;
    }

    game.makeMove(from, to);
  });

  socket.on('getPossibleMoves', ({ gameId, square }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    const possibleMoves = game.getPossibleMoves(square);
    socket.emit('possibleMoves', { square, moves: possibleMoves });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const port = process.env.SOCKET_PORT || 3001;
io.listen(Number(port));

console.log(`Socket.IO server running on port ${port}`); 