import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ICommunity } from '@/types/community.types';
import { CommunityDiscoveryCard } from './CommunityDiscoveryCard';
import { EmptyState } from './EmptyState';

export function CommunityGridSection({
  title,
  description,
  communities,
  dismissed,
  expanded,
  loading,
  joining,
  onToggleExpanded,
  onDismiss,
  onJoin,
}: {
  title: string;
  description?: string;
  communities: ICommunity[];
  dismissed: Set<string>;
  expanded: boolean;
  loading: boolean;
  joining: boolean;
  onToggleExpanded: () => void;
  onDismiss: (groupId: string) => void;
  onJoin: (groupId: string) => void;
}) {
  const visible = expanded ? communities : communities.slice(0, 4);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {communities.length > 4 && (
          <Button variant="link" onClick={onToggleExpanded}>
            {expanded ? 'Thu gọn' : 'Xem tất cả'}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visible.map((community) => (
            <CommunityDiscoveryCard
              key={community.groupId}
              community={community}
              joining={joining}
              onDismiss={() => onDismiss(community.groupId)}
              onJoin={() => onJoin(community.groupId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={dismissed.size ? 'Bạn đã ẩn hết gợi ý trong phần này' : 'Chưa có gợi ý phù hợp'}
          description="Hãy thử chủ đề khác hoặc tạo nhóm đầu tiên cho chủ đề này."
        />
      )}
    </section>
  );
}
