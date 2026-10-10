/* Мир диванов — поведение сайта: меню, фильтры каталога, окно модели.
   Без библиотек. Если JavaScript выключен, каталог всё равно виден целиком. */
(function () {
  'use strict';

  var PAGE = 12; // сколько карточек показывать сразу и добавлять по кнопке «Показать ещё»

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Мобильное меню ---------- */
  var burger = $('#burger');
  var nav = $('#nav');
  function setMenu(open) {
    if (open) nav.setAttribute('data-open', ''); else nav.removeAttribute('data-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(!nav.hasAttribute('data-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* ---------- Каталог ---------- */
  var grid = $('#grid');
  if (!grid) return;
  var cards = $$('.card', grid);
  cards.forEach(function (c, i) { c.setAttribute('data-idx', i); });

  var chips = $$('.chip');
  var search = $('#f-search');
  var mech = $('#f-mech');
  var sort = $('#f-sort');
  var found = $('#found');
  var moreBtn = $('#more-btn');
  var empty = $('#empty');
  var resetBtn = $('#reset');

  var state = { cat: 'all', q: '', mech: '', sort: 'default', limit: PAGE };
  var matched = cards.slice();

  function plural(n) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return n + ' модель';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return n + ' модели';
    return n + ' моделей';
  }

  function matches(c) {
    if (state.cat !== 'all' && c.getAttribute('data-cat') !== state.cat) return false;
    if (state.mech && c.getAttribute('data-mech') !== state.mech) return false;
    if (state.q && c.getAttribute('data-search').indexOf(state.q) === -1) return false;
    return true;
  }

  function render() {
    matched = cards.filter(matches);
    var dir = state.sort === 'desc' ? -1 : 1;
    matched.sort(function (a, b) {
      if (state.sort !== 'default') {
        var d = (Number(a.getAttribute('data-price')) - Number(b.getAttribute('data-price'))) * dir;
        if (d) return d;
      }
      return Number(a.getAttribute('data-idx')) - Number(b.getAttribute('data-idx'));
    });
    cards.forEach(function (c) { c.hidden = true; });
    matched.forEach(function (c, i) {
      c.hidden = i >= state.limit;
      grid.appendChild(c); // расставляем в нужном порядке
    });
    grid.appendChild(empty);
    empty.hidden = matched.length > 0;
    var shown = Math.min(state.limit, matched.length);
    found.textContent = matched.length === cards.length
      ? 'Показано ' + shown + ' из ' + cards.length
      : 'Найдено: ' + plural(matched.length);
    moreBtn.hidden = shown >= matched.length;
    moreBtn.textContent = 'Показать ещё ' + Math.min(PAGE, matched.length - shown);
  }

  function setCat(cat) {
    state.cat = cat;
    state.limit = PAGE;
    chips.forEach(function (ch) { ch.setAttribute('aria-pressed', ch.getAttribute('data-cat') === cat ? 'true' : 'false'); });
    render();
  }

  chips.forEach(function (ch) {
    ch.addEventListener('click', function () { setCat(ch.getAttribute('data-cat')); });
  });
  search.addEventListener('input', function () {
    state.q = search.value.trim().toLowerCase().replace(/ё/g, 'е');
    state.limit = PAGE;
    render();
  });
  mech.addEventListener('change', function () { state.mech = mech.value; state.limit = PAGE; render(); });
  sort.addEventListener('change', function () { state.sort = sort.value; render(); });
  moreBtn.addEventListener('click', function () { state.limit += PAGE; render(); });
  resetBtn.addEventListener('click', function () {
    search.value = ''; mech.value = ''; state.q = ''; state.mech = '';
    setCat('all');
  });

  // Плитки категорий на главной: включают фильтр и ведут к каталогу
  $$('[data-go-cat]').forEach(function (a) {
    a.addEventListener('click', function () { setCat(a.getAttribute('data-go-cat')); });
  });

  /* ---------- Окно модели ---------- */
  var modal = $('#modal');
  var mBody = $('#m-body');
  var mCount = $('#m-count');
  var mPrev = $('#m-prev');
  var mNext = $('#m-next');
  var list = [];
  var pos = -1;
  var opener = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  }

  function fill(card) {
    var photos = JSON.parse(card.getAttribute('data-photos'));
    var name = $('h3', card).textContent;
    var art = card.getAttribute('data-art');
    var variants = '';
    if (photos.length > 1) {
      variants = '<div class="variants" role="group" aria-label="Цвет на фото">' + photos.map(function (p, i) {
        return '<button type="button" class="var" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' +
          '<span class="sw" style="background:' + esc(p.sw) + '"></span>' + esc(p.color) + '</button>';
      }).join('') + '</div>';
    }
    mBody.innerHTML =
      '<div class="mphoto"><div class="big"><img id="m-img" src="' + esc(photos[0].src) + '" alt="' + esc(photos[0].alt) + '"></div>' + variants + '</div>' +
      '<div class="minfo">' +
        '<p class="ckind">' + esc($('.ckind', card).textContent) + '</p>' +
        '<h3 id="m-title">' + esc(name) + '</h3>' +
        $('.more', card).innerHTML +
        '<p class="mprice"><span>Цена</span><b>' + esc($('.price', card).textContent) + '</b></p>' +
        '<div class="morder"><p>Чтобы заказать, позвоните и назовите артикул <strong>' + esc(art) + '</strong>. ' +
        'Цвет, материал и размер подберём под вас.</p>' +
        '<a class="btn" href="tel:' + esc(modal.getAttribute('data-tel')) + '">Позвонить: ' + esc(modal.getAttribute('data-phone')) + '</a></div>' +
      '</div>';
    $$('.var', mBody).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = photos[Number(b.getAttribute('data-i'))];
        var img = $('#m-img');
        img.src = p.src; img.alt = p.alt;
        $$('.var', mBody).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
    });
    mBody.scrollTop = 0;
    mCount.textContent = (pos + 1) + ' из ' + list.length;
    mPrev.disabled = pos === 0;
    mNext.disabled = pos === list.length - 1;
  }

  function show(i) {
    if (!list.length) return;
    pos = Math.max(0, Math.min(list.length - 1, i));
    fill(list[pos]);
  }

  function openCard(card, from) {
    list = matched.indexOf(card) !== -1 ? matched : cards;
    opener = from || null;
    if (!modal.open) {
      if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    }
    show(list.indexOf(card));
  }

  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.plate, .more-btn');
    if (t) openCard(t.closest('.card'), t);
  });
  mPrev.addEventListener('click', function () { show(pos - 1); });
  mNext.addEventListener('click', function () { show(pos + 1); });
  $('#m-close').addEventListener('click', function () { modal.close ? modal.close() : modal.removeAttribute('open'); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); }); // клик по затемнению
  modal.addEventListener('close', function () {
    mBody.innerHTML = '';
    if (opener && opener.focus && document.contains(opener)) opener.focus();
  });
  document.addEventListener('keydown', function (e) {
    if (!modal.open) return;
    if (e.key === 'ArrowLeft') show(pos - 1);
    else if (e.key === 'ArrowRight') show(pos + 1);
  });

  // Листание пальцем в окне модели
  var x0 = null, y0 = null;
  mBody.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; y0 = e.changedTouches[0].clientY; }, { passive: true });
  mBody.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) show(pos + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Ссылки вида #pr-01 (например, с первого экрана) открывают окно модели
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-model]');
    if (!a) return;
    var card = document.getElementById(a.getAttribute('data-model'));
    if (card) { e.preventDefault(); openCard(card, a); }
  });

  render();
})();
