// ============================================================
// GamePage — loads activity, renders game, shows answer summary
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { launchConfetti } from '../utils/confetti';
import WordMatchGame    from '../components/games/WordMatchGame';
import FillBlankGame    from '../components/games/FillBlankGame';
import SentenceSortGame from '../components/games/SentenceSortGame';
import PictureWordGame  from '../components/games/PictureWordGame';
import { ArrowLeft, Volume2, RotateCcw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const GAME_COMPONENTS = {
  word_match:    WordMatchGame,
  fill_blank:    FillBlankGame,
  sentence_sort: SentenceSortGame,
  picture_word:  PictureWordGame,
};

// ── Per-type answer summary ───────────────────────────────────

function WordMatchSummary({ content, userAnswer, correctAnswer }) {
  return (
    <div className="space-y-2">
      {content.pairs.map(({ left }) => {
        const given   = userAnswer?.[left];
        const correct = correctAnswer?.[left];
        const isRight = given === correct;
        return (
          <div key={left}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              isRight ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
                      : 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800'
            }`}>
            {isRight
              ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
              : <XCircle    size={16} className="text-rose-400 flex-shrink-0" />
            }
            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm w-28 flex-shrink-0">{left}</span>
            <span className="text-gray-400 text-sm flex-shrink-0">→</span>
            {isRight ? (
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{correct}</span>
            ) : (
              <span className="text-sm flex gap-2 flex-wrap">
                <span className="line-through text-rose-400">{given || '—'}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ {correct}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FillBlankSummary({ content, userAnswer, correctAnswer }) {
  const given   = userAnswer?.answers || [];
  const correct = correctAnswer?.answers || [];
  return (
    <div className="space-y-3">
      {content.sentences.map((s, i) => {
        const isRight = given[i]?.toLowerCase() === correct[i]?.toLowerCase();
        const parts   = s.text.split('___');
        return (
          <div key={i}
            className={`p-3 rounded-xl border ${
              isRight ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
                      : 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800'
            }`}>
            <div className="flex items-start gap-2">
              {isRight
                ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle    size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
              }
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {parts[0]}
                <span className={`inline-block mx-1 px-2 py-0.5 rounded-lg font-bold text-xs ${
                  isRight ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                           : 'bg-rose-200 text-rose-700 dark:bg-rose-800 dark:text-rose-200'
                }`}>
                  {given[i] || '—'}
                </span>
                {parts[1]}
              </p>
            </div>
            {!isRight && (
              <p className="text-xs mt-1.5 ml-6 text-emerald-600 dark:text-emerald-400 font-semibold">
                Correct answer: <span className="font-bold">{correct[i]}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SentenceSortSummary({ userAnswer, correctAnswer }) {
  const given   = userAnswer?.order || [];
  const correct = correctAnswer?.order || [];
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Correct Order</p>
      {correct.map((sentence, i) => {
        const userPos  = given.indexOf(sentence);
        const isRight  = userPos === i;
        return (
          <div key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              isRight ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
                      : 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800'
            }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isRight ? 'bg-emerald-500 text-white' : 'bg-rose-400 text-white'
            }`}>{i + 1}</div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{sentence}</p>
              {!isRight && userPos !== -1 && (
                <p className="text-xs mt-1 text-rose-400">
                  You placed this at position {userPos + 1}
                </p>
              )}
            </div>
            {isRight
              ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              : <XCircle    size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
            }
          </div>
        );
      })}
    </div>
  );
}

function PictureWordSummary({ content, userAnswer, correctAnswer }) {
  const given   = userAnswer?.answers  || [];
  const correct = correctAnswer?.answers || [];
  return (
    <div className="grid grid-cols-2 gap-3">
      {content.items.map((item, i) => {
        const isRight = given[i] === correct[i];
        return (
          <div key={i}
            className={`p-3 rounded-xl border text-center ${
              isRight ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
                      : 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800'
            }`}>
            <div className="text-3xl mb-2">{item.picture}</div>
            {isRight ? (
              <div className="flex items-center justify-center gap-1">
                <CheckCircle size={13} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{correct[i]}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <XCircle size={13} className="text-rose-400" />
                  <span className="text-xs line-through text-rose-400">{given[i] || '—'}</span>
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ {correct[i]}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Summary wrapper with expand toggle ───────────────────────
function AnswerSummary({ activity, userAnswer }) {
  const [open, setOpen] = useState(false);
  const correct = activity.correct_answer;

  const summaryMap = {
    word_match:    <WordMatchSummary    content={activity.content} userAnswer={userAnswer} correctAnswer={correct} />,
    fill_blank:    <FillBlankSummary    content={activity.content} userAnswer={userAnswer} correctAnswer={correct} />,
    sentence_sort: <SentenceSortSummary                            userAnswer={userAnswer} correctAnswer={correct} />,
    picture_word:  <PictureWordSummary  content={activity.content} userAnswer={userAnswer} correctAnswer={correct} />,
  };

  const summary = summaryMap[activity.type];
  if (!summary) return null;

  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ background: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">
          View Answer Summary
        </span>
        {open
          ? <ChevronUp   size={18} className="text-gray-400" />
          : <ChevronDown size={18} className="text-gray-400" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
          {summary}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function GamePage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const { refreshUser }  = useAuth();
  const { speak, settings } = useSettings();

  const [activity,   setActivity]   = useState(null);
  const [userProg,   setUserProg]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [lastAnswer, setLastAnswer] = useState(null); // ← store for summary
  const [gameKey,    setGameKey]    = useState(0);
  const resultRef = useRef(null);

  useEffect(() => {
    api.get(`/activities/${id}`)
      .then(res => {
        setActivity(res.data.activity);
        setUserProg(res.data.userProgress);
        if (settings.tts_enabled) {
          setTimeout(() => speak(res.data.activity.content.instruction || res.data.activity.title), 500);
        }
      })
      .catch(() => navigate('/activities'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (answer) => {
    if (submitting) return;
    setSubmitting(true);
    setLastAnswer(answer); // ← save before POST
    try {
      const res  = await api.post(`/activities/${id}/submit`, { answer });
      const data = res.data;
      setResult(data);
      if (data.isCorrect) launchConfetti();
      speak(data.feedback);
      await refreshUser();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setLastAnswer(null);
    setGameKey(k => k + 1);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-5xl animate-bounce">🎮</div>
      <p className="font-display text-xl text-sky">Loading game…</p>
    </div>
  );

  const GameComponent = GAME_COMPONENTS[activity?.type];
  const diffColors    = {
    easy:   'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    hard:   'bg-rose-100 text-rose-600',
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-4">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link to="/activities"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft size={22} className="text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-gray-800 dark:text-gray-200 truncate">{activity?.title}</h1>
          <p className="text-sm text-gray-400 truncate">{activity?.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${diffColors[activity?.difficulty]}`}>
            {activity?.difficulty}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky/10 text-sky">
            +{activity?.xp_reward} XP
          </span>
          <button
            onClick={() => speak(activity?.content?.instruction || activity?.title)}
            className="p-2 rounded-xl bg-sky/10 text-sky hover:bg-sky/20 transition-colors"
            title="Read instructions aloud">
            <Volume2 size={18} />
          </button>
        </div>
      </div>

      {/* ── Previous best ──────────────────────────────────── */}
      {userProg && !result && (
        <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3 text-sm">
          <span className="text-gray-400">Best score:</span>
          <span className={`font-bold ${userProg.score >= 80 ? 'text-emerald-500' : userProg.score >= 50 ? 'text-amber-500' : 'text-rose-400'}`}>
            {userProg.score}%
          </span>
          <span className="text-gray-400">• {userProg.attempts} attempt{userProg.attempts !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Game ───────────────────────────────────────────── */}
      {GameComponent && !result && (
        <div className="rounded-3xl p-6 shadow-card border border-gray-100 dark:border-gray-700 animate-pop"
          style={{ background: 'var(--bg-card)' }}>
          <GameComponent
            key={gameKey}
            activity={activity}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────── */}
      {result && (
        <div ref={resultRef} className="space-y-4">

          {/* Score card */}
          <div
            className="rounded-3xl p-8 text-center shadow-xl border-2 animate-pop"
            style={{
              background: 'var(--bg-card)',
              borderColor: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#FFD93D' : '#FF6B6B',
            }}>
            <div className="text-6xl mb-3">
              {result.isCorrect ? '🏆' : result.score >= 60 ? '⭐' : '💪'}
            </div>
            <div className="font-display text-5xl mb-2" style={{
              color: result.isCorrect ? '#22c55e' : result.score >= 50 ? '#f59e0b' : '#ef4444',
            }}>
              {result.score}%
            </div>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-4 max-w-xs mx-auto leading-relaxed">
              {result.feedback}
            </p>

            {result.xpAwarded > 0 && (
              <div className="inline-flex items-center gap-2 bg-sky/15 text-sky px-5 py-2 rounded-full font-bold mb-4">
                ✨ +{result.xpAwarded} XP earned!
              </div>
            )}

            {result.newAchievements?.length > 0 && (
              <div className="mb-4 space-y-2">
                {result.newAchievements.map(ach => (
                  <div key={ach.key} className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full">
                    <span>{ach.icon}</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">
                      Achievement unlocked: {ach.title}!
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-center mt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <RotateCcw size={16} /> Try Again
              </button>
              <Link
                to="/activities"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm bg-sky text-white hover:bg-sky/90 transition-colors">
                More Games →
              </Link>
            </div>
          </div>

          {/* Answer summary accordion */}
          <AnswerSummary activity={activity} userAnswer={lastAnswer} />

        </div>
      )}
    </div>
  );
}
