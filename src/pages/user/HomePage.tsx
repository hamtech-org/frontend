import { motion } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Play,
  Plus,
  Video,
  Image as ImageIcon,
  Smile,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetFeedQuery } from '@/store/api/newsfeedApi';
import { extractTextFromTiptapJson } from '@/utils/tiptapText';
import type { RootState } from '@/store/store';

const reels = [
  {
    id: 1,
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=500&fit=crop',
    views: '1.2M',
    name: 'The New Mentor',
  },
  {
    id: 2,
    thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=500&fit=crop',
    views: '840k',
    name: 'TechCraft',
  },
  {
    id: 3,
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=500&fit=crop',
    views: '2.4M',
    name: 'Thành Duy',
  },
  {
    id: 4,
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=500&fit=crop',
    views: '560k',
    name: 'JR Duy Trần',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data: feedRes, isLoading } = useGetFeedQuery();
  const posts = useMemo(() => feedRes?.data ?? [], [feedRes?.data]);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const createPostName = currentUser?.displayName?.trim() || 'Bạn';
  const createPostAvatar = currentUser?.avatar || '';
  const createPostInitial = createPostName.charAt(0).toUpperCase() || 'U';
  const reelsScrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateReelsNavState = () => {
    const el = reelsScrollerRef.current;
    if (!el) return;
    const maxLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxLeft - 4);
  };

  const scrollReelsBy = (direction: 'left' | 'right') => {
    const el = reelsScrollerRef.current;
    if (!el) return;
    const step = Math.round(el.clientWidth * 0.72);
    el.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
    window.setTimeout(updateReelsNavState, 220);
  };

  useEffect(() => {
    updateReelsNavState();
    window.addEventListener('resize', updateReelsNavState);
    return () => window.removeEventListener('resize', updateReelsNavState);
  }, []);

  return (
    <div className="editorial-void max-w-[800px] mx-auto space-y-8 pt-2 md:pt-3 lg:pt-4">
      <section className="space-y-4">
        <div className="rounded-3xl border border-border/40 bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
              {createPostAvatar ? (
                <img
                  src={createPostAvatar}
                  alt={createPostName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{createPostInitial}</span>
              )}
            </div>
            <button
              type="button"
              className="min-w-0 flex-1 truncate rounded-full bg-muted/50 px-4 py-2 text-left text-base text-muted-foreground"
              onClick={() => navigate('/posts/new')}
            >
              {createPostName} ơi, bạn đang nghĩ gì thế?
            </button>
            <button type="button" className="p-1.5 text-rose-500 hover:opacity-80">
              <Video className="w-5 h-5" />
            </button>
            <button type="button" className="p-1.5 text-green-600 hover:opacity-80">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button type="button" className="p-1.5 text-amber-500 hover:opacity-80">
              <Smile className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          {canScrollLeft ? (
            <button
              type="button"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 size-9 rounded-full bg-background/90 shadow-md flex items-center justify-center"
              onClick={() => scrollReelsBy('left')}
              aria-label="Cuộn reels sang trái"
            >
              <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
            </button>
          ) : null}
          {canScrollRight ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 size-9 rounded-full bg-background/90 shadow-md flex items-center justify-center"
              onClick={() => scrollReelsBy('right')}
              aria-label="Cuộn reels sang phải"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          ) : null}

          <div
            ref={reelsScrollerRef}
            className="no-scrollbar flex items-stretch gap-3 overflow-x-auto pb-1"
            onScroll={updateReelsNavState}
          >
            <button
              type="button"
              className="relative shrink-0 w-[140px] rounded-2xl overflow-hidden bg-card shadow-sm"
            >
              <div className="h-[180px] bg-accent/60 flex items-center justify-center">
                <div className="size-16 rounded-full bg-primary/20" />
              </div>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 size-10 rounded-full bg-blue-600 border-4 border-background flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="py-3 text-sm font-bold text-foreground bg-background/70">Tạo tin</div>
            </button>

            {reels.map((reel) => (
              <motion.div
                key={reel.id}
                whileHover={{ y: -5 }}
                className="relative shrink-0 w-[140px] h-[230px] rounded-2xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={reel.thumbnail}
                  alt="Reel"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 size-9 rounded-full border-[3px] border-blue-500 bg-card/40" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="flex items-center gap-1">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-bold">{reel.views}</span>
                  </div>
                  <p className="text-[15px] font-bold mt-1 leading-tight">{reel.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold tracking-tight">Dành cho bạn</h2>
        </div>

        <div className="space-y-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Đang tải bài viết...</p> : null}
          {posts.map((post) => {
            const likes = Object.values(post.reactionsCount ?? {}).reduce((a, b) => a + b, 0);
            const img = post.mediaUrls[0];
            const displayName = post.author?.displayName ?? post.authorId;
            const avatar = post.author?.avatar ?? '';
            const initial = displayName.trim().charAt(0).toUpperCase();
            return (
              <motion.article
                key={post.postId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card max-w-3xl mx-auto rounded-3xl overflow-hidden border-none shadow-lg shadow-black/5 dark:shadow-white/5"
              >
                <div className="p-4 md:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                          {initial || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{displayName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-4 md:px-5 pb-3">
                  <p className="text-sm leading-6 whitespace-pre-wrap">
                    {extractTextFromTiptapJson(post.content).slice(0, 180)}
                    {extractTextFromTiptapJson(post.content).length > 180 ? '…' : ''}
                  </p>
                </div>
                {img ? (
                  <div className="relative overflow-hidden max-h-[320px]">
                    <img
                      src={img}
                      alt="Post content"
                      className="w-full h-full max-h-[320px] object-cover hover:scale-105 transition-transform duration-1000"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : null}
                <div className="p-4 md:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button type="button" className="flex items-center gap-2 group">
                      <div className="p-1.5 rounded-full group-hover:bg-red-500/10 transition-all">
                        <Heart className="w-4 h-4 group-hover:text-red-500 group-hover:fill-red-500 transition-all" />
                      </div>
                      <span className="text-sm font-bold">{likes}</span>
                    </button>
                    <button type="button" className="flex items-center gap-2 group">
                      <div className="p-1.5 rounded-full group-hover:bg-blue-600/10 transition-all">
                        <MessageCircle className="w-4 h-4 group-hover:text-blue-600 transition-all" />
                      </div>
                      <span className="text-sm font-bold">{post.commentsCount}</span>
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-full hover:bg-green-500/10 group transition-all"
                    >
                      <Share2 className="w-4 h-4 group-hover:text-green-500 transition-all" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-full hover:bg-blue-600/10 group transition-all"
                  >
                    <Bookmark className="w-4 h-4 group-hover:text-blue-600 transition-all" />
                  </button>
                </div>
                <div className="px-4 md:px-5 pb-4">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    onClick={() => navigate(`/post/${post.postId}`)}
                  >
                    Xem bài viết
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
