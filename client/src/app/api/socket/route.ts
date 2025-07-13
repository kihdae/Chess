import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: false
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}