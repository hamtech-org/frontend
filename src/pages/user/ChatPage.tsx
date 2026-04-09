import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, MoreVertical, Phone, Video, Send, Smile, Paperclip, CheckCheck, Image, FileText, Sparkles, Reply, Pin, Trash2, Mic, BarChart2, Users, MonitorUp, Palette, UserPlus, Info, CheckSquare } from 'lucide-react';

const contacts = [
  {
    id: 1,
    name: 'Elena Vance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    lastMsg: 'Hệ thống design mới trông tuyệt vời!',
    time: '10:24',
    unread: 2,
    online: true,
    isGroup: false,
  },
  {
    id: 5,
    name: 'Dự án HamTech UI',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop',
    lastMsg: 'Marcus: Chiều nay họp chốt thiết kế nhé.',
    time: '10:15',
    unread: 5,
    online: false,
    isGroup: true,
  },
  {
    id: 2,
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
    lastMsg: 'Bạn xem reel mới nhất chưa?',
    time: '9:15',
    unread: 0,
    online: false,
  },
  {
    id: 3,
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    lastMsg: 'Họp lúc 2 giờ chiều nay.',
    time: 'Hôm qua',
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: 'Julian Thorne',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    lastMsg: 'Tutorial đã lên rồi nhé!',
    time: 'Hôm qua',
    unread: 0,
    online: false,
  },
];

const messages = [
  { id: 1, sender: 'Elena Vance', text: 'Hey! Bạn đã xem tính năng AI Studio mới chưa?', time: '10:20', isMe: false },
  { id: 2, sender: 'Me', text: 'Chưa, mình sắp thử rồi. Có hay không?', time: '10:22', isMe: true },
  {
    id: 3,
    sender: 'Elena Vance',
    text: 'Tuyệt vời luôn. Tính năng tạo nội dung tự động thay đổi hoàn toàn workflow của mình.',
    time: '10:23',
    isMe: false,
  },
  { id: 4, sender: 'Elena Vance', text: 'Hệ thống design mới trông tuyệt vời!', time: '10:24', isMe: false },
];

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState(1);
  const activeContact = contacts.find((c) => c.id === activeChat);

  return (
    <div className="h-full flex overflow-hidden bg-ethereal-bg dark:bg-midnight-bg">
      <div className="w-96 border-r border-inherit flex flex-col shrink-0">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-display font-bold tracking-tight">Tin nhắn</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm tin nhắn..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 min-h-0">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => setActiveChat(contact.id)}
              className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${
                activeChat === contact.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-inherit"
                  referrerPolicy="no-referrer"
                />
                {contact.online && !contact.isGroup && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-inherit" />
                )}
                {contact.isGroup && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full border-2 border-inherit flex items-center justify-center">
                    <Users className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="font-bold truncate">{contact.name}</p>
                  <p className={`text-xs ${activeChat === contact.id ? 'text-white/60' : 'text-muted-foreground'}`}>{contact.time}</p>
                </div>
                <p className={`text-sm truncate ${activeChat === contact.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {contact.lastMsg}
                </p>
              </div>
              {contact.unread > 0 && activeChat !== contact.id && (
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {contact.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-20 px-8 flex items-center justify-between border-b border-inherit bg-inherit/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600/20">
              <img
                src={activeContact?.avatar}
                alt={activeContact?.name ?? 'Chat'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="font-bold leading-tight">{activeContact?.name}</h2>
              <p className="text-xs text-muted-foreground font-medium">
                {activeContact?.isGroup ? '12 thành viên' : activeContact?.online ? <span className="text-green-500 font-bold">Đang hoạt động</span> : 'Hoạt động 2 giờ trước'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {activeContact?.isGroup ? (
              <>
                <button type="button" title="Thêm thành viên" className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </button>
                <button type="button" title="Tìm kiếm tin nhắn" className="hidden sm:block p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600">
                  <Search className="w-5 h-5" />
                </button>
                <button type="button" title="Cuộc gọi Video Nhóm" className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600">
                  <Video className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button type="button" title="Tạo nhóm trò chuyện mới" className="hidden sm:block p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </button>
                <button type="button" title="Gọi thoại" className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600">
                  <Phone className="w-5 h-5" />
                </button>
                <button type="button" title="Gọi video" className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600">
                  <Video className="w-5 h-5" />
                </button>
              </>
            )}
            <div className="hidden sm:block w-px h-6 bg-inherit mx-1" />
            <button type="button" title="Thông tin hội thoại" className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0">
          <div className="flex justify-center">
            <span className="px-4 py-1 rounded-full bg-black/5 dark:bg-white/5 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Hôm nay
            </span>
          </div>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] relative group/msg flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-black/5 dark:bg-white/5 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  
                  {/* Floating Action Menu on Hover */}
                  <div className={`hidden sm:flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-full p-1 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                    <button title="Trả lời" className="p-1.5 rounded-full hover:bg-white dark:hover:bg-black transition-colors"><Reply className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" /></button>
                    <button title="Ghim / Lưu lịch sử" className="p-1.5 rounded-full hover:bg-white dark:hover:bg-black transition-colors"><Pin className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" /></button>
                    <button title="Thu hồi / Xoá" className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1 mt-1">
                  <p className="text-[10px] text-muted-foreground font-bold">{msg.time}</p>
                  {msg.isMe && <CheckCheck className="w-3 h-3 text-blue-600" />}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 sm:p-6 border-t border-inherit shrink-0 bg-ethereal-bg/80 dark:bg-midnight-bg/80 backdrop-blur-md flex flex-col gap-3">
          {/* Zalo-style Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <button type="button" title="Gửi nhãn dán / Emoji" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0">
                <Smile className="w-5 h-5" />
              </button>
              <button type="button" title="Gửi ảnh/video" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0">
                <Image className="w-5 h-5" />
              </button>
              <button type="button" title="Đính kèm tài liệu" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1" />

              {/* Group specific tools in Toolbar */}
              {activeContact?.isGroup && (
                <>
                  <button type="button" title="Tạo bình chọn (Poll)" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0">
                    <BarChart2 className="w-5 h-5" />
                  </button>
                  <button type="button" title="Giao việc / Nhắc hẹn" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0 hidden sm:block">
                    <CheckSquare className="w-5 h-5" />
                  </button>
                  <button type="button" title="AI Tóm tắt nhóm" className="p-2 rounded-lg hover:bg-blue-600/10 transition-all text-blue-600 hover:text-blue-700 shrink-0 hidden sm:flex items-center gap-2 font-bold text-xs bg-blue-600/5 ml-2 border border-blue-600/20">
                    <Sparkles className="w-4 h-4" />
                    Tóm tắt cuộc gọi / tin nhắn
                  </button>
                </>
              )}

              {/* 1-1 specific tools */}
              {!activeContact?.isGroup && (
                <>
                  <button type="button" title="Bảng trắng tương tác" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0 hidden sm:block">
                    <Palette className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AI Suggestion Chip (Above input) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Dạ, em hiểu rồi ạ.
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Cho mình xin link nhé!
            </button>
          </div>

          {/* Chat Input */}
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative flex flex-col bg-black/5 dark:bg-white/5 rounded-2xl border border-transparent focus-within:border-blue-600/30 focus-within:bg-white dark:focus-within:bg-black/40 transition-all">
              <textarea
                placeholder={`Nhập tin nhắn tới ${activeContact?.name}...`}
                rows={1}
                className="w-full bg-transparent px-4 py-3 outline-none text-sm font-medium resize-none max-h-32 min-h-[44px]"
              />
            </div>
            
            <div className="flex items-center gap-2 pb-1 shrink-0">
               <button
                type="button" title="Ghi âm giọng nói"
                className="p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-muted-foreground hover:text-blue-600"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all group"
              >
                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
