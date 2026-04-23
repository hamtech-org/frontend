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
  LogOut,
  Users,
  Pin,
  PinOff,
  PanelRight,
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
import { groupApi } from '@/services/chat/groupApi';
import { apiClient } from '@/services/api';
import type { RootState, AppDispatch } from '@/store/store';
import {
  setCallConnected,
  setCallEnded,
  resetCall,
  setScreenSharing,
  setEndReason,
} from '@/store/slices/callSlice';
import outgoingRingback from '@/assets/ringtones/amThanhGoi.mp3';
import SparkMD5 from 'spark-md5';

export default function CallPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const channelName = searchParams.get('channel');
  const urlCallType = searchParams.get('type') as 'audio' | 'video' | null;
  const conversationIdParam = searchParams.get('conversationId');
  const returnToParam = searchParams.get('returnTo');
  const scopeParam = searchParams.get('scope');
  const hostIdParam = searchParams.get('hostId');

  const {
    endCall,
    leaveGroupCall,
    endGroupCallForAll,
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
    callScope,
    hostId,
    isMicOn,
    isCameraOn,
    upgradeStatus,
    isScreenSharing,
    returnTo,
    conversationId,
    calleeId,
    endReason,
  } = useSelector((state: RootState) => state.call);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.userId ?? '');

  const resolvedReturnTo = decodeURIComponent(returnToParam || returnTo || '/chat');
  const resolvedConversationId = decodeURIComponent(conversationIdParam || conversationId || '');
  const resolvedConversationIdRef = useRef(resolvedConversationId);
  resolvedConversationIdRef.current = resolvedConversationId;

  const userIdToAgoraUid = useCallback((userId: string): number => {
    // Backend: md5(userId) -> readUInt32BE(0)
    // SparkMD5 trả hex string 32 ký tự; 4 bytes đầu = 8 ký tự hex đầu.
    const hex = SparkMD5.hash(userId);
    return (parseInt(hex.slice(0, 8), 16) >>> 0) as number;
  }, []);

  const [agoraUidToName, setAgoraUidToName] = useState<Map<number, string>>(new Map());
  const agoraUidToNameRef = useRef(agoraUidToName);
  agoraUidToNameRef.current = agoraUidToName;

  useEffect(() => {
    // Lấy danh sách thành viên group để map uid -> displayName.
    // Chỉ cần khi đang call group.
    const groupId = resolvedConversationId;
    if (
      !groupId ||
      !(scopeParam === 'group' || callScope === 'group' || channelName?.startsWith('grp_'))
    ) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        // Ưu tiên endpoint members của conversation (đã thấy request này chạy trong UI).
        // Fallback sang groups/:id/members nếu backend cũ chỉ hỗ trợ group endpoint.
        const res =
          (await apiClient.get<{ data?: any[] }>(`/chat/conversations/${groupId}/members`)) ??
          (await groupApi.getMembers(groupId));
        const members = (res as any)?.data?.data ?? [];
        const map = new Map<number, string>();
        for (const m of members as Array<{
          userId?: string;
          displayName?: string;
          email?: string;
        }>) {
          const uid = m.userId ? userIdToAgoraUid(m.userId) : null;
          if (!uid) continue;
          const name = (m.displayName || m.email || '').trim();
          if (name) map.set(uid, name);
        }
        if (!cancelled) setAgoraUidToName(map);
      } catch {
        if (!cancelled) setAgoraUidToName(new Map());
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [resolvedConversationId, scopeParam, callScope, channelName, userIdToAgoraUid]);

  const labelForAgoraUid = useCallback((uid: unknown): string => {
    const n = typeof uid === 'number' ? uid : Number(uid);
    if (!Number.isFinite(n)) return 'Ẩn danh';
    return agoraUidToNameRef.current.get(n) ?? `UID ${n}`;
  }, []);

  const isGroup =
    callScope === 'group' || scopeParam === 'group' || Boolean(channelName?.startsWith('grp_'));
  const hostIdResolved = (hostId || hostIdParam || '').trim();
  const isHost = Boolean(hostIdResolved && currentUserId && hostIdResolved === currentUserId);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  /** UIDs người xa (nhóm) — cập nhật khi publish audio/video. */
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [joined, setJoined] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  /** Ghim video (camera hoặc màn hình chia sẻ) của một remote trong cuộc gọi nhóm — hiển thị fullscreen phía trên. */
  const [pinnedRemoteUid, setPinnedRemoteUid] = useState<number | null>(null);
  const [groupView, setGroupView] = useState<'grid' | 'pinned' | 'participants'>('grid');
  const [filmstripVisible, setFilmstripVisible] = useState(false);
  const groupViewRef = useRef(groupView);
  groupViewRef.current = groupView;
  const filmstripVisibleRef = useRef(filmstripVisible);
  filmstripVisibleRef.current = filmstripVisible;
  const ringbackRef = useRef<HTMLAudioElement | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const isGroupRef = useRef(isGroup);
  isGroupRef.current = isGroup;
  const pinnedRemoteUidRef = useRef<number | null>(null);
  pinnedRemoteUidRef.current = pinnedRemoteUid;

  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const pinnedMainRef = useRef<HTMLDivElement>(null);

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
        const isDeviceBusy = e instanceof Error && /NOT_READABLE|in use/i.test(e.message);
        if (!isDeviceBusy || i === retries - 1) throw e;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error('Track creation failed');
  };

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
    const group = channelName.startsWith('grp_');

    const subscribeRemoteIfNeeded = async (user: IAgoraRTCRemoteUser) => {
      const uidNum = Number(user.uid);
      if (!Number.isFinite(uidNum)) return;
      if (group) {
        setRemoteUids((prev) => (prev.includes(uidNum) ? prev : [...prev, uidNum]));
      } else {
        setRemoteUser(user);
      }

      // NOTE: `user-published` không phải lúc nào cũng bắn cho người vào muộn trong group call,
      // vì vậy ta chủ động subscribe dựa trên trạng thái hasAudio/hasVideo.
      if (user.hasAudio && !user.audioTrack) {
        const track = await client.subscribe(user, 'audio');
        track.play();
      }
      if (user.hasVideo && !user.videoTrack) {
        const track = await client.subscribe(user, 'video');
        if (group) {
          // `subscribe` sẽ gắn track vào user.videoTrack; dùng lại logic đặt vào grid/ghim.
          placeGroupRemoteVideo(user);
          setRemoteHasVideo(true);
        } else if (remoteVideoRef.current) {
          track.play(remoteVideoRef.current);
          setRemoteHasVideo(true);
        }
      }
    };

    /** Đặt video remote (camera hoặc screen track) vào ô grid hoặc vùng ghim theo `pinnedRemoteUidRef`. */
    const placeGroupRemoteVideo = (user: IAgoraRTCRemoteUser) => {
      const track = user.videoTrack;
      if (!track) return;
      const uidNum = Number(user.uid);
      const pinned = pinnedRemoteUidRef.current;
      track.stop();
      if (pinned === uidNum) {
        const main = pinnedMainRef.current;
        if (main) track.play(main);
      } else {
        // Khi đang ghim, tile remote chỉ tồn tại khi:
        // - đang ở màn Participants, hoặc
        // - đang bật filmstrip.
        if (pinned != null) {
          const view = groupViewRef.current;
          const filmstrip = filmstripVisibleRef.current;
          if (view !== 'participants' && !filmstrip) return;
        }
        const cell = document.getElementById(`agora-remote-${uidNum}`);
        if (cell) track.play(cell);
      }
    };

    const init = async () => {
      try {
        const { token, uid } = await fetchAgoraToken(channelName);
        if (cancelled) return;

        client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
          dispatch(setCallConnected());
          if (group) {
            const uidNum = Number(user.uid);
            if (!Number.isFinite(uidNum)) return;
            setRemoteUids((prev) => (prev.includes(uidNum) ? prev : [...prev, uidNum]));
          }
        });

        client.on(
          'user-published',
          async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
            await client.subscribe(user, mediaType);
            const uidNum = Number(user.uid);
            if (!Number.isFinite(uidNum)) return;
            if (group) {
              setRemoteUids((prev) => (prev.includes(uidNum) ? prev : [...prev, uidNum]));
            }
            if (mediaType === 'video') {
              if (group) {
                placeGroupRemoteVideo(user);
                setRemoteHasVideo(true);
              } else if (remoteVideoRef.current) {
                user.videoTrack?.play(remoteVideoRef.current);
                setRemoteHasVideo(true);
              }
            }
            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
            if (!group) setRemoteUser(user);
          },
        );

        client.on('user-info-updated', async (user: IAgoraRTCRemoteUser) => {
          try {
            await subscribeRemoteIfNeeded(user);
          } catch {
            // ignore noisy updates
          }
        });

        client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
          if (mediaType === 'video') {
            user.videoTrack?.stop();
            if (group && pinnedRemoteUidRef.current === Number(user.uid)) {
              setPinnedRemoteUid(null);
            }
            if (!group) {
              setRemoteHasVideo(false);
            } else {
              setRemoteHasVideo(client.remoteUsers.some((u) => u.videoTrack != null));
            }
          }
          if (mediaType === 'audio') {
            user.audioTrack?.stop();
          }
        });

        client.on('user-left', (user: IAgoraRTCRemoteUser) => {
          const uidNum = Number(user.uid);
          if (isGroupRef.current) {
            if (pinnedRemoteUidRef.current === uidNum) {
              setPinnedRemoteUid(null);
            }
            setRemoteUids((prev) => prev.filter((u) => u !== uidNum));
            if (client.remoteUsers.length === 0) {
              const convId = resolvedConversationIdRef.current;
              if (convId) {
                socketService.emit('call:group-vacant', {
                  channelName,
                  conversationId: convId,
                });
              }
              dispatch(setCallEnded());
            }
          } else {
            setRemoteUser(null);
            setRemoteHasVideo(false);
            dispatch(setCallEnded());
          }
        });

        await client.join(appId, channelName, token, uid);
        if (cancelled) return;
        setJoined(true);
        if (group) {
          dispatch(setCallConnected());
        }

        // Người vào kênh muộn có thể bỏ lỡ event `user-published` từ những người đã publish trước đó.
        // Chủ động subscribe lại danh sách remoteUsers hiện có để mọi client đều thấy nhau.
        try {
          for (const user of client.remoteUsers) {
            await subscribeRemoteIfNeeded(user);
          }
        } catch (e) {
          console.warn('[CallPage] subscribe existing remote users failed', e);
        }

        const micTrack = await createTrackWithRetry(() => AgoraRTC.createMicrophoneAudioTrack());
        if (cancelled) {
          (micTrack as IMicrophoneAudioTrack).close();
          return;
        }
        micTrackRef.current = micTrack;

        if (videoCall) {
          const camTrack = await createTrackWithRetry(() => AgoraRTC.createCameraVideoTrack());
          if (cancelled) {
            (camTrack as ICameraVideoTrack).close();
            (micTrack as IMicrophoneAudioTrack).close();
            return;
          }
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
      void client.leave().catch(() => undefined);
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [
    channelName,
    appId,
    fetchAgoraToken,
    dispatch,
    navigate,
    resolvedReturnTo,
    conversationIdParam,
    conversationId,
  ]);

  useEffect(() => {
    if (!isGroup) setPinnedRemoteUid(null);
  }, [isGroup]);

  // Đồng bộ groupView theo trạng thái ghim.
  useEffect(() => {
    if (!isGroup) return;
    if (pinnedRemoteUid != null) {
      setGroupView((v) => (v === 'participants' ? v : 'pinned'));
    } else {
      setGroupView('grid');
      setFilmstripVisible(false);
    }
  }, [isGroup, pinnedRemoteUid]);

  /** Khi đổi ghim hoặc danh sách UID, gắn lại mọi remote video vào ô grid hoặc vùng ghim fullscreen. */
  useEffect(() => {
    if (!isGroup || !isVideoCall) return;
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    const placeAll = () => {
      const pinned = pinnedRemoteUidRef.current;
      for (const user of client.remoteUsers) {
        const track = user.videoTrack;
        if (!track) continue;
        const uidNum = Number(user.uid);
        track.stop();
        if (pinned === uidNum) {
          const main = pinnedMainRef.current;
          if (main) track.play(main);
        } else {
          if (pinned != null) {
            const view = groupViewRef.current;
            const filmstrip = filmstripVisibleRef.current;
            if (view !== 'participants' && !filmstrip) continue;
          }
          const cell = document.getElementById(`agora-remote-${uidNum}`);
          if (cell) track.play(cell);
        }
      }
    };

    placeAll();
    const id = requestAnimationFrame(() => placeAll());
    return () => cancelAnimationFrame(id);
  }, [
    pinnedRemoteUid,
    remoteUids,
    isGroup,
    isVideoCall,
    joined,
    status,
    groupView,
    filmstripVisible,
  ]);

  useEffect(() => {
    micTrackRef.current?.setEnabled(isMicOn);
  }, [isMicOn]);

  useEffect(() => {
    camTrackRef.current?.setEnabled(isCameraOn);
  }, [isCameraOn]);

  useEffect(() => {
    if (isGroup) return;
    if (upgradeStatus !== 'accepted') return;
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    let cancelled = false;
    const enableCamera = async () => {
      try {
        if (!camTrackRef.current) {
          const camTrack = await createTrackWithRetry(() => AgoraRTC.createCameraVideoTrack());
          if (cancelled) {
            (camTrack as ICameraVideoTrack).close();
            return;
          }
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
    return () => {
      cancelled = true;
    };
  }, [upgradeStatus, isGroup]);

  useEffect(() => {
    if (status !== 'ended') return;
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    screenTrackRef.current?.close();
    if (clientRef.current?.connectionState === 'CONNECTED') {
      clientRef.current.leave();
    }
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

  useEffect(() => {
    if (status !== 'outgoing-ringing') return;
    const timeoutMs = 25_000;
    const t = window.setTimeout(() => {
      dispatch(setEndReason('missed'));
      const type = (urlCallType ?? callType ?? 'audio') as 'audio' | 'video';
      if (channelName && resolvedConversationId) {
        if (channelName.startsWith('grp_')) {
          socketService.emit('call:group-missed', {
            channelName,
            conversationId: resolvedConversationId,
            type,
          });
        } else if (calleeId) {
          socketService.emit('call:missed', {
            channelName,
            peerId: calleeId,
            conversationId: resolvedConversationId,
            type,
          });
        }
      }
      dispatch(setCallEnded());
    }, timeoutMs);
    return () => window.clearTimeout(t);
  }, [status, dispatch, channelName, resolvedConversationId, calleeId, urlCallType, callType]);

  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(() => setTimer((x) => x + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanupLocalMedia = useCallback(() => {
    micTrackRef.current?.close();
    camTrackRef.current?.close();
    screenTrackRef.current?.close();
    micTrackRef.current = null;
    camTrackRef.current = null;
    screenTrackRef.current = null;
    if (clientRef.current?.connectionState === 'CONNECTED') {
      void clientRef.current.leave();
    }
  }, []);

  const handleDirectEnd = useCallback(() => {
    endCall({ durationSec: timer, result: 'completed' });
    cleanupLocalMedia();
    setTimeout(() => {
      dispatch(resetCall());
      navigate(resolvedReturnTo);
    }, 500);
  }, [endCall, timer, dispatch, navigate, resolvedReturnTo, cleanupLocalMedia]);

  const handleGroupLeave = useCallback(() => {
    leaveGroupCall();
    cleanupLocalMedia();
    setTimeout(() => {
      dispatch(resetCall());
      navigate(resolvedReturnTo);
    }, 500);
  }, [leaveGroupCall, dispatch, navigate, resolvedReturnTo, cleanupLocalMedia]);

  const handleGroupEndAll = useCallback(() => {
    endGroupCallForAll({ durationSec: timer });
    cleanupLocalMedia();
    setTimeout(() => {
      dispatch(resetCall());
      navigate(resolvedReturnTo);
    }, 500);
  }, [endGroupCallForAll, timer, dispatch, navigate, resolvedReturnTo, cleanupLocalMedia]);

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
        const screenTrack = (await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: '1080p_1' },
          'disable',
        )) as ILocalVideoTrack;

        screenTrack.on('track-ended', async () => {
          if (clientRef.current?.connectionState === 'CONNECTED') {
            try {
              await clientRef.current.unpublish([screenTrack]);
            } catch {
              /* already unpublished */
            }
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

  const currentCallIsVideo = callType === 'video' || (!isGroup && upgradeStatus === 'accepted');

  const statusLabel =
    status === 'connected'
      ? `Đang gọi • ${formatTime(timer)}`
      : joined
        ? isGroup
          ? 'Đang chờ thành viên tham gia...'
          : 'Đang chờ người tham gia...'
        : 'Đang kết nối...';

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 text-white flex flex-col overflow-hidden">
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
              <p className="text-xs text-white/40 mt-5">Tự động quay lại cuộc trò chuyện...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isGroup && currentCallIsVideo ? (
        <>
          {groupView === 'participants' ? (
            <div className="absolute inset-0 z-0 pt-24 pb-40 px-4 min-h-0 overflow-hidden pointer-events-none">
              <div className="pointer-events-auto min-h-0 h-full overflow-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-w-6xl mx-auto">
                  {remoteUids.map((uid) => (
                    <div
                      key={uid}
                      className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/10 group/tile"
                    >
                      <div id={`agora-remote-${uid}`} className="absolute inset-0" />
                      <button
                        type="button"
                        title="Ghim toàn màn hình"
                        onClick={() => {
                          setPinnedRemoteUid(uid);
                          setGroupView('pinned');
                        }}
                        className="absolute top-2 right-2 z-20 rounded-lg bg-black/60 p-1.5 opacity-0 group-hover/tile:opacity-100 sm:opacity-100 hover:bg-black/80 transition-opacity border border-white/10"
                      >
                        <Pin className="w-4 h-4 text-white" />
                      </button>
                      <span className="absolute top-2 left-2 z-10 text-[10px] bg-black/60 px-2 py-0.5 rounded pointer-events-none">
                        {labelForAgoraUid(uid)}
                      </span>
                    </div>
                  ))}
                  {remoteUids.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center min-h-[40vh] text-white/40 w-full max-w-6xl mx-auto">
                      <Users className="w-16 h-16 mb-3 opacity-30" />
                      <p className="text-sm">Đang chờ thành viên vào kênh...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 z-0 pt-24 pb-40 px-4 flex flex-col gap-3 min-h-0 overflow-hidden pointer-events-none">
              {pinnedRemoteUid != null ? (
                <div className="relative flex-1 min-h-[42vh] rounded-xl overflow-hidden border border-white/10 bg-gray-900 shadow-xl pointer-events-auto shrink">
                  <div ref={pinnedMainRef} className="absolute inset-0 bg-black" />
                  <button
                    type="button"
                    title="Bỏ ghim"
                    onClick={() => setPinnedRemoteUid(null)}
                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-2 border border-white/10"
                  >
                    <PinOff className="w-4 h-4" />
                    Bỏ ghim
                  </button>
                  <span className="absolute bottom-3 left-3 z-20 text-[11px] bg-black/70 px-2 py-1 rounded text-white/90">
                    Đang ghim · {labelForAgoraUid(pinnedRemoteUid)}
                  </span>
                </div>
              ) : (
                <div className="pointer-events-auto min-h-0 flex-1 overflow-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-w-6xl mx-auto">
                    {remoteUids.map((uid) => (
                      <div
                        key={uid}
                        className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/10 group/tile"
                      >
                        <div id={`agora-remote-${uid}`} className="absolute inset-0" />
                        <button
                          type="button"
                          title="Ghim toàn màn hình (camera hoặc màn hình đang share)"
                          onClick={() => setPinnedRemoteUid(uid)}
                          className="absolute top-2 right-2 z-20 rounded-lg bg-black/60 p-1.5 opacity-0 group-hover/tile:opacity-100 sm:opacity-100 hover:bg-black/80 transition-opacity border border-white/10"
                        >
                          <Pin className="w-4 h-4 text-white" />
                        </button>
                        <span className="absolute top-2 left-2 z-10 text-[10px] bg-black/60 px-2 py-0.5 rounded pointer-events-none">
                          {labelForAgoraUid(uid)}
                        </span>
                      </div>
                    ))}
                    {remoteUids.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center min-h-[40vh] text-white/40 w-full max-w-6xl mx-auto">
                        <Users className="w-16 h-16 mb-3 opacity-30" />
                        <p className="text-sm">Đang chờ thành viên vào kênh...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {pinnedRemoteUid != null && filmstripVisible ? (
                <div className="pointer-events-auto shrink-0 max-h-[32vh] overflow-x-auto overflow-y-hidden py-1">
                  <div className="flex flex-row gap-2 w-max pb-1">
                    {remoteUids
                      .filter((u) => u !== pinnedRemoteUid)
                      .map((uid) => (
                        <div
                          key={uid}
                          className="relative w-[140px] shrink-0 aspect-video bg-gray-900 rounded-lg overflow-hidden border border-white/10 group/tile"
                        >
                          <div id={`agora-remote-${uid}`} className="absolute inset-0" />
                          <button
                            type="button"
                            title="Ghim toàn màn hình"
                            onClick={() => setPinnedRemoteUid(uid)}
                            className="absolute top-2 right-2 z-20 rounded-lg bg-black/60 p-1.5 opacity-0 group-hover/tile:opacity-100 sm:opacity-100 hover:bg-black/80 transition-opacity border border-white/10"
                          >
                            <Pin className="w-4 h-4 text-white" />
                          </button>
                          <span className="absolute top-2 left-2 z-10 text-[10px] bg-black/60 px-2 py-0.5 rounded pointer-events-none">
                            {labelForAgoraUid(uid)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : isGroup && !currentCallIsVideo ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pt-16 pb-32">
          <Users className="w-20 h-20 text-white/25 mb-4" />
          <p className="text-white/50 text-sm mb-6">Cuộc gọi thoại nhóm</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {remoteUids.map((uid) => (
              <div
                key={uid}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 flex items-center justify-center text-sm font-bold animate-pulse"
              >
                {labelForAgoraUid(uid).slice(0, 2).toUpperCase()}
              </div>
            ))}
            {remoteUids.length === 0 && (
              <p className="text-white/40 text-sm w-full text-center">Đang chờ thành viên...</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={remoteVideoRef}
            className={`absolute inset-0 z-0 ${remoteHasVideo ? '' : 'invisible'}`}
          />
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
        </>
      )}

      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {!isGroup && (
        <>
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
                      type="button"
                      onClick={() => respondUpgradeToVideo(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-all"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
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
        </>
      )}

      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            {isGroup && <Users className="w-6 h-6 text-blue-400" />}
            {currentCallIsVideo ? 'Video Call' : 'Voice Call'}
            {isGroup && <span className="text-sm font-normal text-white/50">(nhóm)</span>}
          </h2>
          <p className="text-sm text-white/50 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {statusLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isGroup && currentCallIsVideo && pinnedRemoteUid != null ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setGroupView((v) => (v === 'participants' ? 'pinned' : 'participants'))
                }
                className="p-3 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
                title={
                  groupView === 'participants' ? 'Quay lại màn ghim' : 'Xem danh sách thành viên'
                }
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setFilmstripVisible((v) => !v)}
                className="p-3 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
                title={filmstripVisible ? 'Ẩn filmstrip' : 'Hiện filmstrip'}
              >
                <PanelRight className="w-5 h-5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={toggleFullScreen}
            className="p-3 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
          >
            {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>

      <div className="flex-1" />

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

      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="relative z-10 p-8 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          onClick={onToggleMic}
          title={isMicOn ? 'Tắt mic' : 'Bật mic'}
          className={`p-4 rounded-2xl transition-all ${
            !isMicOn ? 'bg-red-600 text-white' : 'bg-white/10 backdrop-blur-md hover:bg-white/20'
          }`}
        >
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        {currentCallIsVideo && (
          <button
            type="button"
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

        {!isGroup && !currentCallIsVideo && status === 'connected' && upgradeStatus === 'none' && (
          <button
            type="button"
            onClick={requestUpgradeToVideo}
            title="Chuyển sang Video Call"
            className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-blue-600/80 transition-all"
          >
            <Video className="w-6 h-6" />
          </button>
        )}

        {currentCallIsVideo && (
          <button
            type="button"
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

        {isGroup ? (
          isHost ? (
            <>
              <button
                type="button"
                onClick={handleGroupLeave}
                title="Rời cuộc gọi — nhóm vẫn tiếp tục"
                className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <LogOut className="w-6 h-6" />
                Rời
              </button>
              <button
                type="button"
                onClick={handleGroupEndAll}
                title="Kết thúc cuộc gọi cho mọi người"
                className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl flex items-center gap-2 text-sm font-semibold px-6"
              >
                <PhoneOff className="w-7 h-7" />
                Kết thúc tất cả
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGroupLeave}
              title="Rời cuộc gọi"
              className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl flex items-center gap-2"
            >
              <LogOut className="w-7 h-7" />
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleDirectEnd}
            title="Kết thúc cuộc gọi"
            className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/40 transition-all hover:scale-110 active:scale-95"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
