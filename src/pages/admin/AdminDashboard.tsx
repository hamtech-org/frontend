import { motion } from 'motion/react';
import {
  Users,
  ShieldCheck,
  AlertCircle,
  Activity,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Mail,
  Ban,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const users = [
  {
    id: 1,
    name: 'Elena Vance',
    email: 'elena@zalogram.com',
    role: 'Nhà sáng tạo',
    status: 'Active',
    joined: '12/10/2025',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    id: 2,
    name: 'Marcus Chen',
    email: 'marcus@zalogram.com',
    role: 'Kiểm duyệt viên',
    status: 'Active',
    joined: '05/11/2025',
    avatar:
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
  },
  {
    id: 3,
    name: 'Sarah Jenkins',
    email: 'sarah@zalogram.com',
    role: 'Nhà sáng tạo',
    status: 'Suspended',
    joined: '20/12/2025',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    id: 4,
    name: 'Julian Thorne',
    email: 'julian@zalogram.com',
    role: 'Quản trị viên',
    status: 'Active',
    joined: '15/01/2026',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
];

const stats = [
  {
    label: 'Tổng người dùng',
    value: '124.5k',
    change: '+12.5%',
    isUp: true,
    icon: Users,
    color: 'text-blue-600',
  },
  {
    label: 'Kiểm duyệt viên',
    value: '842',
    change: '+5.2%',
    isUp: true,
    icon: ShieldCheck,
    color: 'text-purple-600',
  },
  {
    label: 'Nội dung bị báo cáo',
    value: '12',
    change: '-24.1%',
    isUp: false,
    icon: AlertCircle,
    color: 'text-red-600',
  },
  {
    label: 'Sức khỏe hệ thống',
    value: '99.9%',
    change: 'Ổn định',
    isUp: true,
    icon: Activity,
    color: 'text-green-600',
  },
];

export default function AdminDashboard() {
  return (
    <div className="editorial-void max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-5xl font-display font-extrabold tracking-tight leading-tight">
            Hệ sinh thái <span className="text-blue-600">Người dùng.</span>
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Quản lý cộng đồng, giám sát sức khỏe hệ thống và theo dõi hoạt động kiểm duyệt.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-6 py-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-105 transition-all flex items-center gap-2 font-bold">
            <UserPlus className="w-5 h-5" />
            Mời thành viên
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 rounded-[2rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl bg-black/5 dark:bg-white/5 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-bold ${stat.isUp ? 'text-green-500' : 'text-red-500'}`}
              >
                {stat.change === 'Ổn định' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : stat.isUp ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">{stat.label}</p>
              <h3 className="text-3xl font-display font-extrabold tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="glass-card rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 overflow-hidden">
        <div className="p-8 border-b border-inherit flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h3 className="text-2xl font-display font-bold tracking-tight">Thành viên đang hoạt động</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm người dùng..."
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none text-sm"
              />
            </div>
            <button className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-inherit hover:bg-black/10 dark:hover:bg-white/10 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5">
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Người dùng
                </th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Vai trò</th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Trạng thái
                </th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Ngày tham gia
                </th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-600/20">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.role === 'Quản trị viên'
                          ? 'bg-purple-500/10 text-purple-500'
                          : user.role === 'Kiểm duyệt viên'
                            ? 'bg-blue-600/10 text-blue-600'
                            : 'bg-green-500/10 text-green-500'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                      <span className="text-sm font-medium">
                        {user.status === 'Active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-medium text-muted-foreground">{user.joined}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-blue-600/10 text-blue-600 transition-all">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-all">
                        <Ban className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
