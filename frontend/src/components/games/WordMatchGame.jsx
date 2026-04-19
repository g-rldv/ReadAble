// ============================================================
// WordMatchGame — tap-to-select on mobile, drag on desktop
// - TTS on each left-side word and right-side option
// - Streamlined UI — no redundant tip text clutter
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle, X } from 'lucide-react';

export default function WordMatchGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();

  const [rightItems] = useState(() =>
    [...content.pairs.map(p => p.right)].sort(() => Math.random() - 0.5)
  );
  const [matches, setMatches] = useState({});
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [overLeft, setOverLeft] = useState(null);
  const ghostRef = useRef(null);
  const dragState = useRef(null);

  const usedRight = new Set(Object.values(matches));
  const allMatched = content.pairs.every(p => matches[p.left]);

  useEffect(() => () => { ghostRef.current?.remove(); }, []);

  const createGhost = (text, x, y) => {
    ghostRef.current?.remove();
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed', zIndex: '9999', pointerEvents: 'none',
      background: '#4D96FF', color: '#fff',
      padding: '8px 16px', borderRadius: '12px',
      fontWeight: '700', fontSize: '13px', fontFamily: 'inherit',
      transform: 'translate(-50%,-50%) scale(1.08)',
      boxShadow: '0 8px 20px rgba(77,150,255,0.4)',
      whiteSpace: 'nowrap', left: `${x}px`, top: `${y}px`,
    });
    document.body.appendChild(el);
    ghostRef.current = el;
  };
  const moveGhost = (x, y) => {
    if (!ghostRef.current) return;
    ghostRef.current.style.left = `${x}px`;
    ghostRef.current.style.top = `${y}px`;
  };
  const removeGhost = () => { ghostRef.current?.remove(); ghostRef.current = null; };

  const getLeftKeyAt = (x, y) => {
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    if (ghostRef.current) ghostRef.current.style.visibility = '';
    let node = el;
    while (node) { if (node.dataset?.leftKey) return node.dataset.leftKey; node = node.parentElement; }
    return null;
  };

  const doMatch = (leftKey, value, source) => {
    setMatches(prev => {
      const next = { ...prev };
      if (source === 'slot') {
        const old = Object.keys(next).find(k => next[k] === value);
        if (old) delete next[old];
      }
      next[leftKey] = value;
      return next;
    });
    setSelected(null);
  };
  const removeMatch = (leftKey) => {
    setMatches(prev => { const n = { ...prev }; delete n[leftKey]; return n; });
    setSelected(null);
  };

  const handleTapRight = (value) => {
    if (usedRight.has(value)) return;
    setSelected(prev => prev === value ? null : value);
  };
  const handleTapSlot = (leftKey) => {
    if (selected) {
      doMatch(leftKey, selected, 'right');
    } else if (matches[leftKey]) {
      setSelected(matches[leftKey]);
      removeMatch(leftKey);
    }
  };

  const onDragStart = (value, source) => { setDragging({ value, source }); dragState.current = { value, source }; };
  const onDragOver = (e, k) => { e.preventDefault(); setOverLeft(k); };
  const onDrop = (k) => {
    if (!dragState.current) return;
    doMatch(k, dragState.current.value, dragState.current.source);
    setDragging(null); setOverLeft(null); dragState.current = null;
  };
  const onDragEnd = () => { setDragging(null); setOverLeft(null); dragState.current = null; };

  const onTouchStart = useCallback((e, value, source) => {
    if (source === 'right' && usedRight.has(value)) return;
    e.preventDefault();
    const t = e.touches[0];
    dragState.current = { value, source };
    setDragging({ value, source });
    setSelected(null);
    createGhost(value, t.clientX, t.clientY);
  }, [usedRight]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    moveGhost(t.clientX, t.clientY);
    setOverLeft(getLeftKeyAt(t.clientX, t.clientY));
  }, []);

  const onTouchEnd = useCallback((e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const key = getLeftKeyAt(t.clientX, t.clientY);
    if (key && dragState.current) doMatch(key, dragState.current.value, dragState.current.source);
    removeGhost();
    setDragging(null); setOverLeft(null); dragState.current = null;
  }, []);

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction}
        </p>
        <button
          onClick={() => speak(content.instruction)}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
          <Volume2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left — drop targets */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Match these</p>
          {content.pairs.map(({ left }) => {
            const matched = matches[left];
            const isOver = overLeft === left;
            const isTarget = !!selected && !matched;
            return (
              <div
                key={left}
                data-left-key={left}
                onDragOver={e => onDragOver(e, left)}
                onDrop={() => onDrop(left)}
                onDragLeave={() => setOverLeft(null)}
                onClick={() => handleTapSlot(left)}
                className="flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer select-none"
                style={{
                  borderColor: isOver ? '#4D96FF' : matched ? '#34d399' : isTarget ? 'rgba(77,150,255,0.5)' : 'var(--border-color)',
                  background: isOver ? 'rgba(77,150,255,0.07)' : matched ? 'rgba(52,211,153,0.06)' : 'var(--bg-card)',
                  borderStyle: isTarget && !isOver && !matched ? 'dashed' : 'solid',
                }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={e => { e.stopPropagation(); speak(left); }}
                    className="p-1 rounded-lg text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
                    <Volume2 size={11} />
                  </button>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{left}</span>
                </div>
                {matched ? (
                  <button
                    draggable
                    onDragStart={() => onDragStart(matched, 'slot')}
                    onDragEnd={onDragEnd}
                    onTouchStart={e => { e.stopPropagation(); onTouchStart(e, matched, 'slot'); }}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onClick={e => { e.stopPropagation(); removeMatch(left); }}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-lg
                               text-xs font-bold cursor-grab hover:bg-rose-500 transition-colors touch-none flex-shrink-0 ml-1">
                    <span className="truncate max-w-[60px]">{matched}</span>
                    <X size={9} className="flex-shrink-0 opacity-70" />
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 italic flex-shrink-0">
                    {isTarget ? 'tap!' : 'drop'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right — answer chips */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Drag to match</p>
          {rightItems.map(right => {
            const isUsed = usedRight.has(right);
            const isDragging = dragging?.value === right;
            const isSelected = selected === right;
            return (
              <div
                key={right}
                draggable={!isUsed}
                onDragStart={() => !isUsed && onDragStart(right, 'right')}
                onDragEnd={onDragEnd}
                onTouchStart={e => !isUsed && onTouchStart(e, right, 'right')}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="flex items-center justify-between p-3 rounded-2xl border-2 transition-all select-none touch-none"
                style={{
                  borderColor: isUsed ? 'var(--border-color)' : isSelected ? '#4D96FF' : 'rgba(77,150,255,0.35)',
                  background: isUsed ? 'var(--bg-primary)' : isSelected ? '#4D96FF' : 'rgba(77,150,255,0.05)',
                  opacity: isUsed ? 0.3 : isDragging ? 0.35 : 1,
                  cursor: isUsed ? 'not-allowed' : 'grab',
                }}>
                <span
                  onClick={() => !isUsed && handleTapRight(right)}
                  className="font-bold text-sm flex-1"
                  style={{ color: isUsed ? 'var(--text-muted)' : isSelected ? '#fff' : '#4D96FF' }}>
                  {right}
                </span>
                {!isUsed && (
                  <button
                    onClick={e => { e.stopPropagation(); speak(right); }}
                    className="p-1 rounded-lg hover:opacity-70 flex-shrink-0 transition-opacity"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(77,150,255,0.6)' }}>
                    <Volume2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{Object.keys(matches).length}/{content.pairs.length} matched</span>
          {allMatched && (
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle size={11} /> Ready!
            </span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(Object.keys(matches).length / content.pairs.length) * 100}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => allMatched && onSubmit(matches)}
        disabled={!allMatched || submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 text-base">
        {submitting ? 'Checking…' : allMatched ? 'Check Answers' : `Match all ${content.pairs.length} pairs`}
      </button>
    </div>
  );
}
