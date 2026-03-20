// ============================================================
// ShopPage.jsx — Buy & equip cosmetic items with coins
// Mobile: compact horizontal preview bar + full-width item grid
// Desktop: sticky sidebar preview + items grid
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

function CoinBadge({ coins }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm flex-shrink-0"
      style={{ background:'rgba(251,191,36,0.15)', color:'#D97706', border:'1px solid rgba(251,191,36,0.3)' }}>
      <span>🪙</span>
      <span>{coins ?? 0}</span>
    </div>
  );
}

export default function ShopPage() {
  const { user, refreshUser } = useAuth();

  const [wardrobe,      setWardrobe]      = useState([]);
  const [equipped,      setEquipped]      = useState({ ...DEFAULT_EQUIPPED });
  const [category,      setCategory]      = useState('all');
  const [buying,        setBuying]        = useState(null);
  const [equipping,     setEquipping]     = useState(null);
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [previewOpen,   setPreviewOpen]   = useState(false); // mobile collapsible

  // ── Load wardrobe & equipped ──────────────────────────────
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

  // ── Buy item ──────────────────────────────────────────────
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

  // ── Equip item ────────────────────────────────────────────
  const handleEquip = async (item) => {
    const slot  = CATEGORY_SLOT[item.category];
    const isOn  = equipped[slot] === item.id;
    const newId = isOn
      ? (item.category === 'hat'        ? 'hat_none'
       : item.category === 'accessory'  ? 'acc_none'
       : item.category === 'background' ? 'bg_white'
       : 'top_sky')
      : item.id;
    const next = { ...equipped, [slot]: newId };
    setEquipped(next);
    setEquipping(item.id);
    try { await api.post('/users/equip-item', { category: item.category, itemId: newId }); }
    catch (_) {}
    finally { setEquipping(null); }
  };

  const items      = ALL_SHOP_ITEMS.filter(i => category === 'all' || i.category === category);
  const owned      = (id) => wardrobe.includes(id) || ownedDefaults.includes(id);
  const canBuy     = (item) => !owned(item.id) && (user?.coins ?? 0) >= item.cost;
  const isEquipped = (item) => equipped[CATEGORY_SLOT[item.category]] === item.id;

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-sky border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-4">

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl
                         font-bold text-white text-sm shadow-xl animate-pop
                         ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ShoppingBag size={26} className="text-sky"/> Shop
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Spend coins to dress up your Buddy!</p>
        </div>
        <CoinBadge coins={user?.coins}/>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE: Collapsible buddy preview
      ══════════════════════════════════════════════════════ */}
      <div className="md:hidden rounded-3xl border overflow-hidden"
        style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>

        {/* Toggle header */}
        <button
          onClick={() => setPreviewOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Tiny avatar thumbnail */}
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <CharacterAvatar equipped={equipped} size={40}/>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Your Buddy</p>
              <p className="text-xs text-gray-400">
                {itemById(equipped.hat)?.name !== 'No Hat' ? itemById(equipped.hat)?.name : ''}
                {itemById(equipped.top)?.name ? ` · ${itemById(equipped.top)?.name}` : ''}
              </p>
            </div>
          </div>
          {previewOpen
            ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0"/>
            : <ChevronDown size={18} className="text-gray-400 flex-shrink-0"/>}
        </button>

        {/* Expandable preview body */}
        {previewOpen && (
          <div className="px-4 pb-4 border-t" style={{ borderColor:'var(--border-color)' }}>
            <div className="flex items-start gap-4 pt-4">
              {/* Character */}
              <div className="flex-shrink-0">
                <CharacterAvatar equipped={equipped} size={120}/>
              </div>
              {/* Controls */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Skin tones */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Skin Tone</p>
                  <div className="flex gap-2 flex-wrap">
                    {SKIN_TONES.map(st => (
                      <button key={st.id}
                        onClick={() => {
                          setEquipped(prev => ({ ...prev, skin: st.id }));
                          api.post('/users/equip-item', { category:'skin', itemId: st.id }).catch(()=>{});
                        }}
                        title={st.name}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex-shrink-0
                          ${equipped.skin === st.id ? 'border-sky scale-110 shadow-sm' : 'border-transparent hover:border-gray-300'}`}
                        style={{ backgroundColor: st.fill }}/>
                    ))}
                  </div>
                </div>
                {/* Equipped summary */}
                <div className="space-y-1">
                  {['hat','top','accessory','background'].map(slot => {
                    const itm = itemById(equipped[slot]);
                    return itm ? (
                      <div key={slot} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400 capitalize w-20 flex-shrink-0">{slot}</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
                          {itm.preview} {itm.name}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-[220px_1fr] gap-5">

        {/* ── Desktop sidebar preview ──────────────────── */}
        <div className="hidden md:block sticky top-4 self-start">
          <div className="rounded-3xl p-5 border flex flex-col items-center gap-4"
            style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>
            <h3 className="font-display text-base text-gray-700 dark:text-gray-200">Your Buddy</h3>
            <CharacterAvatar equipped={equipped} size={160}/>

            {/* Skin picker */}
            <div className="w-full">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Skin Tone</p>
              <div className="grid grid-cols-6 gap-1.5">
                {SKIN_TONES.map(st => (
                  <button key={st.id}
                    onClick={() => {
                      const next = { ...equipped, skin: st.id };
                      setEquipped(next);
                      api.post('/users/equip-item', { category:'skin', itemId: st.id }).catch(()=>{});
                    }}
                    title={st.name}
                    className={`w-7 h-7 rounded-full border-2 transition-all
                      ${equipped.skin === st.id ? 'border-sky scale-110' : 'border-transparent hover:border-gray-300'}`}
                    style={{ backgroundColor: st.fill }}/>
                ))}
              </div>
            </div>

            {/* Equipped summary */}
            <div className="w-full space-y-1 text-xs text-gray-500">
              {['hat','top','accessory','background'].map(slot => {
                const itm = itemById(equipped[slot]);
                return itm ? (
                  <div key={slot} className="flex items-center justify-between">
                    <span className="capitalize text-gray-400">{slot}</span>
                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                      {itm.preview} {itm.name}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* ── Items panel ──────────────────────────────── */}
        <div>
          {/* Category filter pills — scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold
                            whitespace-nowrap flex-shrink-0 transition-all
                  ${category === c.key
                    ? 'bg-sky text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-sky/10 hover:text-sky'
                  }`}>
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Items — slim rows on mobile, grid on sm+ */}
          <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3">
            {items.map(item => {
              const isOwned   = owned(item.id);
              const isEq      = isEquipped(item);
              const hasAch    = user?.achievements?.includes(item.earnedBy);
              const freeByAch = item.earnedBy && !isOwned && hasAch;
              const borderCls = isEq
                ? 'border-sky bg-sky/5'
                : isOwned
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10'
                : 'border-gray-200 dark:border-gray-700';

              // Inline mobile action button — do NOT extract as component inside map()
              const mobileBtn = isOwned || item.isDefault ? (
                <button onClick={() => handleEquip(item)} disabled={!!equipping}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-all
                    ${isEq ? 'bg-sky text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {equipping === item.id ? '…' : isEq ? '✓ On' : 'Equip'}
                </button>
              ) : freeByAch ? (
                <button onClick={() => handleBuy({ ...item, cost: 0 })} disabled={!!buying}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-400 text-white whitespace-nowrap flex-shrink-0">
                  {buying === item.id ? '…' : '🎁 Free'}
                </button>
              ) : (
                <button onClick={() => handleBuy(item)} disabled={!!buying || !canBuy(item)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all
                    ${canBuy(item) ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                  {buying === item.id ? '…' : <><span>🪙</span><span>{item.cost}</span></>}
                </button>
              );

              return (
                <div key={item.id}>
                  {/* Mobile: slim horizontal row */}
                  <div className={`sm:hidden flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 transition-all ${borderCls}`}
                    style={{ background: isEq || isOwned ? undefined : 'var(--bg-card-grad)' }}>
                    {/* Emoji */}
                    <span className="text-xl w-7 text-center flex-shrink-0 leading-none">{item.preview}</span>
                    {/* Info — fills space, truncates */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-tight truncate">{item.name}</p>
                      <p className="text-[10px] font-semibold leading-none mt-0.5 truncate">
                        {item.earnedBy
                          ? <span className={hasAch ? 'text-amber-500' : 'text-gray-400'}>{hasAch ? '🏅 Achievement' : '🔒 Locked'}</span>
                          : isOwned && !item.isDefault
                          ? <span className="text-emerald-500">Owned</span>
                          : item.cost > 0
                          ? <span className="text-gray-400">🪙 {item.cost}</span>
                          : null
                        }
                      </p>
                    </div>
                    {/* Action button — pinned right */}
                    {mobileBtn}
                  </div>

                  {/* Desktop: vertical card */}
                  <div className={`hidden sm:flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${borderCls}`}
                    style={{ background: isEq || isOwned ? undefined : 'var(--bg-card-grad)' }}>
                    <div className="text-3xl leading-none">{item.preview}</div>
                    <p className="font-bold text-xs text-center text-gray-700 dark:text-gray-200 leading-tight w-full">{item.name}</p>
                    {item.earnedBy && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold
                        ${hasAch ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                        {hasAch ? '🏅 Achievement' : '🔒 Locked'}
                      </span>
                    )}
                    {isOwned || item.isDefault ? (
                      <button onClick={() => handleEquip(item)} disabled={!!equipping}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all
                          ${isEq ? 'bg-sky text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-sky/10 hover:text-sky'}`}>
                        {equipping === item.id ? '…' : isEq ? '✓ Equipped' : 'Equip'}
                      </button>
                    ) : freeByAch ? (
                      <button onClick={() => handleBuy({ ...item, cost: 0 })} disabled={!!buying}
                        className="w-full py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-white hover:bg-amber-500">
                        {buying === item.id ? '…' : '🎁 Claim Free'}
                      </button>
                    ) : (
                      <button onClick={() => handleBuy(item)} disabled={!!buying || !canBuy(item)}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all
                          ${canBuy(item) ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                        {buying === item.id ? '…' : <><span>🪙</span><span>{item.cost}</span></>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── How to earn coins ─────────────────────────────── */}
      <div className="rounded-3xl p-4 md:p-5 border"
        style={{ background:'var(--bg-card-grad)', borderColor:'var(--border-color)' }}>
        <h3 className="font-display text-base md:text-lg text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
          🪙 How to Earn Coins
        </h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon:'🎮', title:'Play Activities',     desc:'Earn coins equal to 1.5× your XP reward' },
            { icon:'🏆', title:'Unlock Achievements', desc:'Bonus coins for each achievement unlocked' },
            { icon:'🎀', title:'Achievement Items',   desc:'Some items are free when you earn their achievement' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-2xl"
              style={{ background:'var(--bg-primary)', border:'1px solid var(--border-color)' }}>
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div>
                <p className="font-bold text-sm text-gray-700 dark:text-gray-200">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
