// ============================================================
// PictureWordGame — tap options to match each picture
// - No prev/next navigation (all questions visible as a grid)
// - No simultaneous answer reveal on wrong pick
// - TTS on each picture item and each option
// - Clean, uncluttered UI
// ============================================================
import React, { useState, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Volume2, CheckCircle } from 'lucide-react';

export default function PictureWordGame({ activity, onSubmit, submitting }) {
  const rawContent = activity?.content;
  const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
  const items = content?.items ?? [];
  const { speak } = useSettings();

  const [answers, setAnswers] = useState(() => new Array(items.length).fill(null));
  const [confirmed, setConfirmed] = useState(() => new Array(items.length).fill(false));

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-semibold">No questions found for this activity.</p>
      </div>
    );
  }

  const answeredCount = answers.filter(a => a !== null).length;
  const allAnswered = answeredCount === items.length;

  const pickAnswer = useCallback((opt, idx) => {
    if (confirmed[idx]) return;
    setAnswers(prev => {
      const next = [...prev];
      // Toggle off if same option tapped again
      next[idx] = prev[idx] === opt ? null : opt;
      return next;
    });
  }, [confirmed]);

  const handleSubmit = () => {
    if (!allAnswered || submitting) return;
    onSubmit({ answers: answers.map(a => a ?? '') });
  };

  return (
    <div>
      {/* Instruction */}
      <div className="flex items-start justify-between gap-2 mb-5">
        <p className="font-bold text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {content.instruction || 'Look at each picture and choose the correct word.'}
        </p>
        <button
          onClick={() => speak(content.instruction || 'Look at each picture and choose the correct word.')}
          className="p-2 rounded-xl text-sky hover:bg-sky/10 flex-shrink-0 transition-colors">
          <Volume2 size={15} />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-semibold">
          <span>{answeredCount} of {items.length} answered</span>
          {allAnswered && (
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle size={12} /> Ready to check!
            </span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(answeredCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* All questions */}
      <div className="space-y-4 mb-5">
        {items.map((item, idx) => {
          const selected = answers[idx];
          return (
            <div key={idx}
              className="rounded-2xl border-2 p-4 transition-all"
              style={{
                borderColor: selected ? 'rgba(77,150,255,0.4)' : 'var(--border-color)',
                background: 'var(--bg-card)',
              }}>
              {/* Picture + TTS */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl leading-none select-none" role="img">{item.picture}</span>
                  <button
                    onClick={() => speak(item.picture + '... ' + (selected || 'choose a word'))}
                    className="p-1.5 rounded-lg text-sky hover:bg-sky/10 transition-colors">
                    <Volume2 size={13} />
                  </button>
                </div>
                {selected && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky/15 text-sky">
                    {selected}
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-2">
                {(item.options ?? []).map(opt => {
                  const isSelected = selected === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => pickAnswer(opt, idx)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-all active:scale-95"
                      style={{
                        borderColor: isSelected ? '#4D96FF' : 'var(--border-color)',
                        background: isSelected ? 'rgba(77,150,255,0.1)' : 'var(--bg-primary)',
                        color: isSelected ? '#4D96FF' : 'var(--text-primary)',
                      }}>
                      <span>{opt}</span>
                      <button
                        onClick={e => { e.stopPropagation(); speak(opt); }}
                        className="p-1 rounded-lg hover:bg-sky/10 transition-colors flex-shrink-0 ml-1"
                        style={{ color: isSelected ? '#4D96FF' : '#9ca3af' }}>
                        <Volume2 size={11} />
                      </button>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className={`btn-game w-full text-white text-base transition-all
          ${allAnswered ? 'bg-coral' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60'}`}>
        {submitting
          ? 'Checking…'
          : allAnswered
          ? 'Check Answers'
          : `Answer all ${items.length} questions first`}
      </button>
    </div>
  );
}
