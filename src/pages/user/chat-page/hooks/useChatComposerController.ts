import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socketService } from '@/services/socket';
import { MAX_PENDING_FILES, messageTypeFromUploadResult, roughMaxBytesForFile } from '@/constants/chat-page.constants';
import type { PendingAttachment } from '@/components/chat/ChatComposer';
import type { MessageType } from '@/types/chat.types';
import type { AppDispatch, RootState } from '@/store/store';
import { clearReplyingTo } from '@/store/slices/chatSlice';
import { useSendMessageMutation } from '@/store/api/chatApi';
import { useUploadMediaMultiMutation } from '@/store/api/mediaApi';

/**
 * Self-contained composer controller.
 * Internally calls RTK mutations and reads Redux state.
 * Only needs `activeConversationId` from the caller.
 */
export function useChatComposerController(activeConversationId: string | null) {
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
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputText = activeConversationId ? inputTextMap[activeConversationId] || '' : '';

  const setInputText = useCallback((text: string) => {
    if (!activeConversationId) return;
    setInputTextMap((prev) => ({ ...prev, [activeConversationId]: text }));
  }, [activeConversationId]);

  const addPendingFiles = useCallback((files: File[]) => {
    setPendingAttachments((prev) => {
      if (prev.length >= MAX_PENDING_FILES) return prev;
      const next = [...prev];
      for (const file of files) {
        if (next.length >= MAX_PENDING_FILES) break;
        if (file.size > roughMaxBytesForFile(file)) continue;
        const previewUrl =
          file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : null;
        next.push({ localId: crypto.randomUUID(), file, previewUrl });
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

  const handleSendMessage = useCallback(async (overrideText?: string) => {
    const rawContent = typeof overrideText === 'string' ? overrideText : inputText;
    const content = rawContent.trim();

    if (!activeConversationId || isSending || mediaUploading) return;

    if (pendingAttachments.length > 0) {
      const files = pendingAttachments.map((p) => p.file);
      setMediaUploading(true);
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
          }).unwrap();
        }
        pendingAttachments.forEach((p) => {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        });
        setPendingAttachments([]);
        setInputText('');
        clearReply();
      } finally {
        setMediaUploading(false);
      }
      return;
    }

    if (!content) return;
    setInputText('');
    try {
      await sendMessage({
        conversationId: activeConversationId,
        type: 'text',
        content,
        replyTo: replyingToMessageId,
      }).unwrap();
      clearReply();
    } catch {
      setInputText(content);
    }
  }, [
    activeConversationId,
    inputText,
    isSending,
    mediaUploading,
    pendingAttachments,
    uploadMediaMulti,
    sendMessage,
    replyingToMessageId,
    clearReply,
    setInputText,
  ]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  }, [handleSendMessage]);

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
  };
}
