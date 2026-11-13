// Pip & het Letterbos – alle inhoud: klanken, woorden, werelden, levels, beloningen en zinnetjes.
// Dit bestand heeft geen browser nodig, zodat tools/phrases.mjs er ook de spraak uit kan halen.

export const KEY = 'letterbos-v1';

// Lettergrepen die uit meer letters bestaan (lange klanken en tweeklanken)
export const MULTI = ['oe', 'ui', 'ei', 'ij', 'eu', 'ou', 'au', 'ie', 'aa', 'ee', 'oo', 'uu', 'ch', 'ng'];
export function graphemes(word) {
  const out = []; let i = 0;
  while (i < word.length) {
    const two = word.slice(i, i + 2);
    if (MULTI.includes(two)) { out.push(two); i += 2; } else { out.push(word[i]); i++; }
  }
  return out;
}

// Elke klank: hoe Pip hem uitspreekt (say), een sleutelwoord met plaatje.
// "say" wordt gebruikt door de computerstem. Mama of papa kan elke klank ook zelf inspreken (Ouders → Stem).
export const SOUNDS = {
  i:  { say: 'ih',  key: 'ik',      pic: '🙋' },
  k:  { say: 'kuh', key: 'kaas',    pic: '🧀' },
  m:  { say: 'mmm', key: 'maan',    pic: '🌙' },
  aa: { say: 'aa',  key: 'aap',     pic: '🐒' },
  s:  { say: 'sss', key: 'slang',   pic: '🐍' },
  p:  { say: 'puh', key: 'pet',     pic: '🧢' },
  n:  { say: 'nnn', key: 'neus',    pic: '👃' },
  r:  { say: 'rrr', key: 'raket',   pic: '🚀' },
  oo: { say: 'oo',  key: 'oor',     pic: '👂' },
  v:  { say: 'vvv', key: 'vis',     pic: '🐟' },
  o:  { say: 'oh',  key: 'olifant', pic: '🐘' },
  t:  { say: 'tuh', key: 'taart',   pic: '🎂' },
  e:  { say: 'eh',  key: 'emmer',   pic: '🪣' },
  b:  { say: 'buh', key: 'beer',    pic: '🐻' },
  a:  { say: 'ah',  key: 'appel',   pic: '🍎' },
  d:  { say: 'duh', key: 'dino',    pic: '🦕' },
  l:  { say: 'lll', key: 'lamp',    pic: '💡' },
  ee: { say: 'ee',  key: 'eend',    pic: '🦆' },
  h:  { say: 'huh', key: 'huis',    pic: '🏠' },
  oe: { say: 'oe',  key: 'koe',     pic: '🐄' },
  ui: { say: 'ui',  key: 'duim',    pic: '👍' },
  ei: { say: 'ei',  key: 'ei',      pic: '🥚' },
  eu: { say: 'eu',  key: 'deur',    pic: '🚪' },
  z:  { say: 'zzz', key: 'zon',     pic: '☀️' },
  w:  { say: 'wuh', key: 'wolk',    pic: '☁️' },
  g:  { say: 'ggg', key: 'geit',    pic: '🐐' },
  f:  { say: 'fff', key: 'fiets',   pic: '🚲' }
};

// Woorden om te lezen (klank-zuiver, zoals op school: eerst korte woordjes)
export const WORDS = {
  ik: '🙋', kip: '🐔', aap: '🐒', kaas: '🧀', maan: '🌙',
  vis: '🐟', roos: '🌹', sok: '🧦', rok: '👗', pet: '🧢', oor: '👂', kok: '👨‍🍳', mok: '☕', tent: '⛺', net: '🥅', ster: '⭐',
  bal: '⚽', bed: '🛏️', boom: '🌳', beer: '🐻', lam: '🐑', been: '🦵', haan: '🐓', kat: '🐱', bel: '🔔', lamp: '💡', taart: '🎂', hond: '🐶',
  koe: '🐄', boek: '📖', voet: '🦶', hoed: '🎩', huis: '🏠', muis: '🐭', duim: '👍', ei: '🥚', deur: '🚪', neus: '👃', zon: '☀️', geit: '🐐', wolk: '☁️', zee: '🌊', fee: '🧚'
};

// Vier werelden op het eiland, elk met eigen klanken en een eigen beker
export const WORLDS = [
  { id: 'bos',     name: 'Het Bos',       emoji: '🌳', sounds: ['i', 'k', 'm', 'aa', 's', 'p', 'n'], cup: 'beker_bos' },
  { id: 'zee',     name: 'Het Strand',    emoji: '🏖️', sounds: ['r', 'oo', 'v', 'o', 't', 'e'],      cup: 'beker_zee' },
  { id: 'kasteel', name: 'Het Kasteel',   emoji: '🏰', sounds: ['b', 'a', 'd', 'l', 'ee', 'h'],      cup: 'beker_kasteel' },
  { id: 'sterren', name: 'De Sterrenberg', emoji: '🌙', sounds: ['oe', 'ui', 'ei', 'eu', 'z', 'w', 'g', 'f'], cup: 'beker_sterren' }
];

// Welke woorden kan ze lezen met deze klanken?
export function readable(known) {
  const set = new Set(known);
  return Object.keys(WORDS).filter(w => graphemes(w).every(g => set.has(g)));
}

// Levels: per klank één level, af en toe een woordenfeest, en een groot feest aan het eind van elke wereld.
export const LEVELS = (() => {
  const L = []; const known = [];
  WORLDS.forEach((W, wi) => {
    W.sounds.forEach((s, si) => {
      known.push(s);
      L.push({ type: 'klank', sound: s, world: wi, known: known.slice() });
      const words = readable(known);
      if (si % 2 === 1 && words.length >= 3) L.push({ type: 'woord', world: wi, known: known.slice() });
    });
    L.push({ type: 'feest', world: wi, known: known.slice() });
  });
  return L;
})();

// Beloningen: na elk level kiest ze een cadeautje
export const REWARDS = [
  { id: 'strik', emoji: '🎀',    name: 'een strik',          kind: 'acc' },
  { id: 'feestmuts', emoji: '🥳', name: 'een feestmuts',     kind: 'acc' },
  { id: 'bril', emoji: '👓',     name: 'een bril',           kind: 'acc' },
  { id: 'sjaal', emoji: '🧣',    name: 'een sjaal',          kind: 'acc' },
  { id: 'kleur_roze', emoji: '🩷', name: 'roze schubben',    kind: 'kleur' },
  { id: 'ballon', emoji: '🎈',   name: 'een ballon',         kind: 'acc' },
  { id: 'bloem', emoji: '🌼',    name: 'een bloem',          kind: 'acc' },
  { id: 'cape', emoji: '🦸',     name: 'een cape',           kind: 'acc' },
  { id: 'kleur_paars', emoji: '💜', name: 'paarse schubben', kind: 'kleur' },
  { id: 'koptelefoon', emoji: '🎧', name: 'een koptelefoon', kind: 'acc' },
  { id: 'toverstaf', emoji: '🪄', name: 'een toverstaf',     kind: 'acc' },
  { id: 'rugzak', emoji: '🎒',   name: 'een rugzakje',       kind: 'acc' },
  { id: 'kleur_blauw', emoji: '💙', name: 'blauwe schubben', kind: 'kleur' },
  { id: 'zonnebril', emoji: '🕶️', name: 'een zonnebril',     kind: 'acc' },
  { id: 'kleur_goud', emoji: '💛', name: 'gouden schubben',  kind: 'kleur' },
  { id: 'kroon', emoji: '👑',    name: 'een kroon',          kind: 'acc' }
];
// Welke accessoires niet tegelijk kunnen (zelfde plek)
export const SLOT = { strik: 'hoofd', feestmuts: 'hoofd', kroon: 'hoofd', koptelefoon: 'hoofd', bloem: 'oor',
  bril: 'ogen', zonnebril: 'ogen', sjaal: 'nek', cape: 'rug', rugzak: 'rug', ballon: 'hand', toverstaf: 'hand' };

export const PIP_COLORS = {
  groen: { '7ed9a4': '7ed9a4', '5cbf86': '5cbf86' },
  roze:  { '7ed9a4': 'ff9ccf', '5cbf86': 'f27bb5' },
  paars: { '7ed9a4': 'b49cff', '5cbf86': '9478f0' },
  blauw: { '7ed9a4': '7cc4ff', '5cbf86': '58a6f0' },
  goud:  { '7ed9a4': 'ffd45c', '5cbf86': 'f2b632' }
};

// ---- Alles wat Pip zegt (losse stukjes; klanken en woorden worden ertussen geplakt) ----
export const T = {
  hoi: 'Hallo! Ik ben Pip, een klein draakje.',
  honger: 'En weet je wat ik het allerliefst eet? Letters! Help jij mij?',
  tikSteen: 'Tik maar op de steen die glinstert. Dan spring ik erheen!',
  nieuweLetter: 'Kijk eens! Een nieuwe letter!',
  dit: 'Dit is de',
  van: 'van',
  zeg: 'Zeg jij het ook maar:',
  overtrek: 'Nu mag jij hem schrijven. Volg de stipjes met je vinger!',
  geef: 'Mag ik de',
  begin: 'Wat hoor je vooraan?',
  welkPlaatje: 'Welk plaatje is het?',
  pipZegt: 'Luister maar goed.',
  lees: 'Kun jij dit woord lezen? Tik op een letter als je hem wilt horen.',
  bouw: 'Kun jij dit woord maken? Tik de letters in de goede volgorde.',
  nee: 'Oei, dat is de',
  nogEens: 'Probeer het nog maar een keertje!',
  hulp: 'Kijk, deze is het!',
  dat: 'Nee hoor, dat is',
  klaar: 'Hoera! Het is je gelukt!',
  cadeau: 'Je mag een cadeautje uitkiezen!',
  kreeg: 'Kijk eens wat ik heb:',
  mooi: 'Wat mooi! Dankjewel!',
  beker: 'Wauw! Jij hebt de beker gewonnen!',
  feest: 'Feest! Laat maar zien wat je allemaal al kunt!',
  woordfeest: 'Woordjesfeest! Nu gaan we echt lezen!',
  moe: 'Mijn buikje zit helemaal vol met letters. Morgen spelen we verder!',
  morgen: 'Dan liggen er weer nieuwe stenen klaar.',
  welkom: 'Hoi! Wat leuk dat je er weer bent!',
  tikPip: 'Hihi, dat kietelt!',
  letters: 'Kijk, dit zijn al jouw letters!',
  kast: 'Wat zal ik eens aantrekken?',
  alles: 'Je hebt alles gewonnen! Jij bent echt een lezer!',
  eerst: 'Eerst de steen die glinstert!',
  test: 'Hallo! Ik ben Pip.'
};
export const PRAISE = ['Goed zo!', 'Super!', 'Knap hoor!', 'Wauw!', 'Jij kunt het!', 'Mmm, lekker!', 'Smullen!', 'Top gedaan!', 'Helemaal goed!'];

// ---- Van losse stukjes één zin maken ----
// Een stukje is: tekst, {k:'m'} (klank), {w:'kip'} (woord, q:true = vraag) of {p:300} (pauze).
export function partText(p) {
  if (typeof p === 'string') return p;
  if (p.k) return SOUNDS[p.k].say;
  if (p.w) return p.w + (p.q ? '?' : '');
  return '…';
}
export function mergeText(parts) {
  return parts.map(partText).join(' ').replace(/\s+([,.!?…:])/g, '$1').replace(/…\s*/g, '… ').replace(/\s+/g, ' ').trim();
}

// Alles wat Pip kan zeggen: losse stukjes én hele zinnen.
// GitHub Actions maakt hier vooraf mp3'tjes van met een natuurlijke Nederlandse stem.
export function allPhrases() {
  const set = new Set();
  const add = parts => set.add(mergeText(parts));
  Object.values(T).forEach(t => add([t])); PRAISE.forEach(t => add([t]));
  const items = [...new Set([...Object.keys(WORDS), ...Object.values(SOUNDS).map(d => d.key)])];
  for (const [s, d] of Object.entries(SOUNDS)) {
    add([{ k: s }]); add([{ w: d.key }]);
    add([T.geef, { k: s }, T.van, { w: d.key, q: true }]);
    add([T.dit, { k: s }, T.van, { w: d.key }]);
    add([T.nieuweLetter, T.dit, { k: s }, T.van, { w: d.key }, { p: 300 }, T.zeg, { k: s }]);
    add([T.nee, { k: s }, T.nogEens]);
    for (const it of items) if (graphemes(it)[0] === s) add([{ k: s }, T.van, { w: it }]);
  }
  for (const w of items) { add([{ w }]); add([T.dat, { w }, T.nogEens]); add([{ w }, { p: 350 }, T.begin]); add([T.bouw, { p: 200 }, { w }]); }
  for (const r of REWARDS) add([T.kreeg, r.name + '!', T.mooi]);
  for (const W of WORLDS) add([W.name]);
  return [...set];
}
