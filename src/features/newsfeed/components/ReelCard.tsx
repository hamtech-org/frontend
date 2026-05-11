import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { ReelItem } from '@/features/newsfeed/constants';

interface Props {
  reel: ReelItem;
}

export const ReelCard = ({ reel }: Props) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="relative shrink-0 w-[132px] h-[220px] rounded-xl overflow-hidden group cursor-pointer"
  >
    <img
      src={reel.thumbnail}
      alt="Reel"
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      referrerPolicy="no-referrer"
    />
    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
    <div className="absolute top-2.5 left-2.5 size-8 rounded-full border-2 border-blue-500 bg-card/40" />
    <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
      <div className="flex items-center gap-1">
        <Play className="w-3.5 h-3.5 fill-current" />
        <span className="text-xs font-bold">{reel.views}</span>
      </div>
      <p className="text-sm font-bold mt-1 leading-tight">{reel.name}</p>
    </div>
  </motion.div>
);
