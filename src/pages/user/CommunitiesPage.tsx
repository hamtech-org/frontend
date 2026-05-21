import { useParams } from 'react-router-dom';
import { CommunitiesList } from '@/features/communities/components/CommunitiesList';
import { CommunityDetail } from '@/features/communities/components/CommunityDetail';

export default function CommunitiesPage() {
  const { groupId } = useParams<{ groupId?: string }>();
  return groupId ? <CommunityDetail groupId={groupId} /> : <CommunitiesList />;
}
