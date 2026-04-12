import { ChevronDown, Pin, PinOff } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';

type PinnedMessagesBarProps = {
  primaryPinnedMessage: IMessage;
  otherPinnedMessages: IMessage[];
  showOtherPinnedPanel: boolean;
  onToggleOtherPinnedPanel: () => void;
  onScrollToMessage: (messageId: string) => void;
  onTogglePin: (msg: IMessage) => void;
  formatMessageTime: (createdAt: string) => string;
};

export function PinnedMessagesBar({
  primaryPinnedMessage,
  otherPinnedMessages,
  showOtherPinnedPanel,
  onToggleOtherPinnedPanel,
  onScrollToMessage,
  onTogglePin,
  formatMessageTime,
}: PinnedMessagesBarProps) {
  return (
    <div className="w-full shrink-0 bg-white dark:bg-black/20 border-b border-black/5 dark:border-white/5 flex flex-col">
      <div className="w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          title="Xem tin trong khung chat"
          className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg -mx-2 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onClick={() => onScrollToMessage(primaryPinnedMessage.messageId)}
        >
          <Pin className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] sm:text-xs text-blue-600 font-bold uppercase">Tin nhắn ghim</p>
            <p className="text-sm font-medium truncate">
              {primaryPinnedMessage.senderDisplayName ?? primaryPinnedMessage.senderId}:{' '}
              {primaryPinnedMessage.isRecalled || primaryPinnedMessage.isDeleted
                ? '—'
                : primaryPinnedMessage.content}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {otherPinnedMessages.length > 0 && (
            <button
              type="button"
              title={`Thêm ${otherPinnedMessages.length} tin đã ghim`}
              aria-expanded={showOtherPinnedPanel}
              className="p-1.5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors flex items-center gap-0.5"
              onClick={onToggleOtherPinnedPanel}
            >
              <span className="text-xs font-semibold tabular-nums pr-0.5">+{otherPinnedMessages.length}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showOtherPinnedPanel ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          <button
            type="button"
            title="Bỏ ghim tin này"
            className="p-1 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors"
            onClick={() => void onTogglePin(primaryPinnedMessage)}
          >
            <PinOff className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showOtherPinnedPanel && otherPinnedMessages.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-black/5 dark:border-white/5 px-4 sm:px-8 py-2 space-y-1 custom-scrollbar">
          {[...otherPinnedMessages].reverse().map((pm) => (
            <div
              key={pm.messageId}
              className="flex items-stretch gap-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 min-h-[44px]"
            >
              <button
                type="button"
                title="Xem trong khung chat"
                className="flex-1 min-w-0 text-left px-2 py-2 rounded-l-lg"
                onClick={() => onScrollToMessage(pm.messageId)}
              >
                <p className="text-[10px] text-muted-foreground">
                  {formatMessageTime(pm.createdAt)} · {pm.senderDisplayName ?? pm.senderId}
                </p>
                <p className="text-sm truncate">{pm.isRecalled || pm.isDeleted ? '—' : pm.content}</p>
              </button>
              <button
                type="button"
                title="Bỏ ghim"
                className="shrink-0 px-2 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded-r-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  void onTogglePin(pm);
                }}
              >
                <PinOff className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
