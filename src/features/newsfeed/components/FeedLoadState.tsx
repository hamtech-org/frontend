interface Props {
  isLoadingInitial: boolean;
  isFetchingNext: boolean;
  hasMore: boolean;
  hasPosts: boolean;
}

export const FeedLoadState = ({ isLoadingInitial, isFetchingNext, hasMore, hasPosts }: Props) => (
  <>
    {isLoadingInitial ? (
      <p className="text-sm text-muted-foreground">Đang tải bài viết...</p>
    ) : null}
    <div className="py-2 text-center">
      {isFetchingNext ? (
        <p className="text-sm text-muted-foreground">Đang tải thêm bài viết...</p>
      ) : null}
      {!hasMore && hasPosts ? (
        <p className="text-xs text-muted-foreground">Bạn đã xem hết bài viết</p>
      ) : null}
    </div>
  </>
);
