/* Курсор-кольцо: плавно догоняет мышь, над ссылками и кнопками увеличивается.
   Только для мыши; на тач-экранах и при «уменьшить движение» не включается. */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ring = document.createElement('div');
  ring.className = 'cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;

  addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    ring.classList.add('is-visible');
    // ссылки, кнопки и картинки, которые открываются крупно
    var target = e.target.closest && e.target.closest('a, button, [role="button"]');
    ring.classList.toggle('is-active', !!target);
  }, { passive: true });

  document.addEventListener('mouseleave', function () { ring.classList.remove('is-visible'); });

  (function loop() {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    ring.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  })();
})();
