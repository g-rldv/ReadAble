// ============================================================
// ActivitiesPage — browse & filter activities with 3D pick-up hover
// Progress refreshes whenever user?.xp changes (after playing a game)
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { CheckCircle } from 'lucide-react';

const DIFF = {
  easy:   { bar:'bg-emerald-500', border:'#34d399', pill:'bg-emerald-500 text-white', activePill:'bg-emerald-600 text-white', glow:'rgba(52,211,153,0.30)', label:'Easy'   },
  medium: { bar:'bg-amber-400',   border:'#fbbf24', pill:'bg-amber-400 text-white',   activePill:'bg-amber-500 text-white',   glow:'rgba(251,191,36,0.30)', label:'Medium' },
  hard:   { bar:'bg-rose-500',    border:'#f43f5e', pill:'bg-rose-500 text-white',     activePill:'bg-rose-600 text-white',     glow:'rgba(244,63,94,0.30)', label:'Hard'   },
};
const TYPES = [
  { key:'all',           label:'All Games'      },
  { key:'word_match',    label:'Word Match'     },
  { key:'fill_blank',    label:'Fill the Blank' },
  { key:'sentence_sort', label:'Sentence Sort'  },
  { key:'picture_word',  label:'Picture & Word' },
];
const DIFFS = [
  { key:'all',    label:'All'    },
  { key:'easy',   label:'Easy'   },
  { key:'medium', label:'Medium' },
  { key:'hard',   label:'Hard'   },
];
const DIFF_ORDER = { easy:0, medium:1, hard:2 };
const TYPE_ORDER = { word_match:0, fill_blank:1, sentence_sort:2, picture_word:3 };

// ── 3D pick-up card ───────────────────────────────────────────
function ActivityCard({ activity, progress }) {
  const [hovered, setHovered] = useState(false);
  const [tilt,    setTilt]    = useState({ x:0, y:0 });
  const cardRef = useRef(null);

  const prog      = progress[activity.id];
  const completed = prog?.completed;
  const score     = prog?.score ?? null;
  const d         = DIFF[activity.difficulty] || DIFF.easy;

  const onMouseMove = (e) => {
    if (!cardRef.current) return;
    const r  = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
    const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
    setTilt({ x: dy * 9, y: -dx * 9 });
  };

  const transform = hovered
    ? `perspective(600px) translateY(-16px) scale(1.055) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
    : 'perspective(600px) translateY(0) scale(1) rotateX(0deg) rotateY(0deg)';

  const shadow = hovered
    ? `0 24px 40px -6px rgba(0,0,0,0.28), 0 8px 16px -4px ${d.glow}, 0 0 0 2px ${d.border}`
    : `0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px ${d.border}40`;

  const transition = hovered
    ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
    : 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease';

  return (
    <Link ref={cardRef} to={`/game/${activity.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({x:0,y:0}); }}
      onMouseMove={onMouseMove}
      style={{ transform, boxShadow: shadow, transition, background:'var(--bg-card)', transformStyle:'preserve-3d', willChange:'transform', display:'flex', flexDirection:'column' }}
      className="rounded-2xl overflow-hidden cursor-pointer">
      <div className={`h-1.5 w-full flex-shrink-0 ${d.bar}`} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${d.pill}`}>{d.label}</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky/15 text-sky dark:bg-sky/25">+{activity.xp_reward} XP</span>
          {completed && <CheckCircle size={13} className="text-emerald-500 ml-auto flex-shrink-0" />}
        </div>
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">{activity.title}</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2 flex-1">{activity.description}</p>
        <div className="flex items-center justify-between pt-1">
          {score !== null
            ? <span className={`text-xs font-semibold ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-gray-400'}`}>{score}%</span>
            : <span className="text-xs text-neutral dark:text-neutral">Not played</span>
          }
          <span className="text-xs font-bold text-sky"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(0)' : 'translateX(4px)', transition:'opacity 0.18s, transform 0.18s' }}>
            Play →
          </span>
        </div>
      </div>
    </Link>
  );
}

function TypeSection({ typeKey, activities, progress }) {
  const label = TYPES.find(t => t.key === typeKey)?.label;
  if (!activities.length) return null;
  const sorted = [...activities].sort((a,b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</h2>
        <span className="text-xs text-gray-300 dark:text-gray-600">({activities.length})</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ perspective:'1200px' }}>
        {sorted.map(act => <ActivityCard key={act.id} activity={act} progress={progress} />)}
      </div>
    </section>
  );
}

function FilterPill({ active, onClick, children, activeClass }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap
        ${active
          ? activeClass || 'bg-sky text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}>
      {children}
    </button>
  );
}

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [progress,   setProgress]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [activeDiff, setActiveDiff] = useState('all');

  // Refetch whenever user?.xp changes (after submitting a game) or on login
  const fetchData = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([api.get('/activities'), api.get('/progress')])
      .then(([actRes, progRes]) => {
        setActivities(actRes.data.activities || []);
        const map = {};
        (progRes.data.progress || []).forEach(p => { map[p.activity_id] = p; });
        setProgress(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData, user?.xp]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filtered = activities
    .filter(a => activeDiff === 'all' || a.difficulty === activeDiff)
    .filter(a => activeType === 'all' || a.type === activeType);

  const sorted = [...filtered].sort((a,b) => {
    if (a.type !== b.type) return (TYPE_ORDER[a.type]??9) - (TYPE_ORDER[b.type]??9);
    return DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty];
  });

  const grouped = {};
  ['word_match','fill_blank','sentence_sort','picture_word'].forEach(t => {
    grouped[t] = sorted.filter(a => a.type === t);
  });

  const completedCount = Object.values(progress).filter(p => p.completed).length;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-5">
      <div>
        <h1 className="font-display text-3xl text-gray-800 dark:text-gray-100">Activities</h1>
        <p className="text-sm text-gray-400 mt-0.5">{completedCount} of {activities.length} completed</p>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <FilterPill key={t.key} active={activeType === t.key}
              onClick={() => setActiveType(t.key)} activeClass="bg-indigo-500 text-white shadow-sm">
              {t.label}
            </FilterPill>
          ))}
        </div>
        <div className="border-t" style={{ borderColor:'var(--border-color)' }} />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Level</span>
          {DIFFS.map(d => (
            <FilterPill key={d.key} active={activeDiff === d.key}
              onClick={() => setActiveDiff(d.key)}
              activeClass={d.key !== 'all' ? DIFF[d.key]?.activePill : 'bg-gray-600 text-white shadow-sm'}>
              {d.key !== 'all' ? (
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DIFF[d.key]?.bar}`} />
                  {d.label}
                </span>
              ) : d.label}
            </FilterPill>
          ))}
          {(activeType !== 'all' || activeDiff !== 'all') && (
            <button onClick={() => { setActiveType('all'); setActiveDiff('all'); }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="font-semibold text-base">No activities found</p>
          <p className="text-sm mt-1">Try a different filter</p>
        </div>
      ) : activeType === 'all' ? (
        <div className="space-y-8">
          {['word_match','fill_blank','sentence_sort','picture_word'].map(t => (
            <TypeSection key={t} typeKey={t} activities={grouped[t] || []} progress={progress} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ perspective:'1200px' }}>
          {sorted.map(act => <ActivityCard key={act.id} activity={act} progress={progress} />)}
        </div>
      )}
    </div>
  );
}
