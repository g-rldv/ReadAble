// ============================================================
// AchievementNotification.jsx
// Drop-in global achievement toast system.
// Usage:
//   1. Wrap app (or GamePage) with <AchievementProvider>
//   2. Call useAchievements().notify(achievementsArray) after submit
//
// Each achievement in the array should have: { key, title, icon }
// which matches what the /activities/:id/submit endpoint returns
// in the `newAchievements` field.
// ============================================================
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';

const AchCtx = createContext(null);

// ── Single Toast Card ─────────────────────────────────────────
function AchToast({ toast, onDismiss }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px 12px 12px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #2d2a6e 100%)',
        border: '2px solid #fbbf24',
        boxShadow: '0 8px 32px rgba(251,191,36,0.3), 0 2px 12px rgba(0,0,0,0.5)',
        minWidth: 260,
        maxWidth: 340,
        width: '100%',
        boxSizing: 'border-box',
        animation: 'achSlideIn 0.42s cubic-bezier(0.175,0.885,0.32,1.275) both',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)',
        animation: 'achShimmer 2s linear infinite',
      }}/>

      {/* Icon bubble */}
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: 'rgba(251,191,36,0.18)',
        border: '2px solid rgba(251,191,36,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
        animation: 'achIconPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) 0.15s both',
      }}>
        {toast.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#fbbf24', marginBottom: 3,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          🏆 Achievement Unlocked!
        </div>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#ffffff', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {toast.title}
        </div>
        {toast.desc && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {toast.desc}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
        }}
      >
        <X size={12} />
      </button>

      <style>{`
        @keyframes achSlideIn {
          0%   { opacity:0; transform:translateX(70px) scale(0.88); }
          65%  { opacity:1; transform:translateX(-5px) scale(1.02); }
          100% { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes achIconPop {
          0%   { transform:scale(0) rotate(-20deg); }
          70%  { transform:scale(1.2) rotate(5deg); }
          100% { transform:scale(1) rotate(0deg); }
        }
        @keyframes achShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────
function AchToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed',
      // On mobile: bottom-center above the bottom nav
      // On desktop: top-right
      bottom: 80,
      right: 16,
      left: 16,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 10,
      pointerEvents: 'none',
    }}>
      <style>{`
        @media (min-width: 768px) {
          .ach-toast-container {
            bottom: auto !important;
            top: 24px !important;
            left: auto !important;
            right: 24px !important;
          }
        }
      `}</style>
      <div
        className="ach-toast-container"
        style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          alignItems: 'flex-end', pointerEvents: 'all',
          width: '100%', maxWidth: 340,
        }}
      >
        {toasts.map(t => (
          <AchToast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────
export function AchievementProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const notify = useCallback((achievements) => {
    if (!achievements?.length) return;
    achievements.forEach((ach, i) => {
      setTimeout(() => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, ...ach }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 6000);
      }, i * 700);
    });
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AchCtx.Provider value={{ notify }}>
      {children}
      <AchToastContainer toasts={toasts} onDismiss={dismiss} />
    </AchCtx.Provider>
  );
}

export const useAchievements = () => useContext(AchCtx);
