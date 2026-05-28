import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Copy, Download, Loader2, Share2, Users } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ZaloStyleAvatar } from '@/components/chat/ZaloStyleAvatar';
import { Button } from '@/components/ui';
import type { GroupJoinLinkModalData } from '@/contexts/GroupJoinLinkModalContext';
import {
  useGetConversationsQuery,
  useGetGroupJoinPreviewQuery,
  useJoinGroupViaLinkMutation,
} from '@/store/api/chatApi';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';

type GroupJoinLinkModalProps = {
  open: boolean;
  data: GroupJoinLinkModalData | null;
  onClose: () => void;
  onOpenSharePicker: (data: GroupJoinLinkModalData) => void;
};

export function GroupJoinLinkModal({
  open,
  data,
  onClose,
  onOpenSharePicker,
}: GroupJoinLinkModalProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const qrRef = useRef<HTMLCanvasElement>(null);

  const suffix = data?.suffix ?? '';
  const joinUrl = data?.url ?? '';

  const {
    data: previewRes,
    isLoading: previewLoading,
    isError: previewQueryError,
    error: previewErr,
  } = useGetGroupJoinPreviewQuery(suffix, {
    skip: !open || !suffix,
  });
  const { data: conversationsRes } = useGetConversationsQuery(undefined, {
    skip: !open,
  });
  const [joinViaLink, { isLoading: joining }] = useJoinGroupViaLinkMutation();

  const preview = previewRes?.data;
  const conversationIdForChat = preview?.conversationId ?? data?.conversationId;
  const liveConversation = conversationsRes?.data?.find(
    (c) => c.conversationId === conversationIdForChat,
  );
  const groupName =
    liveConversation?.name?.trim() || data?.groupName || preview?.name || 'Nhóm chat';
  const rawGroupAvatar = liveConversation?.avatar ?? data?.groupAvatar ?? preview?.avatar ?? null;
  const groupAvatar = resolveGroupAvatarDisplayUrl(rawGroupAvatar, {
    conversationId: conversationIdForChat,
    updatedAt: liveConversation?.updatedAt,
  });
  const currentData = data
    ? {
        ...data,
        groupName,
        groupAvatar: rawGroupAvatar,
        conversationId: conversationIdForChat ?? data.conversationId,
      }
    : null;

  const previewFailed = Boolean(suffix) && !previewLoading && (previewQueryError || !preview);

  const loginHref = useMemo(
    () => `/login?redirect=${encodeURIComponent(`/join/${suffix}`)}`,
    [suffix],
  );

  const handleCopy = useCallback(async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success('Đã sao chép link');
    } catch {
      toast.error('Không sao chép được link');
    }
  }, [joinUrl]);

  const handleShare = useCallback(() => {
    if (!currentData) return;
    onOpenSharePicker(currentData);
  }, [currentData, onOpenSharePicker]);

  const handleSaveQr = useCallback(() => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `hamtech-join-${suffix || 'group'}.png`;
    a.click();
    toast.success('Đã tải mã QR');
  }, [suffix]);

  const handleDismiss = useCallback(() => {
    const path = data?.replacePathOnClose;
    onClose();
    if (path) navigate(path, { replace: true });
  }, [data?.replacePathOnClose, onClose, navigate]);

  useEffect(() => {
    if (!open || !data) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, data, handleDismiss]);

  const handleJoin = async () => {
    if (!suffix) return;
    if (!isAuthenticated) {
      navigate(loginHref);
      return;
    }
    try {
      const res = await joinViaLink(suffix).unwrap();
      const result = res.data;
      toast.success(res.message || 'Đã xử lý yêu cầu tham gia');
      if (result.status === 'joined' || result.status === 'already_member') {
        onClose();
        navigate(`/chat/${result.conversationId}`);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Không thể tham gia nhóm'));
    }
  };

  const joinButtonLabel =
    preview?.approvalRequired === true ? 'Gửi yêu cầu tham gia' : 'Tham gia nhóm';

  let bottomSection: ReactNode = null;

  if (!previewFailed && preview) {
    if (preview.isMember) {
      bottomSection = conversationIdForChat ? (
        <Button
          variant="outline"
          className="mt-5 w-full max-w-[260px]"
          onClick={() => {
            onClose();
            navigate(`/chat/${conversationIdForChat}`);
          }}
        >
          Mở nhóm chat
        </Button>
      ) : null;
    } else if (preview.requestStatus === 'pending') {
      bottomSection = (
        <div className="mt-5 w-full max-w-[260px] space-y-3">
          <p className="text-center text-sm text-amber-600 dark:text-amber-400">
            Yêu cầu tham gia đang chờ trưởng nhóm duyệt.
          </p>
          <Button variant="outline" className="w-full" type="button" onClick={handleDismiss}>
            Về trang chủ
          </Button>
        </div>
      );
    } else {
      bottomSection = (
        <div className="mt-5 w-full max-w-[260px] space-y-3">
          {preview.approvalRequired ? (
            <p className="text-center text-sm text-muted-foreground">
              Nhóm yêu cầu phê duyệt trước khi bạn có thể tham gia.
            </p>
          ) : null}
          {!isAuthenticated ? (
            <Button className="w-full" asChild>
              <Link to={loginHref}>Đăng nhập để tham gia</Link>
            </Button>
          ) : (
            <Button
              className="w-full bg-[#0068ff] hover:bg-blue-700"
              disabled={joining}
              type="button"
              onClick={() => void handleJoin()}
            >
              {joining ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang xử lý…
                </>
              ) : (
                joinButtonLabel
              )}
            </Button>
          )}
        </div>
      );
    }
  }

  return (
    <AnimatePresence>
      {open && data ? (
        <motion.div
          key="group-join-link-overlay"
          role="presentation"
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleDismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Link nhóm"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col w-full max-w-[min(100%,20rem)] sm:max-w-[22rem] max-h-[min(85dvh,520px)] overflow-hidden rounded-2xl bg-white dark:bg-[#0f1419] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-gradient-to-r from-[#0068ff] to-[#3d8bff] px-2.5 py-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 rounded-full text-white hover:bg-white/15 transition-colors"
                aria-label="Đóng"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="flex-1 text-center text-[17px] font-bold text-white pr-10">
                Link nhóm
              </h2>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar">
              <div className="mx-auto px-4 py-5 sm:py-6 flex flex-col items-center text-center">
                {!previewFailed && preview?.isMember ? (
                  <p className="text-sm text-muted-foreground mb-2">
                    Bạn đã là thành viên nhóm này.
                  </p>
                ) : null}

                <ZaloStyleAvatar
                  userId={conversationIdForChat ?? suffix}
                  displayName={groupName}
                  avatarUrl={groupAvatar}
                  avatarUrlResolved
                  className="size-16 mb-3"
                />
                <p className="text-[16px] font-bold text-slate-900 dark:text-white leading-snug">
                  {groupName}
                </p>

                {!previewLoading && preview && !previewFailed ? (
                  <p className="mt-1 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Users className="size-4 shrink-0" />
                    {preview.memberCount} thành viên
                  </p>
                ) : null}

                <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px]">
                  Mời mọi người tham gia nhóm bằng mã QR hoặc link dưới đây:
                </p>

                {previewFailed ? (
                  <div className="mt-5 w-full max-w-full space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Link không hợp lệ
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getApiErrorMessage(
                        previewErr,
                        'Link mời đã hết hạn hoặc nhóm đã tắt tham gia bằng link.',
                      )}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      onClick={handleDismiss}
                    >
                      Về trang chủ
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 p-3 bg-white rounded-xl shadow-md border border-slate-100 dark:border-slate-800 dark:bg-zinc-900">
                      <QRCodeCanvas
                        ref={qrRef}
                        value={joinUrl}
                        size={148}
                        level="M"
                        marginSize={2}
                        bgColor="#ffffff"
                        fgColor="#0a1629"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      title={joinUrl}
                      className="mt-4 w-full max-w-full rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/50 px-3 py-2.5 text-[12px] font-mono text-[#0068ff] truncate hover:bg-sky-100/80 dark:hover:bg-sky-900/30 transition-colors"
                    >
                      {joinUrl}
                    </button>
                    <div className="mt-8 w-full flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
                      <ActionChip
                        icon={Copy}
                        label="Sao chép link"
                        onClick={() => void handleCopy()}
                      />
                      <ActionChip icon={Share2} label="Chia sẻ link" onClick={handleShare} />
                      <ActionChip icon={Download} label="Lưu mã QR" onClick={handleSaveQr} />
                    </div>
                  </>
                )}

                {previewLoading ? (
                  <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Đang kiểm tra quyền tham gia…
                  </div>
                ) : (
                  bottomSection
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group"
    >
      <span className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[#0068ff] group-hover:bg-sky-100 dark:group-hover:bg-sky-950/50 transition-colors">
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-[12px] text-slate-600 dark:text-slate-300 leading-tight">{label}</span>
    </button>
  );
}
