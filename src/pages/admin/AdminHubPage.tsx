import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { BarChart3, FileText, Filter, HardDrive, Users, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  {
    to: '/admin/groups',
    title: 'Quản lý nhóm',
    description: 'Tương tác nhóm, trạng thái, danh sách thành viên.',
    icon: UsersRound,
    color: 'text-blue-600',
  },
  {
    to: '/admin/users',
    title: 'Quản lý người dùng',
    description: 'Kiểm duyệt tài khoản, xử lý báo cáo.',
    icon: Users,
    color: 'text-purple-600',
  },
  {
    to: '/admin/statistics',
    title: 'Thống kê & phân tích',
    description: 'Tin nhắn, cao điểm hoạt động, nhóm chat, bài viết.',
    icon: BarChart3,
    color: 'text-emerald-600',
  },
  {
    to: '/admin/posts',
    title: 'Quản lý bài viết',
    description: 'Tương tác bài viết, cập nhật trạng thái hiển thị.',
    icon: FileText,
    color: 'text-orange-600',
  },
  {
    to: '/admin/resources',
    title: 'Báo cáo tài nguyên',
    description: 'Dung lượng media trên hệ thống.',
    icon: HardDrive,
    color: 'text-cyan-600',
  },
  {
    to: '/admin/ai-filter',
    title: 'Cấu hình bộ lọc AI',
    description: 'Từ khóa nhạy cảm, cảnh báo nội dung.',
    icon: Filter,
    color: 'text-rose-600',
  },
];

export default function AdminHubPage() {
  return (
    <div className="w-full min-w-0 space-y-10">
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-tight">
          Quản <span className="text-blue-600">trị.</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Chọn khu vực quản lý. Dữ liệu trong các trang con hiện là mẫu — nhóm sẽ nối API sau.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((m, i) => (
          <motion.div
            key={m.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={m.to}
              className={cn(
                'glass-card block h-full rounded-[1.75rem] border-none p-6 shadow-xl shadow-black/5 dark:shadow-white/5',
                'hover:ring-2 hover:ring-blue-600/25 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40',
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-2xl bg-black/5 dark:bg-white/5 shrink-0', m.color)}>
                  <m.icon className="size-6" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="font-display font-bold text-lg tracking-tight">{m.title}</h2>
                  <p className="text-sm text-muted-foreground leading-snug">{m.description}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
