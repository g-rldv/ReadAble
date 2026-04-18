// ============================================================
// SentenceSortGame — drag/tap to reorder sentences
// - Animated reordering with smooth transitions
// - Clear visual feedback on drag/tap
// - TTS on each sentence
// - Streamlined, uncluttered UI
// ============================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

export default function SentenceSortGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();

  const [items, setItems] = useState([...content.shuffled]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [animatingIdx, setAnimatingIdx] = useState(null);
  const [swapPair, setSwapPair] = useState(null); // {from, to}

  const touchDragIdx = useRef(null);
  const ghostRef = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Ghost helpers
  const createGhost = (text, x, y) => {
    removeGhost();
    const el = document.createElement('div');
    el.id = 'ss-ghost';
    const short = text.length > 55 ? text.slice(0, 52) + '…' : text;
    el.textContent = short;
    Object.assign(el.style, {
      position: 'fixed', zIndex: '9999', pointerEvents: 'none',
      background: '#4D96FF', color: '#fff',
      padding: '10px 16px', borderRadius: '14px',
      fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
      maxWidth: '280px',
      transform: 'translate(-50%,-50%) rotate(-2deg) scale(1.04)',
      boxShadow: '0 10px 30px rgba(77,150,255,0.45)',
      left: `${x}px`, top: `${y}px`,
      transition: 'none',
    });
    document.body.appendChild(el);
    ghostRef.current = el;
  };
  const moveGhost = (x, y) => {
    if (!ghostRef.current) return;
    ghostRef.current.style.left = `${x}px`;
    ghostRef.current.style.top = `${y}px`;
  };
  const removeGhost = () => {
    ghostRef.current?.remove();
    ghostRef.current = null;
  };

  const getItemIdxAt = (x, y) => {
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    if (ghostRef.current) ghostRef.current.style.visibility = '';
    if (!el) return null;
    let node = el;
    while (node) {
      const idx = node.dataset?.sortIdx;
      if (idx !== undefined) return parseInt(idx, 10);
      node = node.parentElement;
    }
    return null;
  };

  const doReorder = useCallback((fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    setSwapPair({ from: fromIdx, to: toIdx });
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    // Clear swap pair after animation
    setTimeout(() => setSwapPair(null), 350);
  }, []);

  // Desktop HTML5 drag
  const onDragStart = (idx) => { setDragIdx(idx); };
  const onDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const onDrop = (idx) => { doReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  // Touch drag
  const onTouchStart = useCallback((e, idx) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchDragIdx.current = idx;
    setDragIdx(idx);
    createGhost(itemsRef.current[idx], touch.clientX, touch.clientY);
  }, []);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    moveGhost(touch.clientX, touch.clientY);
    const over = getItemIdxAt(touch.clientX, touch.clientY);
    setOverIdx(over);
  }, []);

  const onTouchEnd = useCallback((e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const toIdx = getItemIdxAt(touch.clientX, touch.clientY);
    doReorder(touchDragIdx.current, toIdx);
    removeGhost();
    touchDragIdx.current = null;
    setDragIdx(null);
    setOverIdx(null);
  }, [doReorder]);

  // Arrow buttons with animation
  const moveUp = (idx) => {
    if (idx === 0) return;
    setSwapPair({ from: idx, to: idx - 1 });
    setItems(p => {
      const n = [...p];
      [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
      return n;
    });
    setTimeout(() => setSwapPair(null), 350);
  };
  const moveDown = (idx) => {
    if (idx === items.length - 1) return;
    setSwapPair({ from: idx, to: idx + 1 });
    setItems(p => {
      const n = [...p];
      [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
      return n;
    });
    setTimeout(() => setSwapPair(null), 350);
  };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction}
        </p>
        <button
          onClick={() => speak(content.instruction)}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
          <Volume2 size={15} />
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
        style={{ background: 'rgba(77,150,255,0.07)', border: '1.5px solid rgba(77,150,255,0.18)' }}>
        <GripVertical size={13} className="text-sky flex-shrink-0" />
        <p className="text-xs text-sky font-semibold">
          Drag to reorder — or use the ↑ ↓ arrow buttons
        </p>
      </div>

      <style>{`
        @keyframes ss-bump-up   { 0%{transform:translateY(0)} 40%{transform:translateY(-6px)} 100%{transform:translateY(0)} }
        @keyframes ss-bump-down { 0%{transform:translateY(0)} 40%{transform:translateY(6px)}  100%{transform:translateY(0)} }
        .ss-bump-up   { animation: ss-bump-up   0.32s cubic-bezier(0.34,1.56,0.64,1) both; }
        .ss-bump-down { animation: ss-bump-down 0.32s cubic-bezier(0.34,1.56,0.64,1) both; }
        .ss-item { transition: box-shadow 0.15s, border-color 0.15s, opacity 0.15s; }
      `}</style>

      {/* Sentence list */}
      <div className="space-y-2.5 mb-6">
        {items.map((sentence, idx) => {
          const isDragging = dragIdx === idx;
          const isOver = overIdx === idx && dragIdx !== idx;
          let animClass = '';
          if (swapPair) {
            if (idx === swapPair.from && swapPair.to < swapPair.from) animClass = 'ss-bump-up';
            if (idx === swapPair.from && swapPair.to > swapPair.from) animClass = 'ss-bump-down';
            if (idx === swapPair.to   && swapPair.from > swapPair.to)  animClass = 'ss-bump-up';
            if (idx === swapPair.to   && swapPair.from < swapPair.to)  animClass = 'ss-bump-down';
          }

          return (
            <div
              key={sentence}
              data-sort-idx={idx}
              className={`ss-item flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-grab active:cursor-grabbing select-none touch-none ${animClass}`}
              style={{
                background: isOver ? 'rgba(77,150,255,0.06)' : 'var(--bg-card)',
                borderColor: isOver ? '#4D96FF' : isDragging ? 'rgba(77,150,255,0.4)' : 'var(--border-color)',
                opacity: isDragging ? 0.35 : 1,
                boxShadow: isOver ? '0 4px 14px rgba(77,150,255,0.2)' : isDragging ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={onDragEnd}
              onTouchStart={e => onTouchStart(e, idx)}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Step number */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{
                  background: isOver ? 'rgba(77,150,255,0.2)' : 'rgba(77,150,255,0.1)',
                  color: '#4D96FF',
                }}>
                {idx + 1}
              </div>

              {/* Grip */}
              <GripVertical size={16} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />

              {/* Sentence text */}
              <p className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                {sentence}
              </p>

              {/* TTS */}
              <button
                onClick={e => { e.stopPropagation(); speak(sentence); }}
                className="flex-shrink-0 p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors"
                title="Listen">
                <Volume2 size={13} />
              </button>

              {/* Arrow buttons */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-lg transition-all disabled:opacity-25 hover:bg-sky/15 hover:text-sky"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-lg transition-all disabled:opacity-25 hover:bg-sky/15 hover:text-sky"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                  <ArrowDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onSubmit({ order: items })}
        disabled={submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 text-base">
        {submitting ? 'Checking…' : 'Check My Order!'}
      </button>
    </div>
  );
}
