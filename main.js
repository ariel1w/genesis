(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveal on scroll (stagger siblings) ----
  const revealEls = document.querySelectorAll('.reveal, .reveal-img, .flourish:not(.hero-in)');
  const groups = new Map();
  revealEls.forEach(el => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    el.style.setProperty('--rd', Math.min(i * 0.12, 0.6) + 's');
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.querySelector && e.target.querySelector('[data-count]')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  revealEls.forEach(el => io.observe(el));

  // ---- stat counters ----
  function countUp(root) {
    root.querySelectorAll('[data-count]').forEach(el => {
      const end = +el.dataset.count, suffix = el.dataset.suffix || '';
      if (reduce) { el.textContent = end + suffix; return; }
      const t0 = performance.now(), dur = 1800;
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur), v = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * v) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0' + suffix;
      requestAnimationFrame(tick);
    });
  }

  // ---- nav, progress, parallax ----
  const nav = document.querySelector('.topnav');
  const bar = document.querySelector('.progress span');
  const hero = document.querySelector('.hero');
  const para = [...document.querySelectorAll('.parallax')];
  const links = [...document.querySelectorAll('.topnav-links a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href')));
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('show', y > hero.offsetHeight * 0.7);
    if (!reduce) {
      for (const img of para) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        // slow push-in, pinned to the top edge so heads never leave the frame
        const k = Math.max(-0.5, Math.min(0.5, (r.top + r.height / 2 - vh / 2) / (vh + r.height)));
        img.style.transform = `scale(${(1 + (k + 0.5) * 0.12).toFixed(4)})`;
      }
    }
    let cur = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < vh * 0.4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // ---- golden dust ----
  if (!reduce) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const sc = sprite.getContext('2d'), sg = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    sg.addColorStop(0, 'rgba(255,238,190,1)');
    sg.addColorStop(0.3, 'rgba(240,196,110,.5)');
    sg.addColorStop(1, 'rgba(240,196,110,0)');
    sc.fillStyle = sg; sc.fillRect(0, 0, 32, 32);
    document.querySelectorAll('canvas.dust').forEach(cv => {
      const ctx = cv.getContext('2d');
      let w, h, dpr, parts = [], visible = false, raf = 0;
      const count = cv.closest('.hero') ? 90 : 55;
      function size() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = cv.clientWidth; h = cv.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function mk(randomY) {
        return {
          x: Math.random() * w, y: randomY ? Math.random() * h : h + 10,
          r: Math.random() * 1.8 + 0.4, vy: -(Math.random() * 0.35 + 0.08),
          vx: (Math.random() - 0.5) * 0.15, a: Math.random() * 0.6 + 0.2,
          tw: Math.random() * Math.PI * 2, ts: Math.random() * 0.03 + 0.008
        };
      }
      size();
      for (let i = 0; i < count; i++) parts.push(mk(true));
      function frame() {
        ctx.clearRect(0, 0, w, h);
        for (const p of parts) {
          p.x += p.vx + Math.sin(p.tw) * 0.12; p.y += p.vy; p.tw += p.ts;
          if (p.y < -10 || p.x < -10 || p.x > w + 10) Object.assign(p, mk(false));
          ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
          const s = p.r * 8;
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
        }
        if (visible) raf = requestAnimationFrame(frame);
      }
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(frame);
      }).observe(cv);
      addEventListener('resize', size);
    });
  }

  // ---- smooth glide + soft landing (same feel as The Box) ----
  const REACH = 0.28, LAND = 0.95;
  const soft = t => 1 - Math.pow(1 - t, 4);
  const media = matchMedia('(min-width: 801px) and (prefers-reduced-motion: no-preference)');
  let stopGlide = () => {};
  function glide() {
    stopGlide();
    if (!media.matches || !window.Lenis) {
      document.querySelectorAll('a[href^="#"]').forEach(a => a.onclick = null);
      document.documentElement.style.scrollBehavior = reduce ? 'auto' : 'smooth';
      stopGlide = () => {};
      return;
    }
    document.documentElement.style.scrollBehavior = 'auto';
    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 1.05, smoothWheel: true, syncTouch: false, anchors: { duration: 1.3, easing: soft, offset: -nav.offsetHeight }, autoRaf: true });
    const sections = [...document.querySelectorAll('body > header, body > section, body > footer')];
    let landing = false, moving = false, guard;
    const settle = () => {
      const y = lenis.scroll, h = innerHeight;
      const bar = nav.offsetHeight;
      const boxes = sections.map(s => { const r = s.getBoundingClientRect(), t = r.top + scrollY; return { top: t === 0 ? 0 : t - bar, height: r.height }; });
      // inside a tall section, past its entry: read freely until the next one is close
      const reading = boxes.some(b => b.height > h + 2 && y > b.top + h * REACH && y < b.top + b.height - h * REACH);
      if (reading) return;
      let best = null;
      for (const b of boxes) {
        const top = Math.min(lenis.limit, Math.max(0, b.top));
        if (best === null || Math.abs(top - y) < Math.abs(best - y)) best = top;
      }
      if (best === null || Math.abs(best - y) < 2 || Math.abs(best - y) > h * REACH) return;
      landing = true;
      const release = () => { landing = false; };
      guard = setTimeout(release, LAND * 1000 + 200);
      lenis.scrollTo(best, { duration: LAND, easing: soft, onComplete: () => { clearTimeout(guard); release(); } });
    };
    const onLenis = ({ velocity }) => {
      if (landing) return;
      if (Math.abs(velocity) > 0.05) { moving = true; return; }
      if (moving) { moving = false; settle(); }
    };
    lenis.on('scroll', onLenis);
    window.__lenis = lenis;
    stopGlide = () => { clearTimeout(guard); lenis.off('scroll', onLenis); lenis.destroy(); delete window.__lenis; };
  }
  glide();
  media.addEventListener('change', glide);

  // ---- lightbox ----
  const lb = document.querySelector('.lightbox');
  const lbImg = lb.querySelector('img');
  document.querySelectorAll('[data-full]').forEach(b => b.addEventListener('click', () => {
    lbImg.src = b.dataset.full; lbImg.alt = b.querySelector('img').alt; lb.hidden = false; window.__lenis && window.__lenis.stop();
  }));
  const closeLb = () => { lb.hidden = true; lbImg.src = ''; window.__lenis && window.__lenis.start(); };
  lb.addEventListener('click', closeLb);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });
})();
