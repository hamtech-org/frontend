import { extractTextFromTiptapJson } from './tiptapText';
import { truncateText } from './helpers';

// Re-export cn utility for shadcn compatibility
export { cn } from './cn';

/**
 * Trích xuất văn bản sạch từ nội dung bài viết (Tiptap JSON) và rút gọn.
 */
export const getCleanPostContent = (content: string, maxLength: number = 80): string => {
  if (!content) return '';
  const cleanText = extractTextFromTiptapJson(content);
  return truncateText(cleanText, maxLength);
};
