import { Link } from 'react-router-dom';
import type { ISearchGroupResult } from '@/types/search.types';

export function SearchGroupRow({ group }: { group: ISearchGroupResult }) {
  return (
    <Link
      to={`/communities/${group.groupId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {group.name[0]?.toUpperCase() ?? 'N'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{group.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {group.memberCount.toLocaleString('vi-VN')} thành viên
        </div>
      </div>
    </Link>
  );
}
