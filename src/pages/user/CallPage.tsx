import { useState, useEffect, useCallback } from 'react';
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
import AgoraRTC, { AgoraRTCProvider, useRTCClient } from 'agora-rtc-react';
import {
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
  LocalUser,
  RemoteUser,
} from 'agora-rtc-react';
import { useCallContext } from '@/contexts/CallContext';
import type { RootState, AppDispatch } from '@/store/store';
import { setCallConnected, resetCall } from '@/store/slices/callSlice';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function CallPage() {
  return (
    <AgoraRTCProvider client={client}>
      <CallPageInner />
    </AgoraRTCProvider>
  );
}

function CallPageInner() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const channelName = searchParams.get('channel');

  const { endCall, fetchAgoraToken, appId, onToggleMic, onToggleCamera } = useCallContext();
  const { status, callType, isMicOn, isCameraOn } = useSelector(
    (state: RootState) => state.call,
  );

  const [agoraToken, setAgoraToken] = useState<string | null>(null);
  const [agoraUid, setAgoraUid] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);

  const agoraClient = useRTCClient();

  useEffect(() => {
    if (!channelName) {
      navigate('/chat');
      return;
    }

    fetchAgoraToken(channelName)
      .then((res) => {
        setAgoraToken(res.token);
        setAgoraUid(res.uid);
      })
      .catch(() => {
        navigate('/chat');
      });
  }, [channelName, fetchAgoraToken, navigate]);

  const isVideoCall = callType === 'video';
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isMicOn);
  const { localCameraTrack } = useLocalCameraTrack(isVideoCall && isCameraOn);

  const canJoin = !!channelName && !!agoraToken && agoraUid > 0;
  useJoin(
    { appid: appId, channel: channelName || '', token: agoraToken },
    canJoin,
    agoraUid,
  );

  const tracksToPublish = isVideoCall
    ? [localMicrophoneTrack, localCameraTrack]
    : [localMicrophoneTrack];
  usePublish(tracksToPublish);

  const remoteUsers = useRemoteUsers();

  useEffect(() => {
    if (!agoraClient) return;

    const onUserJoined = () => dispatch(setCallConnected());
    agoraClient.on('user-joined', onUserJoined);

    return () => {
      agoraClient.off('user-joined', onUserJoined);
    };
  }, [agoraClient, dispatch]);

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
    localMicrophoneTrack?.close();
    localCameraTrack?.close();
    setTimeout(() => {
      dispatch(resetCall());
      navigate('/chat');
    }, 500);
  }, [endCall, localMicrophoneTrack, localCameraTrack, dispatch, navigate]);

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
      : status === 'connecting'
        ? 'Đang kết nối...'
        : 'Đang đổ chuông...';

  const remoteUser = remoteUsers[0];

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Remote video / avatar */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {remoteUser && isVideoCall ? (
          <RemoteUser
            user={remoteUser}
            playVideo={true}
            playAudio={true}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
      </div>

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
          <LocalUser
            audioTrack={localMicrophoneTrack}
            videoTrack={localCameraTrack}
            cameraOn={isCameraOn}
            micOn={isMicOn}
            playAudio={false}
            style={{ width: '100%', height: '100%' }}
          />
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
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
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
