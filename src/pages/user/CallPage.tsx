import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  MonitorUp,
  MonitorOff,
} from 'lucide-react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
  type ILocalVideoTrack,
  type IAgoraRTCRemoteUser,
} from 'agora-rtc-react';
import { useCallContext } from '@/contexts/CallContext';
import { socketService } from '@/services/socket';
import type { RootState, AppDispatch } from '@/store/store';
import {
  setCallConnected,
  setCallEnded,
  resetCall,
  setScreenSharing,
  setEndReason,
} from '@/store/slices/callSlice';
import outgoingRingback from '@/assets/ringtones/amThanhGoi.mp3';

export default function CallPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const channelName = searchParams.get('channel');
  const urlCallType = searchParams.get('type') as 'audio' | 'video' | null;
  const conversationIdParam = searchParams.get('conversationId');
  const returnToParam = searchParams.get('returnTo');

  const {
    endCall,
    fetchAgoraToken,
    appId,
    onToggleMic,
    onToggleCamera,
    requestUpgradeToVideo,
    respondUpgradeToVideo,
  } = useCallContext();
  const {
    status,
    callType,
    isMicOn,
    isCameraOn,
    upgradeStatus,
    isScreenSharing,
    returnTo,
    conversationId,
    calleeId,
    endReason,
  } = useSelector((state: RootState) => state.call);

  const resolvedReturnTo = decodeURIComponent(returnToParam || returnTo || '/chat');
  const resolvedConversationId = decodeURIComponent(conversationIdParam || conversationId || '');

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  const [joined, setJoined] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const ringbackRef = useRef<HTMLAudioElement | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const isVideoCall = (urlCallType ?? callType) === 'video';
  const isVideoCallRef = useRef(isVideoCall);
  if (isVideoCall) isVideoCallRef.current = true;

  const createTrackWithRetry = async <T,>(
    factory: () => Promise<T>,
    retries = 3,
    delayMs = 800,
  ): Promise<T> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await factory();
      } catch (e: unknown) {
        const isDeviceBusy =
          e instanceof Error && /NOT_READABLE|in use/i.test(e.message);
        if (!isDeviceBusy || i === retries - 1) throw e;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error('Track creation failed');
  };

  // Ringback for caller while waiting (outgoing-ringing)
  useEffect(() => {
    const audio = new Audio(outgoingRingback);
    audio.loop = true;
    audio.volume = 0.55;
    ringbackRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      ringbackRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = ringbackRef.current;
    if (!audio) return;
    const shouldPlay = status === 'outgoing-ringing';
    if (shouldPlay) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [status]);

  useEffect(() => {
    if (!channelName) {
      navigate(resolvedReturnTo);
      return;
    }

    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;
    const videoCall = isVideoCallRef.current;

    const init = async () => {
      try {
        const { token, uid } = await fetchAgoraToken(channelName);
        if (cancelled) return;

        client.on('user-joined', () => {
          dispatch(setCallConnected());
        });

        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current);
            setRemoteHasVideo(true);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
          setRemoteUser(user);
        });

        client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
          if (mediaType === 'video') {
            user.videoTrack?.stop();
            setRemoteHasVideo(false);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.stop();
          }
        });

        client.on('user-left', () => {
          setRemoteUser(null);
          setRemoteHasVideo(false);
          dispatch(setCallEnded());
        });

        await client.join(appId, channelName, token, uid);
        if (cancelled) return;
        setJoined(true);

        const micTrack = await createTrackWithRetry(() =>
          AgoraRTC.createMicrophoneAudioTrack(),
        );
        if (cancelled) { (micTrack as IMicrophoneAudioTrack).close(); return; }
        micTrackRef.current = micTrack;

        if (videoCall) {
          const camTrack = await createTrackWithRetry(() =>
            AgoraRTC.createCameraVideoTrack(),
          );
          if (cancelled) { (camTrack as ICameraVideoTrack).close(); (micTrack as IMicrophoneAudioTrack).close(); return; }
          camTrackRef.current = camTrack;
          if (localVideoRef.current) {
            (camTrack as ICameraVideoTrack).play(localVideoRef.current);
          }
          await client.publish([micTrack, camTrack]);
        } else {
          await client.publish([micTrack]);
        }
      } catch (err) {
        console.error('Agora join failed:', err);
        if (!cancelled) navigate(resolvedReturnTo);
      }
    };

    init();

    return () => {
      cancelled = true;
      micTrackRef.current?.close();
      camTrackRef.current?.close();
      screenTrackRef.current?.close();
      micTrackRef.current = null;
      camTrackRef.current = null;
      screenTrackRef.current = null;
      // Luôn leave đúng instance client của effect này (StrictMode: ref có thể đã trỏ client khác)
      void client.leave().catch(() => undefined);
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [channelName, appId, fetchAgoraToken, dispatch, navigate]);

  useEffect(() => {
    micTrackRef.current?.setEnabled(isMicOn);
  }, [isMicOn]);

  useEffect(() => {
    camTrackRef.current?.setEnabled(isCameraOn);
  }, [isCameraOn]);

  // Handle upgrade accepted: create and publish camera track
  useEffect(() => {
    if (upgradeStatus !== 'accepted') return;
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    let cancelled = false;
    const enableCamera = async () => {
      try {
        if (!camTrackRef.current) {
          const camTrack = await createTrackWithRetry(() =>
            AgoraRTC.createCameraVideoTrack(),
          );
          if (cancelled) { (camTrack as ICameraVideoTrack).close(); return; }
          camTrackRef.current = camTrack;
          await client.publish([camTrack]);
        }
        if (localVideoRef.current && camTrackRef.current) {
          camTrackRef.current.play(localVideoRef.current);
        }
      } catch (err) {
        console.error('Failed to enable camera for upgrade:', err);
      }
    };

    enableCamera();
    return () => { cancelled = true; };
  }, [upgradeStatus]);

  useEffect(() => {
    if (status !== 'ended') return;
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    screenTrackRef.current?.close();
    if (clientRef.current?.connectionState === 'CONNECTED') {
      clientRef.current.leave();
    }
    // Nếu có endReason (missed/rejected) thì show full-screen UI một lúc rồi mới thoát
    if (endReason) {
      const t = window.setTimeout(() => {
        dispatch(resetCall());
        navigate(resolvedReturnTo);
      }, 2200);
      return () => window.clearTimeout(t);
    }
    dispatch(resetCall());
    navigate(resolvedReturnTo);
  }, [status, dispatch, navigate, resolvedReturnTo, endReason]);

  // Timeout outgoing call: nếu B không accept/reject trong X giây => coi như bận
  useEffect(() => {
    if (status !== 'outgoing-ringing') return;
    const timeoutMs = 25_000;
    const t = window.setTimeout(() => {
      // Nếu vẫn đang ringing thì timeout
      dispatch(setEndReason('missed'));
      // Notify backend to log missed call + close callee modal
      if (channelName && resolvedConversationId && calleeId) {
        socketService.emit('call:missed', {
          channelName,
          peerId: calleeId,
          conversationId: resolvedConversationId,
          type: (urlCallType ?? callType ?? 'audio'),
        });
      }
      dispatch(setCallEnded());
    }, timeoutMs);
    return () => window.clearTimeout(t);
  }, [status, dispatch, channelName, resolvedConversationId, calleeId, urlCallType, callType]);

  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = useCallback(() => {
    // Include duration + completed result
    // endCall() will emit call:end; backend will create call log message
    endCall({ durationSec: timer, result: 'completed' });
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    screenTrackRef.current?.close();
    if (clientRef.current?.connectionState === 'CONNECTED') {
      clientRef.current.leave();
    }
    setTimeout(() => {
      dispatch(resetCall());
      navigate(resolvedReturnTo);
    }, 500);
  }, [endCall, timer, dispatch, navigate, resolvedReturnTo]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  const restoreCameraAfterScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;
    const cam = camTrackRef.current;
    if (cam) {
      await cam.setEnabled(true);
      await client.publish([cam]);
      if (localVideoRef.current) cam.play(localVideoRef.current);
    }
    dispatch(setScreenSharing(false));
  }, [dispatch]);

  const handleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    if (isScreenSharing) {
      if (screenTrackRef.current) {
        await client.unpublish([screenTrackRef.current]);
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      await restoreCameraAfterScreenShare();
    } else {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: '1080p_1' },
          'disable',
        ) as ILocalVideoTrack;

        screenTrack.on('track-ended', async () => {
          if (clientRef.current?.connectionState === 'CONNECTED') {
            try { await clientRef.current.unpublish([screenTrack]); } catch { /* already unpublished */ }
          }
          screenTrack.close();
          screenTrackRef.current = null;
          await restoreCameraAfterScreenShare();
        });

        if (camTrackRef.current) {
          camTrackRef.current.stop();
          await client.unpublish([camTrackRef.current]);
        }

        screenTrackRef.current = screenTrack;
        await client.publish([screenTrack]);
        if (localVideoRef.current) screenTrack.play(localVideoRef.current);
        dispatch(setScreenSharing(true));
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    }
  }, [isScreenSharing, dispatch, restoreCameraAfterScreenShare]);

  const currentCallIsVideo = callType === 'video' || upgradeStatus === 'accepted';

  const statusLabel =
    status === 'connected'
      ? `Đang gọi • ${formatTime(timer)}`
      : joined
        ? 'Đang chờ người tham gia...'
        : 'Đang kết nối...';

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Full-screen failure UI (missed / rejected) */}
      <AnimatePresence>
        {status === 'ended' && endReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] flex items-center justify-center bg-gray-950"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              className="w-[360px] max-w-[92vw] rounded-3xl bg-white/5 border border-white/10 p-7 text-center shadow-2xl"
            >
              <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-blue-600/15 flex items-center justify-center">
                {endReason === 'rejected' ? (
                  <PhoneOff className="w-8 h-8 text-red-400" />
                ) : (
                  <PhoneOff className="w-8 h-8 text-yellow-300" />
                )}
              </div>
              <p className="text-xl font-bold">
                {endReason === 'rejected' ? 'Cuộc gọi bị từ chối' : 'Cuộc gọi nhỡ'}
              </p>
              <p className="text-sm text-white/60 mt-2">
                {endReason === 'rejected'
                  ? 'Người nghe đã từ chối cuộc gọi.'
                  : 'Người nghe không phản hồi.'}
              </p>
              <p className="text-xs text-white/40 mt-5">
                Tự động quay lại cuộc trò chuyện...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote video — always in DOM, visibility controlled by CSS */}
      <div
        ref={remoteVideoRef}
        className={`absolute inset-0 z-0 ${remoteHasVideo ? '' : 'invisible'}`}
      />

      {/* Avatar / audio indicator overlay (hidden when remote video is active) */}
      {!remoteHasVideo && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          {remoteUser && !currentCallIsVideo ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center animate-pulse">
                <Mic className="w-14 h-14" />
              </div>
              <p className="text-white/60 text-sm font-medium">Đang nghe...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-5xl font-bold">
                ?
              </div>
              {!remoteUser && (
                <p className="text-white/40 text-sm">Đang chờ người tham gia...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Upgrade to video: incoming request prompt */}
      <AnimatePresence>
        {upgradeStatus === 'pending-incoming' && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[340px]"
          >
            <div className="rounded-2xl bg-gray-900/95 border border-white/10 backdrop-blur-xl p-5 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Yêu cầu chuyển sang Video</p>
                  <p className="text-xs text-white/50">Đối phương muốn bật camera</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => respondUpgradeToVideo(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-all"
                >
                  Từ chối
                </button>
                <button
                  onClick={() => respondUpgradeToVideo(true)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-all"
                >
                  Chấp nhận
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade to video: outgoing pending indicator */}
      <AnimatePresence>
        {upgradeStatus === 'pending-outgoing' && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="rounded-2xl bg-gray-900/95 border border-white/10 backdrop-blur-xl px-6 py-4 shadow-2xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/70">Đang chờ đối phương chấp nhận...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {currentCallIsVideo ? 'Video Call' : 'Voice Call'}
          </h2>
          <p className="text-sm text-white/50 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {statusLabel}
          </p>
        </div>
        <button
          onClick={toggleFullScreen}
          className="p-3 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
        >
          {isFullScreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </motion.div>

      <div className="flex-1" />

      {/* Local self-view (video/screen share) */}
      {currentCallIsVideo && (
        <motion.div
          drag
          dragConstraints={{ left: -500, right: 500, top: -300, bottom: 300 }}
          className="absolute bottom-36 right-6 w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-move z-20 bg-gray-800"
        >
          <div ref={localVideoRef} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-lg text-[10px] font-bold">
            {isScreenSharing ? 'Màn hình' : 'Bạn'}
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="relative z-10 p-8 flex items-center justify-center gap-4"
      >
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          title={isMicOn ? 'Tắt mic' : 'Bật mic'}
          className={`p-4 rounded-2xl transition-all ${
            !isMicOn
              ? 'bg-red-600 text-white'
              : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
          }`}
        >
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        {/* Camera toggle (only in video mode) */}
        {currentCallIsVideo && (
          <button
            onClick={onToggleCamera}
            title={isCameraOn ? 'Tắt camera' : 'Bật camera'}
            className={`p-4 rounded-2xl transition-all ${
              !isCameraOn
                ? 'bg-red-600 text-white'
                : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
            }`}
          >
            {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        )}

        {/* Switch to video (only in audio mode, when connected) */}
        {!currentCallIsVideo && status === 'connected' && upgradeStatus === 'none' && (
          <button
            onClick={requestUpgradeToVideo}
            title="Chuyển sang Video Call"
            className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-blue-600/80 transition-all"
          >
            <Video className="w-6 h-6" />
          </button>
        )}

        {/* Screen share (only in video mode) */}
        {currentCallIsVideo && (
          <button
            onClick={handleScreenShare}
            title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            className={`p-4 rounded-2xl transition-all ${
              isScreenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
            }`}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-6 h-6" />
            ) : (
              <MonitorUp className="w-6 h-6" />
            )}
          </button>
        )}

        {/* End call */}
        <button
          onClick={handleEndCall}
          title="Kết thúc cuộc gọi"
          className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/40 transition-all hover:scale-110 active:scale-95"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </motion.div>
    </div>
  );
}
