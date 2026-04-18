// ============================================================
// AvatarDisplay.jsx — Shared avatar component used across all pages.
// PNG fills the full container with no visible whitespace margin.
// Never shows a letter initial.
// ============================================================
import React from 'react';
import { characterById, DEFAULT_CHARACTER_ID } from './CHARACTER_CATALOG';

export default function AvatarDisplay({ equipped, avatar, username, size = 48, style = {} }) {
  const characterId = equipped?.character || null;

  // 1. Prefer equipped character PNG — fills edge-to-edge
  if (characterId) {
    const char = characterById(characterId);
    const src  = char
      ? `/characters/${char.file}`
      : `/characters/char_common_gray.png`;
    return (
      <img
        src={src}
        alt={char?.name || username || 'Character'}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',   // fills box, keeps aspect ratio
          display: 'block',
          ...style,
        }}
        onError={e => {
          e.currentTarget.src = '/characters/char_common_gray.png';
        }}
      />
    );
  }

  // 2. Photo avatar (data URL) — cover-crop to fill circle/square
  if (avatar && avatar.startsWith('data:')) {
    return (
      <img
        src={avatar}
        alt={username || 'avatar'}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: 4,
          display: 'block',
          ...style,
        }}
      />
    );
  }

  // 3. Default: gray character PNG — always fills the container
  const defaultChar = characterById(DEFAULT_CHARACTER_ID);
  const defaultSrc  = defaultChar
    ? `/characters/${defaultChar.file}`
    : '/characters/char_common_gray.png';

  return (
    <img
      src={defaultSrc}
      alt="Character"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
      onError={e => { e.currentTarget.style.opacity = '0.3'; }}
    />
  );
}
