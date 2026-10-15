/* Главная: заставка заголовка.
   Текст «печатается» по буквам: «Привет!», рука машет,
   затем вторая строка. Класс intro ставится в <head> и только когда движение
   не отключено. */
(function () {
  var root = document.documentElement;
  var title = document.querySelector('.hero__title');
  if (!root.classList.contains('intro') || !title) return;

  var plain = title.textContent.replace(/\s+/g, ' ').trim();
  var lines = title.innerHTML.split(/<br\s*\/?>/i).map(function (html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.trim();
  });

  var START = 0.3;      // когда начинается печать, с
  var STEP1 = 0.07;     // шаг между буквами первой строки
  var STEP2 = 0.02;     // и второй
  var WAVE = 1.0;       // сколько машет рука

  function build(text, t0, step, handDelay) {
    var t = t0;
    var html = text.split(' ').map(function (word) {
      var chars = Array.from(word).map(function (c) {
        var d = t.toFixed(3);
        t += step;
        if (c === '👋') {
          return '<span class="ch" style="--d:' + d + 's"><span class="hand" style="--wave:' + (t0 + handDelay).toFixed(2) + 's">👋</span></span>';
        }
        return '<span class="ch" style="--d:' + d + 's">' + c + '</span>';
      }).join('');
      t += step;  // пауза на пробел
      return '<span class="w">' + chars + '</span>';
    }).join(' ');
    return { html: '<span class="line">' + html + '</span>', end: t };
  }

  var first = build(lines[0], START, STEP1, 0);
  // рука начинает махать, как только появилась
  first.html = first.html.replace(/--wave:[\d.]+s/, '--wave:' + (first.end - STEP1 * 2).toFixed(2) + 's');
  var out = [first.html];
  var t2 = first.end + WAVE;
  lines.slice(1).forEach(function (l) {
    var r = build(l, t2, STEP2, 0);
    out.push(r.html);
    t2 = r.end;
  });

  title.setAttribute('aria-label', plain);
  title.innerHTML = '<span aria-hidden="true">' + out.join('') + '</span>';

  root.classList.add('intro-ready');
})();

/* Главная: фотографии тянутся за курсором.
   Смещение и наклон считаются от положения мыши над фото и догоняют курсор
   с задержкой, поэтому движение мягкое. Только для мыши. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll('.hero__photo, .about__photo, .gallery img').forEach(function (el) {
    var tx = 0, ty = 0, tr = 0;   // цель
    var x = 0, y = 0, r = 0;      // текущее
    var raf = 0;

    function tick() {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      r += (tr - r) * 0.08;
      el.style.setProperty('--mx', x.toFixed(2) + 'px');
      el.style.setProperty('--my', y.toFixed(2) + 'px');
      el.style.setProperty('--mr', r.toFixed(3) + 'deg');
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tr - r) > 0.01) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }
    function go() { if (!raf) raf = requestAnimationFrame(tick); }

    el.addEventListener('pointermove', function (e) {
      var b = el.getBoundingClientRect();
      var nx = (e.clientX - (b.left + b.width / 2)) / (b.width / 2);
      var ny = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);
      tx = nx * 9;
      ty = ny * 6;
      tr = nx * 1;
      go();
    });
    el.addEventListener('pointerleave', function () { tx = ty = tr = 0; go(); });
  });
})();

/* Главная: плывущие ленты.
   Текст на волнистых лентах (.band__text) бесконечно едет вдоль своей кривой,
   ленты по очереди идут в разные стороны, а при прокрутке разгоняются.
   Без JS и при «уменьшить движение» ленты остаются неподвижными, как в макете. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // скорость в единицах viewBox (ширина ленты = 1440) в секунду; минус — влево
  var SPEEDS = [-38, 26, -46];

  var ribbons = [];
  var running = false;
  var last = 0;
  var scrollBoost = 0;   // 0…1, затухает сам
  var lastY = window.scrollY;
  var lastScrollT = performance.now();

  function setup(text, index) {
    var tp = text.querySelector('textPath');
    if (!tp) return;
    var path = document.querySelector(tp.getAttribute('href'));
    if (!path) return;

    var raw = tp.textContent;
    var first = raw.trim().split(/\s+/)[0];
    var start = raw.indexOf(first);
    var next = raw.indexOf(first, start + first.length);
    if (next < 0) return;
    var unit = raw.slice(start, next);

    // шаг повтора = ширина двух единиц минус ширина одной (пробелы на стыке учтены точно)
    tp.removeAttribute('text-anchor');
    tp.textContent = unit;
    var w1 = text.getComputedTextLength();
    tp.textContent = unit + unit;
    var period = text.getComputedTextLength() - w1;
    if (!(period > 0)) { tp.textContent = raw; return; }

    // текста должно хватать на всю кривую плюс один шаг, иначе сбоку появится дыра
    var len = path.getTotalLength();
    var count = Math.ceil((len + period) / period) + 1;
    tp.textContent = new Array(count + 1).join(unit);

    ribbons.push({
      tp: tp,
      period: period,
      speed: SPEEDS[ribbons.length % SPEEDS.length],
      phase: Math.random() * period,
      visible: false,
      host: text.closest('.band')
    });
    tp.setAttribute('startOffset', '0');
  }

  function render(r) {
    var p = r.phase % r.period;
    var shift = r.speed < 0 ? -p : p - r.period;
    r.tp.setAttribute('startOffset', shift.toFixed(2));
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    scrollBoost *= Math.pow(0.04, dt);   // затухание ≈ за секунду
    var gain = 1 + scrollBoost * 4;
    var any = false;
    ribbons.forEach(function (r) {
      if (!r.visible) return;
      any = true;
      r.phase += Math.abs(r.speed) * gain * dt;
      render(r);
    });
    if (any) requestAnimationFrame(frame); else running = false;
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function init() {
    document.querySelectorAll('.band__text').forEach(setup);
    if (!ribbons.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        ribbons.forEach(function (r) { if (r.host === e.target) r.visible = e.isIntersecting; });
      });
      wake();
    }, { rootMargin: '100px 0px' });
    ribbons.forEach(function (r) { io.observe(r.host); });

    window.addEventListener('scroll', function () {
      var now = performance.now();
      var v = Math.abs(window.scrollY - lastY) / Math.max(now - lastScrollT, 1) * 1000;
      lastY = window.scrollY;
      lastScrollT = now;
      scrollBoost = Math.max(scrollBoost, Math.min(v / 2500, 1));
    }, { passive: true });
  }

  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
})();
