// ============================================================
// bgMusic.js — Procedural background music via Web Audio API
// No external files. Works on all browsers with Web Audio support.
// ============================================================

let audioCtx    = null;
let masterGain  = null;
let loopTimeout = null;
let _playing    = false;
let _theme      = 'calm';

// ── Note frequencies (Hz) ───────────────────────────────────
const N = {
  C3:174, D3:196, E3:220, F3:233, G3:261, A3:293, B3:329,
  C4:349, D4:392, E4:440, F4:466, G4:523, A4:587, B4:659,
  C5:698, D5:784, E5:880,
  Bb3:311, Ab3:277, Eb4:622, Gb4:740,
  R: 0,   // rest
};

// ── Theme definitions ────────────────────────────────────────
// notes: array of frequencies (0 = rest)
// bpm:   beats per minute (each note = 1 beat unless noteDiv set)
// wave:  OscillatorNode type
// vol:   per-note volume (0–1)
// atk:   attack time (seconds)
// rel:   release fraction of noteLen
const THEMES = {
  calm: {
    bpm: 72,
    wave: 'sine',
    vol: 0.14,
    atk: 0.04,
    rel: 0.75,
    notes: [
      N.C4, N.E4, N.G4, N.E4,   // C major arp up-down
      N.G3, N.B3, N.D4, N.B3,   // G major
      N.A3, N.C4, N.E4, N.C4,   // Am
      N.F3, N.A3, N.C4, N.A3,   // F major
      N.C4, N.G4, N.E4, N.C4,   // C major high
      N.G3, N.D4, N.B3, N.G3,   // G back
      N.A3, N.E4, N.C4, N.A3,   // Am back
      N.F3, N.C4, N.A3, N.F3,   // F back
    ],
  },
  playful: {
    bpm: 108,
    wave: 'triangle',
    vol: 0.11,
    atk: 0.01,
    rel: 0.55,
    notes: [
      N.C4, N.E4, N.G4, N.A4, N.G4, N.E4, N.C4, N.R,
      N.E4, N.G4, N.A4, N.C5, N.A4, N.G4, N.E4, N.R,
      N.G4, N.A4, N.C5, N.D5, N.C5, N.A4, N.G4, N.R,
      N.C5, N.A4, N.G4, N.E4, N.D4, N.C4, N.R,  N.R,
    ],
  },
  focus: {
    bpm: 48,
    wave: 'sine',
    vol: 0.09,
    atk: 0.12,
    rel: 0.90,
    notes: [
      N.C3, N.G3, N.R,  N.R,
      N.C3, N.E3, N.G3, N.R,
      N.A3, N.R,  N.E3, N.R,
      N.F3, N.C4, N.R,  N.R,
    ],
  },
  fantasy: {
    bpm: 84,
    wave: 'sine',
    vol: 0.12,
    atk: 0.03,
    rel: 0.70,
    notes: [
      N.A3, N.C4, N.E4, N.G4, N.E4, N.C4,
      N.E4, N.G4, N.A4, N.C5, N.A4, N.G4,
      N.D4, N.F4, N.A4, N.C5, N.A4, N.F4,
      N.C4, N.E4, N.G4, N.A4, N.G4, N.E4,
    ],
  },
};

// ── Audio context init ───────────────────────────────────────
function getCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx   = new Ctor();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

// ── Play a single note ───────────────────────────────────────
function playNote(freq, startTime, noteLen, theme) {
  const ctx = audioCtx;
  if (!ctx || freq <= 0) return;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(masterGain);

  osc.type = theme.wave;
  osc.frequency.setValueAtTime(freq, startTime);

  const atk = theme.atk;
  const vol = theme.vol;
  const sustainEnd = startTime + noteLen * theme.rel;
  const end        = startTime + noteLen * 0.98;

  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(vol, startTime + atk);
  env.gain.setValueAtTime(vol, sustainEnd);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.start(startTime);
  osc.stop(end + 0.05);

  // For fantasy theme, add a second slightly detuned oscillator for richness
  if (theme === THEMES.fantasy) {
    const osc2 = ctx.createOscillator();
    const env2 = ctx.createGain();
    osc2.connect(env2);
    env2.connect(masterGain);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.004, startTime);
    env2.gain.setValueAtTime(0, startTime);
    env2.gain.linearRampToValueAtTime(vol * 0.4, startTime + atk);
    env2.gain.setValueAtTime(vol * 0.4, sustainEnd);
    env2.gain.exponentialRampToValueAtTime(0.0001, end);
    osc2.start(startTime);
    osc2.stop(end + 0.05);
  }
}

// ── Schedule a full loop ─────────────────────────────────────
function scheduleLoop(startTime, themeName) {
  if (!_playing || !audioCtx) return;

  const theme   = THEMES[themeName] || THEMES.calm;
  const noteLen = 60 / theme.bpm;              // seconds per beat
  const notes   = theme.notes;
  let   t       = startTime;

  for (const freq of notes) {
    playNote(freq, t, noteLen, theme);
    t += noteLen;
  }

  // Schedule next loop 0.3s before this one ends
  const loopDuration = notes.length * noteLen;
  const delay = Math.max(100, (startTime + loopDuration - audioCtx.currentTime - 0.3) * 1000);
  loopTimeout = setTimeout(() => scheduleLoop(audioCtx.currentTime + 0.05, _theme), delay);
}

// ── Public API ───────────────────────────────────────────────

/** Start background music. Returns true if AudioContext started, false if suspended. */
export function startMusic(theme = 'calm') {
  stopMusic();
  _theme = theme;

  const ctx = getCtx();
  if (!ctx) return false; // Web Audio not supported

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  _playing = true;

  // Fade in master gain
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.5);

  scheduleLoop(ctx.currentTime + 0.1, _theme);
  return ctx.state !== 'suspended';
}

/** Stop background music with a fade-out. */
export function stopMusic() {
  _playing = false;
  clearTimeout(loopTimeout);

  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value || 0.001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  }
}

/** Change the music theme (stops current loop, starts new one). */
export function changeMusicTheme(theme) {
  if (_playing) {
    stopMusic();
    _theme = theme;
    setTimeout(() => startMusic(theme), 900);
  } else {
    _theme = theme;
  }
}

/** Set master volume (0–1). */
export function setMusicVolume(vol) {
  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(Math.max(0.001, Math.min(1, vol)), audioCtx.currentTime);
  }
}

/** Check whether music is currently playing. */
export function isMusicPlaying() { return _playing; }
