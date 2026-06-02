/* ============================================================
   app.js — Open Walls: content render, motifs, reveals, nav
   ============================================================ */
(function () {
  const M = window.OWMotif;

  /* ---------- past shows data (placeholder Cork shows, easy to swap) ---------- */
  const PAST = [
    { vol: 'Vol. 11', date: 'May 2026',  loc: 'Nash 19 · Princes St',         accent: '#d94f2b', seed: 12 },
    { vol: 'Vol. 10', date: 'Apr 2026',  loc: 'The Guesthouse · MacCurtain',   accent: '#2aa8a0', seed: 7  },
    { vol: 'Vol. 9',  date: 'Mar 2026',  loc: 'Plugd Records · Triskel',       accent: '#f4821f', seed: 23 },
    { vol: 'Vol. 8',  date: 'Feb 2026',  loc: 'The Kino · Washington St',      accent: '#5b4fa0', seed: 41 },
    { vol: 'Vol. 7',  date: 'Jan 2026',  loc: 'Sample Studios · Churchfield',  accent: '#2b9fd4', seed: 5  },
    { vol: 'Vol. 6',  date: 'Dec 2025',  loc: 'The Roundy · Castle St',        accent: '#3fad5c', seed: 33 },
    { vol: 'Vol. 5',  date: 'Nov 2025',  loc: 'Cork Coffee Roasters',          accent: '#8c4f8b', seed: 18 },
    { vol: 'Vol. 4',  date: 'Oct 2025',  loc: 'Crane Lane · Phoenix St',       accent: '#f5c800', seed: 9  }
  ];

  function renderPast() {
    const grid = document.getElementById('past-grid');
    if (!grid) return;
    PAST.forEach(function (s, i) {
      const a = document.createElement('a');
      a.className = 'card reveal';
      a.setAttribute('data-d', String((i % 3) + 1));
      a.href = 'mailto:openwallscork@gmail.com?subject=' + encodeURIComponent('Open Walls ' + s.vol + ' — ' + s.title);
      a.style.setProperty('--card-accent', s.accent);

      const vol = document.createElement('span');
      vol.className = 'card__vol';
      vol.textContent = s.vol;

      const thumb = document.createElement('div');
      thumb.className = 'card__thumb';
      thumb.appendChild(M.makeStack({ size: 118, seed: s.seed, layers: 5, jitter: 8 }));

      const dateEl = document.createElement('p');
      dateEl.className = 'card__date';
      dateEl.textContent = s.date;

      const locEl = document.createElement('p');
      locEl.className = 'card__loc';
      locEl.textContent = s.loc;

      a.appendChild(vol);
      a.appendChild(thumb);
      a.appendChild(dateEl);
      a.appendChild(locEl);
      grid.appendChild(a);
    });
  }

  /* ---------- motif placements ---------- */
  function placeMotifs() {
    // nav mark — tiny stack
    const navMark = document.getElementById('nav-mark');
    if (navMark) {
      const s = M.makeStack({ size: 30, seed: 88, layers: 4, jitter: 6, baseRot: -8 });
      s.style.position = 'relative';
      navMark.appendChild(s);
    }

    // hero scattered stacks
    const hero = document.getElementById('hero-motifs');
    if (hero) {
      M.place(hero, { x: 78, y: 12, size: 190, seed: 101, jitter: 9 });
      M.place(hero, { x: 86, y: 58, size: 130, seed: 202, jitter: 7 });
      M.place(hero, { x: 4,  y: 70, size: 150, seed: 303, jitter: 8 });
      M.place(hero, { x: 64, y: 80, size: 92,  seed: 404, jitter: 10 });
      M.place(hero, { x: 30, y: 4,  size: 70,  seed: 505, jitter: 11 });
    }

    // divider row
    const div1 = document.getElementById('divider-1');
    if (div1) {
      const seeds = [11, 27, 5, 44, 19, 8, 31];
      seeds.forEach(function (sd, i) {
        div1.appendChild(M.makeStack({ size: 46 + (i % 3) * 14, seed: sd, layers: 4, jitter: 9 }));
      });
    }

    // about big stack
    const aboutStack = document.getElementById('about-stack');
    if (aboutStack) {
      aboutStack.appendChild(M.makeStack({ size: 260, seed: 777, layers: 6, jitter: 7, baseRot: 6 }));
    }

    // footer motifs
    const foot = document.getElementById('footer-motifs');
    if (foot) {
      M.place(foot, { x: -3, y: 10, size: 120, seed: 61, jitter: 9 });
      M.place(foot, { x: 88, y: 30, size: 150, seed: 72, jitter: 8 });
      M.place(foot, { x: 40, y: 62, size: 80,  seed: 83, jitter: 10 });
      M.place(foot, { x: 70, y: 4,  size: 60,  seed: 94, jitter: 11 });
    }
  }

  /* ---------- scroll-driven reveals + nav spy ----------
     IntersectionObserver is unreliable in embedded preview frames,
     so we drive everything off a throttled scroll/resize check. */
  let reveals = [];
  let navSections = [];
  let navLinks = {};

  function onScroll() {
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // reveals: show once element enters the lower 92% of viewport
    for (let i = reveals.length - 1; i >= 0; i--) {
      const el = reveals[i];
      const top = el.getBoundingClientRect().top;
      if (top < vh * 0.92) {
        el.classList.add('in');
        reveals.splice(i, 1);
      }
    }

    // nav spy: section whose top is closest above the 40%-viewport line
    let current = null;
    const line = vh * 0.4;
    navSections.forEach(function (s) {
      const r = s.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) current = s.id;
    });
    Object.keys(navLinks).forEach(function (k) {
      navLinks[k].classList.toggle('active', k === current);
    });
  }

  let ticking = false;
  function requestScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }

  function setupReveals() {
    reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  }

  function setupNav() {
    navSections = ['upcoming', 'past', 'about']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    document.querySelectorAll('.nav__links a[data-link]').forEach(function (a) {
      navLinks[a.dataset.link] = a;
    });
    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);
    onScroll();
    // Safety net: poll bounding rects so reveals + nav spy work even where
    // scroll events / IntersectionObserver are unreliable (embedded previews).
    const poll = setInterval(onScroll, 200);
    setTimeout(function () { clearInterval(poll); }, 60000);
    // Hard fallback: never leave content trapped invisible in environments
    // that don't expose intra-frame scroll. Reveal anything still hidden.
    setTimeout(revealAll, 1500);
  }

  function revealAll() {
    reveals.forEach(function (el) { el.classList.add('in'); });
    reveals = [];
  }

  function init() {
    window.__owInit = true;
    renderPast();
    placeMotifs();
    setupReveals();
    setupNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
