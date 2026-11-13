// De stem van Pip.
// Volgorde per stukje tekst:
//   1. ingesproken door papa/mama (Ouders → Stem), bewaard op het apparaat
//   2. vooraf gemaakte spraak (assets/spraak, gemaakt door GitHub Actions met Piper)
//   3. de computerstem van de browser (Web Speech)
import { S } from './state.js';
import { SOUNDS, mergeText, segments } from './content.js';
import { duck } from './audio.js';

let index = {};                 // tekst -> bestand
const recorded = {};            // sleutel -> object-URL
let nlVoice = null, token = 0, current = null;
export const hooks = { talk: null };   // talk(true/false): Pip beweegt zijn mond

export async function initVoice() {
  try { index = await (await fetch('assets/spraak/index.json', { cache: 'no-cache' })).json(); } catch (e) { index = {}; }
  try { const all = await idbAll(); for (const [k, b] of all) recorded[k] = URL.createObjectURL(b); } catch (e) {}
  pickVoice();
  try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
}
// Alleen Nederlandse stemmen, de mooiste eerst (natuurlijke online stemmen klinken veel beter)
function voiceScore(v) {
  if (!/^nl/i.test(v.lang)) return -1;
  let s = 1;
  if (/^nl[-_]NL/i.test(v.lang)) s += 3;
  if (/natural|online|neural|premium|enhanced|verbeterd/i.test(v.name)) s += 10;
  if (/google/i.test(v.name)) s += 8;
  if (/fenna|colette|maarten|claire|anna|lotte|femke/i.test(v.name)) s += 3;
  if (/compact|eloquence/i.test(v.name)) s -= 4;
  return s;
}
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices().filter(v => voiceScore(v) >= 0).sort((a, b) => voiceScore(b) - voiceScore(a));
    nlVoice = vs[0] || null;
  } catch (e) { nlVoice = null; }
}
export const hasPrebuilt = () => Object.keys(index).length > 0;
export const hasDeviceVoice = () => !!nlVoice;

// Een stukje: tekst, {k:'m'} voor een klank, {w:'kip'} voor een woord, {p:400} voor een pauze
function resolve(part) {
  if (typeof part === 'string') return { key: 'zin:' + part, text: part };
  if (part.k) return { key: 'klank:' + part.k, text: SOUNDS[part.k].say, klank: true };
  if (part.w) return { key: 'woord:' + part.w, text: part.w };
  return { pause: part.p || 300 };
}

export function stop() {
  token++;
  try { current && current.pause(); } catch (e) {}
  try { speechSynthesis.cancel(); } catch (e) {}
  current = null; talking(false);
}
function talking(on) { duck(on); hooks.talk && hooks.talk(on); }

// say([...stukjes], { onPart(i) }) → Promise die klaar is als alles gezegd is
export async function say(parts, opts = {}) {
  stop();
  const my = token;
  if (!Array.isArray(parts)) parts = [parts];
  let idx = 0;
  for (const g of segments(parts)) {
    if (my !== token) return false;
    opts.onPart && opts.onPart(idx, parts[idx]);
    idx += g.parts.length;
    if (g.pause) { await wait(g.pause); continue; }
    talking(true);
    await speakSeg(g, my);
    if (my === token) talking(false);
    if (opts.gap) await wait(opts.gap);
    else if (g.klank) await wait(120);   // klein pauzetje na een klank, zodat hij goed opvalt
  }
  opts.onPart && my === token && opts.onPart(-1);
  return my === token;
}
async function speakSeg(g, my) {
  // 1. zelf ingesproken (klank of woord)
  const p = g.parts.length === 1 ? g.parts[0] : null;
  const key = p && typeof p === 'object' ? (p.k ? 'klank:' + p.k : p.w ? 'woord:' + p.w : null) : null;
  if (key && recorded[key] && await playURL(recorded[key], my)) return;
  if (my !== token) return;
  // 2. vooraf gemaakte natuurlijke stem
  const f = index[g.text];
  if (f && await playURL('assets/spraak/' + f, my)) return;
  if (my !== token) return;
  // zin niet als geheel ingesproken? Dan de losse stukjes achter elkaar
  if (g.parts.length > 1 && g.parts.every(q => index[mergeText([q])])) {
    for (const q of g.parts) { if (my !== token) return; await playURL('assets/spraak/' + index[mergeText([q])], my); }
    return;
  }
  // 3. stem van het apparaat
  await synth(g.text, g.klank);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

function playURL(url, my) {
  return new Promise(res => {
    const a = new Audio(url); current = a; a.volume = 1;
    let done = false; const fin = () => { if (!done) { done = true; res(true); } };
    a.onended = fin; a.onerror = () => { done = true; res(false); };
    a.play().catch(() => { done = true; res(false); });
    setTimeout(fin, 8000);
  });
}
function synth(text, klank) {
  return new Promise(res => {
    try {
      if (!('speechSynthesis' in window)) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nl-NL'; if (nlVoice) u.voice = nlVoice;
      u.rate = (S.rate || 0.95) * (klank ? 0.7 : 1); u.pitch = 1.1; u.volume = 1;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      speechSynthesis.speak(u);
      setTimeout(fin, 1500 + text.length * 110);
    } catch (e) { res(); }
  });
}

// ---------- Eigen stem opnemen (IndexedDB) ----------
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('letterbos-stem', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('clips');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbAll() {
  const db = await idb();
  return new Promise((res, rej) => {
    const out = []; const tx = db.transaction('clips', 'readonly'); const st = tx.objectStore('clips');
    const c = st.openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); };
    c.onerror = () => rej(c.error);
  });
}
async function idbPut(k, v) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('clips', 'readwrite'); v === null ? tx.objectStore('clips').delete(k) : tx.objectStore('clips').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }

export const isRecorded = key => !!recorded[key];
export const recordedCount = () => Object.keys(recorded).length;
let rec = null, chunks = [], stream = null;
export async function recStart() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  chunks = [];
  rec = new MediaRecorder(stream);
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.start();
}
export function recStop(key) {
  return new Promise(res => {
    if (!rec) return res(false);
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      let blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      rec = null;
      if (blob.size < 800) return res(false);
      try { blob = await normalize(blob); } catch (e) { console.warn('normaliseren lukte niet', e); }
      await idbPut(key, blob);
      if (recorded[key]) URL.revokeObjectURL(recorded[key]);
      recorded[key] = URL.createObjectURL(blob);
      res(true);
    };
    rec.stop();
  });
}
export async function recDelete(key) { await idbPut(key, null); if (recorded[key]) URL.revokeObjectURL(recorded[key]); delete recorded[key]; }
export function playKey(key, text) { return say([key.startsWith('klank:') ? { k: key.slice(6) } : key.startsWith('woord:') ? { w: key.slice(6) } : text]); }

// Opname even hard maken als de stem van Pip: stilte eraf, en het hardste punt op bijna-maximaal.
async function normalize(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close && ctx.close();
  const sr = buf.sampleRate, n = buf.length, ch = buf.numberOfChannels;
  const mono = new Float32Array(n);
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mono[i]));
  if (peak < 0.003) return blob;
  const thr = peak * 0.08, pad = Math.round(sr * 0.06);
  let a = 0; while (a < n && Math.abs(mono[a]) < thr) a++;
  let b = n - 1; while (b > a && Math.abs(mono[b]) < thr) b--;
  a = Math.max(0, a - pad); b = Math.min(n - 1, b + pad);
  const gain = Math.min(0.92 / peak, 12);
  const len = b - a + 1, fade = Math.min(Math.round(sr * 0.01), len >> 2);
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    let v = mono[a + i] * gain;
    if (i < fade) v *= i / fade; if (i > len - fade) v *= (len - i) / fade;
    v = Math.max(-1, Math.min(1, v)); out[i] = v * 32767;
  }
  // WAV-bestandje maken
  const hdr = new DataView(new ArrayBuffer(44)); const w = (o, t) => [...t].forEach((c, i) => hdr.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); hdr.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); hdr.setUint32(16, 16, true); hdr.setUint16(20, 1, true); hdr.setUint16(22, 1, true);
  hdr.setUint32(24, sr, true); hdr.setUint32(28, sr * 2, true); hdr.setUint16(32, 2, true); hdr.setUint16(34, 16, true); w(36, 'data'); hdr.setUint32(40, len * 2, true);
  return new Blob([hdr.buffer, out.buffer], { type: 'audio/wav' });
}

// Luisteren of het kind iets zegt (alleen of er geluid is, er wordt niets opgenomen of bewaard)
export async function listenVoice({ ms = 6000, onLevel } = {}) {
  let st;
  try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { return null; }
  const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC();
  const src = ctx.createMediaStreamSource(st), an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
  const data = new Float32Array(an.fftSize);
  let base = 0.01, loud = 0, t0 = performance.now();
  const result = await new Promise(res => {
    const tick = () => {
      an.getFloatTimeDomainData(data);
      let sum = 0; for (const v of data) sum += v * v; const rms = Math.sqrt(sum / data.length);
      const el = performance.now() - t0;
      if (el < 400) base = Math.max(base, rms * 1.5);            // eerst het achtergrondgeluid meten
      const lvl = Math.min(1, rms / Math.max(base * 4, 0.04)); onLevel && onLevel(lvl);
      if (el > 400 && rms > Math.max(base * 3, 0.025)) loud += 16; else loud = Math.max(0, loud - 8);
      if (loud > 250) return res(true);
      if (el > ms) return res(false);
      setTimeout(tick, 16);
    };
    tick();
  });
  st.getTracks().forEach(t => t.stop()); ctx.close && ctx.close(); onLevel && onLevel(0);
  return result;
}
