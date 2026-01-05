import { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Copy, Check } from 'lucide-react';

const CodeBlockComponent = ({ node }: any) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const code = node.textContent;

        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <NodeViewWrapper className="code-block-wrapper">
            <button
                className={`copy-button ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                contentEditable={false}
                title={copied ? 'Copied!' : 'Copy code'}
            >
                {copied ? (
                    <>
                        <Check size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Copied
                    </>
                ) : (
                    <>
                        <Copy size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Copy
                    </>
                )}
            </button>
            <pre>
                <code>
                    <NodeViewContent />
                </code>
            </pre>
        </NodeViewWrapper>
    );
};

export default CodeBlockComponent;
