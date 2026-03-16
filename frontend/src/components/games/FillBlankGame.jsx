// ============================================================
// FillBlankGame — tap options to fill sentence blanks
// Fully responsive — large tap targets for mobile
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2 } from 'lucide-react';

export default function FillBlankGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak }   = useSettings();
  const [answers,   setAnswers]   = useState(new Array(content.sentences.length).fill(''));
  const [activeIdx, setActiveIdx] = useState(0);

  const pickAnswer = (opt) => {
    const next = [...answers];
    next[activeIdx] = opt;
    setAnswers(next);
    // Move to next unfilled
    const nextEmpty = next.findIndex((a, i) => i > activeIdx && !a);
    if (nextEmpty !== -1) setActiveIdx(nextEmpty);
  };

  const clearAnswer = (idx) => {
    const next = [...answers]; next[idx] = '';
    setAnswers(next); setActiveIdx(idx);
  };

  const allFilled = answers.every(a => a !== '');

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0">
          <Volume2 size={16}/>
        </button>
      </div>

      {/* Sentences */}
      <div className="space-y-3 mb-5">
        {content.sentences.map((s, idx) => {
          const filled   = answers[idx];
          const isActive = idx === activeIdx;
          const parts    = s.text.split('___');
          return (
            <div key={idx} onClick={() => setActiveIdx(idx)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all
                ${isActive
                  ? 'border-sky shadow-sm'
                  : 'border-gray-200 dark:border-gray-600 hover:border-sky/40'}`}
              style={{ background: isActive ? 'rgba(77,150,255,0.04)' : 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-400">Sentence {idx + 1}</span>
                <button onClick={e => { e.stopPropagation(); speak(s.text.replace('___', filled || 'blank')); }}
                  className="text-sky p-1 rounded-lg hover:bg-sky/10">
                  <Volume2 size={13}/>
                </button>
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-base leading-relaxed">
                {parts[0]}
                <button
                  onClick={e => { e.stopPropagation(); if (filled) clearAnswer(idx); else setActiveIdx(idx); }}
                  className={`inline-flex items-center px-2.5 py-0.5 mx-1 rounded-lg border-2 border-dashed
                              min-w-[72px] justify-center font-bold transition-all text-sm
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

      {/* Option chips */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Choose a word:</p>
        <div className="flex flex-wrap gap-2">
          {content.options.map(opt => {
            const isChosen = answers[activeIdx] === opt;
            return (
              <button key={opt} onClick={() => pickAnswer(opt)}
                className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all
                            
                  ${isChosen
                    ? 'bg-sky text-white border-sky'
                    : 'border-sky/40 text-sky hover:bg-sky/10 hover:border-sky'}`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={() => allFilled && onSubmit({ answers })}
        disabled={!allFilled || submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 text-base">
        {submitting ? 'Checking…' : allFilled ? 'Check Answers!' : `Fill all ${content.sentences.length} blanks`}
      </button>
    </div>
  );
}
