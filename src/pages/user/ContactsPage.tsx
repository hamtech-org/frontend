import { motion } from 'motion/react';
import { Search, Plus, Users, MessageSquare, Globe, Lock, ArrowRight } from 'lucide-react';

const communities = [
  { id: 1, name: 'Visual Storytellers', members: '12.4k', description: 'Không gian dành cho các nhà quay phim và đạo diễn chia sẻ tác phẩm.', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=400&fit=crop', isPrivate: false },
  { id: 2, name: 'AI Explorers', members: '8.2k', description: 'Thảo luận về tiến bộ mới nhất trong sáng tạo nội dung AI.', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop', isPrivate: false },
  { id: 3, name: 'Motion Designers', members: '5.6k', description: 'Mọi thứ về motion graphics, từ 2D animation đến 3D simulation.', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=400&fit=crop', isPrivate: true },
];

const trendingTopics = [
  { tag: 'cinematography', posts: '1.2k' },
  { tag: 'blender3d', posts: '842' },
  { tag: 'zalogram_v2', posts: '2.4k' },
  { tag: 'ai_art', posts: '560' },
  { tag: 'storytelling', posts: '312' },
];

export default function ContactsPage() {
  return (
    <div className="editorial-void max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-5xl font-display font-extrabold tracking-tight leading-tight">
            Khám phá <span className="text-blue-600">Cộng đồng.</span>
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Tham gia các cộng đồng chuyên biệt, thảo luận chuyên sâu và hợp tác với những người cùng đam mê.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Tìm cộng đồng..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none font-medium"
            />
          </div>
          <button className="w-full sm:w-auto p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-105 transition-all flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold tracking-tight">Đề xuất cho bạn</h2>
            <button className="text-sm font-bold text-blue-600 hover:underline">Xem tất cả</button>
          </div>

          <div className="space-y-8">
            {communities.map((community, i) => (
              <motion.div 
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-[2.5rem] overflow-hidden border-none shadow-xl shadow-black/5 dark:shadow-white/5 group cursor-pointer"
              >
                <div className="aspect-[21/9] relative overflow-hidden">
                  <img src={community.image} alt={community.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-8 right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight truncate">{community.name}</h3>
                        {community.isPrivate ? <Lock className="w-5 h-5 text-white/60 flex-shrink-0" /> : <Globe className="w-5 h-5 text-white/60 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-white/80 font-bold text-sm">
                        <div className="flex items-center gap-1 whitespace-nowrap"><Users className="w-4 h-4" />{community.members} Thành viên</div>
                        <div className="flex items-center gap-1 whitespace-nowrap"><MessageSquare className="w-4 h-4" />24 Hoạt động</div>
                      </div>
                    </div>
                    <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-blue-900 font-bold hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-2 flex-shrink-0">
                      Tham gia
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-lg text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3">{community.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="glass-card p-8 rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 space-y-6">
            <h3 className="text-xl font-display font-bold tracking-tight">Chủ đề thịnh hành</h3>
            <div className="space-y-4">
              {trendingTopics.map((topic) => (
                <button key={topic.tag} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">#</div>
                    <p className="font-bold group-hover:text-blue-600 transition-colors truncate">{topic.tag}</p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground flex-shrink-0 whitespace-nowrap">{topic.posts} bài</span>
                </button>
              ))}
            </div>
            <button className="w-full py-3 rounded-xl border border-inherit text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all">
              Xem tất cả chủ đề
            </button>
          </section>

          <section className="glass-card p-8 rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 space-y-6">
            <h3 className="text-xl font-display font-bold tracking-tight">Cuộc trò chuyện nổi bật</h3>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 group cursor-pointer items-start">
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex-shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold group-hover:text-blue-600 transition-colors line-clamp-2">Làm thế nào để đạt được "film look" trong digital?</p>
                    <p className="text-xs text-muted-foreground truncate">Bắt đầu bởi Alex • 12 phản hồi</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
