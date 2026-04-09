import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Users, Settings, 
  PhoneOff, MoreVertical, Layout, Maximize2, Sparkles, Send 
} from 'lucide-react';

const participants = [
  { id: 1, name: 'Bạn (Alex Rivera)', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop', isSpeaking: true },
  { id: 2, name: 'Elena Vance', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', isSpeaking: false },
  { id: 3, name: 'Marcus Chen', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop', isSpeaking: false },
  { id: 4, name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', isSpeaking: false },
];

export default function StudioPage() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(true);

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-bold animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            LIVE
          </div>
          <h1 className="font-display font-bold text-lg tracking-tight">Ra mắt sản phẩm: HamTech v2.0</h1>
          <span className="text-sm text-white/40">01:24:45</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {participants.map((p) => (
              <img key={p.id} src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full border-2 border-black" referrerPolicy="no-referrer" />
            ))}
          </div>
          <button className="p-2 rounded-full hover:bg-white/10 transition-all"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 grid grid-cols-2 gap-4 auto-rows-fr">
          {participants.map((p) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative rounded-3xl overflow-hidden group border-2 transition-all duration-500 ${
                p.isSpeaking ? 'border-blue-600 shadow-2xl shadow-blue-600/20' : 'border-transparent'
              }`}
            >
              <img 
                src={p.id === 1 ? 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&h=600&fit=crop' : `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&sig=${p.id}`}
                alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold">{p.name}</span>
                {p.isSpeaking && (
                  <div className="flex gap-0.5 h-3 items-end">
                    <div className="w-0.5 bg-blue-600 animate-[bounce_1s_infinite_0ms]" />
                    <div className="w-0.5 bg-blue-600 animate-[bounce_1s_infinite_200ms]" />
                    <div className="w-0.5 bg-blue-600 animate-[bounce_1s_infinite_400ms]" />
                  </div>
                )}
              </div>
              <button className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {showChat && (
          <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="w-96 border-l border-white/10 flex flex-col bg-black/20 backdrop-blur-xl">
            <div className="flex border-b border-white/10">
              <button className="flex-1 py-4 text-sm font-bold border-b-2 border-blue-600">Chat</button>
              <button className="flex-1 py-4 text-sm font-bold text-white/40 hover:text-white transition-all">AI Insights</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Tóm tắt AI</p>
                <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-sm leading-relaxed">
                  Alex đang thảo luận về hệ thống thiết kế mới. Sarah nhấn mạnh tầm quan trọng của accessibility.
                </div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white/60">Người dùng {i}</p>
                    <p className="text-sm">Trông tuyệt vời! Mong chờ ngày ra mắt.</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-white/10">
              <div className="relative">
                <input type="text" placeholder="Gửi tin nhắn..." className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white/5 border-none focus:ring-2 ring-blue-600/40 transition-all outline-none text-sm" />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-600 transition-all"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="h-24 px-8 flex items-center justify-between bg-black/60 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center gap-4">
          <button className="p-3 rounded-2xl hover:bg-white/10 transition-all group"><Layout className="w-6 h-6 group-hover:text-blue-600" /></button>
          <button className="p-3 rounded-2xl hover:bg-white/10 transition-all group"><Users className="w-6 h-6 group-hover:text-blue-600" /></button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
          <button className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all"><Monitor className="w-6 h-6" /></button>
          <button className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all"><Sparkles className="w-6 h-6 text-blue-600" /></button>
          <button onClick={() => navigate('/call')} className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xl shadow-blue-600/20 group flex items-center gap-2">
            <PhoneOff className="w-6 h-6 rotate-[135deg]" />
            <span className="hidden lg:inline font-bold">Tham gia</span>
          </button>
          <button className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-xl shadow-red-600/20"><PhoneOff className="w-6 h-6" /></button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowChat(!showChat)} className={`p-3 rounded-2xl transition-all ${showChat ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-2xl hover:bg-white/10 transition-all"><Maximize2 className="w-6 h-6" /></button>
        </div>
      </div>
    </div>
  );
}
