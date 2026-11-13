// Pip & het Letterbos – opstarten en het verloop van het spel.
import { S, save, day, today, nextLevel, isOpen, tiredToday, totalStars } from './state.js';
import { LEVELS, WORLDS, SOUNDS, T } from './content.js';
import { initVoice, say, stop, hooks as voiceHooks } from './voice.js';
import { SND, ac, musicOn } from './audio.js';
import * as W from './world.js';
import * as G from './games.js';
import * as U from './ui.js';
import { checkUpdate } from './update.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
let busy = false;

/* ---------- speeltijd bijhouden (voor het rapport) ---------- */
let lastTick = Date.now(), active = true;
document.addEventListener('visibilitychange', () => { active = !document.hidden; lastTick = Date.now(); if (document.hidden) stop(); });
setInterval(() => {
  const now = Date.now();
  if (active && started) { const d = day(); d.sec += Math.min(30, (now - lastTick) / 1000); save(); }
  lastTick = now;
}, 10000);
let started = false;

/* ---------- opstarten ---------- */
async function boot() {
  const bar = document.getElementById('loadbar');
  await initVoice();
  try { await document.fonts.load('700 40px Andika'); await document.fonts.load('700 40px "Baloo 2"'); } catch (e) {}
  const fromBlender = await W.init(document.getElementById('c'), { onStone, onPip }, p => bar.style.width = Math.round(p * 100) + '%');
  console.log('Blender-modellen:', fromBlender);
  voiceHooks.talk = on => W.setTalk(on);
  document.getElementById('loading').classList.add('hide');
  title();
  checkUpdate().then(n => { if (n) document.getElementById('bParent').classList.add('badge'); });
}

function title() {
  const t = document.getElementById('title');
  t.innerHTML = `<div class="t-in"><h1><span>Pip</span> &amp; het <span>Letterbos</span></h1><button id="playBtn" aria-label="Spelen">▶</button></div>`;
  t.classList.add('show');
  document.getElementById('playBtn').onclick = start;
}

async function start() {
  ac(); SND.tap(); musicOn(S.music);
  document.getElementById('title').classList.remove('show');
  started = true; day();
  U.hud(true);
  busy = true;
  if (!S.seenIntro) {
    W.play('happy');
    await U.pipSays([T.hoi]); await U.pipSays([T.honger]); await U.pipSays([T.tikSteen]);
    S.seenIntro = true; save();
  } else {
    W.play('happy'); await U.pipSays([T.welkom]);
  }
  busy = false;
  nudge();
}

// Wijs na een tijdje de volgende steen aan
let nudgeT = 0;
function nudge() {
  clearTimeout(nudgeT);
  nudgeT = setTimeout(() => { if (!busy && !G.inGame() && !document.querySelector('.sheet,.parents')) { if (!tiredToday()) U.pipSays([T.tikSteen]); } }, 25000);
}

/* ---------- op de kaart ---------- */
async function onPip() {
  if (busy) return;
  SND.giggle(); W.play('giggle'); U.pipSays([T.tikPip]); nudge();
}
async function onStone(i) {
  if (busy) return;
  ac(); SND.tap();
  const fresh = !S.done[i];
  if (!isOpen(i)) { W.play('no'); await U.pipSays([T.eerst]); return; }
  if (fresh && tiredToday()) { W.play('no'); await U.pipSays([T.moe]); await U.pipSays([T.morgen]); return; }
  busy = true;
  U.hud(false);
  await W.hopTo(i);
  S.lastLevel = i; save();
  await playLevel(i);
  busy = false;
  U.hud(true); nudge();
}

async function playLevel(i) {
  const L = LEVELS[i];
  const { result, mistakes } = await G.runLevel(L);
  if (result === 'quit') { W.setMode('map'); return; }
  const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
  const first = !S.done[i];
  const prev = S.done[i];
  S.done[i] = { stars: Math.max(stars, prev ? prev.stars : 0), date: today(), mistakes };
  const d = day(); d.rounds++; if (first) d.levels++;
  save(); U.updateHud();
  await U.levelDone(stars, L);
  if (first) await U.giftTime();
  if (L.type === 'feest' && first) await U.cupTime(L.world);
  W.setMode('map'); W.refreshStones();
  // laat de volgende steen zien
  if (first && i + 1 < LEVELS.length) {
    await wait(400);
    if (tiredToday()) { await U.pipSays([T.moe]); }
    else { W.play('happy'); await U.pipSays([T.tikSteen]); }
  }
}

/* ---------- knoppen ---------- */
document.getElementById('bBook').onclick = () => { if (busy) return; SND.tap(); U.letterBook(); };
document.getElementById('bKast').onclick = () => { if (busy) return; SND.tap(); U.wardrobe(); };
document.getElementById('bCups').onclick = () => { if (busy) return; SND.tap(); U.trophies(); };
document.getElementById('bGo').onclick = () => { if (busy) return; const n = nextLevel(); if (n < LEVELS.length) onStone(n); else onStone(LEVELS.length - 1); };
document.getElementById('bParent').onclick = async () => {
  if (busy) return; SND.tap();
  if (await U.parentGate()) { busy = true; await U.parents(() => W.refreshStones()); busy = false; }
};
// Android: terugknop sluit eerst een venster
window.onAndroidBack = () => {
  const s = document.querySelector('.sheet'); if (s) { U.closeSheet(); return true; }
  const p = document.querySelector('.parents .p-x'); if (p) { p.click(); return true; }
  const g = document.querySelector('#game .g-x'); if (g) { g.click(); return true; }
  return false;
};

window.LB = { W, S, G, U };
boot();
