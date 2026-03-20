// ============================================================
// CharacterAvatar.jsx — 2D SVG layered character system
// Exports: CharacterAvatar, ALL_SHOP_ITEMS, SKIN_TONES,
//          DEFAULT_EQUIPPED, itemById, ownedDefaults
// ============================================================
import React from 'react';

// ── Skin tones ────────────────────────────────────────────────
export const SKIN_TONES = [
  { id: 'peach',    name: 'Peach',    fill: '#FDDBB4', shade: '#E8BC8A', lip: '#E5956A' },
  { id: 'warm',     name: 'Warm',     fill: '#F0B07A', shade: '#D4905A', lip: '#C07040' },
  { id: 'tan',      name: 'Tan',      fill: '#C87941', shade: '#A85E28', lip: '#8B4A1E' },
  { id: 'deep',     name: 'Deep',     fill: '#7B4220', shade: '#5D2E0E', lip: '#4A2010' },
  { id: 'sky',      name: 'Sky',      fill: '#7ED3FC', shade: '#4BBCF0', lip: '#2E9BD8' },
  { id: 'lavender', name: 'Lavender', fill: '#C9A8FF', shade: '#A87EF0', lip: '#8A5AE0' },
];

// ── Complete shop item catalog ────────────────────────────────
export const ALL_SHOP_ITEMS = [
  // ── HATS ────────────────────────────────────────────────
  { id:'hat_none',    category:'hat', name:'No Hat',       cost:0,   preview:'✕',  earnedBy:null,            isDefault:true  },
  { id:'hat_bow',     category:'hat', name:'Cute Bow',     cost:30,  preview:'🎀', earnedBy:'first_star'                     },
  { id:'hat_cap',     category:'hat', name:'Cool Cap',     cost:50,  preview:'🧢', earnedBy:null                             },
  { id:'hat_party',   category:'hat', name:'Party Hat',    cost:60,  preview:'🎉', earnedBy:null                             },
  { id:'hat_wizard',  category:'hat', name:'Wizard Hat',   cost:90,  preview:'🧙', earnedBy:'level_5'                       },
  { id:'hat_crown',   category:'hat', name:'Royal Crown',  cost:150, preview:'👑', earnedBy:'level_10'                      },
  { id:'hat_grad',    category:'hat', name:'Grad Cap',     cost:200, preview:'🎓', earnedBy:'completionist'                 },

  // ── TOPS ─────────────────────────────────────────────────
  { id:'top_sky',     category:'top', name:'Sky Blue',     cost:0,   preview:'💙', earnedBy:null,            isDefault:true  },
  { id:'top_coral',   category:'top', name:'Coral Red',    cost:30,  preview:'❤️', earnedBy:null                             },
  { id:'top_mint',    category:'top', name:'Forest Mint',  cost:30,  preview:'💚', earnedBy:null                             },
  { id:'top_sunny',   category:'top', name:'Sunny Yellow', cost:30,  preview:'💛', earnedBy:null                             },
  { id:'top_star',    category:'top', name:'Star Pattern', cost:70,  preview:'⭐', earnedBy:'xp_100'                        },
  { id:'top_rainbow', category:'top', name:'Rainbow',      cost:100, preview:'🌈', earnedBy:'five_streak'                   },
  { id:'top_cosmic',  category:'top', name:'Cosmic Dark',  cost:130, preview:'🌌', earnedBy:'xp_500'                        },
  { id:'top_fire',    category:'top', name:'Flame Shirt',  cost:90,  preview:'🔥', earnedBy:'ten_streak'                    },

  // ── ACCESSORIES ──────────────────────────────────────────
  { id:'acc_none',    category:'accessory', name:'None',           cost:0,   preview:'✕',  earnedBy:null,        isDefault:true },
  { id:'acc_star',    category:'accessory', name:'Star Badge',     cost:25,  preview:'⭐', earnedBy:'first_star'                },
  { id:'acc_glasses', category:'accessory', name:'Cool Shades',   cost:50,  preview:'🕶️', earnedBy:null                        },
  { id:'acc_medal',   category:'accessory', name:'Gold Medal',     cost:120, preview:'🥇', earnedBy:'xp_100'                   },
  { id:'acc_trophy',  category:'accessory', name:'Trophy Pin',     cost:80,  preview:'🏆', earnedBy:'complete_10'              },
  { id:'acc_fire',    category:'accessory', name:'Flame Aura',     cost:100, preview:'🔥', earnedBy:'ten_streak'               },
  { id:'acc_scarf',   category:'accessory', name:'Cozy Scarf',     cost:40,  preview:'🧣', earnedBy:null                        },

  // ── BACKGROUNDS ──────────────────────────────────────────
  { id:'bg_white',    category:'background', name:'Clean White',  cost:0,   preview:'⬜', earnedBy:null,        isDefault:true },
  { id:'bg_sky',      category:'background', name:'Blue Sky',     cost:20,  preview:'🌤️', earnedBy:null                        },
  { id:'bg_meadow',   category:'background', name:'Meadow',       cost:30,  preview:'🌿', earnedBy:null                        },
  { id:'bg_night',    category:'background', name:'Night Stars',  cost:60,  preview:'🌙', earnedBy:'five_streak'               },
  { id:'bg_sunset',   category:'background', name:'Sunset',       cost:50,  preview:'🌇', earnedBy:null                        },
  { id:'bg_galaxy',   category:'background', name:'Galaxy',       cost:150, preview:'🌌', earnedBy:'xp_1000'                  },
];

// ── Helpers ───────────────────────────────────────────────────
export const itemById   = (id) => ALL_SHOP_ITEMS.find(i => i.id === id);
export const DEFAULT_EQUIPPED = {
  hat: 'hat_none', top: 'top_sky', accessory: 'acc_none',
  background: 'bg_white', skin: 'peach',
};
export const ownedDefaults = ALL_SHOP_ITEMS.filter(i => i.isDefault).map(i => i.id);

// ── Top color map ─────────────────────────────────────────────
const TOP_COLORS = {
  top_sky:     { fill:'#60B8F5', shade:'#3EA0DC' },
  top_coral:   { fill:'#F97B6B', shade:'#E05555' },
  top_mint:    { fill:'#4ADE80', shade:'#22C55E' },
  top_sunny:   { fill:'#FCD34D', shade:'#F0B800' },
  top_star:    { fill:'#F59E0B', shade:'#D97706' },
  top_rainbow: { fill:'#E879F9', shade:'#C026D3' },   // magenta as base, stars drawn on
  top_cosmic:  { fill:'#7C3AED', shade:'#5B21B6' },
  top_fire:    { fill:'#F97316', shade:'#EA580C' },
};

// ── Background renderers ──────────────────────────────────────
function Background({ id, size }) {
  switch (id) {
    case 'bg_sky':
      return (
        <>
          <defs>
            <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#BAE6FD"/>
              <stop offset="100%" stopColor="#E0F2FE"/>
            </linearGradient>
          </defs>
          <rect width={size} height={size} rx="16" fill="url(#bgSky)"/>
          <ellipse cx={size*.2}  cy={size*.2}  rx={size*.1}  ry={size*.04} fill="white" opacity=".7"/>
          <ellipse cx={size*.65} cy={size*.15} rx={size*.12} ry={size*.05} fill="white" opacity=".6"/>
          <ellipse cx={size*.5}  cy={size*.25} rx={size*.08} ry={size*.03} fill="white" opacity=".5"/>
        </>
      );
    case 'bg_meadow':
      return (
        <>
          <defs>
            <linearGradient id="bgMeadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A7F3D0"/>
              <stop offset="100%" stopColor="#6EE7B7"/>
            </linearGradient>
          </defs>
          <rect width={size} height={size} rx="16" fill="url(#bgMeadow)"/>
          {[10,30,55,75,90].map((x,i)=>(
            <text key={i} x={`${x}%`} y="92%" fontSize={size*.06} textAnchor="middle">🌸</text>
          ))}
        </>
      );
    case 'bg_night':
      return (
        <>
          <defs>
            <linearGradient id="bgNight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F0A1E"/>
              <stop offset="100%" stopColor="#1E0A3C"/>
            </linearGradient>
          </defs>
          <rect width={size} height={size} rx="16" fill="url(#bgNight)"/>
          {[[10,12],[85,8],[30,20],[70,15],[50,5],[20,35],[90,30],[60,25],[15,50],[80,45]].map(([x,y],i)=>(
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={size*.008} fill="white" opacity={0.5+Math.random()*.5}/>
          ))}
          <text x="12%" y="22%" fontSize={size*.09}>🌙</text>
        </>
      );
    case 'bg_sunset':
      return (
        <>
          <defs>
            <linearGradient id="bgSunset" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FED7AA"/>
              <stop offset="50%" stopColor="#FB923C"/>
              <stop offset="100%" stopColor="#F43F5E"/>
            </linearGradient>
          </defs>
          <rect width={size} height={size} rx="16" fill="url(#bgSunset)"/>
          <circle cx="50%" cy="15%" r={size*.1} fill="#FEF08A" opacity=".9"/>
        </>
      );
    case 'bg_galaxy':
      return (
        <>
          <defs>
            <radialGradient id="bgGalaxy" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#4C1D95"/>
              <stop offset="100%" stopColor="#0C0A20"/>
            </radialGradient>
          </defs>
          <rect width={size} height={size} rx="16" fill="url(#bgGalaxy)"/>
          {Array.from({length:20},(_,i)=>(
            <circle key={i} cx={`${(i*37+13)%100}%`} cy={`${(i*53+7)%100}%`}
              r={size*.006} fill={['#E879F9','#818CF8','white','#67E8F9'][i%4]} opacity={.4+.4*(i%3)/2}/>
          ))}
        </>
      );
    default: // bg_white
      return <rect width={size} height={size} rx="16" fill="#F8F9FA" stroke="#E5E7EB" strokeWidth="1.5"/>;
  }
}

// ── Hat renderers ─────────────────────────────────────────────
function Hat({ id, cx, headTopY, headR }) {
  const b = cx; // base x center
  switch (id) {
    case 'hat_bow': {
      const y = headTopY - headR * 0.12;
      return (
        <g>
          {/* Left loop */}
          <ellipse cx={b-headR*.22} cy={y} rx={headR*.18} ry={headR*.12} fill="#F9A8D4" transform={`rotate(-20,${b-headR*.22},${y})`}/>
          <ellipse cx={b-headR*.22} cy={y} rx={headR*.12} ry={headR*.08} fill="#F472B6" transform={`rotate(-20,${b-headR*.22},${y})`}/>
          {/* Right loop */}
          <ellipse cx={b+headR*.22} cy={y} rx={headR*.18} ry={headR*.12} fill="#F9A8D4" transform={`rotate(20,${b+headR*.22},${y})`}/>
          <ellipse cx={b+headR*.22} cy={y} rx={headR*.12} ry={headR*.08} fill="#F472B6" transform={`rotate(20,${b+headR*.22},${y})`}/>
          {/* Knot */}
          <circle cx={b} cy={y} r={headR*.08} fill="#EC4899"/>
        </g>
      );
    }
    case 'hat_cap': {
      const rimY = headTopY + headR * .28;
      return (
        <g>
          {/* Dome */}
          <ellipse cx={b} cy={rimY - headR*.05} rx={headR*.78} ry={headR*.52} fill="#3B82F6"/>
          <ellipse cx={b} cy={rimY - headR*.05} rx={headR*.72} ry={headR*.45} fill="#2563EB"/>
          {/* Brim */}
          <rect x={b-headR*.72} y={rimY} width={headR*1.44} height={headR*.14} rx={headR*.07} fill="#1D4ED8"/>
          {/* Logo spot */}
          <circle cx={b} cy={rimY - headR*.22} r={headR*.1} fill="white" opacity=".6"/>
        </g>
      );
    }
    case 'hat_party': {
      const brimY = headTopY + headR*.2;
      const tipX  = b;
      const tipY  = headTopY - headR*.9;
      return (
        <g>
          {/* Cone */}
          <polygon points={`${b-headR*.5},${brimY} ${b+headR*.5},${brimY} ${tipX},${tipY}`}
            fill="#EC4899"/>
          <polygon points={`${b-headR*.5},${brimY} ${b+headR*.5},${brimY} ${tipX},${tipY}`}
            fill="url(#partyStripes)" opacity=".5"/>
          {/* Stripes */}
          <defs>
            <pattern id="partyStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <rect width="4" height="8" fill="white" opacity=".4"/>
            </pattern>
          </defs>
          {/* Brim */}
          <ellipse cx={b} cy={brimY} rx={headR*.52} ry={headR*.12} fill="#F9A8D4"/>
          {/* Star on tip */}
          <text x={tipX} y={tipY + headR*.15} fontSize={headR*.28} textAnchor="middle">⭐</text>
        </g>
      );
    }
    case 'hat_wizard': {
      const brimY = headTopY + headR*.2;
      const tipY  = headTopY - headR*1.0;
      return (
        <g>
          {/* Cone */}
          <polygon points={`${b-headR*.5},${brimY} ${b+headR*.5},${brimY} ${b},${tipY}`}
            fill="#4C1D95"/>
          {/* Stars on cone */}
          {[[0.1,0.35],[0.35,0.6],[-.2,0.7]].map(([dx,dy],i)=>(
            <text key={i} x={b+dx*headR} y={brimY-(brimY-tipY)*dy} fontSize={headR*.18} textAnchor="middle">✨</text>
          ))}
          {/* Brim */}
          <ellipse cx={b} cy={brimY} rx={headR*.72} ry={headR*.15} fill="#5B21B6"/>
          <ellipse cx={b} cy={brimY} rx={headR*.65} ry={headR*.1} fill="#4C1D95"/>
        </g>
      );
    }
    case 'hat_crown': {
      const baseY = headTopY + headR*.15;
      const h = headR * .55;
      const w = headR * 1.0;
      return (
        <g>
          {/* Crown body */}
          <path d={`M ${b-w/2},${baseY}
                    L ${b-w/2},${baseY-h*.55}
                    L ${b-w*.25},${baseY-h*.3}
                    L ${b},${baseY-h}
                    L ${b+w*.25},${baseY-h*.3}
                    L ${b+w/2},${baseY-h*.55}
                    L ${b+w/2},${baseY} Z`}
            fill="#F59E0B"/>
          <path d={`M ${b-w/2},${baseY}
                    L ${b-w/2},${baseY-h*.55}
                    L ${b-w*.25},${baseY-h*.3}
                    L ${b},${baseY-h}
                    L ${b+w*.25},${baseY-h*.3}
                    L ${b+w/2},${baseY-h*.55}
                    L ${b+w/2},${baseY} Z`}
            fill="none" stroke="#D97706" strokeWidth="1.5"/>
          {/* Gems */}
          <circle cx={b} cy={baseY-h*.65} r={headR*.1} fill="#EF4444"/>
          <circle cx={b-w*.3} cy={baseY-h*.3} r={headR*.08} fill="#3B82F6"/>
          <circle cx={b+w*.3} cy={baseY-h*.3} r={headR*.08} fill="#3B82F6"/>
        </g>
      );
    }
    case 'hat_grad': {
      const baseY = headTopY + headR*.15;
      const w = headR * .95;
      const h = headR * .18;
      return (
        <g>
          {/* Board */}
          <ellipse cx={b} cy={baseY-h*.5} rx={w/2} ry={headR*.08} fill="#1F2937"/>
          <rect x={b-w*.36} y={baseY-h} width={w*.72} height={h} fill="#111827"/>
          <ellipse cx={b} cy={baseY-h} rx={w*.36} ry={headR*.06} fill="#1F2937"/>
          {/* Tassel */}
          <line x1={b+w*.3} y1={baseY-h*.5} x2={b+w*.3} y2={baseY+headR*.25}
            stroke="#F59E0B" strokeWidth="2"/>
          <circle cx={b+w*.3} cy={baseY+headR*.25} r={headR*.06} fill="#F59E0B"/>
        </g>
      );
    }
    default: return null;
  }
}

// ── Accessory renderers ───────────────────────────────────────
function Accessory({ id, cx, bodyTopY, eyeY, size }) {
  switch (id) {
    case 'acc_star':
      return <text x={cx + size*.22} y={bodyTopY + size*.06} fontSize={size*.09} textAnchor="middle">⭐</text>;
    case 'acc_glasses': {
      const gy = eyeY;
      const lx = cx - size*.17, rx = cx + size*.17;
      const gr = size*.07;
      return (
        <g>
          <circle cx={lx} cy={gy} r={gr} fill="none" stroke="#1F2937" strokeWidth="1.5" opacity=".8"/>
          <circle cx={rx} cy={gy} r={gr} fill="none" stroke="#1F2937" strokeWidth="1.5" opacity=".8"/>
          <line x1={lx+gr} y1={gy} x2={rx-gr} y2={gy} stroke="#1F2937" strokeWidth="1.5" opacity=".8"/>
          {/* Arms */}
          <line x1={lx-gr} y1={gy} x2={lx-gr*1.8} y2={gy-gr*.3} stroke="#1F2937" strokeWidth="1.2" opacity=".7"/>
          <line x1={rx+gr} y1={gy} x2={rx+gr*1.8} y2={gy-gr*.3} stroke="#1F2937" strokeWidth="1.2" opacity=".7"/>
          {/* Lens tint */}
          <circle cx={lx} cy={gy} r={gr} fill="#1E3A5F" opacity=".35"/>
          <circle cx={rx} cy={gy} r={gr} fill="#1E3A5F" opacity=".35"/>
        </g>
      );
    }
    case 'acc_medal': {
      const my = bodyTopY + size*.09;
      return (
        <g>
          <line x1={cx} y1={bodyTopY} x2={cx} y2={my} stroke="#F59E0B" strokeWidth="2"/>
          <circle cx={cx} cy={my} r={size*.08} fill="#FCD34D"/>
          <circle cx={cx} cy={my} r={size*.055} fill="#F59E0B"/>
          <text x={cx} y={my+size*.025} fontSize={size*.06} textAnchor="middle" dominantBaseline="middle">1</text>
        </g>
      );
    }
    case 'acc_trophy': {
      const ty = bodyTopY + size*.04;
      return (
        <g>
          <text x={cx+size*.26} y={ty} fontSize={size*.1} textAnchor="middle">🏆</text>
        </g>
      );
    }
    case 'acc_fire':
      return (
        <g opacity=".75">
          {[-size*.35,-size*.28,-size*.22,size*.22,size*.28,size*.35].map((dx,i)=>(
            <text key={i} x={cx+dx} y={bodyTopY+size*.04+Math.abs(i-2.5)*size*.02}
              fontSize={size*.07+((i===2||i===3)?size*.03:0)} textAnchor="middle">🔥</text>
          ))}
        </g>
      );
    case 'acc_scarf': {
      const sy = bodyTopY - size*.02;
      return (
        <g>
          <ellipse cx={cx} cy={sy} rx={size*.28} ry={size*.06} fill="#EF4444" opacity=".9"/>
          <rect x={cx+size*.12} y={sy-size*.01} width={size*.07} height={size*.14} rx={size*.02} fill="#DC2626"/>
        </g>
      );
    }
    default: return null;
  }
}

// ── Shirt detail overlay ──────────────────────────────────────
function TopOverlay({ id, cx, cy, rx, ry }) {
  switch (id) {
    case 'top_star':
      return (
        <>
          {[[-rx*.5,-ry*.1],[rx*.3,-ry*.2],[0,ry*.15],[rx*.55,ry*.1],[-rx*.2,ry*.25]].map(([dx,dy],i)=>(
            <text key={i} x={cx+dx} y={cy+dy} fontSize={rx*.22} textAnchor="middle">⭐</text>
          ))}
        </>
      );
    case 'top_rainbow':
      return (
        <>
          <defs>
            <linearGradient id="rainbowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#EF4444"/>
              <stop offset="25%"  stopColor="#F97316"/>
              <stop offset="50%"  stopColor="#EAB308"/>
              <stop offset="75%"  stopColor="#22C55E"/>
              <stop offset="100%" stopColor="#3B82F6"/>
            </linearGradient>
          </defs>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#rainbowGrad)" opacity=".9"/>
        </>
      );
    case 'top_cosmic':
      return (
        <>
          {Array.from({length:8},(_,i)=>(
            <circle key={i}
              cx={cx+(Math.cos(i*Math.PI/4)*rx*.6)}
              cy={cy+(Math.sin(i*Math.PI/4)*ry*.6)}
              r={rx*.04} fill="white" opacity={.3+.4*(i%2)}/>
          ))}
        </>
      );
    case 'top_fire':
      return (
        <text x={cx} y={cy+ry*.2} fontSize={rx*.45} textAnchor="middle">🔥</text>
      );
    default: return null;
  }
}

// ── Main Character Component ──────────────────────────────────
export default function CharacterAvatar({ equipped = {}, size = 160, className = '' }) {
  const eq = { ...DEFAULT_EQUIPPED, ...equipped };
  const skin   = SKIN_TONES.find(s => s.id === eq.skin) || SKIN_TONES[0];
  const topCol = TOP_COLORS[eq.top] || TOP_COLORS['top_sky'];

  // Layout proportions (all relative to size)
  const s      = size;
  const cx     = s / 2;                  // horizontal center
  const headR  = s * .28;               // head radius
  const headCY = s * .42;               // head center Y
  const bodyRX = s * .22;               // body half-width
  const bodyRY = s * .17;               // body half-height
  const bodyCY = s * .76;               // body center Y
  const armRX  = s * .095;
  const armRY  = s * .065;
  const legRX  = s * .085;
  const legRY  = s * .065;
  const headTopY = headCY - headR;

  // Eye positions
  const eyeR   = headR * .26;
  const eyeLX  = cx - headR * .35;
  const eyeRX  = cx + headR * .35;
  const eyeCY  = headCY - headR * .08;
  const pupilR = eyeR * .65;

  return (
    <svg
      viewBox={`0 0 ${s} ${s}`}
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* ── Background ────────────────────────────────────── */}
      <Background id={eq.background} size={s}/>

      {/* ── Shadow ───────────────────────────────────────── */}
      <ellipse cx={cx} cy={s*.88} rx={bodyRX*.9} ry={s*.03} fill="rgba(0,0,0,0.08)"/>

      {/* ── Legs ─────────────────────────────────────────── */}
      <ellipse cx={cx-bodyRX*.38} cy={bodyCY+bodyRY*.9} rx={legRX} ry={legRY}
        fill={topCol.shade} transform={`rotate(-8,${cx-bodyRX*.38},${bodyCY+bodyRY*.9})`}/>
      <ellipse cx={cx+bodyRX*.38} cy={bodyCY+bodyRY*.9} rx={legRX} ry={legRY}
        fill={topCol.shade} transform={`rotate(8,${cx+bodyRX*.38},${bodyCY+bodyRY*.9})`}/>

      {/* ── Arms ─────────────────────────────────────────── */}
      <ellipse cx={cx-bodyRX-.02*s} cy={bodyCY-.05*s} rx={armRX} ry={armRY}
        fill={topCol.fill} transform={`rotate(-25,${cx-bodyRX},${bodyCY})`}/>
      <ellipse cx={cx+bodyRX+.02*s} cy={bodyCY-.05*s} rx={armRX} ry={armRY}
        fill={topCol.fill} transform={`rotate(25,${cx+bodyRX},${bodyCY})`}/>

      {/* ── Body ─────────────────────────────────────────── */}
      {/* Shirt base */}
      <ellipse cx={cx} cy={bodyCY} rx={bodyRX} ry={bodyRY} fill={topCol.fill}/>
      {/* Shirt overlap into neck */}
      <ellipse cx={cx} cy={bodyCY-bodyRY+bodyRY*.2} rx={bodyRX*.55} ry={bodyRY*.35} fill={topCol.fill}/>
      {/* Top overlay (stars, flames, etc.) */}
      <TopOverlay id={eq.top} cx={cx} cy={bodyCY} rx={bodyRX} ry={bodyRY}/>

      {/* ── Accessory (behind head) ───────────────────────── */}
      {(eq.accessory === 'acc_fire') &&
        <Accessory id={eq.accessory} cx={cx} bodyTopY={bodyCY-bodyRY} eyeY={eyeCY} size={s}/>}

      {/* ── Head ─────────────────────────────────────────── */}
      <circle cx={cx} cy={headCY} r={headR} fill={skin.fill}/>
      {/* Neck shadow */}
      <ellipse cx={cx} cy={headCY+headR*.7} rx={headR*.4} ry={headR*.18} fill={skin.shade} opacity=".4"/>

      {/* ── Cheeks ───────────────────────────────────────── */}
      <ellipse cx={cx-headR*.58} cy={headCY+headR*.2} rx={headR*.22} ry={headR*.14}
        fill="rgba(255,120,120,0.28)"/>
      <ellipse cx={cx+headR*.58} cy={headCY+headR*.2} rx={headR*.22} ry={headR*.14}
        fill="rgba(255,120,120,0.28)"/>

      {/* ── Eyes ─────────────────────────────────────────── */}
      {/* Left eye */}
      <circle cx={eyeLX} cy={eyeCY} r={eyeR} fill="white"/>
      <circle cx={eyeLX+eyeR*.12} cy={eyeCY+eyeR*.1} r={pupilR} fill="#1A1A2E"/>
      <circle cx={eyeLX+eyeR*.3} cy={eyeCY-eyeR*.3} r={pupilR*.3} fill="white"/>
      {/* Right eye */}
      <circle cx={eyeRX} cy={eyeCY} r={eyeR} fill="white"/>
      <circle cx={eyeRX+eyeR*.12} cy={eyeCY+eyeR*.1} r={pupilR} fill="#1A1A2E"/>
      <circle cx={eyeRX+eyeR*.3} cy={eyeCY-eyeR*.3} r={pupilR*.3} fill="white"/>

      {/* ── Eyebrows ──────────────────────────────────────── */}
      <path d={`M ${eyeLX-eyeR*.65} ${eyeCY-eyeR*.9} Q ${eyeLX} ${eyeCY-eyeR*1.1} ${eyeLX+eyeR*.65} ${eyeCY-eyeR*.9}`}
        stroke={skin.shade} strokeWidth={s*.012} fill="none" strokeLinecap="round" opacity=".7"/>
      <path d={`M ${eyeRX-eyeR*.65} ${eyeCY-eyeR*.9} Q ${eyeRX} ${eyeCY-eyeR*1.1} ${eyeRX+eyeR*.65} ${eyeCY-eyeR*.9}`}
        stroke={skin.shade} strokeWidth={s*.012} fill="none" strokeLinecap="round" opacity=".7"/>

      {/* ── Nose ─────────────────────────────────────────── */}
      <ellipse cx={cx} cy={headCY+headR*.12} rx={headR*.1} ry={headR*.07} fill={skin.shade} opacity=".6"/>

      {/* ── Mouth ────────────────────────────────────────── */}
      <path d={`M ${cx-headR*.3} ${headCY+headR*.3} Q ${cx} ${headCY+headR*.55} ${cx+headR*.3} ${headCY+headR*.3}`}
        stroke="#1A1A2E" strokeWidth={s*.015} fill="none" strokeLinecap="round" opacity=".75"/>

      {/* ── Hat ──────────────────────────────────────────── */}
      <Hat id={eq.hat} cx={cx} headTopY={headTopY} headR={headR}/>

      {/* ── Accessory (in front, except fire) ─────────────── */}
      {(eq.accessory !== 'acc_fire') &&
        <Accessory id={eq.accessory} cx={cx} bodyTopY={bodyCY-bodyRY} eyeY={eyeCY} size={s}/>}
    </svg>
  );
}

// ── Mini avatar (for sidebar/leaderboard) ────────────────────
export function MiniCharacter({ equipped = {}, size = 48 }) {
  return <CharacterAvatar equipped={equipped} size={size}/>;
}
