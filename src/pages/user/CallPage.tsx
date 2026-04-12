import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'motion/react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type ICameraVideoTrack,
  type IAgoraRTCRemoteUser,
} from 'agora-rtc-react';
import { useCallContext } from '@/contexts/CallContext';
import type { RootState, AppDispatch } from '@/store/store';
import { setCallConnected, setCallEnded, resetCall } from '@/store/slices/callSlice';

export default function CallPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const channelName = searchParams.get('channel');
  const urlCallType = searchParams.get('type') as 'audio' | 'video' | null;

  const { endCall, fetchAgoraToken, appId, onToggleMic, onToggleCamera } =
    useCallContext();
  const { status, callType, isMicOn, isCameraOn } = useSelector(
    (state: RootState) => state.call,
  );

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(
    null,
  );
  const [joined, setJoined] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const isVideoCall = (urlCallType ?? callType) === 'video';
  const isVideoCallRef = useRef(isVideoCall);
  if (isVideoCall) isVideoCallRef.current = true;

  // Join channel + create tracks + publish
  useEffect(() => {
    if (!channelName) {
      navigate('/chat');
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

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
          setRemoteUser(user);
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            user.videoTrack?.stop();
          }
          if (mediaType === 'audio') {
            user.audioTrack?.stop();
          }
        });

        client.on('user-left', () => {
          setRemoteUser(null);
          dispatch(setCallEnded());
        });

        await client.join(appId, channelName, token, uid);
        if (cancelled) return;
        setJoined(true);

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

        const micTrack = await createTrackWithRetry(() =>
          AgoraRTC.createMicrophoneAudioTrack(),
        );
        if (cancelled) { micTrack.close(); return; }
        micTrackRef.current = micTrack;

        if (videoCall) {
          const camTrack = await createTrackWithRetry(() =>
            AgoraRTC.createCameraVideoTrack(),
          );
          if (cancelled) { camTrack.close(); micTrack.close(); return; }
          camTrackRef.current = camTrack;
          if (localVideoRef.current) {
            camTrack.play(localVideoRef.current);
          }
          await client.publish([micTrack, camTrack]);
        } else {
          await client.publish([micTrack]);
        }
      } catch (err) {
        console.error('Agora join failed:', err);
        if (!cancelled) navigate('/chat');
      }
    };

    init();

    return () => {
      cancelled = true;
      micTrackRef.current?.close();
      camTrackRef.current?.close();
      if (clientRef.current?.connectionState === 'CONNECTED') {
        clientRef.current.leave();
      }
      clientRef.current = null;
    };
  }, [channelName, appId, fetchAgoraToken, dispatch, navigate]);

  // Sync mic mute state
  useEffect(() => {
    micTrackRef.current?.setEnabled(isMicOn);
  }, [isMicOn]);

  // Sync camera state
  useEffect(() => {
    camTrackRef.current?.setEnabled(isCameraOn);
  }, [isCameraOn]);

  // Auto-exit when the remote peer ends the call or leaves Agora channel
  useEffect(() => {
    if (status !== 'ended') return;
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    if (clientRef.current?.connectionState === 'CONNECTED') {
      clientRef.current.leave();
    }
    dispatch(resetCall());
    navigate('/chat');
  }, [status, dispatch, navigate]);

  // Call timer
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
    endCall();
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    if (clientRef.current?.connectionState === 'CONNECTED') {
      clientRef.current.leave();
    }
    setTimeout(() => {
      dispatch(resetCall());
      navigate('/chat');
    }, 500);
  }, [endCall, dispatch, navigate]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  const statusLabel =
    status === 'connected'
      ? `Đang gọi • ${formatTime(timer)}`
      : joined
        ? 'Đang chờ người tham gia...'
        : 'Đang kết nối...';

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Remote video / avatar */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {remoteUser && isVideoCall ? (
          <div
            ref={remoteVideoRef}
            className="w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-5xl font-bold">
              {remoteUser ? '?' : '?'}
            </div>
            {!remoteUser && (
              <p className="text-white/40 text-sm">
                Đang chờ người tham gia...
              </p>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* Remote audio-only indicator */}
      {remoteUser && !isVideoCall && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center text-5xl font-bold animate-pulse">
              <Mic className="w-14 h-14" />
            </div>
            <p className="text-white/60 text-sm font-medium">Đang nghe...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Local self-view (video call only) */}
      {isVideoCall && (
        <motion.div
          drag
          dragConstraints={{ left: -500, right: 500, top: -300, bottom: 300 }}
          className="absolute bottom-36 right-6 w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-move z-20 bg-gray-800"
        >
          <div ref={localVideoRef} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-lg text-[10px] font-bold">
            Bạn
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="relative z-10 p-8 flex items-center justify-center gap-5"
      >
        <button
          onClick={onToggleMic}
          className={`p-5 rounded-2xl transition-all ${
            !isMicOn
              ? 'bg-red-600 text-white'
              : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
          }`}
        >
          {isMicOn ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        {isVideoCall && (
          <button
            onClick={onToggleCamera}
            className={`p-5 rounded-2xl transition-all ${
              !isCameraOn
                ? 'bg-red-600 text-white'
                : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
            }`}
          >
            {isCameraOn ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="p-6 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/40 transition-all hover:scale-110 active:scale-95"
        >
          <PhoneOff className="w-8 h-8" />
        </button>
      </motion.div>
    </div>
  );
}
