// ============================================================
// PictureWordGame — tap the right word for each emoji picture
// ============================================================
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PictureWordGame({ activity, onSubmit, submitting }) {
  const { content } = activity;
  const { speak } = useSettings();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(new Array(content.items.length).fill(''));
  const [justAnswered, setJustAnswered] = useState(false);

  const current = content.items[currentIdx];
  const picked  = answers[currentIdx];

  const pickAnswer = (opt) => {
    if (justAnswered) return;
    setAnswers(a => { const n = [...a]; n[currentIdx] = opt; return n; });
    setJustAnswered(true);
    speak(opt);
    setTimeout(() => {
      setJustAnswered(false);
      if (currentIdx + 1 < content.items.length) setCurrentIdx(i => i + 1);
    }, 900);
  };

  const goTo = (idx) => { setCurrentIdx(idx); setJustAnswered(false); };

  const allAnswered = answers.every(a => a !== '');
  const handleSubmit = () => onSubmit({ answers });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300">{content.instruction}</p>
        <button onClick={() => speak(content.instruction)} className="p-2 rounded-xl text-sky hover:bg-sky/10">
          <Volume2 size={18} />
        </button>
      </div>

      {/* Dot progress */}
      <div className="flex justify-center gap-2 mb-6">
        {content.items.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === currentIdx ? 'w-6 h-3 bg-sky' :
              answers[i]       ? 'w-3 h-3 bg-mint' :
                                 'w-3 h-3 bg-gray-200 dark:bg-gray-600'
            }`} />
        ))}
      </div>

      {/* Big picture */}
      <div className="text-center mb-6 animate-pop" key={currentIdx}>
        <div className="text-[7rem] leading-none animate-float mb-2" role="img" aria-label="picture">
          {current.picture}
        </div>
        <p className="text-sm text-gray-400 font-semibold">
          Question {currentIdx + 1} of {content.items.length}
        </p>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {current.options.map(opt => {
          const isSelected = picked === opt;
          const isCorrect  = opt === current.answer;
          let cls = 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-sky hover:bg-sky/5';
          if (isSelected && justAnswered) {
            cls = isCorrect
              ? 'border-mint bg-mint text-white scale-105 shadow-glow-mint'
              : 'border-coral bg-coral text-white shake';
          } else if (isSelected && !justAnswered) {
            cls = 'border-sky bg-sky/20 text-sky';
          }
          return (
            <button key={opt} onClick={() => pickAnswer(opt)}
              className={`py-4 rounded-2xl font-bold border-2 transition-all duration-200 text-base ${cls}`}>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goTo(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm disabled:opacity-30 hover:bg-sky/10 transition-colors">
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="text-sm text-gray-400 font-semibold">
          {answers.filter(Boolean).length}/{content.items.length} answered
        </span>
        <button onClick={() => goTo(Math.min(content.items.length - 1, currentIdx + 1))}
          disabled={currentIdx === content.items.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm disabled:opacity-30 hover:bg-sky/10 transition-colors">
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* All answered — submit */}
      {allAnswered && (
        <button onClick={handleSubmit} disabled={submitting}
          className="btn-game w-full bg-coral text-white text-lg animate-pop">
          {submitting ? '⏳ Checking…' : '✅ Check My Answers!'}
        </button>
      )}
    </div>
  );
}
