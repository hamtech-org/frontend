import { socketService } from '@/services/socket';
import { store } from '@/store/store';
import {
  setActiveGroupCall,
  clearActiveGroupCallMatching,
} from '@/store/slices/callSlice';
import type { CallType } from '@/types/call.types';

let listenersAttached = false;

/** Gọi sau mỗi lần `socketService.connect` (socket mới) để gắn listener Redux cho cuộc gọi nhóm. */
export function attachCallGroupSocketToRedux(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  socketService.on('call:group-active', (data: unknown) => {
    const p = data as {
      conversationId?: string;
      channelName?: string;
      type?: CallType;
      hostId?: string;
      sessionId?: string;
    };
    if (!p.conversationId || !p.channelName || !p.sessionId) return;
    store.dispatch(
      setActiveGroupCall({
        conversationId: p.conversationId,
        channelName: p.channelName,
        type: p.type === 'audio' || p.type === 'video' ? p.type : 'video',
        hostId: p.hostId ?? '',
        sessionId: p.sessionId,
      }),
    );
  });

  socketService.on('call:group-inactive', (data: unknown) => {
    const p = data as { conversationId?: string; sessionId?: string };
    if (!p.conversationId) return;
    store.dispatch(
      clearActiveGroupCallMatching({
        conversationId: p.conversationId,
        sessionId: p.sessionId,
      }),
    );
  });

  socketService.on('call:ended', (data: unknown) => {
    const p = data as { scope?: string; conversationId?: string; sessionId?: string };
    if (p?.scope !== 'group' || !p.conversationId) return;
    store.dispatch(
      clearActiveGroupCallMatching({
        conversationId: p.conversationId,
        sessionId: p.sessionId,
      }),
    );
  });
}

/** Trước khi disconnect / connect lại — cho phép gắn listener trên socket mới. */
export function resetCallGroupSocketReduxAttachment(): void {
  listenersAttached = false;
}
