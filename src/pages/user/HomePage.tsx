import { motion } from 'motion/react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Play, Plus } from 'lucide-react';

const posts = [
  {
    id: 1,
    author: {
      name: 'Elena Vance',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      role: 'Nhà quay phim',
    },
    content:
      'Khám phá những hẻm núi ẩn giấu ở Arizona với ống kính anamorphic mới. Ánh sáng giờ vàng thật kỳ diệu.',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
    likes: '12.4k',
    comments: '842',
    time: '2 giờ trước',
  },
  {
    id: 2,
    author: {
      name: 'Julian Thorne',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      role: 'Motion Designer',
    },
    content: 'Vừa ra mắt tutorial mới về procedural textures trong Blender. Hãy xem trong AI Studio nhé!',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=800&fit=crop',
    likes: '8.2k',
    comments: '312',
    time: '5 giờ trước',
  },
];

const reels = [
  { id: 1, thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=500&fit=crop', views: '1.2M' },
  { id: 2, thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=500&fit=crop', views: '840k' },
  { id: 3, thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=500&fit=crop', views: '2.4M' },
  { id: 4, thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=500&fit=crop', views: '560k' },
];

export default function HomePage() {
  return (
    <div className="editorial-void max-w-6xl mx-auto space-y-12">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold tracking-tight">Reels thịnh hành</h2>
          <button type="button" className="text-sm font-bold text-blue-600 hover:underline">
            Xem tất cả
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reels.map((reel) => (
            <motion.div
              key={reel.id}
              whileHover={{ y: -5 }}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer"
            >
              <img
                src={reel.thumbnail}
                alt="Reel"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                <Play className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold">{reel.views}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold tracking-tight">Dành cho bạn</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold">
              Mới nhất
            </button>
            <button type="button" className="px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 text-sm font-bold">
              Phổ biến
            </button>
          </div>
        </div>

        <div className="space-y-12">
          {posts.map((post) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-[2.5rem] overflow-hidden border-none shadow-xl shadow-black/5 dark:shadow-white/5"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-600/20">
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{post.author.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {post.author.role} • {post.time}
                    </p>
                  </div>
                </div>
                <button type="button" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 pb-4">
                <p className="text-lg leading-relaxed">{post.content}</p>
              </div>
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={post.image}
                  alt="Post content"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button type="button" className="flex items-center gap-2 group">
                    <div className="p-2 rounded-full group-hover:bg-red-500/10 transition-all">
                      <Heart className="w-6 h-6 group-hover:text-red-500 group-hover:fill-red-500 transition-all" />
                    </div>
                    <span className="font-bold">{post.likes}</span>
                  </button>
                  <button type="button" className="flex items-center gap-2 group">
                    <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-all">
                      <MessageCircle className="w-6 h-6 group-hover:text-blue-500 transition-all" />
                    </div>
                    <span className="font-bold">{post.comments}</span>
                  </button>
                  <button type="button" className="p-2 rounded-full hover:bg-green-500/10 group transition-all">
                    <Share2 className="w-6 h-6 group-hover:text-green-500 transition-all" />
                  </button>
                </div>
                <button type="button" className="p-2 rounded-full hover:bg-blue-500/10 group transition-all">
                  <Bookmark className="w-6 h-6 group-hover:text-blue-500 transition-all" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
