import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ICommunityRule } from '@/types/community.types';

export function WidgetRulesAccordion({ rules }: { rules?: ICommunityRule[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (!rules || rules.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-primary/20 transition-all duration-300">
      <div className="flex flex-col gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Nội quy cộng đồng
        </div>

        <div className="flex flex-col gap-2 mt-1.5">
          {rules.map((rule, index) => {
            const isOpen = activeIndex === index;
            return (
              <div
                key={rule.id}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-[0_2px_8px_rgba(124,58,237,0.02)]'
                    : 'border-border/30 bg-muted/10 hover:border-border/60 hover:bg-muted/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-foreground transition-colors cursor-pointer bg-transparent border-none focus:outline-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[10px] font-extrabold rounded px-1.5 py-0.5 shrink-0 transition-colors duration-300 ${
                        isOpen ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`truncate font-semibold transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-foreground'}`}
                    >
                      {rule.title}
                    </span>
                  </div>
                  <ChevronDown
                    className={`size-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-all duration-300 ${
                      isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  />
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen
                      ? 'max-h-40 border-t border-border/30 opacity-100'
                      : 'max-h-0 opacity-0 pointer-events-none'
                  } overflow-hidden`}
                >
                  <p className="p-3.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-medium">
                    {rule.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
