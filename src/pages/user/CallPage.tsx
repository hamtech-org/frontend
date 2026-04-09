import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2, 
  MessageSquare, Users, Settings, MoreHorizontal, Volume2, VolumeX, Sparkles 
} from 'lucide-react';

export default function CallPage() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1920&h=1080&fit=crop" alt="Participant" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="relative z-10 p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Elena" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">Elena Vance</h2>
            <p className="text-sm text-white/60 font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Đang gọi • {formatTime(timer)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-3 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"><Users className="w-6 h-6" /></button>
          <button className="p-3 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"><Settings className="w-6 h-6" /></button>
        </div>
      </motion.div>

      <div className="flex-1 relative z-10 flex items-center justify-center p-12">
        <AnimatePresence>
          {!isVideoOff && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative aspect-video w-full max-w-5xl rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-2xl shadow-black/50 group">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&h=800&fit=crop" alt="Elena Focused" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-8 left-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xl font-bold">Elena Vance</p>
                <p className="text-sm text-white/60">Nhà quay phim</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div drag dragConstraints={{ left: -500, right: 500, top: -300, bottom: 300 }} className="absolute bottom-12 right-12 w-64 aspect-video rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-move z-20">
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=300&fit=crop" alt="Self View" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[10px] font-bold">Bạn</div>
        </motion.div>
      </div>

      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="relative z-10 p-12 flex items-center justify-center gap-6">
        <button onClick={() => setIsMuted(!isMuted)} className={`p-6 rounded-3xl transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-white/10 backdrop-blur-md hover:bg-white/20'}`}>
          {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>
        <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-6 rounded-3xl transition-all ${isVideoOff ? 'bg-red-600 text-white' : 'bg-white/10 backdrop-blur-md hover:bg-white/20'}`}>
          {isVideoOff ? <VideoOff className="w-8 h-8" /> : <Video className="w-8 h-8" />}
        </button>
        <button onClick={() => navigate('/studio')} className="p-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-600/40 transition-all hover:scale-110 active:scale-95">
          <PhoneOff className="w-10 h-10" />
        </button>
        <button onClick={() => setIsSpeakerOn(!isSpeakerOn)} className={`p-6 rounded-3xl transition-all ${!isSpeakerOn ? 'bg-red-600 text-white' : 'bg-white/10 backdrop-blur-md hover:bg-white/20'}`}>
          {isSpeakerOn ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
        </button>
        <button className="p-6 rounded-3xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all">
          <Sparkles className="w-8 h-8 text-blue-600" />
        </button>
      </motion.div>

      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10">
        <button className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"><MessageSquare className="w-6 h-6" /></button>
        <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all">
          {isFullScreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </button>
        <button className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"><MoreHorizontal className="w-6 h-6" /></button>
      </div>
    </div>
  );
}
