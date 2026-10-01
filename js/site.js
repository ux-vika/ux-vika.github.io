/* Общие интерактивные штуки сайта:
   1) просмотр картинок крупно (лайтбокс) — для img[data-zoom];
   2) плавающая кнопка «Наверх». */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Лайтбокс ---------- */
  var zoomables = document.querySelectorAll('img[data-zoom]');
  if (zoomables.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Просмотр изображения');
    box.innerHTML =
      '<div class="lightbox__scroller"><img class="lightbox__img" alt=""></div>' +
      '<button class="lightbox__close" type="button" aria-label="Закрыть">×</button>' +
      '<p class="lightbox__hint">Нажмите на картинку, чтобы приблизить</p>';
    document.body.appendChild(box);

    var scroller = box.querySelector('.lightbox__scroller');
    var big = box.querySelector('.lightbox__img');
    var closeBtn = box.querySelector('.lightbox__close');
    var hint = box.querySelector('.lightbox__hint');
    var opener = null;
    var anim = null;      // текущая анимация картинки — её можно прервать
    var closing = false;

    // кривые и длительности берём из токенов в style.css
    var css = getComputedStyle(document.documentElement);
    var EASE_OUT = css.getPropertyValue('--ease-out').trim() || 'ease-out';
    var EASE_IN = css.getPropertyValue('--ease-in').trim() || 'ease-in';
    var DUR = parseFloat(css.getPropertyValue('--dur')) || 300;
    var DUR_SLOW = parseFloat(css.getPropertyValue('--dur-slow')) || 400;

    // transform, при котором картинка, стоящая в rect `to`,
    // выглядит так, будто стоит в rect `from` (центр к центру, масштаб по ширине)
    function placeAt(from, to) {
      var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
      var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
      return 'translate(' + dx + 'px,' + dy + 'px) scale(' + (from.width / to.width) + ')';
    }

    function stopAnim() {
      if (anim) { anim.onfinish = null; anim.cancel(); anim = null; }
    }

    function open(img) {
      stopAnim();
      closing = false;
      opener = img;
      big.style.width = '';
      big.style.visibility = 'hidden';   // покажем, когда будет готов первый кадр анимации
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      box.classList.remove('is-zoomed');
      hint.textContent = 'Нажмите на картинку, чтобы приблизить';
      box.hidden = false;
      document.documentElement.classList.add('is-locked');
      closeBtn.focus();

      function show() {
        if (box.hidden || closing || opener !== img) return;
        void box.offsetWidth;                // зафиксировать стартовое состояние для CSS-перехода фона
        box.classList.add('is-open');
        big.style.visibility = '';
        if (reduceMotion) return;
        // картинка вырастает из миниатюры, как фото в iPhone
        anim = big.animate(
          [{ transform: placeAt(img.getBoundingClientRect(), big.getBoundingClientRect()) }, { transform: 'none' }],
          { duration: DUR_SLOW, easing: EASE_OUT }
        );
      }
      (big.decode ? big.decode() : Promise.resolve()).then(show, show);
    }

    function close() {
      if (box.hidden || closing) return;
      closing = true;
      stopAnim();
      box.classList.remove('is-open');

      function done() {
        closing = false;
        box.hidden = true;
        stopAnim();
        box.classList.remove('is-zoomed');
        big.style.width = '';
        document.documentElement.classList.remove('is-locked');
        big.removeAttribute('src');
        if (opener) opener.focus({ preventScroll: true });
      }
      if (reduceMotion || !opener) return done();
      // уходит обратно в миниатюру — быстрее, чем появлялась
      anim = big.animate(
        [{ transform: 'none' }, { transform: placeAt(opener.getBoundingClientRect(), big.getBoundingClientRect()) }],
        { duration: DUR, easing: EASE_IN, fill: 'forwards' }
      );
      anim.onfinish = done;
    }

    function toggleZoom(e) {
      if (closing) return;
      stopAnim();
      var rect = big.getBoundingClientRect();
      // доля по ширине/высоте, куда кликнули — туда и прокрутим после увеличения
      var fx = (e.clientX - rect.left) / rect.width;
      var fy = (e.clientY - rect.top) / rect.height;
      var zoomed = box.classList.toggle('is-zoomed');
      hint.textContent = zoomed ? 'Нажмите ещё раз, чтобы уменьшить' : 'Нажмите на картинку, чтобы приблизить';
      // приближаем минимум вдвое, даже если исходник небольшой
      big.style.width = zoomed ? Math.max(big.naturalWidth, rect.width * 2) + 'px' : '';
      if (zoomed) {
        scroller.scrollLeft = fx * big.offsetWidth - scroller.clientWidth / 2;
        scroller.scrollTop = fy * big.offsetHeight - scroller.clientHeight / 2;
      }
      if (reduceMotion) return;
      // плавно перетекаем из прежнего размера в новый (FLIP)
      anim = big.animate(
        [{ transform: placeAt(rect, big.getBoundingClientRect()) }, { transform: 'none' }],
        { duration: DUR_SLOW, easing: EASE_OUT }
      );
    }

    zoomables.forEach(function (img) {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Открыть крупно: ' + img.alt);
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });

    big.addEventListener('click', function (e) { e.stopPropagation(); toggleZoom(e); });
    scroller.addEventListener('click', function (e) { if (e.target === scroller) close(); });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    });
  }

  /* ---------- Кнопка «Наверх» ---------- */
  var up = document.createElement('button');
  up.className = 'to-top';
  up.type = 'button';
  up.setAttribute('aria-label', 'Наверх');
  up.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(up);

  function onScroll() {
    up.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  up.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
