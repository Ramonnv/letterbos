// Geluid en muziek (WebAudio, geen bestanden nodig) + de stem van Pip.
import { S } from './state.js';
let AC = null, master = null, musicGain = null, musicTimer = null;
const MUSIC_VOL = 0.35;
export function duck(on) { if (!AC || !musicGain || !S.music) return; musicGain.gain.cancelScheduledValues(AC.currentTime); musicGain.gain.linearRampToValueAtTime(on ? 0.08 : MUSIC_VOL, AC.currentTime + 0.25); }
export function ac() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) {}
  return AC;
}
export function tone(f, d, type, vol, delay, dest) {
  const c = ac(); if (!c) return;
  if (!dest && !S.sound) return;
  try {
    const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.05);
  } catch (e) {}
}
function noise(d, vol, freq) {
  const c = ac(); if (!c || !S.sound) return;
  const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 800;
  const g = c.createGain(); g.gain.value = vol || 0.2;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
export const SND = {
  good() { tone(660, .15, 'triangle'); tone(990, .25, 'triangle', .15, .1); },
  bad() { tone(220, .25, 'sawtooth', .06); },
  tap() { tone(520, .06, 'sine', .08); },
  pop() { tone(880, .08, 'square', .05); tone(1320, .08, 'square', .04, .05); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .3, 'triangle', .15, i * .11)); },
  tick() { tone(1200, .04, 'sine', .05); },
  star() { [1046, 1318, 1568].forEach((f, i) => tone(f, .18, 'sine', .12, i * .05)); },
  jump() { tone(330, .12, 'sine', .07); tone(500, .1, 'sine', .05, .05); },
  land() { noise(.08, .08, 300); },
  splash() { noise(.5, .25, 900); },
  roar() { noise(.6, .35, 220); tone(110, .6, 'sawtooth', .12); tone(90, .7, 'square', .06, .1); },
  talk(pitch) { tone((pitch || 1) * (380 + Math.random() * 160), .05, 'square', .035); },
  magic() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, .35, 'sine', .1, i * .07)); },
  flute() { [659, 784, 880, 784, 659, 587, 659].forEach((f, i) => tone(f, .4, 'sine', .1, i * .22)); },
  chomp() { noise(.07, .25, 500); setTimeout(() => noise(.07, .22, 420), 140); setTimeout(() => noise(.07, .2, 380), 280); },
  boing() { const c = ac(); if (!c || !S.sound) return; const o = c.createOscillator(), g = c.createGain(); const t = c.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(660, t + .15); o.frequency.exponentialRampToValueAtTime(330, t + .3);
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.0001, t + .35); o.connect(g); g.connect(master); o.start(t); o.stop(t + .4); },
  giggle() { [900, 1100, 950, 1200, 1000].forEach((f, i) => tone(f, .07, 'sine', .08, i * .08)); },
  fanfare() { [523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, i === 6 ? .8 : .2, 'triangle', .14, [0, .15, .3, .45, .7, .85, 1.0][i])); }
};

// Vrolijke, zachte muziek: pentatonische melodie met baslijn.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const BASS = [0, -5, -3, -8];
export function musicOn(on) {
  const c = ac(); if (!c) return;
  musicGain.gain.cancelScheduledValues(c.currentTime);
  musicGain.gain.linearRampToValueAtTime(on ? MUSIC_VOL : 0, c.currentTime + 1.2);
  if (on && !musicTimer) {
    let step = 0, next = c.currentTime + 0.2;
    const beat = 0.36, root = 261.6;
    musicTimer = setInterval(() => {
      while (next < c.currentTime + 0.6) {
        const bar = Math.floor(step / 8) % 4;
        if (step % 8 === 0) tone(root / 2 * Math.pow(2, BASS[bar] / 12), beat * 7, 'sine', 0.11, next - c.currentTime, musicGain);
        if (step % 2 === 0 || Math.random() < 0.35) {
          const n = SCALE[(step * 3 + bar * 2 + (Math.random() < .3 ? 1 : 0)) % SCALE.length];
          tone(root * Math.pow(2, (n + BASS[bar] * 0) / 12), beat * 1.8, 'triangle', 0.045, next - c.currentTime, musicGain);
        }
        if (step % 4 === 2) tone(root * 2 * Math.pow(2, SCALE[(step + bar) % 5] / 12), beat * 0.8, 'sine', 0.02, next - c.currentTime, musicGain);
        next += beat; step++;
      }
    }, 120);
  }
}
