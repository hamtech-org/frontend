import type { IPost } from '@/types/newsfeed.types';

export const sortPostsDesc = (a: IPost, b: IPost): number => {
  const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  if (createdDiff !== 0) return createdDiff;
  return b.postId.localeCompare(a.postId);
};

export const mergeDedupPosts = (previous: IPost[], incoming: IPost[]): IPost[] => {
  const merged = new Map(previous.map((post) => [post.postId, post]));
  for (const post of incoming) {
    merged.set(post.postId, post);
  }
  return Array.from(merged.values()).sort(sortPostsDesc);
};
