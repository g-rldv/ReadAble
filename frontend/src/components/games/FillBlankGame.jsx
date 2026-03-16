// ============================================================
// FillBlankGame — tap options to fill sentence blanks
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2 } from 'lucide-react';

export default function FillBlankGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();
  const [answers, setAnswers] = useState(new Array(content.sentences.length).fill(''));
  const [activeIdx, setActiveIdx] = useState(0);

  const pickAnswer = (opt) => {
    setAnswers(a => { const n = [...a]; n[activeIdx] = opt; return n; });
    // Move to next unfilled sentence
    const nextEmpty = answers.findIndex((a, i) => i > activeIdx && !a);
    if (nextEmpty !== -1) setActiveIdx(nextEmpty);
  };

  const clearAnswer = (idx) => {
    setAnswers(a => { const n = [...a]; n[idx] = ''; return n; });
    setActiveIdx(idx);
  };

  const allFilled = answers.every(a => a !== '');

  const handleSubmit = () => {
    if (!allFilled) return;
    onSubmit({ answers });
  };

  // Build sentence display with blank placeholder
  const renderSentence = (sentence, idx) => {
    const filled = answers[idx];
    const isActive = idx === activeIdx;
    const parts = sentence.text.split('___');
    return (
      <div key={idx}
        onClick={() => setActiveIdx(idx)}
        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all
          ${isActive ? 'border-sky shadow-md bg-sky/5' : 'border-gray-200 dark:border-gray-600 hover:border-sky/50'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-400">Sentence {idx + 1}</span>
          <button onClick={e => { e.stopPropagation(); speak(sentence.text.replace('___', filled || 'blank')); }}
            className="text-sky hover:text-sky-dark p-1 rounded-lg">
            <Volume2 size={14} />
          </button>
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-200 text-base leading-relaxed">
          {parts[0]}
          <button
            onClick={e => { e.stopPropagation(); if (filled) clearAnswer(idx); setActiveIdx(idx); }}
            className={`inline-flex items-center px-3 py-0.5 mx-1 rounded-lg border-2 border-dashed min-w-[80px] justify-center font-bold transition-all
              ${filled
                ? 'bg-sky text-white border-sky hover:bg-red-400 hover:border-red-400'
                : isActive
                ? 'border-sky text-sky bg-sky/10 animate-pulse'
                : 'border-gray-300 text-gray-400'
              }`}>
            {filled || '?'}
          </button>
          {parts[1]}
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)} className="p-2 rounded-xl text-sky hover:bg-sky/10">
          <Volume2 size={18} />
        </button>
      </div>

      {/* Sentences */}
      <div className="space-y-3 mb-6">
        {content.sentences.map((s, i) => renderSentence(s, i))}
      </div>

      {/* Word options for active sentence */}
      <div className="rounded-2xl border-2 border-dashed border-sky/30 bg-sky/5 p-4 mb-6">
        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
          Sentence {activeIdx + 1} — tap the right word:
        </p>
        <div className="flex flex-wrap gap-3">
          {content.sentences[activeIdx]?.options.map(opt => {
            const isSelected = answers[activeIdx] === opt;
            return (
              <button key={opt} onClick={() => pickAnswer(opt)}
                className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border-2
                  ${isSelected
                    ? 'bg-sky text-white border-sky shadow-md scale-105'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-sky hover:text-sky hover:-translate-y-0.5'
                  }`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{answers.filter(Boolean).length}/{content.sentences.length} filled</span>
          {allFilled && <span className="text-mint font-bold">All filled! ✓</span>}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-coral to-sunny rounded-full transition-all duration-500"
            style={{ width: `${(answers.filter(Boolean).length / content.sentences.length) * 100}%` }} />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!allFilled || submitting}
        className="btn-game w-full bg-coral text-white disabled:opacity-40 disabled:cursor-not-allowed text-lg">
        {submitting ? '⏳ Checking…' : allFilled ? '✅ Check My Answers!' : 'Fill in all blanks to continue'}
      </button>
    </div>
  );
}
