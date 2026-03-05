// ============================================================
// GamePage — loads an activity and renders the right game
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { launchConfetti } from '../utils/confetti';
import WordMatchGame from '../components/games/WordMatchGame';
import FillBlankGame from '../components/games/FillBlankGame';
import SentenceSortGame from '../components/games/SentenceSortGame';
import PictureWordGame from '../components/games/PictureWordGame';
import { ArrowLeft, Volume2, RotateCcw, Home } from 'lucide-react';

const GAME_COMPONENTS = {
  word_match:    WordMatchGame,
  fill_blank:    FillBlankGame,
  sentence_sort: SentenceSortGame,
  picture_word:  PictureWordGame,
};

export default function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { speak, settings } = useSettings();
  const [activity, setActivity]     = useState(null);
  const [userProg, setUserProg]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState(null); // { score, feedback, xpAwarded, isCorrect }
  const [gameKey, setGameKey]       = useState(0);   // increment to reset game
  const resultRef = useRef(null);

  useEffect(() => {
    api.get(`/activities/${id}`)
      .then(res => {
        setActivity(res.data.activity);
        setUserProg(res.data.userProgress);
        if (settings.tts_enabled) {
          setTimeout(() => speak(res.data.activity.content.instruction || res.data.activity.title), 500);
        }
      }).catch(() => navigate('/activities'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (answer) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/activities/${id}/submit`, { answer });
      const data = res.data;
      setResult(data);
      if (data.isCorrect) launchConfetti();
      speak(data.feedback);
      await refreshUser();
      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setGameKey(k => k + 1);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-5xl animate-bounce">🎮</div>
      <p className="font-display text-xl text-sky">Loading game…</p>
    </div>
  );

  const GameComponent = GAME_COMPONENTS[activity?.type];
  const diffColors = { easy: 'bg-mint text-white', medium: 'bg-sunny text-gray-800', hard: 'bg-coral text-white' };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/activities"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft size={22} className="text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl text-gray-800 dark:text-gray-200">{activity?.title}</h1>
          <p className="text-sm text-gray-500">{activity?.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${diffColors[activity?.difficulty]}`}>
            {activity?.difficulty}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky/15 text-sky border border-sky/30">
            +{activity?.xp_reward} XP
          </span>
          <button onClick={() => speak(activity?.content?.instruction || activity?.title)}
            className="p-2 rounded-xl bg-sky/10 text-sky hover:bg-sky/20 transition-colors" title="Read instructions aloud">
            <Volume2 size={18} />
          </button>
        </div>
      </div>

      {/* ── Previous best ────────────────────────────────────── */}
      {userProg && (
        <div className="mb-4 px-4 py-2 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3 text-sm">
          <span className="text-gray-500">Best score:</span>
          <span className={`font-bold ${userProg.score >= 80 ? 'text-mint' : userProg.score >= 50 ? 'text-sunny' : 'text-coral'}`}>
            {userProg.score}%
          </span>
          <span className="text-gray-400">• {userProg.attempts} attempt{userProg.attempts !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Game Component ───────────────────────────────────── */}
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

      {/* ── Result Card ──────────────────────────────────────── */}
      {result && (
        <div ref={resultRef} className="rounded-3xl p-8 text-center shadow-xl border-2 animate-pop"
          style={{ background: 'var(--bg-card)',
            borderColor: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#FFD93D' : '#FF6B6B' }}>
          <div className="text-6xl mb-4 animate-bounce">
            {result.isCorrect ? '🏆' : result.score >= 60 ? '⭐' : '💪'}
          </div>
          <div className="font-display text-5xl mb-1" style={{
            color: result.isCorrect ? '#6BCB77' : result.score >= 50 ? '#F0C000' : '#FF6B6B'
          }}>{result.score}%</div>
          <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">{result.feedback}</p>

          {result.xpAwarded > 0 && (
            <div className="inline-flex items-center gap-2 bg-sky/15 text-sky px-5 py-2 rounded-full font-bold mb-6">
              <span className="text-2xl">✨</span> +{result.xpAwarded} XP earned!
            </div>
          )}

          {result.newAchievements?.length > 0 && (
            <div className="mb-5 space-y-2">
              {result.newAchievements.map(ach => (
                <div key={ach.key} className="flex items-center justify-center gap-2 bg-sunny/20 px-4 py-2 rounded-full">
                  <span className="text-2xl">{ach.icon}</span>
                  <span className="font-bold text-yellow-700 dark:text-yellow-300">
                    Achievement unlocked: {ach.title}!
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={handleReset}
              className="btn-game bg-sky text-white flex items-center gap-2">
              <RotateCcw size={18} /> Try Again
            </button>
            <Link to="/activities"
              className="btn-game bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Home size={18} /> More Games
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
