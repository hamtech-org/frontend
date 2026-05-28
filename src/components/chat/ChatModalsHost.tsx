import { AddFriendModal } from '@/components/chat/AddFriendModal';
import { ConfirmModal } from '@/components/chat/ConfirmModal';
import { MarkReadModal } from '@/components/chat/MarkReadModal';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { PollModal } from '@/components/chat/PollModal';
import { AISummaryModal } from '@/components/chat/AISummaryModal';
import { TaskModal } from '@/components/chat/TaskModal';
import { AddMembersModal } from '@/components/chat/AddMembersModal';
import { EditGroupModal } from '@/components/chat/EditGroupModal';
import { EditMessageDialog } from '@/components/chat/EditMessageDialog';
import { PollVoteModal } from '@/components/chat/PollVoteModal';
import { PinLimitModal } from '@/components/chat/PinLimitModal';
import { ConversationPinLimitModal } from '@/components/chat/ConversationPinLimitModal';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { MessageConfirmState } from '@/types/chat.group.types';
import { toTaskModalMembers } from '@/pages/user/chat-page/adapters/groupAdapters';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';
interface ChatModalsHostProps {
  state: {
    showPollVoteModal: boolean;
    activePollId: string | null;
    showMarkReadModal: boolean;
    showAddFriendModal: boolean;
    addFriendQuery: string;
    showCreateGroupModal: boolean;
    groupName: string;
    selectedGroupMembers: string[];
    showPollModal: boolean;
    pollQuestion: string;
    pollOptions: string[];
    pollMultipleChoice: boolean;
    showAISummaryModal: boolean;
    aiSummaryLoading: boolean;
    aiSummaryResult: string;
    showTaskModal: boolean;
    taskAssignToAll: boolean;
    taskTitle: string;
    taskDeadline: string;
    taskNote: string;
    taskAssignees: string[];
    showAddMembersModal: boolean;
    selectedAddMembers: string[];
    showEditGroupModal: boolean;
    editGroupName: string;
    editGroupAvatarPreview: string | null;
    editingMessage: IMessage | null;
    editDraft: string;
    messageConfirm: MessageConfirmState;
    messageConfirmSubmitting: boolean;
    taskDeleteConfirm: { taskId: string; title: string } | null;
    taskSubtaskRows: Array<{ assigneeId: string; content: string }>;
    editingTaskId: string | null;
  };
  actions: {
    setShowPollVoteModal: (value: boolean) => void;
    setShowMarkReadModal: (value: boolean) => void;
    setAddFriendQuery: (value: string) => void;
    setShowAddFriendModal: (value: boolean) => void;
    setMessageConfirm: (value: MessageConfirmState) => void;
    setShowCreateGroupModal: (value: boolean) => void;
    setGroupName: (value: string) => void;
    setPollQuestion: (value: string) => void;
    setPollOptions: (value: string[]) => void;
    setPollMultipleChoice: (value: boolean) => void;
    setShowPollModal: (value: boolean) => void;
    setShowAISummaryModal: (value: boolean) => void;
    setShowTaskModal: (value: boolean) => void;
    setTaskAssignToAll: (value: boolean) => void;
    setTaskAssignees: (value: string[]) => void;
    setTaskTitle: (value: string) => void;
    setTaskDeadline: (value: string) => void;
    setTaskNote: (value: string) => void;
    setShowAddMembersModal: (value: boolean) => void;
    setShowEditGroupModal: (value: boolean) => void;
    setEditGroupAvatarFile: (file: File | null) => void;
    setEditGroupName: (value: string) => void;
    setEditingMessage: (value: IMessage | null) => void;
    setEditDraft: (value: string) => void;
    setMessageConfirmSubmitting: (value: boolean) => void;
    setTaskDeleteConfirm: (value: { taskId: string; title: string } | null) => void;
    setTaskSubtaskRows: (rows: Array<{ assigneeId: string; content: string }>) => void;
    closeTaskModal: () => void;
  };
  isEditing: boolean;
  /** Pin limit modal props (message-level) */
  pinLimit?: {
    pinLimitModalMsg: IMessage | null;
    setPinLimitModalMsg: (msg: IMessage | null) => void;
    pinnedMessagesOrdered: IMessage[];
    pinReplaceIndex: number | null;
    setPinReplaceIndex: (index: number | null) => void;
    pinLimitSubmitting: boolean;
    onConfirmPinReplace: () => Promise<void>;
  };
  /** Conversation pin limit modal props */
  convPinLimit?: {
    convPinLimitPendingId: string | null;
    setConvPinLimitPendingId: (id: string | null) => void;
    convPinLimitConfirmBusy: boolean;
    convPinLimitUnpinningId: string | null;
    conversationsPinnedToTop: IConversation[];
    conversations: IConversation[];
    onUnpinConversation: (id: string) => Promise<void>;
    onConfirmPinPending: () => Promise<void>;
  };
}

export function ChatModalsHost({
  state,
  actions,
  isEditing,
  pinLimit,
  convPinLimit,
}: ChatModalsHostProps) {
  const { core, group, messages, groupActions, directActions, messageActions } =
    useChatPageContext();

  const pollMsgById = (pollId: string): IMessage | null => {
    for (const m of messages ?? []) {
      try {
        const raw = String((m as any)?.content ?? '').trim();
        if (!raw.startsWith('{')) continue;
        const obj = JSON.parse(raw) as { kind?: string; poll?: { pollId?: string } };
        if (obj?.kind === 'poll_created' && String(obj?.poll?.pollId ?? '') === String(pollId)) {
          return m as IMessage;
        }
      } catch {
        // ignore
      }
    }
    return null;
  };

  const isPollPinned = (pollId: string) => Boolean(pollMsgById(pollId)?.isPinned);

  const {
    showPollVoteModal,
    activePollId,
    showMarkReadModal,
    showAddFriendModal,
    addFriendQuery,
    showCreateGroupModal,
    groupName,
    selectedGroupMembers,
    showPollModal,
    pollQuestion,
    pollOptions,
    pollMultipleChoice,
    showAISummaryModal,
    aiSummaryLoading,
    aiSummaryResult,
    showTaskModal,
    taskAssignToAll,
    taskTitle,
    taskDeadline,
    taskNote,
    taskAssignees,
    showAddMembersModal,
    selectedAddMembers,
    showEditGroupModal,
    editGroupName,
    editGroupAvatarPreview,
    editingMessage,
    editDraft,
    messageConfirm,
    messageConfirmSubmitting,
    taskDeleteConfirm,
    taskSubtaskRows,
    editingTaskId,
  } = state;
  const editGroupAvatarPreviewSrc =
    core.activeConversation?.type === 'group'
      ? (resolveGroupAvatarDisplayUrl(editGroupAvatarPreview, {
          conversationId: core.activeConversation.conversationId,
          avatarVersion: String(core.activeConversation.memberCount ?? ''),
        }) ?? null)
      : editGroupAvatarPreview;

  return (
    <>
      <PollVoteModal
        open={showPollVoteModal}
        onClose={() => actions.setShowPollVoteModal(false)}
        poll={
          activePollId
            ? (() => {
                const base = group.polls.find((p) => p.pollId === activePollId) ?? null;
                if (!base) return null;
                return { ...base, isPinned: isPollPinned(activePollId) };
              })()
            : null
        }
        currentUserId={core.currentUserId}
        onToggleVote={(pollId, optionIndex) =>
          void groupActions.handleVotePoll(pollId, optionIndex)
        }
        onClosePoll={(pollId) => void groupActions.handleClosePoll(pollId)}
        onTogglePinPoll={(pollId) => {
          const m = pollMsgById(pollId);
          if (!m) return;
          void messageActions.handleTogglePinMsg(m);
        }}
      />
      <MarkReadModal open={showMarkReadModal} onClose={() => actions.setShowMarkReadModal(false)} />
      <AddFriendModal
        open={showAddFriendModal}
        query={addFriendQuery}
        onQueryChange={actions.setAddFriendQuery}
        onClose={() => {
          actions.setShowAddFriendModal(false);
          actions.setAddFriendQuery('');
        }}
      />
      <ConfirmModal
        open={messageConfirm !== null}
        title={
          messageConfirm?.kind === 'delete'
            ? 'Xóa tin nhắn'
            : messageConfirm?.kind === 'recall'
              ? 'Thu hồi tin nhắn'
              : ''
        }
        description={
          messageConfirm?.kind === 'delete'
            ? 'Chỉ xóa trên thiết bị của bạn; người khác trong cuộc trò chuyện vẫn thấy tin nhắn.'
            : messageConfirm?.kind === 'recall'
              ? 'Thu hồi cho mọi người — không ai còn xem được nội dung tin này.'
              : undefined
        }
        confirmLabel={messageConfirm?.kind === 'delete' ? 'Xóa' : 'Thu hồi'}
        variant={messageConfirm?.kind === 'delete' ? 'danger' : 'primary'}
        isConfirming={messageConfirmSubmitting}
        onClose={() => {
          if (!messageConfirmSubmitting) actions.setMessageConfirm(null);
        }}
        onConfirm={() => void messageActions.handleMessageConfirm()}
      />
      <CreateGroupModal
        open={showCreateGroupModal}
        onClose={() => actions.setShowCreateGroupModal(false)}
        groupName={groupName}
        onGroupNameChange={actions.setGroupName}
        selectedGroupMembers={selectedGroupMembers}
        onToggleMember={directActions.handleToggleGroupMember}
        onConfirmCreate={directActions.handleConfirmCreateGroup}
      />
      <PollModal
        open={showPollModal}
        onClose={() => actions.setShowPollModal(false)}
        pollQuestion={pollQuestion}
        onPollQuestionChange={actions.setPollQuestion}
        pollOptions={pollOptions}
        onPollOptionsChange={actions.setPollOptions}
        multipleChoice={pollMultipleChoice}
        onMultipleChoiceChange={actions.setPollMultipleChoice}
        onCreatePoll={groupActions.handleCreatePoll}
      />
      <AISummaryModal
        open={showAISummaryModal}
        onClose={() => actions.setShowAISummaryModal(false)}
        conversationName={core.activeConversation?.name ?? undefined}
        aiSummaryLoading={aiSummaryLoading}
        aiSummaryResult={aiSummaryResult}
        onRerunSummary={groupActions.handleRerunAISummary}
      />
      <TaskModal
        open={showTaskModal}
        onClose={actions.closeTaskModal}
        currentUserId={core.currentUserId}
        assignToAll={taskAssignToAll}
        onAssignToAllChange={(value) => {
          actions.setTaskAssignToAll(value);
          if (value) actions.setTaskAssignees([]);
        }}
        members={toTaskModalMembers(group.members)}
        taskTitle={taskTitle}
        onTaskTitleChange={actions.setTaskTitle}
        taskDeadline={taskDeadline}
        onTaskDeadlineChange={actions.setTaskDeadline}
        taskNote={taskNote}
        onTaskNoteChange={actions.setTaskNote}
        taskAssignees={taskAssignees}
        onTaskAssigneesChange={actions.setTaskAssignees}
        subtaskRows={taskSubtaskRows}
        onSubtaskRowsChange={actions.setTaskSubtaskRows}
        onSubmitTask={() => void groupActions.handleSubmitTask()}
        isEditing={Boolean(editingTaskId)}
        onDeleteTask={
          editingTaskId
            ? () => {
                void groupActions.handleDeleteGroupTask(editingTaskId);
              }
            : undefined
        }
        submitBusy={group.actionLoading.createTask || group.actionLoading.updateTask}
      />
      <ConfirmModal
        open={taskDeleteConfirm !== null}
        title="Hủy công việc?"
        description={
          taskDeleteConfirm ? (
            <div className="flex flex-col gap-3">
              <div>
                Bạn sắp hủy công việc:{' '}
                <span className="font-bold text-foreground bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[15px] inline-block mt-1">
                  {taskDeleteConfirm.title}
                </span>
              </div>
              <div className="text-[13.5px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20 leading-relaxed mt-1">
                <span className="font-bold block mb-1">Lưu ý:</span>
                Thẻ giao việc sẽ được thu hồi cho toàn bộ nhóm và không còn hiển thị. Mọi người vẫn
                thấy dòng nhật ký hủy việc trong khung chat.
              </div>
            </div>
          ) : undefined
        }
        confirmLabel="Hủy công việc"
        variant="danger"
        isConfirming={group.actionLoading.updateTask}
        onClose={() => {
          if (!group.actionLoading.updateTask) actions.setTaskDeleteConfirm(null);
        }}
        onConfirm={() => void groupActions.handleConfirmDeleteTask()}
      />
      <AddMembersModal
        open={showAddMembersModal}
        onClose={() => actions.setShowAddMembersModal(false)}
        selectedIds={selectedAddMembers}
        existingMemberIds={group.members.map((member) => member.userId)}
        onToggleSelect={groupActions.handleToggleAddMember}
        onConfirm={() => void groupActions.handleAddMembers(state.selectedAddMembers)}
        isSubmitting={group.actionLoading.addMembers}
      />
      <EditGroupModal
        open={showEditGroupModal}
        groupName={editGroupName}
        avatarPreview={editGroupAvatarPreviewSrc}
        isSaving={group.actionLoading.updateGroup}
        onClose={() => {
          actions.setShowEditGroupModal(false);
          actions.setEditGroupAvatarFile(null);
        }}
        onGroupNameChange={actions.setEditGroupName}
        onAvatarFileChange={groupActions.handleEditGroupAvatarFileChange}
        onSubmit={() => void groupActions.handleUpdateGroup()}
      />
      <EditMessageDialog
        editingMessage={editingMessage}
        editDraft={editDraft}
        onEditDraftChange={actions.setEditDraft}
        onClose={() => actions.setEditingMessage(null)}
        onSave={messageActions.handleSaveEdit}
        isEditing={isEditing}
      />

      {/* Pin Limit Modal (message-level) */}
      {pinLimit && (
        <PinLimitModal
          open={pinLimit.pinLimitModalMsg !== null}
          currentPinned={pinLimit.pinnedMessagesOrdered}
          pendingPin={pinLimit.pinLimitModalMsg}
          replaceIndex={pinLimit.pinReplaceIndex}
          onReplaceIndexChange={pinLimit.setPinReplaceIndex}
          isSubmitting={pinLimit.pinLimitSubmitting}
          onClose={() => {
            if (!pinLimit.pinLimitSubmitting) pinLimit.setPinLimitModalMsg(null);
          }}
          onConfirm={pinLimit.onConfirmPinReplace}
        />
      )}

      {/* Conversation Pin Limit Modal */}
      {convPinLimit && (
        <ConversationPinLimitModal
          open={convPinLimit.convPinLimitPendingId !== null}
          pendingConversationId={convPinLimit.convPinLimitPendingId}
          pendingName={
            convPinLimit.conversations.find(
              (x) => x.conversationId === convPinLimit.convPinLimitPendingId,
            )?.name ?? 'Hội thoại'
          }
          pinnedConversations={convPinLimit.conversationsPinnedToTop}
          isConfirming={convPinLimit.convPinLimitConfirmBusy}
          unpinningConversationId={convPinLimit.convPinLimitUnpinningId}
          onClose={() => {
            if (!convPinLimit.convPinLimitConfirmBusy && !convPinLimit.convPinLimitUnpinningId)
              convPinLimit.setConvPinLimitPendingId(null);
          }}
          onUnpinConversation={(id) => void convPinLimit.onUnpinConversation(id)}
          onConfirmPinPending={() => void convPinLimit.onConfirmPinPending()}
        />
      )}
    </>
  );
}
