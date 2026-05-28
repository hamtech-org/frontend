import { useEffect, useState } from 'react';
import { zaloAvatarSurfaceStyle, zaloInitials } from '@/utils/avatarUtils';
import { resolveChatMediaFetchUrl } from '@/utils/chatMediaDownload';

type ZaloStyleAvatarProps = {
  userId: string;
  /** Tên thật để tính chữ (không dùng nhãn kiểu "Bạn"). */
  displayName: string;
  avatarUrl?: string | null;
  className?: string;
};

export function ZaloStyleAvatar({
  userId,
  displayName,
  avatarUrl,
  className = '',
}: ZaloStyleAvatarProps) {
  const [broken, setBroken] = useState(false);
  const rawSrc = avatarUrl?.trim();
  const src = rawSrc ? resolveChatMediaFetchUrl(rawSrc) : '';
  const showImg = Boolean(src) && !broken;

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!showImg) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[13px] leading-none shadow-sm select-none ${className}`}
        style={zaloAvatarSurfaceStyle(userId)}
        aria-hidden
      >
        {zaloInitials(displayName, userId)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`rounded-full object-cover shrink-0 ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
