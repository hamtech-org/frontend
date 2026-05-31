import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/utils/cn';
import { isAiAssistantImageUrl, preprocessAiAssistantMarkdown } from '@/utils/aiAssistantMarkdown';

type AiAssistantMarkdownProps = {
  content: string;
  className?: string;
};

const markdownComponents: Components = {
  a: ({ href, children }) => {
    if (href && isAiAssistantImageUrl(href)) {
      return (
        <img
          src={href}
          alt=""
          className="mt-1 max-h-24 max-w-24 rounded-full border border-border/60 object-cover"
          loading="lazy"
        />
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ''}
      className="mt-1 max-h-24 max-w-24 rounded-full border border-border/60 object-cover"
      loading="lazy"
    />
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

export function AiAssistantMarkdown({ content, className }: AiAssistantMarkdownProps) {
  const prepared = preprocessAiAssistantMarkdown(content);

  return (
    <div className={cn('ai-assistant-markdown break-words', className)}>
      <ReactMarkdown components={markdownComponents}>{prepared}</ReactMarkdown>
    </div>
  );
}
