import type { IPost } from '@/types/newsfeed.types';
import { extractTextFromTiptapJson } from '@/utils/tiptapText';

export interface PostCardViewModel {
  likes: number;
  imageUrl: string | null;
  displayName: string;
  avatar: string;
  initial: string;
  excerpt: string;
  hasExcerptOverflow: boolean;
  authorId: string;
}

export const toPostCardViewModel = (post: IPost): PostCardViewModel => {
  const likes = Object.values(post.reactionsCount ?? {}).reduce((a, b) => a + b, 0);
  const displayName = post.author?.displayName ?? post.authorId;
  const avatar = post.author?.avatar ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const fullText = extractTextFromTiptapJson(post.content);
  const excerpt = fullText.slice(0, 180);

  return {
    likes,
    imageUrl: post.mediaUrls[0] ?? null,
    displayName,
    avatar,
    initial,
    excerpt,
    hasExcerptOverflow: fullText.length > 180,
    authorId: post.authorId,
  };
};
