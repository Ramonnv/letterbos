// Voortgang en statistieken: alles wordt op het apparaat bewaard (localStorage).
import { KEY, LEVELS } from './content.js';

export function fresh() {
  return {
    v: 1, name: '', done: {},            // done[levelIndex] = { stars, date, mistakes }
    items: [], wearing: [], color: 'groen', colors: ['groen'], cups: [],
    stats: { sounds: {}, words: {} },     // per klank/woord: { ok, bad, last }
    days: {},                             // per dag: { sec, rounds, ok, bad, levels }
    perDay: 3, parent: false, unlockAll: false,
    music: true, sound: true, rate: 0.95, seenIntro: false, lastLevel: -1, firstDay: ''
  };
}

export let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = Object.assign(fresh(), raw ? JSON.parse(raw) : {});
    s.stats = Object.assign({ sounds: {}, words: {} }, s.stats || {});
    return s;
  } catch (e) { return fresh(); }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
export function replaceState(n) { S = Object.assign(fresh(), n); save(); }
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

export function dayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export const today = () => dayStr();
export function day(t) {
  t = t || today();
  if (!S.firstDay) S.firstDay = t;
  return (S.days[t] = S.days[t] || { sec: 0, rounds: 0, ok: 0, bad: 0, levels: 0 });
}

// Antwoord bijhouden (voor het rapport en om moeilijke letters vaker te oefenen)
export function record(kind, id, ok) {
  const tab = S.stats[kind]; const r = (tab[id] = tab[id] || { ok: 0, bad: 0, last: '' });
  ok ? r.ok++ : r.bad++; r.last = today();
  const d = day(); ok ? d.ok++ : d.bad++;
  save();
}
export function mastery(id) {
  const r = S.stats.sounds[id]; if (!r) return null;
  const n = r.ok + r.bad; return { n, pct: n ? r.ok / n : 0 };
}

export const doneCount = () => Object.keys(S.done).length;
export const totalStars = () => Object.values(S.done).reduce((a, d) => a + (d.stars || 0), 0);
export const levelsToday = () => (S.days[today()] || {}).levels || 0;
export const nextLevel = () => { const i = LEVELS.findIndex((_, i) => !S.done[i]); return i < 0 ? LEVELS.length : i; };
export function isOpen(i) {
  if (S.done[i] || S.unlockAll) return true;
  return i === nextLevel();
}
export const tiredToday = () => !S.unlockAll && S.perDay > 0 && levelsToday() >= S.perDay;
export function knownSounds() {
  const set = new Set();
  LEVELS.forEach((L, i) => { if (S.done[i] && L.sound) set.add(L.sound); });
  return [...set];
}

export function backupCode() { return 'LB1-' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
export function restoreCode(code) {
  const c = code.trim().replace(/^LB1-/, '').replace(/\s+/g, '');
  const obj = JSON.parse(decodeURIComponent(escape(atob(c))));
  if (!obj || typeof obj !== 'object' || !('done' in obj)) throw new Error('ongeldig');
  replaceState(obj);
}
