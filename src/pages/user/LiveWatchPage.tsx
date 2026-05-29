import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser } from 'agora-rtc-react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  Send,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useGetLiveSessionQuery } from '@/store/api/liveApi';
import { socketService } from '@/services/socket';
import { fetchLiveRtcToken } from '@/utils/liveAgora';
import {
  ensureRemoteTracksSubscribed,
  placeAllLiveRemoteVideos,
  remoteVideoUids,
  resyncLiveRemoteVideos,
  subscribeLiveRemote,
} from '@/utils/liveAgoraRemote';
import { liveVideoGridStyle } from '@/utils/liveVideoGrid';
import { Button } from '@/components/ui/button';
import { LIVE_AS_VIEWER_PARAM } from '@/hooks/useMyLiveDirectory';
import { cn } from '@/utils/cn';
import { LiveFloatingReactions } from '@/components/live/LiveFloatingReactions';
import { REACTION_META } from '@/types/reaction.types';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

type ChatLine = {
  sessionId: string;
  userId: string;
  displayName: string;
  text: string;
  sentAt: string;
};

function placeRemoteVideo(user: IAgoraRTCRemoteUser, el: HTMLDivElement | null) {
  if (!el) return;
  const t = user.videoTrack;
  if (t) {
    t.stop();
    t.play(el, { fit: 'contain' });
  }
}

export default function LiveWatchPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUserId = useSelector((s: RootState) => s.auth.user?.userId ?? '');
  const asViewer = searchParams.get(LIVE_AS_VIEWER_PARAM) === '1';
  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useGetLiveSessionQuery(sessionId, {
    skip: !sessionId,
    pollingInterval: 15000,
  });

  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [joinedRtc, setJoinedRtc] = useState(false);
  const [videoBoxFs, setVideoBoxFs] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoShellRef = useRef<HTMLDivElement>(null);
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const onChatMessage = useCallback((raw: unknown) => {
    const p = raw as ChatLine;
    if (p?.sessionId !== sessionIdRef.current) return;
    setMessages((m) => [...m.slice(-200), p]);
  }, []);

  const onSessionEnded = useCallback(
    (raw: unknown) => {
      const p = raw as { sessionId?: string };
      if (p?.sessionId !== sessionIdRef.current) return;
      toast.info('Phiên live đã kết thúc');
      navigate('/live', { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (asViewer) return;
    if (
      session?.status === 'live' &&
      session.hostUserId &&
      currentUserId &&
      session.hostUserId === currentUserId
    ) {
      navigate(`/live/${sessionId}/studio`, { replace: true });
    }
  }, [asViewer, session, currentUserId, sessionId, navigate]);

  useEffect(() => {
    socketService.emit('live:join', { sessionId });
    return () => {
      socketService.emit('live:leave', { sessionId });
    };
  }, [sessionId]);

  useEffect(() => {
    const onSessionUpdated = () => {
      void refetch();
    };
    socketService.on('live:chat-message', onChatMessage);
    socketService.on('live:session-ended', onSessionEnded);
    socketService.on('live:session-updated', onSessionUpdated);
    return () => {
      socketService.off('live:chat-message', onChatMessage);
      socketService.off('live:session-ended', onSessionEnded);
      socketService.off('live:session-updated', onSessionUpdated);
    };
  }, [onChatMessage, onSessionEnded, refetch]);

  const videoRectReady = !isLoading && session?.status === 'live';

  useEffect(() => {
    if (!videoRectReady) return;
    const el = videoShellRef.current;
    if (!el) return;

    const update = () => {
      setVideoRect(el.getBoundingClientRect());
    };
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [videoRectReady, session?.sessionId, chatOpen]);

  useEffect(() => {
    if (!session || session.status !== 'live' || !AGORA_APP_ID) return;
    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    const syncRemotes = () => {
      setRemoteUids(remoteVideoUids(client));
    };

    const remoteWrapId = (uid: string | number) => `live-remote-wrap-${uid}`;

    const placeAllRemoteVideos = () => {
      placeAllLiveRemoteVideos(client, remoteWrapId, placeRemoteVideo);
    };

    const scheduleVideoResync = () => {
      const run = () => {
        if (cancelled) return;
        void resyncLiveRemoteVideos(client, remoteWrapId, placeRemoteVideo).then(() => {
          if (cancelled) return;
          syncRemotes();
        });
      };
      window.setTimeout(run, 200);
      window.setTimeout(run, 700);
    };

    const subscribeAndPlace = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      try {
        if (mediaType === 'video' && !user.videoTrack) {
          await client.subscribe(user, 'video');
        } else {
          await subscribeLiveRemote(client, user, mediaType);
        }
      } catch {
        if (mediaType === 'video') scheduleVideoResync();
        return;
      }
      if (mediaType === 'audio') return;
      syncRemotes();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          placeAllRemoteVideos();
        });
      });
    };

    const run = async () => {
      try {
        const { token, uid } = await fetchLiveRtcToken(session.channelName, 'subscriber');
        if (cancelled) return;
        await client.join(AGORA_APP_ID, session.channelName, token, uid);
        if (cancelled) return;
        setJoinedRtc(true);
        await ensureRemoteTracksSubscribed(client);
        syncRemotes();
        requestAnimationFrame(() => placeAllRemoteVideos());

        client.on('user-published', (u, mt) => {
          if (mt === 'audio' || mt === 'video') void subscribeAndPlace(u, mt);
        });
        client.on('user-info-updated', (uid) => {
          const u = client.remoteUsers.find((ru) => ru.uid === uid);
          if (!u) return;
          void subscribeAndPlace(u, 'audio');
          void subscribeAndPlace(u, 'video');
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            user.videoTrack?.stop();
            void client.unsubscribe(user, 'video').catch(() => {});
            syncRemotes();
            scheduleVideoResync();
            return;
          }
          syncRemotes();
        });

        client.on('user-left', () => {
          syncRemotes();
        });
      } catch (e) {
        console.error(e);
        toast.error('Không vào được kênh live');
      }
    };

    void run();

    return () => {
      cancelled = true;
      setJoinedRtc(false);
      setRemoteUids([]);
      void client.leave();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client || remoteUids.length === 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        placeAllLiveRemoteVideos(client, (uid) => `live-remote-wrap-${uid}`, placeRemoteVideo);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [remoteUids]);

  const videoGridStyle = useMemo(() => liveVideoGridStyle(remoteUids.length), [remoteUids.length]);

  const toggleFs = useCallback(() => {
    const el = videoShellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
      setVideoBoxFs(true);
    } else {
      void document.exitFullscreen();
      setVideoBoxFs(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setVideoBoxFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const sendChat = useCallback(() => {
    const t = chatInput.trim();
    if (!t) return;
    socketService.emit('live:chat-message', { sessionId, text: t });
    setChatInput('');
  }, [chatInput, sessionId]);

  const sendReaction = useCallback(
    (reactionType: keyof typeof REACTION_META) => {
      if (!sessionId) return;
      socketService.emit('live:reaction', { sessionId, reactionType });
    },
    [sessionId],
  );

  const handleReactionEnter = useCallback(() => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReactionPickerOpen(true), 400);
  }, []);

  const handleReactionLeave = useCallback(() => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReactionPickerOpen(false), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] gap-4 px-4">
        <p className="text-muted-foreground">Không tìm thấy phiên live.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/live')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  if (session.status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] gap-4 px-4">
        <p className="text-muted-foreground">Phiên đã kết thúc.</p>
        <Button type="button" onClick={() => navigate('/live')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-90 flex flex-col bg-background text-foreground">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/live')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white shrink-0">
            <Radio className="h-3 w-3" />
            LIVE
          </span>
          <h1 className="font-semibold truncate text-sm sm:text-base">{session.title}</h1>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {joinedRtc ? 'Đang xem' : 'Đang kết nối…'}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={chatOpen ? 'Đóng chat' : 'Mở chat'}
          aria-label={chatOpen ? 'Đóng chat' : 'Mở chat'}
          onClick={() => setChatOpen((v) => !v)}
        >
          {chatOpen ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRightOpen className="h-5 w-5" />
          )}
        </Button>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div
            ref={videoShellRef}
            className={cn('relative flex-1 bg-black min-h-0', videoBoxFs && 'bg-black')}
          >
            <div className="absolute inset-0 p-2 sm:p-3" style={videoGridStyle}>
              {remoteUids.length === 0 && (
                <div className="flex items-center justify-center text-white/50 text-sm min-h-0">
                  Đang chờ tín hiệu phát sóng…
                </div>
              )}
              {remoteUids.map((uid) => (
                <div
                  key={uid}
                  id={`live-remote-wrap-${uid}`}
                  className="relative min-h-0 min-w-0 rounded-xl overflow-hidden bg-zinc-900 border border-white/10"
                />
              ))}
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
              <div
                className="relative"
                onMouseEnter={handleReactionEnter}
                onMouseLeave={handleReactionLeave}
              >
                {reactionPickerOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-1 flex gap-2 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 z-50"
                    onMouseEnter={() => {
                      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
                      setReactionPickerOpen(true);
                    }}
                    onMouseLeave={handleReactionLeave}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(
                      ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as Array<
                        keyof typeof REACTION_META
                      >
                    ).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"
                        onClick={() => sendReaction(t)}
                        aria-label={`Gửi reaction ${REACTION_META[t].label}`}
                      >
                        <span className="text-base">{REACTION_META[t].emoji}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="rounded-full bg-black/50 border-white/10 text-white hover:bg-black/70"
                  onClick={() => sendReaction('love')}
                  aria-label="Gửi reaction yêu thích"
                >
                  ❤️
                </Button>
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full bg-black/50 border-white/10 text-white hover:bg-black/70"
                onClick={toggleFs}
              >
                {videoBoxFs ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>

            <LiveFloatingReactions sessionId={sessionId} containerRect={videoRect} />
          </div>
        </div>

        {chatOpen && (
          <aside className="w-[min(100%,360px)] border-l border-border flex flex-col min-h-0 bg-card shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-semibold">Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm min-h-0">
              {messages.map((m, i) => (
                <div key={`${m.sentAt}-${i}`} className="rounded-lg bg-muted/50 px-2 py-1.5">
                  <span className="font-semibold text-foreground">{m.displayName}</span>
                  <span className="text-muted-foreground ml-2 wrap-break-word">{m.text}</span>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border flex gap-2">
              <input
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Nhập tin nhắn…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <Button type="button" size="icon" onClick={sendChat}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
