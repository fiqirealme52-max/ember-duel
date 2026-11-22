// audio.js — the sounds of Ember Duel, synthesised live with WebAudio. One job:
// every effect the game makes, with no audio files at all.
let audioContext = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function context() {
  if (muted) return null;
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  } catch (error) {
    return null;
  }
}

function tone(frequency, startAt, duration, type, volume) {
  const ctx = context();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startAt);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime + startAt);
    oscillator.stop(ctx.currentTime + startAt + duration + 0.05);
  } catch (error) {
    // Silence is acceptable; the game never depends on sound.
  }
}

export function playClick() {
  tone(660, 0, 0.07, 'triangle', 0.12);
}

export function playFlip() {
  tone(440, 0, 0.08, 'sine', 0.1);
  tone(660, 0.05, 0.08, 'sine', 0.08);
}

export function playHit() {
  tone(180, 0, 0.18, 'sawtooth', 0.16);
  tone(90, 0.02, 0.22, 'square', 0.12);
}

export function playHeal() {
  tone(523, 0, 0.12, 'sine', 0.1);
  tone(784, 0.09, 0.16, 'sine', 0.1);
}

export function playShield() {
  tone(330, 0, 0.1, 'triangle', 0.12);
  tone(392, 0.06, 0.14, 'triangle', 0.1);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((frequency, index) => tone(frequency, index * 0.12, 0.22, 'triangle', 0.14));
}

export function playLose() {
  const notes = [392, 330, 262, 196];
  notes.forEach((frequency, index) => tone(frequency, index * 0.14, 0.24, 'sawtooth', 0.08));
}
