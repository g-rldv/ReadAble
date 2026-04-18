// ============================================================
// CharacterAvatar.jsx — PNG fills the container fully.
// objectFit:'contain' + width/height 100% ensures the character
// image occupies the entire tile without whitespace borders.
// ============================================================
import React from 'react';
import {
  characterById,
  DEFAULT_CHARACTER_ID,
  RARITY_CONFIG,
  ALL_CHARACTERS,
  ACHIEVEMENT_CHARACTER_UNLOCKS,
} from './CHARACTER_CATALOG';

// Re-export everything so other files can import from CharacterAvatar
export {
  ALL_CHARACTERS,
  characterById,
  DEFAULT_CHARACTER_ID,
  RARITY_CONFIG,
  ACHIEVEMENT_CHARACTER_UNLOCKS,
} from './CHARACTER_CATALOG';

// ── Main Character Avatar ─────────────────────────────────────
export default function CharacterAvatar({
  characterId,
  size = 160,
  className = '',
  showGlow = false,
  animate = false,
}) {
  const id      = characterId || DEFAULT_CHARACTER_ID;
  const char    = characterById(id);
  const rarity  = char?.rarity || 'common';
  const rarConf = RARITY_CONFIG[rarity];
  const src     = char
    ? `/characters/${char.file}`
    : `/characters/char_common_gray.png`;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {showGlow && rarity !== 'common' && (
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${rarConf.glow} 0%, transparent 70%)`,
          animation: animate ? 'charGlow 2s ease-in-out infinite' : 'none',
          pointerEvents: 'none',
        }}/>
      )}

      <img
        src={src}
        alt={char?.name || 'Character'}
        draggable={false}
        style={{
          // Fill the entire allocated space so there is no empty padding
          width: '100%',
          height: '100%',
          objectFit: 'contain',   // keeps aspect ratio, fills box
          display: 'block',
          animation: animate ? `charFloat 3s ease-in-out infinite` : 'none',
          filter: (showGlow && rarity !== 'common')
            ? `drop-shadow(0 0 ${Math.round(size * 0.06)}px ${rarConf.color}88)`
            : 'none',
          transition: 'filter 0.3s',
        }}
        onError={e => { e.currentTarget.style.opacity = '0.3'; }}
      />

      <style>{`
        @keyframes charFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-${Math.round(size * 0.04)}px); }
        }
        @keyframes charGlow {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

// ── Mini avatar (sidebar / leaderboard) ───────────────────────
export function MiniCharacter({ characterId, size = 48 }) {
  return <CharacterAvatar characterId={characterId} size={size} />;
}
