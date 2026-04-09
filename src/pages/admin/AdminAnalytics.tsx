import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Download,
} from 'lucide-react';

const data = [
  { name: 'T2', views: 4000, engagement: 2400 },
  { name: 'T3', views: 3000, engagement: 1398 },
  { name: 'T4', views: 2000, engagement: 9800 },
  { name: 'T5', views: 2780, engagement: 3908 },
  { name: 'T6', views: 1890, engagement: 4800 },
  { name: 'T7', views: 2390, engagement: 3800 },
  { name: 'CN', views: 3490, engagement: 4300 },
];

const stats = [
  {
    label: 'Tổng lượt xem',
    value: '1.2M',
    change: '+12.5%',
    isUp: true,
    icon: Eye,
    color: 'text-[#EAB308]',
  },
  {
    label: 'Người theo dõi',
    value: '48.2k',
    change: '+8.2%',
    isUp: true,
    icon: Users,
    color: 'text-purple-600',
  },
  {
    label: 'Thời gian xem TB',
    value: '12:45',
    change: '-2.4%',
    isUp: false,
    icon: Clock,
    color: 'text-orange-600',
  },
  {
    label: 'Tỉ lệ tương tác',
    value: '8.4%',
    change: '+4.1%',
    isUp: true,
    icon: TrendingUp,
    color: 'text-green-600',
  },
];

export default function AdminAnalytics() {
  return (
    <div className="editorial-void max-w-7xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-extrabold tracking-tight">Phân tích hiệu suất</h1>
          <p className="text-muted-foreground text-lg">
            Theo dõi tăng trưởng và mức độ tương tác trong hệ sinh thái HamTech.
          </p>
        </div>
        <button className="px-6 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2 font-bold">
          <Download className="w-5 h-5" />
          Xuất báo cáo
        </button>
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
                {stat.isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 space-y-8"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold tracking-tight">Tăng trưởng người xem</h3>
            <select className="bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none">
              <option>7 ngày qua</option>
              <option>30 ngày qua</option>
              <option>90 ngày qua</option>
            </select>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6C757D', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6C757D', fontSize: 12, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    padding: '16px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#0066FF"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 space-y-8"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold tracking-tight">Tương tác</h3>
            <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6C757D', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    padding: '16px',
                  }}
                />
                <Bar dataKey="engagement" fill="#0066FF" radius={[10, 10, 10, 10]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <section className="glass-card rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 overflow-hidden">
        <div className="p-8 border-b border-inherit flex items-center justify-between">
          <h3 className="text-2xl font-display font-bold tracking-tight">Hiệu suất nội dung gần đây</h3>
          <button className="text-sm font-bold text-[#EAB308] hover:underline">Xem tất cả</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5">
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Nội dung</th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Loại</th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Lượt xem</th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Tương tác</th>
                <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {[1, 2, 3, 4].map((i) => (
                <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-10 rounded-lg bg-black/10 dark:bg-white/10 overflow-hidden">
                        <img
                          src={`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=60&fit=crop&sig=${i}`}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="font-bold">Nghệ thuật kể chuyện bằng hình ảnh Phần {i}</p>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-medium">Video</td>
                  <td className="p-6 text-sm font-bold">12.4k</td>
                  <td className="p-6 text-sm font-bold text-green-500">8.2%</td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
                      Đã xuất bản
                    </span>
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
