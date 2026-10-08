// Il racconto principale (#approach): un solo sistema che si divide, si trasforma, si assembla, converge e si
// collega. Otto stati chiave, gli stessi oggetti dall'inizio alla fine:
//
//   0 problema       un blocco compatto e aggrovigliato di moduli
//   1 divisione      il blocco si separa in due sistemi: TRASFORMARE (processi esistenti) e COSTRUIRE (nuovi)
//   2 processo oggi  persona → email → excel → approvazione → ERP, con passaggi ridondanti
//   3 trasformato    email → AI → approvazione → ERP: il lavoro manuale si comprime, la persona approva
//   4 moduli         dati, intelligenza, logica, interfaccia, integrazioni compaiono sparsi nello spazio
//   5 prodotto       si impilano in un'architettura; lo strato in cima diventa un'interfaccia vera
//   6 produzione     i due sistemi convergono in uno stack a tre strati (il simbolo Deploiable), nel contesto
//                    reale: dati, utenti, permessi, valutazioni, monitoraggio
//   7 integrazione   lo stack si collega ai sistemi dell'azienda e alle interfacce da cui si usa
//
// Due composizioni: "wide" (desktop: i due sistemi affiancati) e "tall" (telefono: uno sopra l'altro).
import { INK, type LinkProps, type LinkSpec, type ObjSpec, type Props, type SceneSpec, type V3 } from './engine';
import type { CamKey } from './camera';
import { appSkeleton, liveDot, person, productUI } from './faces';

type L = { it: string; en: string };
const l = (it: string, en = it): L => ({ it, en });

const LB = {
  problem: l('PROBLEMA DI BUSINESS', 'BUSINESS PROBLEM'),
  transform: l('TRASFORMARE', 'TRANSFORM'),
  build: l('COSTRUIRE', 'BUILD'),
  human: l('PERSONA', 'HUMAN'),
  email: l('EMAIL'),
  excel: l('EXCEL'),
  approval: l('APPROVAZIONE', 'APPROVAL'),
  erp: l('ERP'),
  ai: l('AI'),
  data: l('DATI', 'DATA'),
  intel: l('INTELLIGENZA', 'INTELLIGENCE'),
  logic: l('LOGICA', 'LOGIC'),
  iface: l('INTERFACCIA', 'INTERFACE'),
  integr: l('INTEGRAZIONI', 'INTEGRATIONS'),
  pMid: l('SISTEMA AI', 'AI SYSTEM'),
  pBot: l('DATI E INTEGRAZIONI', 'DATA & INTEGRATIONS'),
  tData: l('DATI REALI', 'REAL DATA'),
  tUsers: l('UTENTI REALI', 'REAL USERS'),
  tPerms: l('PERMESSI', 'PERMISSIONS'),
  tEvals: l('VALUTAZIONI', 'EVALUATIONS'),
  tMon: l('MONITORAGGIO', 'MONITORING'),
  sErp: l('ERP'),
  sCrm: l('CRM'),
  sEmail: l('EMAIL'),
  sDocs: l('DOCUMENTI', 'DOCUMENTS'),
  sData: l('DATI', 'DATA'),
  sPpt: l('POWERPOINT'),
  sTeams: l('TEAMS'),
  oSoft: l('SOFTWARE ESISTENTI', 'EXISTING SOFTWARE'),
  oAi: l('SISTEMA AI', 'AI SYSTEM'),
  oApp: l('WEB APP SU MISURA', 'CUSTOM WEB APP'),
};

/** inclinazione delle facce: lati quasi verticali a schermo, come le barre del simbolo */
const SH = -0.14;

export function journey(tall: boolean) {
  const W = !tall;
  const objects: ObjSpec[] = [];
  const links: LinkSpec[] = [];
  const add = (o: ObjSpec) => objects.push({ shear: SH, fs: 10, ...o });
  const link = (s: LinkSpec) => links.push(s);

  // ------- oggetti -------
  add({ id: 'problem', kind: 'text', label: LB.problem, fs: 11 });
  add({ id: 'lTransform', kind: 'text', label: LB.transform, fs: 13, ink: 'lime' });
  add({ id: 'lBuild', kind: 'text', label: LB.build, fs: 13, ink: 'lime' });
  // il sistema da trasformare
  add({ id: 'human', label: LB.human });
  add({ id: 'email', label: LB.email });
  add({ id: 'excel', label: LB.excel });
  add({ id: 'approval', label: LB.approval, face: person(-46) });
  add({ id: 'erp', label: LB.erp });
  add({ id: 'ai', label: LB.ai, fs: 12 });
  // il prodotto da costruire
  const left = { anchor: 'start' as const };
  add({ id: 'integr', label: LB.integr, ...left });
  add({ id: 'data', label: LB.data, ...left });
  add({ id: 'intel', label: LB.intel, ...left });
  add({ id: 'logic', label: LB.logic, ...left });
  add({ id: 'iface', label: LB.iface, ...left, face: productUI(), r: 9 });
  // lo stack in produzione
  add({ id: 'pBot', label: LB.pBot, ...left, r: 9 });
  add({ id: 'pMid', label: LB.pMid, ...left, r: 9 });
  // contesto reale
  for (const k of ['tData', 'tUsers', 'tPerms', 'tEvals', 'tMon'] as const) add({ id: k, label: LB[k], fs: 8.5, r: 15 });
  // sistemi dell'azienda e interfacce d'uscita
  for (const k of ['sErp', 'sCrm', 'sEmail', 'sDocs', 'sData', 'sPpt', 'sTeams'] as const) add({ id: k, label: LB[k], fs: 10.5 });
  // le uscite: dove si usa la soluzione (il software che già c'è, il sistema AI, un'applicazione dedicata)
  add({ id: 'oSoft', label: LB.oSoft, fs: 9.5, face: appSkeleton(170, 100, false, 36), anchor: 'start' });
  add({ id: 'oAi', label: LB.oAi, fs: 9.5, face: liveDot(-72, INK.forest, -31), anchor: 'start' });
  add({ id: 'oApp', label: LB.oApp, fs: 9.5, face: appSkeleton(170, 100, true, 36), anchor: 'start' });

  // ------- collegamenti -------
  // il bivio: dal problema, due strade
  const O: V3 = W ? [0, 0, 215] : [-175, 0, 0];
  link({ id: 'forkT', from: O, to: W ? [-255, 0, 150] : [-175 + 60, 0, -150], via: 'z' });
  link({ id: 'forkB', from: O, to: W ? [255, 0, 150] : [-175 + 60, 0, 150], via: 'z' });
  // il groviglio di oggi (tratteggiato: lavoro manuale)
  link({ id: 'm1', from: 'human', to: 'email', fa: 'c', ta: 'c', via: 'x' });
  link({ id: 'm2', from: 'email', to: 'excel', via: 'z' });
  link({ id: 'm3', from: 'excel', to: 'email', bend: W ? 46 : -46 });
  link({ id: 'm4', from: 'excel', to: 'human', via: 'x' });
  link({ id: 'm5', from: 'human', to: 'approval', bend: W ? 40 : 30 });
  link({ id: 'm6', from: 'approval', to: 'excel', via: 'z' });
  link({ id: 'm7', from: 'excel', to: 'erp', via: 'x' });
  link({ id: 'm8', from: 'approval', to: 'email', via: 'x' });
  // il processo nuovo (Lime: il percorso attivo)
  const chainA = W ? ['r', 'l'] : ['f', 'b'];
  link({ id: 'c1', from: 'email', to: 'ai', fa: chainA[0] as 'r', ta: chainA[1] as 'l' });
  link({ id: 'c2', from: 'ai', to: 'approval', fa: chainA[0] as 'r', ta: chainA[1] as 'l' });
  link({ id: 'c3', from: 'approval', to: 'erp', fa: chainA[0] as 'r', ta: chainA[1] as 'l' });
  // il contesto reale attorno allo stack
  for (const k of ['tData', 'tUsers', 'tPerms', 'tEvals', 'tMon']) link({ id: `x${k}`, from: k, to: 'pBot', fa: 'c', ta: 'ground', via: W ? 'x' : 'z' });
  // integrazione: i sistemi verso lo strato dati, lo strato interfaccia verso le uscite
  for (const k of ['sErp', 'sCrm', 'sEmail', 'sDocs', 'sData', 'sPpt', 'sTeams']) link({ id: `i${k}`, from: k, to: 'pBot', fa: 'f', ta: 'ground', via: 'x' });
  for (const k of ['oSoft', 'oAi', 'oApp']) link({ id: `o${k}`, from: 'pBot', to: k, fa: 'f', ta: 'b', via: 'x' });

  // ------- stati chiave -------
  const T = W ? -255 : 0; // centro del sistema da trasformare (x)
  const TZ = W ? 0 : -250; // (z)
  const B = W ? 255 : 0;
  const BZ = W ? 0 : 250;
  const tile = { w: 148, d: 50, h: 10 } satisfies Partial<Props>;
  const small = { s: 0.62, lo: 0 } satisfies Partial<Props>;
  const lMod = { lx: -0.8 } satisfies Partial<Props>; // etichette dei moduli: a sinistra, come in un'interfaccia
  const frames: SceneSpec['frames'] = [];
  const F = (obj: Record<string, Partial<Props>>, link: Record<string, Partial<LinkProps>> = {}) => frames.push({ obj, link });
  const hiddenAt = (p: Partial<Props>) => ({ ...p, o: 0, lo: 0 });

  // 0 · problema: un blocco compatto, aggrovigliato
  const P0: Record<string, Partial<Props>> = {
    problem: { x: 0, y: 0, z: W ? 150 : 140, lo: 1, w: 0, d: 0 },
    human: { ...tile, ...small, x: -92, y: 0, z: -40 },
    email: { ...tile, ...small, x: -18, y: 22, z: -72 },
    excel: { ...tile, ...small, x: -58, y: 44, z: 8 },
    approval: { ...tile, ...small, x: 40, y: 0, z: 34 },
    erp: { ...tile, ...small, x: -104, y: 22, z: 62 },
    data: { ...tile, ...small, ...lMod, x: 92, y: 22, z: -36 },
    intel: { ...tile, ...small, ...lMod, x: 22, y: 66, z: -22 },
    logic: { ...tile, ...small, ...lMod, x: 104, y: 44, z: 40 },
    iface: { ...tile, ...small, ...lMod, x: 30, y: 88, z: 26 },
    integr: { ...tile, ...small, ...lMod, x: -8, y: 0, z: 82 },
  };
  F(P0, {
    m1: { o: 0.8 },
    m2: { o: 0.8 },
    m3: { o: 0.8 },
    m4: { o: 0.8 },
    m5: { o: 0.8 },
    m6: { o: 0.8 },
    m7: { o: 0.8 },
    m8: { o: 0.8 },
  });

  // 1 · divisione: due sistemi dalla stessa struttura. A sinistra un processo esistente (moduli pieni, a terra),
  // a destra qualcosa che ancora non c'è (moduli solo disegnati, sospesi)
  const g1 = (dx: number, dz: number) => (W ? { x: T + dx, z: TZ + dz } : { x: T + dz * 1.15, z: TZ + dx * 0.55 });
  const b1 = (dx: number, dz: number, y: number) => (W ? { x: B + dx, y, z: BZ + dz } : { x: B + dz * 1.15, y, z: BZ + dx * 0.55 });
  F(
    {
      lTransform: { ...(W ? { x: T, z: 175 } : { x: 85, z: -150 }), w: 0, d: 0, lo: 1, delay: 0.3 },
      lBuild: { ...(W ? { x: B, z: 175 } : { x: 85, z: 150 }), w: 0, d: 0, lo: 1, delay: 0.4 },
      human: { ...tile, s: 0.86, ...g1(-80, -50), lo: 1 },
      email: { ...tile, s: 0.86, ...g1(70, -62), lo: 1 },
      excel: { ...tile, s: 0.86, ...g1(-60, 30), lo: 1 },
      approval: { ...tile, s: 0.86, ...g1(85, 40), lo: 1 },
      erp: { ...tile, s: 0.86, ...g1(0, 110), lo: 1 },
      data: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(-70, 70, 10) },
      integr: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(-90, -40, 40) },
      intel: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(70, 20, 60), delay: 0.1 },
      logic: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(-10, -80, 100), delay: 0.15 },
      iface: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(60, -30, 140), delay: 0.2 },
    },
    {
      forkT: { active: 1, draw: 1, pulse: 0.8 },
      forkB: { active: 1, draw: 1, pulse: 0.8, delay: 0.1 },
      m1: { o: 0.7 },
      m2: { o: 0.7 },
      m3: { o: 0.7 },
      m4: { o: 0.7 },
      m5: { o: 0.7 },
      m6: { o: 0.7 },
      m7: { o: 0.7 },
      m8: { o: 0.7 },
    },
  );

  // 2 · il processo di oggi: frammentato, passaggi manuali e ridondanti
  const t2 = (dx: number, dz: number) => (W ? { x: T + dx, z: TZ + dz } : { x: T + dz * 0.9, z: TZ + dx * 0.62 });
  const restBuild1 = {
    data: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(-70, 70, 10) },
    integr: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(-90, -40, 40) },
    intel: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(70, 20, 60) },
    logic: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(-10, -80, 100) },
    iface: { ...tile, ...lMod, s: 0.86, ghost: 1, ...b1(60, -30, 140) },
  };
  const messy = W
    ? { human: t2(-195, -70), email: t2(-35, -135), excel: t2(15, 20), approval: t2(205, -45), erp: t2(150, 115) }
    : { human: { x: -88, z: TZ - 130 }, email: { x: 92, z: TZ - 92 }, excel: { x: -40, z: TZ + 6 }, approval: { x: 96, z: TZ + 70 }, erp: { x: -74, z: TZ + 140 } };
  F(
    {
      human: { ...tile, ...messy.human },
      email: { ...tile, ...messy.email },
      excel: { ...tile, ...messy.excel, y: 0 },
      approval: { ...tile, ...messy.approval },
      erp: { ...tile, ...messy.erp },
      ai: hiddenAt({ ...tile, ...messy.excel, s: 0.4, lime: 1 }),
      ...restBuild1,
    },
    {
      m1: {},
      m2: {},
      m3: {},
      m4: {},
      m5: {},
      m6: {},
      m7: {},
      m8: {},
    },
  );

  // 3 · trasformato: il lavoro manuale (persona ed excel) si comprime nell'AI, l'approvazione resta alla persona
  const chain = (i: number) => (W ? { x: T - 255 + i * 170, z: TZ } : { x: 0, z: TZ - 165 + i * 110 });
  const restBuild = restBuild1;
  F(
    {
      human: { ...tile, ...chain(1), o: 0, lo: 0, s: 0.7 },
      excel: { ...tile, ...chain(1), o: 0, lo: 0, s: 0.7 },
      email: { ...tile, ...chain(0), delay: 0.05 },
      ai: { ...tile, ...chain(1), lime: 1, delay: 0.2 },
      approval: { ...tile, ...chain(2), ui: 1, lx: 0.16, delay: 0.1 },
      erp: { ...tile, ...chain(3), delay: 0.15 },
      ...restBuild,
    },
    {
      m1: { o: 0 },
      m2: { o: 0 },
      m3: { o: 0 },
      m4: { o: 0 },
      m5: { o: 0 },
      m6: { o: 0 },
      m7: { o: 0 },
      m8: { o: 0 },
      c1: { active: 1, draw: 1, pulse: 1, delay: 0.45 },
      c2: { active: 1, draw: 1, pulse: 1, delay: 0.55 },
      c3: { active: 1, draw: 1, pulse: 1, delay: 0.65 },
    },
  );
  // da qui il processo trasformato resta acceso, a lato
  const doneChain = {
    email: { ...tile, ...chain(0) },
    ai: { ...tile, ...chain(1), lime: 1 },
    approval: { ...tile, ...chain(2), ui: 1, lx: 0.16 },
    erp: { ...tile, ...chain(3) },
  };
  const liveLinks = { c1: { active: 1, pulse: 1, o: 0.45 }, c2: { active: 1, pulse: 1, o: 0.45 }, c3: { active: 1, pulse: 1, o: 0.45 } };
  // mentre la camera guarda il prodotto, il processo trasformato resta acceso in secondo piano (più tenue)
  const bgChain = Object.fromEntries(Object.entries(doneChain).map(([k, v]) => [k, { ...v, o: 0.4, lo: 0.4, ui: 0.4 }]));

  // 4 · i moduli del prodotto compaiono uno dopo l'altro, sparsi nello spazio
  const b4 = (dx: number, dz: number, y: number) => (W ? { x: B + dx, y, z: BZ + dz } : { x: B + dx * 0.8, y, z: BZ + dz * 0.9 });
  F(
    {
      ...bgChain,
      data: { ...tile, ...lMod, ...b4(-150, 75, 0) },
      integr: { ...tile, ...lMod, ...b4(-170, -55, 34), delay: 0.12 },
      intel: { ...tile, ...lMod, ...b4(115, 25, 62), lime: 1, delay: 0.24 },
      logic: { ...tile, ...lMod, ...b4(-55, -105, 104), delay: 0.36 },
      iface: { ...tile, ...lMod, ...b4(85, -35, 150), delay: 0.48 },
    },
    liveLinks,
  );

  // 5 · il prodotto: un'architettura a strati, e in cima un'interfaccia che si usa davvero
  const layer = { w: 250, d: 150, h: 10, lx: -0.88, ly: 0.72 };
  const st = (i: number) => ({ x: B - 36 + i * 18, z: BZ });
  F(
    {
      ...bgChain,
      integr: { ...layer, ...st(0), y: 0 },
      data: { ...layer, ...st(1), y: 40, delay: 0.06 },
      intel: { ...layer, ...st(2), y: 80, lime: 1, delay: 0.12 },
      logic: { ...layer, ...st(3), y: 120, delay: 0.18 },
      iface: { w: 300, d: 196, h: 10, ...st(4), x: B + 36, y: 170, mist: 1, ui: 1, lo: 0, lx: -0.9, delay: 0.25 },
    },
    liveLinks,
  );

  // 6 · produzione: le due strade convergono in uno stack a tre strati, nel contesto reale
  const P = { w: 300, d: 196, h: 14 };
  const pl = { lx: -0.92, ly: 0.8 };
  const bot = { ...P, ...pl, x: -28, y: 0, z: 0 };
  const mid = { ...P, ...pl, x: 0, y: 52, z: 0, lime: 1 };
  const top = { ...P, x: 28, y: 104, z: 0, mist: 1, ui: 1, lo: 0 };
  const into = (to: Partial<Props>, delay = 0) => ({ ...to, o: 0, lo: 0, ui: 0, delay });
  const tags = W
    ? { tData: [-300, -120], tPerms: [-290, 150], tUsers: [300, 170], tEvals: [310, -110], tMon: [330, 40] }
    : { tData: [-100, -175], tEvals: [100, -175], tPerms: [-125, 185], tUsers: [0, 205], tMon: [125, 185] };
  const tagFrame = Object.fromEntries(
    Object.entries(tags).map(([k, [x, z]], i) => [k, { w: W ? 124 : 118, d: 30, h: 5, x, z, lo: 1, delay: 0.35 + i * 0.06 }]),
  ) as Record<string, Partial<Props>>;
  F(
    {
      email: into(bot, 0.05),
      erp: into(bot, 0.1),
      ai: into({ ...mid, lime: 1 }, 0.05),
      approval: into(top, 0.1),
      // il prodotto non sparisce: i suoi strati diventano lo stack (l'interfaccia resta in cima, l'intelligenza
      // diventa il sistema AI, le integrazioni la base); gli strati intermedi e il processo trasformato ci entrano
      integr: { ...bot, lo: 0 },
      data: into(bot),
      intel: { ...mid, lo: 0 },
      logic: into(mid),
      iface: { ...top },
      pBot: { ...bot, delay: 0.6 },
      pMid: { ...mid, delay: 0.6 },
      ...tagFrame,
    },
    Object.fromEntries(Object.keys(tags).map((k, i) => [`x${k}`, { draw: 1, o: 0.8, delay: 0.45 + i * 0.05 }])),
  );

  // 7 · integrazione: lo stack si collega ai sistemi dell'azienda e alle interfacce da cui si usa
  const sys = W
    ? { sErp: [-430, -40], sCrm: [-350, -200], sEmail: [-170, -290], sDocs: [60, -300], sData: [280, -240], sPpt: [420, -100], sTeams: [-440, 120] }
    : { sErp: [-150, -265], sCrm: [-50, -275], sEmail: [50, -275], sDocs: [150, -265], sData: [-105, -200], sPpt: [0, -205], sTeams: [105, -200] };
  const sysFrame = Object.fromEntries(
    Object.entries(sys).map(([k, [x, z]], i) => [k, { w: W ? 136 : 96, d: 38, h: 8, x, z, lo: 1, delay: 0.05 + i * 0.05 }]),
  ) as Record<string, Partial<Props>>;
  const outs = W
    ? { oSoft: [-230, 300], oAi: [0, 320], oApp: [230, 300] }
    : { oSoft: [-122, 190], oAi: [0, 200], oApp: [122, 190] };
  const outTone: Record<string, Partial<Props>> = { oSoft: {}, oAi: { lime: 1, lx: -0.68 }, oApp: { mist: 1 } };
  const outFrame = Object.fromEntries(
    Object.entries(outs).map(([k, [x, z]], i) => [
      k,
      { w: W ? 170 : 112, d: W ? 100 : 70, h: 8, x, z, lo: 1, lx: -0.82, ly: -0.62, ui: 1, ...outTone[k], ...(W ? {} : { s: 0.66, w: 170, d: 100 }), delay: 0.45 + i * 0.07 },
    ]),
  ) as Record<string, Partial<Props>>;
  // su telefono lo stack si rimpicciolisce per fare spazio ai sistemi e alle uscite
  const k7 = W ? 1 : 0.72;
  F(
    {
      pBot: { ...bot, s: k7, x: bot.x * k7 },
      pMid: { ...mid, s: k7, x: mid.x * k7, y: mid.y * k7 },
      iface: { ...top, s: k7, x: top.x * k7, y: top.y * k7 },
      // gli strati del prodotto restano sotto quelli dello stack e se ne vanno con loro
      integr: { ...bot, s: k7, x: bot.x * k7, o: 0, lo: 0 },
      intel: { ...mid, s: k7, x: mid.x * k7, y: mid.y * k7, o: 0, lo: 0 },
      ...Object.fromEntries(Object.keys(tagFrame).map((k) => [k, { ...tagFrame[k], o: 0, lo: 0, delay: 0 }])),
      ...sysFrame,
      ...outFrame,
    },
    {
      ...Object.fromEntries(Object.keys(sys).map((k, i) => [`i${k}`, { active: 1, draw: 1, pulse: 1, delay: 0.2 + i * 0.05 }])),
      ...Object.fromEntries(Object.keys(outs).map((k, i) => [`o${k}`, { active: 1, draw: 1, pulse: 1, delay: 0.55 + i * 0.07 }])),
    },
  );

  // camera: cosa inquadrare in ogni stato
  const cams: CamKey[] = W
    ? [
        { t: [0, 30, 20], span: 440, yaw: -12, pitch: 50 },
        { t: [0, 20, 30], span: 820, yaw: -9, pitch: 54 },
        { t: [T, 0, -10], span: 560, yaw: -12, pitch: 50 },
        { t: [T, 0, 0], span: 700, yaw: -10, pitch: 47 },
        { t: [B, 80, -10], span: 540, yaw: -14, pitch: 44 },
        { t: [B, 90, 0], span: 470, yaw: -12, pitch: 46 },
        { t: [0, 50, 20], span: 760, yaw: -10, pitch: 48 },
        { t: [0, 10, 40], span: 920, yaw: -8, pitch: 54 },
      ]
    : [
        { t: [0, 30, 20], span: 330, vspan: 280, yaw: -12, pitch: 52 },
        { t: [-30, 20, 0], span: 400, vspan: 500, yaw: -9, pitch: 58 },
        { t: [0, 0, TZ], span: 370, vspan: 310, yaw: -10, pitch: 56 },
        { t: [0, 0, TZ], span: 300, vspan: 370, yaw: -10, pitch: 56 },
        { t: [0, 70, BZ], span: 380, vspan: 330, yaw: -12, pitch: 48 },
        { t: [24, 90, BZ], span: 390, vspan: 340, yaw: -12, pitch: 50 },
        { t: [10, 40, 10], span: 380, vspan: 440, yaw: -10, pitch: 56 },
        { t: [0, 10, -20], span: 360, vspan: 480, yaw: -8, pitch: 62 },
      ];

  const spec: SceneSpec = { objects, links, frames };
  return { spec, cams };
}
