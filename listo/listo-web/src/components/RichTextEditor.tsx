import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Button, Space, Divider } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  toolbarExtra?: React.ReactNode;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  title: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, icon, title }) => (
  <Button
    type={isActive ? 'primary' : 'default'}
    size="small"
    icon={icon}
    onClick={onClick}
    title={title}
  />
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write your description here...',
  toolbarExtra,
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

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #d9d9d9', background: '#fafafa' }}>
        <Space size={4} wrap>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={<BoldOutlined />}
            title="Bold"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={<ItalicOutlined />}
            title="Italic"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={<UnderlineOutlined />}
            title="Underline"
          />
          <Divider type="vertical" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={<UnorderedListOutlined />}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={<OrderedListOutlined />}
            title="Numbered List"
          />
          <Divider type="vertical" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={<UndoOutlined />}
            title="Undo"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={<RedoOutlined />}
            title="Redo"
          />
          {toolbarExtra && (
            <>
              <Divider type="vertical" />
              {toolbarExtra}
            </>
          )}
        </Space>
      </div>
      <EditorContent
        editor={editor}
        style={{ padding: '12px', minHeight: 150 }}
      />
    </div>
  );
};

export default RichTextEditor;
