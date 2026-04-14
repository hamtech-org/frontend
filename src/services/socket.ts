import { io, Socket } from 'socket.io-client';

function inferSocketUrl(): string {
  const envApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envApiBase) {
    try {
      return new URL(envApiBase).origin;
    } catch {
      // ignore
    }
  }
  // Fallback to current origin (works in prod behind reverse proxy)
  return window.location.origin;
}

const PRIMARY_SOCKET_URL = ((import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim() || '').trim();
const FALLBACK_SOCKET_URL = inferSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private triedFallback = false;

  connect(token: string): void {
    this.disconnect();

    const connectTo = (url: string) => {
      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
      });

      this.socket.on('connect', () => {
        this.triedFallback = false;
        console.info('Socket.io kết nối thành công');
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('Socket.io ngắt kết nối:', reason);
      });

      this.socket.on('connect_error', (err: any) => {
        console.warn('Socket.io connect_error:', err?.message ?? err);
        // Nếu cấu hình URL sai (thường nhầm port/proxy), thử fallback 1 lần.
        if (this.triedFallback) return;
        const primary = PRIMARY_SOCKET_URL || '';
        const fallback = FALLBACK_SOCKET_URL;
        if (primary && primary !== fallback) {
          this.triedFallback = true;
          this.disconnect();
          connectTo(fallback);
        }
      });
    };

    connectTo(PRIMARY_SOCKET_URL || FALLBACK_SOCKET_URL);
    return;

    // Legacy code (giữ để đối chiếu)
    this.socket = io(PRIMARY_SOCKET_URL || FALLBACK_SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
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

  on(event: string, handler: (data: any) => void): void {
    this.socket?.on(event, handler);
  }

  once(event: string, handler: (data: any) => void): void {
    this.socket?.once(event, handler);
  }

  off(event: string, handler?: (data: any) => void): void {
    this.socket?.off(event, handler);
  }
}

export const socketService = new SocketService();
