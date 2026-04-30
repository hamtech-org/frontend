interface Props {
  isFetchingNext: boolean;
  hasMore: boolean;
  hasPosts: boolean;
}

export const FeedLoadState = ({ isFetchingNext, hasMore, hasPosts }: Props) => (
  <div className="py-2 text-center">
    {isFetchingNext ? (
      <p className="text-sm text-muted-foreground">Đang tải thêm bài viết...</p>
    ) : null}
    {!hasMore && hasPosts ? (
      <p className="text-xs text-muted-foreground">Bạn đã xem hết bài viết</p>
    ) : null}
  </div>
);
