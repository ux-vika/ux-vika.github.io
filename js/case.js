/* Страницы кейсов: появление блоков при прокрутке, сдвиг градиента за скроллом,
   просмотр картинок на весь экран. Без библиотек.
   Движение — характер Premium: входы 500–800ms с мягким торможением, выходы короче. */

(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
  const EASE_IO = 'cubic-bezier(.4, 0, .2, 1)';

  /* ---------- 1. Прогресс прокрутки для градиента (--sy от 0 до 1) ---------- */

  const root = document.documentElement;
  let ticking = false;
  function updateScroll() {
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--sy', (max > 0 ? window.scrollY / max : 0).toFixed(4));
    ticking = false;
  }
  // градиент идёт от верха страницы до названия кейса
  function setGlow() {
    const t = document.querySelector('.title');
    if (t) root.style.setProperty('--glow-h', Math.round(t.getBoundingClientRect().top + window.scrollY) + 'px');
  }
  setGlow();
  window.addEventListener('load', setGlow);
  window.addEventListener('resize', setGlow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setGlow);

  if (!reduce) {
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); }
    }, { passive: true });
    updateScroll();
  }

  /* ---------- 2. Появление блоков ---------- */

  const candidates = Array.from(document.querySelectorAll(
    '.title, .h-sub, .h2, .h3, .solution__h, .meta__col, .text, .list, .panel, .stat, ' +
    '.hyp__head, .cols-2 > div, .next, .pic'
  )).filter((el) => !el.closest('.hero'));

  // вложенные блоки не анимируем второй раз: выезжает только внешний
  const blocks = candidates.filter((el) => !candidates.some((o) => o !== el && o.contains(el)));

  if (reduce || !('IntersectionObserver' in window)) {
    blocks.forEach((el) => el.classList.add('is-in'));
  } else {
    blocks.forEach((el) => el.classList.add('rv'));
    const io = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      visible.forEach((e, i) => {
        // блоки, вошедшие в экран вместе, идут каскадом: 70ms шаг, не больше 280ms
        e.target.style.setProperty('--d', Math.min(i * 70, 280) + 'ms');
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    blocks.forEach((el) => io.observe(el));
  }

  /* ---------- 3. Картинки на весь экран ---------- */

  const pics = Array.from(document.querySelectorAll('.pic'));
  if (!pics.length || typeof Element.prototype.animate !== 'function') return;

  pics.forEach((pic) => {
    const img = pic.querySelector('img');
    pic.tabIndex = 0;
    pic.setAttribute('role', 'button');
    pic.setAttribute('aria-label', 'Открыть на весь экран: ' + ((img && img.alt) || 'изображение'));
  });

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Просмотр изображения');
  lb.innerHTML =
    '<div class="lb__bg"></div>' +
    '<img class="lb__img" alt="">' +
    '<button class="lb__close" type="button" aria-label="Закрыть">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
    '</button>';
  document.body.appendChild(lb);

  const bg = lb.querySelector('.lb__bg');
  const big = lb.querySelector('.lb__img');
  const closeBtn = lb.querySelector('.lb__close');

  let state = 'closed';   // closed | opening | open | closing
  let current = null;     // открытая картинка (.pic)
  let anims = [];

  function intersect(a, b) {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
  }
  const rectOf = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });

  function offset(pos, free) {
    // object-position: «50% 50%» или «0px 0px»
    if (pos.endsWith('%')) return (parseFloat(pos) / 100) * free;
    return parseFloat(pos) || 0;
  }

  // где картинка сейчас на экране: C — вся картинка, V — видимая часть, r — скругление
  function thumbGeometry(pic) {
    const img = pic.querySelector('img');
    const b = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    let C = rectOf(b);
    if (cs.objectFit === 'cover' && img.naturalWidth) {
      const s = Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      const [px, py] = cs.objectPosition.split(' ');
      C = { x: b.left + offset(px, b.width - w), y: b.top + offset(py, b.height - h), w, h };
    }
    const V = intersect(rectOf(b), rectOf(pic.getBoundingClientRect()));
    const r = parseFloat(getComputedStyle(pic).borderTopLeftRadius) || 0;
    return { C, V, r };
  }

  // куда картинка встаёт на весь экран
  function targetRect(img) {
    const pad = window.innerWidth < 700 ? 12 : 48;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const k = Math.min((window.innerWidth - pad * 2) / nw, (window.innerHeight - pad * 2) / nh, 2);
    const w = nw * k, h = nh * k;
    return { x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2, w, h };
  }

  // начальное/конечное состояние: transform + clip-path (картинка «вырастает» из своего места)
  function frameFor(T, g) {
    const f = g.C.w / T.w;
    const top = (g.V.y - g.C.y) / f, left = (g.V.x - g.C.x) / f;
    const right = (g.C.x + g.C.w - (g.V.x + g.V.w)) / f;
    const bottom = (g.C.y + g.C.h - (g.V.y + g.V.h)) / f;
    return {
      transform: `translate(${g.C.x}px, ${g.C.y}px) scale(${f})`,
      clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${g.r / f}px)`
    };
  }
  const finalFrame = (T) => ({
    transform: `translate(${T.x}px, ${T.y}px) scale(1)`,
    clipPath: 'inset(0px 0px 0px 0px round 12px)'
  });

  function lockScroll(on) {
    if (on) {
      const sb = window.innerWidth - root.clientWidth;
      root.style.overflow = 'hidden';
      if (sb > 0) document.body.style.paddingRight = sb + 'px';
    } else {
      root.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }

  const run = (el, keyframes, opts) => {
    const a = el.animate(keyframes, Object.assign({ fill: 'both' }, opts));
    anims.push(a);
    return a;
  };
  const clearAnims = () => { anims.forEach((a) => a.cancel()); anims = []; };

  async function open(pic) {
    if (state !== 'closed') return;
    const img = pic.querySelector('img');
    if (!img || !img.naturalWidth) return;
    state = 'opening';
    current = pic;

    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    // ждём декодирования, но не дольше 400ms, чтобы клик не зависал
    try { await Promise.race([big.decode(), new Promise((r) => setTimeout(r, 400))]); } catch (e) { /* уже в кэше */ }

    const g = thumbGeometry(pic);
    const T = targetRect(img);
    big.style.width = T.w + 'px';
    big.style.height = T.h + 'px';
    const from = frameFor(T, g), to = finalFrame(T);

    lockScroll(true);
    lb.classList.add('is-on');
    pic.classList.add('is-open');
    Object.assign(big.style, to);
    clearAnims();

    if (reduce) {
      bg.style.opacity = '1';
      closeBtn.style.opacity = '1';
      state = 'open';
      closeBtn.focus({ preventScroll: true });
      return;
    }

    run(bg, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: EASE_IO });
    run(closeBtn, [{ opacity: 0, translate: '0 -8px' }, { opacity: 1, translate: '0 0' }], { duration: 400, delay: 280, easing: EASE_OUT });
    const a = run(big, [from, to], { duration: 620, easing: EASE_OUT });
    closeBtn.focus({ preventScroll: true });
    try { await a.finished; } catch (e) { return; }
    if (state === 'opening') state = 'open';
  }

  async function close(instant) {
    if (state === 'closed' || state === 'closing' || !current) return;
    if (state === 'opening') anims.forEach((a) => { try { a.finish(); } catch (e) { /* ignore */ } });
    state = 'closing';
    const pic = current;
    const img = pic.querySelector('img');

    const finish = () => {
      clearAnims();
      lb.classList.remove('is-on');
      big.removeAttribute('src');
      big.removeAttribute('style');
      bg.style.opacity = '';
      closeBtn.style.opacity = '';
      pic.classList.remove('is-open');
      lockScroll(false);
      pic.focus({ preventScroll: true });
      current = null;
      state = 'closed';
    };

    if (reduce || instant) { finish(); return; }

    const T = targetRect(img);
    const g = thumbGeometry(pic);
    const from = finalFrame(T), to = frameFor(T, g);

    clearAnims();
    // выход короче входа и с ускорением к концу
    run(bg, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: EASE_IO });
    run(closeBtn, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE_IO });
    const a = run(big, [from, to], { duration: 420, easing: EASE_IO });
    try { await a.finished; } catch (e) { return; }
    finish();
  }

  pics.forEach((pic) => {
    pic.addEventListener('click', () => open(pic));
    pic.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(pic); }
    });
  });

  bg.addEventListener('click', () => close());
  big.addEventListener('click', () => close());
  closeBtn.addEventListener('click', () => close());

  document.addEventListener('keydown', (e) => {
    if (state === 'closed') return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus({ preventScroll: true }); }
  });

  window.addEventListener('resize', () => { if (state === 'open' || state === 'opening') close(true); });
})();
