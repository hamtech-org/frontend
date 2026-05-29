import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { socketService } from '@/services/socket';
import {
  MAX_PENDING_FILES,
  messageTypeFromUploadResult,
  roughMaxBytesForFile,
} from '@/constants/chat-page.constants';
import type { PendingAttachment } from '@/components/chat/ChatPendingAttachmentsStrip';
import type { IConversation, MessageType } from '@/types/chat.types';
import type { GroupMemberRole } from '@/types/chat.group.types';
import { canUserSendMessageInGroup } from '@/utils/groupConversationPermissions';
import type { AppDispatch, RootState } from '@/store/store';
import { clearReplyingTo } from '@/store/slices/chatSlice';
import { useSendMessageMutation } from '@/store/api/chatApi';
import { useUploadMediaMultiMutation } from '@/store/api/mediaApi';

function messageSendErrorText(error: unknown): string {
  const code = (error as { data?: { error?: { code?: string } } })?.data?.error?.code;
  if (code === 'MESSAGE_BLOCKED_BY_ME') {
    return 'Bạn đang chặn người dùng này, vui lòng gỡ chặn để tiếp tục nhắn tin.';
  }
  if (code === 'MESSAGE_BLOCKED_BY_OTHER') {
    return 'Bạn đã bị chặn bởi người dùng này.';
  }
  return 'Gửi tin nhắn thất bại. Vui lòng thử lại.';
}

function extractMentionIds(content: string): string[] {
  if (!content) return [];
  const regex = /@\[.*?\]\(mention:([a-zA-Z0-9-]+|all)\)/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) ids.push(match[1]);
  }
  return [...new Set(ids)];
}

/**
 * Self-contained composer controller.
 * Internally calls RTK mutations and reads Redux state.
 * Only needs `activeConversationId` from the caller.
 */
export function useChatComposerController(
  activeConversationId: string | null,
  activeConversation?: IConversation,
  currentUserRole?: GroupMemberRole,
  currentUserId?: string,
  groupMembers?: Array<{ userId?: string; role?: string }>,
) {
  const dispatch = useDispatch<AppDispatch>();

  // ── RTK mutations ──
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [uploadMediaMulti] = useUploadMediaMultiMutation();

  // ── Redux selectors ──
  const replyingTo = useSelector((state: RootState) => state.chat.replyingTo);
  const replyingToMessageId = replyingTo?.messageId;

  // ── Local state ──
  const [inputTextMap, setInputTextMap] = useState<Record<string, string>>({});
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [composerStatusMessage, setComposerStatusMessage] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputText = activeConversationId ? inputTextMap[activeConversationId] || '' : '';

  const setInputText = useCallback(
    (text: string) => {
      if (!activeConversationId) return;
      setInputTextMap((prev) => ({ ...prev, [activeConversationId]: text }));
    },
    [activeConversationId],
  );

  const addPendingFiles = useCallback((files: File[]) => {
    setPendingAttachments((prev) => {
      if (prev.length >= MAX_PENDING_FILES) {
        toast.warning(`Tối đa ${MAX_PENDING_FILES} tệp mỗi lần gửi.`);
        return prev;
      }
      const next = [...prev];
      let oversizedSkipped = 0;
      let overLimitSkipped = 0;
      for (const file of files) {
        if (next.length >= MAX_PENDING_FILES) {
          overLimitSkipped += 1;
          continue;
        }
        if (file.size > roughMaxBytesForFile(file)) {
          oversizedSkipped += 1;
          continue;
        }
        const previewUrl =
          file.type.startsWith('image/') || file.type.startsWith('video/')
            ? URL.createObjectURL(file)
            : null;
        next.push({ localId: crypto.randomUUID(), file, previewUrl });
      }
      if (oversizedSkipped > 0) {
        toast.warning(`${oversizedSkipped} tệp vượt dung lượng đã bị bỏ qua.`);
      }
      if (overLimitSkipped > 0) {
        toast.info(`${overLimitSkipped} tệp vượt quá giới hạn ${MAX_PENDING_FILES}.`);
      }
      return next;
    });
  }, []);

  const removePendingAttachment = useCallback((localId: string) => {
    setPendingAttachments((prev) => {
      const hit = prev.find((p) => p.localId === localId);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }, []);

  const clearReply = useCallback(() => {
    dispatch(clearReplyingTo());
  }, [dispatch]);

  useEffect(() => {
    setPendingAttachments((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  }, [activeConversationId]);

  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      const rawContent = typeof overrideText === 'string' ? overrideText : inputText;
      const content = rawContent.trim();

      if (!activeConversationId || isSending || mediaUploading) return;

      if (
        !canUserSendMessageInGroup({
          conversation: activeConversation,
          userRole: currentUserRole,
          userId: currentUserId,
          members: groupMembers,
        })
      ) {
        return;
      }

      if (pendingAttachments.length > 0) {
        const files = pendingAttachments.map((p) => p.file);
        setMediaUploading(true);
        setComposerStatusMessage(`Đang tải lên ${files.length} tệp...`);
        try {
          const up = await uploadMediaMulti(files).unwrap();
          const results = up.data;
          const captionFirst = content.length > 0 ? content : ' ';
          for (let i = 0; i < results.length; i++) {
            const result = results[i]!;
            await sendMessage({
              conversationId: activeConversationId,
              type: messageTypeFromUploadResult(result) as MessageType,
              content: i === 0 ? captionFirst : ' ',
              mediaId: result.mediaId,
              replyTo: i === 0 ? replyingToMessageId : undefined,
              mentions: i === 0 ? extractMentionIds(captionFirst) : undefined,
            }).unwrap();
          }
          pendingAttachments.forEach((p) => {
            if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          });
          setPendingAttachments([]);
          setInputText('');
          clearReply();
          setComposerStatusMessage('Đã gửi tệp thành công.');
        } catch (error) {
          const blockedText = messageSendErrorText(error);
          if (blockedText !== 'Gửi tin nhắn thất bại. Vui lòng thử lại.') {
            setComposerStatusMessage(blockedText);
            toast.error(blockedText);
            return;
          }
          setComposerStatusMessage('Gửi tệp thất bại, vui lòng thử lại.');
          toast.error('Gửi tệp thất bại. Bạn có thể thử lại.');
        } finally {
          setMediaUploading(false);
        }
        return;
      }

      if (!content) return;
      setInputText('');
      setComposerStatusMessage('Đang gửi tin nhắn...');
      try {
        await sendMessage({
          conversationId: activeConversationId,
          type: 'text',
          content,
          replyTo: replyingToMessageId,
          mentions: extractMentionIds(content),
        }).unwrap();
        clearReply();
        setComposerStatusMessage('Đã gửi tin nhắn.');
      } catch (error) {
        setInputText(content);
        const text = messageSendErrorText(error);
        setComposerStatusMessage(text);
        toast.error(text);
        if (text !== 'Gửi tin nhắn thất bại. Vui lòng thử lại.') return;
        setComposerStatusMessage('Gửi tin nhắn thất bại, vui lòng thử lại.');
        toast.error('Gửi tin nhắn thất bại. Vui lòng thử lại.');
      }
    },
    [
      activeConversation,
      activeConversationId,
      currentUserRole,
      currentUserId,
      groupMembers,
      inputText,
      isSending,
      mediaUploading,
      pendingAttachments,
      uploadMediaMulti,
      sendMessage,
      replyingToMessageId,
      clearReply,
      setInputText,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        if (replyingToMessageId) {
          e.preventDefault();
          clearReply();
        }
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      }
    },
    [clearReply, handleSendMessage, replyingToMessageId],
  );

  const handleTyping = useCallback(() => {
    if (!activeConversationId) return;
    if (!typingTimerRef.current) {
      socketService.emit('message:typing', activeConversationId);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 900);
  }, [activeConversationId]);

  // ── Logic thu âm (Voice Recording) ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(
    async (shouldSend: boolean) => {
      if (!mediaRecorderRef.current || !isRecording) return;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsRecording(false);
      const durationAtStop = recordingDuration;

      return new Promise<void>((resolve) => {
        mediaRecorderRef.current!.onstop = async () => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          if (shouldSend) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
            if (audioBlob.size < 100) {
              toast.warning('Tin nhắn thoại quá ngắn.');
              resolve();
              return;
            }

            const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
              type: 'audio/webm;codecs=opus',
            });

            setMediaUploading(true);
            setComposerStatusMessage('Đang gửi tin nhắn thoại...');

            try {
              const up = await uploadMediaMulti([audioFile]).unwrap();
              const result = up.data[0];
              if (!result) {
                throw new Error('Upload file thất bại');
              }

              await sendMessage({
                conversationId: activeConversationId!,
                type: 'voice',
                content: '[Tin nhắn thoại]',
                mediaId: result.mediaId,
                replyTo: replyingToMessageId,
                duration: durationAtStop,
              }).unwrap();

              clearReply();
              setComposerStatusMessage('Đã gửi tin nhắn thoại.');
            } catch (err) {
              console.error('Gửi tin nhắn thoại thất bại:', err);
              toast.error('Gửi tin nhắn thoại thất bại. Vui lòng thử lại.');
            } finally {
              setMediaUploading(false);
            }
          }
          resolve();
        };

        mediaRecorderRef.current!.stop();
      });
    },
    [
      activeConversationId,
      isRecording,
      recordingDuration,
      uploadMediaMulti,
      sendMessage,
      replyingToMessageId,
      clearReply,
    ],
  );

  const startRecording = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 300) {
            // Giới hạn 5 phút
            void stopRecording(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Không thể truy cập Microphone:', err);
      toast.error('Không thể truy cập Microphone. Vui lòng kiểm tra quyền cài đặt trình duyệt.');
    }
  }, [activeConversationId, stopRecording]);

  return {
    inputText,
    isSending,
    pendingAttachments,
    replyingTo,
    setInputText,
    addPendingFiles,
    removePendingAttachment,
    handleSendMessage,
    handleKeyDown,
    handleTyping,
    clearReply,
    mediaUploading,
    composerStatusMessage,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  };
}
