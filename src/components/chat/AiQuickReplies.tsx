import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '@/services/api';

type Topic = 'Cải thiện' | 'Hài Hước' | 'Nghiêm túc' | 'Truyền cảm hứng';

type AiSuggestRequest = {
  context: string;
  type: 'reply' | 'post' | 'caption';
  language: 'vi' | 'en';
  topics: string[];
};

type AiSuggestResponse = {
  suggestions: string[];
  model: string;
  tokensUsed: number;
};

type ApiSuccessResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type AiQuickRepliesProps = {
  activeConversationId: string | null;
  inputText: string;
  type?: AiSuggestRequest['type'];
  language?: AiSuggestRequest['language'];
  onPickReply: (text: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  className?: string;
  initialReplies?: string[];
};

const TOPICS: Topic[] = ['Cải thiện', 'Hài Hước', 'Nghiêm túc', 'Truyền cảm hứng'];

export function AiQuickReplies({
  activeConversationId,
  inputText,
  type = 'reply',
  language = 'vi',
  onPickReply,
  textareaRef,
  className,
  initialReplies = [],
}: AiQuickRepliesProps) {
  const inputTrimmed = inputText.trim();
  const canSuggest = !!activeConversationId && inputTrimmed.length > 0;

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<string[]>(initialReplies);
  const [loading, setLoading] = useState(false);

  const cacheRef = useRef(new Map<string, string[]>());
  const lastInputKeyRef = useRef<string>('');

  const cacheKey = useMemo(() => {
    if (!selectedTopic) return '';
    return `${selectedTopic}::${language}::${type}::${inputTrimmed}`;
  }, [inputTrimmed, language, selectedTopic, type]);

  const fetchSuggestions = async (topic: Topic) => {
    if (!canSuggest) return;

    const nextKey = `${topic}::${language}::${type}::${inputTrimmed}`;
    const cached = cacheRef.current.get(nextKey);
    if (cached?.length) {
      setSelectedTopic(topic);
      setReplies(cached);
      return;
    }

    setSelectedTopic(topic);
    setLoading(true);
    try {
      const body: AiSuggestRequest = {
        context: inputTrimmed,
        type,
        language,
        topics: [topic],
      };

      const res = await apiClient.post<ApiSuccessResponse<AiSuggestResponse>>(
        '/ai/suggest-content',
        body,
      );
      const suggestions = res.data?.data?.suggestions ?? [];
      const normalized = suggestions.map((s) => String(s).trim()).filter(Boolean);

      if (!normalized.length) {
        toast.warning(language === 'vi' ? 'Không có gợi ý phù hợp.' : 'No suitable suggestions.');
        return;
      }

      cacheRef.current.set(nextKey, normalized);
      setReplies(normalized);
    } catch (err) {
      toast.error(
        language === 'vi'
          ? 'Gợi ý AI thất bại. Vui lòng thử lại.'
          : 'AI suggestion failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const inputKey = `${language}::${type}::${inputTrimmed}`;
    if (lastInputKeyRef.current && lastInputKeyRef.current !== inputKey) {
      setSelectedTopic(null);
      setReplies(initialReplies);
    }
    lastInputKeyRef.current = inputKey;
  }, [initialReplies, inputTrimmed, language, type]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5">
        {TOPICS.map((topic) => {
          const isActive = topic === selectedTopic;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => void fetchSuggestions(topic)}
              disabled={!canSuggest || loading}
              className={[
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors',
                'disabled:opacity-45 disabled:pointer-events-none',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white',
              ].join(' ')}
              title={
                canSuggest
                  ? undefined
                  : language === 'vi'
                    ? 'Nhập nội dung để gợi ý'
                    : 'Type to suggest'
              }
            >
              {loading && isActive ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/65 border-t-transparent" />
              ) : (
                <></>
              )}
              {topic}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {replies.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => {
              if (!activeConversationId) return;
              onPickReply(text);
              window.setTimeout(() => textareaRef?.current?.focus(), 0);
            }}
            disabled={!activeConversationId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap disabled:opacity-45 disabled:pointer-events-none"
          >
            <Sparkles className="w-3 h-3 text-blue-600" />
            {text}
          </button>
        ))}
      </div>

      {!canSuggest && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {language === 'vi'
            ? 'Nhập nội dung để AI gợi ý theo chủ đề.'
            : 'Type something to get AI suggestions by topic.'}
        </p>
      )}
    </div>
  );
}
