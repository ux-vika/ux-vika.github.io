/* Курсор-кольцо: плавно догоняет мышь, над ссылками и кнопками увеличивается.
   Только для мыши; на тач-экранах и при «уменьшить движение» не включается. */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ring = document.createElement('div');
  ring.className = 'cursor';
  ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="23"/></svg>';
  document.body.appendChild(ring);

  var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, last = 0;

  addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    ring.classList.add('is-visible');
    // ссылки, кнопки и картинки, которые открываются крупно
    var target = e.target.closest && e.target.closest('a, button, [role="button"]');
    ring.classList.toggle('is-active', !!target);
  }, { passive: true });

  document.addEventListener('mouseleave', function () { ring.classList.remove('is-visible'); });

  // догоняет с одной скоростью и на 60 Гц, и на 120 Гц (ProMotion):
  // доля пути за кадр считается от реального времени кадра
  requestAnimationFrame(function loop(now) {
    var dt = last ? Math.min(now - last, 64) : 16.7;
    last = now;
    var k = 1 - Math.pow(0.8, dt / 16.7);
    cx += (x - cx) * k;
    cy += (y - cy) * k;
    ring.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  });
})();
