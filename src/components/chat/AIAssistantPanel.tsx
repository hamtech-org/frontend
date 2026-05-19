import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Sparkles, Square, User } from 'lucide-react';
import { toast } from 'react-toastify';
import { cn } from '@/utils/cn';
import { ConversationInfoPanelAIRight } from '@/components/chat/ConversationInfoPanelAIRight';
import { socketService } from '@/services/socket';
import { fetchAiAssistantThread } from '@/services/aiAssistantClient';
import { useAuth } from '@/hooks/useAuth';

type AIAssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  kind: 'text';
  content: string;
};

type AIAssistantUserCardsMessage = {
  id: string;
  role: 'assistant';
  kind: 'user_cards';
  users: ShowUserCardsAction['payload']['users'];
  source: ShowUserCardsAction['payload']['source'];
  query: string;
};

type AIAssistantMessageResultsMessage = {
  id: string;
  role: 'assistant';
  kind: 'message_results';
  messages: ShowMessageResultsAction['payload']['messages'];
  query: string;
};

type AIAssistantChatItem =
  | AIAssistantMessage
  | AIAssistantUserCardsMessage
  | AIAssistantMessageResultsMessage;

type AiClientAction = {
  type: string;
  payload?: Record<string, unknown>;
};

type ConfirmToolAction = {
  type: 'confirm_tool';
  payload: {
    pendingId: string;
    toolName: string;
    question: string;
    confirmText: string;
    cancelText: string;
    confirmToken?: string;
    cancelToken?: string;
  };
};

type ShowUserCardsAction = {
  type: 'show_user_cards';
  payload: {
    source: 'search_users' | 'search_users_contacts';
    query: string;
    users: Array<{
      userId: string;
      displayName: string;
      email?: string | null;
      phone?: string | null;
      avatar?: string | null;
      bio?: string | null;
      isFriend?: boolean;
      friendshipStatus?: string;
    }>;
  };
};

type ShowMessageResultsAction = {
  type: 'show_message_results';
  payload: {
    source: 'search_messages';
    query: string;
    messages: Array<{
      resultKey?: string;
      messageId: string;
      conversationId: string;
      conversationName?: string | null;
      senderId: string;
      senderDisplayName?: string | null;
      content: string;
      createdAt: string;
    }>;
  };
};

type AiMessageDonePayload = {
  threadId: string;
  requestId?: string;
  reply: string;
  model: string;
  tokensUsed: number;
  actions: AiClientAction[];
  userMessageId?: string;
  assistantMessageId?: string;
};

type AiStatusPayload = {
  threadId?: string;
  requestId?: string;
  stage?: string;
  label?: string;
  detail?: string;
};

type AiMessageCancelledPayload = {
  threadId?: string;
  requestId?: string;
};

const WELCOME: AIAssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  kind: 'text',
  content:
    'Chào bạn, mình là trợ lý HAMTECH. Bạn có thể hỏi hoặc nhờ mình tìm tin nhắn, bạn bè, nhóm.',
};

function createAiRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function unwrapAiReply(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('"reply"')) return content;
  try {
    const parsed = JSON.parse(trimmed) as { reply?: unknown };
    return typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : content;
  } catch {
    const match = trimmed.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s);
    if (!match?.[1]) return content;
    try {
      return JSON.parse(`"${match[1]}"`) as string;
    } catch {
      return match[1]
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        )
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }
  }
}

function formatMessageResultTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function chatItemsFromAssistantActions(
  actions: AiClientAction[] | undefined,
  baseId: string,
): AIAssistantChatItem[] {
  if (!actions?.length) return [];
  const items: AIAssistantChatItem[] = [];
  const showUsersActions = actions.filter(
    (a): a is ShowUserCardsAction => a.type === 'show_user_cards',
  );
  const showMessageActions = actions.filter(
    (a): a is ShowMessageResultsAction =>
      a.type === 'show_message_results' && Array.isArray(a.payload?.messages),
  );

  for (const act of showUsersActions) {
    if (!act.payload?.users?.length) continue;
    items.push({
      id: `assistant-cards-${baseId}-${act.payload.source}`,
      role: 'assistant',
      kind: 'user_cards',
      source: act.payload.source,
      query: act.payload.query,
      users: act.payload.users.slice(0, 8),
    });
  }
  for (const act of showMessageActions) {
    if (!act.payload?.messages?.length) continue;
    items.push({
      id: `assistant-messages-${baseId}`,
      role: 'assistant',
      kind: 'message_results',
      query: act.payload.query,
      messages: act.payload.messages.slice(0, 8),
    });
  }
  return items;
}

export function AIAssistantPanel({
  onOpenDirectChat,
  onOpenMessage,
}: {
  onOpenDirectChat?: (otherUserId: string, otherDisplayName: string) => Promise<void> | void;
  onOpenMessage?: (conversationId: string, messageId: string) => Promise<void> | void;
}) {
  const { accessToken } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIAssistantChatItem[]>([WELCOME]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<string>('');
  const [lastActions, setLastActions] = useState<AiClientAction[]>([]);
  const lastSentUserText = useRef('');
  const currentRequestId = useRef<string | null>(null);
  const cancelledRequestIds = useRef(new Set<string>());

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchAiAssistantThread();
        if (cancelled) return;
        setThreadId(data.threadId);
        if (data.messages.length > 0) {
          const hydrated: AIAssistantChatItem[] = [];
          for (const m of data.messages) {
            hydrated.push({
              id: m.messageId,
              role: m.role,
              kind: 'text',
              content: m.role === 'assistant' ? unwrapAiReply(m.content) : m.content,
            });
            if (m.role === 'assistant') {
              hydrated.push(...chatItemsFromAssistantActions(m.actions, m.messageId));
            }
          }
          setMessages(hydrated);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Không tải được lịch sử AI');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const onDone = (raw: unknown) => {
      const data = raw as AiMessageDonePayload;
      if (!data?.reply) return;
      if (data.requestId && cancelledRequestIds.current.has(data.requestId)) return;
      if (
        data.requestId &&
        currentRequestId.current &&
        data.requestId !== currentRequestId.current
      ) {
        return;
      }
      setThreadId(data.threadId);
      setSending(false);
      setSendingStatus('');
      currentRequestId.current = null;
      const userText = lastSentUserText.current;
      const confirmActions = (data.actions ?? []).filter(
        (a): a is ConfirmToolAction => a.type === 'confirm_tool',
      );
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith('temp-user-'));
        const uid = data.userMessageId;
        const withUser: AIAssistantChatItem[] =
          uid && userText
            ? [
                ...withoutTemp,
                { id: uid, role: 'user' as const, kind: 'text' as const, content: userText },
              ]
            : withoutTemp;
        const next: AIAssistantChatItem[] = [
          ...withUser,
          {
            id: data.assistantMessageId ?? `assistant-${Date.now()}`,
            role: 'assistant',
            kind: 'text' as const,
            content: unwrapAiReply(data.reply),
          },
        ];
        next.push(
          ...chatItemsFromAssistantActions(
            data.actions ?? [],
            data.assistantMessageId ?? String(Date.now()),
          ),
        );
        return next;
      });
      if (confirmActions.length) {
        setLastActions(confirmActions);
      } else {
        setLastActions([]);
      }
    };

    const onError = (raw: unknown) => {
      setSending(false);
      setSendingStatus('');
      currentRequestId.current = null;
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-user-')));
      const msg =
        raw && typeof raw === 'object' && 'error' in raw
          ? String((raw as { error?: string }).error ?? '')
          : '';
      toast.error(msg || 'Lỗi kết nối AI');
    };

    const onStatus = (raw: unknown) => {
      const data = raw as AiStatusPayload;
      if (!data) return;
      if (
        data.requestId &&
        currentRequestId.current &&
        data.requestId !== currentRequestId.current
      ) {
        return;
      }
      const next = [data.label, data.detail].filter(Boolean).join(' - ');
      if (next) setSendingStatus(next);
    };

    const onCancelled = (raw: unknown) => {
      const data = raw as AiMessageCancelledPayload;
      if (
        data.requestId &&
        currentRequestId.current &&
        data.requestId !== currentRequestId.current
      ) {
        return;
      }
      setSending(false);
      setSendingStatus('');
      currentRequestId.current = null;
    };

    socketService.on('ai:message_done', onDone);
    socketService.on('ai:error', onError);
    socketService.on('ai:status', onStatus);
    socketService.on('ai:message_cancelled', onCancelled);

    return () => {
      socketService.off('ai:message_done', onDone);
      socketService.off('ai:error', onError);
      socketService.off('ai:status', onStatus);
      socketService.off('ai:message_cancelled', onCancelled);
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !threadId) return;
    try {
      socketService.emit('ai:thread_join', { threadId });
    } catch {
      /* socket chưa sẵn sàng */
    }
  }, [accessToken, threadId]);

  const handleSend = useCallback(() => {
    const userMessage = draft.trim();
    if (!userMessage || sending) return;
    const requestId = createAiRequestId();

    setSending(true);
    setSendingStatus('Đang gửi yêu cầu đến trợ lý HAMTECH...');
    setLastActions([]);
    currentRequestId.current = requestId;
    cancelledRequestIds.current.delete(requestId);
    lastSentUserText.current = userMessage;
    const tempId = `temp-user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', kind: 'text' as const, content: userMessage },
    ]);
    setDraft('');

    try {
      socketService.emit('ai:message_send', {
        threadId: threadId ?? undefined,
        requestId,
        message: userMessage,
        locale: 'vi',
      });
    } catch {
      setSending(false);
      toast.error('Socket chưa kết nối');
      currentRequestId.current = null;
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }, [draft, sending, threadId]);

  const applyQuickPrompt = useCallback((text: string) => {
    setDraft(text);
  }, []);

  const handleQuickDecision = useCallback(
    (decision: 'approve' | 'reject', action?: ConfirmToolAction) => {
      if (sending) return;
      const requestId = createAiRequestId();
      const text = decision === 'approve' ? 'đồng ý' : 'không';
      const token =
        decision === 'approve' ? action?.payload.confirmToken : action?.payload.cancelToken;
      const outgoingMessage = token?.trim() ? token : text;
      setDraft(text);
      window.setTimeout(() => {
        setSending(true);
        setSendingStatus('Đang gửi xác nhận...');
        setLastActions([]);
        currentRequestId.current = requestId;
        cancelledRequestIds.current.delete(requestId);
        lastSentUserText.current = text;
        const tempId = `temp-user-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: tempId, role: 'user', kind: 'text' as const, content: text },
        ]);
        setDraft('');
        try {
          socketService.emit('ai:message_send', {
            threadId: threadId ?? undefined,
            requestId,
            message: outgoingMessage,
            locale: 'vi',
          });
        } catch {
          setSending(false);
          toast.error('Socket chưa kết nối');
          currentRequestId.current = null;
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      }, 0);
    },
    [sending, threadId],
  );

  const handleCancel = useCallback(() => {
    const requestId = currentRequestId.current;
    if (!requestId) return;
    cancelledRequestIds.current.add(requestId);
    setSendingStatus('Đang dừng trợ lý HAMTECH...');
    socketService.emit('ai:message_cancel', {
      threadId: threadId ?? undefined,
      requestId,
    });
  }, [threadId]);

  const handleOpenUserCard = useCallback(
    async (userId: string, displayName: string) => {
      if (!userId || !displayName) return;
      try {
        await onOpenDirectChat?.(userId, displayName);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Không mở được chat');
      }
    },
    [onOpenDirectChat],
  );

  const handleOpenMessageResult = useCallback(
    async (conversationId: string, messageId: string) => {
      if (!conversationId || !messageId) return;
      try {
        await onOpenMessage?.(conversationId, messageId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Không mở được tin nhắn');
      }
    },
    [onOpenMessage],
  );

  return (
    <div className="flex-1 min-w-0 min-h-0 flex bg-background">
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="shrink-0 border-b border-border/60 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-sm md:text-base font-semibold">Trợ lý HAMTECH</h2>
          </div>
          <p className="mt-1 text-xs md:text-sm text-muted-foreground">
            Tin nhắn được lưu trên server; tìm kiếm & công cụ do AI gọi qua backend.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-5 flex flex-col gap-3">
          {messages.map((message) => {
            if (message.kind === 'user_cards') {
              return (
                <div
                  key={message.id}
                  className="max-w-[92%] md:max-w-[80%] self-start rounded-2xl border border-border/60 bg-muted/40 p-3"
                >
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Kết quả tìm người dùng
                  </p>
                  <div className="space-y-2">
                    {message.users.map((u) => (
                      <button
                        key={u.userId}
                        type="button"
                        onClick={() => void handleOpenUserCard(u.userId, u.displayName)}
                        className="w-full rounded-xl border border-border/50 bg-background/70 p-3 text-left hover:bg-background transition-colors"
                        disabled={sending}
                        title="Mở chat"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="size-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {u.displayName}
                              </p>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {u.isFriend ? 'Bạn bè' : 'Người dùng'}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {u.email || u.phone || u.userId}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (message.kind === 'message_results') {
              return (
                <div
                  key={message.id}
                  className="max-w-[92%] md:max-w-[80%] self-start rounded-2xl border border-border/60 bg-muted/40 p-3"
                >
                  <p className="text-xs font-semibold text-foreground mb-2">Kết quả tìm tin nhắn</p>
                  <div className="space-y-2">
                    {message.messages.map((m) => (
                      <button
                        key={m.messageId}
                        type="button"
                        onClick={() => void handleOpenMessageResult(m.conversationId, m.messageId)}
                        className="w-full rounded-xl border border-border/50 bg-background/70 p-3 text-left transition-colors hover:bg-background"
                      >
                        <div className="flex items-start gap-3">
                          <div className="size-9 shrink-0 rounded-full border border-border bg-muted flex items-center justify-center">
                            <MessageSquare className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-medium text-muted-foreground">
                                {m.conversationName?.trim() || 'Hội thoại'}
                              </p>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatMessageResultTime(m.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-foreground">
                              {m.content}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              Người gửi: {m.senderDisplayName?.trim() || 'Thành viên'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  message.role === 'assistant'
                    ? 'bg-muted text-foreground self-start'
                    : 'bg-primary text-primary-foreground self-end',
                )}
              >
                {message.content}
              </div>
            );
          })}
          {sending ? (
            <div className="text-xs text-muted-foreground self-start">
              {sendingStatus || 'AI dang tra loi...'}
            </div>
          ) : null}
        </div>

        {lastActions.length > 0 ? (
          <div className="shrink-0 px-3 pb-2 md:px-5">
            <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Gợi ý thao tác</p>
              {lastActions
                .filter((a): a is ConfirmToolAction => a.type === 'confirm_tool')
                .map((a) => (
                  <div
                    key={a.payload.pendingId}
                    className="mb-2 rounded-lg border border-border/50 p-2"
                  >
                    <p className="mb-2 text-foreground">{a.payload.question}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickDecision('approve', a)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
                        disabled={sending}
                      >
                        {a.payload.confirmText}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDecision('reject', a)}
                        className="rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-background"
                        disabled={sending}
                      >
                        {a.payload.cancelText}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        <div className="shrink-0 border-t border-border/60 px-3 py-3 md:px-5">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nhập nội dung cần trợ lý HAMTECH..."
              className="min-h-11 max-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              disabled={!sending && !canSend}
              onClick={sending ? handleCancel : handleSend}
              className="h-11 shrink-0 rounded-xl px-3 bg-primary text-primary-foreground disabled:opacity-50 disabled:pointer-events-none hover:opacity-90 transition-opacity"
              title={sending ? 'Dừng AI' : 'Gửi'}
            >
              {sending ? <Square className="size-4" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <ConversationInfoPanelAIRight onPromptSelect={applyQuickPrompt} />
    </div>
  );
}
