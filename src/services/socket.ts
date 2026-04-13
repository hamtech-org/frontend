import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    this.disconnect();
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.info('Socket.io kết nối thành công');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket.io ngắt kết nối:', reason);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket {
    if (!this.socket) throw new Error('Socket chưa kết nối');
    return this.socket;
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  on(event: string, handler: (data: unknown) => void): void {
    this.socket?.on(event, handler);
  }

  once(event: string, handler: (data: unknown) => void): void {
    this.socket?.once(event, handler);
  }

  off(event: string, handler?: (data: unknown) => void): void {
    this.socket?.off(event, handler);
  }
}

export const socketService = new SocketService();
