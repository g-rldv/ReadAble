// ============================================================
// ShopPage.jsx — Character collection shop
// Fix: handleEquip now calls patchUser({ equipped: { character: id } })
// so ProfilePage, AppLayout sidebar, and LeaderboardPage all update
// immediately without needing a page refresh or poll cycle.
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
import { ShoppingBag, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const RARITY_ORDER   = { common:0, uncommon:1, rare:2, epic:3, mythic:4 };
const RARITY_FILTERS = [
  { key:'all',      label:'All'      },
  { key:'common',   label:'Common'   },
  { key:'uncommon', label:'Uncommon' },
  { key:'rare',     label:'Rare'     },
  { key:'mythic',   label:'Mythic'   },
];

// ── Character Card ────────────────────────────────────────────
function CharacterCard({ char, owned, equipped, coinBalance, userAchievements,
                         onBuy, onEquip, buying, equipping }) {
  const rc          = RARITY_CONFIG[char.rarity];
  const isOwned     = owned;
  const isEquipped  = equipped;
  const hasAch      = char.earnedBy && userAchievements?.includes(char.earnedBy);
  const freeByAch   = char.earnedBy && !isOwned && hasAch;
  const canAfford   = !isOwned && coinBalance >= (char.cost || 0);
  const isBuying    = buying === char.id;
  const isEquipping = equipping === char.id;
  const achOnly     = !!char.earnedBy && char.cost === 0;

  let btnLabel, btnAction, btnDisabled, btnBg, btnColor, btnBorder;

  if (isOwned || char.isDefault) {
    btnLabel    = isEquipping ? '…' : isEquipped ? '✓ Equipped' : 'Equip';
    btnAction   = () => onEquip(char);
    btnDisabled = isEquipping || isEquipped;
    btnBg       = isEquipped ? rc.color : 'var(--bg-primary)';
    btnColor    = isEquipped ? '#fff'   : rc.color;
    btnBorder   = rc.color;
  } else if (freeByAch) {
    btnLabel    = isBuying ? '…' : '🎁 Claim Free';
    btnAction   = () => onBuy({ ...char, cost: 0 });
    btnDisabled = isBuying;
    btnBg = '#F59E0B'; btnColor = '#fff'; btnBorder = '#F59E0B';
  } else if (achOnly && !hasAch) {
    btnLabel    = '🔒 Achievement';
    btnAction   = () => {};
    btnDisabled = true;
    btnBg = 'var(--bg-primary)'; btnColor = '#9ca3af'; btnBorder = '#e5e7eb';
  } else {
    btnLabel    = isBuying ? '…' : `🪙 ${char.cost}`;
    btnAction   = canAfford ? () => onBuy(char) : () => {};
    btnDisabled = isBuying || !canAfford;
    btnBg       = canAfford ? '#F59E0B' : 'var(--bg-primary)';
    btnColor    = canAfford ? '#fff'    : '#9ca3af';
    btnBorder   = canAfford ? '#F59E0B' : '#e5e7eb';
  }

  const dimmed = achOnly && !hasAch && !isOwned;

  return (
    <div style={{
      borderRadius: 20,
      border: isEquipped
        ? `2px solid ${rc.color}`
        : isOwned ? `2px solid ${rc.border}` : '2px solid var(--border-color)',
      background: isEquipped ? rc.bg : 'var(--bg-card-grad)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px 12px 14px',
      position: 'relative',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isEquipped ? `0 0 16px ${rc.glow}` : 'none',
      opacity: dimmed ? 0.65 : 1,
    }}>
      {/* Rarity badge */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        padding: '2px 8px', borderRadius: 999,
        fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
      }}>{rc.label}</div>

      {/* Equipped check */}
      {isEquipped && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 20, height: 20, borderRadius: '50%',
          background: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={11} color="#fff" strokeWidth={3}/>
        </div>
      )}

      {/* Character image */}
      <div style={{ width: 88, height: 88, marginTop: 12, marginBottom: 10, position: 'relative' }}>
        {dimmed && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
            fontSize: 24,
          }}>🔒</div>
        )}
        <CharacterAvatar
          characterId={char.id} size={88}
          showGlow={isOwned || char.isDefault}
          animate={isEquipped}
        />
      </div>

      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px', textAlign: 'center', lineHeight: 1.2 }}>
        {char.name}
      </p>
      <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 10px', textAlign: 'center', lineHeight: 1.4, minHeight: 28 }}>
        {char.desc}
      </p>

      {!isOwned && !char.isDefault && char.earnedBy && !hasAch && (
        <p style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', margin: '0 0 6px', textAlign: 'center' }}>
          🏅 Unlock via achievement
        </p>
      )}

      <button
        onClick={btnAction}
        disabled={btnDisabled}
        style={{
          width: '100%', padding: '8px 0', borderRadius: 12,
          fontSize: 12, fontWeight: 800, cursor: btnDisabled ? 'not-allowed' : 'pointer',
          opacity: btnDisabled && !isEquipped ? 0.6 : 1,
          transition: 'opacity 0.15s, transform 0.1s',
          fontFamily: 'inherit',
          background: btnBg, color: btnColor, border: `2px solid ${btnBorder}`,
        }}
        onMouseDown={e => { if (!btnDisabled) e.currentTarget.style.transform = 'scale(0.96)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {btnLabel}
      </button>
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
        borderRadius: 20, border: `2px solid ${rc.border}`,
        background: 'var(--bg-card-grad)', overflow: 'hidden', marginBottom: 4,
      }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CharacterAvatar characterId={equippedId} size={44}/>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{char?.name}</p>
              <p style={{ fontSize: 10, color: rc.color, margin: 0, fontWeight: 700 }}>{rc.label} · Equipped</p>
            </div>
          </div>
          {open ? <ChevronUp size={18} style={{ color:'#9ca3af' }}/> : <ChevronDown size={18} style={{ color:'#9ca3af' }}/>}
        </button>
        {open && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
            <CharacterAvatar characterId={equippedId} size={140} showGlow animate/>
          </div>
        )}
      </div>

      {/* Desktop sticky sidebar */}
      <div className="hidden md:flex" style={{
        width: 220, flexShrink: 0, flexDirection: 'column', alignItems: 'center', gap: 12,
        borderRadius: 24, padding: '20px 16px',
        border: `2px solid ${rc.border}`, background: rc.bg,
        position: 'sticky', top: 16,
        boxShadow: `0 0 24px ${rc.glow}`,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Active Buddy</p>
        <CharacterAvatar characterId={equippedId} size={160} showGlow animate/>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: '0 0 4px' }}>{char?.name}</p>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: 'var(--bg-card-grad)', color: rc.color, border: `1px solid ${rc.border}`,
          }}>{rc.label}</span>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>{char?.desc}</p>
        <div style={{
          width: '100%', padding: '10px 12px', borderRadius: 12,
          background: 'var(--bg-card-grad)', border: '1px solid var(--border-color)', textAlign: 'center',
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

  // Keep local equippedId in sync if user.equipped changes externally
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
    // 1. Update local shop UI immediately
    setEquippedId(char.id);
    setEquipping(char.id);
    // 2. Update global user state so ProfilePage / AppLayout / Leaderboard
    //    all re-render with the new character without waiting for the poll
    patchUser({ equipped: { ...(user?.equipped || {}), character: char.id } });
    try {
      await api.post('/users/equip-item', { category: 'character', itemId: char.id });
      // Refresh to confirm server state
      refreshUser();
    } catch (_) {
      // Revert on error
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
          <p style={{ fontSize:12, color:'#9ca3af', margin:'3px 0 0' }}>
            {ownedCount} of {ALL_CHARACTERS.length} collected
          </p>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
          borderRadius:999, fontWeight:700, fontSize:14,
          background:'rgba(251,191,36,0.15)', color:'#D97706',
          border:'1px solid rgba(251,191,36,0.3)',
        }}>
          <CoinIcon size={16} /><span>{coinBalance}</span>
        </div>
      </div>

      {/* Collection progress */}
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

      {/* Main layout */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
        <EquippedPreview equippedId={equippedId} ownedCount={ownedCount}/>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Filter pills */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
            {RARITY_FILTERS.map(f => {
              const rc = RARITY_CONFIG[f.key];
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding:'7px 14px', borderRadius:999, fontSize:12, fontWeight:800,
                    whiteSpace:'nowrap', flexShrink:0, cursor:'pointer', fontFamily:'inherit',
                    border: isActive ? `2px solid ${rc?.color || '#60B8F5'}` : '2px solid var(--border-color)',
                    background: isActive ? (rc?.bg || 'rgba(96,184,245,0.15)') : 'var(--bg-card-grad)',
                    color: isActive ? (rc?.color || '#60B8F5') : '#9ca3af',
                    transition:'all 0.15s',
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Character grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10 }}>
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

      {/* How to earn */}
      <div style={{ borderRadius:20, padding:'16px 20px', border:'1px solid var(--border-color)', background:'var(--bg-card-grad)' }}>
        <h3 className="font-display" style={{ fontSize:16, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          🪙 How to Get Coins & Buddies
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
          {[
            { icon:'🎮', title:'Play Activities',     desc:'Earn coins equal to 1.5× your XP reward'        },
            { icon:'🏆', title:'Unlock Achievements', desc:'Bonus coins + free buddies for milestones'        },
            { icon:'🎁', title:'Achievement Buddies',  desc:'Some characters unlock free with achievements'   },
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
    </div>
  );
}
