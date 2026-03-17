import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write your description here...',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const ToolbarBtn: React.FC<{
    onClick: () => void;
    active?: boolean;
    label: string;
  }> = ({ onClick, active, label }) => (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      style={{
        padding: '4px 8px',
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        background: active ? '#e6f4ff' : 'transparent',
        border: '1px solid ' + (active ? '#91caff' : '#d9d9d9'),
        borderRadius: 4,
        color: active ? '#1677ff' : '#595959',
        cursor: 'pointer',
        minWidth: 32,
        lineHeight: '18px',
        touchAction: 'manipulation',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff' }}>
      <div style={{
        padding: '6px 8px',
        borderBottom: '1px solid #d9d9d9',
        background: '#fafafa',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
      }}>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          label="B"
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          label="I"
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          label="U"
        />
        <div style={{ borderLeft: '1px solid #d9d9d9', margin: '0 2px' }} />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          label="&bull;"
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          label="1."
        />
        <div style={{ borderLeft: '1px solid #d9d9d9', margin: '0 2px' }} />
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          label="&#8617;"
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          label="&#8618;"
        />
      </div>
      <EditorContent
        editor={editor}
        className="mobile-tiptap-editor"
      />
    </div>
  );
};

export default RichTextEditor;
