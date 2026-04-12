import type { IMessage } from '@/types/chat.types';

type EditMessageDialogProps = {
  editingMessage: IMessage | null;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
};

export function EditMessageDialog({
  editingMessage,
  editDraft,
  onEditDraftChange,
  onClose,
  onSave,
  isEditing,
}: EditMessageDialogProps) {
  if (!editingMessage) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-5 shadow-xl">
        <h3 className="font-bold text-lg mb-3 text-foreground">Sửa tin nhắn</h3>
        <textarea
          value={editDraft}
          onChange={(e) => onEditDraftChange(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500/40 outline-none text-sm resize-none"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isEditing || !editDraft.trim()}
            onClick={() => void onSave()}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
