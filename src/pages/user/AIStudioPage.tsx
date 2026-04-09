import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Wand2, Image as ImageIcon, Video, Type, History, 
  Download, Share2, Send, Plus, Layers, Zap, Cpu, type LucideIcon 
} from 'lucide-react';
import Markdown from 'react-markdown';

const tools: { id: string; icon: LucideIcon; label: string; description: string }[] = [
  { id: 'refine', icon: Wand2, label: 'Tinh chỉnh nội dung', description: 'Nâng cao script, caption và mô tả.' },
  { id: 'visual', icon: ImageIcon, label: 'Tạo hình ảnh', description: 'Tạo thumbnail và concept art chất lượng cao.' },
  { id: 'video', icon: Video, label: 'Hỗ trợ video', description: 'Phân tích cảnh quay và gợi ý color grading bằng AI.' },
  { id: 'voice', icon: Cpu, label: 'Tổng hợp giọng nói', description: 'Tạo voiceover tự nhiên đa ngôn ngữ.' },
];

const history = [
  { id: 1, title: 'Tinh chỉnh kịch bản điện ảnh', time: '2 giờ trước', type: 'text' },
  { id: 2, title: 'Concept Art Golden Hour', time: '5 giờ trước', type: 'image' },
  { id: 3, title: 'Voiceover cho Tutorial #12', time: 'Hôm qua', type: 'audio' },
];

export default function AIStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTool, setActiveTool] = useState('refine');

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  return (
    <div className="h-full flex overflow-hidden bg-ethereal-bg dark:bg-midnight-bg">
      <div className="w-80 border-r border-inherit flex flex-col">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Sparkles className="w-6 h-6" /></div>
            <h1 className="text-2xl font-display font-bold tracking-tight">AI Studio</h1>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Công cụ</p>
            {tools.map((tool) => {
              const ToolIcon = tool.icon;
              return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all group ${
                  activeTool === tool.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <ToolIcon className={`w-5 h-5 ${activeTool === tool.id ? 'text-white' : 'text-blue-600'}`} />
                  <p className="font-bold">{tool.label}</p>
                </div>
                <p className={`text-xs leading-relaxed ${activeTool === tool.id ? 'text-white/60' : 'text-muted-foreground'}`}>{tool.description}</p>
              </button>
              );
            })}
          </div>
          <div className="space-y-4 pt-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Lịch sử gần đây</p>
            <div className="space-y-2">
              {history.map((item) => (
                <button key={item.id} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <History className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{item.title}</p>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{item.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-20 px-8 flex items-center justify-between border-b border-inherit bg-inherit/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600"><Zap className="w-5 h-5" /></div>
            <h2 className="font-bold text-lg">{tools.find(t => t.id === activeTool)?.label}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"><Download className="w-4 h-4" />Lưu</button>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"><Share2 className="w-4 h-4" />Xuất bản</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card min-h-[400px] rounded-[2.5rem] border-none shadow-xl shadow-black/5 dark:shadow-white/5 p-12 relative overflow-hidden">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-inherit/80 backdrop-blur-sm z-20">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-display font-bold tracking-tight">Đang xử lý...</p>
                    <p className="text-muted-foreground">AI đang phân tích yêu cầu và tạo kết quả tốt nhất.</p>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {prompt ? (
                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl bg-blue-600/5 border border-blue-600/10">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Yêu cầu của bạn</p>
                        <p className="text-lg font-medium italic">"{prompt}"</p>
                      </div>
                      <div className="markdown-body">
                        <Markdown>
                          {`### Kịch bản điện ảnh: "Chân trời cuối cùng"\n\n**Cảnh 1: Rìa thế giới**\nCamera quay qua cảnh hoang vắng, mặt trời lặn dưới đường chân trời trong sắc cam và tím rực rỡ.\n\n**Đối thoại:**\n*Kael:* "Chúng ta sắp đến rồi. Chỉ còn vài dặm nữa."\n*Lyra:* "Rồi sao? Điều gì xảy ra khi chúng ta đến cuối?"\n\n**Gợi ý AI:**\n- Nên thêm cận cảnh đôi mắt của Kael để truyền tải sự quyết tâm.\n- Ánh sáng nên chuyển từ ấm sang lạnh khi mặt trời lặn.`}
                        </Markdown>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                      <div className="w-20 h-20 rounded-3xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground"><Layers className="w-10 h-10" /></div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-display font-bold tracking-tight">Sẵn sàng sáng tạo?</h3>
                        <p className="text-muted-foreground max-w-sm">Nhập yêu cầu bên dưới để bắt đầu tinh chỉnh nội dung với Zalogram AI.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-left space-y-2 group">
                <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 w-fit group-hover:scale-110 transition-transform"><Type className="w-5 h-5" /></div>
                <p className="font-bold">Viết lại cho MXH</p>
                <p className="text-xs text-muted-foreground">Tối ưu cho Instagram, Twitter hoặc LinkedIn.</p>
              </button>
              <button className="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-left space-y-2 group">
                <div className="p-2 rounded-lg bg-purple-600/10 text-purple-600 w-fit group-hover:scale-110 transition-transform"><Layers className="w-5 h-5" /></div>
                <p className="font-bold">Tạo biến thể</p>
                <p className="text-xs text-muted-foreground">Nhận 3 hướng sáng tạo khác nhau cho ý tưởng.</p>
              </button>
              <button className="p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-left space-y-2 group">
                <div className="p-2 rounded-lg bg-orange-600/10 text-orange-600 w-fit group-hover:scale-110 transition-transform"><Plus className="w-5 h-5" /></div>
                <p className="font-bold">Workflow tùy chỉnh</p>
                <p className="text-xs text-muted-foreground">Tạo pipeline nội dung AI riêng của bạn.</p>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-inherit">
          <div className="max-w-4xl mx-auto relative flex items-center gap-4">
            <div className="flex-1 relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Mô tả nội dung bạn muốn tạo hoặc tinh chỉnh..."
                rows={1}
                className="w-full pl-6 pr-12 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none text-sm font-medium resize-none overflow-hidden"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              />
              <button onClick={handleGenerate} disabled={!prompt || isGenerating} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
