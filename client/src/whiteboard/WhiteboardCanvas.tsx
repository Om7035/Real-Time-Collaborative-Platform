import React, { useEffect, useState, useRef } from 'react';

import { useYjs } from '../editor/useYjs'; // We reuse the hook, or pass ydoc
import { getRandomColor } from '../lib/utils';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';

interface Shape {
    id: string;
    type: 'rect' | 'note';
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    text?: string;
}

interface WhiteboardProps {
    documentId: string;
}

export const WhiteboardCanvas: React.FC<WhiteboardProps> = ({ documentId }) => {
    const { socket } = useSocket();
    const { user } = useAuth();

    // We need a separate YJs hook or reuse? 
    // Ideally we share the provider if in same view, but here we can just create a new connection for simplicity
    // or passing ydoc from parent is better.
    // For now, let's use the hook independently.
    const userColor = React.useMemo(() => getRandomColor(user?.email || 'anon'), [user?.email]);
    const userInfo = React.useMemo(() => ({ name: user?.email || 'Anon', color: userColor }), [user, userColor]);

    const { ydoc, synced } = useYjs(documentId, socket, userInfo);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const draggingRef = useRef<{ id: string, offsetX: number, offsetY: number } | null>(null);

    useEffect(() => {
        if (!synced) return;

        const shapeMap = ydoc.getMap<Shape>('whiteboard-shapes');

        const updateShapes = () => {
            setShapes(Array.from(shapeMap.values()));
        };

        shapeMap.observe(updateShapes);
        updateShapes();

        return () => {
            shapeMap.unobserve(updateShapes);
        };
    }, [synced, ydoc]);

    const handleMouseDown = (e: React.MouseEvent, shapeId: string) => {
        const shape = shapes.find(s => s.id === shapeId);
        if (shape) {
            draggingRef.current = {
                id: shapeId,
                offsetX: e.clientX - shape.x,
                offsetY: e.clientY - shape.y,
            };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingRef.current && synced) {
            const { id, offsetX, offsetY } = draggingRef.current;
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            // Optimization: Throttling updates or using transacting needed for high perf
            // For now, React state update + Yjs update
            const shapeMap = ydoc.getMap<Shape>('whiteboard-shapes');
            const shape = shapeMap.get(id);
            if (shape) {
                shapeMap.set(id, { ...shape, x, y });
            }
        }
    };

    const handleMouseUp = () => {
        draggingRef.current = null;
    };

    const addShape = (type: 'rect' | 'note') => {
        if (!synced) return;
        const shapeMap = ydoc.getMap<Shape>('whiteboard-shapes');
        const id = crypto.randomUUID();
        const newShape: Shape = {
            id,
            type,
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            w: type === 'note' ? 200 : 150,
            h: type === 'note' ? 200 : 100,
            color: getRandomColor(id),
            text: type === 'note' ? 'New Note' : undefined
        };
        shapeMap.set(id, newShape);
    };

    if (!synced) return <div>Loading Canvas...</div>;

    return (
        <div
            className="w-full h-full bg-slate-50 relative overflow-hidden cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Toolbar */}
            <div className="absolute top-4 left-4 flex gap-2 bg-white p-2 rounded-lg shadow-md z-10">
                <button onClick={() => addShape('rect')} className="p-2 hover:bg-slate-100 rounded">
                    Box
                </button>
                <button onClick={() => addShape('note')} className="p-2 hover:bg-slate-100 rounded">
                    Note
                </button>
            </div>

            {/* Shapes */}
            {shapes.map(shape => (
                <div
                    key={shape.id}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, shape.id);
                    }}
                    style={{
                        position: 'absolute',
                        left: shape.x,
                        top: shape.y,
                        width: shape.w,
                        height: shape.h,
                        backgroundColor: shape.type === 'note' ? '#feff9c' : shape.color,
                        boxShadow: shape.type === 'note' ? '2px 2px 10px rgba(0,0,0,0.1)' : 'none',
                    }}
                    className={`rounded cursor-move flex items-center justify-center select-none ${shape.type === 'note' ? 'text-slate-800' : 'text-white font-bold'}`}
                >
                    {shape.type === 'note' ? (
                        <div className="p-4 w-full h-full font-handwriting">
                            {shape.text}
                        </div>
                    ) : (
                        <span>Box</span>
                    )}
                </div>
            ))}

            <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                Hold click to drag. Real-time synced.
            </div>
        </div>
    );
};
