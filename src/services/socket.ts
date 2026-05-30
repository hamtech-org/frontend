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

const PRIMARY_SOCKET_URL = (
  (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim() || ''
).trim();
const FALLBACK_SOCKET_URL = inferSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Map<(data: unknown) => void, (data: unknown) => void>> =
    new Map();
  private triedFallback = false;
  private lastToken: string | null = null;
  private triedTokenRefresh = false;

  private rebindAllHandlers(): void {
    if (!this.socket) return;
    for (const [event, handlers] of this.eventHandlers) {
      for (const wrappedHandler of handlers.values()) {
        this.socket.off(event, wrappedHandler);
        this.socket.on(event, wrappedHandler);
      }
    }
  }

  private teardownSocketInstance(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  connect(token: string): void {
    const normalizedToken = token?.startsWith('Bearer ') ? token.slice('Bearer '.length) : token;
    this.lastToken = normalizedToken;
    this.teardownSocketInstance();
    this.triedFallback = false;
    this.triedTokenRefresh = false;

    const connectTo = (url: string) => {
      this.socket = io(url, {
        auth: { token: normalizedToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 15000,
        withCredentials: true,
      });

      this.socket.on('connect', () => {
        this.triedFallback = false;
        this.triedTokenRefresh = false;
        this.rebindAllHandlers();
        console.info('Socket.io kết nối thành công');
      });

      this.socket.on('disconnect', (reason) => {
        if (reason === 'io client disconnect') {
          console.info('Socket.io ngắt kết nối (client):', reason);
          return;
        }
        console.warn('Socket.io ngắt kết nối:', reason);
      });

      this.socket.on('connect_error', (err: { message?: string }) => {
        console.warn('Socket.io connect_error:', err?.message ?? err);
        const msg = String(err?.message ?? '');
        if (!this.triedTokenRefresh && msg.includes('Token không hợp lệ')) {
          const latest = localStorage.getItem('accessToken');
          const latestNormalized = latest?.startsWith('Bearer ')
            ? latest.slice('Bearer '.length)
            : latest;
          if (latestNormalized && latestNormalized !== this.lastToken) {
            this.triedTokenRefresh = true;
            this.lastToken = latestNormalized;
            this.teardownSocketInstance();
            connectTo(url);
            return;
          }
        }
        if (this.triedFallback) return;
        const primary = PRIMARY_SOCKET_URL || '';
        const fallback = FALLBACK_SOCKET_URL;
        if (primary && primary !== fallback) {
          this.triedFallback = true;
          this.teardownSocketInstance();
          connectTo(fallback);
        }
      });

      this.rebindAllHandlers();
    };

    connectTo(PRIMARY_SOCKET_URL || FALLBACK_SOCKET_URL);
  }

  /** Ngắt socket và xóa toàn bộ listener đã đăng ký qua socketService.on. */
  disconnect(): void {
    this.teardownSocketInstance();
    this.eventHandlers.clear();
    this.triedTokenRefresh = false;
  }

  hasSocket(): boolean {
    return this.socket != null;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  /** Thử kết nối lại khi socket tồn tại nhưng đã rớt (idle lâu). */
  ensureConnected(token?: string | null): boolean {
    if (this.isConnected()) return true;
    const nextToken =
      (token?.startsWith('Bearer ') ? token.slice('Bearer '.length) : token) ??
      this.lastToken ??
      localStorage.getItem('accessToken')?.replace(/^Bearer\s+/i, '') ??
      null;
    if (!nextToken) return false;
    if (this.socket) {
      this.socket.connect();
      return this.isConnected();
    }
    this.connect(nextToken);
    return this.isConnected();
  }

  getSocket(): Socket {
    if (!this.socket) throw new Error('Socket chưa kết nối');
    return this.socket;
  }

  emit(event: string, data?: unknown): boolean {
    if (!this.socket?.connected) {
      console.warn('Socket chưa sẵn sàng, không thể emit event:', event);
      return false;
    }
    console.debug(`📤 Emitting socket event: ${event}`, data);
    this.socket.emit(event, data);
    return true;
  }

  on(event: string, handler: (data: unknown) => void): void {
    const wrappedHandler = (data: unknown) => {
      console.debug(`✨ Event ${event} triggered with data:`, data);
      handler(data);
    };

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Map());
    }
    this.eventHandlers.get(event)!.set(handler, wrappedHandler);

    if (this.socket) {
      this.socket.on(event, wrappedHandler);
    }
  }

  once(event: string, handler: (data: unknown) => void): void {
    if (!this.socket) {
      console.warn('Socket chưa sẵn sàng, không thể once:', event);
      return;
    }
    this.socket.once(event, handler);
  }

  off(event: string, handler?: (data: unknown) => void): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const wrappedHandler = handlers.get(handler);
        if (wrappedHandler) {
          this.socket?.off(event, wrappedHandler);
          handlers.delete(handler);
        }
      }
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((wrappedHandler) => {
        this.socket?.off(event, wrappedHandler);
      });
      this.eventHandlers.delete(event);
    }
  }
}

export const socketService = new SocketService();
