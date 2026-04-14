import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Map<(data: unknown) => void, (data: unknown) => void>> = new Map();

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
