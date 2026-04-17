// ============================================================
// AvatarDisplay.jsx — Shared avatar component used across all pages
// Always shows character PNG. Falls back to gray default character.
// Never shows a letter initial.
// ============================================================
import React from 'react';
import { characterById, DEFAULT_CHARACTER_ID } from './CHARACTER_CATALOG';

export default function AvatarDisplay({ equipped, avatar, username, size = 48, style = {} }) {
  // 1. Prefer equipped character PNG
  const characterId = equipped?.character || null;

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
          objectFit: 'contain',
          display: 'block',
          ...style,
        }}
        onError={e => {
          e.currentTarget.src = '/characters/char_common_gray.png';
        }}
      />
    );
  }

  // 2. If they have a photo avatar (data URL), show it
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

  // 3. Default: always show gray character PNG (never a letter)
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
