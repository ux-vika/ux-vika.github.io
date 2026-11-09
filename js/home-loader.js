/* Главная: экран загрузки с процентами, только при первом открытии сайта во вкладке.
   Пока страница грузится, полоса плавно ползёт к 90%; после события load
   добегает до 100%, экран растворяется, и запускается выезд блоков
   (событие loader:done ловит js/home-reveal.js). */
(function () {
  var root = document.documentElement;
  var el = document.querySelector('.loader');
  if (!el) return;

  // Только при первом открытии сайта в этой вкладке: при возврате из кейсов
  // главная открывается сразу
  var seen = false;
  try { seen = sessionStorage.getItem('loaderSeen') === '1'; } catch (e) {}
  if (seen) { el.remove(); return; }
  try { sessionStorage.setItem('loaderSeen', '1'); } catch (e) {}

  root.classList.add('is-loading');

  var fill = el.querySelector('.loader__fill');
  var pct = el.querySelector('.loader__pct');
  var t0 = performance.now();
  var p = 0, loaded = false, finished = false;

  function markLoaded() {
    // не меньше 0,8 с, чтобы экран не мигал на быстрой загрузке
    var wait = Math.max(0, 800 - (performance.now() - t0));
    setTimeout(function () { loaded = true; }, wait);
  }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);
  setTimeout(function () { loaded = true; }, 10000); // страховка

  function finish() {
    finished = true;
    setTimeout(function () {
      el.classList.add('is-done');
      root.classList.remove('is-loading');
      document.dispatchEvent(new Event('loader:done'));
      setTimeout(function () { el.remove(); }, 600);
    }, 250);
  }

  function tick(now) {
    var target = loaded ? 100 : 90 * (1 - Math.exp(-(now - t0) / 1500));
    p += (target - p) * (loaded ? 0.15 : 0.08);
    if (loaded && p > 99.5) p = 100;
    fill.style.width = p + '%';
    pct.textContent = Math.round(p) + '%';
    if (p === 100) { if (!finished) finish(); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
