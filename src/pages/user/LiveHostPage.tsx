import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AgoraRTC, {
  type IAgoraRTCClient,
  type ICameraVideoTrack,
  type ILocalAudioTrack,
  type ILocalVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-react';
import {
  Eye,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  Video,
  VideoOff,
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { RootState, AppDispatch } from '@/store/store';
import { useGetLiveSessionQuery, useEndLiveSessionMutation, liveApi } from '@/store/api/liveApi';
import { socketService } from '@/services/socket';
import { fetchLiveRtcToken } from '@/utils/liveAgora';
import { Button } from '@/components/ui/button';
import { LiveCompositePipOverlay } from '@/components/live/LiveCompositePipOverlay';
import { LiveHostChatPanel } from '@/components/live/LiveHostStudioSidebar';
import { LiveFloatingReactions } from '@/components/live/LiveFloatingReactions';
import {
  defaultPipRectBottomRight,
  getScreenShareSurface,
  LiveCanvasCompositor,
  shouldUseOsCameraPip,
  type LivePipRect,
  type ScreenShareSurface,
} from '@/utils/liveCanvasComposite';
import {
  closeHostCameraPip,
  restoreHostCameraTrack,
  isHostCameraPipActive,
  openHostCameraPip,
} from '@/utils/liveHostCameraPip';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string | undefined;

function formatLiveDuration(startedAt: string, nowMs: number): string {
  const start = new Date(startedAt).getTime();
  const totalSec = Math.max(0, Math.floor((nowMs - start) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

type ChatLine = {
  sessionId: string;
  userId: string;
  displayName: string;
  text: string;
  sentAt: string;
};

export default function LiveHostPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector((s: RootState) => s.auth.user?.userId ?? '');

  const {
    data: session,
    isLoading,
    error,
  } = useGetLiveSessionQuery(sessionId, {
    skip: !sessionId,
    pollingInterval: 12000,
  });

  const [endSession, { isLoading: ending }] = useEndLiveSessionMutation();

  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [joinedRtc, setJoinedRtc] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [durationNow, setDurationNow] = useState(() => Date.now());
  const [screenShareSurface, setScreenShareSurface] = useState<ScreenShareSurface | null>(null);
  const [pipRect, setPipRect] = useState<LivePipRect>(() => defaultPipRectBottomRight());

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const screenAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const compositorRef = useRef<LiveCanvasCompositor | null>(null);
  const compositeTrackRef = useRef<ILocalVideoTrack | null>(null);
  const publishSyncRef = useRef<Promise<void>>(Promise.resolve());
  const localCamRef = useRef<HTMLDivElement>(null);
  const localScreenRef = useRef<HTMLDivElement>(null);
  const compositePreviewRef = useRef<HTMLDivElement>(null);
  const videoShellRef = useRef<HTMLDivElement>(null);
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null);
  const camOnRef = useRef(camOn);
  const screenOnRef = useRef(screenOn);
  const micOnRef = useRef(micOn);
  const screenShareSurfaceRef = useRef<ScreenShareSurface | null>(null);
  const pipRectRef = useRef(pipRect);
  camOnRef.current = camOn;
  screenOnRef.current = screenOn;
  micOnRef.current = micOn;
  screenShareSurfaceRef.current = screenShareSurface;
  pipRectRef.current = pipRect;

  const screenWithCamMode = camOn && screenOn;
  /** Share cả màn hình + cam → PiP OS, publish screen thuần. */
  const screenWithCamPipMode =
    screenWithCamMode && screenShareSurface != null && shouldUseOsCameraPip(screenShareSurface);
  /** Share tab/window + cam → composite, cam baked góc stream. */
  const screenWithCamCompositeMode = screenWithCamMode && !screenWithCamPipMode;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const isHost = Boolean(session?.hostUserId === currentUserId);

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

  const onSessionUpdated = useCallback(() => {
    dispatch(liveApi.util.invalidateTags([{ type: 'LiveSession', id: sessionIdRef.current }]));
  }, [dispatch]);

  useEffect(() => {
    socketService.emit('live:join', { sessionId });
    return () => {
      socketService.emit('live:leave', { sessionId });
    };
  }, [sessionId]);

  useEffect(() => {
    socketService.on('live:chat-message', onChatMessage);
    socketService.on('live:session-ended', onSessionEnded);
    socketService.on('live:session-updated', onSessionUpdated);
    const onViewersUpdated = (raw: unknown) => {
      const p = raw as { sessionId?: string; viewerCount?: number };
      if (p?.sessionId !== sessionIdRef.current) return;
      setViewerCount(typeof p.viewerCount === 'number' ? p.viewerCount : 0);
    };
    socketService.on('live:viewers-updated', onViewersUpdated);
    return () => {
      socketService.off('live:chat-message', onChatMessage);
      socketService.off('live:session-ended', onSessionEnded);
      socketService.off('live:session-updated', onSessionUpdated);
      socketService.off('live:viewers-updated', onViewersUpdated);
    };
  }, [dispatch, onChatMessage, onSessionEnded, onSessionUpdated]);

  const videoRectReady = !isLoading && Boolean(session) && isHost;

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

  const stopCompositor = useCallback(async () => {
    compositorRef.current?.stop();
    compositorRef.current = null;
    const composite = compositeTrackRef.current;
    const client = clientRef.current;
    if (
      composite &&
      client?.connectionState === 'CONNECTED' &&
      client.localTracks.includes(composite)
    ) {
      try {
        await client.unpublish([composite]);
      } catch {
        /* noop */
      }
    }
    composite?.close();
    compositeTrackRef.current = null;
  }, []);

  const handlePipRectChange = useCallback((pip: LivePipRect) => {
    setPipRect(pip);
    compositorRef.current?.setPip(pip);
  }, []);

  const cleanupLocalTracks = useCallback(async () => {
    await closeHostCameraPip();
    await stopCompositor();
    screenTrackRef.current?.close();
    screenTrackRef.current = null;
    screenAudioTrackRef.current?.close();
    screenAudioTrackRef.current = null;
    camTrackRef.current?.close();
    camTrackRef.current = null;
    micTrackRef.current?.close();
    micTrackRef.current = null;
    setScreenShareSurface(null);
  }, [stopCompositor]);

  const syncPublish = useCallback(async () => {
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    const mic = micTrackRef.current;
    const cam = camTrackRef.current;
    const screen = screenTrackRef.current;
    const screenAudio = screenAudioTrackRef.current;
    const camEnabled = camOnRef.current;
    const screenEnabled = screenOnRef.current;
    const surface = screenShareSurfaceRef.current;
    const screenWithCam = Boolean(camEnabled && screenEnabled && cam && screen);
    const useOsPip = screenWithCam && surface != null && shouldUseOsCameraPip(surface);
    const useComposite = screenWithCam && !useOsPip;
    const wantCam = camEnabled && cam && !screenEnabled;
    const wantScreen = screenEnabled && screen && !screenWithCam;

    const keep = new Set<ILocalVideoTrack | IMicrophoneAudioTrack | ILocalAudioTrack>();
    if (mic && micOnRef.current) keep.add(mic);
    if (wantCam && cam) keep.add(cam);
    if (wantScreen && screen) keep.add(screen);
    if (useOsPip && screen) keep.add(screen);
    if (useComposite && compositeTrackRef.current) keep.add(compositeTrackRef.current);
    if (screenEnabled && screenAudio) keep.add(screenAudio);

    for (const track of client.localTracks) {
      if (!keep.has(track as ILocalVideoTrack | IMicrophoneAudioTrack | ILocalAudioTrack)) {
        try {
          await client.unpublish([track]);
        } catch {
          /* noop */
        }
      }
    }

    if (useComposite) {
      await closeHostCameraPip();
      await cam!.setEnabled(true);

      try {
        if (!compositorRef.current) {
          compositorRef.current = new LiveCanvasCompositor();
          compositorRef.current.setPip(pipRectRef.current);
        }
        await compositorRef.current.setSources(screen!, cam!);
        const compositeTrack = await compositorRef.current.preparePublishTrack();
        compositeTrackRef.current = compositeTrack;

        if (!client.localTracks.includes(compositeTrack)) {
          await client.publish([compositeTrack]);
        }

        requestAnimationFrame(() => {
          if (compositePreviewRef.current) {
            compositorRef.current?.mountPreview(compositePreviewRef.current);
          }
        });
      } catch (e) {
        console.error('composite publish', e);
        toast.error('Không ghép được camera vào màn hình. Thử share lại hoặc dùng Chrome/Edge.');
      }
    } else if (useOsPip) {
      await stopCompositor();

      await cam!.setEnabled(true);
      if (!isHostCameraPipActive()) {
        cam!.stop();
      }

      if (!client.localTracks.includes(screen!)) {
        await client.publish([screen!]);
      }
      requestAnimationFrame(() => {
        if (localScreenRef.current) screen!.play(localScreenRef.current, { fit: 'contain' });
      });

      if (!isHostCameraPipActive()) {
        void openHostCameraPip(cam!);
      }
    } else {
      await stopCompositor();
      await closeHostCameraPip();
      if (wantCam) {
        await restoreHostCameraTrack(cam!);
        if (client.localTracks.includes(cam!)) {
          try {
            await client.unpublish([cam!]);
          } catch {
            /* noop */
          }
        }
        await client.publish([cam!]);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (localCamRef.current) cam!.play(localCamRef.current);
          });
        });
      } else if (cam && !camEnabled) {
        cam.stop();
      }

      if (wantScreen) {
        if (!client.localTracks.includes(screen!)) await client.publish([screen!]);
        requestAnimationFrame(() => {
          if (localScreenRef.current) screen!.play(localScreenRef.current, { fit: 'contain' });
        });
      }
    }

    if (mic) {
      if (micOnRef.current) {
        if (!client.localTracks.includes(mic)) await client.publish([mic]);
      } else if (client.localTracks.includes(mic)) {
        await client.unpublish([mic]);
      }
    }

    if (screenAudio) {
      if (screenEnabled) {
        if (!client.localTracks.includes(screenAudio)) await client.publish([screenAudio]);
      } else if (client.localTracks.includes(screenAudio)) {
        await client.unpublish([screenAudio]);
      }
    }
  }, [stopCompositor]);

  const queuePublishSync = useCallback(() => {
    publishSyncRef.current = publishSyncRef.current
      .then(() => syncPublish())
      .catch((e) => {
        console.error('syncPublish', e);
      });
    return publishSyncRef.current;
  }, [syncPublish]);

  useEffect(() => {
    if (!session || session.status !== 'live' || !isHost || !AGORA_APP_ID) return;
    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    const run = async () => {
      try {
        const { token, uid } = await fetchLiveRtcToken(session.channelName, 'publisher');
        if (cancelled) return;
        await client.join(AGORA_APP_ID, session.channelName, token, uid);
        if (cancelled) return;

        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        const cam = await AgoraRTC.createCameraVideoTrack();
        micTrackRef.current = mic;
        camTrackRef.current = cam;
        await mic.setEnabled(true);
        await cam.setEnabled(true);
        setMicOn(true);
        setCamOn(true);
        setJoinedRtc(true);
        await syncPublish();
      } catch (e) {
        console.error(e);
        toast.error('Không vào được kênh phát sóng');
      }
    };

    void run();

    return () => {
      cancelled = true;
      setJoinedRtc(false);
      void cleanupLocalTracks();
      void client.leave();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, [cleanupLocalTracks, isHost, session?.channelName, session?.status, sessionId, syncPublish]);

  useEffect(() => {
    if (!joinedRtc) return;
    void queuePublishSync();
  }, [camOn, screenOn, joinedRtc, queuePublishSync]);

  useEffect(() => {
    if (!joinedRtc || !sessionId) return;
    socketService.emit('live:host-publish-start', { sessionId });
    return () => {
      socketService.emit('live:host-publish-stop', { sessionId });
    };
  }, [joinedRtc, sessionId]);

  useEffect(() => {
    if (!screenWithCamPipMode) {
      void closeHostCameraPip();
    }
  }, [screenWithCamPipMode]);

  useEffect(() => {
    if (!screenOn || !joinedRtc || screenWithCamCompositeMode) return;
    const screen = screenTrackRef.current;
    if (!screen) return;
    const id = requestAnimationFrame(() => {
      if (localScreenRef.current) {
        screen.play(localScreenRef.current, { fit: 'contain' });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [screenWithCamCompositeMode, screenWithCamPipMode, screenOn, joinedRtc]);

  useEffect(() => {
    if (screenOn || !camOn || !joinedRtc || screenWithCamMode) return;
    const cam = camTrackRef.current;
    if (!cam) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (localCamRef.current) cam.play(localCamRef.current);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [screenOn, camOn, screenWithCamMode, joinedRtc]);

  useEffect(() => {
    if (!session?.startedAt || session.status !== 'live') return;
    const id = window.setInterval(() => setDurationNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session?.startedAt, session?.status]);

  const liveDuration = session?.startedAt
    ? formatLiveDuration(session.startedAt, durationNow)
    : '00:00:00';

  const toggleMic = useCallback(async () => {
    const t = micTrackRef.current;
    if (!t) return;
    const next = !micOn;
    await t.setEnabled(next);
    setMicOn(next);
    await queuePublishSync();
  }, [micOn, queuePublishSync]);

  const toggleCam = useCallback(async () => {
    const t = camTrackRef.current;
    if (!t) return;
    const next = !camOn;

    if (next) {
      await t.setEnabled(true);
      const surface = screenShareSurfaceRef.current;
      if (
        screenOnRef.current &&
        screenTrackRef.current &&
        surface != null &&
        shouldUseOsCameraPip(surface) &&
        !isHostCameraPipActive()
      ) {
        void openHostCameraPip(t);
      }
    } else {
      await t.setEnabled(false);
    }

    camOnRef.current = next;
    setCamOn(next);
    await queuePublishSync();
  }, [camOn, queuePublishSync]);

  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    const screen = screenTrackRef.current;
    const screenAudio = screenAudioTrackRef.current;
    const cam = camTrackRef.current;

    await closeHostCameraPip();
    await stopCompositor();

    if (screenAudio) {
      if (client?.connectionState === 'CONNECTED' && client.localTracks.includes(screenAudio)) {
        try {
          await client.unpublish([screenAudio]);
        } catch {
          /* noop */
        }
      }
      screenAudio.close();
      screenAudioTrackRef.current = null;
    }

    if (screen) {
      if (client?.connectionState === 'CONNECTED' && client.localTracks.includes(screen)) {
        try {
          await client.unpublish([screen]);
        } catch {
          /* noop */
        }
      }
      screen.close();
      screenTrackRef.current = null;
    }

    setScreenOn(false);
    setScreenShareSurface(null);
    screenOnRef.current = false;
    screenShareSurfaceRef.current = null;

    if (cam && camOnRef.current) {
      await restoreHostCameraTrack(cam);
    }

    await queuePublishSync();
  }, [queuePublishSync, stopCompositor]);

  const startScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') {
      toast.warn('Đang kết nối phòng live, vui lòng thử lại sau vài giây.');
      return;
    }

    try {
      const willScreenWithCam = camOn && camTrackRef.current;

      if (willScreenWithCam && camTrackRef.current && !isHostCameraPipActive()) {
        void openHostCameraPip(camTrackRef.current);
      }

      // 'auto' → hộp thoại trình duyệt có tuỳ chọn "Chia sẻ âm thanh tab" (Chrome/Edge).
      const created = await AgoraRTC.createScreenVideoTrack({ encoderConfig: '1080p_1' }, 'auto');

      let screenTrack: ILocalVideoTrack;
      if (Array.isArray(created)) {
        screenTrack = created[0];
        screenAudioTrackRef.current = created[1] ?? null;
      } else {
        screenTrack = created;
        screenAudioTrackRef.current = null;
      }

      const surface = getScreenShareSurface(screenTrack);
      screenShareSurfaceRef.current = surface;
      setScreenShareSurface(surface);

      if (willScreenWithCam && !shouldUseOsCameraPip(surface)) {
        await closeHostCameraPip();
      }

      screenTrack.on('track-ended', () => {
        void stopScreenShare();
      });
      screenAudioTrackRef.current?.on('track-ended', () => {
        screenAudioTrackRef.current?.close();
        screenAudioTrackRef.current = null;
        void queuePublishSync();
      });

      screenTrackRef.current = screenTrack;
      screenOnRef.current = true;
      setScreenOn(true);

      await queuePublishSync();
    } catch (e) {
      console.error(e);
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        toast.info('Đã huỷ chia sẻ màn hình');
      } else {
        toast.error('Không chia sẻ được màn hình');
      }
    }
  }, [camOn, queuePublishSync, stopScreenShare]);

  const toggleScreen = useCallback(async () => {
    if (screenOn && screenTrackRef.current) {
      const client = clientRef.current;
      if (client?.connectionState === 'CONNECTED') {
        await stopScreenShare();
      } else {
        setScreenOn(false);
        screenOnRef.current = false;
        screenTrackRef.current?.close();
        screenTrackRef.current = null;
        screenAudioTrackRef.current?.close();
        screenAudioTrackRef.current = null;
        setScreenShareSurface(null);
      }
      return;
    }

    await startScreenShare();
  }, [screenOn, startScreenShare, stopScreenShare]);

  const sendChat = useCallback(() => {
    const t = chatInput.trim();
    if (!t) return;
    socketService.emit('live:chat-message', { sessionId, text: t });
    setChatInput('');
  }, [chatInput, sessionId]);

  const handleEnd = useCallback(async () => {
    if (!session || session.hostUserId !== currentUserId) return;
    try {
      await endSession({ sessionId }).unwrap();
      navigate('/live', { replace: true });
    } catch {
      toast.error('Không kết thúc được phiên');
    }
  }, [currentUserId, endSession, navigate, session, sessionId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-90 flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="fixed inset-0 z-90 flex flex-col items-center justify-center gap-4 px-4 bg-background">
        <p className="text-muted-foreground">Không tải được phiên.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/live')}>
          Về danh sách
        </Button>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="fixed inset-0 z-90 flex flex-col items-center justify-center gap-4 px-4 bg-background text-center">
        <p className="text-muted-foreground max-w-md">
          Chỉ host của phiên mới mở được Live Studio.
        </p>
        <Button type="button" onClick={() => navigate(`/live/${sessionId}`)}>
          Mở chế độ xem
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-90 flex flex-col bg-background text-foreground">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white shrink-0">
            <Radio className="h-3 w-3" />
            LIVE
          </span>
          <h1 className="font-semibold truncate text-sm sm:text-base">{session.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="font-medium text-foreground">{viewerCount}</span>
            <span className="hidden sm:inline">đang xem</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-foreground">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {liveDuration}
          </span>
        </div>
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
        {isHost && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={ending}
            onClick={() => void handleEnd()}
          >
            Kết thúc phiên
          </Button>
        )}
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-2 sm:p-3 gap-2">
          <div
            ref={videoShellRef}
            className="relative flex-1 min-h-[200px] rounded-2xl overflow-hidden bg-zinc-900 border border-border"
          >
            {screenWithCamCompositeMode && (
              <>
                <div ref={compositePreviewRef} className="absolute inset-0" />
                <LiveCompositePipOverlay pip={pipRect} onChange={handlePipRectChange} />
              </>
            )}
            {screenWithCamPipMode && (
              <div ref={localScreenRef} className="absolute inset-0 [&_video]:object-contain" />
            )}
            {screenOn && !screenWithCamMode && (
              <div ref={localScreenRef} className="absolute inset-0 [&_video]:object-contain" />
            )}
            {camOn && !screenWithCamMode && (
              <div ref={localCamRef} className="absolute inset-0 [&_video]:object-cover" />
            )}
            {!camOn && !screenOn && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Bật camera hoặc chia sẻ màn hình
              </div>
            )}

            <LiveFloatingReactions sessionId={sessionId} containerRect={videoRect} />
          </div>

          <div className="shrink-0 flex flex-wrap items-center justify-center gap-2 py-3 border-t border-border">
            <Button
              type="button"
              size="icon"
              variant={micOn ? 'secondary' : 'outline'}
              onClick={() => void toggleMic()}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant={camOn ? 'secondary' : 'outline'}
              onClick={() => void toggleCam()}
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant={screenOn ? 'default' : 'outline'}
              onClick={() => void toggleScreen()}
            >
              <MonitorUp className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {chatOpen && (
          <aside className="w-[min(100%,380px)] border-l border-border flex flex-col min-h-0 bg-card shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Chat</span>
            </div>
            <LiveHostChatPanel
              messages={messages}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              onSend={sendChat}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
