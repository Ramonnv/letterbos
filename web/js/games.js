// De leesspelletjes. Alles wordt voorgelezen, want een kleuter kan de opdrachten nog niet lezen.
//  - voeren:    "Geef mij de mmm!" → tik de goede letter, die vliegt in Pips mond
//  - begin:     plaatje → met welke klank begint het?
//  - hakplak:   Pip zegt k–i–p → welk plaatje is het?
//  - lezen:     het woord staat er → welk plaatje hoort erbij?
//  - bouwen:    plaatje → leg de letters op volgorde
//  - overtrek:  schrijf de nieuwe letter met je vinger
import { SOUNDS, WORDS, T, PRAISE, graphemes, readable } from './content.js';
import { S, save, record, mastery } from './state.js';
import { say, stop, listenVoice } from './voice.js';
import { SND } from './audio.js';
import * as W from './world.js';

const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ALL_SOUNDS = Object.keys(SOUNDS);
const PICS = Object.assign({}, WORDS, Object.fromEntries(Object.values(SOUNDS).map(d => [d.key, d.pic])));

let root, panel, bar, mistakes = 0, abort = null, currentPrompt = null;

/* ============ een level spelen ============ */
export async function runLevel(L) {
  mistakes = 0;
  const rounds = plan(L);
  root = $(`<div id="game"><div class="g-top"><button class="g-x" aria-label="Stoppen">✕</button><div class="g-bar"></div><button class="g-ear" aria-label="Nog een keer">🔊</button></div><div class="g-panel"></div></div>`);
  document.body.appendChild(root);
  panel = root.querySelector('.g-panel'); bar = root.querySelector('.g-bar');
  bar.innerHTML = rounds.map(() => '<i></i>').join('');
  root.querySelector('.g-ear').onclick = () => { SND.tap(); currentPrompt && currentPrompt(); };
  let quitArmed = 0;
  const quit = new Promise(res => {
    root.querySelector('.g-x').onclick = (e) => {
      if (Date.now() - quitArmed < 2500) { res('quit'); return; }
      quitArmed = Date.now(); e.currentTarget.classList.add('armed'); setTimeout(() => e.currentTarget && e.currentTarget.classList.remove('armed'), 2500);
    };
  });
  W.setMode('game'); W.play('happy');
  if (L.type === 'feest') await say([T.feest]); else if (L.type === 'woord') await say([T.woordfeest]);
  let result = 'done';
  for (let i = 0; i < rounds.length; i++) {
    bar.children[i].className = 'now';
    const r = await Promise.race([rounds[i](), quit]);
    if (r === 'quit') { result = 'quit'; break; }
    bar.children[i].className = 'ok';
    await wait(350);
  }
  stop();
  root.remove(); root = null; currentPrompt = null;
  return { result, mistakes };
}

/* ============ welke rondes? ============ */
function weakest(known, not) {
  const c = known.filter(s => s !== not);
  if (!c.length) return null;
  return c.map(s => { const m = mastery(s); return { s, v: m ? m.pct - Math.min(m.n, 10) * 0.01 : -1 }; }).sort((a, b) => a.v - b.v)[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * c.length)].s;
}
function beginItem(sound) {
  const items = Object.keys(PICS).filter(w => graphemes(w)[0] === sound);
  return items.length ? pick(items) : null;
}
export function plan(L) {
  const K = L.known, words = readable(K), R = [];
  const newest = K.slice(-3);
  const freshWords = words.filter(w => graphemes(w).some(g => newest.includes(g)));
  const wpick = () => pick(freshWords.length && Math.random() < 0.7 ? freshWords : words);
  if (L.type === 'klank') {
    const s = L.sound;
    R.push(() => intro(s), () => trace(s), () => feed(s, K));
    const b = beginItem(s); R.push(b ? () => begin(b, K) : () => feed(s, K));
    const w1 = weakest(K, s); R.push(w1 ? () => feed(w1, K) : () => feed(s, K));
    const withS = words.filter(w => graphemes(w).includes(s));
    if (words.length >= 3 && withS.length) R.push(() => blend(pick(withS), words));
    else R.push(() => feed(s, K));
    const w2 = weakest(K, s); const b2 = w2 && beginItem(w2); R.push(b2 ? () => begin(b2, K) : () => feed(s, K));
    R.push(() => feed(s, K));
  } else if (L.type === 'woord') {
    const used = new Set(); const nw = () => { let w, n = 0; do { w = wpick(); } while (used.has(w) && n++ < 20); used.add(w); return w; };
    R.push(() => blend(nw(), words), () => read(nw(), words), () => build(nw(), K), () => blend(nw(), words), () => read(nw(), words), () => build(nw(), K));
  } else {
    const s1 = weakest(K) || pick(K), s2 = weakest(K, s1) || pick(K);
    const b1 = beginItem(pick(K)) || beginItem(s1);
    R.push(() => feed(s1, K), () => feed(s2, K));
    if (b1) R.push(() => begin(b1, K));
    if (words.length >= 3) R.push(() => blend(wpick(), words), () => read(wpick(), words), () => build(wpick(), K), () => read(wpick(), words));
    R.push(() => feed(pick(K), K));
  }
  return R;
}

/* ============ hulpjes ============ */
function distractSounds(target, known, n = 2) {
  const own = shuffle(known.filter(s => s !== target && !similar(s, target)));
  const other = shuffle(ALL_SOUNDS.filter(s => s !== target && !known.includes(s) && !similar(s, target)));
  return own.concat(other).slice(0, n);
}
// letters die op elkaar lijken niet samen aanbieden zolang ze nog nieuw zijn
const LOOK = [['b', 'd'], ['p', 'b'], ['a', 'aa'], ['o', 'oo'], ['e', 'ee'], ['m', 'n'], ['ei', 'eu'], ['ui', 'eu']];
function similar(a, b) { return LOOK.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); }
function distractWords(target, pool, n = 2) {
  const tg = graphemes(target);
  const scored = shuffle(pool.filter(w => w !== target && PICS[w] !== PICS[target])).map(w => ({ w, d: graphemes(w)[0] === tg[0] ? 1 : 0 }));
  scored.sort((a, b) => a.d - b.d);
  let out = scored.slice(0, n).map(x => x.w);
  if (out.length < n) out = out.concat(shuffle(Object.keys(WORDS).filter(w => w !== target && !out.includes(w) && WORDS[w] !== WORDS[target])).slice(0, n - out.length));
  return out;
}
const praise = () => pick(PRAISE);
function letterHTML(g, cls = '') { return `<span class="lt ${cls}">${g}</span>`; }
function show(html) { panel.innerHTML = ''; const el = $(html); panel.appendChild(el); el.classList.add('in'); return el; }
function prompt(parts, opts) { currentPrompt = () => say(parts, opts); return currentPrompt(); }

// Een kaartje vliegt naar de mond van Pip
async function flyToMouth(el) {
  const r = el.getBoundingClientRect(); const ghost = el.cloneNode(true);
  ghost.classList.add('ghost'); Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(ghost);
  el.style.visibility = 'hidden';
  const m = W.mouthScreen();
  setTimeout(() => W.play('eat'), 120);
  await wait(20);
  ghost.style.transform = `translate(${m.x - r.left - r.width / 2}px, ${m.y - r.top - r.height / 2}px) scale(.18) rotate(${(Math.random() < .5 ? -1 : 1) * 25}deg)`;
  ghost.style.opacity = '0.6';
  await wait(520);
  ghost.remove(); SND.chomp();
  W.sparkleAtPip(pick(['#ffe36b', '#ff8fcf', '#7df9ff', '#9dff8a']));
}
async function wrong(el, sayParts) {
  mistakes++;
  SND.bad(); W.play('no');
  if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  await say(sayParts.concat([T.nogEens]));
}
async function right(el, sayParts = []) {
  SND.good();
  if (el) el.classList.add('good');
  if (sayParts.length) await say(sayParts);
  await say([praise()]);
}
// Na 2 fouten wijst Pip de goede aan, zodat ze nooit vastloopt
function helpAfter(n, el) { if (n >= 2 && el && !el.classList.contains('hint')) { el.classList.add('hint'); say([T.hulp]); } }

/* ============ intro: een nieuwe letter ============ */
async function intro(s) {
  const d = SOUNDS[s];
  const el = show(`<div class="g-intro"><button class="bigletter">${s}</button><div class="keypic"><span class="pic">${d.pic}</span><span class="kw">${d.key}</span></div><div class="mic" hidden><span class="mic-i">🎤</span><i></i></div></div>`);
  const btn = el.querySelector('.bigletter'), mic = el.querySelector('.mic');
  el.querySelector('.keypic').onclick = () => say([T.dit, { k: s }, T.van, { w: d.key }]);
  W.play('happy');
  await prompt([T.nieuweLetter, T.dit, { k: s }, T.van, { w: d.key }]);
  // Nazeggen. Met microfoon (Ouders → Instellingen) luistert Pip echt; anders tikt ze daarna op de letter.
  if (S.listen && navigator.mediaDevices) {
    await say([T.zeg, { k: s }]);
    await say([T.luister]);
    mic.hidden = false; W.play('listen');
    const heard = await listenVoice({ ms: 7000, onLevel: v => mic.style.setProperty('--lvl', v) });
    mic.hidden = true;
    if (heard) { SND.good(); W.play('happy'); W.sparkleAtPip(); await say([T.hoorde]); return; }
  }
  currentPrompt = () => say([T.zeg, { k: s }, T.tikLetter]);
  await say([T.zeg, { k: s }, T.tikLetter]);
  btn.classList.add('wiggle', 'tapme');
  return new Promise(res => {
    btn.onclick = async () => {
      btn.onclick = null; btn.classList.remove('tapme');
      SND.tap(); btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
      await say([{ k: s }]);
      W.play('happy'); await say([praise()]); res();
    };
  });
}

/* ============ overtrekken met je vinger ============ */
async function trace(s) {
  const el = show(`<div class="g-trace"><canvas></canvas><button class="g-skip" aria-label="Klaar">✓</button></div>`);
  const cv = el.querySelector('canvas'), box = el.getBoundingClientRect();
  const size = Math.floor(Math.min(box.width, box.height) * 0.98), dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  // letter op een verborgen canvas tekenen, en daaruit de stippen halen
  const fs = size * (s.length > 1 ? 0.62 : 0.86);
  const font = `700 ${fs}px Andika, "Baloo 2", sans-serif`;
  const off = document.createElement('canvas'); off.width = off.height = size; const o = off.getContext('2d');
  o.font = font; o.textAlign = 'center'; o.textBaseline = 'alphabetic';
  const base = size * 0.72;
  o.fillText(s, size / 2, base);
  const img = o.getImageData(0, 0, size, size).data, pts = [], step = Math.max(10, size / 22);
  for (let y = step / 2; y < size; y += step) for (let x = step / 2; x < size; x += step) if (img[(Math.floor(y) * size + Math.floor(x)) * 4 + 3] > 200) pts.push({ x, y, hit: false });
  const draw = () => {
    g.clearRect(0, 0, size, size);
    g.font = font; g.textAlign = 'center'; g.fillStyle = 'rgba(123,107,255,.16)'; g.fillText(s, size / 2, base);
    for (const p of pts) { g.beginPath(); g.arc(p.x, p.y, p.hit ? step * 0.42 : step * 0.18, 0, 7); g.fillStyle = p.hit ? `hsl(${(p.x + p.y) % 360},90%,62%)` : 'rgba(123,107,255,.55)'; g.fill(); }
  };
  draw();
  await prompt([T.overtrek]);
  return new Promise(res => {
    let finished = false, down = false;
    const done = async () => {
      if (finished) return; finished = true; SND.win(); W.play('happy'); W.sparkleAtPip();
      pts.forEach(p => p.hit = true); draw(); await say([praise()]); await say([T.dit, { k: s }]); res();
    };
    const at = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const touch = (e) => {
      if (!down || finished) return; const p = at(e); let any = false;
      for (const q of pts) if (!q.hit && Math.hypot(q.x - p.x, q.y - p.y) < step * 1.05) { q.hit = true; any = true; }
      if (any) { draw(); if (Math.random() < 0.3) SND.tick(); }
      if (pts.filter(q => q.hit).length / pts.length > 0.8) done();
    };
    cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); touch(e); };
    cv.onpointermove = touch; cv.onpointerup = cv.onpointercancel = () => down = false;
    const skip = el.querySelector('.g-skip'); setTimeout(() => skip.classList.add('show'), 15000); skip.onclick = done;
  });
}

/* ============ voeren: geef Pip de juiste letter ============ */
async function feed(s, known) {
  window.__ans = s;
  const opts = shuffle([s, ...distractSounds(s, known)]);
  const el = show(`<div class="g-choices">${opts.map(o => `<button class="card letter" data-s="${o}">${letterHTML(o)}</button>`).join('')}</div>`);
  W.play('listen');
  prompt([T.geef, { k: s }, T.van, { w: SOUNDS[s].key, q: true }]);
  let wrongs = 0;
  return new Promise(res => {
    el.querySelectorAll('.card').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const g = b.dataset.s;
      if (g === s) {
        el.querySelectorAll('.card').forEach(x => x.disabled = true);
        if (!wrongs) record('sounds', s, true);
        await flyToMouth(b); await right(null); res();
      } else {
        b.disabled = true; b.classList.add('dim'); wrongs++;
        record('sounds', s, false);
        await wrong(b, [T.nee, { k: g }]);
        helpAfter(wrongs, el.querySelector(`[data-s="${s}"]`));
      }
    });
  });
}

/* ============ beginklank: waar begint het plaatje mee? ============ */
async function begin(item, known) {
  const s = graphemes(item)[0]; window.__ans = s;
  const opts = shuffle([s, ...distractSounds(s, known)]);
  const el = show(`<div class="g-begin"><button class="bigpic">${PICS[item]}</button><div class="g-choices small">${opts.map(o => `<button class="card letter" data-s="${o}">${letterHTML(o)}</button>`).join('')}</div></div>`);
  el.querySelector('.bigpic').onclick = () => say([{ w: item }]);
  W.play('listen');
  prompt([{ w: item }, { p: 350 }, T.begin]);
  let wrongs = 0;
  return new Promise(res => {
    el.querySelectorAll('.card').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const g = b.dataset.s;
      if (g === s) {
        el.querySelectorAll('.card').forEach(x => x.disabled = true);
        if (!wrongs) record('sounds', s, true);
        await flyToMouth(b); await right(null, [{ k: s }, T.van, { w: item }]); res();
      } else {
        b.disabled = true; b.classList.add('dim'); wrongs++;
        record('sounds', s, false);
        await wrong(b, [T.nee, { k: g }]);
        helpAfter(wrongs, el.querySelector(`[data-s="${s}"]`));
      }
    });
  });
}

/* ============ hakken en plakken: k–i–p → kip ============ */
async function blend(word, pool) {
  window.__ans = word;
  const gs = graphemes(word), opts = shuffle([word, ...distractWords(word, pool)]);
  const el = show(`<div class="g-blend"><div class="word">${gs.map((g, i) => letterHTML(g, 'w' + i)).join('')}</div><div class="g-choices pics">${opts.map(o => `<button class="card pic" data-w="${o}">${PICS[o]}</button>`).join('')}</div></div>`);
  const spans = el.querySelectorAll('.word .lt');
  const hl = (i) => spans.forEach((sp, k) => sp.classList.toggle('lit', k === i));
  W.play('listen');
  const p = () => prompt([T.pipZegt, { p: 200 }, ...gs.map(g => ({ k: g })), { p: 300 }, T.welkPlaatje], { onPart: (i) => hl(i >= 2 && i < 2 + gs.length ? i - 2 : -1), gap: 220 });
  p(); currentPrompt = p;
  el.querySelector('.word').onclick = p;
  let wrongs = 0;
  return new Promise(res => {
    el.querySelectorAll('.card').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const w = b.dataset.w;
      if (w === word) {
        el.querySelectorAll('.card').forEach(x => x.disabled = true);
        if (!wrongs) record('words', word, true);
        spans.forEach(s => s.classList.add('lit'));
        await flyToMouth(b); await right(null, [{ w: word }]); res();
      } else {
        b.disabled = true; b.classList.add('dim'); wrongs++;
        record('words', word, false);
        await wrong(b, [T.dat, { w }]);
        helpAfter(wrongs, el.querySelector(`[data-w="${word}"]`));
      }
    });
  });
}

/* ============ zelf lezen ============ */
async function read(word, pool) {
  window.__ans = word;
  const gs = graphemes(word), opts = shuffle([word, ...distractWords(word, pool)]);
  const el = show(`<div class="g-blend read"><div class="word">${gs.map((g, i) => `<button class="lt tap" data-g="${g}">${g}</button>`).join('')}</div><div class="g-choices pics">${opts.map(o => `<button class="card pic" data-w="${o}">${PICS[o]}</button>`).join('')}</div></div>`);
  el.querySelectorAll('.word .lt').forEach(b => b.onclick = () => { b.classList.add('lit'); SND.tap(); say([{ k: b.dataset.g }]); });
  W.play('listen');
  prompt([T.lees]);
  let wrongs = 0;
  return new Promise(res => {
    el.querySelectorAll('.card').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const w = b.dataset.w;
      if (w === word) {
        el.querySelectorAll('.card').forEach(x => x.disabled = true);
        if (!wrongs) record('words', word, true);
        el.querySelectorAll('.word .lt').forEach(s => s.classList.add('lit'));
        await flyToMouth(b); await right(null, [{ w: word }]); res();
      } else {
        b.disabled = true; b.classList.add('dim'); wrongs++;
        record('words', word, false);
        await wrong(b, [T.dat, { w }]);
        if (wrongs >= 2) { await say([...gs.map(g => ({ k: g })), { w: word }], { gap: 200 }); }
        helpAfter(wrongs, el.querySelector(`[data-w="${word}"]`));
      }
    });
  });
}

/* ============ woord bouwen ============ */
async function build(word, known) {
  window.__ans = graphemes(word);
  const gs = graphemes(word);
  const extra = distractSounds(gs[0], known, 1).filter(x => !gs.includes(x));
  const tiles = shuffle(gs.concat(extra));
  const el = show(`<div class="g-build"><button class="bigpic sm">${PICS[word]}</button><div class="slots">${gs.map(() => '<span class="slot"></span>').join('')}</div><div class="tiles">${tiles.map((g, i) => `<button class="card letter tile" data-g="${g}" data-i="${i}">${letterHTML(g)}</button>`).join('')}</div></div>`);
  const slots = el.querySelectorAll('.slot');
  el.querySelector('.bigpic').onclick = () => say([{ w: word }]);
  W.play('listen');
  prompt([T.bouw, { p: 200 }, { w: word }]);
  let pos = 0, wrongs = 0;
  return new Promise(res => {
    el.querySelectorAll('.tile').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const g = b.dataset.g;
      if (g === gs[pos]) {
        b.disabled = true; b.classList.add('placed'); SND.pop();
        slots[pos].innerHTML = letterHTML(g); slots[pos].classList.add('full');
        say([{ k: g }]);
        record('sounds', g, true);
        pos++;
        if (pos === gs.length) {
          el.querySelectorAll('.tile').forEach(x => x.disabled = true);
          if (!wrongs) record('words', word, true);
          await wait(500);
          await say([...gs.map(x => ({ k: x })), { p: 150 }, { w: word }], { gap: 120, onPart: i => slots.forEach((s, k) => s.classList.toggle('lit', k === i)) });
          await flyToMouth(el.querySelector('.slots')); await right(null); res();
        }
      } else {
        wrongs++; record('sounds', gs[pos], false);
        await wrong(b, [T.nee, { k: g }]);
        if (wrongs >= 2) { const good = [...el.querySelectorAll('.tile')].find(x => !x.disabled && x.dataset.g === gs[pos]); helpAfter(2, good); }
      }
    });
  });
}

export function repeatPrompt() { currentPrompt && currentPrompt(); }
export const inGame = () => !!root;
