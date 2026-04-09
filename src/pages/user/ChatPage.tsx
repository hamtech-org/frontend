import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MoreVertical, Phone, Video, Send, Smile, Paperclip, CheckCheck, Image, FileText, Sparkles, Reply, Pin, Trash2, Mic, BarChart2, Users, MonitorUp, Palette, UserPlus, PanelRight, PanelRightClose, CheckSquare, BellOff, PinOff, Settings, ChevronRight, ArrowLeft, ChevronDown, MoreHorizontal, X, Home, Compass, MessageSquare, MessageCircle, Contact, Cloud, FolderOpen, Frame, Briefcase, Camera, Mail, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const mockContacts = [
  ...contacts,
  ...contacts.map(c => ({ ...c, id: c.id + 10 })),
  ...contacts.map(c => ({ ...c, id: c.id + 20 })),
  ...contacts.map(c => ({ ...c, id: c.id + 30 })),
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
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const [showMarkReadModal, setShowMarkReadModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const activeContact = mockContacts.find((c) => c.id === activeChat);

  return (
    <div className="absolute inset-0 w-full h-full flex overflow-hidden bg-ethereal-bg dark:bg-midnight-bg">
      {/* Zalo Blue Navbar */}
      <div className="w-[64px] bg-[#0068ff] flex flex-col items-center py-6 shrink-0 z-20">
        <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden mb-6 border border-white/20 cursor-pointer shadow-sm hover:opacity-90 transition-opacity" onClick={() => setShowProfileModal(true)} title="Thông tin tài khoản">
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" className="w-full h-full object-cover" alt="My Profile" />
        </div>
        <div className="flex-1 w-full flex flex-col items-center gap-2">
          <button className="w-12 h-12 shrink-0 rounded-2xl bg-black/20 flex flex-col items-center justify-center text-white cursor-pointer transition-colors shadow-sm">
            <MessageCircle className="w-6 h-6 fill-white" />
          </button>
          <button className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors">
            <Contact className="w-[26px] h-[26px]" />
          </button>

          <div className="w-8 h-px shrink-0 bg-white/20 my-2" />

          <button onClick={() => navigate('/')} title="Về Bảng Tin" className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors mt-1">
            <Home className="w-6 h-6" />
          </button>
          
          <button className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors">
            <Cloud className="w-6 h-6" />
          </button>
          <button className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors">
            <FolderOpen className="w-[22px] h-[22px] stroke-[2]" />
          </button>
          <button className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors">
            <Frame className="w-[22px] h-[22px] border-dashed border-2 stroke-0 rounded border-current" />
          </button>
          <button className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors">
            <Briefcase className="w-[22px] h-[22px]" />
          </button>
        </div>
        <div className="mt-auto w-full flex justify-center pb-2">
          <button className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="w-[340px] border-r border-black/5 dark:border-white/5 flex flex-col shrink-0 min-h-0 bg-white dark:bg-[#1a1a1a]">
        <div className="pt-5 px-4 space-y-4 shrink-0 border-b border-black/5 dark:border-white/5 mb-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border-none focus:ring-1 ring-blue-600/50 transition-all outline-none text-sm font-medium"
              />
            </div>
            <button title="Thêm bạn bè" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-black dark:hover:text-white transition-colors">
              <UserPlus className="w-[18px] h-[18px]" />
            </button>
            <button title="Tạo nhóm mới" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-black dark:hover:text-white transition-colors">
              <Users className="w-[18px] h-[18px]" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button className="text-sm font-bold text-blue-600 border-b-[3px] border-blue-600 pb-2.5 transition-colors">Ưu tiên</button>
              <button className="text-sm font-bold text-muted-foreground hover:text-black dark:hover:text-white border-b-[3px] border-transparent pb-2.5 transition-colors">Khác</button>
            </div>
            <div className="flex items-center gap-3 pb-2.5">
              <button className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-black dark:hover:text-white transition-colors">
                Phân loại <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowMarkReadModal(true)}
                title="Đánh dấu đã đọc"
                className="text-muted-foreground hover:text-black dark:hover:text-white transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 min-h-0 custom-scrollbar pr-2 pb-4">
          {mockContacts.map((contact, index) => (
            <motion.button
              key={`${contact.id}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -20px 0px" }}
              transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index * 0.03, 0.3) }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setActiveChat(contact.id)}
              className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors group ${activeChat === contact.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-inherit"
                  referrerPolicy="no-referrer"
                />
                {contact.online && !contact.isGroup && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-inherit" />
                )}
                {contact.isGroup && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-inherit flex items-center justify-center">
                    <Users className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold truncate">{contact.name}</p>
                  <p className={`text-[11px] font-medium ${activeChat === contact.id ? 'text-white/70' : 'text-muted-foreground'}`}>{contact.time}</p>
                </div>
                <p className={`text-[13px] truncate mt-0.5 ${activeChat === contact.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {contact.lastMsg}
                </p>
              </div>
              {contact.unread > 0 && activeChat !== contact.id && (
                <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {contact.unread}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-20 px-8 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-inherit/80 backdrop-blur-md sticky top-0 z-10">
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
            <button type="button" onClick={() => setShowInfo(!showInfo)} title={showInfo ? "Đóng thông tin hội thoại" : "Mở thông tin hội thoại"} className={`p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground hover:text-blue-600 ${showInfo ? 'bg-blue-600/10 text-blue-600' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
              {showInfo ? <PanelRightClose className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Pinned Message (Zalo style) */}
        {activeContact?.isGroup && (
          <div className="w-full px-4 sm:px-8 py-3 bg-white dark:bg-black/20 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <Pin className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <p className="text-[10px] sm:text-xs text-blue-600 font-bold uppercase">Tin nhắn ghim</p>
                <p className="text-sm font-medium truncate">Marcus Chen: Tổng hợp tài liệu meeting chiều 14h</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md hidden md:inline-block font-bold">+1 ghim</span>
              <button className="p-1 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 min-h-0 custom-scrollbar">
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
              <div className={`max-w-[85%] relative group/msg flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                {/* Zalo shows name for non-me messages in Group */}
                {!msg.isMe && activeContact?.isGroup && (
                  <p className="text-[11px] font-bold text-muted-foreground mb-1 ml-11">{msg.sender}</p>
                )}
                <div className={`flex items-start gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!msg.isMe && (
                    <img src={mockContacts.find(c => c.name === msg.sender)?.avatar || activeContact?.avatar} className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" alt={msg.sender} />
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.isMe ? 'bg-[#c5e1ff] dark:bg-blue-600 text-black dark:text-white rounded-tr-sm' : 'bg-white dark:bg-black/40 border border-inherit rounded-tl-sm'
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

        <div className="p-4 sm:p-6 border-t border-black/5 dark:border-white/5 shrink-0 bg-ethereal-bg/80 dark:bg-midnight-bg/80 backdrop-blur-md flex flex-col gap-3">
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

      {/* Right Sidebar - Info Panel (Zalo Style) */}
      {showInfo && (
        <div className="w-[280px] lg:w-[340px] border-l border-black/5 dark:border-white/5 flex flex-col shrink-0 bg-white dark:bg-[#1a1a1a] overflow-hidden transition-all hidden md:flex">
          <div className="h-20 px-6 flex items-center justify-center border-b border-black/5 dark:border-white/5 font-bold text-lg sticky top-0 bg-inherit z-10 shrink-0">
            Thông tin {activeContact?.isGroup ? 'nhóm' : 'hội thoại'}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-black/5 dark:bg-transparent custom-scrollbar pb-12">
            <div className="p-6 flex flex-col items-center border-b border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-[#1a1a1a]">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-4 relative">
                <img src={activeContact?.avatar} alt={activeContact?.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-lg text-center leading-tight flex items-center gap-2">
                {activeContact?.name}
                <button className="p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><Palette className="w-3 h-3 text-muted-foreground" /></button>
              </h3>
              {activeContact?.isGroup && (
                <p className="text-sm text-muted-foreground mt-1 text-center font-medium opacity-80">12 thành viên</p>
              )}

              <div className="flex items-start justify-center gap-2 lg:gap-6 mt-6 w-full px-2">
                <button className="flex flex-col items-center gap-2 group w-16">
                  <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                    <BellOff className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">Tắt thông<br />báo</span>
                </button>
                {activeContact?.isGroup ? (
                  <button className="flex flex-col items-center gap-2 group w-16">
                    <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                      <PinOff className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">Bỏ ghim<br />hội thoại</span>
                  </button>
                ) : (
                  <button className="flex flex-col items-center gap-2 group w-16">
                    <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                      <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">Thêm vào<br />nhóm</span>
                  </button>
                )}
                <button className="flex flex-col items-center gap-2 group w-16">
                  <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                    <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">Thêm thành<br />viên</span>
                </button>
                <button className="flex flex-col items-center gap-2 group w-16 hidden lg:flex">
                  <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                    <Settings className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">Quản lý<br />nhóm</span>
                </button>
              </div>
            </div>
            {activeContact?.isGroup && (
              <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <div className="p-4 flex items-center justify-between font-bold text-sm">
                  Thành viên nhóm
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5 mt-2">
              <div className="p-4 flex items-center justify-between font-bold text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Bảng tin nhóm
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="px-4 pb-4 space-y-1">
                <div className="flex items-center gap-3 text-sm text-muted-foreground md:hover:text-blue-600 cursor-pointer md:hover:bg-blue-600/5 p-2 -mx-2 rounded-lg transition-colors font-medium"><CheckSquare className="w-4 h-4 opacity-70" /> Danh sách nhắc hẹn</div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground md:hover:text-blue-600 cursor-pointer md:hover:bg-blue-600/5 p-2 -mx-2 rounded-lg transition-colors font-medium"><FileText className="w-4 h-4 opacity-70" /> Ghi chú, ghim, bình chọn</div>
              </div>
            </div>

            <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5 mt-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="p-4 flex items-center justify-between font-bold text-sm">
                Ảnh/Video
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="p-4 flex items-center justify-between font-bold text-sm">
                File
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="p-4 flex items-center justify-between font-bold text-sm">
                Link
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {activeContact?.isGroup && (
              <div className="p-4 bg-white dark:bg-transparent mt-2 flex justify-center">
                <button className="flex items-center gap-2 text-sm font-bold text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors">
                  Rời nhóm
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal Zalo: Đánh Dấu Đã Đọc */}
      <AnimatePresence>
        {showMarkReadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-[400px] w-full overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
                <h3 className="font-bold text-[17px]">Xác nhận</h3>
                <button onClick={() => setShowMarkReadModal(false)} className="text-muted-foreground hover:text-black dark:hover:text-white transition-colors">
                  <X className="w-6 h-6 stroke-[1.5]" />
                </button>
              </div>
              <div className="px-6 py-5">
                <p className="text-[15px] text-muted-foreground leading-relaxed font-medium mb-5">
                  Toàn bộ tin nhắn trong khu vực này sẽ được đánh dấu đã đọc. Bạn có muốn tiếp tục?
                </p>
                <label className="flex items-center gap-2 cursor-pointer w-fit group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="w-[18px] h-[18px] rounded-[4px] border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0 cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors" />
                    <CheckCheck className="w-3 h-3 text-white absolute opacity-0 pointer-events-none group-has-[:checked]:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[15px] font-medium text-black/80 dark:text-white/80 select-none">Không hiện lần tới</span>
                </label>
              </div>
              <div className="px-6 pb-5 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowMarkReadModal(false)}
                  className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black dark:text-white"
                >
                  Không
                </button>
                <button
                  onClick={() => setShowMarkReadModal(false)}
                  className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Zalo: Thông tin cá nhân Premium */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[400px] w-full shadow-2xl border border-black/5 dark:border-white/10 relative max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Sticky Close Button */}
              <button 
                 onClick={() => setShowProfileModal(false)} 
                 className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 backdrop-blur-md transition-colors z-20 shadow-sm"
              >
                <X className="w-5 h-5 stroke-[2]"/>
              </button>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
                {/* Cover Photo */}
                <div className="relative h-32 shrink-0 group">
                   <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" className="w-full h-full object-cover" alt="Cover" />
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                   <button className="absolute bottom-4 right-4 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-10">
                     <Camera className="w-4 h-4" />
                   </button>
                </div>

                {/* Avatar & Basic Info */}
                <div className="px-6 relative pb-6">
                   <div className="flex flex-col items-center -mt-12 relative z-10">
                      <div className="relative group/avatar cursor-pointer">
                        <div className="w-24 h-24 rounded-full border-[4px] border-white dark:border-[#1a1a1a] overflow-hidden bg-white shadow-md">
                           <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop" className="w-full h-full object-cover" alt="Profile avatar" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-2xl text-black dark:text-white mt-2 text-center">
                        Marcus Chen
                      </h3>
                      <div className="text-[13px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 justify-center">
                        Đang hoạt động <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      </div>
                   </div>
                   
                   {/* Detail Cards */}
                   <div className="mt-6 space-y-2">
                      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                         <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                           <Phone className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                         </div>
                         <div className="flex-1">
                           <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">Điện thoại</span>
                           <p className="text-[14px] font-semibold text-black dark:text-white/90">+84 123 456 789</p>
                         </div>
                      </div>

                      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                         <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                           <Mail className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                         </div>
                         <div className="flex-1">
                           <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">Email công việc</span>
                           <p className="text-[14px] font-semibold text-black dark:text-white/90">marcus@hamtech.vn</p>
                         </div>
                      </div>

                      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                         <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                           <Quote className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400 fill-current opacity-80" />
                         </div>
                         <div className="flex-1">
                           <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">Tiểu sử</span>
                           <p className="text-[13px] font-medium text-black dark:text-white/80 leading-relaxed italic">
                             "Technology is best when it brings people together." 🌍 Code & Coffee routine.
                           </p>
                         </div>
                      </div>
                   </div>

                   <div className="mt-6 flex gap-3 pb-2 shrink-0">
                     <button className="flex-1 py-2.5 rounded-xl font-bold text-[14px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5">
                       Cập nhật thông tin
                     </button>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
