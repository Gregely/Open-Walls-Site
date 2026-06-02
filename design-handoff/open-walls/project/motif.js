/* ============================================================
   motif.js — nested concentric rotated squares (Open Walls motif)
   Builds hand-placed-feeling stacks of nested squares using brand colours.
   ============================================================ */
(function () {
  const PALETTE = [
    '#f5c800', '#e8a41c', '#f4821f', '#d94f2b', '#b5446a',
    '#8c4f8b', '#5b4fa0', '#2b9fd4', '#2aa8a0', '#3fad5c', '#9b9490'
  ];

  // tiny seeded RNG so layouts are stable across re-renders
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pick(rand, arr, exclude) {
    let c;
    do { c = arr[Math.floor(rand() * arr.length)]; } while (c === exclude && arr.length > 1);
    return c;
  }

  /**
   * makeStack(opts)
   *  size    : px of outer square
   *  layers  : number of nested squares (default 4–5)
   *  seed    : number for deterministic colours/rotation
   *  jitter  : per-layer rotation spread in deg
   *  baseRot : rotation of the whole stack
   */
  function makeStack(opts) {
    opts = opts || {};
    const size = opts.size || 120;
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 99999);
    const rand = rng(seed);
    const layers = opts.layers || (4 + Math.floor(rand() * 2));
    const jitter = opts.jitter != null ? opts.jitter : 7;
    const baseRot = opts.baseRot != null ? opts.baseRot : (rand() * 18 - 9);

    const root = document.createElement('div');
    root.className = 'stack';
    root.style.position = root.style.position || 'relative';
    root.style.width = size + 'px';
    root.style.height = size + 'px';
    root.style.transform = 'rotate(' + baseRot.toFixed(2) + 'deg)';
    root.style.setProperty('--rot', baseRot.toFixed(2) + 'deg');
    root.setAttribute('aria-hidden', 'true');

    let prevColor = null;
    for (let i = 0; i < layers; i++) {
      const t = i / layers;                 // 0 outer -> 1 inner
      const dim = size * (1 - t * 0.82);     // shrink toward centre
      const sq = document.createElement('div');
      const col = pick(rand, PALETTE, prevColor);
      prevColor = col;
      const rot = (rand() * 2 - 1) * jitter;
      sq.style.cssText =
        'position:absolute;left:50%;top:50%;' +
        'width:' + dim.toFixed(1) + 'px;height:' + dim.toFixed(1) + 'px;' +
        'background:' + col + ';' +
        'transform:translate(-50%,-50%) rotate(' + rot.toFixed(2) + 'deg);';
      root.appendChild(sq);
    }
    return root;
  }

  // place a stack absolutely inside a host (% coords)
  function place(host, opts) {
    const s = makeStack(opts);
    s.style.left = (opts.x != null ? opts.x : 0) + '%';
    s.style.top = (opts.y != null ? opts.y : 0) + '%';
    s.style.setProperty('--dur', (7 + Math.random() * 6).toFixed(1) + 's');
    s.style.setProperty('--delay', (-Math.random() * 6).toFixed(1) + 's');
    host.appendChild(s);
    return s;
  }

  window.OWMotif = { makeStack, place, PALETTE };
})();
