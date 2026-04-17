// ============================================================
// ShopPage.jsx — Fixed:
// 1. PNG images properly contained, no overlap with text/labels
// 2. Category filter buttons span full buddy grid width
// 3. Achievement-only items show lock overlay + hover modal (no coin option)
// 4. Buttons are theme-aware (visible in light, dark, high-contrast)
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth }   from '../contexts/AuthContext';
import api           from '../utils/api';
import CharacterAvatar from '../components/character/CharacterAvatar';
import CoinIcon from '../components/ui/CoinIcon';
import {
  ALL_CHARACTERS,
  characterById,
  DEFAULT_CHARACTER_ID,
  RARITY_CONFIG,
} from '../components/character/CHARACTER_CATALOG';
import { ShoppingBag, Check, ChevronDown, ChevronUp, Sparkles, Lock, Trophy, Info } from 'lucide-react';

const RARITY_ORDER   = { common:0, uncommon:1, rare:2, epic:3, mythic:4 };
const RARITY_FILTERS = [
  { key:'all',      label:'All'      },
  { key:'common',   label:'Common'   },
  { key:'uncommon', label:'Uncommon' },
  { key:'rare',     label:'Rare'     },
  { key:'mythic',   label:'Mythic'   },
];

// Achievement key → human-readable label map
const ACH_LABELS = {
  first_star:    'Complete your first activity',
  complete_5:    'Complete 5 activities',
  complete_10:   'Complete 10 activities',
  complete_25:   'Complete 25 activities',
  completionist: 'Complete ALL 52 activities',
  xp_100:        'Earn 100 XP',
  xp_500:        'Earn 500 XP',
  xp_1000:       'Earn 1,000 XP',
  level_3:       'Reach Level 3',
  five_streak:   'Reach a 5-day streak',
  ten_streak:    'Reach a 10-day streak',
  level_10:      'Reach Level 10',
};

// ── Achievement Hover Modal ───────────────────────────────────
function AchievementTooltip({ earnedBy, visible }) {
  if (!visible) return null;
  const label = ACH_LABELS[earnedBy] || earnedBy;
  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 10,
      zIndex: 100,
      width: 190,
      padding: '10px 12px',
      borderRadius: 12,
      background: '#1e1b4b',
      color: '#e0e7ff',
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1.5,
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      pointerEvents: 'none',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 5 }}>
        <Trophy size={12} style={{ color: '#fbbf24', flexShrink: 0 }} />
        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Achievement Required
        </span>
      </div>
      <span style={{ color: '#c7d2fe' }}>{label}</span>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 12,
        height: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 10,
          height: 10,
          background: '#1e1b4b',
          transform: 'rotate(45deg)',
          transformOrigin: 'top left',
          marginLeft: 1,
        }} />
      </div>
    </div>
  );
}

// ── Character Card ─────────────────────────────────────────────
// Fixed layout: image in fixed-height box, text always below, no overlap
function CharacterCard({ char, owned, equipped, coinBalance, userAchievements,
                         onBuy, onEquip, buying, equipping }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const rc          = RARITY_CONFIG[char.rarity];
  const isOwned     = owned;
  const isEquipped  = equipped;
  const hasAch      = char.earnedBy && userAchievements?.includes(char.earnedBy);
  const achOnly     = !!char.earnedBy && char.cost === 0;
  const freeByAch   = char.earnedBy && !isOwned && hasAch && achOnly;
  const lockedByAch = achOnly && !isOwned && !hasAch;
  const canAfford   = !isOwned && !achOnly && coinBalance >= (char.cost || 0);
  const isBuying    = buying === char.id;
  const isEquipping = equipping === char.id;

  // ── Button configuration ──────────────────────────────────
  let btnContent, btnAction, btnDisabled;
  // These are explicit CSS values, not theme variables, so they work in all themes
  let btnBgColor, btnTextColor, btnBorderColor;

  if (lockedByAch) {
    // Locked — show info button that triggers tooltip
    btnContent    = <><Lock size={12} style={{ flexShrink: 0 }} /> Achievement Only</>;
    btnAction     = () => {};
    btnDisabled   = true;
    btnBgColor    = 'rgba(100,100,120,0.18)';
    btnTextColor  = '#9ca3af';
    btnBorderColor= 'rgba(156,163,175,0.35)';
  } else if (isOwned || char.isDefault) {
    btnContent    = isEquipping ? '…' : isEquipped ? <><Check size={13} strokeWidth={3} /> Equipped</> : 'Equip';
    btnAction     = () => onEquip(char);
    btnDisabled   = isEquipping || isEquipped;
    btnBgColor    = isEquipped ? rc.color : 'transparent';
    btnTextColor  = isEquipped ? '#ffffff' : rc.color;
    btnBorderColor= rc.color;
  } else if (freeByAch) {
    btnContent    = isBuying ? '…' : '🎁 Claim Free';
    btnAction     = () => onBuy({ ...char, cost: 0 });
    btnDisabled   = isBuying;
    btnBgColor    = '#f59e0b';
    btnTextColor  = '#ffffff';
    btnBorderColor= '#d97706';
  } else {
    // Normal coin purchase
    btnContent    = isBuying ? '…' : <><CoinIcon size={11} /> {char.cost}</>;
    btnAction     = canAfford ? () => onBuy(char) : () => {};
    btnDisabled   = isBuying || !canAfford;
    btnBgColor    = canAfford ? '#f59e0b' : 'rgba(100,100,120,0.18)';
    btnTextColor  = canAfford ? '#ffffff' : '#9ca3af';
    btnBorderColor= canAfford ? '#d97706' : 'rgba(156,163,175,0.35)';
  }

  return (
    <div style={{
      borderRadius: 16,
      border: isEquipped
        ? `2px solid ${rc.color}`
        : `2px solid ${isOwned ? rc.border : 'rgba(156,163,175,0.2)'}`,
      background: isEquipped
        ? rc.bg
        : 'var(--bg-card-grad)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'visible',        // allow tooltip to overflow
      position: 'relative',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isEquipped ? `0 0 16px ${rc.glow}` : 'none',
    }}>

      {/* ── Rarity badge — top left, inside card ── */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 3,
        padding: '2px 7px', borderRadius: 999,
        fontSize: 8, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
        background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>{rc.label}</div>

      {/* ── Equipped check — top right ── */}
      {isEquipped && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 3,
          width: 20, height: 20, borderRadius: '50%',
          background: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Check size={11} color="#fff" strokeWidth={3}/>
        </div>
      )}

      {/* ── Character image: fixed height box, centered, never overflows ── */}
      <div style={{
        width: '100%',
        height: 110,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // top padding leaves room for rarity badge; bottom padding separates from text
        paddingTop: 28,
        paddingBottom: 8,
        paddingLeft: 8,
        paddingRight: 8,
        boxSizing: 'border-box',
        overflow: 'hidden',        // strictly clip image
        position: 'relative',
        // subtle gradient bg matching rarity when equipped
        background: isEquipped
          ? `linear-gradient(180deg, ${rc.bg} 0%, transparent 100%)`
          : 'transparent',
      }}>
        {/* Lock overlay for achievement-only locked characters */}
        {lockedByAch && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,20,0.55)',
            borderRadius: '14px 14px 0 0',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(30,27,75,0.85)',
              border: '2px solid rgba(139,92,246,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 1,
            }}>
              <Lock size={16} color="#a78bfa" strokeWidth={2.5} />
            </div>
          </div>
        )}

        <CharacterAvatar
          characterId={char.id}
          size={68}
          showGlow={isOwned || char.isDefault}
          animate={isEquipped}
        />
      </div>

      {/* ── Text info block — always below image, never overlaps ── */}
      <div style={{
        padding: '4px 10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flex: 1,
        // Divider line between image area and text
        borderTop: '1px solid rgba(156,163,175,0.12)',
      }}>
        <p style={{
          fontSize: 13, fontWeight: 800,
          color: 'var(--text-primary)',
          margin: 0, textAlign: 'center',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {char.name}
        </p>
        <p style={{
          fontSize: 10, color: '#9ca3af',
          margin: 0, textAlign: 'center',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: 26,
        }}>
          {char.desc}
        </p>

        {/* Achievement hint for non-locked owned-by-achievement chars */}
        {freeByAch && (
          <p style={{
            fontSize: 9, fontWeight: 700, color: '#f59e0b',
            margin: '1px 0 0', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            🏅 Achievement unlocked — claim free!
          </p>
        )}

        {/* ── Action button with tooltip wrapper ── */}
        <div style={{ position: 'relative', marginTop: 5 }}
          onMouseEnter={() => lockedByAch && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <AchievementTooltip earnedBy={char.earnedBy} visible={showTooltip && lockedByAch} />

          <button
            onClick={btnAction}
            disabled={btnDisabled}
            style={{
              width: '100%',
              padding: '8px 4px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              cursor: btnDisabled && !lockedByAch ? 'not-allowed'
                    : lockedByAch ? 'help'
                    : 'pointer',
              opacity: (btnDisabled && !isEquipped && !lockedByAch) ? 0.6 : 1,
              transition: 'opacity 0.15s, transform 0.1s',
              fontFamily: 'inherit',
              background: btnBgColor,
              color: btnTextColor,
              border: `2px solid ${btnBorderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              boxSizing: 'border-box',
              // Never invisible — always has a visible border
              minHeight: 34,
            }}
            onMouseDown={e => { if (!btnDisabled) e.currentTarget.style.transform = 'scale(0.96)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {btnContent}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Panel ─────────────────────────────────────────────
function EquippedPreview({ equippedId, ownedCount }) {
  const char = characterById(equippedId) || characterById(DEFAULT_CHARACTER_ID);
  const rc   = RARITY_CONFIG[char?.rarity || 'common'];
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile collapsible */}
      <div className="md:hidden" style={{
        borderRadius: 20,
        border: `2px solid ${rc.border}`,
        background: 'var(--bg-card-grad)',
        overflow: 'hidden',
        marginBottom: 4,
      }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, flexShrink: 0,
              border: `2px solid ${rc.border}`,
              borderRadius: 12,
              background: rc.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <CharacterAvatar characterId={equippedId} size={38} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{char?.name}</p>
              <p style={{ fontSize: 10, color: rc.color, margin: 0, fontWeight: 700 }}>{rc.label} · Equipped</p>
            </div>
          </div>
          {open ? <ChevronUp size={18} style={{ color:'#9ca3af' }}/> : <ChevronDown size={18} style={{ color:'#9ca3af' }}/>}
        </button>
        {open && (
          <div style={{
            padding: '0 16px 16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'center',
          }}>
            <CharacterAvatar characterId={equippedId} size={140} showGlow animate />
          </div>
        )}
      </div>

      {/* Desktop sticky sidebar */}
      <div className="hidden md:flex" style={{
        width: 210, flexShrink: 0, flexDirection: 'column', alignItems: 'center', gap: 12,
        borderRadius: 24, padding: '20px 16px',
        border: `2px solid ${rc.border}`,
        background: 'var(--bg-card-grad)',
        position: 'sticky', top: 16,
        boxShadow: `0 0 24px ${rc.glow}`,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Active Buddy</p>

        {/* Fixed image box with border */}
        <div style={{
          width: 150, height: 150, flexShrink: 0,
          border: `2px solid ${rc.border}`,
          borderRadius: 18,
          background: rc.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <CharacterAvatar characterId={equippedId} size={120} showGlow animate />
        </div>

        <div style={{ textAlign: 'center', width: '100%' }}>
          <p style={{
            fontWeight: 800, fontSize: 15, color: 'var(--text-primary)',
            margin: '0 0 4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {char?.name}
          </p>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
            background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
          }}>{rc.label}</span>
        </div>

        <p style={{
          fontSize: 11, color: '#9ca3af',
          textAlign: 'center', margin: 0, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{char?.desc}</p>

        <div style={{
          width: '100%', padding: '10px 12px', borderRadius: 12,
          background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center',
        }}>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px' }}>Collection</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {ownedCount} <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>/ {ALL_CHARACTERS.length}</span>
          </p>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ShopPage() {
  const { user, refreshUser, patchUser } = useAuth();

  const [wardrobe,   setWardrobe]   = useState([DEFAULT_CHARACTER_ID]);
  const [equippedId, setEquippedId] = useState(DEFAULT_CHARACTER_ID);
  const [filter,     setFilter]     = useState('all');
  const [buying,     setBuying]     = useState(null);
  const [equipping,  setEquipping]  = useState(null);
  const [toast,      setToast]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get('/users/wardrobe');
      const wdr = res.data.wardrobe || [];
      const eq  = res.data.equipped  || {};
      setWardrobe(Array.from(new Set([DEFAULT_CHARACTER_ID, ...wdr])));
      const activeChar = eq.character || DEFAULT_CHARACTER_ID;
      setEquippedId(characterById(activeChar) ? activeChar : DEFAULT_CHARACTER_ID);
    } catch (_) {
      setWardrobe([DEFAULT_CHARACTER_ID]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const charId = user?.equipped?.character;
    if (charId && characterById(charId)) {
      setEquippedId(charId);
    }
  }, [user?.equipped?.character]);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (char) => {
    const currentCoins = user?.coins ?? 0;
    const cost = char.cost || 0;
    if (cost > 0 && currentCoins < cost) { showToast('Not enough coins!', 'error'); return; }
    setBuying(char.id);
    if (cost > 0) patchUser({ coins: currentCoins - cost });
    setWardrobe(prev => Array.from(new Set([...prev, char.id])));
    try {
      await api.post('/users/buy-item', { itemId: char.id, cost });
      refreshUser();
      showToast(`✨ Got ${char.name}!`);
    } catch (err) {
      if (cost > 0) patchUser({ coins: currentCoins });
      setWardrobe(prev => prev.filter(id => id !== char.id));
      showToast(err.message || 'Purchase failed', 'error');
    } finally { setBuying(null); }
  };

  const handleEquip = async (char) => {
    if (equippedId === char.id) return;
    const prev = equippedId;
    setEquippedId(char.id);
    setEquipping(char.id);
    patchUser({ equipped: { ...(user?.equipped || {}), character: char.id } });
    try {
      await api.post('/users/equip-item', { category: 'character', itemId: char.id });
      refreshUser();
    } catch (_) {
      setEquippedId(prev);
      patchUser({ equipped: { ...(user?.equipped || {}), character: prev } });
    }
    finally { setEquipping(null); }
  };

  const owned       = (id) => wardrobe.includes(id);
  const coinBalance = user?.coins ?? 0;
  const ownedCount  = ALL_CHARACTERS.filter(c => owned(c.id)).length;

  const displayed = ALL_CHARACTERS
    .filter(c => filter === 'all' || c.rarity === filter)
    .sort((a, b) => {
      const aO = owned(a.id) ? 0 : 1;
      const bO = owned(b.id) ? 0 : 1;
      if (aO !== bO) return aO - bO;
      return (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0);
    });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:24, left:'50%', transform:'translateX(-50%)',
          zIndex:9999, padding:'12px 20px', borderRadius:16,
          fontWeight:700, color:'#fff', fontSize:14, whiteSpace:'nowrap',
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
        }}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 className="font-display" style={{ fontSize:28, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8, margin:0 }}>
            <ShoppingBag size={24} style={{ color:'#60B8F5' }}/> Buddy Shop
          </h1>
          <p style={{ fontSize:12, color:'#9ca3af', margin:'3px 0 0' }}>
            {ownedCount} of {ALL_CHARACTERS.length} collected
          </p>
        </div>
        {/* Coin balance — always visible with explicit colors */}
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
          borderRadius:999, fontWeight:700, fontSize:14,
          background:'rgba(251,191,36,0.15)',
          color:'#D97706',
          border:'2px solid rgba(251,191,36,0.4)',
        }}>
          <CoinIcon size={16}/><span>{coinBalance}</span>
        </div>
      </div>

      {/* ── HOW TO GET COINS ── */}
      <div style={{
        borderRadius: 20, padding: '16px 20px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-card-grad)',
      }}>
        <h3 className="font-display" style={{ fontSize:16, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          How to Get Coins &amp; Buddies
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
          {[
            { icon:'🎮', title:'Play Activities',     desc:'Earn coins equal to 1.5× your XP reward'      },
            { icon:'🏆', title:'Unlock Achievements', desc:'Bonus coins + free buddies for milestones'     },
            { icon:'🎁', title:'Achievement Buddies', desc:'Some buddies unlock free with achievements'   },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
              borderRadius:14, background:'var(--bg-primary)', border:'1px solid var(--border-color)',
            }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
              <div>
                <p style={{ fontWeight:700, fontSize:12, color:'var(--text-primary)', margin:0 }}>{title}</p>
                <p style={{ fontSize:10, color:'#9ca3af', margin:'2px 0 0', lineHeight:1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Collection progress ── */}
      <div style={{ borderRadius:16, padding:'12px 16px', background:'var(--bg-card-grad)', border:'1px solid var(--border-color)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>
            <Sparkles size={12} style={{ display:'inline', marginRight:4, color:'#F59E0B' }}/>
            Collection Progress
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:'#9ca3af' }}>{ownedCount} / {ALL_CHARACTERS.length}</span>
        </div>
        <div style={{ height:8, borderRadius:999, background:'var(--border-color)', overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:999,
            background:'linear-gradient(90deg, #60B8F5, #A855F7, #F97316)',
            width:`${Math.round((ownedCount / ALL_CHARACTERS.length) * 100)}%`,
            transition:'width 0.7s ease',
          }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, gap:8, flexWrap:'wrap' }}>
          {Object.entries(RARITY_CONFIG).map(([key, rc]) => {
            const total = ALL_CHARACTERS.filter(c => c.rarity === key).length;
            const got   = ALL_CHARACTERS.filter(c => c.rarity === key && owned(c.id)).length;
            if (!total) return null;
            return <span key={key} style={{ fontSize:10, fontWeight:700, color:rc.color }}>{rc.label}: {got}/{total}</span>;
          })}
        </div>
      </div>

      {/* ── Main layout: preview + grid ── */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
        <EquippedPreview equippedId={equippedId} ownedCount={ownedCount}/>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

          {/* ── Filter pills — spans full width of grid ── */}
          {/* Use CSS grid so pills are equal width and span the full container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${RARITY_FILTERS.length}, 1fr)`,
            gap: 6,
            width: '100%',
          }}>
            {RARITY_FILTERS.map(f => {
              const rc = RARITY_CONFIG[f.key];
              const isActive = filter === f.key;
              // Use explicit colors so buttons are always readable
              const activeBg     = rc?.bg     || 'rgba(96,184,245,0.18)';
              const activeColor  = rc?.color  || '#60B8F5';
              const activeBorder = rc?.color  || '#60B8F5';
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding:'8px 4px', borderRadius:12, fontSize:11, fontWeight:800,
                    whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit',
                    border: isActive ? `2px solid ${activeBorder}` : '2px solid rgba(156,163,175,0.25)',
                    background: isActive ? activeBg : 'var(--bg-card-grad)',
                    color: isActive ? activeColor : 'var(--text-muted, #9ca3af)',
                    transition:'all 0.15s',
                    textAlign: 'center',
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* ── Character grid ── */}
          {/* overflow:visible so tooltips can escape card boundaries */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(138px, 1fr))',
            gap:12,
            overflow: 'visible',
          }}>
            {displayed.map(char => (
              <CharacterCard
                key={char.id}
                char={char}
                owned={owned(char.id) || !!char.isDefault}
                equipped={equippedId === char.id}
                coinBalance={coinBalance}
                userAchievements={user?.achievements || []}
                onBuy={handleBuy}
                onEquip={handleEquip}
                buying={buying}
                equipping={equipping}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
