import { useEffect, useMemo, useRef, useState } from 'react';
import { BellOff, MessageSquarePlus, Pin, PinOff } from 'lucide-react';
import { toast } from 'react-toastify';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ConversationState = {
  id: number;
  name: string;
  lastMessage: string;
  unread: number;
  pinned: boolean;
  muted: boolean;
  /** epoch ms; null = until user unmutes */
  muteUntil: number | null;
};

function autoUnmute(list: ConversationState[], nowMs: number): ConversationState[] {
  let changed = false;
  const next = list.map((c) => {
    if (!c.muted) return c;
    if (c.muteUntil === null) return c;
    if (nowMs <= c.muteUntil) return c;
    changed = true;
    return { ...c, muted: false, muteUntil: null };
  });
  return changed ? next : list;
}

function sortPinnedChats(list: ConversationState[]): ConversationState[] {
  // Only pinned & not muted
  return list.filter((c) => c.pinned && !c.muted);
}

function sortNormalChats(list: ConversationState[]): ConversationState[] {
  // Not pinned & not muted
  return list.filter((c) => !c.pinned && !c.muted);
}

function sortMutedChats(list: ConversationState[]): ConversationState[] {
  // Muted always wins (even if pinned)
  return list.filter((c) => c.muted);
}

function getMutedLabel(c: ConversationState, nowMs: number): string | null {
  if (!c.muted) return null;
  if (c.muteUntil === null) return 'Muted';
  const remainingMs = c.muteUntil - nowMs;
  if (remainingMs <= 0) return 'Muted';
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  if (remainingMinutes < 60) return `Muted • ${remainingMinutes}m`;
  const t = new Date(c.muteUntil).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `Muted until ${t}`;
}

function ChatRow({
  c,
  nowMs,
  onTogglePin,
  onToggleMute,
}: {
  c: ConversationState;
  nowMs: number;
  onTogglePin: () => void;
  onToggleMute: () => void;
}) {
  const mutedLabel = getMutedLabel(c, nowMs);

  return (
    <div
      className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${
        c.muted ? 'bg-muted/40 opacity-60' : 'hover:bg-muted/50'
      }`}
    >
      {/* Avatar */}
      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="font-bold text-primary">
          {c.name.trim().charAt(0).toUpperCase() || 'C'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[15px] font-bold truncate">{c.name}</p>
          {c.muted && (
            <Badge
              variant="secondary"
              className="h-5 bg-gray-200 text-gray-700 border border-gray-300"
            >
              Muted
            </Badge>
          )}
          {c.pinned && !c.muted && (
            <Badge
              variant="secondary"
              className="h-5 bg-yellow-100 text-yellow-800 border border-yellow-200"
            >
              Pinned
            </Badge>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground truncate">{c.lastMessage}</p>
        {mutedLabel && <p className="text-[11px] mt-0.5 text-muted-foreground">{mutedLabel}</p>}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {c.unread > 0 && (
          <div className="min-h-[18px] min-w-[18px] px-1 rounded-full bg-zinc-500/85 flex items-center justify-center text-[10px] font-bold text-white leading-none tabular-nums">
            {c.unread > 99 ? '99+' : String(c.unread)}
          </div>
        )}

        {/* Pin */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onTogglePin}
              className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label={c.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
            >
              {c.pinned ? (
                <PinOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Pin className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>{c.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}</TooltipContent>
        </Tooltip>

        {/* Mute */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleMute}
              className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label={c.muted ? 'Bật thông báo' : 'Tắt thông báo (1h)'}
            >
              <BellOff
                className={`w-4 h-4 ${c.muted ? 'text-red-500' : 'text-muted-foreground/70'}`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            {c.muted ? 'Đang tắt thông báo. Nhấn để bật.' : 'Tắt thông báo 1 giờ (demo)'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function PinnedMutedChatListDemo() {
  const [conversations, setConversations] = useState<ConversationState[]>(() => [
    {
      id: 1,
      name: 'Chat A',
      lastMessage: 'Hello',
      unread: 0,
      pinned: true,
      muted: false,
      muteUntil: null,
    },
    {
      id: 2,
      name: 'Chat B',
      lastMessage: 'Ok',
      unread: 1,
      pinned: true,
      muted: false,
      muteUntil: null,
    },
    {
      id: 3,
      name: 'Chat C',
      lastMessage: 'Ping',
      unread: 0,
      pinned: false,
      muted: false,
      muteUntil: null,
    },
    {
      id: 4,
      name: 'Chat D',
      lastMessage: 'Gửi file',
      unread: 2,
      pinned: false,
      muted: false,
      muteUntil: null,
    },
    {
      id: 5,
      name: 'Chat E',
      lastMessage: 'Muted demo',
      unread: 3,
      pinned: true,
      muted: true,
      muteUntil: Date.now() + 40 * 60_000,
    },
    {
      id: 6,
      name: 'Chat F',
      lastMessage: 'Muted forever',
      unread: 0,
      pinned: false,
      muted: true,
      muteUntil: null,
    },
  ]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const timeoutsRef = useRef<Map<number, number>>(new Map());

  // countdown tick
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // fallback (mount)
  useEffect(() => {
    setConversations((prev) => autoUnmute(prev, Date.now()));
  }, []);

  // realtime auto-unmute scheduling (per conversation)
  useEffect(() => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current.clear();

    const now = Date.now();
    for (const c of conversations) {
      if (!c.muted) continue;
      if (c.muteUntil === null) continue;
      const delay = c.muteUntil - now;
      if (delay <= 0) continue;
      const t = window.setTimeout(
        () => setConversations((prev) => autoUnmute(prev, Date.now())),
        delay,
      );
      timeoutsRef.current.set(c.id, t);
    }

    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, [conversations]);

  // ===== Required actions =====
  function togglePin(id: number) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }

  function toggleMute(id: number) {
    const now = Date.now();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.muted) return { ...c, muted: false, muteUntil: null };
        // demo: mute 1h
        return { ...c, muted: true, muteUntil: now + 60 * 60 * 1000 };
      }),
    );
  }

  function receiveMessage(id: number, message: string) {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, lastMessage: message, unread: c.unread + 1 } : c,
      );
      const target = next.find((c) => c.id === id);
      if (target && !target.muted) toast.info(`${target.name}: ${message}`);
      return next;
    });
  }
  // ============================

  const pinned = useMemo(() => sortPinnedChats(conversations), [conversations]);
  const normal = useMemo(() => sortNormalChats(conversations), [conversations]);
  const muted = useMemo(() => sortMutedChats(conversations), [conversations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => receiveMessage(3, 'Tin mới ở Chat C')}
          className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold hover:bg-muted/80"
        >
          <MessageSquarePlus className="size-4" />
          Receive message (Chat C)
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          Pinned
        </p>
        <div className="flex flex-col gap-2">
          {pinned.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">Không có ghim</p>
          ) : (
            pinned.map((c) => (
              <ChatRow
                key={c.id}
                c={c}
                nowMs={nowMs}
                onTogglePin={() => togglePin(c.id)}
                onToggleMute={() => toggleMute(c.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          Chats
        </p>
        <div className="flex flex-col gap-2">
          {normal.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">Không có hội thoại</p>
          ) : (
            normal.map((c) => (
              <ChatRow
                key={c.id}
                c={c}
                nowMs={nowMs}
                onTogglePin={() => togglePin(c.id)}
                onToggleMute={() => toggleMute(c.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          Muted Chats
        </p>
        <div className="flex flex-col gap-2">
          {muted.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">Không có muted chats</p>
          ) : (
            muted.map((c) => (
              <ChatRow
                key={c.id}
                c={c}
                nowMs={nowMs}
                onTogglePin={() => togglePin(c.id)}
                onToggleMute={() => toggleMute(c.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
