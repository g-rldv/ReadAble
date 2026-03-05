// ============================================================
// WordMatchGame — drag left-column words onto right-column slots
// ============================================================
import React, { useState, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle } from 'lucide-react';

export default function WordMatchGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();

  // Shuffle the right-column options
  const [rightItems] = useState(() => [...content.pairs.map(p => p.right)].sort(() => Math.random() - 0.5));
  // Matches: { leftWord: rightWord }
  const [matches, setMatches] = useState({});
  // Track which right items are used
  const usedRight = new Set(Object.values(matches));

  // Drag state
  const [dragging, setDragging] = useState(null); // { type: 'right'|'matched', value }
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (value, type = 'right') => setDragging({ value, type });
  const handleDragEnd   = () => { setDragging(null); setDragOver(null); };

  const handleDropOnLeft = (leftWord) => {
    if (!dragging) return;
    setMatches(m => ({ ...m, [leftWord]: dragging.value }));
    setDragging(null); setDragOver(null);
  };

  // Remove a match by clicking the right word in a slot
  const removeMatch = (leftWord) => setMatches(m => { const n = {...m}; delete n[leftWord]; return n; });

  const allMatched = content.pairs.every(p => matches[p.left]);

  const handleSubmit = () => {
    if (!allMatched) return;
    onSubmit(matches);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)} className="p-2 rounded-xl text-sky hover:bg-sky/10 transition-colors">
          <Volume2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left column — items to match FROM */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Match these ↓</p>
          {content.pairs.map(({ left }) => (
            <div key={left}
              onDragOver={e => { e.preventDefault(); setDragOver(left); }}
              onDrop={() => handleDropOnLeft(left)}
              onDragLeave={() => setDragOver(null)}
              className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all min-h-[3rem]
                ${dragOver === left ? 'border-sky bg-sky/10 scale-102' : 'border-gray-200 dark:border-gray-600'}
                ${matches[left] ? 'border-mint bg-mint/10' : ''}`}>
              <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{left}</span>
              {matches[left] ? (
                <button
                  onClick={() => removeMatch(left)}
                  draggable
                  onDragStart={() => handleDragStart(matches[left], 'matched')}
                  className="px-3 py-1 bg-mint text-white rounded-xl text-sm font-bold cursor-grab flex items-center gap-1 hover:bg-red-400 transition-colors">
                  {matches[left]}
                  <span className="text-xs opacity-70">✕</span>
                </button>
              ) : (
                <span className="text-xs text-gray-300 dark:text-gray-600 italic">Drop here</span>
              )}
            </div>
          ))}
        </div>

        {/* Right column — draggable answers */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Drag to match ↓</p>
          {rightItems.map(right => {
            const isUsed = usedRight.has(right);
            return (
              <div key={right}
                draggable={!isUsed}
                onDragStart={() => !isUsed && handleDragStart(right)}
                onDragEnd={handleDragEnd}
                className={`word-card p-3 rounded-2xl border-2 text-sm font-bold text-center transition-all
                  ${isUsed
                    ? 'opacity-30 cursor-not-allowed border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400'
                    : 'border-sky/50 bg-sky/10 text-sky cursor-grab hover:bg-sky/20 hover:border-sky'
                  }
                  ${dragging?.value === right ? 'opacity-60 scale-105' : ''}`}>
                {right}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-6 mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{Object.keys(matches).length}/{content.pairs.length} matched</span>
          {allMatched && <span className="text-mint font-bold">Ready to submit! ✓</span>}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky to-mint rounded-full transition-all duration-500"
            style={{ width: `${(Object.keys(matches).length / content.pairs.length) * 100}%` }} />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allMatched || submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 disabled:cursor-not-allowed text-lg">
        {submitting ? '⏳ Checking…' : allMatched ? '✅ Check My Answers!' : `Match all ${content.pairs.length} pairs to continue`}
      </button>
    </div>
  );
}
