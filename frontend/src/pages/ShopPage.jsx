// ============================================================
// ShopPage.jsx — Fixed:
// 1. Character PNG fills the AppIconBox (object-fit: cover / contain
//    with padding=0 so image occupies full tile, not a tiny centered dot)
// 2. Equip/Buy button text + border adapt to dark themes automatically
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
import { ShoppingBag, Check, ChevronDown, ChevronUp, Sparkles, Lock, Trophy } from 'lucide-react';

const RARITY_ORDER   = { common:0, uncommon:1, rare:2, epic:3, mythic:4 };
const RARITY_FILTERS = [
  { key:'all',      label:'All'      },
  { key:'common',   label:'Common'   },
  { key:'uncommon', label:'Uncommon' },
  { key:'rare',     label:'Rare'     },
  { key:'mythic',   label:'Mythic'   },
];

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

// ── Achievement Hover Tooltip ─────────────────────────────────
function AchievementTooltip({ earnedBy, visible }) {
  if (!visible) return null;
  const label = ACH_LABELS[earnedBy] || earnedBy;
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: '50%',
      transform: 'translateX(-50%)', marginBottom: 10, zIndex: 100,
      width: 190, padding: '10px 12px', borderRadius: 12,
      background: '#1e1b4b', color: '#e0e7ff', fontSize: 11,
      fontWeight: 600, lineHeight: 1.5,
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      pointerEvents: 'none', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 5 }}>
        <Trophy size={12} style={{ color: '#fbbf24', flexShrink: 0 }} />
        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Achievement Required
        </span>
      </div>
      <span style={{ color: '#c7d2fe' }}>{label}</span>
      <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 6, overflow: 'hidden' }}>
        <div style={{ width: 10, height: 10, background: '#1e1b4b', transform: 'rotate(45deg)', transformOrigin: 'top left', marginLeft: 1 }} />
      </div>
    </div>
  );
}

// ── App-Icon Avatar Box ───────────────────────────────────────
// The PNG fills the entire tile. No whitespace padding — the character
// image uses object-fit:contain so it scales to edges without cropping.
function AppIconBox({ children, size = 80, equipped = false, locked = false, rarityColor }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.22),
      border: equipped
        ? `3px solid #1a1a2e`
        : `2.5px solid #1a1a2e`,
      // Transparent background — the PNG itself provides the visual
      background: locked ? 'rgba(20,20,30,0.08)' : 'transparent',
      boxShadow: equipped
        ? `0 3px 0 #1a1a2e, 0 6px 16px rgba(0,0,0,0.25)`
        : `0 2px 0 #1a1a2e, 0 4px 10px rgba(0,0,0,0.15)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}>
      {children}
    </div>
  );
}

// ── Character Card ────────────────────────────────────────────
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

  // ── Button styling — adapts to dark/light theme ──────────────
  // Uses CSS variable colours so it always reads correctly against the
  // current background regardless of theme.
  let btnContent, btnAction, btnDisabled;
  let btnStyle;

  if (lockedByAch) {
    btnContent  = <><Lock size={12} style={{ flexShrink: 0 }} /> Achievement Only</>;
    btnAction   = () => {};
    btnDisabled = true;
    btnStyle = {
      background: 'rgba(156,163,175,0.15)',
      color: 'var(--text-muted, #9ca3af)',
      border: '2px solid rgba(156,163,175,0.4)',
    };
  } else if (isOwned || char.isDefault) {
    btnContent  = isEquipping ? '…' : isEquipped ? <><Check size={13} strokeWidth={3} /> Equipped</> : 'Equip';
    btnAction   = () => onEquip(char);
    btnDisabled = isEquipping || isEquipped;
    btnStyle = isEquipped
      ? {
          background: '#1a1a2e',
          color: '#ffffff',
          border: '2px solid #1a1a2e',
        }
      : {
          // Visible on both light and dark themes
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '2px solid var(--border-interactive, #888)',
        };
  } else if (freeByAch) {
    btnContent  = isBuying ? '…' : '🎁 Claim Free';
    btnAction   = () => onBuy({ ...char, cost: 0 });
    btnDisabled = isBuying;
    btnStyle = {
      background: '#f59e0b',
      color: '#ffffff',
      border: '2px solid #d97706',
    };
  } else {
    btnContent  = isBuying ? '…' : <><CoinIcon size={11} /> {char.cost}</>;
    btnAction   = canAfford ? () => onBuy(char) : () => {};
    btnDisabled = isBuying || !canAfford;
    btnStyle = canAfford
      ? { background: '#f59e0b', color: '#ffffff', border: '2px solid #d97706' }
      : {
          background: 'rgba(156,163,175,0.15)',
          color: 'var(--text-muted, #9ca3af)',
          border: '2px solid rgba(156,163,175,0.4)',
        };
  }

  const cardBorderWidth = isEquipped ? 3 : isOwned ? 2.5 : 2;
  const cardBorderColor = isEquipped
    ? rc.color
    : isOwned
    ? `${rc.color}99`
    : `${rc.color}55`;

  return (
    <div style={{
      borderRadius: 16,
      border: `${cardBorderWidth}px solid ${cardBorderColor}`,
      background: isEquipped ? rc.bg : 'var(--bg-card-grad)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'visible',
      position: 'relative',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isEquipped
        ? `0 0 20px ${rc.glow}`
        : isOwned
        ? `0 2px 8px ${rc.glow}`
        : 'none',
    }}>

      {/* Rarity badge */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 3,
        padding: '2px 7px', borderRadius: 999,
        fontSize: 8, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
        background: rc.bg, color: rc.color, border: `1.5px solid ${rc.border}`,
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>{rc.label}</div>

      {/* Equipped check */}
      {isEquipped && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 3,
          width: 20, height: 20, borderRadius: '50%',
          background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Check size={11} color="#fff" strokeWidth={3}/>
        </div>
      )}

      {/* ── Character image area — PNG fills the full tile ── */}
      <div style={{
        width: '100%',
        paddingTop: 36,
        paddingBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: '14px 14px 0 0',
        background: isEquipped
          ? `linear-gradient(180deg, ${rc.bg} 0%, transparent 100%)`
          : 'transparent',
      }}>
        {/* Lock overlay */}
        {lockedByAch && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,20,0.45)',
            borderRadius: '13px 13px 0 0',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(30,27,75,0.9)',
              border: '2px solid rgba(139,92,246,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={14} color="#a78bfa" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* AppIconBox: PNG fills the full box */}
        <AppIconBox size={72} equipped={isEquipped} locked={lockedByAch} rarityColor={rc.color}>
          <CharacterAvatar
            characterId={char.id}
            size={72}       /* match box size exactly so PNG fills edge-to-edge */
            showGlow={false}
            animate={false}
          />
        </AppIconBox>
      </div>

      {/* Text info */}
      <div style={{
        padding: '6px 10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flex: 1,
        width: '100%',
        boxSizing: 'border-box',
        borderTop: `1px solid ${rc.color}20`,
      }}>
        <p style={{
          fontSize: 13, fontWeight: 800, color: 'var(--text-primary)',
          margin: 0, textAlign: 'center', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {char.name}
        </p>
        <p style={{
          fontSize: 10, color: 'var(--text-muted, #9ca3af)', margin: 0, textAlign: 'center', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', minHeight: 26,
        }}>
          {char.desc}
        </p>
        {freeByAch && (
          <p style={{
            fontSize: 9, fontWeight: 700, color: '#f59e0b',
            margin: '1px 0 0', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            🏅 Achievement unlocked — claim free!
          </p>
        )}

        {/* Action button — theme-adaptive */}
        <div style={{ position: 'relative', marginTop: 5 }}
          onMouseEnter={() => lockedByAch && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}>
          <AchievementTooltip earnedBy={char.earnedBy} visible={showTooltip && lockedByAch} />
          <button
            onClick={btnAction}
            disabled={btnDisabled}
            style={{
              width: '100%', padding: '8px 4px', borderRadius: 10,
              fontSize: 12, fontWeight: 800,
              cursor: btnDisabled && !lockedByAch ? 'not-allowed' : lockedByAch ? 'help' : 'pointer',
              opacity: (btnDisabled && !isEquipped && !lockedByAch) ? 0.6 : 1,
              transition: 'opacity 0.15s, transform 0.1s',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              boxSizing: 'border-box', minHeight: 34,
              ...btnStyle,
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

// ── Preview Panel (Active Buddy) ──────────────────────────────
function EquippedPreview({ equippedId, ownedCount }) {
  const char = characterById(equippedId) || characterById(DEFAULT_CHARACTER_ID);
  const rc   = RARITY_CONFIG[char?.rarity || 'common'];
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile collapsible */}
      <div className="md:hidden" style={{
        borderRadius: 20, border: `3px solid #1a1a2e`,
        background: 'var(--bg-card-grad)', overflow: 'hidden', marginBottom: 4,
        boxShadow: '0 4px 0 #1a1a2e',
      }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Full-size preview — PNG fills the box */}
            <AppIconBox size={52} equipped rarityColor={rc.color}>
              <CharacterAvatar characterId={equippedId} size={52} animate={false} />
            </AppIconBox>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{char?.name}</p>
              <p style={{ fontSize: 10, color: rc.color, margin: 0, fontWeight: 700 }}>{rc.label} · Equipped</p>
            </div>
          </div>
          {open ? <ChevronUp size={18} style={{ color:'var(--text-muted)' }}/> : <ChevronDown size={18} style={{ color:'var(--text-muted)' }}/>}
        </button>
        {open && (
          <div style={{
            padding: '0 16px 20px', borderTop: `1px solid rgba(26,26,46,0.15)`,
            display: 'flex', justifyContent: 'center',
          }}>
            <AppIconBox size={130} equipped rarityColor={rc.color}>
              <CharacterAvatar characterId={equippedId} size={130} showGlow animate={false} />
            </AppIconBox>
          </div>
        )}
      </div>

      {/* Desktop sticky sidebar */}
      <div className="hidden md:flex" style={{
        width: 210, flexShrink: 0, flexDirection: 'column', alignItems: 'center', gap: 12,
        borderRadius: 24, padding: '20px 16px',
        border: `3px solid #1a1a2e`,
        background: 'var(--bg-card-grad)',
        position: 'sticky', top: 16,
        boxShadow: `0 5px 0 #1a1a2e, 0 8px 24px rgba(0,0,0,0.15)`,
        transition: 'box-shadow 0.3s',
      }}>
        <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Active Buddy</p>

        {/* PNG fills the full preview box */}
        <AppIconBox size={150} equipped rarityColor={rc.color}>
          <CharacterAvatar characterId={equippedId} size={150} showGlow animate={false} />
        </AppIconBox>

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
            background: rc.bg, color: rc.color, border: `1.5px solid ${rc.border}`,
          }}>{rc.label}</span>
        </div>

        <p style={{
          fontSize: 11, color: 'var(--text-muted, #9ca3af)', textAlign: 'center', margin: 0, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{char?.desc}</p>

        <div style={{
          width: '100%', padding: '10px 12px', borderRadius: 12,
          background: 'var(--bg-primary)', border: '2px solid #1a1a2e', textAlign: 'center',
          boxShadow: '0 2px 0 #1a1a2e',
        }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px' }}>Collection</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {ownedCount} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>/ {ALL_CHARACTERS.length}</span>
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
    if (charId && characterById(charId)) setEquippedId(charId);
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

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 className="font-display" style={{ fontSize:28, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8, margin:0 }}>
            <ShoppingBag size={24} style={{ color:'#60B8F5' }}/> Buddy Shop
          </h1>
          <p style={{ fontSize:12, color:'var(--text-muted)', margin:'3px 0 0' }}>
            {ownedCount} of {ALL_CHARACTERS.length} collected
          </p>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
          borderRadius:999, fontWeight:700, fontSize:14,
          background:'rgba(251,191,36,0.15)', color:'#D97706',
          border:'2px solid rgba(251,191,36,0.5)',
        }}>
          <CoinIcon size={16}/><span>{coinBalance}</span>
        </div>
      </div>

      {/* How to get coins */}
      <div style={{ borderRadius:20, padding:'16px 20px', border:'2px solid var(--border-color)', background:'var(--bg-card-grad)' }}>
        <h3 className="font-display" style={{ fontSize:16, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          How to Get Coins &amp; Buddies
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
          {[
            { icon:'🎮', title:'Play Activities',     desc:'Earn coins equal to 1.5× your XP reward'     },
            { icon:'🏆', title:'Unlock Achievements', desc:'Bonus coins + free buddies for milestones'    },
            { icon:'🎁', title:'Achievement Buddies', desc:'Some buddies unlock free with achievements'   },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
              borderRadius:14, background:'var(--bg-primary)', border:'2px solid var(--border-color)',
            }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
              <div>
                <p style={{ fontWeight:700, fontSize:12, color:'var(--text-primary)', margin:0 }}>{title}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', margin:'2px 0 0', lineHeight:1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collection progress */}
      <div style={{ borderRadius:16, padding:'12px 16px', background:'var(--bg-card-grad)', border:'2px solid var(--border-color)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>
            <Sparkles size={12} style={{ display:'inline', marginRight:4, color:'#F59E0B' }}/>
            Collection Progress
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)' }}>{ownedCount} / {ALL_CHARACTERS.length}</span>
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

      {/* Main layout */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
        <EquippedPreview equippedId={equippedId} ownedCount={ownedCount}/>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Filter pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
            gap: 6, width: '100%',
          }}>
            {RARITY_FILTERS.map(f => {
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding:'8px 4px', borderRadius:12, fontSize:11, fontWeight:800,
                    whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit',
                    border: isActive
                      ? `2px solid var(--text-primary)`
                      : '2px solid var(--border-color)',
                    background: isActive ? 'var(--text-primary)' : 'var(--bg-card-grad)',
                    color: isActive ? 'var(--bg-primary)' : 'var(--text-muted, #9ca3af)',
                    transition:'all 0.15s', textAlign:'center',
                    minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                    boxShadow: isActive ? '0 2px 0 rgba(0,0,0,0.2)' : 'none',
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Character grid */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(138px, 1fr))',
            gap:12, overflow:'visible',
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
