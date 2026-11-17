// Sound for Popcorn: Rooftop Run.
// Every sound is synthesized with Web Audio: no audio files, no network.
// The audio context is created on the first user gesture, as browsers
// require, and the music is a simple per-level melody loop.

const MELODIES = [
  // Level 1 Sunset Harbor: warm, lazy, major.
  [392, 0, 440, 0, 523, 0, 587, 0, 523, 0, 440, 0, 392, 0, 330, 0],
  // Level 2 Paper Kite Market: bright, bouncing, pentatonic.
  [523, 587, 659, 587, 523, 440, 523, 659, 784, 659, 587, 523, 440, 392, 440, 0],
  // Level 3 Starfall Spires: slow, dreamy, minor.
  [440, 0, 523, 0, 659, 0, 523, 0, 587, 0, 523, 0, 440, 0, 392, 0],
];

export function createAudio() {
  return {
    ctx: null, master: null, musicGain: null,
    muted: false, started: false, levelIndex: -1,
    step: 0, nextNote: 0,
  };
}

// Call from a user gesture (keydown / pointerdown). Safe to call twice.
export function ensureAudio(audio) {
  if (audio.started) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = audio.muted ? 0 : 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.musicGain = audio.ctx.createGain();
    audio.musicGain.gain.value = 0.16;
    audio.musicGain.connect(audio.master);
    audio.started = true;
    audio.nextNote = audio.ctx.currentTime + 0.1;
  } catch (e) {
    // No audio on this browser: the game stays silent, never crashes.
  }
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master && audio.ctx) {
    audio.master.gain.setTargetAtTime(muted ? 0 : 0.5, audio.ctx.currentTime, 0.02);
  }
}

function tone(audio, freq, dur, type, vol, when = 0, slideTo = 0) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol || 0.3, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playJump(audio) { tone(audio, 300, 0.18, 'sine', 0.35, 0, 620); }
export function playDouble(audio) { tone(audio, 420, 0.2, 'triangle', 0.35, 0, 880); }
export function playPounce(audio) { tone(audio, 180, 0.16, 'sawtooth', 0.22, 0, 90); }
export function playCrow(audio) {
  tone(audio, 520, 0.1, 'square', 0.18, 0, 240);
  tone(audio, 700, 0.14, 'square', 0.15, 0.07, 300);
}
export function playHurt(audio) {
  tone(audio, 220, 0.25, 'sawtooth', 0.3, 0, 110);
  tone(audio, 160, 0.3, 'square', 0.18, 0.05, 80);
}
export function playBell(audio) {
  tone(audio, 1318, 0.5, 'sine', 0.3);
  tone(audio, 1976, 0.6, 'sine', 0.18, 0.02);
}
export function playMilk(audio) {
  tone(audio, 523, 0.15, 'sine', 0.3);
  tone(audio, 659, 0.15, 'sine', 0.3, 0.1);
  tone(audio, 784, 0.25, 'sine', 0.3, 0.2);
}
export function playFish(audio, mult) {
  // The pickup pitch climbs with the combo multiplier.
  const base = 660 * Math.pow(1.059, Math.min(mult, 8) - 1);
  tone(audio, base, 0.12, 'triangle', 0.3);
  tone(audio, base * 1.5, 0.14, 'triangle', 0.2, 0.04);
}
export function playGate(audio) {
  [523, 659, 784, 1047].forEach((f, i) => tone(audio, f, 0.3, 'triangle', 0.3, i * 0.09));
}

// Schedule the next music note, if one is due. Call every animation frame
// while playing; the melody restarts at each level.
export function tickMusic(audio, levelIndex) {
  if (!audio.ctx || audio.muted) return;
  if (audio.levelIndex !== levelIndex) {
    audio.levelIndex = levelIndex;
    audio.step = 0;
    audio.nextNote = audio.ctx.currentTime + 0.05;
  }
  const mel = MELODIES[levelIndex % MELODIES.length];
  while (audio.nextNote < audio.ctx.currentTime + 0.25) {
    const f = mel[audio.step % mel.length];
    if (f) {
      const osc = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, audio.nextNote);
      g.gain.linearRampToValueAtTime(0.5, audio.nextNote + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, audio.nextNote + 0.22);
      osc.connect(g);
      g.connect(audio.musicGain);
      osc.start(audio.nextNote);
      osc.stop(audio.nextNote + 0.25);
    }
    audio.nextNote += 0.24;
    audio.step += 1;
  }
}
