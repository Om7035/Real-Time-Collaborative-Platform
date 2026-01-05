import React from 'react';
import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    Code2,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EditorToolbarProps {
    editor: Editor;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const items = [
        {
            icon: <Bold size={18} />,
            title: 'Bold (Ctrl+B)',
            action: () => editor.chain().focus().toggleBold().run(),
            isActive: () => editor.isActive('bold'),
        },
        {
            icon: <Italic size={18} />,
            title: 'Italic (Ctrl+I)',
            action: () => editor.chain().focus().toggleItalic().run(),
            isActive: () => editor.isActive('italic'),
        },
        {
            icon: <Strikethrough size={18} />,
            title: 'Strikethrough',
            action: () => editor.chain().focus().toggleStrike().run(),
            isActive: () => editor.isActive('strike'),
        },
        {
            icon: <Code size={18} />,
            title: 'Inline Code',
            action: () => editor.chain().focus().toggleCode().run(),
            isActive: () => editor.isActive('code'),
        },
        { type: 'divider' },
        {
            icon: <Heading1 size={18} />,
            title: 'Heading 1',
            action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            isActive: () => editor.isActive('heading', { level: 1 }),
        },
        {
            icon: <Heading2 size={18} />,
            title: 'Heading 2',
            action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            isActive: () => editor.isActive('heading', { level: 2 }),
        },
        {
            icon: <Heading3 size={18} />,
            title: 'Heading 3',
            action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            isActive: () => editor.isActive('heading', { level: 3 }),
        },
        { type: 'divider' },
        {
            icon: <List size={18} />,
            title: 'Bullet List',
            action: () => editor.chain().focus().toggleBulletList().run(),
            isActive: () => editor.isActive('bulletList'),
        },
        {
            icon: <ListOrdered size={18} />,
            title: 'Numbered List',
            action: () => editor.chain().focus().toggleOrderedList().run(),
            isActive: () => editor.isActive('orderedList'),
        },
        { type: 'divider' },
        {
            icon: <Quote size={18} />,
            title: 'Blockquote',
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: () => editor.isActive('blockquote'),
        },
        {
            icon: <Code2 size={18} />,
            title: 'Code Block',
            action: () => editor.chain().focus().toggleCodeBlock().run(),
            isActive: () => editor.isActive('codeBlock'),
        },
        { type: 'divider' },
        {
            icon: <Undo size={18} />,
            title: 'Undo (Ctrl+Z)',
            action: () => editor.chain().focus().undo().run(),
        },
        {
            icon: <Redo size={18} />,
            title: 'Redo (Ctrl+Shift+Z)',
            action: () => editor.chain().focus().redo().run(),
        },
    ];

    return (
        <div className="p-2 flex items-center gap-1 overflow-x-auto">
            {items.map((item, index) => {
                if (item.type === 'divider') {
                    return <div key={index} className="w-px h-6 bg-gray-300 mx-1" />;
                }

                return (
                    <button
                        key={index}
                        onClick={item.action}
                        title={item.title}
                        className={cn(
                            "p-2 rounded-md transition-all duration-150 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                            item.isActive?.() && "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        )}
                    >
                        {item.icon}
                    </button>
                );
            })}
        </div>
    );
};
