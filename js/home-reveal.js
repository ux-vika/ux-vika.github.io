/* Главная: плавный выезд элементов при появлении в экране.
   Карточкам и блокам с классом .r добавляется .is-in, когда они попадают в окно;
   стили выезда — в css/home.css. Без IntersectionObserver всё показывается сразу. */
(function () {
  var targets = Array.prototype.slice.call(document.querySelectorAll('.r, .card'));

  // Элементы одной группы выезжают друг за другом
  document.querySelectorAll('.intro__title .r, .side > .r').forEach(function (el, i) {
    el.style.setProperty('--d', i * 120);
  });
  document.querySelectorAll('.cards .card').forEach(function (el, i) {
    el.style.transitionDelay = '';
    el.dataset.order = i;
  });

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      // вторая карточка в ряду стартует чуть позже первой
      var delay = el.classList.contains('card') ? (Number(el.dataset.order) % 2) * 180 : 0;
      setTimeout(function () { el.classList.add('is-in'); }, delay);
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

  targets.forEach(function (el) { io.observe(el); });
})();
