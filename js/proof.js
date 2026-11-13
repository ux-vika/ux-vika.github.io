/* Блок «Что я умею, с доказательствами»: собирает карточки из js/proof-data.js,
   по клику открывает модалку (нативный <dialog>), скрин в модалке открывается на весь экран.
   Пока файла картинки нет в assets/proof/, вместо неё серый плейсхолдер с именем файла. */
(function () {
  var cards = window.PROOF_CARDS || [];
  var grid = document.querySelector('.proof__grid');
  var modal = document.querySelector('.proof-modal');
  var zoom = document.querySelector('.proof-zoom');
  if (!grid || !modal || !zoom || !cards.length) return;

  var DIR = 'assets/proof/';
  var lastCard = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function altFor(card) { return 'Скрин артефакта. ' + card.label + '. ' + card.title; }

  function placeholder(card, cls) {
    var p = el('span', 'proof-ph ' + (cls || ''), card.image);
    p.setAttribute('role', 'img');
    p.setAttribute('aria-label', altFor(card) + ' (файл ' + card.image + ' пока не добавлен)');
    return p;
  }

  // Картинка, которая при ошибке загрузки заменяет себя (или обёртку) плейсхолдером
  function picture(card, cls, onMissing) {
    var img = el('img', cls);
    img.alt = altFor(card);
    img.decoding = 'async';
    img.addEventListener('error', function () {
      card._missing = true;
      if (onMissing) onMissing(img); else img.replaceWith(placeholder(card, cls));
    });
    img.src = DIR + card.image;
    return img;
  }

  /* ---------- Карточки ---------- */

  cards.forEach(function (card, i) {
    var b = el('button', 'proof-card r');
    b.type = 'button';
    b.setAttribute('aria-haspopup', 'dialog');

    var text = el('span', 'proof-card__text');
    text.appendChild(el('span', 'proof-card__label', card.label));
    text.appendChild(el('span', 'proof-card__title', card.title));
    b.appendChild(text);

    var arrow = el('span', 'proof-card__arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    b.appendChild(arrow);

    b.addEventListener('click', function () { openModal(card, b); });
    grid.appendChild(b);
  });

  /* ---------- Модалка ---------- */

  var mLabel = modal.querySelector('.proof-modal__label');
  var mTitle = modal.querySelector('.proof-modal__title');
  var mList = modal.querySelector('.proof-modal__list');
  var mLink = modal.querySelector('.proof-modal__link');
  var mMedia = modal.querySelector('.proof-modal__media');
  var zImg = zoom.querySelector('.proof-zoom__img');

  function lock(on) { document.documentElement.classList.toggle('has-dialog', on); }

  function openModal(card, from) {
    lastCard = from;
    mLabel.textContent = card.label;
    mTitle.textContent = card.title;

    mList.textContent = '';
    card.points.forEach(function (p) { mList.appendChild(el('li', null, p)); });

    mLink.textContent = '';
    mLink.hidden = !card.link;
    if (card.link) {
      var a = el('a', null, card.link.text);
      a.href = card.link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      mLink.appendChild(a);
    }

    mMedia.textContent = '';
    if (card._missing) {
      mMedia.appendChild(placeholder(card, 'proof-modal__img'));
    } else {
      var btn = el('button', 'proof-modal__zoom');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Открыть скрин на весь экран');
      btn.appendChild(picture(card, 'proof-modal__img', function () {
        btn.replaceWith(placeholder(card, 'proof-modal__img'));
      }));
      btn.addEventListener('click', function () { openZoom(card); });
      mMedia.appendChild(btn);
    }

    modal.showModal();
    modal.scrollTop = 0;
    lock(true);
  }

  modal.addEventListener('close', function () {
    lock(false);
    if (lastCard) lastCard.focus();
  });

  /* ---------- Скрин на весь экран ---------- */

  var zoomFrom = null;
  function openZoom(card) {
    zoomFrom = document.activeElement;
    zImg.src = DIR + card.image;
    zImg.alt = altFor(card);
    zoom.showModal();
  }
  zoom.addEventListener('close', function () {
    zImg.removeAttribute('src');
    if (zoomFrom) zoomFrom.focus();
  });

  // Закрытие: кнопка ✕ и клик по затемнению вокруг окна; Esc закрывает <dialog> сам
  [modal, zoom].forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });
  // На полноэкранном скрине клик по картинке тоже закрывает
  zImg.addEventListener('click', function () { zoom.close(); });
})();
