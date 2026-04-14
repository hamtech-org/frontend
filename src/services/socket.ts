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
  private eventHandlers: Map<string, Map<(data: unknown) => void, (data: unknown) => void>> = new Map();
  private triedFallback = false;
  private lastToken: string | null = null;
  private triedTokenRefresh = false;

  connect(token: string): void {
    this.disconnect();
    const normalizedToken = token?.startsWith('Bearer ') ? token.slice('Bearer '.length) : token;
    this.lastToken = normalizedToken;

    const connectTo = (url: string) => {
      this.socket = io(url, {
        auth: { token: normalizedToken },
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
        // Nếu token stale (thường do refresh token flow chỉ update localStorage), thử lấy token mới nhất rồi reconnect 1 lần.
        const msg = String(err?.message ?? '');
        if (!this.triedTokenRefresh && msg.includes('Token không hợp lệ')) {
          const latest = localStorage.getItem('accessToken');
          const latestNormalized = latest?.startsWith('Bearer ') ? latest.slice('Bearer '.length) : latest;
          if (latestNormalized && latestNormalized !== this.lastToken) {
            this.triedTokenRefresh = true;
            this.lastToken = latestNormalized;
            this.disconnect();
            // Giữ nguyên URL hiện tại, chỉ đổi token
            connectTo(url);
            return;
          }
        }
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
      console.info('✅ Socket.io kết nối thành công');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket.io ngắt kết nối:', reason);
    });

    // Log all incoming events for debugging
    this.socket.onAny((eventName, ...args) => {
      console.debug(`📨 Socket event received: ${eventName}`, args);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.eventHandlers.clear();
    this.triedTokenRefresh = false;
  }

  getSocket(): Socket {
    if (!this.socket) throw new Error('Socket chưa kết nối');
    return this.socket;
  }

  emit(event: string, data?: unknown): void {
    if (!this.socket) {
      console.error('❌ Socket chưa kết nối, không thể emit event:', event);
      return;
    }
    console.debug(`📤 Emitting socket event: ${event}`, data);
    this.socket.emit(event, data);
  }

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.socket) {
      console.error('❌ Socket chưa kết nối, không thể register listener:', event);
      return;
    }
    
    // Create wrapper to log and call handler
    const wrappedHandler = (data: unknown) => {
      console.debug(`✨ Event ${event} triggered with data:`, data);
      handler(data);
    };

    // Store mapping of original handler to wrapped handler
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Map());
    }
    this.eventHandlers.get(event)!.set(handler, wrappedHandler);

    console.debug(`📝 Registered listener for event: ${event}`);
    this.socket.on(event, wrappedHandler);
  }

  once(event: string, handler: (data: unknown) => void): void {
    if (!this.socket) {
      console.error('❌ Socket chưa kết nối');
      return;
    }
    this.socket.once(event, handler);
  }

  off(event: string, handler?: (data: unknown) => void): void {
    if (!this.socket) return;

    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const wrappedHandler = handlers.get(handler);
        if (wrappedHandler) {
          this.socket.off(event, wrappedHandler);
          handlers.delete(handler);
          console.debug(`🗑️ Removed listener for event: ${event}`);
        }
      }
    } else {
      // Remove all handlers for this event
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach((wrappedHandler) => {
          this.socket?.off(event, wrappedHandler);
        });
        this.eventHandlers.delete(event);
        console.debug(`🗑️ Removed all listeners for event: ${event}`);
      }
    }
  }
}

export const socketService = new SocketService();
