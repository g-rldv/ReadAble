// ============================================================
// ShopPage.jsx — fully rebuilt with reliable layout
// Single-column item rows, buttons always visible
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth }     from '../contexts/AuthContext';
import api             from '../utils/api';
import CharacterAvatar, {
  ALL_SHOP_ITEMS, SKIN_TONES, DEFAULT_EQUIPPED, itemById, ownedDefaults,
} from '../components/character/CharacterAvatar';
import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES = [
  { key: 'all',        label: 'All',          emoji: '✨' },
  { key: 'hat',        label: 'Hats',         emoji: '🎩' },
  { key: 'top',        label: 'Tops',         emoji: '👕' },
  { key: 'accessory',  label: 'Accessories',  emoji: '💎' },
  { key: 'background', label: 'Backgrounds',  emoji: '🖼️' },
];

const CATEGORY_SLOT = { hat:'hat', top:'top', accessory:'accessory', background:'background' };

export default function ShopPage() {
  const { user, refreshUser } = useAuth();

  const [wardrobe,    setWardrobe]    = useState([]);
  const [equipped,    setEquipped]    = useState({ ...DEFAULT_EQUIPPED });
  const [category,    setCategory]    = useState('all');
  const [buying,      setBuying]      = useState(null);
  const [equipping,   setEquipping]   = useState(null);
  const [toast,       setToast]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get('/users/wardrobe');
      setWardrobe(res.data.wardrobe   || ownedDefaults);
      setEquipped({ ...DEFAULT_EQUIPPED, ...(res.data.equipped || {}) });
    } catch (_) {
      setWardrobe(ownedDefaults);
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleBuy = async (item) => {
    if (wardrobe.includes(item.id)) return;
    if ((user?.coins ?? 0) < item.cost) { showToast('Not enough coins!', 'error'); return; }
    setBuying(item.id);
    try {
      await api.post('/users/buy-item', { itemId: item.id, cost: item.cost });
      setWardrobe(prev => [...prev, item.id]);
      await refreshUser();
      showToast(`✨ Got ${item.name}!`);
    } catch (err) {
      showToast(err.message || 'Purchase failed', 'error');
    } finally { setBuying(null); }
  };

  const handleEquip = async (item) => {
    const slot  = CATEGORY_SLOT[item.category];
    const isOn  = equipped[slot] === item.id;
    const newId = isOn
      ? (item.category === 'hat'        ? 'hat_none'
       : item.category === 'accessory'  ? 'acc_none'
       : item.category === 'background' ? 'bg_white'
       : 'top_sky')
      : item.id;
    setEquipped(prev => ({ ...prev, [slot]: newId }));
    setEquipping(item.id);
    try { await api.post('/users/equip-item', { category: item.category, itemId: newId }); }
    catch (_) {}
    finally { setEquipping(null); }
  };

  const owned      = (id) => wardrobe.includes(id) || ownedDefaults.includes(id);
  const canBuy     = (item) => !owned(item.id) && (user?.coins ?? 0) >= item.cost;
  const isEquipped = (item) => equipped[CATEGORY_SLOT[item.category]] === item.id;
  const items      = ALL_SHOP_ITEMS.filter(i => category === 'all' || i.category === category);

  const equipSkin = (st) => {
    setEquipped(prev => ({ ...prev, skin: st.id }));
    api.post('/users/equip-item', { category: 'skin', itemId: st.id }).catch(() => {});
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:192 }}>
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:24, left:'50%', transform:'translateX(-50%)',
          zIndex:9999, padding:'12px 20px', borderRadius:16,
          fontWeight:700, color:'#fff', fontSize:14,
          background: toast.type === 'error' ? '#ef4444' : '#22c55e',
          boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize:28, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8, margin:0 }}>
            <ShoppingBag size={24} style={{ color:'#60B8F5' }}/> Shop
          </h1>
          <p style={{ fontSize:12, color:'#9ca3af', margin:'2px 0 0' }}>Spend coins to dress up your Buddy!</p>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
          borderRadius:999, fontWeight:700, fontSize:14, flexShrink:0,
          background:'rgba(251,191,36,0.15)', color:'#D97706',
          border:'1px solid rgba(251,191,36,0.3)',
        }}>
          <span>🪙</span><span>{user?.coins ?? 0}</span>
        </div>
      </div>

      {/* ── MOBILE buddy preview (collapsible) ── */}
      <div className="md:hidden" style={{
        borderRadius:20, border:'1px solid var(--border-color)',
        background:'var(--bg-card-grad)', overflow:'hidden',
      }}>
        <button onClick={() => setPreviewOpen(o => !o)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'none', border:'none', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, overflow:'hidden', flexShrink:0 }}>
              <CharacterAvatar equipped={equipped} size={40}/>
            </div>
            <div style={{ textAlign:'left' }}>
              <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', margin:0 }}>Your Buddy</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>· {itemById(equipped.top)?.name || 'Sky Blue'}</p>
            </div>
          </div>
          {previewOpen ? <ChevronUp size={18} style={{ color:'#9ca3af' }}/> : <ChevronDown size={18} style={{ color:'#9ca3af' }}/>}
        </button>

        {previewOpen && (
          <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border-color)' }}>
            <div style={{ display:'flex', gap:16, paddingTop:16 }}>
              <div style={{ flexShrink:0 }}>
                <CharacterAvatar equipped={equipped} size={120}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Skin Tone</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                  {SKIN_TONES.map(st => (
                    <button key={st.id} onClick={() => equipSkin(st)} title={st.name}
                      style={{ width:28, height:28, borderRadius:'50%', border: equipped.skin === st.id ? '2.5px solid #60B8F5' : '2px solid transparent', background:st.fill, cursor:'pointer', flexShrink:0, transform: equipped.skin === st.id ? 'scale(1.15)' : 'scale(1)' }}/>
                  ))}
                </div>
                {['hat','top','accessory','background'].map(slot => {
                  const itm = itemById(equipped[slot]);
                  return itm ? (
                    <div key={slot} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                      <span style={{ color:'#9ca3af', textTransform:'capitalize' }}>{slot}</span>
                      <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{itm.preview} {itm.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT ── */}
      {/* Desktop: flex row. Mobile: single column */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

        {/* Desktop sidebar */}
        <div className="hidden md:flex" style={{ width:220, flexShrink:0, flexDirection:'column', alignItems:'center', gap:16, borderRadius:24, padding:20, border:'1px solid var(--border-color)', background:'var(--bg-card-grad)', position:'sticky', top:16 }}>
          <p className="font-display" style={{ fontSize:16, color:'var(--text-primary)', margin:0 }}>Your Buddy</p>
          <CharacterAvatar equipped={equipped} size={160}/>
          <div style={{ width:'100%' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Skin Tone</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
              {SKIN_TONES.map(st => (
                <button key={st.id} onClick={() => equipSkin(st)} title={st.name}
                  style={{ width:28, height:28, borderRadius:'50%', border: equipped.skin === st.id ? '2.5px solid #60B8F5' : '2px solid transparent', background:st.fill, cursor:'pointer', transform: equipped.skin === st.id ? 'scale(1.1)' : 'scale(1)' }}/>
              ))}
            </div>
          </div>
          <div style={{ width:'100%' }}>
            {['hat','top','accessory','background'].map(slot => {
              const itm = itemById(equipped[slot]);
              return itm ? (
                <div key={slot} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'#9ca3af', textTransform:'capitalize' }}>{slot}</span>
                  <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{itm.preview} {itm.name}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Items panel — flex:1 with minWidth:0 so it never overflows */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:0 }}>

          {/* Category pills */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:8 }}>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 14px', borderRadius:20, fontSize:13, fontWeight:700,
                  whiteSpace:'nowrap', flexShrink:0, cursor:'pointer', border:'none',
                  background: category === c.key ? '#60B8F5' : '#f3f4f6',
                  color: category === c.key ? '#fff' : '#4b5563',
                }}>
                <span>{c.emoji}</span><span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Item rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.map(item => {
              const isOwned = owned(item.id);
              const isEq    = isEquipped(item);
              const hasAch  = user?.achievements?.includes(item.earnedBy);
              const freeByAch = item.earnedBy && !isOwned && hasAch;
              const affordable = canBuy(item);

              // Pick border colour
              const borderColor = isEq ? '#60B8F5' : isOwned ? '#6ee7b7' : '#e5e7eb';
              const bgColor = isEq ? 'rgba(96,184,245,0.07)' : isOwned ? 'rgba(110,231,183,0.07)' : 'var(--bg-card-grad)';

              // Build the action button
              let btnLabel, btnBg, btnColor, btnAction, btnDisabled;
              if (isOwned || item.isDefault) {
                btnLabel   = equipping === item.id ? '…' : isEq ? '✓ On' : 'Equip';
                btnBg      = isEq ? '#60B8F5' : '#f3f4f6';
                btnColor   = isEq ? '#fff' : '#4b5563';
                btnAction  = () => handleEquip(item);
                btnDisabled = !!equipping;
              } else if (freeByAch) {
                btnLabel   = buying === item.id ? '…' : '🎁 Free';
                btnBg      = '#fbbf24';
                btnColor   = '#fff';
                btnAction  = () => handleBuy({ ...item, cost: 0 });
                btnDisabled = !!buying;
              } else {
                btnLabel   = buying === item.id ? '…' : `🪙 ${item.cost}`;
                btnBg      = affordable ? '#fbbf24' : '#e5e7eb';
                btnColor   = affordable ? '#fff' : '#9ca3af';
                btnAction  = () => affordable && handleBuy(item);
                btnDisabled = !!buying || !affordable;
              }

              return (
                <div key={item.id} style={{
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  padding:'10px 12px',
                  borderRadius:16,
                  border:`2px solid ${borderColor}`,
                  background: bgColor,
                  /* Critical: no overflow:hidden here — would clip the button */
                }}>
                  {/* Emoji */}
                  <span style={{ fontSize:22, width:28, textAlign:'center', flexShrink:0, lineHeight:1 }}>
                    {item.preview}
                  </span>

                  {/* Name + status — min-width:0 allows it to shrink so button stays visible */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize:10, fontWeight:600, margin:'2px 0 0', color:
                      item.earnedBy
                        ? (hasAch ? '#f59e0b' : '#9ca3af')
                        : isOwned && !item.isDefault ? '#10b981'
                        : '#9ca3af'
                    }}>
                      {item.earnedBy
                        ? (hasAch ? '🏅 Achievement' : '🔒 Locked')
                        : isOwned && !item.isDefault ? 'Owned'
                        : item.cost > 0 ? `🪙 ${item.cost}`
                        : ''}
                    </p>
                  </div>

                  {/* Action button — flexShrink:0 keeps it always visible */}
                  <button
                    onClick={btnAction}
                    disabled={btnDisabled}
                    style={{
                      background: btnBg,
                      color: btnColor,
                      border: 'none',
                      borderRadius: 10,
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,      /* NEVER shrink — this keeps button visible */
                      cursor: btnDisabled ? 'not-allowed' : 'pointer',
                      opacity: btnDisabled ? 0.6 : 1,
                      minWidth: 56,
                    }}>
                    {btnLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How to earn coins */}
      <div style={{ borderRadius:24, padding:'16px 20px', border:'1px solid var(--border-color)', background:'var(--bg-card-grad)' }}>
        <h3 className="font-display" style={{ fontSize:17, color:'var(--text-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          🪙 How to Earn Coins
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
          {[
            { icon:'🎮', title:'Play Activities',     desc:'Earn coins = 1.5× your XP reward' },
            { icon:'🏆', title:'Unlock Achievements', desc:'Bonus coins for each achievement' },
            { icon:'🎀', title:'Achievement Items',   desc:'Some items are free with their achievement' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:12, borderRadius:16, background:'var(--bg-primary)', border:'1px solid var(--border-color)' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
              <div>
                <p style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', margin:0 }}>{title}</p>
                <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0', lineHeight:1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
