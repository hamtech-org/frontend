import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Download, Image as ImageIcon, Pin, Reply, RotateCcw, Share2, Trash2 } from 'lucide-react';

type ImageMessageContextMenuProps = {
  open: boolean;
  anchorX: number;
  anchorY: number;
  /** Ảnh: có mục copy; video: không copy pixel (trình duyệt hạn chế). */
  mediaKind: 'image' | 'video' | 'file';
  onClose: () => void;
  isMe: boolean;
  /** Giống Zalo: nhãn Ghim / Bỏ ghim. */
  isPinned?: boolean;
  onReply: () => void;
  onShare: () => void;
  onCopyImage: () => void;
  onSaveToDevice: () => void;
  onTogglePin: () => void;
  onRecall: () => void;
  onDeleteForMe: () => void;
};

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full px-3 py-2.5 text-left text-[13px] font-medium flex items-center gap-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors ${
        danger ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10' : 'text-foreground'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${danger ? '' : 'opacity-80'}`} />
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-black/8 dark:bg-white/10 my-1 mx-1" role="separator" />;
}

export function ImageMessageContextMenu({
  open,
  anchorX,
  anchorY,
  mediaKind,
  onClose,
  isMe,
  isPinned = false,
  onReply,
  onShare,
  onCopyImage,
  onSaveToDevice,
  onTogglePin,
  onRecall,
  onDeleteForMe,
}: ImageMessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pad = 8;
  const estW = 268;
  const estH = mediaKind === 'video' ? 280 : mediaKind === 'file' ? 300 : 320;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.min(Math.max(pad, anchorX), vw - estW - pad);
  const top = Math.min(Math.max(pad, anchorY), vh - estH - pad);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer, true);
    document.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer, true);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[280]"
        aria-hidden
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        ref={ref}
        role="menu"
        className="fixed z-[290] min-w-[248px] max-w-[92vw] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 py-1 shadow-2xl shadow-black/20"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <MenuRow
          icon={Reply}
          label="Trả lời"
          onClick={() => {
            onReply();
            onClose();
          }}
        />
        <MenuRow
          icon={Share2}
          label="Chia sẻ"
          onClick={() => {
            onShare();
            onClose();
          }}
        />
        <Divider />
        {mediaKind === 'image' && (
          <MenuRow
            icon={ImageIcon}
            label="Copy hình ảnh"
            onClick={() => {
              onCopyImage();
              onClose();
            }}
          />
        )}
        <MenuRow
          icon={Download}
          label="Lưu về máy"
          onClick={() => {
            onSaveToDevice();
            onClose();
          }}
        />
        <Divider />
        <MenuRow
          icon={Pin}
          label={isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
          onClick={() => {
            onTogglePin();
            onClose();
          }}
        />
        <Divider />
        {isMe && (
          <MenuRow
            icon={RotateCcw}
            label="Thu hồi"
            danger
            onClick={() => {
              onRecall();
              onClose();
            }}
          />
        )}
        <MenuRow
          icon={Trash2}
          label="Xóa chỉ ở phía tôi"
          danger
          onClick={() => {
            onDeleteForMe();
            onClose();
          }}
        />
      </div>
    </>,
    document.body,
  );
}
