/* Melyik utca? — a street-shape quiz for Marosvásárhely / Târgu Mureș. */
(function () {
  'use strict';

  const ROUNDS = 5;
  const MAX_POINTS = 5000;
  const HINT_COST = [500, 1000];
  const TZ = 'Europe/Bucharest';
  const STORE = 'melyikutca:';

  // ------------------------------------------------------------------ text
  const I18N = {
    hu: {
      subtitle: 'Csak a formát látod. Hol van ez Marosvásárhelyen?',
      sheet: 'Lap', scale: 'Lépték',
      daily: 'Napi kihívás',
      dailyNew: 'Mindenki ugyanazt az öt formát kapja ma.',
      dailyDone: (s) => `Mai eredményed: ${s} pont — újra játszható`,
      freePlay: 'Szabad játék',
      easy: 'Könnyű', medium: 'Közepes', hard: 'Nehéz',
      best: (s) => `rekord ${s}`,
      start: 'Indulás',
      rulesTitle: 'Szabályok',
      rule1: 'Öt kör. Minden körben egy valódi marosvásárhelyi hely alaprajzát látod: utcát, teret, épületet vagy tömbházcsoportot. Nincs név, nincs háttér, az észak felfelé van.',
      rule2: 'A léptékvonal megmutatja a méretet — ez is árulkodó.',
      rule3: 'Koppints a térképre, ahová szerinted tartozik (a tűt utána is mozgathatod), majd nyomd meg a „Tipp!” gombot.',
      rule4: 'A pontszám a tipped és az alakzat legközelebbi pontja közötti távolságtól függ (utcánál a vonaltól, épületnél a körvonaltól). Segítséget kérhetsz: a városrész neve −500, a kezdőbetű további −1000 pont.',
      formulaIf: 'ha d ≤ 25 m',
      formulaNote: '25 m-en belül 5000 pont, kb. 500 m-nél nagyjából a fele, 3 km-nél 0.',
      dataCredit: 'Térképadatok:',
      dataAsOf: (d) => ` · adatok: ${d}`,
      tapMap: 'Koppints a térképre!',
      guess: 'Tipp!',
      hint: 'Segítség', hintCost: (c) => `−${c} pont`, noMoreHints: 'Nincs több segítség',
      hood: (n) => `Városrész: ${n}`, hoodUnknown: 'Városrész: ismeretlen',
      letter: (l) => `Kezdőbetű: ${l}…`,
      round: (i) => `${i}/${ROUNDS}. kör`,
      points: 'pont',
      next: 'Következő', finish: 'Eredmény',
      distance: (d) => `Távolság: <b>${d}</b>`,
      onShape: 'Telitalálat!',
      hintPenalty: (c) => `segítség: −${c}`,
      types: { street: 'Utca', square: 'Tér', landmark: 'Épület', blocks: 'Tömbházak' },
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
      subtitle: 'Vezi doar forma. Unde e asta în Târgu Mureș?',
      sheet: 'Plan', scale: 'Scara',
      daily: 'Provocarea zilei',
      dailyNew: 'Toată lumea primește azi aceleași cinci forme.',
      dailyDone: (s) => `Rezultatul tău de azi: ${s} puncte — poți rejuca`,
      freePlay: 'Joc liber',
      easy: 'Ușor', medium: 'Mediu', hard: 'Greu',
      best: (s) => `record ${s}`,
      start: 'Start',
      rulesTitle: 'Reguli',
      rule1: 'Cinci runde. În fiecare rundă vezi planul unui loc real din Târgu Mureș: o stradă, o piață, o clădire sau un grup de blocuri. Fără nume, fără fundal, nordul e în sus.',
      rule2: 'Bara de scară arată mărimea — și ea e un indiciu.',
      rule3: 'Atinge harta unde crezi că se află (poți muta acul după aceea), apoi apasă „Tipp!”.',
      rule4: 'Punctajul depinde de distanța dintre ac și cel mai apropiat punct al formei (la străzi față de linie, la clădiri față de contur). Indicii: numele cartierului −500, prima literă încă −1000 de puncte.',
      formulaIf: 'dacă d ≤ 25 m',
      formulaNote: 'Sub 25 m: 5000 de puncte, la ~500 m cam jumătate, la 3 km: 0.',
      dataCredit: 'Date hartă:',
      dataAsOf: (d) => ` · date: ${d}`,
      tapMap: 'Atinge harta!',
      guess: 'Tipp!',
      hint: 'Indiciu', hintCost: (c) => `−${c} puncte`, noMoreHints: 'Nu mai sunt indicii',
      hood: (n) => `Cartier: ${n}`, hoodUnknown: 'Cartier: necunoscut',
      letter: (l) => `Prima literă: ${l}…`,
      round: (i) => `Runda ${i}/${ROUNDS}`,
      points: 'puncte',
      next: 'Următoarea', finish: 'Rezultat',
      distance: (d) => `Distanța: <b>${d}</b>`,
      onShape: 'Nimerit!',
      hintPenalty: (c) => `indicii: −${c}`,
      types: { street: 'Stradă', square: 'Piață', landmark: 'Clădire', blocks: 'Blocuri' },
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
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const part of parts) for (const [x, y] of part) {
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
      el('rect', { x: x0, y: y0 - 4, width: len / 2, height: 4, fill: 'var(--ink)' }, sb);
      el('rect', { x: x0 + len / 2, y: y0 - 4, width: len / 2, height: 4, fill: 'var(--paper)' }, sb);
      el('line', { x1: x0, y1: y0 - 9, x2: x0, y2: y0 + 1 }, sb);
      el('line', { x1: x0 + len, y1: y0 - 9, x2: x0 + len, y2: y0 + 1 }, sb);
      const t = el('text', { x: x0 + len + 8, y: y0 + 1 }, sb);
      t.textContent = m >= 1000 ? `${m / 1000} km` : `${m} m`;
    }
    return { scale: s };
  }

  // ------------------------------------------------------------------ puzzle choice
  const TIERS = ['easy', 'medium', 'hard'];
  const SLOTS = {
    easy: ['street', 'street', 'place', 'place', 'any'],
    medium: ['street', 'street', 'place', 'blocks', 'any'],
    hard: ['street', 'street', 'blocks', 'place', 'any'],
    daily: ['place', 'street', 'blocks', 'street', 'any'],
  };
  const typeMatches = (slot, type) =>
    slot === 'any' || slot === type || (slot === 'place' && (type === 'square' || type === 'landmark'));

  function pickPuzzles(all, mode, rng, exclude) {
    const tiersFor = mode === 'daily' ? ['easy', 'medium', 'medium', 'hard', 'hard'] : Array(ROUNDS).fill(mode);
    let slots = shuffle(SLOTS[mode], rng);
    if (mode === 'daily') slots = SLOTS.daily; // fixed arc: easy landmark → hard finale
    const sorted = all.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    const chosen = [];
    const far = (p) => chosen.every((q) => Math.hypot(...proj(p.centroid).map((v, i) => v - proj(q.centroid)[i])) > 400);
    const used = new Set(exclude || []), usedNames = new Set();
    for (let r = 0; r < ROUNDS; r++) {
      const tier = tiersFor[r], slot = slots[r];
      const ti = TIERS.indexOf(tier);
      const near = [tier, TIERS[ti - 1], TIERS[ti + 1]].filter(Boolean);
      // [test, minimum pool size]: a type with only a couple of puzzles in this tier
      // borrows from the neighbouring tier instead of repeating the same few every game.
      const tries = [
        [(p) => p.difficulty === tier && typeMatches(slot, p.type) && far(p), 6],
        [(p) => near.includes(p.difficulty) && typeMatches(slot, p.type) && far(p), 1],
        [(p) => near.includes(p.difficulty) && typeMatches(slot, p.type), 1],
        [(p) => p.difficulty === tier, 1],
        [() => true, 1],
      ];
      // "any" slots prefer a type not yet in the game, for variety.
      if (slot === 'any') {
        // A type that is neither in the game yet nor coming up in a later slot.
        const later = slots.slice(r + 1);
        const fresh = (type) => !chosen.some((q) => q.type === type) && !later.some((sl) => typeMatches(sl, type));
        tries.unshift(
          [(p) => p.difficulty === tier && far(p) && fresh(p.type), 6],
          [(p) => p.difficulty === tier && far(p) && p.type === 'street', 1]);
      }
      let pick = null;
      for (const [test, min] of tries) {
        const pool = sorted.filter((p) => !used.has(p.id) && !usedNames.has(p.name.ro) && test(p));
        if (pool.length >= min) { pick = pool[Math.floor(rng() * pool.length)]; break; }
      }
      if (!pick) break;
      used.add(pick.id);
      usedNames.add(pick.name.ro);
      chosen.push(pick);
    }
    return chosen;
  }

  /** Same five for everyone on a given date; avoids what the previous two weeks served. */
  function dailyPuzzles(all, date) {
    const base = (d) => pickPuzzles(all, 'daily', mulberry32(seedFrom('melyikutca:' + d)));
    const recent = new Set();
    const day = new Date(date + 'T12:00:00Z');
    for (let i = 1; i <= 14; i++) {
      const d = new Date(day.getTime() - i * 864e5).toISOString().slice(0, 10);
      base(d).forEach((p) => recent.add(p.id));
    }
    return pickPuzzles(all, 'daily', mulberry32(seedFrom('melyikutca:' + date)), recent);
  }

  // ------------------------------------------------------------------ state
  const state = {
    lang: store.get('lang', 'hu') === 'ro' ? 'ro' : 'hu',
    diff: store.get('diff', 'medium'),
    data: null,
    mode: null, date: null,
    puzzles: [], round: 0, results: [],
    guess: null, hints: 0, revealed: false,
  };
  if (!TIERS.includes(state.diff)) state.diff = 'medium';
  const t = (k, ...a) => { const v = I18N[state.lang][k]; return typeof v === 'function' ? v(...a) : v; };

  function applyLang() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    refreshStart();
    if (screen() === 'game') { updateRoundMeta(); updateHintUI(); if (state.revealed) fillReveal(); setTypeChip(); }
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
      if (state.revealed) return;
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
  function startGame(mode) {
    const all = state.data.puzzles;
    state.mode = mode;
    state.date = todayStr();
    if (mode === 'daily') {
      state.puzzles = dailyPuzzles(all, state.date);
    } else {
      state.puzzles = pickPuzzles(all, mode, mulberry32((Math.random() * 2 ** 32) >>> 0));
    }
    state.round = 0;
    state.results = [];
    show('game');
    initMap();
    map.invalidateSize();
    startRound();
  }

  function setTypeChip() {
    const p = state.puzzles[state.round];
    $('#type-chip').textContent = t('types')[p.type];
  }

  function updateRoundMeta() {
    const total = state.results.reduce((a, r) => a + r.points, 0);
    $('#round-meta').innerHTML = `${t('round', state.round + 1)} · <b>${fmt(total)}</b>`;
  }

  function startRound() {
    const p = state.puzzles[state.round];
    state.guess = null; state.hints = 0; state.revealed = false;
    const sg = $('#screen-game');
    sg.classList.remove('placed', 'revealed');
    $('#reveal').hidden = true;
    $('#guess-btn').disabled = true;
    $('#hint-text').textContent = '';
    if (guessMarker) { guessMarker.remove(); guessMarker = null; }
    if (revealLayer) { revealLayer.remove(); revealLayer = null; }
    map.dragging.enable();
    setTypeChip();
    updateRoundMeta();
    updateHintUI();
    requestAnimationFrame(() => {
      map.invalidateSize();
      resetView();
      drawCurrent(true);
    });
  }

  function drawCurrent(animate) {
    const p = state.puzzles[state.round];
    const svg = $('#silhouette');
    renderSilhouette(svg, p, { animate, top: 22 });
    svg.setAttribute('aria-label', t('types')[p.type]);
  }

  function stripPrefix(name) {
    return name.replace(/^(strada|str\.|bulevardul|b-dul|calea|piața|piata|aleea|intrarea|pasajul|splaiul|drumul|șoseaua|fundătura|fundacul|ulița)\s+/i, '').trim();
  }

  function hintLetter(p) {
    let n;
    if (p.type === 'blocks') {
      const s = p.street || { hu: '', ro: '' };
      n = state.lang === 'hu' ? (s.hu || s.ro) : (s.ro || s.hu);
    } else {
      n = p.name[state.lang] || p.name.hu || p.name.ro;
    }
    n = stripPrefix(n || '');
    return n ? n[0].toUpperCase() : '?';
  }

  function updateHintUI() {
    const p = state.puzzles[state.round];
    const btn = $('#hint-btn');
    if (state.hints >= 2) {
      btn.innerHTML = `${t('hint')}<small>${t('noMoreHints')}</small>`;
      btn.disabled = true;
    } else {
      btn.innerHTML = `${t('hint')}<small>${t('hintCost', HINT_COST[state.hints])}</small>`;
      btn.disabled = state.revealed;
    }
    const lines = [];
    if (state.hints >= 1) {
      const h = p.hood && (p.hood[state.lang] || p.hood.hu);
      lines.push(h ? t('hood', h) : t('hoodUnknown'));
    }
    if (state.hints >= 2) lines.push(t('letter', hintLetter(p)));
    $('#hint-text').innerHTML = lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function useHint() {
    if (state.revealed || state.hints >= 2) return;
    state.hints++;
    updateHintUI();
  }

  function submitGuess() {
    if (!state.guess || state.revealed) return;
    const p = state.puzzles[state.round];
    const { d, nearest } = distanceToShape(state.guess, p);
    const base = scoreForDistance(d);
    const penalty = HINT_COST.slice(0, state.hints).reduce((a, b) => a + b, 0);
    const points = Math.max(0, base - penalty);
    state.results.push({ id: p.id, d, base, penalty, points, hints: state.hints });
    state.revealed = true;
    $('#screen-game').classList.add('revealed');
    guessMarker.dragging.disable();

    // Draw the real shape in place, plus the guess→nearest-point line.
    revealLayer = L.layerGroup().addTo(map);
    const ink = '#1a2233', pencil = '#d2452b';
    let shape;
    if (p.kind === 'area') {
      shape = L.polygon(p.geom, { color: ink, weight: 2, fillColor: ink, fillOpacity: 0.55, interactive: false });
    } else {
      shape = L.polyline(p.geom, { color: ink, weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round', interactive: false });
    }
    shape.addTo(revealLayer);
    if (d > 0) {
      L.polyline([state.guess, nearest], { color: pencil, weight: 2.5, dashArray: '6 6', interactive: false }).addTo(revealLayer);
      L.marker(nearest, { icon: L.divIcon({ className: 'near-dot', iconSize: [0, 0] }), interactive: false }).addTo(revealLayer);
    }
    const bounds = shape.getBounds().extend(state.guess);
    updateRoundMeta();
    updateHintUI();
    fillReveal();
    $('#reveal').hidden = false;
    requestAnimationFrame(() => {
      const rh = $('#reveal').offsetHeight;
      const mapBottom = $('#map').getBoundingClientRect().bottom;
      // The card is still sliding in, so measure where it will rest, not where it is.
      const cardTop = $('#screen-game').getBoundingClientRect().bottom - rh;
      $('#screen-game').style.setProperty('--rv-lift', `${Math.max(0, mapBottom - cardTop)}px`);
      map.flyToBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [40, rh + 24], maxZoom: 17, duration: 0.8 });
    });
  }

  function fillReveal() {
    const p = state.puzzles[state.round];
    const r = state.results[state.round];
    if (!r) return;
    const main = p.name[state.lang] || p.name.hu;
    const alt = state.lang === 'hu' ? p.name.ro : p.name.hu;
    $('#rv-name').textContent = main;
    const extra = p.type === 'blocks' && p.count ? ` · ${t('blocksN', p.count)}` : '';
    $('#rv-alt').textContent = (alt && alt !== main ? alt : '') + extra;
    $('#rv-pts').textContent = fmt(r.points);
    let dist = r.d === 0 ? `<b>${t('onShape')}</b>` : t('distance', fmtDist(r.d));
    if (r.penalty) dist += `<br>${t('hintPenalty', fmt(r.penalty))}`;
    $('#rv-dist').innerHTML = dist;
    $('#next-btn').textContent = state.round + 1 < state.puzzles.length ? t('next') : t('finish');
  }

  function nextRound() {
    if (state.round + 1 < state.puzzles.length) {
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
      const p = state.puzzles[i];
      const li = document.createElement('li');
      li.style.animationDelay = `${i * 70}ms`;
      const svg = document.createElementNS(SVGNS, 'svg');
      li.appendChild(svg);
      renderSilhouette(svg, p, { width: 52, height: 52, pad: 6, scaleBar: false, stroke: 2.5 });
      const mid = document.createElement('div');
      mid.innerHTML = `<div class="er-name"></div><div class="er-sub"></div>`;
      mid.querySelector('.er-name').textContent = p.name[state.lang] || p.name.hu;
      mid.querySelector('.er-sub').textContent = `${t('types')[p.type]} · ${r.d === 0 ? '0 m' : fmtDist(r.d)}`;
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
  window.MelyikUtca = { scoreForDistance, distanceToShape, renderSilhouette, pickPuzzles, dailyPuzzles, mulberry32, seedFrom, state, get map() { return map; } };

  load();
})();
