import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatChatTime(sentAt: string): string {
  try {
    return new Date(sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

type ChatProps = {
  messages: Array<{
    sessionId: string;
    userId: string;
    displayName: string;
    text: string;
    sentAt: string;
  }>;
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onSend: () => void;
};

export function LiveHostChatPanel({ messages, chatInput, onChatInputChange, onSend }: ChatProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Chưa có tin nhắn</p>
        )}
        {messages.map((m, i) => (
          <div key={`${m.sentAt}-${i}`} className="border-b border-border/60 py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground truncate">
                {m.displayName}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatChatTime(m.sentAt)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground break-words leading-relaxed">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border flex gap-2 bg-card shrink-0">
        <input
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground"
          placeholder="Gửi tin nhắn…"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
        />
        <Button type="button" size="icon" className="shrink-0 rounded-xl" onClick={onSend}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
