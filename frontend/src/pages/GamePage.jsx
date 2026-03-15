// ============================================================
// GamePage — loads activity, renders correct game, shows
// detailed answer summary after submission
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth }     from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { launchConfetti } from '../utils/confetti';
import WordMatchGame    from '../components/games/WordMatchGame';
import FillBlankGame    from '../components/games/FillBlankGame';
import SentenceSortGame from '../components/games/SentenceSortGame';
import PictureWordGame  from '../components/games/PictureWordGame';
import { ArrowLeft, Volume2, RotateCcw, Home, CheckCircle, XCircle } from 'lucide-react';

const GAME_COMPONENTS = {
  word_match:    WordMatchGame,
  fill_blank:    FillBlankGame,
  sentence_sort: SentenceSortGame,
  picture_word:  PictureWordGame,
};

const DIFF_STYLE = {
  easy:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  hard:   'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
};

// ── Answer summary table shown after submitting ───────────────
function AnswerSummary({ details, type }) {
  if (!details?.length) return null;

  // Sentence sort shows position label + truncated sentence
  if (type === 'sentence_sort') {
    return (
      <div className="w-full mt-4 text-left">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Answer breakdown</p>
        <div className="space-y-1.5">
          {details.map((d, i) => (
            <div key={i}
              className={`flex items-start gap-2 p-2.5 rounded-xl text-xs
                ${d.ok
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50   dark:bg-rose-900/20   border border-rose-200   dark:border-rose-800'}`}>
              {d.ok
                ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0 mt-0.5"/>
                : <XCircle    size={13} className="text-rose-500   flex-shrink-0 mt-0.5"/>}
              <div className="min-w-0">
                <span className="font-bold text-gray-600 dark:text-gray-400 mr-1">{d.label}:</span>
                {d.ok ? (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 break-words">{d.correct}</span>
                ) : (
                  <>
                    <span className="line-through text-rose-400 break-words mr-1">{d.given || '—'}</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 break-words">→ {d.correct}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Word match, fill-blank, picture-word: two-column grid
  return (
    <div className="w-full mt-4 text-left">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Answer breakdown</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {details.map((d, i) => (
          <div key={i}
            className={`flex items-start gap-2 p-2.5 rounded-xl text-xs
              ${d.ok
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50   dark:bg-rose-900/20   border border-rose-200   dark:border-rose-800'}`}>
            {d.ok
              ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0 mt-0.5"/>
              : <XCircle    size={13} className="text-rose-500   flex-shrink-0 mt-0.5"/>}
            <div className="min-w-0">
              {/* label: the left-word / sentence snippet / emoji */}
              <span className="font-bold text-gray-600 dark:text-gray-400">{d.label} </span>
              {d.ok ? (
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{d.correct}</span>
              ) : (
                <span>
                  <span className="line-through text-rose-400">{d.given || '—'}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300"> → {d.correct}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GamePage() {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { refreshUser } = useAuth();
  const { speak, settings } = useSettings();

  const [activity,   setActivity]   = useState(null);
  const [userProg,   setUserProg]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [gameKey,    setGameKey]    = useState(0);
  const resultRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setResult(null);
    api.get(`/activities/${id}`)
      .then(res => {
        setActivity(res.data.activity);
        setUserProg(res.data.userProgress);
        if (settings.tts_enabled)
          setTimeout(() => speak(res.data.activity.content?.instruction || res.data.activity.title), 600);
      })
      .catch(() => navigate('/activities'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (answer) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res  = await api.post(`/activities/${id}/submit`, { answer });
      const data = res.data;
      setResult(data);
      if (data.isCorrect) launchConfetti();
      speak(data.feedback);
      await refreshUser();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 120);
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  const handleReset = () => { setResult(null); setGameKey(k => k + 1); };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
      <p className="font-display text-base text-sky">Loading…</p>
    </div>
  );

  const GameComponent = GAME_COMPONENTS[activity?.type];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start gap-2 mb-4">
        <Link to="/activities"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 mt-0.5">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400"/>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl sm:text-2xl text-gray-800 dark:text-gray-100 leading-tight">
            {activity?.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2">{activity?.description}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${DIFF_STYLE[activity?.difficulty]}`}>
              {activity?.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky/15 text-sky dark:bg-sky/25">
              +{activity?.xp_reward} XP
            </span>
            {userProg && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                userProg.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                Best: {userProg.score}%
              </span>
            )}
            <button onClick={() => speak(activity?.content?.instruction || activity?.title)}
              className="p-1.5 rounded-lg bg-sky/10 text-sky hover:bg-sky/20 transition-colors ml-auto"
              title="Read aloud">
              <Volume2 size={15}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Game ────────────────────────────────────────── */}
      {GameComponent && !result && (
        <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card border border-gray-100 dark:border-gray-700 animate-pop"
          style={{ background:'var(--bg-card)' }}>
          <GameComponent
            key={gameKey}
            activity={activity}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      )}

      {/* ── Result ──────────────────────────────────────── */}
      {result && (
        <div ref={resultRef}
          className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl border-2 animate-pop"
          style={{ background:'var(--bg-card)',
            borderColor: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#FFD93D' : '#FF6B6B' }}>

          {/* Score header */}
          <div className="text-center mb-4">
            <div className="text-5xl mb-2 animate-bounce">
              {result.isCorrect ? '🏆' : result.score >= 60 ? '⭐' : '💪'}
            </div>
            <div className="font-display text-5xl mb-1" style={{
              color: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#F0C000' : '#FF6B6B'
            }}>{result.score}%</div>
            <p className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 leading-snug">
              {result.feedback}
            </p>
          </div>

          {/* XP + Achievements */}
          {result.xpAwarded > 0 && (
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center gap-2 bg-sky/15 text-sky px-4 py-1.5 rounded-full font-bold text-sm">
                ✨ +{result.xpAwarded} XP earned!
              </span>
            </div>
          )}
          {result.newAchievements?.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {result.newAchievements.map(ach => (
                <div key={ach.key}
                  className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20
                             border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-2xl">
                  <span className="text-lg">{ach.icon}</span>
                  <span className="font-bold text-sm text-amber-700 dark:text-amber-300">{ach.title} unlocked!</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Per-answer summary ──────────────────────── */}
          <AnswerSummary details={result.details} type={activity?.type}/>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center flex-wrap mt-5">
            <button onClick={handleReset}
              className="btn-game bg-sky text-white flex items-center gap-2 text-sm">
              <RotateCcw size={15}/> Try Again
            </button>
            <Link to="/activities"
              className="btn-game bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
              <Home size={15}/> More Games
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
