import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, MessageSquarePlus, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';

import {
  MuteNotificationsModal,
  type MuteNotificationsApplyPayload,
} from '@/components/chat/MuteNotificationsModal';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Conversation = {
  id: number;
  name: string;
  lastMessage: string;
  unread: number;
  muted: boolean;
  /** epoch ms; null = until user unmutes */
  muteUntil: number | null;
};

const STORAGE_KEY = 'mute-demo:conversations:v1';

function formatClockHHmm(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function deriveMuteUntil(payload: MuteNotificationsApplyPayload, nowMs: number): number | null {
  if (payload.kind === 'clearScheduledMute') return null;
  if (payload.kind === 'untilUserUnmutes') return null;
  if (payload.kind === 'muteFor') {
    const minutes = payload.muteFor === '1m' ? 1 : payload.muteFor === '5m' ? 5 : 10;
    return nowMs + minutes * 60_000;
  }
  return new Date(payload.notificationsMutedUntil).getTime();
}

function getCountdownLabel(conv: Conversation, nowMs: number): string | null {
  if (!conv.muted) return null;
  if (conv.muteUntil === null) return 'Muted';
  const remainingMs = conv.muteUntil - nowMs;
  if (remainingMs <= 0) return 'Muted';
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  if (remainingMinutes < 60) return `Muted • ${remainingMinutes}m`;
  return `Muted until ${formatClockHHmm(conv.muteUntil)}`;
}

function autoUnmute(convs: Conversation[], nowMs: number): Conversation[] {
  let changed = false;
  const next = convs.map((c) => {
    if (!c.muted) return c;
    if (c.muteUntil === null) return c;
    if (nowMs <= c.muteUntil) return c;
    changed = true;
    return { ...c, muted: false, muteUntil: null };
  });
  return changed ? next : convs;
}

function ChatItem({
  conv,
  nowMs,
  onOpenMute,
  onUnmute,
}: {
  conv: Conversation;
  nowMs: number;
  onOpenMute: () => void;
  onUnmute: () => void;
}) {
  const mutedLabel = getCountdownLabel(conv, nowMs);

  return (
    <div
      className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors ${
        conv.muted ? 'bg-muted/40 opacity-60' : 'hover:bg-muted/50'
      }`}
    >
      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="font-bold text-primary">
          {conv.name.trim().charAt(0).toUpperCase() || 'C'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[15px] font-bold truncate">{conv.name}</p>
          {conv.muted && (
            <Badge
              variant="secondary"
              className="h-5 bg-gray-200 text-gray-700 border border-gray-300"
            >
              Muted
            </Badge>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground truncate">{conv.lastMessage}</p>
        {mutedLabel && <p className="text-[11px] mt-0.5 text-muted-foreground">{mutedLabel}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {conv.unread > 0 && (
          <div className="min-h-[18px] min-w-[18px] px-1 rounded-full bg-zinc-500/85 flex items-center justify-center text-[10px] font-bold text-white leading-none tabular-nums">
            {conv.unread > 99 ? '99+' : String(conv.unread)}
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={conv.muted ? onUnmute : onOpenMute}
              className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label={conv.muted ? 'Bật thông báo' : 'Tắt thông báo'}
            >
              {conv.muted ? (
                <BellOff className="w-4 h-4 text-red-500" />
              ) : (
                <Bell className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            {conv.muted ? 'Đang tắt thông báo. Nhấn để bật.' : 'Tắt thông báo cuộc trò chuyện này'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function MuteChatListDemo() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Conversation[];
    } catch {
      // ignore
    }
    return [
      {
        id: 1,
        name: 'Nhóm SE',
        lastMessage: 'Hello',
        unread: 2,
        muted: true,
        muteUntil: Date.now() + 45 * 60_000,
      },
      { id: 2, name: 'Anh A', lastMessage: 'Ok nhé', unread: 0, muted: false, muteUntil: null },
      {
        id: 3,
        name: 'Team C',
        lastMessage: 'Gửi file giúp mình',
        unread: 1,
        muted: false,
        muteUntil: null,
      },
    ];
  });

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [muteTargetId, setMuteTargetId] = useState<number | null>(null);
  const timeoutsRef = useRef<Map<number, number>>(new Map());

  // countdown UI tick (realtime)
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // fallback when reload: if muteUntil passed -> auto unmute on mount / whenever time advances
  useEffect(() => {
    setConversations((prev) => autoUnmute(prev, Date.now()));
  }, []);

  // persist to localStorage (no database)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // ignore
    }
  }, [conversations]);

  // realtime auto-unmute: schedule per conversation using setTimeout
  useEffect(() => {
    // clear outdated timers
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current.clear();

    const now = Date.now();
    for (const c of conversations) {
      if (!c.muted) continue;
      if (c.muteUntil === null) continue;
      const delay = c.muteUntil - now;
      if (delay <= 0) continue;

      const id = window.setTimeout(() => {
        setConversations((prev) => autoUnmute(prev, Date.now()));
      }, delay);
      timeoutsRef.current.set(c.id, id);
    }

    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, [conversations]);

  // ===== Required functions =====
  const mute1m = (id: number) => muteFor(id, { kind: 'muteFor', muteFor: '1m' });
  const mute5m = (id: number) => muteFor(id, { kind: 'muteFor', muteFor: '5m' });
  const mute10m = (id: number) => muteFor(id, { kind: 'muteFor', muteFor: '10m' });
  const muteForever = (id: number) => muteFor(id, { kind: 'untilUserUnmutes' });

  function muteFor(id: number, payload: MuteNotificationsApplyPayload) {
    const now = Date.now();
    const until = deriveMuteUntil(payload, now);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, muted: true, muteUntil: until } : c)),
    );
  }

  function receiveMessage(id: number, message: string) {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, lastMessage: message, unread: c.unread + 1 } : c,
      );
      const target = next.find((c) => c.id === id);
      if (target && !target.muted) {
        toast.info(`${target.name}: ${message}`, { toastId: `msg:${id}:${Date.now()}` });
      }
      return next;
    });
  }

  function toggleMute(id: number) {
    setConversations((prev) => {
      const c = prev.find((x) => x.id === id);
      if (!c) return prev;
      if (c.muted)
        return prev.map((x) => (x.id === id ? { ...x, muted: false, muteUntil: null } : x));
      return prev;
    });
  }
  // =============================

  const muteTarget = useMemo(
    () => conversations.find((c) => c.id === muteTargetId) ?? null,
    [conversations, muteTargetId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => receiveMessage(1, 'Tin mới nè')}
          className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold hover:bg-muted/80"
        >
          <MessageSquarePlus className="size-4" />
          Giả lập tin mới (Nhóm SE)
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore
            }
            window.location.reload();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold hover:bg-muted/80"
        >
          <RotateCcw className="size-4" />
          Reload + fallback
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {conversations.map((conv) => (
          <ChatItem
            key={conv.id}
            conv={conv}
            nowMs={nowMs}
            onOpenMute={() => setMuteTargetId(conv.id)}
            onUnmute={() => toggleMute(conv.id)}
          />
        ))}
      </div>

      <MuteNotificationsModal
        open={muteTargetId !== null}
        onClose={() => setMuteTargetId(null)}
        onConfirm={async (payload) => {
          if (!muteTarget) return;
          const now = Date.now();

          if (payload.kind === 'clearScheduledMute') {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === muteTarget.id ? { ...c, muted: false, muteUntil: null } : c,
              ),
            );
            setMuteTargetId(null);
            return;
          }

          if (payload.kind === 'muteFor') {
            if (payload.muteFor === '1m') mute1m(muteTarget.id);
            else if (payload.muteFor === '5m') mute5m(muteTarget.id);
            else mute10m(muteTarget.id);
          } else if (payload.kind === 'untilIso') {
            muteFor(muteTarget.id, payload);
          } else {
            muteForever(muteTarget.id);
          }

          // immediate fallback check (in case of clock drift)
          setConversations((prev) => autoUnmute(prev, now));
          setMuteTargetId(null);
        }}
      />
    </div>
  );
}
