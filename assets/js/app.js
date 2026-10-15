/* ==========================================================================
   FIMCA STORE — motion layer
   Arquétipo: Premium. Um easing de assinatura (expo-out), três durações,
   um padrão de entrada (mask reveal). Tudo o que se move no scroll passa
   por um único rAF.
   ========================================================================== */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE  = window.matchMedia('(pointer: coarse)').matches;
const SMOOTH  = !REDUCED && !COARSE;

// Primeira linha de verdade: assume as revelações. Enquanto esta classe não
// existe, o CSS mantém tudo visível — um erro de carregamento nunca deixa a
// página em branco.
if (!REDUCED) document.documentElement.classList.add('rv');

let vw = window.innerWidth;
let vh = window.innerHeight;
let maxScroll = 0;
let lastT = performance.now();

/* ==========================================================================
   1 · Scroll suave (lerp sobre a posição real — position:sticky continua nativo)
   ========================================================================== */
const ss = { target: window.scrollY, current: window.scrollY };
// Marca do último quadro: se o loop parar (aba suspensa, exceção), o sequestro
// da roda se desliga sozinho em vez de deixar a página sem scroll.
let lastFrameAt = performance.now();

function measure() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
  ss.target = clamp(ss.target, 0, maxScroll);
}

if (SMOOTH) {
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || document.body.classList.contains('is-locked')) return;
    if (e.target.closest && e.target.closest('.bag__items')) return;
    // gesto horizontal sobre o carrossel é dele, não da página
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) &&
        e.target.closest && e.target.closest('.edit__rail')) return;
    if (performance.now() - lastFrameAt > 400) return; // loop parado: scroll nativo
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 22 : e.deltaMode === 2 ? e.deltaY * vh : e.deltaY;
    ss.target = clamp(ss.target + d, 0, maxScroll);
  }, { passive: false });

  // qualquer scroll que não veio de nós (teclado, barra, âncora) resincroniza
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (Math.abs(y - ss.current) > 2.5) { ss.current = ss.target = y; }
  }, { passive: true });
}

function scrollTo(y) {
  y = clamp(y, 0, maxScroll);
  if (SMOOTH) ss.target = y;
  else window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
}

/* ==========================================================================
   2 · Preloader
   ========================================================================== */
const loader = $('#loader');
const loaderBar = $('#loaderBar');
const loaderCount = $('#loaderCount');
const loaderMark = $('#loaderMark');

function boot() {
  document.body.classList.add('ready');
  measure();
  layout();
}

if (REDUCED || !loader) {
  loader && loader.remove();
  boot();
} else {
  // Cronometrado por relógio, não por quadros: rAF pode ser limitado em aba
  // de fundo e a abertura não pode ficar presa por isso.
  const DUR = 1500;
  const started = performance.now();
  let loaded = false, done = false;
  window.addEventListener('load', () => { loaded = true; });

  const finish = () => {
    if (done) return;
    done = true;
    loaderCount.textContent = '100';
    loaderBar.style.width = '100%';
    loaderMark.style.setProperty('--wd', '118');
    setTimeout(() => {
      loader.classList.add('is-done');
      boot();
      setTimeout(() => loader.remove(), 1400);
    }, 300);
  };

  const run = () => {
    if (done) return;
    const t = (performance.now() - started) / DUR;
    const eased = 1 - Math.pow(1 - Math.min(1, t), 3);
    const p = Math.min(loaded || t >= 1 ? 100 : 93, eased * 100);

    loaderBar.style.width = p + '%';
    loaderCount.textContent = String(Math.round(p)).padStart(3, '0');
    loaderMark.style.setProperty('--wd', (62 + 56 * (p / 100)).toFixed(1));

    if (p >= 99.5) { finish(); return; }
    requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
  setTimeout(finish, 3400); // trava de segurança se o rAF for suspenso
}

/* ==========================================================================
   3 · Sistema de revelação
   ========================================================================== */
/* Varredura ligada ao evento de scroll em vez de IntersectionObserver: o
   evento é mais confiável que o callback do observer em ambientes estranhos,
   e não depende do rAF. Conteúdo escondido que não revela é a pior falha
   possível — por isso a lista encolhe até zerar e há uma rede de segurança. */
let pendingReveals = $$('[data-reveal], [data-mark]');

function sweepReveals() {
  if (!pendingReveals.length) return;
  const h = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!h) return;
  pendingReveals = pendingReveals.filter(el => {
    const r = el.getBoundingClientRect();
    if (r.top < h * 0.94 && r.bottom > 0) { el.classList.add('is-in'); return false; }
    return true;
  });
}

if (REDUCED) {
  pendingReveals.forEach(el => el.classList.add('is-in'));
  pendingReveals = [];
} else {
  window.addEventListener('scroll', sweepReveals, { passive: true });
  window.addEventListener('resize', sweepReveals);
  sweepReveals();
  // rede de segurança: se algo escapar da varredura, revela mesmo assim
  let guard = 0;
  const guardTimer = setInterval(() => {
    sweepReveals();
    if (++guard > 20 || !pendingReveals.length) clearInterval(guardTimer);
  }, 400);
}

/* ==========================================================================
   4 · Manifesto — preenchimento palavra a palavra
   ========================================================================== */
const fillEl = $('[data-fill]');
let fillWords = [];

if (fillEl) {
  const wrap = (node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('w');
          w.textContent = part;
          frag.appendChild(w);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        wrap(child);
      }
    });
  };
  wrap(fillEl);
  fillWords = $$('w', fillEl);
  if (REDUCED) fillWords.forEach(w => w.classList.add('on'));
}

/* ==========================================================================
   5 · Assinatura — negação pelo eixo de largura
   ========================================================================== */
const negs = $$('[data-neg]');
const negKeep = $('[data-neg-keep]');
// valores suavizados: o efeito segue o scroll com inércia em vez de colar nele
const negSmooth = negs.map(() => 0);
let keepSmooth = 0;
const smoothstep = (t) => t * t * (3 - 2 * t);

/* ==========================================================================
   6 · Carrossel (Shop the edit)
   Rolagem horizontal própria: arrasto, setas e teclado. A rolagem vertical
   da página não mexe nele — e ele não sequestra a rolagem da página.
   ========================================================================== */
const editTrack = $('#editTrack');
const editRail  = $('#editRail');
const editBar   = $('#editBar');
let railExtra = 0;
let railOn = false;
let railSmooth = 0; // posição suavizada: o trilho segue o scroll com inércia

function layoutRail() {
  if (!editTrack || !editRail) return;
  railOn = vw > 860 && !REDUCED;
  if (!railOn) {
    editTrack.style.height = '';
    editRail.style.transform = '';
    return;
  }
  editRail.style.transform = 'translate3d(0,0,0)';
  railExtra = Math.max(0, editRail.scrollWidth - vw);
  // percurso vertical generoso: 1,35x a distância horizontal deixa o
  // acoplamento macio em vez de disparado
  editTrack.style.height = (vh + railExtra * 1.35) + 'px';
}

/* ==========================================================================
   7 · Roller (Not just merch)
   ========================================================================== */
const ewTrack = $('#ewTrack');
const roller  = $('#roller');
const rollerWords = roller ? $$('span', roller) : [];
let rollerStep = 0;
let rollerIdx = -1;

if (roller && !REDUCED) roller.style.transition = 'transform 640ms cubic-bezier(.16,1,.3,1)';

/* ==========================================================================
   8 · Tickers
   ========================================================================== */
function makeTicker(el, opts) {
  if (!el) return null;
  el.innerHTML = el.innerHTML + el.innerHTML;
  const state = { el, x: 0, set: 0, base: opts.base };
  state.measure = () => { state.set = el.scrollWidth / 2; };
  state.measure();
  return state;
}
const tickers = [
  makeTicker($('#ticker'),   { base: 34 }),
  makeTicker($('#marquee1'), { base: 46 }),
  makeTicker($('#marquee2'), { base: 58 })
].filter(Boolean);

/* ==========================================================================
   9 · Header
   ========================================================================== */
const head = $('#head');
const headProgress = $('#headProgress');
const surfaces = $$('[data-surface]');

/* ==========================================================================
   10 · Parallax
   ========================================================================== */
const heroPar = $('#heroPar');
const ewVideo = $('#ewVideo');

/* ==========================================================================
   11 · Layout geral
   ========================================================================== */
function layout() {
  measure();
  layoutRail();
  if (rollerWords.length) rollerStep = rollerWords[0].offsetHeight;
  tickers.forEach(t => t.measure());
}

let resizeRaf;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(layout);
});
window.addEventListener('load', layout);
// a troca da fallback pela Archivo muda as medidas de tudo que é medido em px
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
// carregada em aba de fundo, a viewport pode medir 0: remede ao voltar à tela
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) requestAnimationFrame(layout);
});

/* ==========================================================================
   12 · Loop principal
   ========================================================================== */
function frame(now) {
  lastFrameAt = now;
  const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
  lastT = now;
  try {

  /* --- scroll suave --- */
  if (SMOOTH && !document.body.classList.contains('is-locked')) {
    ss.current = lerp(ss.current, ss.target, 0.11);
    if (Math.abs(ss.target - ss.current) < 0.06) ss.current = ss.target;
    if (Math.abs(ss.current - window.scrollY) > 0.05) window.scrollTo(0, ss.current);
  }

  const y = window.scrollY;

  /* --- progresso do header --- */
  if (headProgress) headProgress.style.width = (maxScroll ? (y / maxScroll) * 100 : 0) + '%';
  if (head) head.classList.toggle('is-stuck', y > 40);

  /* --- tom do header conforme a superfície sob ele --- */
  if (head) {
    const line = 26 + 29;
    let tone = 'dark';
    for (const s of surfaces) {
      const r = s.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { tone = s.dataset.surface; break; }
    }
    if (head.dataset.tone !== tone) head.dataset.tone = tone;
  }

  /* --- faixas de texto: deslizam sozinhas, em ritmo constante.
         Não reagem à velocidade nem à direção do scroll — amarrar as duas
         coisas fazia o letreiro tremer e inverter no meio da rolagem. --- */
  tickers.forEach(t => {
    t.x -= t.base * dt;
    if (t.set) {
      if (t.x <= -t.set) t.x += t.set;
      if (t.x > 0) t.x -= t.set;
    }
    t.el.style.transform = `translate3d(${t.x.toFixed(2)}px,0,0)`;
  });

  if (!REDUCED) {
    /* --- parallax do hero (o wrapper tem 128% de altura: sobra de 14% em cada ponta) --- */
    if (heroPar && y < vh * 1.25) {
      heroPar.style.transform = `translate3d(0,${(y * 0.12).toFixed(1)}px,0)`;
    }

    /* --- manifesto --- */
    if (fillWords.length) {
      const r = fillEl.getBoundingClientRect();
      const start = vh * 0.86, end = vh * 0.22;
      const p = clamp((start - r.top) / (start - end), 0, 1);
      const k = Math.round(p * fillWords.length);
      for (let i = 0; i < fillWords.length; i++) {
        fillWords[i].classList.toggle('on', i < k);
      }
    }

    /* --- assinatura: negação ---
       Faixa longa (0.95vh → 0.20vh) + smoothstep + inércia: a régua e o eixo
       de largura chegam macios em vez de acompanharem o scroll quadro a quadro. */
    negs.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const start = vh * 0.95, end = vh * 0.20;
      const t = smoothstep(clamp((start - r.top) / (start - end), 0, 1));
      const p = negSmooth[i] = lerp(negSmooth[i], t, 0.085);
      el.style.setProperty('--strike', p.toFixed(4));
      el.style.setProperty('--wd', (124 - 60 * p).toFixed(1));
      el.style.setProperty('--wg', (800 - 380 * p).toFixed(0));
      el.style.opacity = (1 - 0.62 * p).toFixed(3);
    });
    if (negKeep) {
      const r = negKeep.getBoundingClientRect();
      const start = vh * 0.98, end = vh * 0.26;
      const t = smoothstep(clamp((start - r.top) / (start - end), 0, 1));
      const p = keepSmooth = lerp(keepSmooth, t, 0.085);
      negKeep.style.setProperty('--wd', (62 + 62 * p).toFixed(1));
      negKeep.style.opacity = (0.22 + 0.78 * p).toFixed(3);
    }

    /* --- trilho acoplado ao scroll --- */
    if (railOn && editTrack) {
      const r = editTrack.getBoundingClientRect();
      const span = r.height - vh;
      const target = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      railSmooth = lerp(railSmooth, target, 0.12);
      editRail.style.transform = `translate3d(${(-railExtra * railSmooth).toFixed(1)}px,0,0)`;

      if (editBar && editBar.parentElement) {
        const track = editBar.parentElement.clientWidth;
        const w = Math.max(28, (vw / (vw + railExtra)) * track);
        editBar.style.width = w + 'px';
        editBar.style.transform = `translateX(${(railSmooth * (track - w)).toFixed(1)}px)`;
      }
    }

    /* --- roller + parallax do vídeo --- */
    if (ewTrack && roller) {
      const r = ewTrack.getBoundingClientRect();
      const span = r.height - vh;
      const p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      const n = rollerWords.length;
      const idx = clamp(Math.floor(p * n * 0.999), 0, n - 1);
      if (idx !== rollerIdx) {
        rollerIdx = idx;
        // mede na hora: a altura muda quando a webfont troca a fallback
        rollerStep = rollerWords[0].offsetHeight;
        roller.style.transform = `translate3d(0,${-idx * rollerStep}px,0)`;
        rollerWords.forEach((w, i) => w.classList.toggle('on', i === idx));
      }
      if (ewVideo && r.top < vh && r.bottom > 0) {
        ewVideo.style.transform = `scale(1.08) translate3d(0,${((p - 0.5) * 3.4).toFixed(2)}%,0)`;
      }
    }
  }
  } catch (err) {
    // um erro num efeito não pode derrubar o loop — o scroll depende dele
    if (window.console) console.error('[fimca] frame:', err);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ==========================================================================
   13 · Vídeos — tocam apenas em tela
   ========================================================================== */
const videos = $$('video');
const vio = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { const pr = v.play(); if (pr) pr.catch(() => {}); }
    else v.pause();
  });
}, { threshold: 0.25 });
videos.forEach(v => vio.observe(v));

[['#dropVideo', '#dropProg'], ['#lookVideo', '#lookProg']].forEach(([v, p]) => {
  const video = $(v), prog = $(p);
  if (!video || !prog) return;
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    prog.style.width = (video.currentTime / video.duration) * 100 + '%';
  });
});

const soundBtn = $('#soundBtn');
if (soundBtn && ewVideo) {
  soundBtn.addEventListener('click', () => {
    ewVideo.muted = !ewVideo.muted;
    soundBtn.classList.toggle('off', ewVideo.muted);
    soundBtn.setAttribute('aria-pressed', String(!ewVideo.muted));
    if (!ewVideo.muted) { const pr = ewVideo.play(); if (pr) pr.catch(() => {}); }
  });
}

/* ==========================================================================
   14 · Cursor
   ========================================================================== */
if (!COARSE && !REDUCED) {
  const dot  = $('.cursor');
  const ring = $('.cursor-ring');
  const label = $('[data-cursor-label]');
  let mx = vw / 2, my = vh / 2, dx = mx, dy = my, rx = mx, ry = my;

  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  document.addEventListener('mouseleave', () => document.body.classList.add('cur-hidden'));
  document.addEventListener('mouseenter', () => document.body.classList.remove('cur-hidden'));

  (function cursorLoop() {
    dx = lerp(dx, mx, 0.42); dy = lerp(dy, my, 0.42);
    rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
    dot.style.transform  = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
    requestAnimationFrame(cursorLoop);
  })();

  document.addEventListener('mouseover', (e) => {
    const hot = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button');
    document.body.classList.toggle('cur-hot', !!hot);
    document.body.classList.toggle('cur-link', !hot && !!link);
    if (hot) label.textContent = hot.dataset.cursor;
  });
}

/* ==========================================================================
   15 · Botões magnéticos
   ========================================================================== */
if (!COARSE && !REDUCED) {
  $$('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const ox = e.clientX - (r.left + r.width / 2);
      const oy = e.clientY - (r.top + r.height / 2);
      el.style.transition = 'transform 0ms';
      el.style.transform = `translate3d(${ox * 0.26}px,${oy * 0.34}px,0)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 520ms cubic-bezier(.16,1,.3,1)';
      el.style.transform = 'translate3d(0,0,0)';
    });
  });
}

/* ==========================================================================
   16 · Cursos — imagem que segue
   ========================================================================== */
const follower = $('#follower');
const followerImg = $('#followerImg');
if (follower && !COARSE && !REDUCED) {
  let fx = -400, fy = -400, tx = -400, ty = -400;

  $$('[data-course-img]').forEach(a => {
    a.addEventListener('mouseenter', (e) => {
      followerImg.src = a.dataset.courseImg;
      // aparece sob o cursor; o lerp cuida só do arrasto depois disso
      tx = fx = e.clientX;
      ty = fy = e.clientY;
      follower.classList.add('on');
    });
    a.addEventListener('mouseleave', () => follower.classList.remove('on'));
  });
  $('[data-course-list]')?.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });

  (function followLoop() {
    fx = lerp(fx, tx, 0.09); fy = lerp(fy, ty, 0.09);
    const tilt = clamp((tx - fx) * 0.06, -9, 9);
    follower.style.transform =
      `translate3d(${fx.toFixed(1)}px,${fy.toFixed(1)}px,0) translate(-50%,-50%) rotate(${tilt.toFixed(2)}deg) scale(${follower.classList.contains('on') ? 1 : 0.86})`;
    requestAnimationFrame(followLoop);
  })();
}

/* ==========================================================================
   17 · Menu
   ========================================================================== */
const burger = $('#burger');
const menu = $('#menu');

function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  document.body.classList.toggle('is-locked', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}
burger?.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
$$('[data-menu-link]').forEach(a => a.addEventListener('click', () => setMenu(false)));

/* ==========================================================================
   18 · Sacola
   ========================================================================== */
const bag = $('#bag');
const bagItems = $('#bagItems');
const bagTotal = $('#bagTotal');
const bagCount = $('#bagCount');
const bagCount2 = $('#bagCount2');
const scrim = $('#scrim');
let cart = [];

const brl = (n) => 'R$ ' + n.toLocaleString('pt-BR');

function renderBag() {
  const qty = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  bagCount.textContent = qty;
  bagCount2.textContent = `(${qty})`;
  bagTotal.textContent = brl(total);

  bagCount.classList.add('pop');
  setTimeout(() => bagCount.classList.remove('pop'), 260);

  if (!cart.length) {
    bagItems.innerHTML = '<p class="bag__empty">Sua sacola está vazia. Comece pelo drop FIMCA Essentials.</p>';
    return;
  }

  bagItems.innerHTML = cart.map((i, n) => `
    <div class="bag__item" style="animation-delay:${n * 60}ms">
      <img src="${i.img}" alt="">
      <div>
        <h6>${i.name}</h6>
        <p>Qtd ${i.qty}</p>
        <button type="button" data-remove="${n}">Remover</button>
      </div>
      <span class="bag__price">${brl(i.qty * i.price)}</span>
    </div>`).join('');
}

function setBag(open) {
  document.body.classList.toggle('bag-open', open);
  document.body.classList.toggle('is-locked', open);
  bag.setAttribute('aria-hidden', String(!open));
}

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) {
    const name = add.dataset.name;
    const found = cart.find(i => i.name === name);
    if (found) found.qty++;
    else cart.push({ name, price: Number(add.dataset.price), img: add.dataset.img, qty: 1 });

    renderBag();
    add.classList.add('done');
    const original = add.innerHTML;
    add.innerHTML = 'Na sacola <span>✓</span>';
    setTimeout(() => { add.classList.remove('done'); add.innerHTML = original; }, 1400);
    return;
  }

  const rm = e.target.closest('[data-remove]');
  if (rm) {
    cart.splice(Number(rm.dataset.remove), 1);
    renderBag();
  }
});

$('#bagBtn')?.addEventListener('click', () => setBag(true));
$('#bagClose')?.addEventListener('click', () => setBag(false));
scrim?.addEventListener('click', () => setBag(false));

const checkout = $('#checkout');
checkout?.addEventListener('click', () => {
  const original = checkout.innerHTML;
  checkout.innerHTML = 'Protótipo — sem pagamento real';
  setTimeout(() => { checkout.innerHTML = original; }, 2200);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('bag-open')) setBag(false);
  if (document.body.classList.contains('menu-open')) setMenu(false);
});

/* ==========================================================================
   19 · Contagem regressiva
   ========================================================================== */
const DROP_AT = new Date('2026-09-05T19:00:00-04:00').getTime();
const tEls = { d: $('#tD'), h: $('#tH'), m: $('#tM'), s: $('#tS') };

function flick(el, value) {
  if (!el || el.textContent === value) return;
  el.textContent = value;
  if (REDUCED) return;
  el.animate(
    [{ opacity: 0.35, transform: 'translateY(-5px)' }, { opacity: 1, transform: 'none' }],
    { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' }
  );
}

function countdown() {
  const left = Math.max(0, DROP_AT - Date.now());
  const s = Math.floor(left / 1000);
  flick(tEls.d, String(Math.floor(s / 86400)).padStart(2, '0'));
  flick(tEls.h, String(Math.floor(s / 3600) % 24).padStart(2, '0'));
  flick(tEls.m, String(Math.floor(s / 60) % 60).padStart(2, '0'));
  flick(tEls.s, String(s % 60).padStart(2, '0'));
}
countdown();
setInterval(countdown, 1000);

/* ==========================================================================
   20 · Newsletter
   ========================================================================== */
const newsForm = $('#newsForm');
const newsMsg = $('#newsMsg');
newsForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#newsEmail');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
  newsMsg.textContent = ok
    ? 'Pronto — você entra na lista do próximo drop.'
    : 'Digite um e-mail válido para entrar na lista.';
  newsMsg.style.color = ok ? 'var(--field)' : 'var(--sun)';
  newsMsg.classList.add('on');
  if (ok) input.value = '';
});

/* ==========================================================================
   21 · Âncoras
   ========================================================================== */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id === '#') return;
  const el = document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  const offset = id === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 84;
  scrollTo(offset);
});

})();
