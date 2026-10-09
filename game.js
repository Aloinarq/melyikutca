/* Melyik utca? — a street quiz for Marosvásárhely / Târgu Mureș. */
(function () {
  'use strict';

  const ROUNDS = 5;
  const MAX_POINTS = 5000;
  const HINT_COST = [500, 1000];
  const CHOOSE_POINTS = [5000, 2500, 1000, 0]; // by wrong picks before the right one
  const HALVE_COST = 1500;
  const TZ = 'Europe/Bucharest';
  const STORE = 'melyikutca:';

  // ------------------------------------------------------------------ text
  const I18N = {
    hu: {
      subtitle: 'Mennyire ismered Marosvásárhelyt? Utcák, terek, épületek egy felirat nélküli térképen.',
      sheet: 'Lap', scale: 'Lépték',
      daily: 'Napi kihívás',
      dailyNew: 'Mindenki ugyanazt az öt feladványt kapja ma.',
      dailyDone: (s) => `Mai eredményed: ${s} pont — újra játszható`,
      freePlay: 'Szabad játék',
      easy: 'Könnyű', medium: 'Közepes', hard: 'Nehéz',
      best: (s) => `rekord ${s}`,
      start: 'Indulás',
      rulesTitle: 'Szabályok',
      rule1: '„Melyik ez?” — a térképen kiemelve látsz egy utcát, teret vagy épületet: válaszd ki a nevét a négy közül. Elsőre 5000 pont, másodikra 2500, harmadikra 1000.',
      rule2: '„Hol van?” — megkapod a nevet: koppints a térképen oda, ahol szerinted van (a tűt mozgathatod), majd „Tipp!”.',
      rule3: '„Csak a forma” — csak az alakját látod (épületeknél a környező utcákkal együtt), és meg kell találnod a térképen.',
      rule4: 'Könnyű szinten csak közismert helyek jönnek, Nehézen a kevésbé ismert utcák is. Segítség: városrész −500, alak vagy kezdőbetű −1000, felezés −1500 pont. A térképes köröknél a távolság számít:',
      formulaIf: 'ha d ≤ 25 m',
      formulaNote: '25 m-en belül 5000 pont, kb. 500 m-nél nagyjából a fele, 3 km-nél 0.',
      dataCredit: 'Térképadatok:',
      dataAsOf: (d) => ` · adatok: ${d}`,
      tapMap: 'Koppints a térképre!',
      chooseTip: 'Koppints a helyes névre',
      kinds: { choose: 'Melyik ez?', locate: 'Hol van?', shape: 'Csak a forma' },
      questions: {
        street: 'Melyik utca ez?', square: 'Melyik tér ez?', landmark: 'Melyik épület ez?',
        blocks: 'Melyik utcánál állnak?',
      },
      whereIs: 'Hol van?',
      shapeQ: 'Hol van ez?',
      halve: 'Felezés',
      showShape: (n) => `Az alakja ${n}`,
      tries: ['Elsőre!', 'Másodikra', 'Harmadikra', 'Nem sikerült'],
      guess: 'Tipp!',
      hint: 'Segítség', hintCost: (c) => `−${c} pont`, noMoreHints: 'Nincs több segítség',
      hood: (n) => `Városrész: ${n}`, hoodUnknown: 'Városrész: ismeretlen',
      letter: (l) => `Kezdőbetű: ${l}…`,
      shapeShown: 'Alak: lent',
      round: (i) => `${i}/${ROUNDS}. kör`,
      points: 'pont',
      next: 'Következő', finish: 'Eredmény',
      distance: (d) => `Távolság: <b>${d}</b>`,
      onShape: 'Telitalálat!',
      hintPenalty: (c) => `segítség: −${c}`,
      types: { street: 'Utca', square: 'Tér', landmark: 'Épület', blocks: 'Tömbházak' },
      cats: {
        church: 'Templom', synagogue: 'Zsinagóga', palace: 'Palota', theatre: 'Színház', townhall: 'Városháza',
        hotel: 'Szálloda', library: 'Könyvtár', mall: 'Bevásárlóközpont', university: 'Egyetem', school: 'Iskola',
        sport: 'Sportlétesítmény', fortress: 'Vár', building: 'Épület',
      },
      endDaily: (d) => `Napi kihívás · ${d}`,
      endMode: (m) => `${m} játék`,
      newBest: 'Új rekord!',
      prevBest: (s) => `Eddigi rekordod: ${s}`,
      copy: 'Eredmény másolása', copied: 'Vágólapra másolva', copyFail: 'Nem sikerült másolni — jelöld ki kézzel',
      again: 'Újra', menu: 'Főmenü',
      loadFail: 'Nem sikerült betölteni a feladványokat (data/puzzles.json).',
      blocksN: (n) => `${n} tömbház`,
    },
    ro: {
      subtitle: 'Cât de bine cunoști Târgu Mureșul? Străzi, piețe și clădiri pe o hartă fără nume.',
      sheet: 'Plan', scale: 'Scara',
      daily: 'Provocarea zilei',
      dailyNew: 'Toată lumea primește azi aceleași cinci întrebări.',
      dailyDone: (s) => `Rezultatul tău de azi: ${s} puncte — poți rejuca`,
      freePlay: 'Joc liber',
      easy: 'Ușor', medium: 'Mediu', hard: 'Greu',
      best: (s) => `record ${s}`,
      start: 'Start',
      rulesTitle: 'Reguli',
      rule1: '„Care e?” — pe hartă e evidențiată o stradă, o piață sau o clădire: alege numele dintre patru variante. Din prima 5000 de puncte, din a doua 2500, din a treia 1000.',
      rule2: '„Unde e?” — primești numele: atinge harta unde crezi că se află (poți muta acul), apoi „Tipp!”.',
      rule3: '„Doar forma” — vezi doar forma (la clădiri împreună cu străzile din jur) și trebuie s-o găsești pe hartă.',
      rule4: 'La nivelul Ușor apar doar locuri cunoscute, la Greu și străzi mai puțin știute. Indicii: cartierul −500, forma sau prima literă −1000, înjumătățirea −1500 de puncte. La rundele pe hartă contează distanța:',
      formulaIf: 'dacă d ≤ 25 m',
      formulaNote: 'Sub 25 m: 5000 de puncte, la ~500 m cam jumătate, la 3 km: 0.',
      dataCredit: 'Date hartă:',
      dataAsOf: (d) => ` · date: ${d}`,
      tapMap: 'Atinge harta!',
      chooseTip: 'Atinge numele corect',
      kinds: { choose: 'Care e?', locate: 'Unde e?', shape: 'Doar forma' },
      questions: {
        street: 'Ce stradă e asta?', square: 'Ce piață e asta?', landmark: 'Ce clădire e asta?',
        blocks: 'Lângă ce stradă sunt?',
      },
      whereIs: 'Unde e?',
      shapeQ: 'Unde e asta?',
      halve: 'Jumătate',
      showShape: (n) => `Forma ${n}`,
      tries: ['Din prima!', 'Din a doua', 'Din a treia', 'Nu a reușit'],
      guess: 'Tipp!',
      hint: 'Indiciu', hintCost: (c) => `−${c} puncte`, noMoreHints: 'Nu mai sunt indicii',
      hood: (n) => `Cartier: ${n}`, hoodUnknown: 'Cartier: necunoscut',
      letter: (l) => `Prima literă: ${l}…`,
      shapeShown: 'Forma: mai jos',
      round: (i) => `Runda ${i}/${ROUNDS}`,
      points: 'puncte',
      next: 'Următoarea', finish: 'Rezultat',
      distance: (d) => `Distanța: <b>${d}</b>`,
      onShape: 'Nimerit!',
      hintPenalty: (c) => `indicii: −${c}`,
      types: { street: 'Stradă', square: 'Piață', landmark: 'Clădire', blocks: 'Blocuri' },
      cats: {
        church: 'Biserică', synagogue: 'Sinagogă', palace: 'Palat', theatre: 'Teatru', townhall: 'Primărie',
        hotel: 'Hotel', library: 'Bibliotecă', mall: 'Centru comercial', university: 'Universitate', school: 'Școală',
        sport: 'Bază sportivă', fortress: 'Cetate', building: 'Clădire',
      },
      endDaily: (d) => `Provocarea zilei · ${d}`,
      endMode: (m) => `Joc ${m.toLowerCase()}`,
      newBest: 'Record nou!',
      prevBest: (s) => `Recordul tău de până acum: ${s}`,
      copy: 'Copiază rezultatul', copied: 'Copiat', copyFail: 'Copierea a eșuat — selectează manual',
      again: 'Din nou', menu: 'Meniu',
      loadFail: 'Nu s-au putut încărca puzzle-urile (data/puzzles.json).',
      blocksN: (n) => `${n} blocuri`,
    },
  };

  // ------------------------------------------------------------------ utils
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';

  const store = {
    get(k, def) {
      try { const v = localStorage.getItem(STORE + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ }
    },
  };

  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function fmtPlain(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function fmtDist(m) {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(m < 10000 ? 2 : 1).replace('.', ',')} km`;
  }

  function todayStr() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  function prettyDate(s, lang) {
    const [y, m, d] = s.split('-').map(Number);
    if (lang === 'ro') return `${d}.${String(m).padStart(2, '0')}.${y}`;
    return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')}.`;
  }

  // Seeded RNG: xmur3 string hash -> mulberry32.
  function seedFrom(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ------------------------------------------------------------------ geometry
  // Local equirectangular projection in metres; plenty accurate across one city.
  const LAT0 = 46.544;
  const KX = 111320 * Math.cos(LAT0 * Math.PI / 180);
  const KY = 110540;
  const proj = (ll) => [ll[1] * KX, ll[0] * KY];
  const unproj = (p) => [p[1] / KY, p[0] / KX];

  function nearestOnSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return [a[0] + t * dx, a[1] + t * dy];
  }
  function pointInRing(p, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /** Distance (m) from [lat, lon] to the puzzle shape and the nearest point on it. */
  function distanceToShape(latlng, puzzle) {
    const p = proj(latlng);
    let best = Infinity, bestPt = null;
    for (const part of puzzle.geom) {
      const pts = part.map(proj);
      if (puzzle.kind === 'area' && pointInRing(p, pts)) return { d: 0, nearest: latlng.slice() };
      for (let i = 0; i < pts.length - 1; i++) {
        const q = nearestOnSegment(p, pts[i], pts[i + 1]);
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < best) { best = d; bestPt = q; }
      }
      if (pts.length === 1) {
        const d = Math.hypot(pts[0][0] - p[0], pts[0][1] - p[1]);
        if (d < best) { best = d; bestPt = pts[0]; }
      }
    }
    return { d: best, nearest: unproj(bestPt) };
  }

  /** 5000 within 25 m, smooth exponential decay, exactly 0 from 3 km. */
  function scoreForDistance(d) {
    if (d <= 25) return MAX_POINTS;
    const L = 700, X = 3000 - 25;
    const floor = Math.exp(-X / L);
    const v = (Math.exp(-(d - 25) / L) - floor) / (1 - floor);
    return Math.max(0, Math.round(MAX_POINTS * v));
  }

  function emojiFor(points) { return points >= 3500 ? '🟩' : points >= 1000 ? '🟨' : '🟥'; }

  // ------------------------------------------------------------------ silhouette
  const NICE = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];

  function el(name, attrs, parent) {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /** Context streets are stored delta-encoded (see build_puzzles.py); decode once. */
  function decodeCtx(puzzle) {
    if (!puzzle._ctx) {
      const [s0, w0] = state.data.ctx_origin, u = state.data.ctx_unit;
      puzzle._ctx = puzzle.ctx.map((flat) => {
        const pts = [];
        let a = 0, b = 0;
        for (let i = 0; i < flat.length; i += 2) { a += flat[i]; b += flat[i + 1]; pts.push([s0 + a * u, w0 + b * u]); }
        return pts;
      });
    }
    return puzzle._ctx;
  }

  /**
   * Draw a puzzle's shape into an <svg>, north up, auto-fitted.
   * opts: { width, height, pad, scaleBar, animate, stroke }
   */
  function renderSilhouette(svg, puzzle, opts) {
    const o = Object.assign({ pad: 28, scaleBar: true, animate: false, stroke: null, top: 0 }, opts || {});
    const W = o.width || svg.clientWidth || 300;
    const H = o.height || svg.clientHeight || 300;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const parts = puzzle.geom.map((part) => part.map(proj));
    const ctx = o.context && puzzle.ctx && puzzle.cbox ? decodeCtx(puzzle).map((l) => l.map(proj)) : null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // With context the frame is the stored crop around the shape, not the shape itself.
    const framePts = ctx ? [proj([puzzle.cbox[0], puzzle.cbox[1]]), proj([puzzle.cbox[2], puzzle.cbox[3]])] : parts.flat();
    for (const [x, y] of framePts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
    const barSpace = o.scaleBar ? 34 : 0;
    const availW = W - 2 * o.pad, availH = H - 2 * o.pad - barSpace - o.top;
    // Very small shapes are not blown up beyond ~1.6 m per px so tiny things look tiny-ish.
    const s = Math.min(availW / w, availH / h, o.maxScale || Infinity);
    const offX = (W - w * s) / 2, offY = o.top + o.pad + (availH - h * s) / 2;
    const tx = (x) => (offX + (x - minX) * s).toFixed(1);
    const ty = (y) => (offY + (maxY - y) * s).toFixed(1);

    const strokeW = o.stroke || Math.max(4, Math.min(10, Math.min(W, H) / 32));
    if (ctx) {
      const id = 'clip' + Math.random().toString(36).slice(2, 8);
      const cp = el('clipPath', { id }, el('defs', {}, svg));
      el('rect', { x: 1, y: 1, width: W - 2, height: H - 2 }, cp);
      const cg = el('g', { class: 'ctx' + (o.animate ? ' fade' : ''), 'clip-path': `url(#${id})` }, svg);
      for (const l of ctx) {
        el('path', { d: 'M' + l.map(([x, y]) => `${tx(x)},${ty(y)}`).join('L'), 'stroke-width': Math.max(2, strokeW * 0.45) }, cg);
      }
    }
    const g = el('g', {}, svg);
    if (puzzle.kind === 'area') {
      const d = parts.map((pt) => 'M' + pt.map(([x, y]) => `${tx(x)},${ty(y)}`).join('L') + 'Z').join('');
      el('path', { d, class: 'shape-area' + (o.animate ? ' draw' : ''), 'stroke-width': Math.max(1, strokeW / 5), pathLength: 1 }, g);
    } else {
      parts.forEach((pt, i) => {
        const d = 'M' + pt.map(([x, y]) => `${tx(x)},${ty(y)}`).join('L');
        const p = el('path', { d, class: 'shape-line' + (o.animate ? ' draw' : ''), 'stroke-width': strokeW, pathLength: 1 }, g);
        if (o.animate) p.style.animationDelay = `${Math.min(i * 0.06, 0.5)}s`;
      });
    }

    if (o.scaleBar) {
      const maxM = (W * 0.32) / s;
      let m = NICE[0];
      for (const n of NICE) if (n <= maxM) m = n;
      const len = m * s;
      const x0 = 16, y0 = H - 18;
      const sb = el('g', { class: 'scalebar' }, svg);
      el('rect', { class: 'sb-bg', x: x0 - 6, y: y0 - 14, width: len + 62, height: 22, rx: 3 }, sb);
      el('rect', { x: x0, y: y0 - 4, width: len / 2, height: 4, fill: 'var(--ink)' }, sb);
      el('rect', { x: x0 + len / 2, y: y0 - 4, width: len / 2, height: 4, fill: 'var(--paper)' }, sb);
      el('line', { x1: x0, y1: y0 - 9, x2: x0, y2: y0 + 1 }, sb);
      el('line', { x1: x0 + len, y1: y0 - 9, x2: x0 + len, y2: y0 + 1 }, sb);
      const t = el('text', { x: x0 + len + 8, y: y0 + 1 }, sb);
      t.textContent = m >= 1000 ? `${m / 1000} km` : `${m} m`;
    }
    return { scale: s };
  }

  // ------------------------------------------------------------------ round planning
  // Three kinds of round, from easiest to hardest:
  //   choose — the place is highlighted on the map, pick its name from four;
  //   locate — the name is given, tap where it is;
  //   shape  — only the outline (buildings with their streets), tap where it is.
  // [kind, tier, distractor style]. Tier is how well known the place is (build_puzzles.py).
  const TIERS = ['easy', 'medium', 'hard'];
  const PLANS = {
    easy: [['choose', 'easy', 'far'], ['choose', 'easy', 'far'], ['locate', 'easy'], ['choose', 'easy', 'far'], ['locate', 'easy']],
    medium: [['choose', 'medium', 'near'], ['locate', 'easy'], ['choose', 'medium', 'near'], ['locate', 'medium'], ['shape', 'easy']],
    hard: [['locate', 'medium'], ['shape', 'easy'], ['choose', 'hard', 'near'], ['locate', 'hard'], ['choose', 'blocks', 'near']],
    daily: [['choose', 'easy', 'far'], ['locate', 'easy'], ['choose', 'medium', 'near'], ['locate', 'medium'], ['shape', 'easy']],
  };

  // Wrong answers come from the same kind of place as the right one.
  const group = (p) => p.type;
  const metres = (a, b) => { const p = proj(a), q = proj(b); return Math.hypot(p[0] - q[0], p[1] - q[1]); };
  // What a multiple-choice button says: block clusters are named by their street.
  const optionName = (p, lang) => {
    const n = p.type === 'blocks' && p.street ? p.street : p.name;
    return (lang === 'ro' ? n.ro || n.hu : n.hu || n.ro) || '';
  };
  const sameName = (a, b) => optionName(a, 'hu') === optionName(b, 'hu') || optionName(a, 'ro') === optionName(b, 'ro');

  /** Three wrong answers: far-away well-known ones (easy) or the neighbours (harder). */
  function makeOptions(p, style, all, rng) {
    const pool = all.filter((q) => q.id !== p.id && group(q) === group(p) && !sameName(q, p));
    let cands;
    if (style === 'far') {
      // Well-known names only, so the right answer is the one that fits the map.
      const known = (q) => (p.difficulty === 'easy' ? q.difficulty === 'easy' : q.difficulty !== 'hard');
      cands = shuffle(pool.filter((q) => known(q) && metres(q.centroid, p.centroid) > 1200), rng);
    } else {
      const near = pool.filter((q) => metres(q.centroid, p.centroid) > 120)
        .sort((a, b) => metres(a.centroid, p.centroid) - metres(b.centroid, p.centroid));
      cands = shuffle(near.slice(0, 9), rng).concat(near.slice(9));
    }
    const picked = [];
    for (const q of cands.concat(shuffle(pool, rng))) {
      if (picked.length === 3) break;
      if (!picked.some((o) => sameName(o, q))) picked.push(q);
    }
    return shuffle([p, ...picked], rng);
  }

  function pickRounds(all, mode, rng, exclude) {
    const sorted = all.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    const used = new Set(exclude || []), usedNames = new Set(), shown = new Set();
    const rounds = [];
    const far = (p) => rounds.every((r) => metres(r.p.centroid, p.centroid) > 400);
    for (const [kind, tier, style] of PLANS[mode]) {
      const fits = (p) => {
        if (tier === 'blocks') return p.type === 'blocks';
        if (p.type === 'blocks') return false;
        if (kind === 'shape' && !p.shape) return false;
        return p.difficulty === tier;
      };
      let pool = sorted.filter((p) => fits(p) && !used.has(p.id) && !usedNames.has(p.name.ro));
      if (pool.filter(far).length) pool = pool.filter(far);
      // Don't make the answer something that was already offered as a wrong option.
      if (pool.some((p) => !shown.has(p.id))) pool = pool.filter((p) => !shown.has(p.id));
      if (!pool.length) continue;
      // Mix streets with squares and buildings when the tier has both.
      const places = pool.filter((p) => p.type === 'square' || p.type === 'landmark'), streets = pool.filter((p) => p.type === 'street');
      if (places.length && streets.length) pool = rng() < 0.4 ? places : streets;
      const p = pool[Math.floor(rng() * pool.length)];
      used.add(p.id);
      usedNames.add(p.name.ro);
      const options = kind === 'choose' ? makeOptions(p, style, all, rng) : null;
      (options || []).forEach((o) => shown.add(o.id));
      rounds.push({ p, kind, options });
    }
    return rounds;
  }

  /** Same five for everyone on a given date; avoids what the previous two weeks served. */
  function dailyRounds(all, date) {
    const base = (d) => pickRounds(all, 'daily', mulberry32(seedFrom('melyikutca2:' + d)));
    const recent = new Set();
    const day = new Date(date + 'T12:00:00Z');
    for (let i = 1; i <= 14; i++) {
      const d = new Date(day.getTime() - i * 864e5).toISOString().slice(0, 10);
      base(d).forEach((r) => recent.add(r.p.id));
    }
    return pickRounds(all, 'daily', mulberry32(seedFrom('melyikutca2:' + date)), recent);
  }

  // ------------------------------------------------------------------ state
  const state = {
    lang: store.get('lang', 'hu') === 'ro' ? 'ro' : 'hu',
    diff: store.get('diff', 'medium'),
    data: null,
    mode: null, date: null,
    rounds: [], round: 0, results: [],
    guess: null, hints: 0, revealed: false, wrong: 0,
  };
  if (!TIERS.includes(state.diff)) state.diff = 'medium';
  const t = (k, ...a) => { const v = I18N[state.lang][k]; return typeof v === 'function' ? v(...a) : v; };

  function applyLang() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    refreshStart();
    if (screen() === 'game') renderRoundText();
    if (screen() === 'end') renderEnd();
  }

  const screen = () => $('#app').dataset.screen;
  function show(name) {
    $('#app').dataset.screen = name;
    window.scrollTo(0, 0);
    if (name !== 'game') $('#round-meta').innerHTML = '';
  }

  // ------------------------------------------------------------------ start screen
  function refreshStart() {
    const today = todayStr();
    $('#daily-date').textContent = prettyDate(today, state.lang);
    const done = store.get('daily:' + today, null);
    $('#daily-sub').textContent = done ? t('dailyDone', fmt(done.score)) : t('dailyNew');
    for (const d of TIERS) {
      const b = store.get('best:' + d, null);
      $('#best-' + d).textContent = b ? t('best', fmt(b)) : '';
    }
    $$('#diff-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.diff === state.diff)));
    if (state.data) {
      const ts = (state.data.osm_timestamp || '').slice(0, 10);
      $('#data-date').textContent = ts ? t('dataAsOf', ts) : '';
    }
  }

  function drawHero() {
    const svg = $('#hero');
    if (!state.data) return;
    const pool = state.data.puzzles.filter((p) => {
      if (p.kind !== 'line' || p.difficulty === 'hard') return false;
      const h = (p.bbox[2] - p.bbox[0]) * KY, w = (p.bbox[3] - p.bbox[1]) * KX;
      return w > h * 1.3 && w < h * 4; // wide-ish shapes suit the banner
    });
    if (!pool.length) return;
    const rng = mulberry32(seedFrom(todayStr() + ':hero'));
    const p = pool[Math.floor(rng() * pool.length)];
    renderSilhouette(svg, p, { pad: 16, scaleBar: false, animate: true, stroke: 3 });
    svg.querySelectorAll('path').forEach((n) => { n.style.stroke = 'var(--ink-3)'; });
  }

  // ------------------------------------------------------------------ map
  let map = null, guessMarker = null, revealLayer = null;

  function initMap() {
    if (map) return;
    const [s, w, n, e] = state.data.bounds;
    const bounds = L.latLngBounds([s, w], [n, e]);
    map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      maxBounds: bounds.pad(0.05),
      maxBoundsViscosity: 1,
      minZoom: 12,
      maxZoom: 18,
      zoomSnap: 0.25,
      tap: true,
      bounceAtZoomLimits: false,
    });
    map.zoomControl.setPosition('topright');
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const key = (window.MELYIKUTCA_CONFIG || {}).cartoKey;
    if (key) {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(key), {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
    } else {
      $('#map').classList.add('drawn');
      basemapPromise.then((bm) => bm && drawBasemap(bm));
    }
    resetView();
    map.on('click', (ev) => {
      if (state.revealed || cur().kind === 'choose') return;
      placeGuess([ev.latlng.lat, ev.latlng.lng]);
    });
  }

  // ---- Own label-free basemap: OSM roads, water, rail and green drawn in pencil.
  const basemapPromise = fetch('data/basemap.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const BASE_STYLE = {
    green: { stroke: false, fill: true, fillColor: '#cfd8b8', fillOpacity: 0.55 },
    water: { stroke: false, fill: true, fillColor: '#a9c9cc', fillOpacity: 0.85 },
    river: { color: '#a9c9cc', w: 4 },
    stream: { color: '#a9c9cc', w: 1 },
    rail: { color: '#8a8d93', w: 1, dashArray: '4 3' },
    service: { color: '#c9c4b5', w: 0.7 },
    minor: { color: '#a8a597', w: 1.1 },
    major: { color: '#7c7d80', w: 2 },
  };
  const ORDER = ['green', 'water', 'river', 'stream', 'service', 'minor', 'rail', 'major'];

  function decodeLayer(bm, list) {
    const [s0, w0] = bm.origin, u = bm.unit;
    return list.map((flat) => {
      const pts = [];
      let a = 0, b = 0;
      for (let i = 0; i < flat.length; i += 2) {
        a += flat[i]; b += flat[i + 1];
        pts.push([s0 + a * u, w0 + b * u]);
      }
      return pts;
    });
  }

  function drawBasemap(bm) {
    const renderer = L.canvas({ padding: 0.4 });
    const lines = [];
    for (const name of ORDER) {
      const list = bm.layers[name];
      if (!list || !list.length) continue;
      const geo = decodeLayer(bm, list);
      const st = BASE_STYLE[name];
      const opts = Object.assign({ renderer, interactive: false, smoothFactor: 1.5, lineCap: 'round', lineJoin: 'round' }, st);
      const layer = st.fill ? L.polygon(geo, opts) : L.polyline(geo, Object.assign(opts, { weight: st.w }));
      layer.addTo(map);
      if (!st.fill) lines.push([layer, st.w]);
    }
    const restyle = () => {
      const k = Math.pow(1.6, map.getZoom() - 13);
      for (const [layer, w] of lines) layer.setStyle({ weight: Math.max(0.5, w * k) });
    };
    map.on('zoomend', restyle);
    restyle();
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
  }

  function resetView() {
    const c = state.data.center;
    map.setView(c, 13.25, { animate: false });
  }

  const pinIcon = (drop) => L.divIcon({ className: 'pin' + (drop ? ' drop' : ''), html: '<i></i>', iconSize: [0, 0] });

  function placeGuess(ll) {
    state.guess = ll;
    if (!guessMarker) {
      guessMarker = L.marker(ll, { icon: pinIcon(true), draggable: true, keyboard: false, autoPan: true }).addTo(map);
      guessMarker.on('dragend', () => {
        const p = guessMarker.getLatLng();
        state.guess = [p.lat, p.lng];
      });
    } else {
      guessMarker.setLatLng(ll);
      guessMarker.setIcon(pinIcon(true));
    }
    $('#screen-game').classList.add('placed');
    $('#guess-btn').disabled = false;
  }

  // ------------------------------------------------------------------ game flow
  const cur = () => state.rounds[state.round];

  function startGame(mode) {
    const all = state.data.puzzles;
    state.mode = mode;
    state.date = todayStr();
    state.rounds = mode === 'daily'
      ? dailyRounds(all, state.date)
      : pickRounds(all, mode, mulberry32((Math.random() * 2 ** 32) >>> 0));
    state.round = 0;
    state.results = [];
    show('game');
    initMap();
    map.invalidateSize();
    startRound();
  }

  function typeLabel(p) {
    if (p.type === 'landmark' && p.cat) return t('cats')[p.cat] || t('types').landmark;
    if (p.type === 'blocks' && p.count) return `${t('types').blocks} · ${p.count}`;
    return t('types')[p.type];
  }

  const localName = (p) => p.name[state.lang] || p.name.hu || p.name.ro;
  const otherName = (p) => {
    const alt = state.lang === 'hu' ? p.name.ro : p.name.hu;
    return alt && alt !== localName(p) ? alt : '';
  };

  function updateRoundMeta() {
    const total = state.results.reduce((a, r) => a + r.points, 0);
    $('#round-meta').innerHTML = `${t('round', state.round + 1)} · <b>${fmt(total)}</b>`;
  }

  /** Everything in the round that depends on the language. */
  function renderRoundText() {
    const { p, kind, options } = cur();
    $('#type-chip').textContent = typeLabel(p);
    $('#kind-label').textContent = kind === 'choose' ? t('questions')[p.type] : t('kinds')[kind];
    $('#prompt-q').textContent = kind === 'choose' ? t('questions')[p.type] : kind === 'locate' ? t('whereIs') : t('shapeQ');
    $('#prompt-name').textContent = kind === 'locate' ? localName(p) : '';
    $('#prompt-alt').textContent = kind === 'locate' ? otherName(p) : '';
    if (options) {
      $$('#choices .choice').forEach((b, i) => { b.querySelector('span').textContent = optionName(options[i], state.lang); });
    }
    updateRoundMeta();
    updateHintUI();
    if (state.revealed) fillReveal();
  }

  function startRound() {
    const { p, kind, options } = cur();
    state.guess = null; state.hints = 0; state.revealed = false; state.wrong = 0; state.halved = false;
    const sg = $('#screen-game');
    sg.dataset.kind = kind;
    sg.classList.remove('placed', 'revealed', 'shape-shown');
    $('#reveal').hidden = true;
    $('#guess-btn').disabled = true;
    $('#hint-text').textContent = '';
    if (guessMarker) { guessMarker.remove(); guessMarker = null; }
    if (revealLayer) { revealLayer.remove(); revealLayer = null; }
    // Multiple choice: four name buttons.
    const box = $('#choices');
    box.innerHTML = '';
    (options || []).forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = '<span></span>';
      b.addEventListener('click', () => choose(i));
      box.appendChild(b);
    });
    renderRoundText();
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (kind === 'choose') {
        // Highlight the place in situ; the player can still pan and zoom to get bearings.
        revealLayer = L.layerGroup().addTo(map);
        const shape = shapeLayer(p, true).addTo(revealLayer);
        // Zoomed out enough (≈2.5 km across) to see the river and main roads for bearings.
        map.fitBounds(shape.getBounds(), { padding: [50, 50], maxZoom: 14.5, animate: false });
      } else {
        resetView();
      }
      drawCurrent(true);
    });
  }

  /** The place drawn on the map: red pencil while asking, ink once revealed. */
  function shapeLayer(p, asking) {
    const color = asking ? '#d2452b' : '#1a2233';
    const g = L.featureGroup();
    if (p.kind === 'area') {
      L.polygon(p.geom, { color, weight: asking ? 3 : 2, fillColor: color, fillOpacity: asking ? 0.75 : 0.55, interactive: false }).addTo(g);
    } else {
      L.polyline(p.geom, { color: '#f6f2e6', weight: 11, opacity: 0.9, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g);
      L.polyline(p.geom, { color, weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g);
    }
    return g;
  }

  function drawCurrent(animate) {
    const { p, kind } = cur();
    const svg = $('#silhouette');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Shape rounds always show it; name rounds only after the "show shape" hint.
    if (kind === 'shape') {
      renderSilhouette(svg, p, { animate, top: 30, context: true });
    } else if (kind === 'locate' && state.hints >= 2) {
      const top = $('#prompt').offsetHeight + 40;
      renderSilhouette(svg, p, { animate, top, context: false, pad: 18 });
    }
    svg.setAttribute('aria-label', typeLabel(p));
  }

  function stripPrefix(name) {
    return name.replace(/^(strada|str\.|bulevardul|b-dul|calea|piața|piata|aleea|intrarea|pasajul|splaiul|drumul|șoseaua|fundătura|fundacul|ulița)\s+/i, '').trim();
  }

  function hintLetter(p) {
    const n = stripPrefix(optionName(p, state.lang));
    return n ? n[0].toUpperCase() : '?';
  }

  function hintCosts() {
    const { kind } = cur();
    return kind === 'choose' ? [HALVE_COST] : HINT_COST;
  }

  function updateHintUI() {
    const { p, kind } = cur();
    const costs = hintCosts();
    const btn = $('#hint-btn');
    const label = kind === 'choose' ? t('halve') : t('hint');
    if (state.hints >= costs.length) {
      btn.innerHTML = `${label}<small>${t('noMoreHints')}</small>`;
      btn.disabled = true;
    } else {
      btn.innerHTML = `${label}<small>${t('hintCost', costs[state.hints])}</small>`;
      btn.disabled = state.revealed;
    }
    const lines = [];
    if (kind !== 'choose' && state.hints >= 1) {
      const h = p.hood && (p.hood[state.lang] || p.hood.hu);
      lines.push(h ? t('hood', h) : t('hoodUnknown'));
    }
    if (kind === 'shape' && state.hints >= 2) lines.push(t('letter', hintLetter(p)));
    $('#hint-text').innerHTML = lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function useHint() {
    const { kind, p, options } = cur();
    if (state.revealed || state.hints >= hintCosts().length) return;
    state.hints++;
    if (kind === 'choose') {
      // Take away two wrong answers that are still standing.
      const buttons = $$('#choices .choice');
      const wrong = options.map((o, i) => i).filter((i) => options[i] !== p && !buttons[i].disabled);
      shuffle(wrong, Math.random).slice(0, Math.max(0, wrong.length - 1)).slice(0, 2).forEach((i) => {
        buttons[i].classList.add('removed');
        buttons[i].disabled = true;
      });
    }
    if (kind === 'locate' && state.hints >= 2) {
      $('#screen-game').classList.add('shape-shown');
      drawCurrent(true);
      map.invalidateSize(); // the sheet grew, so the map shrank
    }
    updateHintUI();
  }

  const penaltyNow = () => hintCosts().slice(0, state.hints).reduce((a, b) => a + b, 0);

  function choose(i) {
    const { p, options } = cur();
    if (state.revealed) return;
    const b = $$('#choices .choice')[i];
    if (options[i] !== p) {
      b.classList.add('wrong');
      b.disabled = true;
      state.wrong++;
      // Keep guessing while there is still a choice to make; once only the right
      // answer is left the round ends, scored by the wrong picks so far.
      const left = $$('#choices .choice').filter((x) => !x.disabled);
      if (left.length > 1) return;
    }
    $$('#choices .choice').forEach((x, j) => {
      x.disabled = true;
      if (options[j] === p) x.classList.add('right');
    });
    const base = CHOOSE_POINTS[Math.min(state.wrong, CHOOSE_POINTS.length - 1)];
    const penalty = base ? penaltyNow() : 0;
    state.results.push({ id: p.id, kind: 'choose', wrong: state.wrong, base, penalty, points: Math.max(0, base - penalty), hints: state.hints });
    revealOnMap(null);
  }

  function submitGuess() {
    if (!state.guess || state.revealed) return;
    const { p, kind } = cur();
    const { d, nearest } = distanceToShape(state.guess, p);
    const base = scoreForDistance(d);
    const penalty = penaltyNow();
    state.results.push({ id: p.id, kind, d, base, penalty, points: Math.max(0, base - penalty), hints: state.hints });
    guessMarker.dragging.disable();
    revealOnMap({ d, nearest });
  }

  function revealOnMap(miss) {
    const { p } = cur();
    state.revealed = true;
    $('#screen-game').classList.add('revealed');
    if (revealLayer) revealLayer.remove();
    revealLayer = L.layerGroup().addTo(map);
    const shape = shapeLayer(p, false).addTo(revealLayer);
    let bounds = shape.getBounds();
    if (miss) {
      if (miss.d > 0) {
        L.polyline([state.guess, miss.nearest], { color: '#d2452b', weight: 2.5, dashArray: '6 6', interactive: false }).addTo(revealLayer);
        L.marker(miss.nearest, { icon: L.divIcon({ className: 'near-dot', iconSize: [0, 0] }), interactive: false }).addTo(revealLayer);
      }
      bounds = bounds.extend(state.guess);
    }
    updateRoundMeta();
    updateHintUI();
    fillReveal();
    $('#reveal').hidden = false;
    requestAnimationFrame(() => {
      const rh = $('#reveal').offsetHeight;
      const mapBottom = $('#map').getBoundingClientRect().bottom;
      // The card is still sliding in, so measure where it will rest, not where it is.
      const cardTop = $('#screen-game').getBoundingClientRect().bottom - rh;
      const lift = Math.max(0, mapBottom - cardTop);
      $('#screen-game').style.setProperty('--rv-lift', `${lift}px`);
      map.flyToBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [40, lift + 24], maxZoom: 16, duration: 0.8 });
    });
  }

  function resultLine(r) {
    if (r.kind === 'choose') return t('tries')[Math.min(r.wrong, 3)];
    return r.d === 0 ? t('onShape') : fmtDist(r.d);
  }

  function fillReveal() {
    const { p } = cur();
    const r = state.results[state.round];
    if (!r) return;
    $('#rv-name').textContent = localName(p);
    const extra = p.type === 'blocks' && p.count ? ` · ${t('blocksN', p.count)}` : '';
    $('#rv-alt').textContent = otherName(p) + extra;
    $('#rv-pts').textContent = fmt(r.points);
    let line;
    if (r.kind === 'choose') line = `<b>${resultLine(r)}</b>`;
    else line = r.d === 0 ? `<b>${t('onShape')}</b>` : t('distance', fmtDist(r.d));
    if (r.penalty) line += `<br>${t('hintPenalty', fmt(r.penalty))}`;
    $('#rv-dist').innerHTML = line;
    $('#next-btn').textContent = state.round + 1 < state.rounds.length ? t('next') : t('finish');
  }

  function nextRound() {
    if (state.round + 1 < state.rounds.length) {
      state.round++;
      startRound();
    } else {
      finishGame();
    }
  }

  function finishGame() {
    const total = state.results.reduce((a, r) => a + r.points, 0);
    const key = state.mode === 'daily' ? 'best:daily' : 'best:' + state.mode;
    const prev = store.get(key, null);
    state.prevBest = prev;
    state.newBest = prev == null || total > prev;
    if (state.newBest) store.set(key, total);
    if (state.mode === 'daily') {
      const k = 'daily:' + state.date;
      const old = store.get(k, null);
      if (!old) store.set(k, { score: total, emoji: state.results.map((r) => emojiFor(r.points)).join('') });
    }
    show('end');
    renderEnd();
  }

  function shareLine() {
    const total = state.results.reduce((a, r) => a + r.points, 0);
    const emo = state.results.map((r) => emojiFor(r.points)).join('');
    const tag = state.mode === 'daily' ? '' : ` (${I18N[state.lang][state.mode]})`;
    return `Melyik utca? ${state.date}${tag} ${emo} ${fmtPlain(total)}`;
  }

  function renderEnd() {
    const total = state.results.reduce((a, r) => a + r.points, 0);
    $('#end-k').textContent = state.mode === 'daily' ? t('endDaily', prettyDate(state.date, state.lang)) : t('endMode', t(state.mode));
    $('#end-total').textContent = fmt(total);
    $('#end-best').textContent = state.newBest ? t('newBest') : (state.prevBest != null ? t('prevBest', fmt(state.prevBest)) : '');
    const ol = $('#end-rounds');
    ol.innerHTML = '';
    state.results.forEach((r, i) => {
      const p = state.rounds[i].p;
      const li = document.createElement('li');
      li.style.animationDelay = `${i * 70}ms`;
      const svg = document.createElementNS(SVGNS, 'svg');
      li.appendChild(svg);
      renderSilhouette(svg, p, { width: 52, height: 52, pad: 6, scaleBar: false, stroke: 2.5 });
      const mid = document.createElement('div');
      mid.innerHTML = `<div class="er-name"></div><div class="er-sub"></div>`;
      mid.querySelector('.er-name').textContent = localName(p);
      mid.querySelector('.er-sub').textContent = `${t('kinds')[r.kind]} · ${resultLine(r)}`;
      li.appendChild(mid);
      const pts = document.createElement('div');
      pts.className = 'er-pts';
      pts.innerHTML = `<i>${emojiFor(r.points)}</i>${fmt(r.points)}`;
      li.appendChild(pts);
      ol.appendChild(li);
    });
    $('#share-line').textContent = shareLine();
  }

  function toast(msg) {
    const n = $('#toast');
    n.textContent = msg;
    n.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => n.classList.remove('on'), 1800);
  }

  async function copyShare() {
    const text = shareLine();
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copied'));
      return;
    } catch (e) { /* fall back below */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      toast(ok ? t('copied') : t('copyFail'));
    } catch (e) {
      toast(t('copyFail'));
    }
  }

  // ------------------------------------------------------------------ wiring
  function wire() {
    $$('.lang button').forEach((b) => b.addEventListener('click', () => {
      state.lang = b.dataset.lang; store.set('lang', state.lang); applyLang();
    }));
    $$('#diff-seg button').forEach((b) => b.addEventListener('click', () => {
      state.diff = b.dataset.diff; store.set('diff', state.diff); refreshStart();
    }));
    $('#start-btn').addEventListener('click', () => state.data && startGame(state.diff));
    $('#daily-btn').addEventListener('click', () => state.data && startGame('daily'));
    $('#guess-btn').addEventListener('click', submitGuess);
    $('#hint-btn').addEventListener('click', useHint);
    $('#next-btn').addEventListener('click', nextRound);
    $('#copy-btn').addEventListener('click', copyShare);
    $('#again-btn').addEventListener('click', () => startGame(state.mode));
    $('#menu-btn').addEventListener('click', goHome);
    $('#home-btn').addEventListener('click', goHome);
    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (screen() === 'game') { map && map.invalidateSize(); drawCurrent(false); }
      }, 120);
    });
  }

  function goHome() {
    show('start');
    refreshStart();
    drawHero();
  }

  async function load() {
    $('#carto-credit').hidden = !(window.MELYIKUTCA_CONFIG || {}).cartoKey;
    wire();
    applyLang();
    try {
      const res = await fetch('data/puzzles.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      state.data = await res.json();
    } catch (e) {
      $('#daily-sub').textContent = t('loadFail');
      return;
    }
    refreshStart();
    drawHero();
  }

  // Exposed for tests and the curious.
  window.MelyikUtca = { scoreForDistance, distanceToShape, renderSilhouette, pickRounds, dailyRounds, mulberry32, seedFrom, state, get map() { return map; } };

  load();
})();
