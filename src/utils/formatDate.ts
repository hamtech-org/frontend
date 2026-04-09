import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export const formatDate = (date: string): string => dayjs(date).format('DD/MM/YYYY HH:mm');
export const formatRelative = (date: string): string => dayjs(date).fromNow();
export const formatTime = (date: string): string => dayjs(date).format('HH:mm');
export const formatDateOnly = (date: string): string => dayjs(date).format('DD/MM/YYYY');
