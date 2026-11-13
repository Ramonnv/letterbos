// De stem van Pip.
// Volgorde per stukje tekst:
//   1. ingesproken door papa/mama (Ouders → Stem), bewaard op het apparaat
//   2. vooraf gemaakte spraak (assets/spraak, gemaakt door GitHub Actions met Piper)
//   3. de computerstem van de browser (Web Speech)
import { S } from './state.js';
import { SOUNDS, mergeText } from './content.js';
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
  // Zoek steeds het langste stuk dat als hele zin is ingesproken: dat klinkt het mooist.
  // Klanken die papa/mama zelf heeft ingesproken gaan altijd voor.
  const own = p => p && p.k && recorded['klank:' + p.k];
  const segs = [];
  if (opts.onPart || opts.gap) parts.forEach((p, i) => segs.push({ i, j: i + 1 }));
  else {
    let i = 0;
    while (i < parts.length) {
      let j = parts.length, found = false;
      for (; j > i + 1; j--) {
        const sl = parts.slice(i, j);
        if (sl.some(own)) continue;
        if (index[mergeText(sl)]) { found = true; break; }
      }
      if (!found) {
        // geen opname: zonder vooraf gemaakte stem alles in één keer met de apparaatstem
        if (!hasPrebuilt() && !parts.slice(i).some(own)) j = parts.length; else j = i + 1;
      }
      segs.push({ i, j }); i = j;
    }
  }
  for (const { i, j } of segs) {
    if (my !== token) return false;
    const sl = parts.slice(i, j);
    opts.onPart && opts.onPart(i, parts[i]);
    if (sl.length === 1 && sl[0] && sl[0].p) { await wait(sl[0].p); continue; }
    talking(true);
    await speakOne(sl, my);
    if (my === token) talking(false);
    if (opts.gap) await wait(opts.gap);
  }
  opts.onPart && my === token && opts.onPart(-1);
  return my === token;
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
async function speakOne(sl, my) {
  const one = sl.length === 1 ? resolve(sl[0]) : null;
  if (one && recorded[one.key] && await playURL(recorded[one.key], my)) return;
  if (my !== token) return;
  const text = mergeText(sl);
  const f = index[text];
  if (f && await playURL('assets/spraak/' + f, my)) return;
  if (my !== token) return;
  await synth(text, one && one.klank);
}
function synth(text, klank) {
  return new Promise(res => {
    try {
      if (!('speechSynthesis' in window)) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nl-NL'; if (nlVoice) u.voice = nlVoice;
      u.rate = (S.rate || 0.95) * (klank ? 0.8 : 1); u.pitch = 1.1;
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
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
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
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      rec = null;
      if (blob.size < 800) return res(false);
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
