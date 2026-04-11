import {
  BellOff,
  CheckSquare,
  ChevronRight,
  FileText,
  Palette,
  PinOff,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  User,
} from 'lucide-react';
import type { IConversation } from '@/types/chat.types';
import { mockMembers } from './chatMocks';

type ConversationInfoPanelProps = {
  activeConversation: IConversation | undefined;
  onOpenAISummaryFromPanel: () => void;
  onOpenMemberModal: (tab: 'list' | 'pending') => void;
};

export function ConversationInfoPanel({
  activeConversation,
  onOpenAISummaryFromPanel,
  onOpenMemberModal,
}: ConversationInfoPanelProps) {
  return (
    <div className="w-[280px] lg:w-[340px] border-l border-black/5 dark:border-white/5 flex flex-col shrink-0 bg-white dark:bg-[#1a1a1a] overflow-hidden transition-all hidden md:flex">
      <div className="h-20 px-6 flex items-center justify-center border-b border-black/5 dark:border-white/5 font-bold text-lg sticky top-0 bg-inherit z-10 shrink-0">
        Thông tin {activeConversation?.type === 'group' ? 'nhóm' : 'hội thoại'}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-black/5 dark:bg-transparent custom-scrollbar pb-12">
        <div className="p-6 flex flex-col items-center border-b border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-[#1a1a1a]">
          <div className="w-20 h-20 rounded-full overflow-hidden mb-4 relative bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            {activeConversation?.avatar ? (
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name ?? ''}
                className="w-full h-full object-cover"
              />
            ) : activeConversation?.type === 'group' ? (
              <Users className="w-8 h-8 text-blue-600" />
            ) : (
              <User className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h3 className="font-bold text-lg text-center leading-tight flex items-center gap-2">
            {activeConversation?.name ?? 'Hội thoại'}
            <button
              type="button"
              className="p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Palette className="w-3 h-3 text-muted-foreground" />
            </button>
          </h3>
          {activeConversation?.type === 'group' && (
            <p className="text-sm text-muted-foreground mt-1 text-center font-medium opacity-80">
              {activeConversation.memberCount} thành viên
            </p>
          )}

          <div className="flex items-start justify-center gap-2 lg:gap-6 mt-6 w-full px-2">
            <button type="button" className="flex flex-col items-center gap-2 group w-16">
              <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                <BellOff className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                Tắt thông
                <br />
                báo
              </span>
            </button>
            {activeConversation?.type === 'group' ? (
              <button type="button" className="flex flex-col items-center gap-2 group w-16">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <PinOff className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                  Bỏ ghim
                  <br />
                  hội thoại
                </span>
              </button>
            ) : (
              <button type="button" className="flex flex-col items-center gap-2 group w-16">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                  Thêm vào
                  <br />
                  nhóm
                </span>
              </button>
            )}
            <button type="button" className="flex flex-col items-center gap-2 group w-16">
              <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                Thêm thành
                <br />
                viên
              </span>
            </button>
            <button type="button" className="flex flex-col items-center gap-2 group w-16 hidden lg:flex">
              <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                <Settings className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                Quản lý
                <br />
                nhóm
              </span>
            </button>
          </div>
        </div>
        {activeConversation?.type === 'group' && (
          <>
            <div className="p-4 bg-gradient-to-r from-blue-600/5 to-purple-600/5 border-b border-black/5 dark:border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity">
                <Sparkles className="w-16 h-16 text-purple-600" />
              </div>
              <button
                type="button"
                onClick={onOpenAISummaryFromPanel}
                className="w-full relative flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0068ff] to-[#8c52ff] hover:from-blue-700 hover:to-purple-700 text-white font-bold text-[14px] shadow-lg shadow-purple-600/20 transition-all hover:shadow-purple-600/40 hover:-translate-y-0.5"
              >
                <Sparkles className="w-[18px] h-[18px]" />
                AI tóm tắt toàn bộ tin nhắn
              </button>
              <p className="text-[11px] text-center mt-2 text-muted-foreground font-medium">
                Báo cáo siêu tốc những nội dung bị trôi.
              </p>
            </div>

            <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenMemberModal('list')}
                onKeyDown={(e) => e.key === 'Enter' && onOpenMemberModal('list')}
                className="p-4 flex items-center justify-between font-bold text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Quản lý thành viên ({mockMembers.length})
                <div className="flex items-center gap-2">
                  <div className="w-[20px] h-[20px] rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">
                    3
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="px-4 pb-4 space-y-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenMemberModal('pending')}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenMemberModal('pending')}
                  className="flex items-center justify-between group/wait cursor-pointer p-2 -mx-2 rounded-lg hover:bg-blue-600/10 transition-colors"
                >
                  <div className="flex items-center gap-3 text-sm text-muted-foreground group-hover/wait:text-blue-600 font-medium transition-colors">
                    <UserPlus className="w-4 h-4 opacity-70" /> Duyệt người vào nhóm
                  </div>
                  <div className="w-[22px] h-[22px] rounded-full bg-red-500 shadow-md shadow-red-500/20 flex items-center justify-center text-[10px] text-white font-bold">
                    3
                  </div>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenMemberModal('list')}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenMemberModal('list')}
                  className="flex items-center gap-3 text-sm text-muted-foreground hover:text-red-500 cursor-pointer hover:bg-red-500/10 p-2 -mx-2 rounded-lg transition-colors font-medium"
                >
                  <Users className="w-4 h-4 opacity-70" /> Mời ra khỏi nhóm
                </div>
              </div>
            </div>
          </>
        )}
        <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5 mt-2">
          <div className="p-4 flex items-center justify-between font-bold text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            Bảng tin nhóm
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="px-4 pb-4 space-y-1">
            <div className="flex items-center gap-3 text-sm text-muted-foreground md:hover:text-blue-600 cursor-pointer md:hover:bg-blue-600/5 p-2 -mx-2 rounded-lg transition-colors font-medium">
              <CheckSquare className="w-4 h-4 opacity-70" /> Danh sách nhắc hẹn
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground md:hover:text-blue-600 cursor-pointer md:hover:bg-blue-600/5 p-2 -mx-2 rounded-lg transition-colors font-medium">
              <FileText className="w-4 h-4 opacity-70" /> Ghi chú, ghim, bình chọn
            </div>
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

        {activeConversation?.type === 'group' && (
          <div className="p-4 bg-white dark:bg-transparent mt-2 flex justify-center">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-bold text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors"
            >
              Rời nhóm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
