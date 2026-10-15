/* ═══════════════════════════════════════════════════════════════
   FIMCA Store — v2 · comportamento
   Vanilla, sem dependências.

   Duas regras herdadas da v1, de propósito:
   1. As revelações são progressive enhancement. Nada nasce escondido
      no CSS: os estados iniciais vivem sob html.rv, ligado na 1ª linha
      daqui. Script quebrado = site inteiro visível, só sem animação.
   2. Nenhuma animação é acoplada à velocidade do scroll. As faixas
      deslizantes andam em ritmo constante — foi pedido explícito.
   ═══════════════════════════════════════════════════════════════ */

// ?rv=off revela tudo de uma vez: print de pagina inteira (headless, viewport
// alta) senao sai com metade do conteudo invisivel, porque a varredura roda
// antes do layout final.
if (!/[?&]rv=off/.test(location.search)) document.documentElement.classList.add('rv');

(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var brl = function (n) { return 'R$ ' + Number(n).toLocaleString('pt-BR'); };

  /* ── toast ─────────────────────────────────────────────────── */
  var toast = $('#toast'), toastMsg = $('#toastMsg'), toastT;
  function say(msg) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('on'); }, 2600);
  }

  /* ── revelações ────────────────────────────────────────────
     Varredura por evento de scroll + intervalo de segurança.
     IntersectionObserver se mostrou menos confiável neste projeto,
     e conteúdo escondido que nunca revela é a pior falha possível. */
  var revealTargets = $$('[data-rv]');
  function sweep() {
    if (!revealTargets.length) return;
    var limit = window.innerHeight * 0.9;
    revealTargets = revealTargets.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) { el.classList.add('in'); return false; }
      return true;
    });
  }
  sweep();
  window.addEventListener('scroll', sweep, { passive: true });
  window.addEventListener('resize', sweep);
  var sweepTimer = setInterval(function () {
    sweep();
    if (!revealTargets.length) clearInterval(sweepTimer);
  }, 700);

  /* ── contadores ────────────────────────────────────────────── */
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target) || reduced) return;
    var started = false;
    function run() {
      if (started || el.getBoundingClientRect().top > window.innerHeight * 0.88) return;
      started = true;
      var t0 = performance.now(), dur = 900;
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(performance.now());
      window.removeEventListener('scroll', run);
    }
    window.addEventListener('scroll', run, { passive: true });
    run();
  });

  /* ── faixa de benefícios (ritmo constante) ─────────────────── */
  (function marquee() {
    var track = $('#promoTrack');
    if (!track || reduced) return;
    var set = Array.prototype.slice.call(track.children);
    if (!set.length) return;

    var unit = 0, x = 0;

    // Duplica o conjunto até cobrir a tela com folga — sempre ao menos uma
    // cópia, porque é ela que dá a medida exata do ciclo (offsetLeft já
    // inclui o gap). Refeito no resize: a largura da janela pode ser 0 na
    // primeira medida, e aí a faixa andaria com buraco no meio.
    function build() {
      while (track.children.length > set.length) track.removeChild(track.lastChild);
      var need = Math.max(window.innerWidth, document.documentElement.clientWidth, 320) * 2;
      var guard = 0;
      do {
        set.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
      } while (track.scrollWidth < need && guard++ < 12);
      unit = track.children[set.length].offsetLeft - track.children[0].offsetLeft;
      if (x <= -unit) x = 0;
    }
    build();
    window.addEventListener('resize', build);

    var speed = 42, last = performance.now();
    (function loop(now) {
      var dt = Math.min(64, now - last) / 1000;
      last = now;
      if (unit > 10) {
        x -= speed * dt;
        if (x <= -unit) x += unit;
        track.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
      }
      requestAnimationFrame(loop);
    })(last);
  })();

  /* ── header ────────────────────────────────────────────────── */
  (function header() {
    var head = $('#head');
    if (!head) return;
    var last = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        head.classList.toggle('stuck', y > 8);
        if (!$('#menu').classList.contains('on')) {
          head.classList.toggle('hide', y > last && y > 260);
        }
        last = y;
        ticking = false;
      });
    }, { passive: true });
  })();

  /* ── menu ──────────────────────────────────────────────────── */
  (function nav() {
    var burger = $('#burger'), menu = $('#menu');
    if (!burger || !menu) return;
    function set(open) {
      burger.classList.toggle('on', open);
      menu.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('lock', open);
      if (open) $('#head').classList.remove('hide');
    }
    burger.addEventListener('click', function () { set(!menu.classList.contains('on')); });
    $$('[data-mlink]', menu).forEach(function (a) {
      a.addEventListener('click', function () { set(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('on')) set(false);
    });
  })();

  /* ── hero ──────────────────────────────────────────────────── */
  (function hero() {
    var slides = $$('[data-slide]'), dots = $$('#heroDots button');
    if (slides.length < 2) return;
    var i = 0, timer;

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      dots.forEach(function (d, k) {
        d.classList.remove('on');
        if (k === i) { void d.offsetWidth; d.classList.add('on'); } // reinicia a barra
      });
      if (!reduced) { clearTimeout(timer); timer = setTimeout(function () { go(i + 1); }, 6000); }
    }
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    if (!reduced) timer = setTimeout(function () { go(1); }, 6000);
  })();

  /* ── swatches e estrelas ───────────────────────────────────── */
  $$('[data-sw-out]').forEach(function (out) {
    var card = out.closest('.pcard');
    if (!card) return;
    var colors = (card.getAttribute('data-sw') || '').split(',').filter(Boolean);
    colors.forEach(function (c, k) {
      var i = document.createElement('i');
      i.style.background = c.trim();
      if (k === 0) i.className = 'on';
      i.setAttribute('title', 'Cor ' + (k + 1));
      i.addEventListener('click', function (e) {
        e.stopPropagation();
        $$('i', out).forEach(function (n) { n.classList.remove('on'); });
        i.classList.add('on');
      });
      out.appendChild(i);
    });
    if (colors.length > 1) {   // "1 cor" nao informa nada, so polui
      var em = document.createElement('em');
      em.textContent = colors.length + ' cores';
      out.appendChild(em);
    }
  });

  var STAR = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l1.6 3.3 3.6.5-2.6 2.6.6 3.6L6 9.1 2.8 10.8l.6-3.6L.8 4.6l3.6-.5z"/></svg>';
  $$('[data-rating]').forEach(function (el) {
    var box = $('.stars__i', el);
    if (!box) return;
    var r = parseFloat(el.getAttribute('data-rating')) || 0;
    for (var k = 1; k <= 5; k++) {
      box.insertAdjacentHTML('beforeend', STAR);
      if (k > Math.round(r)) box.lastElementChild.classList.add('off');
    }
  });

  /* ── favoritos ─────────────────────────────────────────────── */
  $$('[data-wish]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = b.classList.toggle('on');
      var card = b.closest('.pcard');
      say(on ? 'Salvo nos favoritos' : 'Removido dos favoritos');
      if (card) b.setAttribute('aria-pressed', String(on));
    });
  });

  /* ── trilhos horizontais ───────────────────────────────────── */
  $$('[data-rail-next]').forEach(function (btn) {
    var rail = document.getElementById(btn.getAttribute('data-rail-next'));
    var prev = $('[data-rail-prev="' + btn.getAttribute('data-rail-next') + '"]');
    if (!rail) return;

    function step() {
      var first = rail.firstElementChild;
      return first ? first.offsetWidth + 20 : rail.clientWidth * 0.8;
    }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      btn.disabled = rail.scrollLeft >= max;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
    }
    btn.addEventListener('click', function () {
      rail.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' });
    });
    if (prev) prev.addEventListener('click', function () {
      rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' });
    });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  /* ── FAQ ───────────────────────────────────────────────────── */
  $$('[data-faq] .faq__item').forEach(function (item) {
    var q = $('.faq__q', item);
    if (!q) return;
    q.addEventListener('click', function () {
      var open = item.classList.toggle('on');
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ══ SACOLA ═══════════════════════════════════════════════ */
  var FREE = 199;
  var cart = [];
  try {
    var saved = localStorage.getItem('fimca-v2-bag');
    if (saved) cart = JSON.parse(saved) || [];
  } catch (err) { cart = []; }

  var bag = $('#bag'), scrim = $('#scrim');

  function persist() {
    try { localStorage.setItem('fimca-v2-bag', JSON.stringify(cart)); } catch (err) {}
  }

  function openBag(open) {
    if (!bag) return;
    bag.classList.toggle('on', open);
    scrim.classList.toggle('on', open);
    bag.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('lock', open);
  }

  function render() {
    var box = $('#bagItems');
    var count = cart.reduce(function (a, i) { return a + i.qty; }, 0);
    var total = cart.reduce(function (a, i) { return a + i.qty * i.price; }, 0);

    var n1 = $('#bagCount'), n2 = $('#bagCount2');
    if (n1) { n1.textContent = count; n1.classList.toggle('on', count > 0); }
    if (n2) n2.textContent = '(' + count + ')';
    $('#bagTotal').textContent = brl(total);

    var ship = $('#bagShip');
    if (ship) {
      ship.innerHTML = total >= FREE
        ? 'Frete grátis liberado em Porto Velho. <b>&nbsp;Aproveite.</b>'
        : 'Faltam <b>' + brl(FREE - total) + '</b> para o frete grátis em Porto Velho.';
    }

    if (!cart.length) {
      box.innerHTML = '<p class="bag__empty">Sua sacola está vazia. Comece pela coleção FIMCA Essentials.</p>';
      persist();
      return;
    }

    box.innerHTML = '';
    cart.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'bag__row';
      row.innerHTML =
        '<img src="' + item.img + '" alt="">' +
        '<div>' +
          '<h5>' + item.name + '</h5>' +
          '<p class="small">Tamanho ' + item.size + '</p>' +
          '<div class="bag__qty">' +
            '<button data-less aria-label="Diminuir quantidade">−</button>' +
            '<b>' + item.qty + '</b>' +
            '<button data-more aria-label="Aumentar quantidade">+</button>' +
          '</div>' +
        '</div>' +
        '<span style="font-weight:800;font-size:.85rem">' + brl(item.qty * item.price) + '</span>';

      $('[data-less]', row).addEventListener('click', function () {
        item.qty--;
        if (item.qty <= 0) cart.splice(idx, 1);
        render();
      });
      $('[data-more]', row).addEventListener('click', function () { item.qty++; render(); });
      box.appendChild(row);
    });
    persist();
  }

  function addToCart(p) {
    var found = cart.filter(function (i) { return i.name === p.name && i.size === p.size; })[0];
    if (found) found.qty++;
    else cart.push({ name: p.name, price: p.price, img: p.img, size: p.size, qty: 1 });
    render();
    say(p.name + ' na sacola');
  }

  if ($('#bagBtn')) $('#bagBtn').addEventListener('click', function () { openBag(true); });
  if ($('#bagClose')) $('#bagClose').addEventListener('click', function () { openBag(false); });
  if (scrim) scrim.addEventListener('click', function () { openBag(false); closeQuick(); });
  if ($('#checkout')) $('#checkout').addEventListener('click', function () {
    if (!cart.length) { say('Sua sacola está vazia'); return; }
    say('Checkout é só demonstração');
  });
  render();

  /* ══ COMPRA RÁPIDA ════════════════════════════════════════ */
  var quick = $('#quick'), current = null, chosenSize = null;

  function closeQuick() {
    if (!quick) return;
    quick.classList.remove('on');
    quick.setAttribute('aria-hidden', 'true');
    if (!bag.classList.contains('on')) {
      scrim.classList.remove('on');
      document.body.classList.remove('lock');
    }
  }

  function openQuick(card) {
    if (!quick) return;
    current = card;
    chosenSize = null;

    var price = card.getAttribute('data-price');
    var old = card.getAttribute('data-old');

    $('#quickImg').src = card.getAttribute('data-img') || '';
    $('#quickImg').alt = card.getAttribute('data-name') || '';
    $('#quickName').textContent = card.getAttribute('data-name') || '';
    $('#quickDesc').textContent = card.getAttribute('data-desc') || '';
    $('#quickPrice').innerHTML = (old ? '<s>' + brl(old) + '</s> ' : '') + '<b>' + brl(price) + '</b>';

    var flag = $('.flag', card);
    $('#quickTag').textContent = flag ? flag.textContent : 'Compra rápida';

    var box = $('#quickSizes');
    box.innerHTML = '';
    (card.getAttribute('data-sizes') || 'Único').split(',').forEach(function (s, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.trim();
      b.addEventListener('click', function () {
        $$('button', box).forEach(function (n) { n.classList.remove('on'); });
        b.classList.add('on');
        chosenSize = s.trim();
      });
      box.appendChild(b);
    });

    quick.classList.add('on');
    quick.setAttribute('aria-hidden', 'false');
    scrim.classList.add('on');
    document.body.classList.add('lock');
    $('#quickClose').focus();
  }

  $$('[data-quick]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var card = b.closest('.pcard');
      if (card) openQuick(card);
    });
  });

  if ($('#quickClose')) $('#quickClose').addEventListener('click', closeQuick);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (quick && quick.classList.contains('on')) closeQuick();
    else if (bag && bag.classList.contains('on')) openBag(false);
  });

  if ($('#quickAdd')) $('#quickAdd').addEventListener('click', function () {
    if (!current) return;
    var sizes = $$('#quickSizes button');
    if (!chosenSize && sizes.length > 1) { say('Escolha um tamanho'); return; }
    addToCart({
      name: current.getAttribute('data-name'),
      price: Number(current.getAttribute('data-price')),
      img: current.getAttribute('data-img'),
      size: chosenSize || (sizes[0] ? sizes[0].textContent : 'Único')
    });
    closeQuick();
    openBag(true);
  });

  /* ── busca (placeholder honesto) ───────────────────────────── */
  if ($('#searchBtn')) $('#searchBtn').addEventListener('click', function () {
    say('Busca entra na próxima etapa');
  });

  /* ── newsletter ────────────────────────────────────────────── */
  (function news() {
    var form = $('#newsForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#newsEmail'), msg = $('#newsMsg');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      msg.textContent = ok
        ? 'Pronto. Avisamos você antes do próximo drop.'
        : 'Confira o e-mail digitado.';
      msg.style.color = ok ? 'var(--sun)' : '#F2A0A0';
      if (ok) input.value = '';
    });
  })();

})();
