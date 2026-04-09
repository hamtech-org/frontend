import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Github, Mail } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ethereal-bg dark:bg-midnight-bg">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
            >
              Z
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-display font-extrabold tracking-tight leading-tight"
            >
              Kỷ nguyên mới của <span className="text-blue-600 italic">OTT</span> đã đến.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-md leading-relaxed"
            >
              Tham gia cộng đồng sáng tạo, kết nối và chia sẻ. Trải nghiệm nội dung theo cách chưa từng có.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/20 group"
            >
              Bắt đầu ngay
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-4 pt-4">
              <button type="button" className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                <Github className="w-6 h-6" />
              </button>
              <button type="button" className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                <Mail className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="relative group"
        >
          <div className="absolute -inset-4 bg-blue-600/10 rounded-[2.5rem] blur-2xl group-hover:bg-blue-600/20 transition-all duration-700" />
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1000&fit=crop"
              alt="Featured Creator"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop"
                    alt="Creator"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <p className="text-white font-bold">Marcus Chen</p>
                  <p className="text-white/60 text-sm">Nghệ sĩ hình ảnh</p>
                </div>
              </div>
              <h3 className="text-2xl font-display font-bold text-white leading-tight">
                &quot;Zalogram đã thay đổi cách tôi kết nối với cộng đồng.&quot;
              </h3>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
