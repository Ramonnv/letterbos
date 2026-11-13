// Pip & het Letterbos – 3D-recepten.
// Eén bron voor alle modellen: Blender bouwt hier .glb-modellen en renders van (GitHub Actions),
// en de game kan dezelfde recepten als reserve zelf opbouwen.
// Assen zoals three.js: Y = omhoog, +Z = voorkant. Eenheden in meters.
// Gebruik:  node tools/recipes.mjs > web/assets/models.json

const C = {
  pip: "#7ed9a4", pipD: "#5cbf86", buik: "#fff1c9", koraal: "#ff8a7a", vleugel: "#ffb3d9", vleugelL: "#ffd9ec",
  oog: "#1d1630", wit: "#ffffff", roze: "#ff9fb4", mond: "#c2405a", tong: "#ff7a9a", hoorn: "#fff3dc",
  groen: "#5fbf5a", groenD: "#3f9a45", geel: "#ffd45c", oranje: "#f08a32", creme: "#fff3dc", rood: "#ff5d5d",
  blauw: "#4b8cff", paars: "#8a63ff", goud: "#ffc93c", zwart: "#24202e", hout: "#a8743f", houtD: "#7c5129",
  blad: "#57c46b", bladD: "#3aa257", steen: "#b8b4c8", zand: "#f3dca2", kristal: "#7df9ff", lila: "#c9b5ff"
};

const P = (type, part, pos, scale, color, x = {}) => ({ type, part, pos, scale, color, ...x });
const sph = (...a) => P("sphere", ...a);
const box = (...a) => P("box", ...a);
const cyl = (...a) => P("cyl", ...a);
const cone = (...a) => P("cone", ...a);
const tor = (...a) => P("torus", ...a);
const ico = (...a) => P("ico", ...a);
const star = (...a) => P("star", ...a);
const mirror = (prims) => prims.flatMap(p => {
  const m = { ...p, pos: [-p.pos[0], p.pos[1], p.pos[2]] };
  if (p.rot) m.rot = [p.rot[0], -p.rot[1], -p.rot[2]];
  if (p.part.endsWith("L")) m.part = p.part.slice(0, -1) + "R";
  return [p, m];
});
const rad = a => a * Math.PI / 180;

const models = {};

/* ===================== PIP, het letterdraakje ===================== */
models.pip = {
  kind: "character",
  parts: {
    body: { pivot: [0, 0.3, 0] },
    head: { pivot: [0, 0.74, 0], parent: "body" },
    jaw: { pivot: [0, 0.84, 0.1], parent: "head" },
    eyeL: { pivot: [0.15, 1.04, 0.3], parent: "head" },
    eyeR: { pivot: [-0.15, 1.04, 0.3], parent: "head" },
    armL: { pivot: [0.26, 0.6, 0.06], parent: "body" },
    armR: { pivot: [-0.26, 0.6, 0.06], parent: "body" },
    legL: { pivot: [0.16, 0.26, 0] },
    legR: { pivot: [-0.16, 0.26, 0] },
    wingL: { pivot: [0.14, 0.7, -0.22], parent: "body" },
    wingR: { pivot: [-0.14, 0.7, -0.22], parent: "body" },
    tail: { pivot: [0, 0.32, -0.26], parent: "body" },
    // accessoires (beloningen)
    acc_strik: { pivot: [0.2, 1.3, 0.05], parent: "head" },
    acc_feestmuts: { pivot: [0, 1.35, 0], parent: "head" },
    acc_kroon: { pivot: [0, 1.35, 0], parent: "head" },
    acc_koptelefoon: { pivot: [0, 1.0, 0], parent: "head" },
    acc_bloem: { pivot: [-0.3, 1.2, 0.1], parent: "head" },
    acc_bril: { pivot: [0, 1.04, 0.38], parent: "head" },
    acc_zonnebril: { pivot: [0, 1.04, 0.38], parent: "head" },
    acc_sjaal: { pivot: [0, 0.74, 0], parent: "body" },
    acc_cape: { pivot: [0, 0.72, -0.3], parent: "body" },
    acc_rugzak: { pivot: [0, 0.5, -0.3], parent: "body" },
    acc_ballon: { pivot: [-0.32, 0.45, 0.1], parent: "armR" },
    acc_toverstaf: { pivot: [0.32, 0.42, 0.14], parent: "armL" }
  },
  prims: [
    // lijf en buik
    sph("body", [0, 0.46, 0], [0.34, 0.36, 0.31], C.pip, { mat: "skin" }),
    sph("body", [0, 0.43, 0.15], [0.24, 0.27, 0.18], C.buik, { mat: "skin" }),
    ...[0, 1, 2].map(i => box("body", [0, 0.56 - i * 0.1, 0.32 - i * 0.005], [0.2 - i * 0.03, 0.012, 0.02], "#f3dfa8", { round: 0.005 })),
    ...[0, 1, 2].map(i => cone("body", [0, 0.72 - i * 0.16, -0.27 - i * 0.03], [0.06, 0.12, 0.05], C.koraal, { rot: [-40 - i * 15, 0, 0], mat: "shiny" })),
    // hoofd
    sph("head", [0, 0.98, 0.02], [0.42, 0.36, 0.37], C.pip, { mat: "skin" }),
    sph("head", [0, 0.9, 0.27], [0.25, 0.14, 0.18], C.pip, { mat: "skin" }),
    sph("head", [0, 0.83, 0.28], [0.17, 0.065, 0.12], C.mond, { mat: "shiny" }),
    ...mirror([
      sph("head", [0.07, 0.95, 0.44], [0.025, 0.018, 0.012], C.pipD),
      sph("head", [0.27, 0.88, 0.24], [0.07, 0.045, 0.03], C.roze),
      cone("head", [0.16, 1.32, -0.05], [0.06, 0.17, 0.06], C.hoorn, { rot: [-15, 0, -18], mat: "shiny" }),
      cone("head", [0.06, 0.82, 0.39], [0.022, 0.04, 0.018], C.wit, { rot: [180, 0, 0], mat: "shiny" })
    ]),
    ...[0, 1, 2].map(i => cone("head", [0, 1.3 - i * 0.13, -0.2 - i * 0.1], [0.055, 0.12, 0.045], C.koraal, { rot: [-30 - i * 25, 0, 0], mat: "shiny" })),
    // onderkaak (kan open voor het eten van letters)
    sph("jaw", [0, 0.79, 0.25], [0.2, 0.075, 0.15], C.pip, { mat: "skin" }),
    sph("jaw", [0, 0.82, 0.3], [0.09, 0.03, 0.07], C.tong, { mat: "shiny" }),
    // grote glimmende oogjes
    ...mirror([
      sph("eyeL", [0.15, 1.04, 0.3], [0.09, 0.11, 0.06], C.oog, { mat: "eye" }),
      sph("eyeL", [0.125, 1.085, 0.35], [0.032, 0.032, 0.015], C.wit, { mat: "emit" }),
      sph("eyeL", [0.17, 1.0, 0.355], [0.015, 0.015, 0.008], C.wit, { mat: "emit" })
    ]),
    ...mirror([box("head", [0.16, 1.18, 0.31], [0.1, 0.018, 0.02], C.pipD, { rot: [0, 0, -12], round: 0.008 })]),
    // armpjes en pootjes
    sph("armL", [0.31, 0.5, 0.1], [0.08, 0.13, 0.08], C.pip, { mat: "skin", rot: [0, 0, 20] }),
    sph("armR", [-0.31, 0.5, 0.1], [0.08, 0.13, 0.08], C.pip, { mat: "skin", rot: [0, 0, -20] }),
    sph("legL", [0.16, 0.15, 0.03], [0.12, 0.15, 0.13], C.pip, { mat: "skin" }),
    sph("legR", [-0.16, 0.15, 0.03], [0.12, 0.15, 0.13], C.pip, { mat: "skin" }),
    sph("legL", [0.16, 0.05, 0.12], [0.09, 0.05, 0.07], C.buik, { mat: "skin" }),
    sph("legR", [-0.16, 0.05, 0.12], [0.09, 0.05, 0.07], C.buik, { mat: "skin" }),
    // vleugeltjes
    sph("wingL", [0.32, 0.8, -0.3], [0.22, 0.15, 0.025], C.vleugel, { rot: [0, -30, 25], mat: "skin" }),
    sph("wingL", [0.27, 0.74, -0.27], [0.13, 0.09, 0.03], C.vleugelL, { rot: [0, -30, 25], mat: "skin" }),
    sph("wingR", [-0.32, 0.8, -0.3], [0.22, 0.15, 0.025], C.vleugel, { rot: [0, 30, -25], mat: "skin" }),
    sph("wingR", [-0.27, 0.74, -0.27], [0.13, 0.09, 0.03], C.vleugelL, { rot: [0, 30, -25], mat: "skin" }),
    // staart met hartjespunt
    sph("tail", [0, 0.27, -0.42], [0.13, 0.1, 0.2], C.pip, { mat: "skin", rot: [15, 0, 0] }),
    sph("tail", [0, 0.22, -0.62], [0.08, 0.07, 0.14], C.pip, { mat: "skin", rot: [25, 0, 0] }),
    ...mirror([sph("tail", [0.04, 0.27, -0.78], [0.06, 0.06, 0.03], C.koraal, { mat: "shiny", rot: [0, 0, 30] })]),
    cone("tail", [0, 0.22, -0.78], [0.07, 0.08, 0.03], C.koraal, { mat: "shiny", rot: [180, 0, 0] }),

    // ===== accessoires =====
    sph("acc_strik", [0.11, 1.32, 0.06], [0.1, 0.065, 0.04], "#ff6fb5", { rot: [0, 0, 20], mat: "cloth" }),
    sph("acc_strik", [0.29, 1.28, 0.06], [0.1, 0.065, 0.04], "#ff6fb5", { rot: [0, 0, -30], mat: "cloth" }),
    sph("acc_strik", [0.2, 1.3, 0.08], [0.04, 0.04, 0.04], "#ff3d96", { mat: "shiny" }),

    cone("acc_feestmuts", [0.04, 1.52, 0.02], [0.15, 0.34, 0.15], "#7b6bff", { rot: [0, 0, -10], mat: "shiny" }),
    tor("acc_feestmuts", [0.02, 1.4, 0.02], [1, 1, 1], C.geel, { args: [0.13, 0.025], rot: [0, 0, -10] }),
    tor("acc_feestmuts", [0.04, 1.52, 0.02], [1, 1, 1], "#ff6fb5", { args: [0.085, 0.02], rot: [0, 0, -10] }),
    sph("acc_feestmuts", [0.07, 1.7, 0.02], [0.06, 0.06, 0.06], C.geel, { mat: "cloth" }),

    cyl("acc_kroon", [0, 1.38, 0.02], [0.19, 0.09, 0.19], C.goud, { mat: "metal", open: true }),
    ...[0, 72, 144, 216, 288].map(a => cone("acc_kroon", [0.18 * Math.sin(rad(a)), 1.48, 0.02 + 0.18 * Math.cos(rad(a))], [0.045, 0.1, 0.045], C.goud, { mat: "metal" })),
    sph("acc_kroon", [0, 1.38, 0.21], [0.035, 0.035, 0.035], C.rood, { mat: "emit" }),

    tor("acc_koptelefoon", [0, 1.04, 0], [1, 1, 1], C.paars, { args: [0.42, 0.03], rot: [90, 0, 0], mat: "shiny" }),
    ...mirror([cyl("acc_koptelefoon", [0.42, 0.98, 0.02], [0.11, 0.08, 0.11], "#ff6fb5", { rot: [0, 0, 90], mat: "shiny" })]),

    ...[0, 72, 144, 216, 288].map(a => sph("acc_bloem", [-0.32, 1.2 + 0.06 * Math.cos(rad(a)), 0.1 + 0.06 * Math.sin(rad(a))], [0.025, 0.05, 0.05], C.wit, { mat: "cloth" })),
    sph("acc_bloem", [-0.335, 1.2, 0.1], [0.03, 0.04, 0.04], C.geel, { mat: "shiny" }),

    ...mirror([tor("acc_bril", [0.15, 1.04, 0.37], [1, 1, 1], "#e0457b", { args: [0.1, 0.018], rot: [90, 0, 0], mat: "shiny" })]),
    box("acc_bril", [0, 1.06, 0.4], [0.08, 0.02, 0.02], "#e0457b"),

    ...mirror([box("acc_zonnebril", [0.15, 1.04, 0.38], [0.18, 0.12, 0.03], "#2a2a55", { round: 0.03, mat: "glass" })]),
    box("acc_zonnebril", [0, 1.08, 0.4], [0.5, 0.025, 0.025], C.zwart),

    tor("acc_sjaal", [0, 0.74, 0.01], [1, 1, 1], "#ff6f61", { args: [0.25, 0.06], mat: "cloth" }),
    box("acc_sjaal", [0.12, 0.6, 0.26], [0.1, 0.24, 0.04], "#ff6f61", { rot: [10, 0, -10], mat: "cloth", round: 0.02 }),

    box("acc_cape", [0, 0.48, -0.36], [0.5, 0.5, 0.03], "#7b6bff", { rot: [12, 0, 0], mat: "cloth", round: 0.02 }),
    star("acc_cape", [0, 0.5, -0.4], [0.1, 0.1, 0.1], C.goud, { mat: "metal", rot: [12, 180, 0] }),

    box("acc_rugzak", [0, 0.5, -0.36], [0.3, 0.32, 0.16], "#ffb03b", { mat: "cloth", round: 0.06 }),
    box("acc_rugzak", [0, 0.42, -0.45], [0.2, 0.12, 0.05], "#ff8f1f", { mat: "cloth", round: 0.03 }),

    cyl("acc_ballon", [-0.36, 0.95, 0.1], [0.006, 1.0, 0.006], C.wit, { rot: [0, 0, 4] }),
    sph("acc_ballon", [-0.4, 1.68, 0.1], [0.22, 0.26, 0.22], "#ff6fb5", { mat: "shiny" }),
    cone("acc_ballon", [-0.4, 1.41, 0.1], [0.04, 0.05, 0.04], "#ff6fb5", { rot: [180, 0, 0] }),

    cyl("acc_toverstaf", [0.36, 0.55, 0.16], [0.015, 0.36, 0.015], C.zwart, { rot: [0, 0, -15] }),
    star("acc_toverstaf", [0.41, 0.74, 0.16], [0.08, 0.08, 0.08], C.geel, { mat: "emit" })
  ]
};

/* ===================== OMGEVING ===================== */
const prop = (prims, extra = {}) => ({ kind: "prop", ...extra, parts: { root: { pivot: [0, 0, 0] }, ...(extra.parts || {}) }, prims });

models.tree = prop([
  cyl("root", [0, 0.9, 0], [0.22, 1.8, 0.22], C.hout, { top: 0.75, mat: "wood" }),
  sph("root", [0, 2.5, 0], [1.25, 1.05, 1.2], C.blad, { mat: "leaf" }),
  sph("root", [0.55, 2.15, 0.35], [0.8, 0.7, 0.8], C.bladD, { mat: "leaf" }),
  sph("root", [-0.55, 2.25, -0.25], [0.8, 0.72, 0.8], C.bladD, { mat: "leaf" }),
  ...[[0.7, 2.3, 0.85], [-0.8, 2.6, 0.6], [0.2, 2.0, 1.05], [-0.2, 3.1, 0.7], [0.95, 2.8, -0.3]].map(p => sph("root", p, [0.13, 0.13, 0.13], C.rood, { mat: "shiny" }))
]);
models.pine = prop([
  cyl("root", [0, 0.6, 0], [0.18, 1.2, 0.18], C.houtD, { mat: "wood" }),
  cone("root", [0, 1.6, 0], [1.1, 1.4, 1.1], "#3f9a6a", { mat: "leaf", seg: 9 }),
  cone("root", [0, 2.4, 0], [0.85, 1.2, 0.85], "#4cb07a", { mat: "leaf", seg: 9 }),
  cone("root", [0, 3.1, 0], [0.55, 1.0, 0.55], "#5ec58a", { mat: "leaf", seg: 9 })
]);
models.bush = prop([
  sph("root", [0, 0.35, 0], [0.55, 0.45, 0.5], C.bladD, { mat: "leaf" }),
  sph("root", [0.4, 0.3, 0.1], [0.38, 0.32, 0.36], C.blad, { mat: "leaf" }),
  sph("root", [-0.35, 0.28, 0.12], [0.35, 0.3, 0.34], C.blad, { mat: "leaf" }),
  ...[[0.2, 0.62, 0.3], [-0.3, 0.5, 0.35], [0.5, 0.45, 0.3]].map(p => sph("root", p, [0.07, 0.07, 0.07], "#ffb3d9", { mat: "shiny" }))
]);
models.rock = prop([
  ico("root", [0, 0.3, 0], [0.75, 0.5, 0.65], C.steen, { mat: "stone" }),
  ico("root", [0.5, 0.18, 0.3], [0.35, 0.26, 0.3], "#a19db4", { mat: "stone" })
]);
models.flower = prop([
  cyl("root", [0, 0.15, 0], [0.015, 0.3, 0.015], C.groenD),
  ...[0, 72, 144, 216, 288].map(a => sph("root", [0.07 * Math.sin(rad(a)), 0.32, 0.07 * Math.cos(rad(a))], [0.06, 0.03, 0.06], "#ff7eb6")),
  sph("root", [0, 0.33, 0], [0.04, 0.03, 0.04], C.geel, { mat: "shiny" })
]);
models.mushroom = prop([
  cyl("root", [0, 0.15, 0], [0.08, 0.3, 0.08], C.creme),
  sph("root", [0, 0.32, 0], [0.22, 0.14, 0.22], C.rood, { mat: "shiny" }),
  ...[[0.1, 0.4, 0.08], [-0.08, 0.42, -0.06], [0.0, 0.44, 0.13]].map(p => sph("root", p, [0.03, 0.02, 0.03], C.wit))
]);
// Springsteen: een dikke paddenstoel-steen waar een letter boven zweeft
models.steen = prop([
  cyl("root", [0, 0.18, 0], [0.75, 0.36, 0.75], "#d9cfe9", { top: 0.92, seg: 24, mat: "stone" }),
  cyl("root", [0, 0.38, 0], [0.72, 0.06, 0.72], "#f6f0ff", { seg: 24, mat: "shiny" }),
  ...[0, 60, 120, 180, 240, 300].map(a => sph("root", [0.74 * Math.sin(rad(a)), 0.08, 0.74 * Math.cos(rad(a))], [0.16, 0.1, 0.16], C.blad, { mat: "leaf" }))
]);
models.palm = prop([
  ...[0, 1, 2, 3, 4, 5].map(i => cyl("root", [i * 0.06, 0.25 + i * 0.45, 0], [0.16 - i * 0.012, 0.48, 0.16 - i * 0.012], i % 2 ? "#b8865a" : "#a0724a", { mat: "wood" })),
  ...[0, 72, 144, 216, 288].map(a => sph("root", [0.3 + 0.75 * Math.sin(rad(a)), 2.75, 0.75 * Math.cos(rad(a))], [0.8, 0.07, 0.25], "#4cc06b", { rot: [0, a + 90, -18], mat: "leaf" })),
  ...[[0.2, 2.6, 0.12], [0.38, 2.6, -0.1], [0.25, 2.55, -0.15]].map(p => sph("root", p, [0.11, 0.11, 0.11], "#8a5a2b", { mat: "wood" }))
]);
models.schelp = prop([
  cone("root", [0, 0.08, 0], [0.22, 0.16, 0.12], "#ffc2d1", { rot: [90, 0, 0], seg: 9, mat: "shiny" }),
  sph("root", [0, 0.04, -0.09], [0.06, 0.04, 0.05], "#ffa8bf", { mat: "shiny" })
]);
models.toren = prop([
  cyl("root", [0, 1.5, 0], [0.9, 3.0, 0.9], "#e6e0f2", { seg: 14, mat: "wall" }),
  ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => box("root", [0.88 * Math.sin(rad(a)), 3.12, 0.88 * Math.cos(rad(a))], [0.3, 0.3, 0.3], "#e6e0f2", { rot: [0, a, 0], mat: "wall" })),
  cone("root", [0, 4.0, 0], [1.0, 1.5, 1.0], "#ff8fc7", { seg: 14, mat: "roof" }),
  cyl("root", [0, 4.95, 0], [0.02, 0.6, 0.02], C.zwart),
  box("root", [0.18, 5.12, 0], [0.32, 0.2, 0.02], C.geel, { mat: "cloth" }),
  box("root", [0, 0.6, 0.86], [0.6, 1.1, 0.1], C.houtD, { round: 0.05, mat: "wood" }),
  ...[[0, 2.1, 0.88], [0.6, 1.6, 0.66]].map(p => box("root", p, [0.3, 0.45, 0.06], "#ffe9a8", { mat: "emit", rot: [0, p[0] * 60, 0] }))
]);
models.crystal = prop([
  ico("root", [0, 0.5, 0], [0.22, 0.6, 0.22], C.kristal, { mat: "emit" }),
  ico("root", [0.25, 0.3, 0.1], [0.13, 0.35, 0.13], "#b98cff", { mat: "emit", rot: [0, 0, -25] }),
  ico("root", [-0.22, 0.25, -0.05], [0.12, 0.3, 0.12], C.kristal, { mat: "emit", rot: [0, 0, 25] })
]);
models.star = prop([
  star("root", [0, 0, 0], [0.45, 0.45, 0.45], C.goud, { mat: "glow" })
]);
models.wolk = prop([
  sph("root", [0, 0, 0], [1.2, 0.7, 0.9], C.wit, { mat: "cloth" }),
  sph("root", [0.9, -0.15, 0.1], [0.8, 0.5, 0.7], C.wit, { mat: "cloth" }),
  sph("root", [-0.9, -0.1, 0], [0.85, 0.55, 0.7], C.wit, { mat: "cloth" }),
  sph("root", [0.3, 0.4, 0], [0.7, 0.55, 0.6], C.wit, { mat: "cloth" })
]);
// Cadeautje met deksel dat open kan
models.cadeau = prop([
  box("root", [0, 0.3, 0], [0.62, 0.6, 0.62], "#ff6fb5", { round: 0.03, mat: "shiny" }),
  box("root", [0, 0.3, 0], [0.64, 0.6, 0.14], C.geel, { mat: "cloth" }),
  box("root", [0, 0.3, 0], [0.14, 0.6, 0.64], C.geel, { mat: "cloth" }),
  box("lid", [0, 0.66, 0], [0.7, 0.14, 0.7], "#ff4fa0", { round: 0.03, mat: "shiny" }),
  box("lid", [0, 0.66, 0], [0.72, 0.15, 0.15], C.geel, { mat: "cloth" }),
  box("lid", [0, 0.66, 0], [0.15, 0.15, 0.72], C.geel, { mat: "cloth" }),
  ...mirror([sph("lid", [0.12, 0.8, 0], [0.13, 0.08, 0.06], C.geel, { rot: [0, 0, 25], mat: "cloth" })])
], { parts: { lid: { pivot: [0, 0.6, -0.35], parent: "root" } } });

// Bekers: één per wereld, met een eigen kleur steen
const beker = (gem) => prop([
  cyl("root", [0, 0.06, 0], [0.32, 0.12, 0.32], "#6b4a2a", { mat: "wood" }),
  cyl("root", [0, 0.16, 0], [0.24, 0.08, 0.24], C.goud, { mat: "metal" }),
  cyl("root", [0, 0.32, 0], [0.06, 0.26, 0.06], C.goud, { mat: "metal" }),
  sph("root", [0, 0.48, 0], [0.12, 0.06, 0.12], C.goud, { mat: "metal" }),
  cyl("root", [0, 0.74, 0], [0.22, 0.5, 0.22], C.goud, { top: 1.6, mat: "metal" }),
  ...mirror([tor("root", [0.36, 0.76, 0], [1, 1, 1], C.goud, { args: [0.12, 0.03], rot: [90, 0, 0], mat: "metal" })]),
  star("root", [0, 0.72, 0.3], [0.12, 0.12, 0.12], gem, { mat: "emit" })
]);
models.beker_bos = beker("#5fe07a");
models.beker_zee = beker("#4fc3ff");
models.beker_kasteel = beker("#ff6fb5");
models.beker_sterren = beker("#b98cff");

// Wat Blender rendert: portretten, icoontjes van de cadeaus en de bekers
const renders = {
  pip: { target: [0, 0.78, 0], dist: 2.6 },
  icons: true,
  beker_bos: { target: [0, 0.5, 0], dist: 2.1 },
  beker_zee: { target: [0, 0.5, 0], dist: 2.1 },
  beker_kasteel: { target: [0, 0.5, 0], dist: 2.1 },
  beker_sterren: { target: [0, 0.5, 0], dist: 2.1 },
  cadeau: { target: [0, 0.4, 0], dist: 2.2 }
};

process.stdout.write(JSON.stringify({ version: 1, models, renders }, null, 0));
