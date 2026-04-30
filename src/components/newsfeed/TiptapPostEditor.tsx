import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { Bold, Italic, Strikethrough, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  value: string; // JSON string
  onChange: (nextValue: string) => void; // JSON string
  onUploadImage: (file: File) => Promise<string>; // returns image URL
};

const parseMaybeJson = (raw: string): any => {
  const s = raw?.trim?.() ?? '';
  if (!s)
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] };
  try {
    const parsed = JSON.parse(s) as any;
    // Tiptap/tentap JSON dựa trên ProseMirror thường có shape { type: 'doc', content: [...] }
    if (parsed && parsed.type === 'doc') return parsed;
  } catch {
    // ignore
  }

  // not Tiptap JSON -> treat as plain text
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }] };
};

export default function TiptapPostEditor({ value, onChange, onUploadImage }: Props) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const lastValueRef = useRef<string>(value);
  const [formatValue, setFormatValue] = useState<'paragraph' | 'h1' | 'h2' | 'h3'>('paragraph');
  const [listValue, setListValue] = useState<'none' | 'bullet' | 'ordered'>('none');

  const emitContentChange = (next: string) => {
    if (lastValueRef.current === next) return;
    lastValueRef.current = next;
    onChange(next);
  };

  const extensions = useMemo(
    () => [
      StarterKit,
      ImageExtension.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    editable: true,
    content: parseMaybeJson(value) as any,
    onUpdate: ({ editor }) => {
      // Debounce onChange a bit to avoid hammering bridge/JSON stringification
      window.clearTimeout((editor as any).__onUpdateTimer);
      (editor as any).__onUpdateTimer = window.setTimeout(() => {
        const json = editor.getJSON();
        const next = JSON.stringify(json);
        emitContentChange(next);
      }, 250);
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Update editor content only if backend value changed (edit mode)
    if (value !== lastValueRef.current) {
      editor.commands.setContent(parseMaybeJson(value) as any);
      lastValueRef.current = value;
    }
  }, [editor, value]);

  // Sync select values with current cursor format.
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      if (editor.isActive('heading', { level: 1 })) setFormatValue('h1');
      else if (editor.isActive('heading', { level: 2 })) setFormatValue('h2');
      else if (editor.isActive('heading', { level: 3 })) setFormatValue('h3');
      else setFormatValue('paragraph');

      if (editor.isActive('bulletList')) setListValue('bullet');
      else if (editor.isActive('orderedList')) setListValue('ordered');
      else setListValue('none');
    };

    sync();
    editor.on('selectionUpdate', sync);
    editor.on('transaction', sync);
    return () => {
      editor.off('selectionUpdate', sync);
      editor.off('transaction', sync);
    };
  }, [editor]);

  const applyFormat = (next: 'paragraph' | 'h1' | 'h2' | 'h3') => {
    if (!editor) return;
    setFormatValue(next);
    if (next === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = next === 'h1' ? 1 : next === 'h2' ? 2 : 3;
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const applyList = (next: 'none' | 'bullet' | 'ordered') => {
    if (!editor) return;
    setListValue(next);

    if (next === 'none') {
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run();
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run();
      return;
    }

    if (next === 'bullet') {
      editor.chain().focus().toggleBulletList().run();
      return;
    }

    editor.chain().focus().toggleOrderedList().run();
  };

  const insertImage = async (file: File) => {
    if (!editor) return;
    const url = await onUploadImage(file);
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    // Flush ngay sau khi insert image để submit không bị thiếu node ảnh.
    window.clearTimeout((editor as any).__onUpdateTimer);
    emitContentChange(JSON.stringify(editor.getJSON()));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor}
        >
          <Bold size={18} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor}
        >
          <Italic size={18} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={!editor}
        >
          <Strikethrough size={18} />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-blue-600/20"
          onClick={() => uploadInputRef.current?.click()}
          disabled={!editor}
        >
          <ImageIcon size={18} />
        </Button>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await insertImage(file);
            // reset value so selecting same file again works
            e.currentTarget.value = '';
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">Định dạng</p>
          <Select value={formatValue} onValueChange={(v) => applyFormat(v as typeof formatValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn định dạng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Đoạn</SelectItem>
              <SelectItem value="h1">Tiêu đề 1</SelectItem>
              <SelectItem value="h2">Tiêu đề 2</SelectItem>
              <SelectItem value="h3">Tiêu đề 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">Danh sách</p>
          <Select value={listValue} onValueChange={(v) => applyList(v as typeof listValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn danh sách" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không</SelectItem>
              <SelectItem value="bullet">Gạch đầu dòng</SelectItem>
              <SelectItem value="ordered">Đánh số</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-3xl border border-border/40 bg-background p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
