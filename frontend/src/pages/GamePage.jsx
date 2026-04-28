// ============================================================
// GamePage — loads activity, renders correct game, shows result
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth }         from '../contexts/AuthContext';
import { useSettings }     from '../contexts/SettingsContext';
import { useAchievements } from '../components/ui/AchievementNotification';
import { launchConfetti }  from '../utils/confetti';
import WordMatchGame    from '../components/games/WordMatchGame';
import FillBlankGame    from '../components/games/FillBlankGame';
import SentenceSortGame from '../components/games/SentenceSortGame';
import PictureWordGame  from '../components/games/PictureWordGame';
import PictureChoiceGame from '../components/games/PictureChoiceGame';
import CoinIcon from '../components/ui/CoinIcon';
import { ArrowLeft, Volume2, RotateCcw, Home, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

const GAME_COMPONENTS = {
  word_match:     WordMatchGame,
  fill_blank:     FillBlankGame,
  sentence_sort:  SentenceSortGame,
  picture_word:   PictureWordGame,
  picture_choice: PictureChoiceGame,
};

const DIFF_STYLE = {
  easy:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  hard:   'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
};

function parseContent(activity) {
  if (!activity) return activity;
  if (typeof activity.content === 'string') {
    try { activity.content = JSON.parse(activity.content); } catch (_) {}
  }
  if (typeof activity.correct_answer === 'string') {
    try { activity.correct_answer = JSON.parse(activity.correct_answer); } catch (_) {}
  }
  return activity;
}

function AnswerSummary({ details, type }) {
  const [open, setOpen] = React.useState(false);
  if (!details || details.length === 0) return null;
  const wrongCount = details.filter(d => !d.ok).length;

  const ItemRow = ({ d, i }) => (
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
  );

  return (
    <div className="w-full mt-4 text-left border rounded-2xl overflow-hidden"
      style={{ borderColor:'var(--border-color)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left
                   hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        style={{ background:'var(--bg-primary)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Answer Breakdown</span>
          {wrongCount > 0 && (
            <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400
                             px-2 py-0.5 rounded-full font-bold">
              {wrongCount} wrong
            </span>
          )}
          {wrongCount === 0 && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400
                             px-2 py-0.5 rounded-full font-bold">
              All correct!
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2" style={{ background:'var(--bg-card-grad)' }}>
          {type === 'sentence_sort' ? (
            <div className="space-y-1.5">
              {details.map((d, i) => <ItemRow key={i} d={d} i={i}/>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {details.map((d, i) => <ItemRow key={i} d={d} i={i}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { token, refreshUser } = useAuth();
  const { speak, settings } = useSettings();
  const achCtx = useAchievements();
  const notifyAchievement = achCtx?.notify;

  const [activity,   setActivity]   = useState(null);
  const [userProg,   setUserProg]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [gameKey,    setGameKey]    = useState(0);
  const [submitError, setSubmitError] = useState('');
  const resultRef = useRef(null);

  // Always keep auth header in sync
  useEffect(() => {
    const t = token || localStorage.getItem('readable_token');
    if (t) {
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    setResult(null);
    setSubmitError('');

    const t = token || localStorage.getItem('readable_token');
    if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;

    api.get(`/activities/${id}`)
      .then(res => {
        const act = parseContent(res.data.activity);
        setActivity(act);
        setUserProg(res.data.userProgress);
        if (settings.tts_enabled)
          setTimeout(() => speak(act.content?.instruction || act.title), 600);
      })
      .catch(() => navigate('/activities'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (answer) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      // Ensure auth header is set from any available source
      const t = token || localStorage.getItem('readable_token');
      if (!t) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;

      const res = await api.post(`/activities/${id}/submit`, { answer });
      const data = res.data;

      setResult(data);

      if (data.isCorrect) launchConfetti();
      if (data.feedback) speak(data.feedback);

      if (data.newAchievements?.length > 0 && notifyAchievement) {
        notifyAchievement(data.newAchievements);
      }

      try { await refreshUser(); } catch (_) {}

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 120);
    } catch (err) {
      console.error('[GamePage/Submit] error:', err);
      if (err.status === 401 || err.message?.includes('401')) {
        navigate('/login');
      } else {
        setSubmitError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSubmitError('');
    setGameKey(k => k + 1);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
      <p className="font-display text-base text-sky">Loading…</p>
    </div>
  );

  const GameComponent = GAME_COMPONENTS[activity?.type];
  if (!GameComponent && activity) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-4xl mb-3">🎮</p>
        <h2 className="font-display text-xl text-gray-700 dark:text-gray-200 mb-2">
          Game type not supported
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Activity type <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{activity.type}</code> is not recognised.
        </p>
        <Link to="/activities" className="btn-game bg-sky text-white inline-flex items-center gap-2">
          <Home size={16}/> Back to Activities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in px-1">

      {/* Header */}
      <div className="flex items-start gap-2 mb-4">
        <Link to="/activities"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 mt-0.5">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400"/>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-gray-800 dark:text-gray-100 leading-tight">
            {activity?.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{activity?.description}</p>
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

      {/* Submit error */}
      {submitError && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600
                        dark:text-rose-400 text-sm font-semibold border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2">
          <span>{submitError}</span>
          <button onClick={() => setSubmitError('')} className="text-rose-400 hover:text-rose-600 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Game */}
      {GameComponent && !result && (
        <div className="rounded-3xl p-6 shadow-card border border-gray-100 dark:border-gray-700 animate-pop"
          style={{ background:'var(--bg-card-grad)' }}>
          <GameComponent
            key={gameKey}
            activity={activity}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      )}

      {/* Result */}
      {result && (
        <div ref={resultRef}
          className="rounded-3xl p-4 md:p-6 shadow-xl border-2 animate-pop"
          style={{ background:'var(--bg-card-grad)',
            borderColor: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#FFD93D' : '#FF6B6B' }}>

          <div className="text-center mb-4">
            <div className="font-display text-4xl md:text-5xl mb-1" style={{
              color: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#F0C000' : '#FF6B6B'
            }}>{result.score}%</div>
            <p className="text-base font-bold text-gray-700 dark:text-gray-200 leading-snug">
              {result.feedback}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {(result.xpAwarded ?? 0) > 0 && (
              <span className="inline-flex items-center gap-2 bg-sky/15 text-sky px-4 py-1.5 rounded-full font-bold text-sm">
                ✨ +{result.xpAwarded} XP earned!
              </span>
            )}
            {(result.coinsAwarded ?? 0) > 0 && (
              <span className="inline-flex items-center gap-2 bg-amber-400/15 text-amber-700 dark:text-amber-400 px-4 py-1.5 rounded-full font-bold text-sm">
                <CoinIcon size={14}/> +{result.coinsAwarded} coins!
              </span>
            )}
          </div>

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

          <AnswerSummary details={result.details} type={activity?.type}/>

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
