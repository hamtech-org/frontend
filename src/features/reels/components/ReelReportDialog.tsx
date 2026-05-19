import { useState, useCallback } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useReportReelMutation } from '@/store/api/newsfeedApi';
import type { ReelReportReason } from '@/types/newsfeed.types';

interface Props {
  reelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_OPTIONS: { value: ReelReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam / Quảng cáo' },
  { value: 'nudity', label: 'Nội dung không phù hợp' },
  { value: 'hate', label: 'Phát ngôn thù ghét' },
  { value: 'violence', label: 'Bạo lực' },
  { value: 'other', label: 'Khác' },
];

/**
 * AlertDialog báo cáo reel vi phạm.
 * Chọn lý do + chi tiết tùy chọn → POST /newsfeed/reels/:reelId/report
 */
export const ReelReportDialog = ({ reelId, open, onOpenChange }: Props) => {
  const [reason, setReason] = useState<ReelReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [reportReel, { isLoading }] = useReportReelMutation();
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reason) return;

    try {
      await reportReel({
        reelId,
        reason,
        details: details.trim() || undefined,
      }).unwrap();
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setReason(null);
        setDetails('');
      }, 1500);
    } catch {
      // Error handling
    }
  }, [reason, details, reelId, reportReel, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card rounded-2xl border-border/40 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Flag className="size-4 text-destructive" />
            </div>
            <AlertDialogTitle>Báo cáo Reel</AlertDialogTitle>
          </div>
          <AlertDialogDescription>Chọn lý do bạn muốn báo cáo nội dung này.</AlertDialogDescription>
        </AlertDialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">✅ Đã gửi báo cáo. Cảm ơn bạn!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {REPORT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
                  ${
                    reason === opt.value
                      ? 'bg-destructive/10 border border-destructive/30'
                      : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                  }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={opt.value}
                  checked={reason === opt.value}
                  onChange={() => setReason(opt.value)}
                  className="accent-destructive"
                />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
              </label>
            ))}

            {reason === 'other' && (
              <div className="mt-1">
                <Label className="text-xs text-muted-foreground mb-1">Chi tiết</Label>
                <Input
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề..."
                  className="rounded-xl bg-muted/40 border-border/40"
                  maxLength={500}
                />
              </div>
            )}
          </div>
        )}

        {!success && (
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={!reason || isLoading}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Gửi báo cáo
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
