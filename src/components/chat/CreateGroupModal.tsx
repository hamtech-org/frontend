import { AnimatePresence, motion } from 'motion/react';
import { Camera, CheckSquare, Search, User, Users, X } from 'lucide-react';
import type { IConversation } from '@/types/chat.types';

type CreateGroupModalProps = {
  open: boolean;
  onClose: () => void;
  conversations: IConversation[];
  groupName: string;
  onGroupNameChange: (value: string) => void;
  selectedGroupMembers: string[];
  onToggleMember: (conversationId: string, checked: boolean) => void;
  onConfirmCreate: () => void;
};

export function CreateGroupModal({
  open,
  onClose,
  conversations,
  groupName,
  onGroupNameChange,
  selectedGroupMembers,
  onToggleMember,
  onConfirmCreate,
}: CreateGroupModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[440px] w-full shadow-2xl border border-black/5 dark:border-white/10 relative flex flex-col overflow-hidden max-h-[85vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-[#1a1a1a] z-10">
              <h3 className="font-bold text-[17px] text-black dark:text-white tracking-tight">
                Tạo nhóm trò chuyện
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-[52px] h-[52px] rounded-full border-[1.5px] border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center text-muted-foreground shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Nhập tên nhóm..."
                  value={groupName}
                  onChange={(e) => onGroupNameChange(e.target.value)}
                  className="flex-1 py-2 px-1 border-b-2 border-black/10 dark:border-white/10 bg-transparent outline-none focus:border-blue-600 dark:focus:border-blue-500 font-bold text-[15px] transition-colors text-black dark:text-white"
                />
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc số điện thoại..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-600/50 shadow-sm text-[14px] font-medium transition-all text-black dark:text-white"
                  />
                </div>

                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-black/20">
                  <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5">
                    <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                      Danh sách liên hệ
                    </span>
                  </div>
                  {conversations
                    .filter((c) => c.type === 'direct')
                    .map((conv) => (
                      <label
                        key={conv.conversationId}
                        className="flex items-center gap-3.5 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedGroupMembers.includes(conv.conversationId)}
                            onChange={(e) => onToggleMember(conv.conversationId, e.target.checked)}
                            className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors"
                          />
                          {selectedGroupMembers.includes(conv.conversationId) && (
                            <CheckSquare className="absolute w-[14px] h-[14px] text-white pointer-events-none" />
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-[14px] text-black dark:text-white flex-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {conv.name ?? 'Hội thoại'}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-[#1a1a1a] z-10 flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground flex flex-col">
                Đã chọn{' '}
                <strong className="text-blue-600 text-[15px]">{selectedGroupMembers.length} liên hệ</strong>
              </span>
              <div className="flex gap-2.5 align-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl font-bold text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                >
                  Hủy
                </button>
                <div className="relative group/btn tooltip-trigger">
                  <button
                    type="button"
                    onClick={() => void onConfirmCreate()}
                    disabled={selectedGroupMembers.length < 2}
                    className={`px-5 py-2 rounded-xl font-bold text-[14px] text-white shadow-sm transition-all flex items-center gap-2 ${
                      selectedGroupMembers.length >= 2
                        ? 'bg-[#0068ff] hover:bg-blue-700 hover:-translate-y-0.5 shadow-blue-600/20 cursor-pointer'
                        : 'bg-black/10 dark:bg-white/10 cursor-not-allowed text-black/40 dark:text-white/40'
                    }`}
                  >
                    <Users className="w-[18px] h-[18px]" />
                    Tạo nhóm
                  </button>
                  {selectedGroupMembers.length < 2 && (
                    <div className="absolute bottom-full right-0 mb-3 w-[200px] bg-black dark:bg-white text-white dark:text-black text-[12px] font-medium p-2.5 rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all pointer-events-none text-center shadow-xl">
                      Vui lòng chọn ít nhất 2 người để tạo nhóm (Cần tối thiểu 3 thành viên)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
