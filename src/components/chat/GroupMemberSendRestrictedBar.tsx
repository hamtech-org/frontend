import { Info } from 'lucide-react';

type GroupMemberSendRestrictedBarProps = {
  onLearnMore?: () => void;
};

/** Thanh thông báo thay ô nhập khi member không được gửi tin (chỉ trưởng/phó nhóm). */
export function GroupMemberSendRestrictedBar({ onLearnMore }: GroupMemberSendRestrictedBarProps) {
  return (
    <div className="relative z-20 shrink-0 border-t border-black/[0.06] bg-[#f0f2f5] px-4 py-3.5 dark:border-white/[0.06] dark:bg-[#1c1c1e] sm:px-6">
      <div className="flex items-start gap-2.5">
        <Info
          className="mt-0.5 size-[18px] shrink-0 text-[#0068FF]"
          strokeWidth={2.25}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-[14px] leading-[1.45] text-[#65676b] dark:text-zinc-400">
          Chỉ
          <b className="text-[#0068FF]"> trưởng nhóm</b> và{' '}
          <b className="text-[#0068FF]">phó nhóm </b>
          được gửi tin nhắn vào nhóm.
        </p>
      </div>
    </div>
  );
}
