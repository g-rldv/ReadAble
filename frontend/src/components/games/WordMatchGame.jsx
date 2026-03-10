// ============================================================
// WordMatchGame — drag-and-drop with full touch support
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle, X } from 'lucide-react';

export default function WordMatchGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak }   = useSettings();

  // Shuffle right column once
  const [rightItems] = useState(() =>
    [...content.pairs.map(p => p.right)].sort(() => Math.random() - 0.5)
  );
  const [matches,    setMatches]    = useState({});   // { leftWord: rightWord }
  const [dragging,   setDragging]   = useState(null); // { value, source: 'right'|'slot' }
  const [overLeft,   setOverLeft]   = useState(null); // highlighted drop zone
  const ghostRef  = useRef(null);
  const dragState = useRef(null);                     // for touch handlers

  const usedRight = new Set(Object.values(matches));
  const allMatched = content.pairs.every(p => matches[p.left]);

  // ── Clean up ghost on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null; }
    };
  }, []);

  // ── Create/move ghost element ─────────────────────────────
  const createGhost = (text, x, y) => {
    removeGhost();
    const el = document.createElement('div');
    el.id = 'wm-drag-ghost';
    el.textContent = text;
    el.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none;
      background:#4D96FF; color:#fff;
      padding:8px 18px; border-radius:14px;
      font-weight:700; font-size:14px; font-family:inherit;
      transform:translate(-50%,-50%) scale(1.1);
      box-shadow:0 8px 24px rgba(0,0,0,0.35);
      white-space:nowrap; left:${x}px; top:${y}px;
      transition:none;
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

  // Find which left-column key is under a point (hide ghost first to get element below)
  const getLeftKeyAt = (x, y) => {
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    if (ghostRef.current) ghostRef.current.style.visibility = '';
    if (!el) return null;
    let node = el;
    while (node) {
      if (node.dataset?.leftKey) return node.dataset.leftKey;
      node = node.parentElement;
    }
    return null;
  };

  // ── HTML5 drag (desktop) ──────────────────────────────────
  const onDragStart = (value, source) => {
    setDragging({ value, source });
    dragState.current = { value, source };
  };
  const onDragOver = (e, leftKey) => {
    e.preventDefault();
    setOverLeft(leftKey);
  };
  const onDrop = (leftKey) => {
    if (!dragState.current) return;
    doMatch(leftKey, dragState.current.value, dragState.current.source);
    setDragging(null);
    setOverLeft(null);
    dragState.current = null;
  };
  const onDragEnd = () => {
    setDragging(null);
    setOverLeft(null);
    dragState.current = null;
  };

  // ── Touch drag (mobile / tablet) ─────────────────────────
  const onTouchStart = useCallback((e, value, source) => {
    if (source === 'right' && usedRight.has(value)) return;
    e.preventDefault();
    const touch = e.touches[0];
    dragState.current = { value, source };
    setDragging({ value, source });
    createGhost(value, touch.clientX, touch.clientY);
  }, [usedRight]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    moveGhost(touch.clientX, touch.clientY);
    const key = getLeftKeyAt(touch.clientX, touch.clientY);
    setOverLeft(key);
  }, []);

  const onTouchEnd = useCallback((e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const key   = getLeftKeyAt(touch.clientX, touch.clientY);
    if (key && dragState.current) {
      doMatch(key, dragState.current.value, dragState.current.source);
    }
    removeGhost();
    setDragging(null);
    setOverLeft(null);
    dragState.current = null;
  }, []);

  // ── Core match logic ──────────────────────────────────────
  const doMatch = (leftKey, value, source) => {
    setMatches(prev => {
      const next = { ...prev };
      // If dragging from another slot, free that slot first
      if (source === 'slot') {
        const prevLeft = Object.keys(next).find(k => next[k] === value);
        if (prevLeft) delete next[prevLeft];
      }
      next[leftKey] = value;
      return next;
    });
  };

  const removeMatch = (leftKey) => {
    setMatches(prev => { const n = {...prev}; delete n[leftKey]; return n; });
  };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-center justify-between mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)} className="p-2 rounded-xl text-sky hover:bg-sky/10 transition-colors flex-shrink-0">
          <Volume2 size={18} />
        </button>
      </div>

      {/* Tip */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 px-3 py-2 rounded-xl bg-sky/5 border border-sky/15">
        Drag the blue words onto the matching boxes — works on touch too!
      </p>

      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        {/* Left column — drop targets */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Match these</p>
          {content.pairs.map(({ left }) => {
            const matched = matches[left];
            const isOver  = overLeft === left;
            return (
              <div key={left}
                data-left-key={left}
                onDragOver={e => onDragOver(e, left)}
                onDrop={() => onDrop(left)}
                onDragLeave={() => setOverLeft(null)}
                className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all min-h-[3rem] select-none
                  ${isOver  ? 'border-sky bg-sky/10 scale-[1.02]' : ''}
                  ${matched ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : ''}
                  ${!isOver && !matched ? 'border-gray-200 dark:border-gray-600' : ''}`}>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm select-none">{left}</span>
                {matched ? (
                  <button
                    draggable
                    onDragStart={() => onDragStart(matched, 'slot')}
                    onDragEnd={onDragEnd}
                    onTouchStart={e => onTouchStart(e, matched, 'slot')}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onClick={() => removeMatch(left)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-xl
                               text-xs font-bold cursor-grab active:cursor-grabbing hover:bg-rose-500 transition-colors touch-none">
                    {matched}
                    <X size={11} className="opacity-70" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600 italic">Drop here</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right column — draggable answers */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Drag to match</p>
          {rightItems.map(right => {
            const isUsed     = usedRight.has(right);
            const isDragging = dragging?.value === right;
            return (
              <div key={right}
                draggable={!isUsed}
                onDragStart={() => !isUsed && onDragStart(right, 'right')}
                onDragEnd={onDragEnd}
                onTouchStart={e => !isUsed && onTouchStart(e, right, 'right')}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className={`p-3 rounded-2xl border-2 text-sm font-bold text-center transition-all select-none touch-none
                  ${isUsed
                    ? 'opacity-30 cursor-not-allowed border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400'
                    : 'border-sky/50 bg-sky/10 text-sky cursor-grab active:cursor-grabbing hover:bg-sky/20 hover:border-sky hover:scale-105'
                  }
                  ${isDragging ? 'opacity-50 scale-95' : ''}`}>
                {right}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{Object.keys(matches).length}/{content.pairs.length} matched</span>
          {allMatched && <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle size={12} /> Ready!</span>}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky to-emerald-400 rounded-full transition-all duration-500"
            style={{ width:`${(Object.keys(matches).length / content.pairs.length) * 100}%` }} />
        </div>
      </div>

      <button onClick={() => allMatched && onSubmit(matches)}
        disabled={!allMatched || submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 disabled:cursor-not-allowed text-base">
        {submitting ? 'Checking…' : allMatched ? 'Check My Answers!' : `Match all ${content.pairs.length} pairs to continue`}
      </button>
    </div>
  );
}
