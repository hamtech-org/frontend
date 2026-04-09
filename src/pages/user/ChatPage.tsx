import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, MoreVertical, Phone, Video, Send, Smile, Paperclip, CheckCheck } from 'lucide-react';

const contacts = [
  {
    id: 1,
    name: 'Elena Vance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    lastMsg: 'Hệ thống design mới trông tuyệt vời!',
    time: '10:24',
    unread: 2,
    online: true,
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
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-inherit" />
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
              <p className="text-xs text-green-500 font-bold">Đang hoạt động</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
              <Phone className="w-5 h-5" />
            </button>
            <button type="button" className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
              <Video className="w-5 h-5" />
            </button>
            <button type="button" className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
              <MoreVertical className="w-5 h-5" />
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
              <div className={`max-w-[70%] space-y-1 ${msg.isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-black/5 dark:bg-white/5 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <div className="flex items-center gap-2 px-1">
                  <p className="text-[10px] text-muted-foreground font-bold">{msg.time}</p>
                  {msg.isMe && <CheckCheck className="w-3 h-3 text-blue-600" />}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-8 border-t border-inherit shrink-0">
          <div className="max-w-4xl mx-auto relative flex items-center gap-4">
            <button type="button" className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                className="w-full pl-6 pr-12 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none text-sm font-medium"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-blue-600 transition-all"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
