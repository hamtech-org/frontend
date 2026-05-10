import { cn } from '@/utils/cn';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

type TaskDeadlineCalendarProps = {
  dateIso: string;
  className?: string;
  /** `sm` — panel hẹp; `md` — thẻ chat / modal chi tiết */
  size?: 'sm' | 'md';
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Cạnh lịch: «Hôm nay 20:30» hoặc «20/12/2026, 20:55». */
function formatDeadlineTimeLine(d: Date): string {
  const now = new Date();
  const sameCalendarDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (sameCalendarDay) return `Hôm nay, ${hm}`;
  const ddmmyyyy = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${ddmmyyyy}, ${hm}`;
}

export function TaskDeadlineCalendar({
  dateIso,
  className,
  size = 'md',
}: TaskDeadlineCalendarProps) {
  const d = new Date(dateIso);
  const t = d.getTime();
  if (!Number.isFinite(t)) {
    return (
      <span className={cn('text-[12px] font-semibold text-muted-foreground', className)}>
        Deadline không hợp lệ
      </span>
    );
  }

  const timeLine = formatDeadlineTimeLine(d);
  const isOverdue = d.getTime() < new Date().getTime();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border shadow-sm transition-all',
        isOverdue
          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
          : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        size === 'sm' ? 'text-[11px]' : 'text-[13px]',
        className,
      )}
    >
      <CalendarIcon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      <span className="font-semibold leading-none">{timeLine}</span>
    </div>
  );
}
