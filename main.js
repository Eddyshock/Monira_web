/* ══════════════════════════════════════════════════════
   MONIRA — main.js
   Nav · Reveal · Hero en vivo · Bento · Proceso · Vistas ·
   Dashboard · Calculadora · Precios · FAQ · CTA
══════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const mxn = n => '$' + Math.round(n).toLocaleString('es-MX');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Tween numérico con rAF; devuelve una función para cancelarlo */
  function tween(from, to, dur, onUpdate, onDone) {
    if (reduce || dur <= 0) { onUpdate(to); onDone && onDone(); return () => {}; }
    let raf;
    const t0 = performance.now();
    const tick = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      onUpdate(lerp(from, to, easeOut(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else onDone && onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  /* Anima el texto de un elemento desde su último valor hasta `to` */
  const running = new WeakMap();
  function countTo(el, to, { dur = 900, fmt = v => Math.round(v).toLocaleString('es-MX') } = {}) {
    const from = +el.dataset.val || 0;
    running.get(el)?.();
    el.dataset.val = to;
    running.set(el, tween(from, to, dur, v => { el.textContent = fmt(v); }));
  }

  /* Llama a onIn / onOut cuando el elemento entra o sale de pantalla */
  function onVisible(el, onIn, onOut, threshold = 0.2) {
    if (!el) return;
    new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) onIn();
      else if (onOut) onOut();
    }), { threshold }).observe(el);
  }

  /* Grupo de setTimeout que se puede cancelar de golpe */
  function timers() {
    let ids = [];
    return {
      add(ms, fn) { ids.push(setTimeout(fn, ms)); },
      clear() { ids.forEach(clearTimeout); ids = []; }
    };
  }

  /* Pequeña explosión de confeti en (x, y) */
  function burst(x, y, n = 16) {
    if (reduce) return;
    const colors = ['#ff6a00', '#ffb23f', '#e62e00', '#22c55e', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const a = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      p.className = 'spark';
      p.style.cssText = `left:${x}px;top:${y}px;--c:${colors[i % colors.length]};--dx:${(Math.cos(a) * dist).toFixed(1)}px;--dy:${(Math.sin(a) * dist - 30).toFixed(1)}px`;
      document.body.append(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }


  /* ─── 1. SPLIT TEXT + REVEAL ──────────────────────── */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            const wi = document.createElement('span');
            w.className = 'w';
            wi.className = 'wi';
            wi.style.setProperty('--wi', i++);
            wi.textContent = part;
            w.append(wi);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  $$('[data-stagger]').forEach(parent => {
    const step = +parent.dataset.stagger || 80;
    [...parent.children].forEach((c, i) => c.style.setProperty('--d', `${i * step}ms`));
  });

  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      target.classList.add('in-view');
      revealIO.unobserve(target);
      // Al terminar, se quita .reveal para que el elemento recupere sus propias transiciones (hover, etc.)
      if (target.classList.contains('reveal')) {
        const delay = parseFloat(getComputedStyle(target).getPropertyValue('--d')) || 0;
        setTimeout(() => target.classList.remove('reveal'), 1000 + delay);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, [data-split], .footer-word').forEach(el => revealIO.observe(el));


  /* ─── 2. NAV: estado, pill, progreso ──────────────── */
  const nav = $('#nav');
  const progress = $('.scroll-progress');
  const navLinks = $('#navLinks');
  const links = $$('a', navLinks);
  const pill = $('.nav-pill');
  const navSections = links.map(a => document.querySelector(a.hash));
  let activeLink = null;
  let lastY = scrollY;

  function movePill(a) {
    if (!a) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  links.forEach(a => a.addEventListener('mouseenter', () => movePill(a)));
  navLinks.addEventListener('mouseleave', () => movePill(activeLink));

  function updateNav() {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 24);
    if (Math.abs(y - lastY) > 6) {
      nav.classList.toggle('hide', y > lastY && y > 480 && !document.body.classList.contains('menu-open'));
      lastY = y;
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);

    let current = null;
    navSections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.45) current = links[i]; });
    if (current !== activeLink) {
      activeLink = current;
      links.forEach(l => l.classList.toggle('active', l === current));
      if (!navLinks.matches(':hover')) movePill(current);
    }
  }


  /* ─── 3. MENÚ MÓVIL ───────────────────────────────── */
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', !open);
    menu.inert = !open;
    if (open) nav.classList.remove('hide');
  }
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setMenu(false); });


  /* ─── 4. HERO: palabra rotativa ───────────────────── */
  const rotator = $('#rotator');
  if (rotator) {
    const words = $$('span', rotator);
    let ri = 0;
    const fit = () => { rotator.style.width = `${words[ri].offsetWidth}px`; };
    words[0].classList.add('in');
    fit();
    document.fonts?.ready.then(fit);
    addEventListener('resize', fit);
    if (!reduce) {
      setInterval(() => {
        if (document.hidden) return;
        const prev = words[ri];
        prev.classList.replace('in', 'out');
        setTimeout(() => prev.classList.remove('out'), 800);
        ri = (ri + 1) % words.length;
        words[ri].classList.add('in');
        fit();
      }, 2800);
    }
  }


  /* ─── 5. HERO: escenario 3D (scroll + ratón) ──────── */
  const hero = $('.hero');
  const stage = $('#heroStage');
  const orbs = $$('.orb');
  let tilt = { x: 0, y: 0 };

  function updateStage() {
    if (!stage || reduce) return;
    const p = clamp(scrollY / (innerHeight * 0.75), 0, 1);
    stage.style.setProperty('--rx', `${(lerp(16, 0, p) + tilt.x).toFixed(2)}deg`);
    stage.style.setProperty('--ry', `${tilt.y.toFixed(2)}deg`);
    stage.style.setProperty('--s', lerp(0.94, 1, p).toFixed(3));
  }
  if (hero && finePointer && !reduce) {
    hero.addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      tilt = { x: -ny * 4, y: nx * 6 };
      orbs.forEach((o, i) => {
        const k = (i + 1) * 36;
        o.style.setProperty('--ox', `${(nx * k).toFixed(1)}px`);
        o.style.setProperty('--oy', `${(ny * k).toFixed(1)}px`);
      });
      requestAnimationFrame(updateStage);
    });
    hero.addEventListener('pointerleave', () => { tilt = { x: 0, y: 0 }; requestAnimationFrame(updateStage); });
  }


  /* ─── 6. HERO: tablero que se mueve solo ──────────── */
  const board = $('#heroBoard');
  if (board && !reduce) {
    const list = k => $(`[data-col="${k}"] .col-list`, board);
    const todo = list('todo');
    const prog = list('prog');
    const done = list('done');
    const toast = $('#heroToast');
    const progBar = $('#heroProg');
    const progN = $('#heroProgN');
    const checkSvg = '<svg class="icon"><use href="#i-check"/></svg>';
    const pool = [
      { t: 'Seguimiento a leads',      tag: 'v', label: 'Ventas',  av: 'SG', h: 100, name: 'Sofía',   due: '20 jun' },
      { t: 'Kit de marca',             tag: 'd', label: 'Diseño',  av: 'ED', h: 20,  name: 'Eduardo', due: '21 jun' },
      { t: 'Integración WhatsApp',     tag: 'b', label: 'Backend', av: 'AL', h: 330, name: 'Ana',     due: '23 jun' },
      { t: 'Factura CFDI mensual',     tag: 'o', label: 'Ops',     av: 'JC', h: 200, name: 'Jorge',   due: '24 jun' },
      { t: 'Regresión v2.4',           tag: 'q', label: 'QA',      av: 'LR', h: 150, name: 'Luis',    due: '25 jun' },
      { t: 'Demo cliente Guadalajara', tag: 'v', label: 'Ventas',  av: 'MR', h: 280, name: 'María',   due: '26 jun' }
    ];
    let pct = 58, phase = 0, pi = 0, loop = null;

    const makeTask = d => {
      const el = document.createElement('div');
      el.className = 'task';
      el.dataset.name = d.name;
      el.innerHTML = `<span class="tag tag-${d.tag}">${d.label}</span><p>${d.t}</p><div class="task-bar"><i></i></div><div class="task-f"><span class="av" style="--h:${d.h}">${d.av}</span><span class="due">${d.due}</span></div>`;
      return el;
    };

    // FLIP: mide, cambia el DOM y anima cada tarjeta desde su posición anterior
    function flip(mutate) {
      const cards = $$('.task', board);
      const first = new Map(cards.map(c => [c, [c.offsetLeft, c.offsetTop]]));
      mutate();
      cards.forEach(c => {
        if (!c.isConnected) return;
        const [x, y] = first.get(c);
        const dx = x - c.offsetLeft;
        const dy = y - c.offsetTop;
        if (!dx && !dy) return;
        c.style.transition = 'none';
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          c.style.transition = 'transform .9s cubic-bezier(.22,1,.36,1)';
          c.style.transform = '';
          setTimeout(() => { c.style.transition = ''; }, 950);
        }));
      });
    }

    const counts = () => $$('.col', board).forEach(col => {
      $('.col-h em', col).textContent = $('.col-list', col).children.length;
    });

    function showToast(card) {
      $('b', toast).textContent = `${card.dataset.name} completó una tarea`;
      $('small', toast).textContent = `«${$('p', card).textContent}»`;
      toast.classList.remove('pop');
      void toast.offsetWidth;
      toast.classList.add('pop');
    }

    function step() {
      if (document.hidden) return;
      if (phase === 0) {
        // Por hacer → En proceso
        const card = todo.firstElementChild;
        if (!card) return;
        card.classList.add('moving');
        flip(() => prog.append(card));
        card.classList.add('in-prog');
        setTimeout(() => $('.task-bar i', card).style.setProperty('--w', `${30 + Math.round(Math.random() * 45)}%`), 500);
        setTimeout(() => card.classList.remove('moving'), 950);
      } else {
        // En proceso → Completado
        const card = prog.firstElementChild;
        if (!card) return;
        card.classList.add('moving');
        flip(() => {
          done.prepend(card);
          card.classList.remove('in-prog');
          card.classList.add('is-done');
          const due = $('.due', card);
          due.className = 'due ok';
          due.innerHTML = `${checkSvg}Hecho`;
        });
        setTimeout(() => card.classList.remove('moving'), 950);
        showToast(card);
        pct = Math.min(pct + 3, 97);
        progBar.style.setProperty('--p', `${pct}%`);
        progN.textContent = `${pct}%`;

        // Sale la tarjeta más antigua de Completado y entra una nueva en Por hacer
        setTimeout(() => {
          const old = done.lastElementChild;
          if (done.children.length > 3 && old) {
            old.classList.add('leaving');
            setTimeout(() => { old.remove(); counts(); }, 400);
          }
          const fresh = makeTask(pool[pi++ % pool.length]);
          fresh.classList.add('entering');
          todo.append(fresh);
          requestAnimationFrame(() => requestAnimationFrame(() => fresh.classList.remove('entering')));
          counts();
        }, 1100);
      }
      counts();
      phase = 1 - phase;
    }

    onVisible(board,
      () => { if (!loop) loop = setInterval(step, 2800); },
      () => { clearInterval(loop); loop = null; },
      0.1);
  }


  /* ─── 7. MICRO-INTERACCIONES ──────────────────────── */
  if (finePointer && !reduce) {
    // Botones magnéticos
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
        b.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    });
    // Brillo que sigue al cursor en las tarjetas
    $$('.spot').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`);
      c.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  // Contadores que arrancan al verse
  const countIO = new IntersectionObserver(entries => entries.forEach(({ isIntersecting, target }) => {
    if (!isIntersecting) return;
    countIO.unobserve(target);
    const pre = target.dataset.prefix || '';
    countTo(target, +target.dataset.count, { dur: 1600, fmt: v => pre + Math.round(v).toLocaleString('es-MX') });
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));


  /* ─── 8. BENTO: chat de soporte ───────────────────── */
  const chat = $('#chat');
  if (chat) {
    const me = $('.msg.me', chat);
    const who = $('.msg-who', chat);
    const typing = $('.typing', chat);
    const reply = $('.reply', chat);
    const t = timers();
    function play() {
      t.clear();
      [me, who, typing, reply].forEach(x => x.classList.remove('show'));
      typing.hidden = false;
      reply.hidden = true;
      t.add(400, () => me.classList.add('show'));
      t.add(1300, () => { who.classList.add('show'); typing.classList.add('show'); });
      t.add(3100, () => {
        typing.hidden = true;
        reply.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => reply.classList.add('show')));
      });
      t.add(9500, play);
    }
    if (reduce) {
      [me, who, reply].forEach(x => x.classList.add('show'));
      typing.hidden = true;
    } else {
      reply.hidden = true;
      onVisible(chat, play, () => t.clear(), 0.4);
    }
  }


  /* ─── 9. BENTO: IA que escribe ────────────────────── */
  const ai = $('#ai');
  if (ai) {
    const out = $('#aiText', ai);
    const status = $('#aiStatus', ai);
    const apply = $('#aiApply', ai);
    const text = 'El proyecto «Backend» va 3 días atrasado. Sugerencia: reasignar 2 tareas a Ana para llegar a la entrega del 28 de junio.';
    let started = false;
    const finish = () => {
      out.textContent = text;
      ai.classList.add('typed');
      status.textContent = 'Análisis listo';
      status.classList.add('done');
    };
    onVisible(ai, () => {
      if (started) return;
      started = true;
      if (reduce) { finish(); return; }
      let i = 0;
      setTimeout(function type() {
        out.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(type, text[i - 1] === '.' ? 280 : 16 + Math.random() * 28);
        else finish();
      }, 600);
    }, null, 0.5);
    apply.addEventListener('click', () => {
      if (ai.classList.contains('applied')) return;
      ai.classList.add('applied');
      apply.textContent = '✓ Sugerencia aplicada';
      apply.classList.add('ok');
      status.textContent = 'Riesgo reducido';
      $('.ai-meter b', ai).textContent = 'Bajo';
      const r = apply.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
    });
  }


  /* ─── 10. PROCESO: pasos ligados al scroll ────────── */
  const processSec = $('#proceso');
  const steps = $$('.pstep');
  const screens = $$('.stage-screen');
  const frame = $('#stageFrame');
  const rail = $('.rail i');
  const stepsWrap = $('#processSteps');
  const company = $('#typeCompany');
  let curStep = -1;
  let typeTimer;

  screens.forEach(s => s.classList.remove('active'));

  function typeCompany() {
    clearTimeout(typeTimer);
    const text = 'Grupo Norte S.A. de C.V.';
    if (reduce) { company.textContent = text; return; }
    let i = 0;
    company.textContent = '';
    (function next() {
      company.textContent = text.slice(0, ++i);
      if (i < text.length) typeTimer = setTimeout(next, 55);
    })();
  }

  function setStep(i) {
    if (i === curStep) return;
    curStep = i;
    steps.forEach((s, k) => s.classList.toggle('active', k === i));
    screens.forEach((s, k) => s.classList.toggle('active', k === i));
    frame.dataset.step = i + 1;
    if (i === 0) typeCompany();
  }

  function updateProcess() {
    if (!processSec) return;
    const sr = processSec.getBoundingClientRect();
    if (sr.bottom < 0 || sr.top > innerHeight * 0.85) return;
    const line = innerHeight * (innerWidth < 900 ? 0.74 : 0.6);
    let idx = 0;
    steps.forEach((s, k) => { if ($('h3', s).getBoundingClientRect().top < line) idx = k; });
    setStep(idx);
    const r = stepsWrap.getBoundingClientRect();
    rail.style.setProperty('--rp', clamp((line - r.top) / r.height, 0, 1).toFixed(3));
    // En móvil el escenario queda fijo arriba: solo entonces tapa el texto que pasa por detrás
    const stageEl = frame.parentElement;
    stageEl.classList.toggle('stuck', stageEl.getBoundingClientRect().top <= parseFloat(getComputedStyle(stageEl).top) + 1);
  }


  /* ─── 11. VISTAS: pestañas con autoplay ───────────── */
  const views = $('#viewsDemo');
  if (views) {
    const tabs = $$('.tab', views);
    const panels = $$('.vpanel', views);
    const tabPill = $('.tab-pill', views);
    const viewName = $('#vwinView');
    const hint = $('#dragHint');
    const win = $('.vwin', views);
    let vi = 0, auto = !reduce, visible = false, hovering = false, timer;

    const placeTabPill = () => {
      const t = tabs[vi];
      tabPill.style.width = `${t.offsetWidth}px`;
      tabPill.style.transform = `translateX(${t.offsetLeft}px)`;
    };

    function schedule() {
      clearTimeout(timer);
      tabs.forEach(t => t.classList.remove('timing'));
      if (!auto || !visible || hovering) return;
      const t = tabs[vi];
      void t.offsetWidth;
      t.classList.add('timing');
      timer = setTimeout(() => show((vi + 1) % tabs.length), 6000);
    }

    function show(i, focus) {
      vi = i;
      tabs.forEach((t, k) => {
        const on = k === i;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p, k) => p.classList.toggle('active', k === i));
      viewName.textContent = tabs[i].textContent.trim();
      hint.classList.toggle('off', i !== 0);
      placeTabPill();
      if (focus) tabs[i].focus();
      schedule();
    }

    const stopAuto = () => { auto = false; schedule(); };
    tabs.forEach((t, i) => t.addEventListener('click', () => { stopAuto(); show(i); }));
    $('.tabs', views).addEventListener('keydown', e => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      stopAuto();
      show((vi + dir + tabs.length) % tabs.length, true);
    });
    win.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovering = true; schedule(); } });
    win.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovering = false; schedule(); } });
    win.addEventListener('pointerdown', stopAuto);
    win.addEventListener('focusin', stopAuto);
    onVisible(views, () => { visible = true; schedule(); }, () => { visible = false; schedule(); }, 0.35);
    addEventListener('resize', placeTabPill);
    document.fonts?.ready.then(placeTabPill);
    show(0);
  }


  /* ─── 12. VISTAS: kanban arrastrable ──────────────── */
  const vk = $('#vkBoard');
  if (vk) {
    const cols = $$('.vk-col', vk);
    let drag = null;

    function refresh() {
      cols.forEach(col => {
        const em = $('.vk-h em', col);
        const cards = $$('.vk-card', col);
        if (+em.textContent !== cards.length) {
          em.textContent = cards.length;
          em.classList.remove('bump');
          void em.offsetWidth;
          em.classList.add('bump');
          setTimeout(() => em.classList.remove('bump'), 400);
        }
        cards.forEach(c => {
          c.classList.toggle('done', col.dataset.col === 'done');
          if (col.dataset.col !== 'prog') c.classList.remove('hot');
        });
      });
    }

    function landed(card) {
      card.classList.add('landed');
      setTimeout(() => card.classList.remove('landed'), 500);
      refresh();
      if (card.closest('.vk-col').dataset.col === 'done' && card.dataset.from !== 'done') {
        const r = card.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, 18);
      }
    }

    function begin(x, y) {
      const { card, w, h } = drag;
      drag.on = true;
      const ph = document.createElement('div');
      ph.className = 'vk-ph';
      ph.style.height = `${h}px`;
      card.after(ph);
      drag.ph = ph;
      card.classList.add('dragging');
      Object.assign(card.style, { position: 'fixed', left: '0px', top: '0px', width: `${w}px`, zIndex: 1000, pointerEvents: 'none', margin: '0' });
      document.body.classList.add('is-dragging');
      navigator.vibrate?.(10);
      move(x, y);
    }

    function move(x, y) {
      const { card, ox, oy, ph } = drag;
      card.style.transform = `translate(${x - ox}px, ${y - oy}px) rotate(2.5deg) scale(1.03)`;
      const col = document.elementFromPoint(x, y)?.closest('.vk-col');
      cols.forEach(c => c.classList.toggle('over', c === col));
      if (!col) return;
      const list = $('.vk-list', col);
      const before = $$('.vk-card', list)
        .filter(c => c !== card)
        .find(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if (before) { if (ph.nextElementSibling !== before) list.insertBefore(ph, before); }
      else if (list.lastElementChild !== ph) list.append(ph);
    }

    function end() {
      if (!drag) return;
      clearTimeout(drag.hold);
      const d = drag;
      drag = null;
      if (!d.on) return;
      const { card, ph } = d;
      cols.forEach(c => c.classList.remove('over'));
      document.body.classList.remove('is-dragging');
      const r = ph.getBoundingClientRect();
      card.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
      card.style.transform = `translate(${r.left}px, ${r.top}px)`;
      setTimeout(() => {
        ph.replaceWith(card);
        card.removeAttribute('style');
        card.classList.remove('dragging');
        landed(card);
      }, 340);
    }

    vk.addEventListener('pointerdown', e => {
      const card = e.target.closest('.vk-card');
      if (!card || e.button !== 0 || drag) return;
      const r = card.getBoundingClientRect();
      drag = {
        card, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY,
        ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, h: r.height,
        on: false, touch: e.pointerType !== 'mouse', hold: null
      };
      card.dataset.from = card.closest('.vk-col').dataset.col;
      // En táctil se arrastra con pulsación larga para no bloquear el scroll
      if (drag.touch) drag.hold = setTimeout(() => drag && begin(drag.lx, drag.ly), 220);
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      if (!drag.on) {
        const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
        if (drag.touch) { if (dist > 10) { clearTimeout(drag.hold); drag = null; } return; }
        if (dist < 5) return;
        begin(e.clientX, e.clientY);
      }
      move(e.clientX, e.clientY);
    });
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    vk.addEventListener('touchmove', e => { if (drag && drag.on) e.preventDefault(); }, { passive: false });
    vk.addEventListener('contextmenu', e => { if (drag) e.preventDefault(); });

    // Teclado: flechas ← → mueven la tarjeta enfocada entre columnas
    vk.addEventListener('keydown', e => {
      const card = e.target.closest('.vk-card');
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!card || !dir) return;
      e.preventDefault();
      const from = card.closest('.vk-col');
      const to = cols[cols.indexOf(from) + dir];
      if (!to) return;
      card.dataset.from = from.dataset.col;
      $('.vk-list', to).append(card);
      card.focus();
      landed(card);
    });
  }


  /* ─── 13. VISTAS: lista y calendario ──────────────── */
  $$('.ls-check').forEach(btn => btn.addEventListener('click', () => {
    const row = btn.closest('.ls-row');
    const isDone = row.classList.toggle('done');
    btn.setAttribute('aria-pressed', isDone);
    btn.setAttribute('aria-label', isDone ? 'Marcar como pendiente' : 'Marcar como hecha');
    const status = $('.ls-status', row);
    if (isDone) {
      if (row.dataset.status === 'Hecho') { row.dataset.status = 'Pendiente'; row.dataset.cls = 's-pend'; }
      status.className = 'ls-status s-done';
      status.textContent = 'Hecho';
      const r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 10);
    } else {
      status.className = `ls-status ${row.dataset.cls}`;
      status.textContent = row.dataset.status;
    }
  }));

  const calGrid = $('#calGrid');
  if (calGrid) {
    const events = {
      3: ['Kickoff', '#8b6fe8'], 5: ['Entrega UX', '#ff6a00'], 9: ['Review UX', '#8b6fe8'],
      12: ['Entrega API', '#ff6a00'], 17: ['Demo cliente', '#8b6fe8'], 19: ['Docs API', '#ff6a00'],
      23: ['QA final', '#ff6a00'], 26: ['Lanzamiento', '#16a34a'], 30: ['Retro', '#8b6fe8']
    };
    let n = 0;
    // Junio 2026 empieza en lunes: 30 días + 5 de julio para completar 5 semanas
    for (let i = 0; i < 35; i++) {
      const inMonth = i < 30;
      const day = inMonth ? i + 1 : i - 29;
      const cell = document.createElement('div');
      cell.className = 'cal-d' + (inMonth ? '' : ' muted') + (inMonth && day === 15 ? ' today' : '');
      cell.textContent = day;
      const ev = inMonth && events[day];
      if (ev) {
        const tag = document.createElement('span');
        tag.className = 'cal-ev';
        tag.textContent = ev[0];
        tag.style.setProperty('--c', ev[1]);
        tag.style.setProperty('--d', n++);
        cell.append(tag);
      }
      calGrid.append(cell);
    }
  }


  /* ─── 14. DASHBOARD ───────────────────────────────── */
  const dash = $('#dash');
  if (dash) {
    const data = {
      semana: {
        kpis: [78, 33, 24, 21],
        trends: [['up', '↑ 12%'], ['up', '↑ 8%'], ['neu', '→ 0%'], ['dn', '↓ 5%']],
        series: [4, 7, 5, 9, 8, 11, 6],
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        tip: l => l,
        ring: 42
      },
      mes: {
        kpis: [312, 148, 96, 68],
        trends: [['up', '↑ 18%'], ['up', '↑ 22%'], ['up', '↑ 4%'], ['dn', '↓ 11%']],
        series: [18, 26, 22, 31, 29, 38, 44],
        labels: ['1', '5', '10', '15', '20', '25', '30'],
        tip: l => `${l} jun`,
        ring: 47
      }
    };
    const kpiEls = $$('.k-n', dash);
    const trendEls = $$('.trend', dash);
    const area = $('#dmArea');
    const line = $('#dmLine');
    const xAxis = $('#dmX');
    const ring = $('#dmRing');
    const ringN = $('#dmRingN');
    const wrap = $('.dm-svg-wrap', dash);
    const guide = $('#dmGuide');
    const dot = $('#dmDot');
    const tip = $('#dmTip');
    const segBtns = $$('.seg button', dash);
    const segPill = $('.seg-pill', dash);
    let range = 'semana';
    let series = data.semana.series.slice();
    let stopChart = () => {};

    const geometry = vals => {
      const max = Math.max(...vals) * 1.18;
      return vals.map((v, i) => [i * 400 / (vals.length - 1), 140 - (v / max) * 128]);
    };
    // Curva suave (Catmull-Rom → Bézier)
    function pathD(pts) {
      let d = `M${pts[0][0]},${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    }
    function drawChart(vals) {
      const d = pathD(geometry(vals));
      line.setAttribute('d', d);
      area.setAttribute('d', `${d} L400,140 L0,140 Z`);
    }
    function morphTo(target) {
      stopChart();
      const from = series.slice();
      stopChart = tween(0, 1, 700, t => { series = from.map((v, i) => lerp(v, target[i], t)); drawChart(series); });
    }
    const setLabels = d => { xAxis.innerHTML = d.labels.map(l => `<span>${l}</span>`).join(''); };

    function apply(name, first) {
      const d = data[name];
      kpiEls.forEach((el, i) => countTo(el, d.kpis[i], { dur: first ? 1400 : 700 }));
      trendEls.forEach((el, i) => { el.className = `trend ${d.trends[i][0]}`; el.textContent = d.trends[i][1]; });
      setLabels(d);
      ring.style.setProperty('--p', d.ring);
      countTo(ringN, d.ring, { dur: first ? 1600 : 700, fmt: v => `${Math.round(v)}%` });
      if (!first) morphTo(d.series);
    }

    const placeSeg = () => {
      const b = segBtns.find(x => x.classList.contains('on'));
      segPill.style.width = `${b.offsetWidth}px`;
      segPill.style.transform = `translateX(${b.offsetLeft}px)`;
    };
    segBtns.forEach(b => b.addEventListener('click', () => {
      if (b.dataset.range === range) return;
      range = b.dataset.range;
      segBtns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      placeSeg();
      apply(range);
    }));

    // Tooltip sobre la gráfica
    wrap.addEventListener('pointermove', e => {
      const r = wrap.getBoundingClientRect();
      const i = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (series.length - 1));
      const [px, py] = geometry(series)[i];
      const x = px / 400 * r.width;
      guide.style.left = `${x}px`;
      dot.style.left = `${x}px`;
      dot.style.top = `${py / 140 * r.height}px`;
      tip.textContent = `${data[range].tip(data[range].labels[i])} · ${Math.round(series[i])} tareas`;
      wrap.classList.add('hover');
      tip.classList.add('show');
    });
    wrap.addEventListener('pointerleave', () => { wrap.classList.remove('hover'); tip.classList.remove('show'); });

    // Actividad en vivo
    const feed = $('#dmFeed');
    const items = [
      ['#22c55e', '<b>Ana</b> completó «Diseño de homepage»'],
      ['#f5b301', '<b>Luis</b> movió «Testing QA» a En proceso'],
      ['#a78bfa', '<b>María</b> comentó en «API de pagos»'],
      ['#ff6a00', 'Factura CFDI generada · <b>Plan Pro</b>'],
      ['#22c55e', '<b>Jorge</b> completó «Migración de datos»'],
      ['#e62e00', 'Alerta: <b>«Backend»</b> sin actualizar 2 días']
    ];
    const times = ['ahora', 'hace 2 min', 'hace 7 min'];
    let fi = 0, feedTimer = null;
    function pushFeed(animate = true) {
      const [c, html] = items[fi++ % items.length];
      const li = document.createElement('li');
      li.innerHTML = `<span class="fd" style="--c:${c}"></span><span class="fx">${html}</span><span class="ft"></span>`;
      if (!animate) li.style.animation = 'none';
      feed.prepend(li);
      const live = $$('li:not(.out)', feed);
      live.forEach((el, i) => { $('.ft', el).textContent = times[i] || ''; });
      if (live.length > 3) {
        const old = live[live.length - 1];
        old.classList.add('out');
        setTimeout(() => old.remove(), 400);
      }
    }
    for (let k = 0; k < 3; k++) pushFeed(false);

    drawChart(series);
    setLabels(data.semana);
    placeSeg();
    document.fonts?.ready.then(placeSeg);
    let started = false;
    onVisible(dash, () => {
      if (!started) { started = true; apply('semana', true); }
      if (!reduce && !feedTimer) feedTimer = setInterval(() => { if (!document.hidden) pushFeed(); }, 3400);
    }, () => { clearInterval(feedTimer); feedTimer = null; }, 0.3);
  }


  /* ─── 15. CALCULADORA DE AHORRO ───────────────────── */
  const users = $('#users');
  if (users) {
    const OTHER = 175; // MXN por usuario al mes (punto medio de ~$150–200)
    const out = $('#usersOut');
    const planEl = $('#calcPlan');
    const costM = $('#costMonira');
    const costO = $('#costOther');
    const save = $('#saveYear');
    const barM = $('#barMonira');
    const barO = $('#barOther');
    const perM = $('#perMonira');
    const perO = $('#perOther');
    const plan = u => {
      if (u <= 10) return { name: 'Estándar', cost: 200 };
      if (u <= 20) return { name: 'Pro', cost: 300 };
      const ex = Math.ceil((u - 20) / 10);
      return { name: `Pro + ${ex} ${ex === 1 ? 'expansión' : 'expansiones'}`, cost: 300 + ex * 100 };
    };
    function calc(dur = 450) {
      const u = +users.value;
      const p = plan(u);
      const other = u * OTHER;
      users.style.setProperty('--v', `${(u - users.min) / (users.max - users.min) * 100}%`);
      out.textContent = u;
      planEl.textContent = p.name;
      countTo(costO, other, { dur, fmt: mxn });
      countTo(costM, p.cost, { dur, fmt: mxn });
      countTo(save, (other - p.cost) * 12, { dur, fmt: mxn });
      barO.style.width = '100%';
      barM.style.width = `${Math.max(p.cost / other * 100, 2)}%`;
      perM.textContent = `≈ ${mxn(p.cost / u)} por persona`;
      perO.textContent = `≈ ${mxn(OTHER)} por persona`;
    }
    users.addEventListener('input', () => calc());
    users.style.setProperty('--v', `${(users.value - users.min) / (users.max - users.min) * 100}%`);
    let shown = false;
    onVisible(users.closest('.calc'), () => { if (!shown) { shown = true; calc(1400); } }, null, 0.4);
  }


  /* ─── 16. PRECIOS: mensual / anual ────────────────── */
  const billing = $('#billing');
  if (billing) {
    const lblM = $('#lblMonthly');
    const lblA = $('#lblAnnual');
    const nums = $$('.plan .num');
    nums.forEach(el => { el.dataset.val = el.dataset.m; });
    let annual = false;
    function setBilling(a) {
      annual = a;
      billing.setAttribute('aria-checked', a);
      lblM.classList.toggle('active', !a);
      lblA.classList.toggle('active', a);
      nums.forEach(el => countTo(el, +(a ? el.dataset.a : el.dataset.m), { dur: 600 }));
    }
    billing.addEventListener('click', () => setBilling(!annual));
    lblM.addEventListener('click', () => setBilling(false));
    lblA.addEventListener('click', () => setBilling(true));
  }


  /* ─── 17. FAQ ─────────────────────────────────────── */
  $$('.faq-item').forEach(item => {
    const q = $('.faq-q', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      $$('.faq-item.open').forEach(o => { o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); });
      if (open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });


  /* ─── 18. CTA ─────────────────────────────────────── */
  const form = $('#ctaForm');
  if (form) {
    const input = $('#ctaEmail');
    const msg = $('#ctaMsg');
    const btnTxt = $('.cta-btn-txt', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (form.classList.contains('sent')) return;
      const v = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        msg.className = 'cta-msg err';
        msg.textContent = 'Escribe un correo válido, por ejemplo tu@empresa.com';
        input.focus();
        return;
      }
      form.classList.add('sent');
      btnTxt.textContent = '¡Solicitud enviada!';
      input.value = '';
      input.placeholder = 'Revisa tu bandeja de entrada';
      input.disabled = true;
      msg.className = 'cta-msg ok';
      msg.textContent = 'Listo. Pronto nos pondremos en contacto contigo.';
      const r = $('button', form).getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 28);
    });
    input.addEventListener('input', () => {
      if (msg.classList.contains('err')) { msg.textContent = ''; msg.className = 'cta-msg'; form.classList.remove('shake'); }
    });
  }


  /* ─── 19. FOOTER ──────────────────────────────────── */
  const word = $('#footerWord');
  if (word) word.innerHTML = [...word.textContent].map((ch, i) => `<span class="l" style="--i:${i}">${ch}</span>`).join('');
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();


  /* ─── 20. BUCLE DE SCROLL ─────────────────────────── */
  let ticking = false;
  function onScroll() {
    ticking = false;
    updateNav();
    updateStage();
    updateProcess();
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(onScroll));
  onScroll();

})();
