import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const formatDate = (date: string): string => dayjs(date).format('DD/MM/YYYY HH:mm');
export const formatRelative = (date: string): string => dayjs(date).fromNow();
export const formatTime = (date: string): string => dayjs(date).format('HH:mm');
export const formatDateOnly = (date: string): string => dayjs(date).format('DD/MM/YYYY');

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Thời gian danh sách hội thoại kiểu Zalo (VN).
 * `now` truyền vào để test / tick UI định kỳ.
 *
 * - &lt; 1 phút: "Vừa xong"
 * - &lt; 60 phút: "X phút"
 * - &lt; 24 giờ: "X giờ"
 * - &lt; 7 ngày: "X ngày"
 * - ≥ 7 ngày, cùng năm với `now`: DD/MM
 * - khác năm: DD/MM/YYYY
 */
export function formatZaloConversationTime(iso: string, now: Date = new Date()): string {
  const t = dayjs(iso);
  if (!t.isValid()) return '';

  const diff = now.getTime() - t.valueOf();
  if (diff < 0) return t.format('DD/MM/YYYY');

  if (diff < MINUTE_MS) return 'Vừa xong';
  if (diff < 60 * MINUTE_MS) {
    const minutes = Math.floor(diff / MINUTE_MS);
    return `${Math.max(1, minutes)} phút`;
  }
  if (diff < 24 * HOUR_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${Math.max(1, hours)} giờ`;
  }
  if (diff < 7 * DAY_MS) {
    const days = Math.floor(diff / DAY_MS);
    return `${Math.max(1, days)} ngày`;
  }

  const nowY = dayjs(now).year();
  if (t.year() !== nowY) return t.format('DD/MM/YYYY');
  return t.format('DD/MM');
}
