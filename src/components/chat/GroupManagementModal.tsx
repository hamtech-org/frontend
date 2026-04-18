import { AnimatePresence, motion } from 'motion/react';
import {
  Ban,
  Copy,
  KeyRound,
  Lock,
  RefreshCw,
  Settings,
  Share2,
  HelpCircle,
  X,
} from 'lucide-react';
import { useId } from 'react';
import { toast } from 'react-toastify';
import { MAX_PINNED_PER_CONVERSATION } from '@/components/chat/PinLimitModal';
import { useGetGroupSettingsQuery, useUpdateGroupSettingsMutation } from '@/store/api/chatApi';
import type { IGroupAdminSettings, IGroupMemberPermissions } from '@/types/chat.types';

/** Alias tương thích import cũ. */
export type GroupMemberPermissions = IGroupMemberPermissions;
export type GroupAdminSettings = IGroupAdminSettings;

type GroupManagementUiVariant = 'modal' | 'inline';

type GroupManagementModalProps = {
  open: boolean;
  onClose: () => void;
  conversationId: string | undefined;
  canEdit: boolean;
  variant?: GroupManagementUiVariant;
};

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-[14px] text-slate-800 dark:text-slate-100 leading-snug">{label}</span>
        {help ? (
          <button
            type="button"
            title={help}
            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-0.5"
            aria-label="Gợi ý"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0068ff] disabled:opacity-45 ${
          checked ? 'bg-[#0068ff]' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function errToast(e: unknown): string {
  const x = e as { data?: { error?: { message?: string } } };
  return x?.data?.error?.message ?? 'Không lưu được cài đặt';
}

export function GroupManagementModal({
  open,
  onClose,
  conversationId,
  canEdit,
  variant = 'modal',
}: GroupManagementModalProps) {
  const baseId = useId();
  const { data: settingsRes, isFetching } = useGetGroupSettingsQuery(conversationId!, {
    skip: !open || !conversationId,
  });
  const [updateSettings, { isLoading: saving }] = useUpdateGroupSettingsMutation();

  const gs = settingsRes?.data;
  const member = gs?.memberPermissions;
  const admin = gs?.adminSettings;
  const joinSuffix = gs?.joinLinkSuffix;

  const joinUrl =
    typeof window !== 'undefined' && joinSuffix
      ? `${window.location.origin}/join/${joinSuffix}`
      : joinSuffix
        ? `/join/${joinSuffix}`
        : '—';

  const patchMember = async (key: keyof IGroupMemberPermissions, value: boolean) => {
    if (!canEdit || !conversationId) return;
    try {
      await updateSettings({
        groupId: conversationId,
        memberPermissions: { [key]: value },
      }).unwrap();
    } catch (e) {
      toast.error(errToast(e));
    }
  };

  const patchAdmin = async (key: keyof IGroupAdminSettings, value: boolean) => {
    if (!canEdit || !conversationId) return;
    try {
      const needLink = key === 'allowJoinLink' && value === true && !joinSuffix;
      await updateSettings({
        groupId: conversationId,
        adminSettings: { [key]: value },
        regenerateJoinLink: needLink ? true : undefined,
      }).unwrap();
    } catch (e) {
      toast.error(errToast(e));
    }
  };

  const regenerateLink = async () => {
    if (!canEdit || !conversationId) return;
    try {
      await updateSettings({ groupId: conversationId, regenerateJoinLink: true }).unwrap();
      toast.success('Đã tạo link mới');
    } catch (e) {
      toast.error(errToast(e));
    }
  };

  const busy = saving || isFetching;

  const scrollBody = (
    <>
      {canEdit && (
        <div className="mx-3 mt-3 mb-2 flex items-center gap-2 rounded-lg bg-slate-100/90 dark:bg-zinc-800/90 px-3 py-2.5 text-[13px] text-slate-700 dark:text-slate-300">
          <Lock className="w-4 h-4 shrink-0 text-slate-500" />
          Tính năng chỉ dành cho quản trị viên
        </div>
      )}

      {isFetching && !gs ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Đang tải cài đặt…</div>
      ) : !member || !admin ? (
        <div className="px-4 py-8 text-center text-sm text-red-500">Không tải được cài đặt nhóm.</div>
      ) : (
        <>
          <div className="px-4 pt-2 pb-1">
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-3">
              Cho phép các thành viên trong nhóm:
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-zinc-900/40">
              {(
                [
                  { key: 'changeNameAvatar' as const, label: 'Thay đổi tên & ảnh đại diện của nhóm' },
                  {
                    key: 'pinMessages' as const,
                    label: 'Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại',
                    hint: `Tối đa ${MAX_PINNED_PER_CONVERSATION} tin ghim mỗi cuộc trò chuyện.`,
                  },
                  { key: 'createNotesReminders' as const, label: 'Tạo mới ghi chú, nhắc hẹn' },
                  { key: 'createPolls' as const, label: 'Tạo mới bình chọn' },
                  { key: 'sendMessages' as const, label: 'Gửi tin nhắn' },
                ] as const
              ).map((row) => (
                <label
                  key={row.key}
                  className={`flex items-start justify-between gap-3 px-3 py-3 ${
                    canEdit ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/60' : 'opacity-80'
                  }`}
                >
                  <div className="min-w-0 pt-0.5">
                    <span className="text-[14px] text-slate-900 dark:text-slate-100 leading-snug block">
                      {row.label}
                    </span>
                    {'hint' in row && row.hint ? (
                      <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 block">
                        {row.hint}
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="checkbox"
                    checked={member[row.key]}
                    disabled={!canEdit || busy}
                    onChange={(e) => void patchMember(row.key, e.target.checked)}
                    className="mt-1 w-[18px] h-[18px] rounded border-slate-300 accent-[#0068ff] shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 space-y-0">
            <ToggleRow
              label="Chế độ phê duyệt thành viên mới"
              help="Khi bật, người mới xin vào phải được duyệt."
              checked={admin.approvalRequired}
              disabled={!canEdit || busy}
              onChange={(v) => void patchAdmin('approvalRequired', v)}
            />
            <ToggleRow
              label="Đánh dấu tin nhắn từ trưởng/phó nhóm"
              checked={admin.highlightLeaderMessages}
              disabled={!canEdit || busy}
              onChange={(v) => void patchAdmin('highlightLeaderMessages', v)}
            />
            <ToggleRow
              label="Cho phép thành viên mới đọc tin nhắn gần nhất"
              checked={admin.newMembersReadRecent}
              disabled={!canEdit || busy}
              onChange={(v) => void patchAdmin('newMembersReadRecent', v)}
            />
            <ToggleRow
              label="Cho phép dùng link tham gia nhóm"
              checked={admin.allowJoinLink}
              disabled={!canEdit || busy}
              onChange={(v) => void patchAdmin('allowJoinLink', v)}
            />
          </div>

          {admin.allowJoinLink && (
            <div className="px-4 pb-3">
              <div className="rounded-xl bg-sky-50/90 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 px-3 py-2.5 flex items-center justify-between gap-2">
                <span className="text-[13px] font-mono text-slate-800 dark:text-slate-200 truncate">
                  {joinUrl}
                </span>
                <div className="flex items-center gap-1 shrink-0 text-[#0068ff]">
                  <button
                    type="button"
                    title="Sao chép"
                    disabled={!joinSuffix}
                    className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50 disabled:opacity-40"
                    onClick={() => {
                      if (!joinSuffix) return;
                      void navigator.clipboard?.writeText(joinUrl);
                      toast.success('Đã sao chép link');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Chia sẻ"
                    disabled={!joinSuffix}
                    className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50 disabled:opacity-40"
                    onClick={() => {
                      if (!joinSuffix || !navigator.share) {
                        toast.info('Dùng Sao chép để gửi link');
                        return;
                      }
                      void navigator.share({ title: 'Tham gia nhóm', url: joinUrl });
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Làm mới link"
                    disabled={!canEdit || busy}
                    className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50"
                    onClick={() => void regenerateLink()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
            <button
              type="button"
              className="w-full flex items-center gap-3 py-3 text-left text-[14px] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/80 rounded-lg px-2 -mx-2 opacity-60"
              onClick={() => toast.info('Tính năng đang phát triển')}
            >
              <Ban className="w-5 h-5 text-slate-500 shrink-0" />
              Chặn khỏi nhóm
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 py-3 text-left text-[14px] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800/80 rounded-lg px-2 -mx-2 opacity-60"
              onClick={() => toast.info('Dùng mục Quản lý thành viên để xem vai trò')}
            >
              <KeyRound className="w-5 h-5 text-slate-500 shrink-0" />
              Trưởng &amp; phó nhóm
            </button>
          </div>

          {!canEdit && (
            <p className="px-4 pb-4 text-[12px] text-center text-slate-500">
              Bạn chỉ xem được cài đặt. Chỉ trưởng/phó nhóm mới chỉnh sửa.
            </p>
          )}
        </>
      )}
    </>
  );

  if (variant === 'inline') {
    if (!open) return null;
    return (
      <div className="h-full w-full min-h-0 flex flex-col bg-white dark:bg-[#1a1a1a]">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 id={`${baseId}-gmtitle`} className="font-bold text-[17px] text-black dark:text-white truncate">
              Quản lý nhóm
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
            title="Quay lại thông tin"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto min-h-0 custom-scrollbar"
          role="region"
          aria-labelledby={`${baseId}-gmtitle`}
        >
          {scrollBody}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-stretch justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/45 dark:bg-black/65 backdrop-blur-[2px]"
          role="presentation"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-gmtitle`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-[#141414] w-full sm:max-w-[440px] sm:rounded-xl h-full sm:h-auto sm:max-h-[min(92vh,720px)] shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-3 border-b border-black/5 dark:border-white/10 shrink-0">
              <h2
                id={`${baseId}-gmtitle`}
                className="flex-1 text-center font-bold text-[17px] text-[#0a1629] dark:text-white"
              >
                Quản lý nhóm
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">{scrollBody}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
