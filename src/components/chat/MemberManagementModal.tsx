import { AnimatePresence, motion } from 'motion/react';
import { Trash2, UserPlus, Users, X } from 'lucide-react';
import { mockMembers, mockPendingMembers } from './chatMocks';

type MemberTab = 'list' | 'pending';

type MemberManagementModalProps = {
  open: boolean;
  onClose: () => void;
  memberTab: MemberTab;
  onMemberTabChange: (tab: MemberTab) => void;
};

export function MemberManagementModal({
  open,
  onClose,
  memberTab,
  onMemberTabChange,
}: MemberManagementModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[460px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-[17px] text-black dark:text-white">Quản lý thành viên</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex px-5 pt-4 gap-1 shrink-0">
              {(['list', 'pending'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onMemberTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${memberTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'}`}
                >
                  {tab === 'list' ? (
                    <>
                      <Users className="w-3.5 h-3.5" /> Thành viên ({mockMembers.length})
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Chờ duyệt{' '}
                      <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                        {mockPendingMembers.length}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-2">
              {memberTab === 'list'
                ? mockMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      <img
                        src={member.avatar}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        alt=""
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-[14px] text-black dark:text-white truncate">{member.name}</p>
                        <p className="text-[12px] text-muted-foreground font-medium">{member.role}</p>
                      </div>
                      {member.role !== 'Trưởng nhóm' && (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[12px] font-bold transition-all flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3 h-3" /> Kick
                        </button>
                      )}
                      {member.role === 'Trưởng nhóm' && (
                        <span className="px-2 py-1 rounded-lg bg-blue-600/10 text-blue-600 text-[11px] font-bold shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                  ))
                : mockPendingMembers.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5"
                    >
                      <img
                        src={person.avatar}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        alt=""
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-[14px] text-black dark:text-white truncate">{person.name}</p>
                        <p className="text-[12px] text-muted-foreground font-medium">Yêu cầu {person.time}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[12px] font-bold transition-all"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[12px] font-bold transition-all shadow-sm"
                        >
                          Duyệt
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
