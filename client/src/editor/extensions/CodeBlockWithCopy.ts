import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockComponent from './CodeBlockComponent.tsx';

export const CodeBlockWithCopy = Node.create({
    name: 'codeBlock',

    group: 'block',

    content: 'text*',

    marks: '',

    code: true,

    defining: true,

    addAttributes() {
        return {
            language: {
                default: null,
                parseHTML: element => element.getAttribute('data-language'),
                renderHTML: attributes => {
                    if (!attributes.language) {
                        return {};
                    }
                    return {
                        'data-language': attributes.language,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre',
                preserveWhitespace: 'full',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'pre',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            ['code', {}, 0],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CodeBlockComponent);
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),

            // Exit code block with Escape or Mod-Enter
            'Escape': () => {
                const { state } = this.editor;
                const { $from } = state.selection;

                if ($from.parent.type.name === 'codeBlock') {
                    return this.editor.commands.setNode('paragraph');
                }

                return false;
            },

            'Mod-Enter': () => {
                const { state } = this.editor;
                const { $from } = state.selection;

                if ($from.parent.type.name === 'codeBlock') {
                    return this.editor.commands.setNode('paragraph');
                }

                return false;
            },

            // Prevent Enter from creating new code blocks
            'Shift-Enter': () => {
                const { state } = this.editor;
                const { $from } = state.selection;

                if ($from.parent.type.name === 'codeBlock') {
                    return this.editor.commands.first(({ commands }) => [
                        () => commands.newlineInCode(),
                        () => commands.createParagraphNear(),
                    ]);
                }

                return false;
            },
        };
    },
});
