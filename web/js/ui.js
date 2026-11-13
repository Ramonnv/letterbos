// Schermen: start, kaart-knoppen, letterboek, kledingkast, prijzenkast, level klaar, en het ouderdeel met rapport.
import { S, save, day, today, doneCount, totalStars, mastery, knownSounds, levelsToday, backupCode, restoreCode, fresh, replaceState } from './state.js';
import { SOUNDS, WORDS, WORLDS, LEVELS, REWARDS, SLOT, PIP_COLORS, T } from './content.js';
import { say, stop, recStart, recStop, recDelete, isRecorded, recordedCount, hasPrebuilt, hasDeviceVoice } from './voice.js';
import { SND, musicOn } from './audio.js';
import * as W from './world.js';
import { renderURL } from './models.js';
import { info, hasUpdate, APK } from './update.js';

export const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ============ tekstwolkje van Pip (ook handig voor ouders die meekijken) ============ */
let bubbleT = 0;
export function bubble(text, ms = 3500) {
  const b = document.getElementById('bubble'); b.textContent = text; b.classList.add('show');
  clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.remove('show'), ms);
}
export async function pipSays(parts) {
  const txt = parts.map(p => typeof p === 'string' ? p : p.k ? p.k : p.w ? p.w : '').filter(Boolean).join(' ');
  bubble(txt, 2500 + txt.length * 60);
  return say(parts);
}

/* ============ kaart-knoppen ============ */
export function hud(show) { document.getElementById('hud').classList.toggle('show', show); if (show) updateHud(); }
export function updateHud() {
  document.getElementById('starsN').textContent = totalStars();
  document.getElementById('cupsN').textContent = S.cups.length;
}

/* ============ onderblad (sheet) ============ */
function sheet(html, cls = '') {
  closeSheet();
  const s = $(`<div class="sheet ${cls}"><button class="sheet-x" aria-label="Sluiten">✕</button><div class="sheet-in">${html}</div></div>`);
  document.body.appendChild(s);
  requestAnimationFrame(() => s.classList.add('open'));
  return new Promise(res => { s.querySelector('.sheet-x').onclick = () => { SND.tap(); closeSheet(); res(); }; s._res = res; });
}
export function closeSheet() { document.querySelectorAll('.sheet').forEach(s => { s._res && s._res(); s.remove(); }); W.setMode('map'); stop(); }
const sheetEl = () => document.querySelector('.sheet:last-of-type');

/* ============ letterboek ============ */
export function letterBook() {
  const known = new Set(knownSounds());
  const p = sheet(`<h2>Mijn letters</h2><div class="book">${Object.entries(SOUNDS).map(([s, d]) => `
    <button class="bk ${known.has(s) ? 'have' : ''}" data-s="${s}"><b>${known.has(s) ? s : '?'}</b><span>${known.has(s) ? d.pic : '🔒'}</span></button>`).join('')}</div>`, 'tall');
  const el = sheetEl();
  el.querySelectorAll('.bk.have').forEach(b => b.onclick = () => { SND.tap(); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); say([T.dit, { k: b.dataset.s }, T.van, { w: SOUNDS[b.dataset.s].key }]); });
  pipSays([T.letters]);
  return p;
}

/* ============ kledingkast: Pip aankleden ============ */
export function wardrobe() {
  W.setMode('game');
  const accs = REWARDS.filter(r => r.kind === 'acc' && S.items.includes(r.id));
  const cols = S.colors;
  const p = sheet(`<h2>Pip aankleden</h2>
    <div class="wr">${accs.length ? accs.map(r => `<button class="wi ${S.wearing.includes(r.id) ? 'on' : ''}" data-id="${r.id}"><img src="assets/icons/${r.id}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${r.emoji}'}))"></button>`).join('') : '<p class="muted">Win cadeautjes door levels te spelen!</p>'}</div>
    <div class="cols">${cols.map(c => `<button class="ci ${S.color === c ? 'on' : ''}" data-c="${c}" style="background:#${PIP_COLORS[c]['7ed9a4']}"></button>`).join('')}</div>`, 'low');
  const el = sheetEl();
  el.querySelectorAll('.wi').forEach(b => b.onclick = () => {
    const id = b.dataset.id; SND.pop();
    if (S.wearing.includes(id)) S.wearing = S.wearing.filter(x => x !== id);
    else { S.wearing = S.wearing.filter(x => SLOT[x] !== SLOT[id]); S.wearing.push(id); W.popAccessory(id); W.play('happy'); }
    save(); W.applyLook();
    el.querySelectorAll('.wi').forEach(x => x.classList.toggle('on', S.wearing.includes(x.dataset.id)));
  });
  el.querySelectorAll('.ci').forEach(b => b.onclick = () => {
    S.color = b.dataset.c; save(); W.applyLook(); W.play('happy'); W.sparkleAtPip(); SND.magic();
    el.querySelectorAll('.ci').forEach(x => x.classList.toggle('on', x.dataset.c === S.color));
  });
  pipSays([T.kast]);
  return p;
}

/* ============ prijzenkast ============ */
export function trophies() {
  const p = sheet(`<h2>Prijzenkast</h2><div class="cups">${WORLDS.map(w => {
    const won = S.cups.includes(w.cup);
    return `<div class="cup ${won ? 'won' : ''}"><img src="${renderURL(w.cup)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'cupE',textContent:'🏆'}))"><b>${w.emoji} ${w.name}</b></div>`;
  }).join('')}</div>
  <div class="tstats"><span>⭐ ${totalStars()}</span><span>🪨 ${doneCount()} / ${LEVELS.length}</span><span>🔤 ${knownSounds().length} letters</span></div>`, 'tall');
  return p;
}

/* ============ level klaar ============ */
export async function levelDone(stars, L) {
  const el = $(`<div class="done"><div class="done-in"><h1>Hoera!</h1><div class="dstars">${[0, 1, 2].map(i => `<span class="ds ${i < stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">⭐</span>`).join('')}</div></div></div>`);
  document.body.appendChild(el);
  W.play('dance'); W.fireworks(6); SND.fanfare();
  for (let i = 0; i < stars; i++) setTimeout(() => SND.star(), 300 + i * 350);
  await pipSays([T.klaar]);
  await wait(900);
  el.classList.add('out'); await wait(400); el.remove();
}

/* ============ cadeautje kiezen (in 3D) ============ */
export function nextReward() { return REWARDS.find(r => !S.items.includes(r.id) && !(r.kind === 'kleur' && S.colors.includes(r.id.slice(6)))); }
export async function giftTime() {
  const r = nextReward(); if (!r) return null;
  W.showGifts(2);
  pipSays([T.cadeau]);
  const hint = $(`<div class="gift-hint">👆</div>`); document.body.appendChild(hint);
  await new Promise(res => { W.setGiftHandler(k => { W.setGiftHandler(null); W.openGift(k); res(k); }); });
  hint.remove();
  SND.magic();
  await wait(600);
  S.items.push(r.id);
  if (r.kind === 'kleur') { const c = r.id.slice(6); if (!S.colors.includes(c)) S.colors.push(c); S.color = c; }
  else { S.wearing = S.wearing.filter(x => SLOT[x] !== SLOT[r.id]); S.wearing.push(r.id); }
  save(); W.applyLook();
  if (r.kind === 'acc') W.popAccessory(r.id); else W.sparkleAtPip('#ffffff');
  W.play('happy');
  await pipSays([T.kreeg, r.name + '!', T.mooi]);
  await wait(500);
  W.clearGifts();
  return r;
}

/* ============ beker ============ */
export async function cupTime(w) {
  const cup = WORLDS[w].cup; if (S.cups.includes(cup)) return;
  S.cups.push(cup); save();
  W.setMode('gift'); W.showCup(cup); SND.fanfare(); W.play('dance');
  const el = $(`<div class="done"><div class="done-in"><h1>🏆</h1><h2>${WORLDS[w].name}</h2></div></div>`); document.body.appendChild(el);
  await pipSays([T.beker]);
  await wait(2200);
  el.classList.add('out'); await wait(400); el.remove();
  W.hideCup(); W.refreshStones();
  if (w === WORLDS.length - 1) await pipSays([T.alles]);
}

/* ============================================================
   OUDERS
   ============================================================ */
export async function parentGate() {
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), ans = a * b;
  const opts = [ans, ans + a, ans - b, ans + 2].sort(() => Math.random() - .5);
  return new Promise(res => {
    const el = $(`<div class="gate"><div class="gate-in"><h3>Voor papa en mama</h3><p>Hoeveel is ${a} × ${b}?</p><div class="gate-o">${opts.map(o => `<button>${o}</button>`).join('')}</div><button class="gate-x">Terug</button></div></div>`);
    document.body.appendChild(el);
    el.querySelectorAll('.gate-o button').forEach(b2 => b2.onclick = () => { el.remove(); res(+b2.textContent === ans); });
    el.querySelector('.gate-x').onclick = () => { el.remove(); res(false); };
  });
}

export async function parents(onChange) {
  const el = $(`<div class="parents"><div class="p-head"><h2>Ouders</h2><div class="p-tabs"><button data-t="rapport" class="on">📊 Rapport</button><button data-t="stem">🎙️ Stem</button><button data-t="inst">⚙️ Instellingen</button></div><button class="p-x">Sluiten ✕</button></div><div class="p-body"></div></div>`);
  document.body.appendChild(el);
  const body = el.querySelector('.p-body');
  const tabs = { rapport: () => report(body), stem: () => voiceTab(body), inst: () => settings(body, onChange) };
  el.querySelectorAll('.p-tabs button').forEach(b => b.onclick = () => { el.querySelectorAll('.p-tabs button').forEach(x => x.classList.toggle('on', x === b)); tabs[b.dataset.t](); });
  if (hasUpdate()) el.querySelector('[data-t="inst"]').click(); else tabs.rapport();
  return new Promise(res => el.querySelector('.p-x').onclick = () => { stop(); el.remove(); res(); });
}

// ---------- Rapport ----------
function fmtMin(sec) { const m = Math.round(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' u ' + (m % 60) + ' min'; }
function niceDate(d) { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }); }
export function reportData() {
  const known = knownSounds();
  const sounds = Object.keys(SOUNDS).map(s => { const m = mastery(s); return { s, known: known.includes(s), n: m ? m.n : 0, pct: m ? m.pct : null }; });
  const words = Object.entries(S.stats.words).map(([w, r]) => ({ w, n: r.ok + r.bad, pct: (r.ok) / Math.max(1, r.ok + r.bad) }));
  const days = Object.entries(S.days).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const totSec = days.reduce((a, [, d]) => a + d.sec, 0);
  const ok = days.reduce((a, [, d]) => a + d.ok, 0), bad = days.reduce((a, [, d]) => a + d.bad, 0);
  const weak = sounds.filter(x => x.known && x.n >= 3).sort((a, b) => a.pct - b.pct).slice(0, 3).filter(x => x.pct < 0.85);
  const strongWords = words.filter(w => w.pct >= 0.75 && w.n >= 1).map(w => w.w);
  return { known, sounds, words, days, totSec, ok, bad, weak, strongWords };
}
function level(x) { if (!x.known && !x.n) return 'nog'; if (x.n < 3) return 'start'; if (x.pct >= 0.85) return 'goed'; if (x.pct >= 0.6) return 'bijna'; return 'oefen'; }
function report(body) {
  const R = reportData();
  const last14 = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toISOString ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''; last14.push([k, S.days[k] || { sec: 0, ok: 0, bad: 0, levels: 0 }]); }
  const maxSec = Math.max(300, ...last14.map(([, d]) => d.sec));
  const bars = last14.map(([k, d], i) => { const h = Math.round(d.sec / maxSec * 100); return `<g><rect x="${i * 24 + 4}" y="${110 - h}" width="16" height="${Math.max(h, d.sec ? 2 : 0)}" rx="4" fill="${d.levels ? '#7b6bff' : '#c9c1ff'}"/><text x="${i * 24 + 12}" y="126" text-anchor="middle">${+k.slice(8)}</text></g>`; }).join('');
  const name = S.name || 'je kind';
  const pct = R.ok + R.bad ? Math.round(R.ok / (R.ok + R.bad) * 100) : 0;
  body.innerHTML = `
  <div id="printable">
    <div class="r-title"><h2>Leesrapport van ${esc(name)}</h2><span>${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    <div class="r-cards">
      <div><b>${R.known.length}</b><span>van ${Object.keys(SOUNDS).length} klanken</span></div>
      <div><b>${R.strongWords.length}</b><span>woordjes gelezen</span></div>
      <div><b>${doneCount()}</b><span>van ${LEVELS.length} levels</span></div>
      <div><b>${totalStars()} ⭐</b><span>sterren</span></div>
      <div><b>${fmtMin(R.totSec)}</b><span>gespeeld, ${R.days.filter(([, d]) => d.sec > 30).length} dagen</span></div>
      <div><b>${pct}%</b><span>goed in één keer</span></div>
    </div>
    <h3>Klanken</h3>
    <div class="r-legend"><i class="goed"></i>kent ze goed <i class="bijna"></i>bijna <i class="oefen"></i>nog oefenen <i class="start"></i>net begonnen <i class="nog"></i>nog niet gehad</div>
    <div class="r-sounds">${R.sounds.map(x => `<div class="rs ${level(x)}" title="${x.n} keer"><b>${x.s}</b><small>${x.n ? Math.round(x.pct * 100) + '%' : ''}</small></div>`).join('')}</div>
    <h3>Speeltijd, laatste 14 dagen</h3>
    <svg class="r-chart" viewBox="0 0 340 132" role="img" aria-label="Minuten per dag">${bars}</svg>
    <h3>Tips om samen te oefenen</h3>
    <ul class="r-tips">
      ${R.weak.length ? R.weak.map(x => `<li>Oefen de <b>${x.s}</b> van <i>${SOUNDS[x.s].key}</i> ${SOUNDS[x.s].pic}: zoek samen dingen in huis die met de <b>${x.s}</b> beginnen.</li>`).join('') : '<li>Alle klanken die ze heeft gehad gaan goed. Mooi zo!</li>'}
      ${R.known.length >= 4 ? `<li>Schrijf woordjes als ${R.strongWords.slice(0, 4).map(w => `<b>${w}</b>`).join(', ') || '<b>kip</b>, <b>aap</b>'} op een briefje en laat haar "hakken en plakken": eerst de klanken los zeggen, dan snel achter elkaar.</li>` : '<li>Zeg klanken los, zoals op school: <b>mmm</b>, niet "em". Dat maakt lezen later makkelijker.</li>'}
      <li>Een paar minuten per dag werkt beter dan één keer lang.</li>
    </ul>
    ${R.words.length ? `<h3>Woordjes</h3><div class="r-words">${R.words.sort((a, b) => b.n - a.n).map(w => `<span class="${w.pct >= .75 ? 'goed' : w.pct >= .5 ? 'bijna' : 'oefen'}">${WORDS[w.w] || ''} ${w.w}</span>`).join('')}</div>` : ''}
    <h3>Prijzen</h3>
    <div class="r-cups">${WORLDS.map(w => `<span class="${S.cups.includes(w.cup) ? 'won' : ''}">🏆 ${w.name}</span>`).join('')}</div>
  </div>
  <div class="r-actions"><button id="rPrint">🖨️ Rapport printen of bewaren als PDF</button><button id="rCopy">📋 Kopieer als tekst</button>${S.cups.length ? '<button id="rDiploma">🎓 Oorkonde printen</button>' : ''}</div>`;
  body.querySelector('#rPrint').onclick = () => printNode(body.querySelector('#printable').cloneNode(true), 'Leesrapport');
  body.querySelector('#rCopy').onclick = async () => {
    const t = `Leesrapport ${name} (${today()})\nKlanken: ${R.known.join(' ')} (${R.known.length}/${Object.keys(SOUNDS).length})\nLevels: ${doneCount()}/${LEVELS.length}, sterren: ${totalStars()}\nSpeeltijd: ${fmtMin(R.totSec)}\nGoed in één keer: ${pct}%\nOefenen: ${R.weak.map(x => x.s).join(', ') || '-'}\nGelezen woordjes: ${R.strongWords.join(', ') || '-'}`;
    try { await navigator.clipboard.writeText(t); body.querySelector('#rCopy').textContent = '✅ Gekopieerd'; } catch (e) { prompt('Kopieer de tekst:', t); }
  };
  const d = body.querySelector('#rDiploma'); if (d) d.onclick = () => diploma();
}
function printNode(node, title) {
  const wrap = document.getElementById('print'); wrap.innerHTML = ''; wrap.appendChild(node);
  const t = document.title; document.title = title; window.print(); document.title = t;
}
function diploma() {
  const w = WORLDS.filter(x => S.cups.includes(x.cup)); const last = w[w.length - 1];
  const node = $(`<div class="diploma"><div class="dp-in">
    <div class="dp-top">🌟 Oorkonde 🌟</div>
    <h1>${esc(S.name || 'Superlezer')}</h1>
    <p>heeft samen met Pip het letterdraakje</p>
    <h2>${w.map(x => x.emoji + ' ' + x.name).join(' · ')}</h2>
    <p>uitgespeeld en kent nu <b>${knownSounds().length}</b> klanken!</p>
    <img src="${renderURL(last.cup)}" onerror="this.remove()" alt="">
    <img src="${renderURL('pip')}" onerror="this.remove()" alt="" class="dp-pip">
    <div class="dp-date">${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div></div>`);
  printNode(node, 'Oorkonde');
}

// ---------- Eigen stem ----------
function voiceTab(body) {
  const keys = [...Object.keys(SOUNDS).map(s => ['klank:' + s, s, SOUNDS[s].pic + ' ' + SOUNDS[s].key])];
  const canRec = !!(navigator.mediaDevices && window.MediaRecorder);
  body.innerHTML = `
    <p class="p-note">Kinderen leren op school de <b>klank</b> van een letter (mmm, sss, kuh), niet de naam ("em", "es", "kaa"). Een computerstem doet dat niet altijd goed.
    Spreek de klanken daarom het liefst zelf in: houd de knop ingedrukt, zeg de klank, en laat los. Pip gebruikt dan jouw stem.</p>
    <p class="p-note small">Stem nu: ${recordedCount() ? `<b>${recordedCount()}</b> zelf ingesproken, ` : ''}${hasPrebuilt() ? 'ingebouwde voorleesstem' : hasDeviceVoice() ? 'stem van dit apparaat' : '<b>geen Nederlandse stem gevonden op dit apparaat</b>: spreek de klanken zelf in, of installeer een Nederlandse stem (Instellingen → Systeem → Tekst-naar-spraak)'}.</p>
    ${canRec ? '' : '<p class="p-note warn">Opnemen werkt niet in deze browser.</p>'}
    <div class="vt">${keys.map(([k, s, hint]) => `<div class="vr" data-k="${k}"><b>${s}</b><span>${hint}</span>
      <button class="rec" ${canRec ? '' : 'disabled'}>🎙️ Houd vast</button><button class="ply">▶︎</button><button class="del" ${isRecorded(k) ? '' : 'hidden'}>🗑️</button></div>`).join('')}</div>`;
  body.querySelectorAll('.vr').forEach(row => {
    const k = row.dataset.k, s = k.slice(6);
    const rec = row.querySelector('.rec'), del = row.querySelector('.del');
    row.classList.toggle('has', isRecorded(k));
    let active = false;
    rec.onpointerdown = async (e) => { e.preventDefault(); stop(); try { await recStart(); active = true; rec.classList.add('on'); rec.textContent = '🔴 Opnemen…'; } catch (err) { alert('De microfoon mag niet gebruikt worden. Sta de microfoon toe in de instellingen van de browser of app.'); } };
    const end = async () => { if (!active) return; active = false; rec.classList.remove('on'); rec.textContent = '🎙️ Houd vast'; await wait(250); const ok = await recStop(k); if (ok) { row.classList.add('has'); del.hidden = false; say([{ k: s }]); } };
    rec.onpointerup = end; rec.onpointerleave = end; rec.onpointercancel = end;
    row.querySelector('.ply').onclick = () => say([{ k: s }]);
    del.onclick = async () => { await recDelete(k); row.classList.remove('has'); del.hidden = true; };
  });
}

// ---------- Instellingen ----------
function settings(body, onChange) {
  const upd = hasUpdate() ? `<div class="p-note upd"><b>Er is een nieuwe versie: ${esc(info.remote.versie)}</b> (je hebt ${esc(info.local.versie)}).<br>
      Tik op de knop, open de download en kies <i>Installeren</i>. De voortgang blijft bewaard.<div class="pb" style="margin-top:8px"><a class="btn" href="${APK}">⬇️ Nieuwe versie downloaden</a></div></div>` : '';
  body.innerHTML = upd + `
    <label class="pf">Naam (voor het rapport en de oorkonde)<input id="sName" value="${esc(S.name)}" placeholder="Naam" maxlength="24"></label>
    <label class="pf">Nieuwe levels per dag
      <select id="sPer">${[1, 2, 3, 4, 5, 0].map(n => `<option value="${n}" ${S.perDay === n ? 'selected' : ''}>${n || 'onbeperkt'}</option>`).join('')}</select>
      <small>Een paar nieuwe letters per dag is genoeg voor een kleuter. Oude levels kan ze altijd opnieuw spelen.</small></label>
    <label class="pf">Spreeksnelheid computerstem <input id="sRate" type="range" min="0.6" max="1.2" step="0.05" value="${S.rate}"></label>
    <label class="pc"><input type="checkbox" id="sListen" ${S.listen ? 'checked' : ''}> Pip luistert mee bij het nazeggen (microfoon)</label>
    <p class="p-note small">Als dit aan staat, zegt Pip "Ik luister!" en ziet je kind een microfoon die beweegt als ze praat. Pip hoort alleen <i>dat</i> ze iets zegt (niet wát), en er wordt niets opgenomen of bewaard. Uit: ze zegt de klank hardop en tikt dan op de letter.</p>
    <label class="pc"><input type="checkbox" id="sMusic" ${S.music ? 'checked' : ''}> Muziek</label>
    <label class="pc"><input type="checkbox" id="sSound" ${S.sound ? 'checked' : ''}> Geluidjes</label>
    <label class="pc"><input type="checkbox" id="sAll" ${S.unlockAll ? 'checked' : ''}> Alle levels open (om vooruit te kijken)</label>
    <h3>Voortgang overzetten</h3>
    <p class="p-note small">Alles wordt op dit apparaat bewaard. Maak een back-upcode om de voortgang naar een ander apparaat (of van de web-app naar de app) te kopiëren.</p>
    <div class="pb"><button id="bMake">Maak back-upcode</button><button id="bLoad">Code invoeren</button><button id="bReset" class="danger">Opnieuw beginnen</button></div>
    <textarea id="bCode" rows="3" hidden></textarea>
    <p class="p-note small">Pip & het Letterbos · versie ${esc((info.local && info.local.versie) || 'test')} · ${LEVELS.length} levels · ${Object.keys(SOUNDS).length} klanken · ${Object.keys(WORDS).length} woordjes</p>`;
  const q = s => body.querySelector(s);
  q('#sName').oninput = e => { S.name = e.target.value.trim(); save(); };
  q('#sPer').onchange = e => { S.perDay = +e.target.value; save(); onChange && onChange(); };
  q('#sRate').oninput = e => { S.rate = +e.target.value; save(); };
  q('#sRate').onchange = () => say([T.test]);
  q('#sListen').onchange = async e => {
    S.listen = e.target.checked; save();
    if (S.listen) { try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); st.getTracks().forEach(t => t.stop()); } catch (err) { alert('De microfoon mag niet gebruikt worden. Sta hem toe in de instellingen van de browser of app.'); S.listen = false; e.target.checked = false; save(); } }
  };
  q('#sMusic').onchange = e => { S.music = e.target.checked; save(); musicOn(S.music); };
  q('#sSound').onchange = e => { S.sound = e.target.checked; save(); };
  q('#sAll').onchange = e => { S.unlockAll = e.target.checked; save(); W.refreshStones(); onChange && onChange(); };
  q('#bMake').onclick = () => { const t = q('#bCode'); t.hidden = false; t.value = backupCode(); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) {} };
  q('#bLoad').onclick = () => {
    const t = q('#bCode'); if (t.hidden) { t.hidden = false; t.value = ''; t.placeholder = 'Plak hier de code en tik nog een keer op "Code invoeren"'; return; }
    try { restoreCode(t.value); alert('Gelukt!'); location.reload(); } catch (e) { alert('Deze code klopt niet.'); }
  };
  q('#bReset').onclick = () => { if (confirm('Weet je het zeker? Alle voortgang, sterren en cadeautjes worden gewist.')) { replaceState(fresh()); location.reload(); } };
}
