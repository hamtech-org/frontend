import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const HashtagHighlight = Extension.create({
  name: 'hashtagHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hashtagHighlight'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const regex = /#\w+/g;
            state.doc.descendants((node, pos) => {
              if (node.isText) {
                const text = node.text || '';
                let match;
                while ((match = regex.exec(text))) {
                  decorations.push(
                    Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                      class: 'text-blue-500 font-medium',
                    }),
                  );
                }
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

type Props = {
  value: string; // JSON string
  onChange: (nextValue: string) => void; // JSON string
  placeholderText?: string;
};

export interface TiptapPostEditorHandle {
  /** Insert arbitrary content (e.g. emoji string) at the current cursor position. */
  insertContent: (content: string) => void;
  /** Access the raw Tiptap editor instance. */
  getEditor: () => Editor | null;
}

const parseMaybeJson = (raw: string): any => {
  const s = raw?.trim?.() ?? '';
  if (!s)
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] };
  try {
    const parsed = JSON.parse(s) as any;
    if (parsed && parsed.type === 'doc') return parsed;
  } catch {
    // ignore
  }

  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }] };
};

const TiptapPostEditor = forwardRef<TiptapPostEditorHandle, Props>(
  ({ value, onChange, placeholderText = 'Bạn đang nghĩ gì thế?' }, ref) => {
    const lastValueRef = useRef<string>(value);

    const emitContentChange = (next: string) => {
      if (lastValueRef.current === next) return;
      lastValueRef.current = next;
      onChange(next);
    };

    const extensions = useMemo(
      () => [
        StarterKit,
        HashtagHighlight,
        ImageExtension.configure({
          inline: false,
          allowBase64: false,
        }),
        Placeholder.configure({
          placeholder: placeholderText,
          emptyEditorClass:
            'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:pointer-events-none before:h-0',
        }),
      ],
      [placeholderText],
    );

    const editor = useEditor({
      extensions,
      editable: true,
      content: parseMaybeJson(value) as any,
      editorProps: {
        attributes: {
          class: 'min-h-[150px] outline-none text-xl sm:text-2xl',
        },
      },
      onUpdate: ({ editor }) => {
        window.clearTimeout((editor as any).__onUpdateTimer);
        (editor as any).__onUpdateTimer = window.setTimeout(() => {
          const json = editor.getJSON();
          const next = JSON.stringify(json);
          emitContentChange(next);
        }, 250);
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        insertContent: (content: string) => {
          if (!editor) return;
          editor.chain().focus().insertContent(content).run();
        },
        getEditor: () => editor,
      }),
      [editor],
    );

    useEffect(() => {
      if (!editor) return;
      if (value !== lastValueRef.current) {
        editor.commands.setContent(parseMaybeJson(value) as any);
        lastValueRef.current = value;
      }
    }, [editor, value]);

    return (
      <div className="tiptap-post-editor w-full">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

TiptapPostEditor.displayName = 'TiptapPostEditor';

export default TiptapPostEditor;
