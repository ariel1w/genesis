(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveal on scroll (stagger siblings) ----
  const revealEls = document.querySelectorAll('.reveal, .reveal-img, .flourish:not(.hero-in)');
  const groups = new Map();
  revealEls.forEach(el => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    el.style.setProperty('--rd', Math.min(i * 0.06, 0.18) + 's');
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
          vx: (Math.random() - 0.5) * 0.15, a: Math.random() * 0.35 + 0.12,
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
  const media = matchMedia('(min-width: 1001px) and (min-height: 540px) and (prefers-reduced-motion: no-preference)');
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
    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 1.05, smoothWheel: true, syncTouch: false, anchors: { duration: 1.3, easing: soft }, autoRaf: true });
    const sections = [...document.querySelectorAll('body > header, body > section, body > footer')];
    let landing = false, moving = false, guard;
    const settle = () => {
      const y = lenis.scroll, h = innerHeight;
      const boxes = sections.map(s => { const r = s.getBoundingClientRect(); return { top: r.top + scrollY, height: r.height }; });
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

  // ---- pause decorative motion off screen ----
  const pauseIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)));
  document.querySelectorAll('.hero, .divider, .aiteam, .close').forEach(s => pauseIO.observe(s));

  // ---- music (quiet, whole site; same behaviour as The Box's sound) ----
  // Browsers refuse sound until the visitor clicks or presses a key, so autoplay is tried first,
  // then the first click/key anywhere starts it. "Sound off" is remembered for the visit.
  const LEVEL = 0.35, IN = 2500, OUT = 1200, KEY = 'genesis-sound';
  const btns = [...document.querySelectorAll('.sound')];
  const music = new Audio('audio/music.m4a?v=1');
  music.loop = true; music.preload = 'auto'; music.volume = 0;
  let ramp = 0, wanted = false;
  const isOff = () => { try { return sessionStorage.getItem(KEY) === 'off'; } catch { return false; } };
  let playing = false;
  const show = on => { playing = on; btns.forEach(b => { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); b.querySelector('.sound-label').textContent = on ? 'Sound on' : 'Sound off'; }); };
  function rampTo(target, ms, then) {
    cancelAnimationFrame(ramp);
    const from = music.volume, t0 = performance.now();
    const tick = t => {
      const k = Math.min(1, (t - t0) / ms);
      music.volume = Math.min(1, Math.max(0, from + (target - from) * k));
      if (k < 1) ramp = requestAnimationFrame(tick); else then && then();
    };
    ramp = requestAnimationFrame(tick);
  }
  async function start() {
    if (isOff()) return false;
    wanted = true;
    try { await music.play(); } catch { return false; }
    rampTo(LEVEL, IN); show(true); return true;
  }
  function fade() { wanted = false; if (!music.paused) rampTo(0, OUT, () => music.pause()); show(false); }
  const gesture = e => { if (e.target.closest && e.target.closest('.sound')) return; disarm(); start(); };
  const arm = () => { document.addEventListener('pointerdown', gesture, true); document.addEventListener('keydown', gesture, true); };
  const disarm = () => { document.removeEventListener('pointerdown', gesture, true); document.removeEventListener('keydown', gesture, true); };
  btns.forEach(btn => btn.addEventListener('click', () => {
    if (playing) { fade(); try { sessionStorage.setItem(KEY, 'off'); } catch {} }
    else { try { sessionStorage.removeItem(KEY); } catch {} disarm(); start(); }
  }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (wanted) rampTo(0, 400, () => music.pause()); }
    else if (wanted) music.play().then(() => rampTo(LEVEL, IN)).catch(() => {});
  });
  // ---- password gate: pressing Enter is also the gesture that lets the music start ----
  const HASH = 'adc44c23914c67a80d9854a9eb2cb2b260817c1e45f0bdb4449c955a9c493c90';
  const gate = document.querySelector('.gate'), form = gate.querySelector('form'), pw = gate.querySelector('input'), err = gate.querySelector('.gate-error');
  const gated = () => document.documentElement.classList.contains('gated');
  function cinematicEntrance() {
    const title = hero.querySelector('.wordmark .gold-text');
    if (!title.children.length) {
      const letters = [...title.textContent];
      title.textContent = '';
      letters.forEach((letter, i) => {
        const span = document.createElement('span');
        span.className = 'intro-letter';
        span.textContent = letter;
        span.style.setProperty('--letter-delay', `${.65 + i * .025}s`);
        span.setAttribute('aria-hidden', 'true');
        title.append(span);
      });
    }
    hero.classList.add('cinematic');
  }
  async function sha(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  if (gated()) {
    window.__lenis && window.__lenis.stop();
    setTimeout(() => pw.focus(), 400);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!isOff()) { wanted = true; music.play().catch(() => {}); }   // inside the gesture, silent until the ramp
      if ((await sha(pw.value.trim())) !== HASH) {
        music.pause(); wanted = false;
        err.textContent = 'Incorrect password';
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        pw.select(); return;
      }
      try { sessionStorage.setItem('genesis-in', '1'); } catch {}
      if (!isOff()) start();
      gate.classList.add('leaving');
      cinematicEntrance();
      form.querySelector('button').disabled = true;
      setTimeout(() => {
        document.documentElement.classList.remove('gated');
        window.__lenis && window.__lenis.start();
        scrollTo(0, 0);
      }, reduce ? 0 : 250);
      setTimeout(() => {
        gate.remove();
        hero.setAttribute('tabindex', '-1');
        hero.focus({ preventScroll: true });
      }, reduce ? 0 : 1600);
    });
  } else {
    gate.remove();
    cinematicEntrance();
    start().then(ok => { if (!ok && !isOff()) arm(); });
  }

  // ---- chapters menu (phones and tablets) ----
  const chapters = document.querySelector('.chapters');
  const menuBtns = [...document.querySelectorAll('.menu-btn')];
  const chLinks = [...chapters.querySelectorAll('a[href^="#"]')];
  const chTargets = chLinks.map(a => document.querySelector(a.getAttribute('href')));
  let menuState = false, pendingJump = null;
  function markHere() {
    const line = innerHeight * 0.35;
    let cur = -1;
    chTargets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= line) cur = i; });
    chLinks.forEach((a, i) => a.classList.toggle('here', i === cur));
  }
  function openMenu() {
    if (menuState) return;
    markHere();
    chapters.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => chapters.classList.add('open')));
    document.documentElement.classList.add('menu-open');
    menuBtns.forEach(b => b.setAttribute('aria-expanded', 'true'));
    menuState = true;
    history.pushState({ genesisMenu: 1 }, '');
    const here = chapters.querySelector('a.here');
    here && here.scrollIntoView({ block: 'center' });
  }
  function hideMenu() {
    if (!menuState) return;
    menuState = false;
    chapters.classList.remove('open');
    document.documentElement.classList.remove('menu-open');
    menuBtns.forEach(b => b.setAttribute('aria-expanded', 'false'));
    setTimeout(() => { if (!menuState) chapters.hidden = true; }, 450);
    if (pendingJump) {
      const t = pendingJump; pendingJump = null;
      requestAnimationFrame(() => t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
    }
  }
  const closeMenu = () => { if (history.state && history.state.genesisMenu) history.back(); else hideMenu(); };
  addEventListener('popstate', hideMenu);   // the phone's back gesture closes the menu
  menuBtns.forEach(b => b.addEventListener('click', openMenu));
  chapters.querySelector('.chapters-close').addEventListener('click', closeMenu);
  chapters.addEventListener('click', e => { if (e.target === chapters) closeMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuState) closeMenu(); });
  chLinks.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); pendingJump = chTargets[i]; closeMenu(); }));

  // ---- gentle settle on phones and tablets ----
  // When the finger is off the glass and the momentum has stopped, a section top that is close
  // glides into place under the bar. Anywhere else nothing moves.
  const touchMedia = matchMedia('(max-width: 1000px) and (prefers-reduced-motion: no-preference)');
  const SNAP_REACH = 0.22, IDLE = 170;
  let touching = false, settling = false, idleTimer = 0, settleGuard = 0;
  addEventListener('touchstart', () => { touching = true; settling = false; clearTimeout(idleTimer); }, { passive: true });
  addEventListener('touchend', () => { touching = false; clearTimeout(idleTimer); idleTimer = setTimeout(settleNow, IDLE); }, { passive: true });
  addEventListener('scroll', () => {
    if (!touchMedia.matches || settling) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settleNow, IDLE);
  }, { passive: true });
  function settleNow() {
    if (!touchMedia.matches || touching || settling || menuState || document.documentElement.classList.contains('gated')) return;
    const y = scrollY, bar = nav.offsetHeight, h = innerHeight;
    const max = document.documentElement.scrollHeight - h;
    let best = null;
    document.querySelectorAll('body > header, body > section, body > footer').forEach(s => {
      const top = s.getBoundingClientRect().top + y;
      const t = Math.min(max, Math.max(0, top === 0 ? 0 : top - bar));
      if (best === null || Math.abs(t - y) < Math.abs(best - y)) best = t;
    });
    if (best === null || Math.abs(best - y) < 3 || Math.abs(best - y) > h * SNAP_REACH) return;
    settling = true;
    scrollTo({ top: best, behavior: 'smooth' });
    clearTimeout(settleGuard);
    settleGuard = setTimeout(() => { settling = false; }, 900);
  }

  // ---- lightbox ----
  const lb = document.querySelector('.lightbox');
  const lbImg = lb.querySelector('img');
  let lbTrigger, closeTimer;
  document.querySelectorAll('[data-full]').forEach(b => b.addEventListener('click', () => {
    clearTimeout(closeTimer);
    lb.classList.remove('closing');
    lbTrigger = b;
    lbImg.src = b.dataset.full; lbImg.alt = b.querySelector('img').alt;
    lb.showModal();
    document.documentElement.classList.add('image-open');
    window.__lenis && window.__lenis.stop();
  }));
  const closeLb = () => {
    if (!lb.open || lb.classList.contains('closing')) return;
    lb.classList.add('closing');
    closeTimer = setTimeout(() => lb.close(), reduce ? 0 : 220);
  };
  lb.addEventListener('close', () => {
    lbImg.removeAttribute('src');
    lb.classList.remove('closing');
    document.documentElement.classList.remove('image-open');
    window.__lenis && window.__lenis.start();
    lbTrigger && lbTrigger.focus({ preventScroll: true });
  });
  lb.querySelector('.lb-close').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  lb.addEventListener('cancel', e => { e.preventDefault(); closeLb(); });
})();
