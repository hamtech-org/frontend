import { cn } from '@/utils/cn';

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
  if (sameCalendarDay) return `Hôm nay ${hm}`;
  const ddmmyyyy = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${ddmmyyyy}, ${hm}`;
}

/** UI kiểu cuốn lịch bàn + dòng giờ bên cạnh (thứ / ngày / tháng trong lịch; giờ dạng Hôm nay hoặc dd/mm/yyyy). */
export function TaskDeadlineCalendar({ dateIso, className, size = 'md' }: TaskDeadlineCalendarProps) {
  const d = new Date(dateIso);
  const t = d.getTime();
  if (!Number.isFinite(t)) {
    return (
      <span className={cn('text-[12px] font-semibold text-muted-foreground', className)}>
        Deadline không hợp lệ
      </span>
    );
  }

  const day = d.getDate();
  const monthYear = d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  const sm = size === 'sm';
  const timeLine = formatDeadlineTimeLine(d);

  return (
    <div className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <div
        className={cn(
          'inline-flex shrink-0 flex-col overflow-hidden rounded-xl border border-black/12 bg-white shadow-md ring-1 ring-black/5 dark:border-white/12 dark:bg-zinc-900 dark:ring-white/10',
          sm ? 'max-w-[76px]' : 'w-[92px]',
        )}
        role="img"
        aria-label={`Hạn ${weekday}, ngày ${day}, ${monthYear}, ${timeLine}`}
      >
        <div className="flex justify-center gap-1 border-b border-black/8 bg-zinc-100 py-1 dark:border-white/10 dark:bg-zinc-800/90">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
        </div>
        <div className="bg-red-500 px-1 py-1 text-center text-[9px] font-bold capitalize leading-tight tracking-wide text-white dark:bg-red-600 sm:text-[8px]">
          {monthYear}
        </div>
        <div className="flex flex-col items-center px-1 pb-2 pt-1.5">
          <span
            className={cn(
              'font-black tabular-nums leading-none text-foreground',
              sm ? 'text-[20px]' : 'text-[26px]',
            )}
          >
            {day}
          </span>
          <span className="mt-1 px-0.5 text-center text-[10px] font-semibold capitalize leading-tight text-muted-foreground sm:text-[9px]">
            {weekday}
          </span>
        </div>
      </div>
      <span
        className={cn(
          'min-w-0 break-words font-semibold tabular-nums leading-snug text-foreground',
          sm ? 'text-[11px]' : 'text-[13px]',
        )}
      >
        {timeLine}
      </span>
    </div>
  );
}
