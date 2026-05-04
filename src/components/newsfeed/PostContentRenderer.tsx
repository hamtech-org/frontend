import { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

type Props = { content: string; mediaUrls?: string[] };

const parseMaybeJson = (raw: string): any => {
  const s = raw?.trim?.() ?? '';
  if (!s) return { type: 'doc', content: [{ type: 'paragraph' }] };
  try {
    const parsed = JSON.parse(s) as any;
    if (parsed && parsed.type === 'doc') return parsed;
  } catch {
    // ignore
  }
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }] };
};

export default function PostContentRenderer({ content }: Props) {
  const extensions = useMemo(
    () => [StarterKit, Image.configure({ inline: false, allowBase64: false })],
    [],
  );

  const editor = useEditor({
    extensions,
    editable: false,
    content: parseMaybeJson(content) as any,
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(parseMaybeJson(content) as any);
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="post-richtext max-w-none">
      <EditorContent editor={editor} />
    </div>
  );
}
