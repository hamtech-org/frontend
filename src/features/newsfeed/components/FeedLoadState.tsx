interface Props {
  isFetchingNext: boolean;
  hasMore: boolean;
  hasPosts: boolean;
}

export const FeedLoadState = ({ isFetchingNext, hasMore, hasPosts }: Props) => (
  <div className="py-2 text-center">
    {isFetchingNext ? (
      <div className="space-y-3">
        <div className="animate-pulse rounded-2xl border border-border/40 bg-card p-4 text-left">
          <div className="mb-3 flex items-center gap-3">
            <div className="size-9 rounded-full bg-muted/70" />
            <div className="h-3 w-28 rounded bg-muted/70" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-4/5 rounded bg-muted/60" />
          </div>
        </div>
      </div>
    ) : null}
    {!hasMore && hasPosts ? (
      <p className="text-xs text-muted-foreground">Bạn đã xem hết bài viết</p>
    ) : null}
  </div>
);
