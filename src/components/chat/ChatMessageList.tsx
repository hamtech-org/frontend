import { useState, type Ref } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCheck,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Pencil,
  Reply,
  RotateCcw,
  SmilePlus,
  Trash2,
} from 'lucide-react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { TypingUserEntry } from '@/store/slices/chatSlice';
import { formatTime } from '@/utils/formatDate';
import { typingInitial, typingLabel } from '@/utils/chatUtils';

export type ChatMessageListProps = {
  messagesContainerRef: Ref<HTMLDivElement>;
  messagesEndRef: Ref<HTMLDivElement>;
  allMessages: IMessage[];
  activeConversationId: string | null;
  activeConversation: IConversation | undefined;
  currentUserId: string;
  typingUsers: TypingUserEntry[];
  unreadIncomingCount: number;
  actionMenuMsgId: string | null;
  onActionMenuMsgIdChange: (id: string | null) => void;
  onStartEdit: (msg: IMessage) => void;
  onTogglePin: (msg: IMessage) => void;
  onRecall: (msg: IMessage) => void;
  onDelete: (msg: IMessage) => void;
  onReply: (msg: IMessage) => void;
  onReact: (msg: IMessage, emoji: string) => void;
  onJumpToLatest: () => void;
};

export function ChatMessageList({
  messagesContainerRef,
  messagesEndRef,
  allMessages,
  activeConversationId,
  activeConversation,
  currentUserId,
  typingUsers,
  unreadIncomingCount,
  actionMenuMsgId,
  onActionMenuMsgIdChange,
  onStartEdit,
  onTogglePin,
  onRecall,
  onDelete,
  onReply,
  onReact,
  onJumpToLatest,
}: ChatMessageListProps) {
  const scrollToMessage = (messageId: string) => {
    document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const [hiddenReactPopupId, setHiddenReactPopupId] = useState<string | null>(null);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0 custom-scrollbar"
    >
      {!activeConversationId && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-bold opacity-40">Chọn hội thoại để bắt đầu nhắn tin</p>
        </div>
      )}
      {activeConversationId && (
        <>
          <div className="flex justify-center">
            <span className="px-4 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Hôm nay
            </span>
          </div>
          {allMessages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            const prevMsg = index > 0 ? allMessages[index - 1] : undefined;
            const nextMsg = index < allMessages.length - 1 ? allMessages[index + 1] : undefined;
            const isSameSenderAsPrev = !!prevMsg && prevMsg.senderId === msg.senderId;
            const isSameSenderAsNext = !!nextMsg && nextMsg.senderId === msg.senderId;
            const showAvatar = !isMe && !isSameSenderAsNext;
            const showMeta = !isSameSenderAsNext;
            return (
              <motion.div
                id={`chat-msg-${msg.messageId}`}
                key={msg.messageId}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`flex items-end gap-2 group/msg ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-0' : 'mt-1'}`}
              >
                {showAvatar ? (
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm mb-0.5">
                    {(msg.senderDisplayName ?? msg.senderId).trim().slice(0, 1).toUpperCase()}
                  </div>
                ) : isMe ? null : (
                  <div className="w-8 shrink-0" aria-hidden />
                )}

                <div
                  className={`flex flex-col max-w-[55%] sm:max-w-[45%] ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && activeConversation?.type === 'group' && !isSameSenderAsPrev && (
                    <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 mb-1 px-1">
                      {msg.senderDisplayName ?? msg.senderId}
                    </p>
                  )}

                  <div
                    className={`relative flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 'mb-3.5' : ''}`}
                  >
                    {msg.isDeleted ? (
                      <div className="px-3 py-2 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-muted-foreground text-xs italic select-none">
                        Tin nhắn đã bị xóa
                      </div>
                    ) : msg.isRecalled ? (
                      <div className="px-3 py-2 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-muted-foreground text-xs italic select-none">
                        Tin nhắn đã được thu hồi
                      </div>
                    ) : (
                      <div
                        className={`relative px-3 py-2 rounded-xl text-[13px] leading-snug shadow-sm wrap-break-word selection:bg-blue-200 selection:text-black dark:selection:bg-blue-300 dark:selection:text-black ${
                          isMe
                            ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 text-foreground rounded-bl-sm'
                        }`}
                      >
                        {msg.replyToDetails && (
                          <div
                            onClick={() => scrollToMessage(msg.replyToDetails!.messageId)}
                            className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-4 cursor-pointer transition-colors ${
                              isMe
                                ? 'bg-white/10 border-white/30 hover:bg-white/20'
                                : 'bg-black/5 border-blue-500/50 hover:bg-black/10'
                            }`}
                          >
                            <p
                              className={`text-[10px] font-bold mb-0.5 ${
                                isMe ? 'text-blue-100' : 'text-blue-600'
                              }`}
                            >
                              {msg.replyToDetails.senderDisplayName ?? msg.replyToDetails.senderId}
                            </p>
                            <p
                              className={`text-[11px] truncate opacity-80 ${
                                isMe ? 'text-white' : 'text-foreground'
                              }`}
                            >
                              {msg.replyToDetails.content}
                            </p>
                          </div>
                        )}
                        {msg.content}
                        {msg.isEdited && (
                          <span
                            className={`ml-1.5 text-[10px] ${isMe ? 'text-blue-100/70' : 'text-muted-foreground/60'}`}
                          >
                            (đã sửa)
                          </span>
                        )}

                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div
                            className={`absolute -bottom-3 ${isMe ? '-left-2' : '-right-2 flex-row-reverse'} flex flex-wrap gap-1 z-10`}
                          >
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                              <div
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReact(msg, emoji);
                                }}
                                className={`px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 ${userIds.includes(currentUserId) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-600' : 'border-black/10 dark:border-white/10 text-foreground'} text-[14px] shadow-sm flex items-center gap-1 cursor-pointer select-non hover:bg-gray-100 dark:hover:bg-gray-700`}
                                title={userIds.length > 0 ? `${userIds.length} người` : ''}
                              >
                                <span className="leading-none">{emoji}</span>
                                {userIds.length > 1 && (
                                  <span className="text-[10px] font-semibold opacity-70">
                                    {userIds.length}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!msg.isDeleted && !msg.isRecalled && (
                      <div
                        className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-all duration-150 shrink-0 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className="relative group/reactbtn"
                          onMouseLeave={() => {
                            if (hiddenReactPopupId === msg.messageId) setHiddenReactPopupId(null);
                          }}
                        >
                          <button
                            type="button"
                            title="Thả cảm xúc"
                            className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                          >
                            <SmilePlus className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                          </button>
                          <div
                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 p-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-1 transition-all translate-y-2 z-50 after:content-[''] after:absolute after:left-0 after:-bottom-5 after:w-full after:h-5 ${hiddenReactPopupId === msg.messageId ? 'hidden' : 'opacity-0 pointer-events-none group-hover/reactbtn:opacity-100 group-hover/reactbtn:pointer-events-auto group-hover/reactbtn:translate-y-0'}`}
                          >
                            {['❤️', '👍', '😂', '😮', '😢', '😡'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReact(msg, emoji);
                                  setHiddenReactPopupId(msg.messageId);
                                }}
                                className="text-xl hover:scale-125 transition-transform px-1"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          title="Trả lời"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReply(msg);
                          }}
                          className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                        </button>
                        <button
                          type="button"
                          title={msg.isPinned ? 'Bỏ ghim' : 'Ghim'}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onTogglePin(msg);
                          }}
                          className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${msg.isPinned ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'}`}
                          />
                        </button>
                        {isMe && (
                          <div className="relative">
                            <button
                              type="button"
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                onActionMenuMsgIdChange(
                                  actionMenuMsgId === msg.messageId ? null : msg.messageId,
                                );
                              }}
                              className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                            </button>
                            {actionMenuMsgId === msg.messageId && (
                              <div
                                className={`absolute z-50 min-w-[156px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl py-1 ${isMe ? 'right-0 bottom-full mb-1' : 'left-0 bottom-full mb-1'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                                  onClick={() => {
                                    onStartEdit(msg);
                                    onActionMenuMsgIdChange(null);
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5 shrink-0" /> Sửa
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                                  onClick={() => void onRecall(msg)}
                                >
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" /> Thu hồi
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-red-500/10 text-red-600 flex items-center gap-2"
                                  onClick={() => void onDelete(msg)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" /> Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {showMeta && (
                    <div
                      className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isMe && !msg.isRecalled && !msg.isDeleted && (
                        <CheckCheck className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-end gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                  {typingInitial(typingUsers[0])}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[11px] font-semibold text-foreground/70 px-0.5">
                    {typingUsers.length === 1
                      ? typingLabel(typingUsers[0])
                      : `${typingLabel(typingUsers[0])} và ${typingUsers.length - 1} người khác`}
                  </span>
                  <div className="bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl rounded-bl-sm px-3 py-2 flex gap-[4px] items-center shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: i * 0.18,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground/60 italic px-0.5">
                    Đang soạn tin nhắn...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {unreadIncomingCount > 0 && (
            <div className="sticky bottom-3 z-20 flex justify-center">
              <button
                type="button"
                onClick={onJumpToLatest}
                className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors"
              >
                {unreadIncomingCount > 1
                  ? `${unreadIncomingCount} tin nhắn mới — bấm để xem`
                  : '1 tin nhắn mới — bấm để xem'}
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
