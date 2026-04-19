// ============================================================
// PictureWordGame — one picture per page, tap to select, no hint feedback
// - Each item shown individually as its own "page"
// - No next/previous buttons — auto-advances after selection
// - No correct/wrong hint shown simultaneously
// - TTS on each picture item and each option
// ============================================================
import React, { useState, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle } from 'lucide-react';

export default function PictureWordGame({ activity, onSubmit, submitting }) {
  const rawContent = activity?.content;
  const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
  const items = content?.items ?? [];
  const { speak } = useSettings();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => new Array(items.length).fill(null));
  const [selected, setSelected] = useState(null); // pending selection for current item

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-semibold">No questions found for this activity.</p>
      </div>
    );
  }

  const isLastItem = currentIdx === items.length - 1;
  const allAnswered = answers.every(a => a !== null);
  const currentItem = items[currentIdx];
  const currentAnswer = answers[currentIdx];

  const handlePick = useCallback((opt) => {
    // If already answered this item, don't allow change
    if (currentAnswer !== null) return;

    speak(opt);

    const next = [...answers];
    next[currentIdx] = opt;
    setAnswers(next);
    setSelected(opt);

    // Auto-advance after a short delay
    setTimeout(() => {
      setSelected(null);
      if (!isLastItem) {
        setCurrentIdx(i => i + 1);
      }
    }, 600);
  }, [answers, currentIdx, currentAnswer, isLastItem, speak]);

  const handleSubmit = () => {
    if (!allAnswered || submitting) return;
    onSubmit({ answers: answers.map(a => a ?? '') });
  };

  const answeredCount = answers.filter(a => a !== null).length;

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction || 'Look at each picture and choose the correct word.'}
        </p>
        <button
          onClick={() => speak(content.instruction || 'Look at each picture and choose the correct word.')}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
          <Volume2 size={15} />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-5">
        {items.map((_, i) => (
          <div
            key={i}
            className={`transition-all duration-300 rounded-full ${
              i === currentIdx
                ? 'w-7 h-3 bg-sky'
                : answers[i] !== null
                ? 'w-3 h-3 bg-emerald-400'
                : 'w-3 h-3 bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Single item card */}
      <div
        key={currentIdx}
        className="rounded-2xl border-2 p-5 mb-5 animate-pop"
        style={{
          borderColor: currentAnswer !== null ? 'rgba(77,150,255,0.4)' : 'var(--border-color)',
          background: 'var(--bg-card)',
        }}>

        {/* Counter */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-sky bg-sky/10 px-2.5 py-1 rounded-full">
            {currentIdx + 1} / {items.length}
          </span>
          <button
            onClick={() => speak(currentItem.picture + '... ' + (currentAnswer || 'choose a word'))}
            className="p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors">
            <Volume2 size={14} />
          </button>
        </div>

        {/* Picture */}
        <div className="flex justify-center mb-6">
          <span className="text-8xl leading-none select-none animate-float" role="img">
            {currentItem.picture}
          </span>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {(currentItem.options ?? []).map(opt => {
            const isSelected = currentAnswer === opt;

            return (
              <button
                key={opt}
                onClick={() => handlePick(opt)}
                disabled={currentAnswer !== null}
                className="flex items-center justify-between px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95"
                style={{
                  borderColor: isSelected
                    ? '#4D96FF'
                    : 'var(--border-color)',
                  background: isSelected
                    ? 'rgba(77,150,255,0.12)'
                    : 'var(--bg-primary)',
                  color: isSelected ? '#4D96FF' : 'var(--text-primary)',
                  cursor: currentAnswer !== null ? 'default' : 'pointer',
                  opacity: currentAnswer !== null && !isSelected ? 0.5 : 1,
                }}>
                <span>{opt}</span>
                <button
                  onClick={e => { e.stopPropagation(); speak(opt); }}
                  className="p-1 rounded-lg hover:opacity-70 transition-opacity flex-shrink-0 ml-1"
                  style={{ color: isSelected ? '#4D96FF' : '#9ca3af' }}>
                  <Volume2 size={11} />
                </button>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit — only shown when all answered */}
      {allAnswered && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3 text-emerald-500">
            <CheckCircle size={16} />
            <span className="text-sm font-bold">All {items.length} answered!</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-game w-full bg-coral text-white text-base">
            {submitting ? 'Checking…' : 'Check Answers'}
          </button>
        </div>
      )}
    </div>
  );
}
