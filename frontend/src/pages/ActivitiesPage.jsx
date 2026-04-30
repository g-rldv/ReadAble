// ============================================================
// ActivitiesPage — fixed mobile filter bar:
// - Game type buttons use a horizontal scroll row (no wrap/overflow)
// - Difficulty row fits in one line always
// - No left-clip on narrow screens
// - Level pill text always visible (all-inline-style, no Tailwind mixing)
// - Clear button always inside the box, invisible when not needed
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { CheckCircle, Lock } from 'lucide-react';

const DIFF = {
  easy:   { bar:'bg-emerald-500', border:'#34d399', pill:'bg-emerald-500 text-white', activePill:'bg-emerald-600 text-white', glow:'rgba(52,211,153,0.30)',  label:'Easy'   },
  medium: { bar:'bg-amber-400',   border:'#fbbf24', pill:'bg-amber-400 text-white',   activePill:'bg-amber-500 text-white',   glow:'rgba(251,191,36,0.30)',  label:'Medium' },
  hard:   { bar:'bg-rose-500',    border:'#f43f5e', pill:'bg-rose-500 text-white',     activePill:'bg-rose-600 text-white',     glow:'rgba(244,63,94,0.30)',  label:'Hard'   },
};

// Explicit colour maps for difficulty buttons — no Tailwind className mixing
const DIFF_BTN_COLORS = {
  easy:   { bg: '#22c55e', border: '#16a34a', text: '#ffffff', dot: '#bbf7d0' },
  medium: { bg: '#f59e0b', border: '#d97706', text: '#ffffff', dot: '#fde68a' },
  hard:   { bg: '#ef4444', border: '#dc2626', text: '#ffffff', dot: '#fecaca' },
};

const TYPES = [
  { key:'all',           label:'All'         },
  { key:'word_match',    label:'Word Match'  },
  { key:'fill_blank',    label:'Fill Blank'  },
  { key:'sentence_sort', label:'Sentence'    },
  { key:'picture_word',  label:'Picture'     },
];

const DIFFS = [
  { key:'all',    label:'All'    },
  { key:'easy',   label:'Easy'   },
  { key:'medium', label:'Medium' },
  { key:'hard',   label:'Hard'   },
];

const DIFF_ORDER = { easy:0, medium:1, hard:2 };
const TYPE_ORDER = { word_match:0, fill_blank:1, sentence_sort:2, picture_word:3 };

// ── Unlock helpers ────────────────────────────────────────────
function getUnlocked(typeKey, activities, progress) {
  const inType = activities.filter(a => a.type === typeKey);
  const easyAll  = inType.filter(a => a.difficulty === 'easy');
  const medAll   = inType.filter(a => a.difficulty === 'medium');
  const easyDone   = easyAll.every(a => progress[a.id]?.completed);
  const mediumDone = medAll.length > 0 && medAll.every(a => progress[a.id]?.completed);
  return {
    medium: easyAll.length > 0 && easyDone,
    hard:   medAll.length  > 0 && mediumDone,
    easyTotal:   easyAll.length,
    easyDone:    easyAll.filter(a => progress[a.id]?.completed).length,
    mediumTotal: medAll.length,
    mediumDone:  medAll.filter(a => progress[a.id]?.completed).length,
  };
}

function lockReason(difficulty, unlocked) {
  if (difficulty === 'medium') {
    return `Complete all ${unlocked.easyTotal} Easy activities to unlock Medium!`;
  }
  if (difficulty === 'hard') {
    return `Complete all ${unlocked.mediumTotal} Medium activities to unlock Hard!`;
  }
  return 'Complete previous activities to unlock!';
}

function ActivityCard({ activity, progress, isLocked, lockMsg }) {
  const [hovered, setHovered] = useState(false);
  const [tilt,    setTilt]    = useState({ x:0, y:0 });
  const cardRef = useRef(null);
  const prog      = progress[activity.id];
  const completed = prog?.completed;
  const score     = prog?.score ?? null;
  const d         = DIFF[activity.difficulty] || DIFF.easy;

  const onMouseMove = (e) => {
    if (isLocked || !cardRef.current) return;
    const r  = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
    const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
    setTilt({ x: dy * 9, y: -dx * 9 });
  };

  const transform  = hovered && !isLocked
    ? `perspective(600px) translateY(-16px) scale(1.055) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
    : 'perspective(600px) translateY(0) scale(1)';
  const shadow     = hovered && !isLocked
    ? `0 24px 40px -6px rgba(0,0,0,0.28), 0 8px 16px -4px ${d.glow}, 0 0 0 2px ${d.border}`
    : `0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px ${d.border}40`;
  const transition = hovered && !isLocked
    ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
    : 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease';

  if (isLocked) {
    return (
      <div ref={cardRef}
        style={{
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          background: 'var(--bg-card-grad)',
          position: 'relative', overflow: 'hidden',
        }}
        className="rounded-2xl flex flex-col cursor-not-allowed select-none">
        <div className={`h-1.5 w-full flex-shrink-0 ${d.bar} opacity-30`}/>
        <div className="p-4 flex flex-col gap-2 flex-1 opacity-20 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${d.pill}`}>{d.label}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky/15 text-sky dark:bg-sky/25">+{activity.xp_reward} XP</span>
          </div>
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">{activity.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 flex-1">{activity.description}</p>
        </div>
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'rgba(0,0,0,0.55)' }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 px-3">
          <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            <Lock size={18} className="text-white" />
          </div>
          <p className="text-white text-[11px] font-bold text-center leading-snug drop-shadow">
            {lockMsg}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link ref={cardRef} to={`/game/${activity.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({x:0,y:0}); }}
      onMouseMove={onMouseMove}
      style={{ transform, boxShadow:shadow, transition, background:'var(--bg-card-grad)', transformStyle:'preserve-3d', willChange:'transform', display:'flex', flexDirection:'column' }}
      className="rounded-2xl overflow-hidden cursor-pointer">
      <div className={`h-1.5 w-full flex-shrink-0 ${d.bar}`}/>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${d.pill}`}>{d.label}</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky/15 text-sky dark:bg-sky/25">+{activity.xp_reward} XP</span>
          {completed && <CheckCircle size={13} className="text-emerald-500 ml-auto flex-shrink-0"/>}
        </div>
        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">{activity.title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 flex-1">{activity.description}</p>
        <div className="flex items-center justify-between pt-1">
          {score !== null
            ? <span className={`text-xs font-semibold ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-gray-400'}`}>{score}%</span>
            : <span className="text-xs text-gray-300 dark:text-gray-600">Not played</span>}
          <span className="text-xs font-bold text-sky"
            style={{ opacity:hovered?1:0, transform:hovered?'translateX(0)':'translateX(4px)', transition:'opacity 0.18s, transform 0.18s' }}>
            Play →
          </span>
        </div>
      </div>
    </Link>
  );
}

function TypeSection({ typeKey, activities, progress, allActivities }) {
  const label    = TYPES.find(t => t.key === typeKey)?.label;
  if (!activities.length) return null;

  const unlocked = getUnlocked(typeKey, allActivities, progress);
  const sorted   = [...activities].sort((a,b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);

  let hint = null;
  if (!unlocked.medium) {
    hint = `${unlocked.easyDone}/${unlocked.easyTotal} Easy done — finish all to unlock Medium`;
  } else if (!unlocked.hard && unlocked.mediumTotal > 0) {
    hint = `${unlocked.mediumDone}/${unlocked.mediumTotal} Medium done — finish all to unlock Hard`;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</h2>
        <span className="text-xs text-gray-300 dark:text-gray-600">({activities.length})</span>
      </div>
      {hint && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-3 flex items-center gap-1">
          <Lock size={11}/> {hint}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" style={{ perspective:'1200px' }}>
        {sorted.map(act => {
          let isLocked = false;
          let msg = '';
          if (act.difficulty === 'medium' && !unlocked.medium) {
            isLocked = true;
            msg = lockReason('medium', unlocked);
          } else if (act.difficulty === 'hard' && !unlocked.hard) {
            isLocked = true;
            msg = lockReason('hard', unlocked);
          }
          return (
            <ActivityCard
              key={act.id}
              activity={act}
              progress={progress}
              isLocked={isLocked}
              lockMsg={msg}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function ActivitiesPage() {
  const { user }                    = useAuth();
  const [activities, setActivities] = useState([]);
  const [progress,   setProgress]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [activeDiff, setActiveDiff] = useState('all');

  const fetchData = useCallback(() => {
    if (!user?.id) return;
    Promise.all([api.get('/activities'), api.get('/progress')])
      .then(([a, p]) => {
        setActivities(a.data.activities);
        const map = {};
        (p.data.progress || []).forEach(pr => { map[pr.activity_id] = pr; });
        setProgress(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData, user?.xp]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
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

  const anyLocked = ['word_match','fill_blank','sentence_sort','picture_word'].some(t => {
    const u = getUnlocked(t, activities, progress);
    return !u.medium || !u.hard;
  });

  const hasClearFilter = activeType !== 'all' || activeDiff !== 'all';

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-5">

      {/* Title */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl text-gray-800 dark:text-gray-100">Activities</h1>
        <p className="text-sm text-gray-400 mt-0.5">{completedCount} of 48 completed</p>
      </div>

      {/* ── Filter panel ────────────────────────────────── */}
      <div className="rounded-2xl p-3 space-y-3"
        style={{ background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}>

        {/* ── Game type — stretch buttons to fill width ── */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            flex: 1,
          }}
        >
          {TYPES.map(t => {
            const isActive = activeType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: isActive
                    ? '2px solid var(--text-primary)'
                    : '2px solid var(--border-color)',
                  background: isActive ? 'var(--text-primary)' : 'var(--bg-primary)',
                  color: isActive ? 'var(--bg-primary)' : 'var(--text-muted, #9ca3af)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t" style={{ borderColor:'var(--border-color)' }}/>

        {/* ── Difficulty row — always one line, text always visible ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          {/* <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#9ca3af',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            Level
          </span>  */}

          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {DIFFS.map(d => {
              const isActive = activeDiff === d.key;
              const dc = DIFF_BTN_COLORS[d.key];

              // All colours expressed explicitly — no Tailwind class mixing
              const btnStyle = isActive
                ? d.key === 'all'
                  ? {
                      background: 'var(--text-primary)',
                      border: '2px solid var(--text-primary)',
                      color: 'var(--bg-primary)',
                    }
                  : {
                      background: dc.bg,
                      border: `2px solid ${dc.border}`,
                      color: dc.text,
                    }
                : {
                    background: 'var(--bg-primary)',
                    border: '2px solid var(--border-color)',
                    color: 'var(--text-muted, #9ca3af)',
                  };

              return (
                <button
                  key={d.key}
                  onClick={() => setActiveDiff(d.key)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    ...btnStyle,
                  }}
                >
                  {dc && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isActive ? (dc.dot || 'rgba(255,255,255,0.6)') : dc.bg,
                      opacity: isActive ? 1 : 0.7,
                    }}/>
                  )}
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Clear button — always in DOM, invisible + non-interactive when not needed */}
          <button
            onClick={() => { setActiveType('all'); setActiveDiff('all'); }}
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 9px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s, background 0.15s',
              minWidth: 44,
              textAlign: 'center',
              // Visible only when a filter is active
              opacity: hasClearFilter ? 1 : 0,
              pointerEvents: hasClearFilter ? 'auto' : 'none',
              cursor: hasClearFilter ? 'pointer' : 'default',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
              border: '2px solid var(--border-color)',
            }}
          >
            Clear
          </button>
        </div>

        {/* Global unlock hint */}
        {anyLocked && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Lock size={13} className="text-amber-500 flex-shrink-0"/>
            <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
              Complete <strong>all</strong> Easy activities in a category to unlock Medium, then all Medium to unlock Hard.
            </p>
          </div>
        )}
      </div>

      {/* Activity grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="font-semibold text-base">No activities found</p>
          <p className="text-sm mt-1">Try a different filter</p>
        </div>
      ) : activeType === 'all' ? (
        <div className="space-y-8">
          {['word_match','fill_blank','sentence_sort','picture_word'].map(t => (
            grouped[t]?.length > 0 && (
              <TypeSection
                key={t}
                typeKey={t}
                activities={grouped[t]}
                progress={progress}
                allActivities={activities}
              />
            )
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {['word_match','fill_blank','sentence_sort','picture_word']
            .filter(t => grouped[t]?.length > 0)
            .map(t => (
              <TypeSection
                key={t}
                typeKey={t}
                activities={grouped[t]}
                progress={progress}
                allActivities={activities}
              />
            ))
          }
        </div>
      )}
    </div>
  );
}
