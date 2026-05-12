import {
  ChevronRight,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Tom tat 10 tin nhan gan nhat',
  'Viet tin nhan phan hoi lich su cho khach hang',
  'Goi y 3 y tuong noi dung marketing',
  'Tao checklist cong viec tu doan chat',
];

type ConversationInfoPanelAIRightProps = {
  onPromptSelect?: (prompt: string) => void;
};

export function ConversationInfoPanelAIRight({
  onPromptSelect,
}: ConversationInfoPanelAIRightProps) {
  return (
    <aside className="hidden lg:flex w-80 shrink-0">
      <div className="w-full h-full min-h-0 border-l border-black/5 dark:border-white/5 flex flex-col bg-white dark:bg-[#1a1a1a] overflow-hidden">
        <div className="h-20 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 sticky top-0 bg-inherit z-10 shrink-0">
          <div className="min-w-0 flex-1 text-center font-bold text-lg">Tro ly AI</div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-black/5 dark:bg-transparent custom-scrollbar pb-8">
          <div className="p-6 flex flex-col items-center border-b border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-[#1a1a1a]">
            <div className="w-20 h-20 rounded-full mb-4 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg text-center leading-tight">HAMTECH AI Assistant</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center font-medium opacity-80">
              San sang ho tro tom tat, goi y va tao noi dung.
            </p>
          </div>

          <div className="mt-2 border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <WandSparkles className="size-4 text-blue-600" />
              Tinh nang
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>- Tom tat noi dung doan chat</li>
              <li>- Goi y cau tra loi theo ngu canh</li>
              <li>- Viet lai van ban theo giong dieu mong muon</li>
            </ul>
          </div>

          <div className="mt-2 border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Lightbulb className="size-4 text-amber-500" />
              Prompt mau
            </div>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onPromptSelect?.(prompt)}
                  className="flex w-full items-center justify-between rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
                >
                  <span className="line-clamp-2">{prompt}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <MessageSquare className="size-4 text-violet-500" />
              Meo su dung
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cang mo ta ro boi canh, muc tieu va doi tuong, cau tra loi AI cang chinh xac.
            </p>
          </div>

          <div className="mt-2 border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="size-4 text-emerald-600" />
              Luu y bao mat
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Khong chia se thong tin nhay cam (OTP, mat khau, private key) trong khung chat AI.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
