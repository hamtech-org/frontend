import { BarChart2, CheckCircle2, ClipboardList, X } from 'lucide-react';
import type { ChatFrameNotice } from '@/pages/user/chat-page/hooks/useChatGroupFrameNotices';

interface ChatGroupFrameNoticeBarProps {
  notice: ChatFrameNotice;
  onDismiss: () => void;
}

export function ChatGroupFrameNoticeBar({ notice, onDismiss }: ChatGroupFrameNoticeBarProps) {
  const v = notice.variant ?? 'task_assigned';
  const isClickable = Boolean(notice.onClick);
  const theme =
    v === 'task_joined'
      ? {
          wrap: 'bg-emerald-50/90 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-800/60',
          text: 'text-emerald-900 dark:text-emerald-50',
          sub: 'text-emerald-900/60 dark:text-emerald-50/70',
          icon: <CheckCircle2 className="w-4 h-4" />,
        }
      : v === 'poll'
        ? {
            wrap: 'bg-orange-50/90 dark:bg-orange-900/20 border-orange-200/70 dark:border-orange-800/60',
            text: 'text-orange-950 dark:text-orange-50',
            sub: 'text-orange-950/60 dark:text-orange-50/70',
            icon: <BarChart2 className="w-4 h-4" />,
          }
        : {
            wrap: 'bg-blue-50/90 dark:bg-blue-900/20 border-blue-200/70 dark:border-blue-800/60',
            text: 'text-blue-950 dark:text-blue-50',
            sub: 'text-blue-950/60 dark:text-blue-50/70',
            icon: <ClipboardList className="w-4 h-4" />,
          };

  const timeLabel = (() => {
    const ms = new Date(notice.atIso).getTime();
    if (!Number.isFinite(ms)) return '';
    return new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div
      className={`relative w-full shrink-0 border-t px-3 py-2 ${theme.wrap}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <div className={`mt-[1px] ${theme.text}`}>{theme.icon}</div>
        <button
          type="button"
          onClick={() => notice.onClick?.()}
          disabled={!isClickable}
          className={`min-w-0 flex-1 text-left text-[12px] font-semibold leading-[18px] ${theme.text} ${
            isClickable ? 'cursor-pointer hover:underline' : 'cursor-default'
          }`}
        >
          {notice.text}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={`shrink-0 rounded-md p-1 ${theme.sub} hover:bg-black/5 dark:hover:bg-white/10`}
          title="Đóng"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {timeLabel ? (
        <div className={`mt-0.5 pl-6 text-[11px] font-semibold ${theme.sub}`}>{timeLabel}</div>
      ) : null}
    </div>
  );
}
