// ============================================================
// SentenceSortGame — reorder sentences with full touch drag support
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, GripVertical } from 'lucide-react';

export default function SentenceSortGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak }   = useSettings();

  const [items,       setItems]       = useState([...content.shuffled]);
  const [dragIdx,     setDragIdx]     = useState(null);  // index being dragged
  const [overIdx,     setOverIdx]     = useState(null);  // index being hovered

  // Touch state (refs so event handlers don't go stale)
  const touchDragIdx = useRef(null);
  const ghostRef     = useRef(null);
  const itemsRef     = useRef(items);
  itemsRef.current   = items;

  // ── Helpers ──────────────────────────────────────────────
  const createGhost = (text, x, y) => {
    removeGhost();
    const el = document.createElement('div');
    el.id = 'ss-ghost';
    const short = text.length > 60 ? text.slice(0, 57) + '…' : text;
    el.textContent = short;
    el.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none;
      background:#0F172A; color:#fff;
      padding:10px 16px; border-radius:14px;
      font-size:13px; font-weight:600; font-family:inherit;
      max-width:280px; transform:translate(-50%,-50%) rotate(-2deg) scale(1.03);
      box-shadow:0 10px 28px rgba(0,0,0,0.4);
      left:${x}px; top:${y}px;
    `;
    document.body.appendChild(el);
    ghostRef.current = el;
  };
  const moveGhost = (x, y) => {
    if (!ghostRef.current) return;
    ghostRef.current.style.left = `${x}px`;
    ghostRef.current.style.top  = `${y}px`;
  };
  const removeGhost = () => {
    if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null; }
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

  const doReorder = (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // ── HTML5 drag (desktop) ─────────────────────────────────
  const onDragStart = (idx) => { setDragIdx(idx); };
  const onDragOver  = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const onDrop      = (idx) => { doReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); };
  const onDragEnd   = () => { setDragIdx(null); setOverIdx(null); };

  // ── Touch drag (mobile) ──────────────────────────────────
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
  }, []);

  // ── Up/Down buttons (accessible fallback) ────────────────
  const moveUp   = (idx) => { if (idx === 0) return; setItems(p => { const n=[...p]; [n[idx-1],n[idx]]=[n[idx],n[idx-1]]; return n; }); };
  const moveDown = (idx) => { if (idx === items.length-1) return; setItems(p => { const n=[...p]; [n[idx],n[idx+1]]=[n[idx+1],n[idx]]; return n; }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)} className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0">
          <Volume2 size={18} />
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 px-3 py-2 rounded-xl bg-sky/5 border border-sky/15">
        Drag sentences into the correct order — or use the arrow buttons on mobile!
      </p>

      <div className="space-y-3 mb-6">
        {items.map((sentence, idx) => (
          <div key={sentence}
            data-sort-idx={idx}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={e => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={onDragEnd}
            onTouchStart={e => onTouchStart(e, idx)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-grab active:cursor-grabbing
                        transition-all select-none
              ${overIdx === idx  ? 'border-sky bg-sky/10 scale-[1.01]' : ''}
              ${dragIdx === idx  ? 'opacity-40 scale-[0.98]' : ''}
              ${overIdx !== idx && dragIdx !== idx ? 'border-gray-200 dark:border-gray-600 hover:border-sky/40 hover:shadow-md' : ''}`}
            style={{ background: 'var(--bg-card)' }}>
            {/* Step number */}
            <div className="w-7 h-7 rounded-full bg-sky/15 text-sky flex items-center justify-center font-bold text-sm flex-shrink-0">
              {idx + 1}
            </div>
            {/* Grip handle */}
            <GripVertical size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            {/* Text */}
            <p className="flex-1 font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed min-w-0">
              {sentence}
            </p>
            {/* TTS */}
            <button onClick={e => { e.stopPropagation(); speak(sentence); }}
              className="flex-shrink-0 p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors">
              <Volume2 size={14} />
            </button>
            {/* Up/Down arrow buttons — primary mobile control */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveUp(idx)} disabled={idx === 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700
                           hover:bg-sky/20 disabled:opacity-30 text-xs transition-colors font-bold">
                ▲
              </button>
              <button onClick={() => moveDown(idx)} disabled={idx === items.length - 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700
                           hover:bg-sky/20 disabled:opacity-30 text-xs transition-colors font-bold">
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => onSubmit({ order: items })} disabled={submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 text-base">
        {submitting ? 'Checking…' : 'Check My Order!'}
      </button>
    </div>
  );
}
