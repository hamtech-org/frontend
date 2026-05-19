import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Radio, RefreshCw } from 'lucide-react';
import { useListLiveSessionsQuery } from '@/store/api/liveApi';
import { LiveSessionCard } from '@/components/live/LiveSessionCard';
import { CreateLiveSessionDialog } from '@/components/live/CreateLiveSessionDialog';
import { Button } from '@/components/ui/button';
import { LIVE_AS_VIEWER_PARAM, useMyLiveDirectory } from '@/hooks/useMyLiveDirectory';
import { cn } from '@/utils/cn';

export default function LiveDirectoryPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: sessions, isLoading, isError, refetch, isFetching } = useListLiveSessionsQuery();
  const {
    mySession,
    publicSessions,
    showMyLiveViewerButton,
    showResumeHostButton,
    hasMyActiveSession,
  } = useMyLiveDirectory(sessions);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Đang phát trực tiếp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Các phòng phát sóng công khai đang hoạt động trực tuyến
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            type="button"
            title="Làm mới"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          {!hasMyActiveSession ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Tạo phiên live
            </Button>
          ) : null}
        </div>
      </div>

      {(showMyLiveViewerButton || showResumeHostButton) && mySession ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {showMyLiveViewerButton ? (
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => navigate(`/live/${mySession.sessionId}?${LIVE_AS_VIEWER_PARAM}=1`)}
            >
              <Radio className="h-4 w-4" />
              Phiên live của tôi
            </Button>
          ) : null}
          {showResumeHostButton ? (
            <Button type="button" onClick={() => navigate(`/live/${mySession.sessionId}/studio`)}>
              Tiếp tục phát sóng
            </Button>
          ) : null}
        </div>
      ) : null}

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      )}

      {isError && (
        <p className="text-destructive text-sm">Không tải được danh sách. Thử làm mới.</p>
      )}

      {!isLoading && !publicSessions.length && !showMyLiveViewerButton && !showResumeHostButton && (
        <div
          className={cn(
            'rounded-2xl border border-border p-10 text-center',
            'bg-card text-muted-foreground',
          )}
        >
          Chưa có phiên live nào. Nhấn &quot;Tạo phiên live&quot; để bắt đầu.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {publicSessions.map((s) => (
          <LiveSessionCard key={s.sessionId} session={s} />
        ))}
      </div>

      <CreateLiveSessionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
