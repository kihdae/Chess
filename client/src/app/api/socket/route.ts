import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ChessGame, GameConfig, GameState } from '../../../lib/chessGame';

// Store active games in memory
const games = new Map<string, ChessGame>();

// Store completed games in memory
const completedGames = new Map<string, GameState & { completedAt: number }>();

const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  // Log connection with safe console usage
  if (process.env.NODE_ENV !== 'production') {
    console.log('Client connected:', socket.id);
  }

  // Handle creating a new game
  socket.on('createGame', (config: GameConfig = {}) => {
    const gameId = uuidv4();
    const game = new ChessGame(gameId, config);
    games.set(gameId, game);
    
    // Listen for game events
    game.on('moveCompleted', (state) => {
      io.to(gameId).emit('gameUpdate', state);
      
      // If game is over, store it in completed games
      if (state.isGameOver) {
        completedGames.set(gameId, {
          ...state,
          completedAt: Date.now()
        });
        games.delete(gameId);
        game.cleanup();
      }
    });

    game.on('chatMessage', (message) => {
      io.to(gameId).emit('chatMessage', message);
    });

    game.on('gameReset', (state) => {
      io.to(gameId).emit('gameReset', state);
    });
    
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, ...game.getState() });
  });

  // Handle joining an existing game
  socket.on('joinGame', (gameId: string) => {
    const game = games.get(gameId);
    if (game) {
      socket.join(gameId);
      socket.emit('gameJoined', { gameId, ...game.getState() });
    } else {
      socket.emit('error', 'Game not found');
    }
  });

  // Handle making a move
  socket.on('makeMove', async ({ gameId, from, to }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    if (!game.isValidMove(from, to)) {
      socket.emit('error', 'Invalid move');
      return;
    }

    await game.makeMove(from, to);
  });

  // Handle chat messages
  socket.on('sendMessage', ({ gameId, username, message }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    game.addChatMessage(username, message);
  });

  // Handle getting possible moves for a square
  socket.on('getPossibleMoves', ({ gameId, square }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    const possibleMoves = game.getPossibleMoves(square);
    socket.emit('possibleMoves', { square, moves: possibleMoves });
  });

  // Handle getting game history
  socket.on('getGameHistory', (gameId: string) => {
    const completedGame = completedGames.get(gameId);
    if (completedGame) {
      socket.emit('gameHistory', completedGame);
    } else {
      socket.emit('error', 'Game history not found');
    }
  });

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Client disconnected:', socket.id);
    }
  });
});

// Start the Socket.IO server
const port = process.env.SOCKET_PORT || 3001;
io.listen(Number(port));

if (process.env.NODE_ENV !== 'production') {
  console.log(`Socket.IO server running on port ${port}`);
} 