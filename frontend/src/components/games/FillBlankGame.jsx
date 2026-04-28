// ============================================================
// FillBlankGame — tap options to fill sentence blanks
// Fix: activeOptions was referenced but never defined — now
// correctly derived from content.sentences[activeIdx]?.options
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2 } from 'lucide-react';

export default function FillBlankGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();
  const [answers, setAnswers] = useState(new Array(content.sentences.length).fill(''));
  const [activeIdx, setActiveIdx] = useState(0);

  // ← THE FIX: derive activeOptions from the current sentence
  const activeOptions = content.sentences[activeIdx]?.options || [];

  const pickAnswer = (opt) => {
    const next = [...answers];
    next[activeIdx] = opt;
    setAnswers(next);
    speak(opt);
    const nextEmpty = next.findIndex((a, i) => i > activeIdx && !a);
    if (nextEmpty !== -1) setActiveIdx(nextEmpty);
  };

  const clearAnswer = (idx) => {
    const next = [...answers];
    next[idx] = '';
    setAnswers(next);
    setActiveIdx(idx);
  };

  const allFilled = answers.every(a => a !== '');

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

      {/* Sentences */}
      <div className="space-y-2.5 mb-5">
        {content.sentences.map((s, idx) => {
          const filled = answers[idx];
          const isActive = idx === activeIdx;
          const parts = s.text.split('___');
          return (
            <div
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className="p-3.5 rounded-2xl border-2 cursor-pointer transition-all"
              style={{
                borderColor: isActive ? '#4D96FF' : filled ? 'rgba(77,150,255,0.3)' : 'var(--border-color)',
                background: isActive ? 'rgba(77,150,255,0.04)' : 'var(--bg-card)',
                boxShadow: isActive ? '0 2px 10px rgba(77,150,255,0.12)' : 'none',
              }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">Sentence {idx + 1}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    speak(s.text.replace('___', filled || 'blank'));
                  }}
                  className="p-1 rounded-lg text-sky hover:bg-sky/10 transition-colors">
                  <Volume2 size={12} />
                </button>
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                {parts[0]}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (filled) clearAnswer(idx);
                    else setActiveIdx(idx);
                  }}
                  className={`inline-flex items-center px-2.5 py-0.5 mx-1 rounded-lg border-2 border-dashed
                    min-w-[68px] justify-center font-bold transition-all text-sm
                    ${filled
                      ? 'bg-sky text-white border-sky hover:bg-rose-400 hover:border-rose-400'
                      : isActive
                      ? 'border-sky text-sky bg-sky/10 animate-pulse'
                      : 'border-gray-300 text-gray-400 dark:border-gray-600'
                    }`}>
                  {filled || '?'}
                </button>
                {parts[1]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Option buttons — full-width grid */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
          Choose for sentence {activeIdx + 1}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(activeOptions.length, 4)}, 1fr)`,
            gap: 8,
          }}>
          {activeOptions.map(opt => {
            const isChosen = answers[activeIdx] === opt;
            return (
              <button
                key={opt}
                onClick={() => pickAnswer(opt)}
                className="flex items-center justify-between px-3 py-3 rounded-xl border-2 font-bold text-sm transition-all min-h-[48px] w-full"
                style={{
                  borderColor: isChosen ? '#4D96FF' : 'rgba(77,150,255,0.35)',
                  background: isChosen ? '#4D96FF' : 'transparent',
                  color: isChosen ? '#fff' : '#4D96FF',
                }}>
                <span className="flex-1 text-left truncate">
                  {opt}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); speak(opt); }}
                  className="ml-2 flex-shrink-0 hover:opacity-70 transition-opacity"
                  style={{ color: isChosen ? 'rgba(255,255,255,0.7)' : 'rgba(77,150,255,0.6)' }}>
                  <Volume2 size={11} />
                </button>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => allFilled && onSubmit({ answers })}
        disabled={!allFilled || submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 text-base">
        {submitting ? 'Checking…' : allFilled ? 'Check Answers' : `Fill all ${content.sentences.length} blanks`}
      </button>
    </div>
  );
}
