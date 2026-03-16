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
import {
  ArrowLeft, Volume2, RotateCcw,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

const GAME_COMPONENTS = {
  word_match:    WordMatchGame,
  fill_blank:    FillBlankGame,
  sentence_sort: SentenceSortGame,
  picture_word:  PictureWordGame,
};

const DIFF_PILL = {
  easy:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard:   'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
};

// ── Per-type answer summary components ────────────────────────

function Row({ correct, left, right }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
      correct
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
        : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'
    }`}>
      {correct
        ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
        : <XCircle    size={14} className="text-rose-400 flex-shrink-0"    />
      }
      <span className="flex-1">{left}</span>
      {!correct && right}
    </div>
  );
}

function WordMatchSummary({ content, userAnswer, correctAnswer }) {
  return (
    <div className="space-y-2">
      {content.pairs.map(({ left }) => {
        const given   = userAnswer?.[left];
        const correct = correctAnswer?.[left];
        const ok      = given === correct;
        return (
          <Row key={left} correct={ok}
            left={<span><span className="font-semibold text-gray-700 dark:text-gray-200">{left}</span> → <span className={ok ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'line-through text-rose-400'}>{given || '—'}</span></span>}
            right={<span className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">✓ {correct}</span>}
          />
        );
      })}
    </div>
  );
}

function FillBlankSummary({ content, userAnswer, correctAnswer }) {
  const given   = userAnswer?.answers || [];
  const correct = correctAnswer?.answers || [];
  return (
    <div className="space-y-2">
      {content.sentences.map((s, i) => {
        const ok     = given[i]?.toLowerCase() === correct[i]?.toLowerCase();
        const parts  = s.text.split('___');
        return (
          <div key={i} className={`px-3 py-2.5 rounded-xl border text-sm ${
            ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
               : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
          }`}>
            <div className="flex items-start gap-2">
              {ok ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle    size={14} className="text-rose-400 flex-shrink-0 mt-0.5"    />}
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                {parts[0]}
                <span className={`inline-block mx-1 px-2 py-0.5 rounded-lg font-semibold text-xs ${
                  ok ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                     : 'bg-rose-100 text-rose-700 dark:bg-rose-800 dark:text-rose-200'
                }`}>{given[i] || '—'}</span>
                {parts[1]}
              </p>
            </div>
            {!ok && (
              <p className="text-xs mt-1.5 ml-6 font-semibold text-emerald-600 dark:text-emerald-400">
                Correct: <span className="font-bold">{correct[i]}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SentenceSortSummary({ userAnswer, correctAnswer }) {
  const given   = userAnswer?.order  || [];
  const correct = correctAnswer?.order || [];
  return (
    <div className="space-y-2">
      {correct.map((sentence, i) => {
        const userPos = given.indexOf(sentence);
        const ok      = userPos === i;
        return (
          <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-sm ${
            ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
               : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
              ok ? 'bg-emerald-500 text-white' : 'bg-rose-400 text-white'
            }`}>{i + 1}</div>
            <div className="flex-1">
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{sentence}</p>
              {!ok && userPos !== -1 && (
                <p className="text-xs mt-1 text-rose-400">You placed this at position {userPos + 1}</p>
              )}
            </div>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {content.items.map((item, i) => {
        const ok = given[i] === correct[i];
        return (
          <div key={i} className={`px-3 py-2.5 rounded-xl border text-center ${
            ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
               : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
          }`}>
            <div className="text-3xl mb-1">{item.picture}</div>
            {ok ? (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{correct[i]}</p>
            ) : (
              <>
                <p className="text-xs line-through text-rose-400">{given[i] || '—'}</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ {correct[i]}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnswerSummary({ activity, userAnswer }) {
  const [open, setOpen] = useState(false);

  const summaryMap = {
    word_match:    <WordMatchSummary    content={activity.content} userAnswer={userAnswer} correctAnswer={activity.correct_answer} />,
    fill_blank:    <FillBlankSummary    content={activity.content} userAnswer={userAnswer} correctAnswer={activity.correct_answer} />,
    sentence_sort: <SentenceSortSummary                            userAnswer={userAnswer} correctAnswer={activity.correct_answer} />,
    picture_word:  <PictureWordSummary  content={activity.content} userAnswer={userAnswer} correctAnswer={activity.correct_answer} />,
  };

  const summary = summaryMap[activity.type];
  if (!summary) return null;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ background: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          View Answer Summary
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
          {summary}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function GamePage() {
  const { id }              = useParams();
  const navigate            = useNavigate();
  const { refreshUser }     = useAuth();
  const { speak, settings } = useSettings();

  const [activity,   setActivity]   = useState(null);
  const [userProg,   setUserProg]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [lastAnswer, setLastAnswer] = useState(null);
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
    setLastAnswer(answer);
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const GameComponent = GAME_COMPONENTS[activity?.type];

  // Score colour
  const scoreColor = result
    ? result.score >= 80 ? '#22c55e'
    : result.score >= 50 ? '#f59e0b' : '#ef4444'
    : '#6366f1';

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link to="/activities"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl text-gray-800 dark:text-gray-100 truncate">
            {activity?.title}
          </h1>
          <p className="text-xs text-gray-400 truncate">{activity?.description}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${DIFF_PILL[activity?.difficulty]}`}>
            {activity?.difficulty}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky/10 text-sky dark:bg-sky/20">
            +{activity?.xp_reward} XP
          </span>
          <button
            onClick={() => speak(activity?.content?.instruction || activity?.title)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-sky hover:bg-sky/10 transition-colors"
            title="Read aloud">
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Previous best ──────────────────────────────── */}
      {userProg && !result && (
        <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60
                        border border-gray-200 dark:border-gray-700
                        flex items-center gap-3 text-sm">
          <span className="text-gray-400 text-xs">Best</span>
          <span className={`font-bold text-sm ${
            userProg.score >= 80 ? 'text-emerald-500' :
            userProg.score >= 50 ? 'text-amber-500'   : 'text-rose-400'
          }`}>{userProg.score}%</span>
          <span className="text-gray-300 dark:text-gray-600 text-xs">
            {userProg.attempts} attempt{userProg.attempts !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Game ───────────────────────────────────────── */}
      {GameComponent && !result && (
        <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700 animate-pop"
          style={{ background: 'var(--bg-card)' }}>
          <GameComponent
            key={gameKey}
            activity={activity}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      )}

      {/* ── Result ─────────────────────────────────────── */}
      {result && (
        <div ref={resultRef} className="space-y-3">

          {/* Score card */}
          <div
            className="rounded-2xl px-6 py-7 text-center border-2 animate-pop"
            style={{
              background: 'var(--bg-card)',
              borderColor: scoreColor + '40',
            }}
          >
            {/* Score number */}
            <div className="font-display text-6xl mb-1" style={{ color: scoreColor }}>
              {result.score}%
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
              {result.feedback}
            </p>

            {/* XP badge */}
            {result.xpAwarded > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-sky/10 text-sky px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                +{result.xpAwarded} XP earned
              </div>
            )}

            {/* New achievements */}
            {result.newAchievements?.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {result.newAchievements.map(ach => (
                  <div key={ach.key}
                    className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20
                               border border-amber-200 dark:border-amber-800
                               px-3 py-1.5 rounded-full text-xs font-semibold
                               text-amber-700 dark:text-amber-300 mx-1">
                    <span>{ach.icon}</span>
                    {ach.title} unlocked
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-center mt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                           border border-gray-200 dark:border-gray-600
                           text-gray-600 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <RotateCcw size={14} /> Try Again
              </button>
              <Link
                to="/activities"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                           bg-sky text-white hover:bg-sky/90 transition-colors">
                More Games →
              </Link>
            </div>
          </div>

          {/* Answer summary */}
          <AnswerSummary activity={activity} userAnswer={lastAnswer} />
        </div>
      )}
    </div>
  );
}
