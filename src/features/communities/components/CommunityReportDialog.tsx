import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useReportEntityMutation } from '@/store/api/communityApi';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam hoặc lừa đảo' },
  { value: 'harassment', label: 'Quấy rối hoặc quấy nhiễu' },
  { value: 'hate_speech', label: 'Ngôn từ thù hận' },
  { value: 'inappropriate', label: 'Nội dung không thích hợp' },
  { value: 'rules_violation', label: 'Vi phạm quy tắc cộng đồng' },
  { value: 'other', label: 'Lý do khác' },
] as const;

type ReportReasonType = (typeof REPORT_REASONS)[number]['value'];

export function CommunityReportDialog({
  groupId,
  entityType = 'GROUP',
  entityId,
  postId,
  createdAt,
  open,
  onClose,
}: {
  groupId: string;
  entityType?: 'POST' | 'CMT' | 'GROUP';
  entityId: string;
  postId?: string;
  createdAt?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reportEntity, { isLoading }] = useReportEntityMutation();
  const [reason, setReason] = useState<ReportReasonType>('spam');
  const [details, setDetails] = useState('');

  const handleSubmit = async () => {
    try {
      await reportEntity({
        groupId,
        entityType,
        entityId,
        reason,
        details: details.trim() || undefined,
        postId,
        createdAt,
      }).unwrap();
      toast.success('Báo cáo nội dung thành công. Ban quản trị sẽ xem xét xử lý.');
      onClose();
      setDetails('');
      setReason('spam');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể gửi báo cáo nội dung');
    }
  };

  const getTitle = () => {
    if (entityType === 'POST') return 'Báo cáo bài viết';
    if (entityType === 'CMT') return 'Báo cáo bình luận';
    return 'Báo cáo cộng đồng';
  };

  const getDescription = () => {
    if (entityType === 'POST')
      return 'Báo cáo nếu bài viết này vi phạm tiêu chuẩn hoặc quy tắc cộng đồng.';
    if (entityType === 'CMT')
      return 'Báo cáo nếu bình luận này vi phạm tiêu chuẩn hoặc quy tắc cộng đồng.';
    return 'Báo cáo nếu cộng đồng này vi phạm quy chuẩn hoặc quy tắc.';
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md p-0" showCloseButton={false}>
        <DialogHeader className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle>{getTitle()}</DialogTitle>
              <DialogDescription>{getDescription()}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Lý do báo cáo
            </label>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((item) => (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 select-none ${
                    reason === item.value
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/10'
                      : 'border-border bg-card hover:bg-muted/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    className="accent-red-600 size-4 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Chi tiết bổ sung (tùy chọn)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              placeholder="Cung cấp thêm thông tin giúp ban quản trị hiểu rõ hơn..."
              className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200 resize-none"
            />
            <div className="text-right text-xs text-muted-foreground">
              {details.length}/500 ký tự
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              'Gửi báo cáo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
