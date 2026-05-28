import { AnimatePresence, motion } from 'motion/react';
import { User, Users, X } from 'lucide-react';
import type { IConversation } from '@/types/chat.types';
import { MAX_PINNED_CHATS_TO_TOP } from '@/components/chat/chatPinConstants';
import { resolveChatMediaFetchUrl } from '@/utils/chatMediaDownload';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';

type ConversationPinLimitModalProps = {
  open: boolean;
  /** Hội thoại user đang cố ghim lên đầu. */
  pendingConversationId: string | null;
  pendingName: string;
  /** Các hội thoại đang ghim lên đầu (tối đa MAX). */
  pinnedConversations: IConversation[];
  isConfirming?: boolean;
  unpinningConversationId?: string | null;
  onClose: () => void;
  onUnpinConversation: (conversationId: string) => void;
  onConfirmPinPending: () => void;
};

function sortPinnedForModal(list: IConversation[]) {
  return [...list].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function ConversationPinLimitModal({
  open,
  pendingConversationId,
  pendingName,
  pinnedConversations,
  isConfirming = false,
  unpinningConversationId = null,
  onClose,
  onUnpinConversation,
  onConfirmPinPending,
}: ConversationPinLimitModalProps) {
  const max = MAX_PINNED_CHATS_TO_TOP;
  const rows = sortPinnedForModal(pinnedConversations);
  const canConfirmPin = rows.length < max && !!pendingConversationId;

  return (
    <AnimatePresence>
      {open && pendingConversationId && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!isConfirming && !unpinningConversationId) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conv-pin-limit-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-[480px] w-full overflow-hidden shadow-2xl border border-black/5 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3
                id="conv-pin-limit-title"
                className="font-bold text-[17px] text-[#0a1629] dark:text-white"
              >
                Ghim hội thoại
              </h3>
              <button
                type="button"
                disabled={isConfirming || !!unpinningConversationId}
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-1"
              >
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[min(60vh,420px)] overflow-y-auto custom-scrollbar">
              <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Bạn chỉ được ghim tối đa {max} trò chuyện.
                <br />
                <span className="mt-2 inline-block">
                  Để ghim trò chuyện{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {pendingName}
                  </span>
                  , vui lòng bỏ ghim ít nhất 1 trò chuyện bên dưới.
                </span>
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-zinc-900/50 overflow-hidden divide-y divide-slate-200 dark:divide-slate-600">
                {rows.map((conv) => {
                  const displayName = conv.name ?? 'Hội thoại';
                  const isGroup = conv.type === 'group';
                  const busy = unpinningConversationId === conv.conversationId;
                  const avatarSrc = isGroup
                    ? resolveGroupAvatarDisplayUrl(conv.avatar, {
                        conversationId: conv.conversationId,
                        avatarVersion: String(conv.memberCount ?? ''),
                      })
                    : conv.avatar
                      ? resolveChatMediaFetchUrl(conv.avatar)
                      : undefined;
                  return (
                    <div
                      key={conv.conversationId}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                    >
                      <div className="relative shrink-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border border-black/5 dark:border-white/10"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border border-black/5 dark:border-white/10">
                            {isGroup ? (
                              <Users className="w-5 h-5 text-blue-600" />
                            ) : (
                              <User className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        )}
                        {isGroup && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white dark:border-[#1a1a1a] flex items-center justify-center">
                            <Users className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="flex-1 min-w-0 font-semibold text-[15px] text-slate-900 dark:text-slate-100 truncate">
                        {displayName}
                      </p>
                      <button
                        type="button"
                        disabled={busy || isConfirming || !!unpinningConversationId}
                        onClick={() => onUnpinConversation(conv.conversationId)}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#0068ff] hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50 transition-colors"
                      >
                        {busy ? 'Đang bỏ…' : 'Bỏ ghim'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-5 flex items-center justify-end gap-3 border-t border-black/5 dark:border-white/10 pt-4">
              <button
                type="button"
                disabled={isConfirming || !!unpinningConversationId}
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!canConfirmPin || isConfirming || !!unpinningConversationId}
                onClick={() => void onConfirmPinPending()}
                className="px-5 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 min-w-[120px]"
              >
                {isConfirming ? 'Đang xử lý…' : 'Ghim hội thoại'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
