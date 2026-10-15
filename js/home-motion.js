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
