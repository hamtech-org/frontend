import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const formatDate = (date: string): string => dayjs(date).format('DD/MM/YYYY HH:mm');
export const formatRelative = (date: string): string => dayjs(date).fromNow();
export const formatTime = (date: string): string => dayjs(date).format('HH:mm');
export const formatDateOnly = (date: string): string => dayjs(date).format('DD/MM/YYYY');

/** Giờ trên pill thông báo giữa khung chat (VD 7:00, 10:00) — đặt trước mốc ngày. */
export function formatChatSystemPillTime(iso: string): string {
  const t = dayjs(iso);
  if (!t.isValid()) return '';
  return t.format('H:mm');
}

/** Mốc ngày trên pill / chip danh sách: Hôm nay | Hôm qua | DD/MM/YYYY — cùng logic lịch máy với mobile (`toDateString`). */
export function formatChatSystemPillDateLabel(iso: string, now: Date = new Date()): string {
  const raw = String(iso ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  const t = dayjs(raw);
  return t.isValid() ? t.format('DD/MM/YYYY') : '';
}

/** Hiện chip mốc ngày khi đổi ngày lịch (theo timezone trình duyệt — `toDateString`, đồng bộ mobile). */
export function chatSystemPillShowDateLine(
  prevCreatedAt: string | undefined | null,
  currCreatedAt: string | undefined | null,
): boolean {
  const curr = String(currCreatedAt ?? '').trim();
  if (!curr) return false;
  const c = new Date(curr);
  if (Number.isNaN(c.getTime())) return true;
  const prev = String(prevCreatedAt ?? '').trim();
  if (!prev) return true;
  const p = new Date(prev);
  if (Number.isNaN(p.getTime())) return true;
  return p.toDateString() !== c.toDateString();
}

/** Cùng ngày lịch local (gom chuỗi bubble / tên người gửi). */
export function chatMessagesSameLocalDay(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const da = new Date(String(a ?? '').trim());
  const db = new Date(String(b ?? '').trim());
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return da.toDateString() === db.toDateString();
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Thời gian danh sách hội thoại kiểu Zalo (VN).
 * `now` truyền vào để test / tick UI định kỳ.
 *
 * - &lt; 1 phút: "Vài giây" (kể cả lệch đồng hồ nhẹ với server → tránh nháy DD/MM/YYYY)
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
  /** Tin “vừa gửi” nhưng `createdAt` hơi sau `now` (lệch giờ client/server) — không hiện ngày. */
  if (diff < 0) return 'Vài giây';

  if (diff < MINUTE_MS) return 'Vài giây';
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
