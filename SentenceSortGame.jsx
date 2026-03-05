// ============================================================
// SentenceSortGame — drag-to-reorder sentences into correct order
// ============================================================
import React, { useState, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, GripVertical } from 'lucide-react';

export default function SentenceSortGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();
  const [items, setItems] = useState([...content.shuffled]);
  const dragIdx = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);

  // Mouse drag handlers
  const onDragStart = (idx) => { dragIdx.current = idx; };
  const onDragOver  = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const onDrop      = (idx) => {
    if (dragIdx.current === null || dragIdx.current === idx) { setDragOverIdx(null); return; }
    const newItems = [...items];
    const [moved] = newItems.splice(dragIdx.current, 1);
    newItems.splice(idx, 0, moved);
    setItems(newItems);
    dragIdx.current = null;
    setDragOverIdx(null);
  };
  const onDragEnd = () => { dragIdx.current = null; setDragOverIdx(null); };

  // Move up/down with buttons (keyboard-friendly)
  const moveUp   = (idx) => { if (idx === 0) return; const n = [...items]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; setItems(n); };
  const moveDown = (idx) => { if (idx === items.length-1) return; const n = [...items]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; setItems(n); };

  const handleSubmit = () => onSubmit({ order: items });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)} className="p-2 rounded-xl text-sky hover:bg-sky/10">
          <Volume2 size={18} />
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 bg-sunny/10 border border-sunny/30 rounded-2xl px-4 py-2">
        💡 Drag the sentences up and down, or use the arrow buttons!
      </p>

      <div className="space-y-3 mb-6">
        {items.map((sentence, idx) => (
          <div key={sentence}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={e => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={onDragEnd}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-grab active:cursor-grabbing transition-all
              ${dragOverIdx === idx ? 'border-sky bg-sky/10 scale-[1.01]' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'}
              ${dragIdx.current === idx ? 'opacity-50 scale-[0.98]' : 'hover:border-sky/50 hover:shadow-md'}`}>
            {/* Step number */}
            <div className="w-7 h-7 rounded-full bg-sky/15 text-sky flex items-center justify-center font-bold text-sm flex-shrink-0">
              {idx + 1}
            </div>
            {/* Drag handle */}
            <GripVertical size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            {/* Sentence text */}
            <p className="flex-1 font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed select-none">
              {sentence}
            </p>
            {/* TTS */}
            <button onClick={() => speak(sentence)}
              className="flex-shrink-0 p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors">
              <Volume2 size={14} />
            </button>
            {/* Up/Down controls */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveUp(idx)} disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-sky/20 disabled:opacity-30 text-xs transition-colors">
                ▲
              </button>
              <button onClick={() => moveDown(idx)} disabled={idx === items.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-sky/20 disabled:opacity-30 text-xs transition-colors">
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 text-lg">
        {submitting ? '⏳ Checking…' : '✅ Check My Order!'}
      </button>
    </div>
  );
}
