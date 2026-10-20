/* ══════════════════════════════════════════════════════
   MONIRA — main.js
   Nav · Reveal · Hero (Inicio en vivo) · Bento · Cómo funciona ·
   Vistas (Kanban, Gantt, Lista, Tabla) · Teléfono · Calculadora ·
   Precios · FAQ · CTA
   Todos los datos de los mockups son de ejemplo.
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
  const ICON = id => `<svg class="icon"><use href="#${id}"/></svg>`;

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
    const from = el.dataset.val !== undefined ? +el.dataset.val : (parseFloat(el.textContent) || 0);
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
    const colors = ['#ff6a00', '#ffb23f', '#4c6ef5', '#40c057', '#9775fa', '#ffffff'];
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
  const burstAt = (el, n) => { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n); };
  const pop = el => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };
  const bump = (el, cls = 'bump') => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };


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
      // Al terminar se quita .reveal para que el elemento recupere sus propias transiciones
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


  /* ─── 6. HERO: Inicio de la app en vivo ───────────── */
  const heroDay = $('#heroDay');
  if (heroDay && !reduce) {
    const kpi = k => $(`#heroKpis [data-k="${k}"]`);
    const counts = { venc: 2, hoy: 4, prox: 6, prog: 9, pend: 12, done: 48 };
    Object.entries(counts).forEach(([k, v]) => { $('b', kpi(k)).dataset.val = v; });
    const dayN = $('#heroDayN');
    const bell = $('#heroBell');
    const alertTxt = $('#heroAlert');
    const toast = $('#heroToast');
    const chipB = $('.chip-b');
    const mods = { op: '#4c6ef5', com: '#9775fa', sop: '#339af0', an: '#e64980' };
    const modNames = { op: 'Operaciones', com: 'Comunicación', sop: 'Soporte', an: 'Analítica' };
    const dueTxt = { venc: 'Venció hace 1 d', hoy: 'Vence hoy', prox: 'Mañana' };
    const pool = [
      { t: 'Revisión de inventario',          mod: 'op',  p: 'p2', who: 'Jorge',     b: 'hoy',  w: 30, from: 'María' },
      { t: 'Manual de procesos',              mod: 'sop', p: 'p3', who: 'Eduardo +1', b: 'prox', w: 20, from: 'Luis' },
      { t: 'Actualizar tablero de indicadores', mod: 'an', p: 'p2', who: 'Ana',      b: 'venc', w: 55, from: 'Eduardo' },
      { t: 'Encuesta de clima laboral',       mod: 'com', p: 'p3', who: 'María',     b: 'prox', w: 10, from: 'Sofía' },
      { t: 'Inventario de equipo de cómputo', mod: 'op',  p: 'p1', who: 'Luis',      b: 'hoy',  w: 45, from: 'Ana' },
      { t: 'Reporte de ventas semanal',       mod: 'an',  p: 'p2', who: 'Ana +1',    b: 'hoy',  w: 60, from: 'Jorge' }
    ];
    let pi = 0, bells = 3, loop = null;
    const t = timers();

    function setCount(k, v) {
      counts[k] = Math.max(0, v);
      const el = kpi(k);
      countTo($('b', el), counts[k], { dur: 500 });
      bump(el);
    }
    function refreshAlert() {
      const v = counts.venc;
      const txt = v ? `Tienes ${v} ${v === 1 ? 'vencida' : 'vencidas'} y 3 actividades para esta semana` : 'Sin vencidas · 3 actividades para esta semana';
      alertTxt.textContent = txt;
      $('b', chipB).textContent = v ? `Tienes ${v} ${v === 1 ? 'vencida' : 'vencidas'}` : 'Sin vencidas';
      kpi('venc').classList.toggle('is-alert', v > 0);
    }
    function makeItem(d) {
      const el = document.createElement('div');
      el.className = 'mx-item entering';
      el.dataset.b = d.b;
      el.dataset.mod = d.mod;
      el.innerHTML = `<span class="mx-ck b-${d.b}">${ICON('i-check')}</span><span class="mx-title">${d.t}</span><svg class="icon mx-chev"><use href="#i-chev"/></svg><span class="mx-meta"><i class="mx-p ${d.p}">${d.p.toUpperCase()}</i><i class="mx-mod" style="--c:${mods[d.mod]}">${modNames[d.mod]}</i><i class="mx-who">${ICON('i-user')}${d.who}</i><i class="mx-due due-${d.b}">${dueTxt[d.b]}</i></span><span class="mx-bar"><i style="--w:${d.w}%"></i></span>`;
      return el;
    }
    function advanceModule(mod) {
      const card = $(`#heroMods [data-mod="${mod}"]`);
      if (!card) return;
      const bar = $('.mx-mbar i', card);
      const label = $('.mx-mbar b', card);
      const ex = $('.ex', card);
      const pct = Math.min(100, (parseInt(label.textContent, 10) || 0) + 4);
      bar.style.setProperty('--w', `${pct}%`);
      label.textContent = `${pct}%`;
      if (ex) ex.textContent = +ex.textContent + 1;
    }

    function cycle() {
      if (document.hidden) return;
      const item = $$('.mx-item:not(.done)', heroDay)[0];
      if (!item) return;
      // 1) Se completa la primera actividad de «Mi día»
      item.classList.add('done');
      $('.mx-due', item).textContent = 'Hecho';
      const b = item.dataset.b;
      setCount(b, counts[b] - 1);
      setCount('prog', counts.prog - 1);
      setCount('done', counts.done + 1);
      advanceModule(item.dataset.mod);
      refreshAlert();
      burstAt($('.mx-ck', item), 12);

      // 2) Sale de la lista y entra una nueva asignación
      t.add(1500, () => {
        item.classList.add('leaving');
        t.add(500, () => item.remove());
        const d = pool[pi++ % pool.length];
        const fresh = makeItem(d);
        heroDay.append(fresh);
        requestAnimationFrame(() => requestAnimationFrame(() => fresh.classList.remove('entering')));
        setCount(d.b, counts[d.b] + 1);
        setCount('prog', counts.prog + 1);
        refreshAlert();
        bells = Math.min(bells + 1, 10);
        bell.textContent = bells > 9 ? '9+' : bells;
        dayN.textContent = $$('.mx-item:not(.done)', heroDay).length;
        $('b', toast).textContent = 'Nueva tarea asignada';
        $('small', toast).textContent = `${d.from} te asignó «${d.t}»`;
        pop(toast);
      });
    }

    onVisible(heroDay,
      () => { if (!loop) loop = setInterval(cycle, 4200); },
      () => { clearInterval(loop); loop = null; t.clear(); },
      0.1);
  }


  /* ─── 7. MICRO-INTERACCIONES ──────────────────────── */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
        b.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    });
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
    target.dataset.val = 0;
    countTo(target, +target.dataset.count, { dur: 1400 });
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));


  /* ─── 8. BENTO: comentarios ───────────────────────── */
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


  /* ─── 9. BENTO: celebración al completar ──────────── */
  const cele = $('#cele');
  if (cele) {
    const btn = $('#celeBtn');
    const last = $('#celeLast');
    const st = $('#celeSt');
    const bar = $('#celeBar');
    const n = $('#celeN');
    const plan = $('#celePlan');
    const tag = $('#celeTag');
    const names = ['Piñata', 'Cometa', 'Galaxia', 'Medalla', 'Sello', 'Mariposas', 'Arcoíris', 'Bandera de meta', 'Lluvia de palomitas', 'Farolitos', 'Neón', 'Constelación'];
    let ni = 0, touched = false;
    n.dataset.val = 80;

    function complete() {
      cele.classList.add('done');
      last.classList.add('done');
      plan.textContent = '5/5';
      bar.style.setProperty('--w', '100%');
      countTo(n, 100, { dur: 600, fmt: v => `${Math.round(v)}%` });
      st.className = 'mx-st st-done';
      st.textContent = 'Completada';
      tag.textContent = `¡Hecho! · ${names[ni++ % names.length]}`;
      tag.classList.add('show');
      btn.textContent = 'Reabrir';
      btn.classList.add('reopen');
      burstAt(btn, 26);
    }
    function reopen() {
      cele.classList.remove('done');
      last.classList.remove('done');
      plan.textContent = '4/5';
      bar.style.setProperty('--w', '80%');
      countTo(n, 80, { dur: 400, fmt: v => `${Math.round(v)}%` });
      st.className = 'mx-st st-prog';
      st.textContent = 'En proceso';
      tag.classList.remove('show');
      btn.textContent = 'Completar actividad';
      btn.classList.remove('reopen');
    }
    btn.addEventListener('click', () => { touched = true; cele.classList.contains('done') ? reopen() : complete(); });
    last.addEventListener('click', () => { touched = true; if (!cele.classList.contains('done')) complete(); });
    // Si nadie la toca, se completa sola una vez para mostrar la celebración
    let auto = null;
    onVisible(cele, () => { if (!touched && !auto) auto = setTimeout(() => { if (!touched) complete(); }, 3200); }, null, 0.6);
  }


  /* ─── 10. CÓMO FUNCIONA: pasos ligados al scroll ──── */
  const processSec = $('#proceso');
  const steps = $$('.pstep');
  const screens = $$('.stage-screen');
  const frame = $('#stageFrame');
  const rail = $('.rail i');
  const stepsWrap = $('#processSteps');
  const typeTask = $('#typeTask');
  const formCount = $('#formCount');
  const st2 = timers();
  let curStep = -1;

  screens.forEach(s => s.classList.remove('active'));

  function playForm() {
    st2.clear();
    const text = 'Reporte mensual de resultados';
    if (reduce) { typeTask.textContent = text; formCount.textContent = '4 de 4'; return; }
    typeTask.textContent = '';
    formCount.textContent = '0 de 4';
    [...text].forEach((ch, i) => st2.add(200 + i * 40, () => { typeTask.textContent = text.slice(0, i + 1); }));
    st2.add(200 + text.length * 40, () => { formCount.textContent = '1 de 4'; });
    [1, 3, 4].forEach((d, k) => st2.add(1600 + d * 220, () => { formCount.textContent = `${k + 2} de 4`; }));
  }

  function setStep(i) {
    if (i === curStep) return;
    curStep = i;
    steps.forEach((s, k) => s.classList.toggle('active', k === i));
    screens.forEach((s, k) => s.classList.toggle('active', k === i));
    frame.dataset.step = i + 1;
    if (i === 1) playForm(); else st2.clear();
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
  let onViewShown = () => {};
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
      timer = setTimeout(() => show((vi + 1) % tabs.length), 7000);
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
      onViewShown(panels[i].id);
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
    queueMicrotask(() => show(0));
  }


  /* ─── 12. VISTAS: Kanban por tarjeta ──────────────── */
  const vk = $('#vkBoard');
  if (vk) {
    const cols = $$('.vk-col', vk);
    let drag = null;

    function refreshCounts() {
      cols.forEach(col => {
        const em = $('.vk-h em', col);
        const n = $$('.vk-card', col).length;
        if (+em.textContent !== n) { em.textContent = n; bump(em); setTimeout(() => em.classList.remove('bump'), 400); }
      });
    }

    // Estado de una tarjeta según sus sub-actividades
    function syncCard(card, celebrate) {
      const subs = $$('.vk-sub', card);
      const done = subs.filter(s => s.classList.contains('done')).length;
      const all = done === subs.length;
      const st = $('.mx-st', card);
      const due = $('.vk-due', card);
      if (!due.dataset.orig) { due.dataset.orig = due.textContent; due.dataset.cls = due.className; }
      $('.vk-sh em', card).textContent = `${done}/${subs.length}`;
      $('.vk-sbar i', card).style.setProperty('--w', `${subs.length ? done / subs.length * 100 : 0}%`);
      const wasDone = card.classList.contains('is-done');
      card.classList.toggle('is-done', all);
      if (all) {
        st.className = 'mx-st st-done'; st.textContent = 'Ejecutado';
        due.className = 'vk-due ok'; due.textContent = 'Hecho';
        if (celebrate && !wasDone) burstAt(card, 20);
      } else {
        st.className = done ? 'mx-st st-prog' : 'mx-st st-pend';
        st.textContent = done ? 'En proceso' : 'Pendiente';
        if (due.textContent === 'Hecho') { due.className = due.dataset.cls === 'vk-due ok' ? 'vk-due' : due.dataset.cls; due.textContent = due.dataset.orig === 'Hecho' ? 'Reabierta' : due.dataset.orig; }
      }
    }

    vk.addEventListener('click', e => {
      const sub = e.target.closest('.vk-sub');
      if (!sub) return;
      sub.classList.toggle('done');
      syncCard(sub.closest('.vk-card'), true);
    });

    function landed(card) {
      card.classList.add('landed');
      setTimeout(() => card.classList.remove('landed'), 500);
      card.style.setProperty('--c', getComputedStyle(card.closest('.vk-col')).getPropertyValue('--c'));
      refreshCounts();
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
      if (!card || e.target.closest('.vk-sub') || e.button !== 0 || drag) return;
      const r = card.getBoundingClientRect();
      drag = {
        card, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY,
        ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, h: r.height,
        on: false, touch: e.pointerType !== 'mouse', hold: null
      };
      // En táctil se arrastra con pulsación larga para no bloquear el scroll
      if (drag.touch) drag.hold = setTimeout(() => drag && begin(drag.lx, drag.ly), 260);
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

    vk.addEventListener('keydown', e => {
      const card = e.target.closest('.vk-card');
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!card || e.target !== card || !dir) return;
      e.preventDefault();
      const to = cols[cols.indexOf(card.closest('.vk-col')) + dir];
      if (!to) return;
      $('.vk-list', to).append(card);
      card.focus();
      landed(card);
    });
  }


  /* ─── 13. VISTAS: Gantt, Lista y Tabla ────────────── */
  // Gantt: 21 días (12 oct – 1 nov 2026); hoy = 19 oct (día 7)
  const gtBody = $('#gtBody');
  const gtDeps = $('#gtDeps');
  if (gtBody) {
    const days = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1];
    $('#gtDays').innerHTML = days.map((d, i) => `<span${i === 7 ? ' class="hoy"' : ''}>${d}</span>`).join('');
    const groups = [
      { name: 'Operaciones', c: '#4c6ef5', rows: [
        { t: 'Checklist de apertura', s: 0, n: 4, done: true, av: ['LR', 150] },
        { t: 'Revisión de inventario', s: 4, n: 8, av: ['JC', 200], id: 'rev' },
        { t: 'Inventario de equipo de cómputo', s: 13, n: 6, av: ['LR', 150], dep: 'rev' }
      ] },
      { name: 'Comunicación', c: '#9775fa', rows: [
        { t: 'Campaña interna de bienvenida', s: 2, n: 9, av: ['MR', 280] },
        { t: 'Encuesta de clima laboral', s: 9, n: 8, av: ['MR', 280] }
      ] },
      { name: 'Analítica', c: '#e64980', rows: [
        { t: 'Reporte mensual de resultados', s: 1, n: 7, av: ['AL', 330] },
        { t: 'Actualizar tablero de indicadores', s: 3, n: 3, late: true, av: ['AL', 330] }
      ] },
      { name: 'Capacitación', c: '#fd7e14', rows: [
        { t: 'Capacitación del equipo nuevo', s: 8, n: 8, av: ['SG', 100] }
      ] }
    ];
    let d = 0;
    const html = groups.map(g => {
      const head = `<div class="gt-row grp"><span class="gt-name">${ICON('i-chevd')}<span class="gt-tag" style="--c:${g.c}">${g.name}</span><small>${g.rows.length}</small></span><span class="gt-track"></span></div>`;
      const rows = g.rows.map(r => `<div class="gt-row${r.done ? ' done' : ''}"${r.id ? ` data-id="${r.id}"` : ''}${r.dep ? ` data-dep="${r.dep}"` : ''}><span class="gt-name">${ICON(r.done ? 'i-checkc' : 'i-circle')}${r.t}</span><span class="gt-track"><span class="gt-bar${r.late ? ' late' : ''}" style="--s:${r.s};--n:${r.n};--c:${g.c};--d:${d++}"><b class="av" style="--h:${r.av[1]}">${r.av[0]}</b></span></span></div>`).join('');
      return head + rows;
    }).join('');
    gtBody.insertAdjacentHTML('beforeend', html);

    // Flecha de dependencia: del final de una barra al inicio de la siguiente
    function drawDeps() {
      const body = gtBody.getBoundingClientRect();
      if (!body.width) return;
      gtDeps.setAttribute('viewBox', `0 0 ${body.width} ${body.height}`);
      gtDeps.innerHTML = $$('[data-dep]', gtBody).map(row => {
        const from = $(`[data-id="${row.dataset.dep}"]`, gtBody);
        const pos = (r) => {
          const tr = $('.gt-track', r).getBoundingClientRect();
          const bar = $('.gt-bar', r);
          const s = +bar.style.getPropertyValue('--s'), n = +bar.style.getPropertyValue('--n');
          return { x1: tr.left - body.left + tr.width * s / 21, x2: tr.left - body.left + tr.width * (s + n) / 21, y: tr.top - body.top + tr.height / 2 };
        };
        const a = pos(from), b = pos(row);
        const mid = a.x2 + 8;
        return `<path d="M${a.x2.toFixed(1)} ${a.y.toFixed(1)} H${mid.toFixed(1)} V${b.y.toFixed(1)} H${(b.x1 - 2).toFixed(1)}"/><path d="M${(b.x1 - 7).toFixed(1)} ${(b.y - 4).toFixed(1)} L${(b.x1 - 2).toFixed(1)} ${b.y.toFixed(1)} L${(b.x1 - 7).toFixed(1)} ${(b.y + 4).toFixed(1)}" style="stroke-dasharray:none"/>`;
      }).join('');
    }
    addEventListener('resize', drawDeps);
    const prevShown = onViewShown;
    onViewShown = id => { prevShown(id); if (id === 'v-gantt') requestAnimationFrame(drawDeps); };
  }

  // Lista
  const lsList = $('#lsList');
  if (lsList) {
    const rows = [
      { t: 'Reporte mensual de resultados', mod: 'Analítica', c: '#e64980', card: 'Reportes', who: 'ANA LÓPEZ', st: 'prog', date: '19 oct', p: 80 },
      { t: 'Checklist de apertura', mod: 'Operaciones', c: '#4c6ef5', card: 'Tiendas', who: 'LUIS RAMOS', st: 'prog', date: '17 oct', p: 70, late: true },
      { t: 'Campaña interna de bienvenida', mod: 'Comunicación', c: '#9775fa', card: 'Campañas', who: 'MARÍA RUIZ', st: 'prog', date: '22 oct', p: 40 },
      { t: 'Manual de bienvenida', mod: 'Capacitación', c: '#fd7e14', card: 'Cursos', who: 'EDUARDO DÍAZ', st: 'done', date: '14 oct', p: 100 },
      { t: 'Revisión de inventario', mod: 'Operaciones', c: '#4c6ef5', card: 'Tiendas', who: 'JORGE CRUZ', st: 'pend', date: '23 oct', p: 0 },
      { t: 'Encuesta de clima laboral', mod: 'Comunicación', c: '#9775fa', card: 'Campañas', who: 'MARÍA RUIZ', st: 'pend', date: '28 oct', p: 0 }
    ];
    const stTxt = { prog: 'En proceso', pend: 'Pendiente', done: 'Ejecutado' };
    lsList.insertAdjacentHTML('beforeend', rows.map((r, i) => `
      <div class="ls-row${r.st === 'done' ? ' done' : ''}" style="--d:${i}" data-st="${r.st}" data-p="${r.p}">
        <button type="button" class="ls-ck" aria-pressed="${r.st === 'done'}" aria-label="Marcar como hecha">${ICON('i-check')}</button>
        <span class="ls-t">${r.t}</span>
        <span class="ls-sub"><i class="mx-mod" style="--c:${r.c}">${r.mod}</i>· ${r.card} · ${r.who}</span>
        <span class="ls-side"><i class="mx-st st-${r.st}">${stTxt[r.st]} ▾</i><span class="ls-date"${r.late ? ' style="color:#ff8787"' : ''}>${ICON('i-cal')}${r.date}</span><span class="ls-prog"><b>${r.p}%</b><span><i style="--w:${r.p}%"></i></span></span></span>
      </div>`).join(''));
    lsList.addEventListener('click', e => {
      const btn = e.target.closest('.ls-ck');
      if (!btn) return;
      const row = btn.closest('.ls-row');
      const done = row.classList.toggle('done');
      const orig = done ? null : row.dataset.st === 'done' ? 'prog' : row.dataset.st;
      const p = done ? 100 : (+row.dataset.p === 100 ? 60 : +row.dataset.p);
      const st = $('.mx-st', row);
      st.className = `mx-st st-${done ? 'done' : orig}`;
      st.textContent = `${stTxt[done ? 'done' : orig]} ▾`;
      $('.ls-prog b', row).textContent = `${p}%`;
      $('.ls-prog i', row).style.setProperty('--w', `${p}%`);
      btn.setAttribute('aria-pressed', done);
      if (done) burstAt(btn, 10);
    });
  }

  // Tabla ordenable
  const tbBody = $('#tbBody');
  if (tbBody) {
    const mods = { 'Operaciones': '#4c6ef5', 'Comunicación': '#9775fa', 'Analítica': '#e64980', 'Capacitación': '#fd7e14' };
    const hues = { 'Ana López': 330, 'Luis Ramos': 150, 'María Ruiz': 280, 'Jorge Cruz': 200, 'Sofía Gómez': 100, 'Eduardo Díaz': 20 };
    const stCls = { 'En proceso': 'st-prog', 'Pendiente': 'st-pend', 'Ejecutado': 'st-done' };
    const data = [
      { title: 'Reporte mensual de resultados', st: 'En proceso', p: 'P1', prog: 80, ini: 13, fin: 19, who: 'Ana López', mod: 'Analítica' },
      { title: 'Checklist de apertura', st: 'En proceso', p: 'P1', prog: 70, ini: 12, fin: 17, who: 'Luis Ramos', mod: 'Operaciones' },
      { title: 'Campaña interna de bienvenida', st: 'En proceso', p: 'P2', prog: 40, ini: 14, fin: 22, who: 'María Ruiz', mod: 'Comunicación' },
      { title: 'Actualizar tablero de indicadores', st: 'Pendiente', p: 'P2', prog: 0, ini: 15, fin: 18, who: 'Ana López', mod: 'Analítica' },
      { title: 'Revisión de inventario', st: 'Pendiente', p: 'P2', prog: 0, ini: 16, fin: 23, who: 'Jorge Cruz', mod: 'Operaciones' },
      { title: 'Capacitación del equipo nuevo', st: 'Pendiente', p: 'P2', prog: 0, ini: 20, fin: 27, who: 'Sofía Gómez', mod: 'Capacitación' },
      { title: 'Encuesta de clima laboral', st: 'Pendiente', p: 'P3', prog: 0, ini: 21, fin: 28, who: 'María Ruiz', mod: 'Comunicación' },
      { title: 'Manual de bienvenida', st: 'Ejecutado', p: 'P3', prog: 100, ini: 6, fin: 14, who: 'Eduardo Díaz', mod: 'Capacitación' }
    ];
    const initials = n => n.split(' ').map(w => w[0]).join('');
    let sortKey = 'fin', asc = true;
    function render() {
      const rows = data.slice().sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
        return asc ? r : -r;
      });
      tbBody.innerHTML = rows.map((r, i) => {
        const late = r.fin < 19 && r.st !== 'Ejecutado';
        return `<tr style="--d:${i}">
          <td class="tb-t">${r.title}</td>
          <td><i class="mx-st ${stCls[r.st]}">${r.st}</i></td>
          <td><i class="mx-p ${r.p.toLowerCase()}">${r.p}</i></td>
          <td><span class="tb-prog" style="--c:${r.prog === 100 ? '#40c057' : '#fab005'}"><span><i style="--w:${r.prog}%"></i></span><b>${r.prog}%</b></span></td>
          <td>${r.ini} oct</td>
          <td class="${late ? 'late' : ''}">${late ? '⚠ ' : ''}${r.fin} oct</td>
          <td><span class="tb-who"><b class="av" style="--h:${hues[r.who]}">${initials(r.who)}</b>${r.who}</span></td>
          <td><i class="mx-mod" style="--c:${mods[r.mod]}">${r.mod}</i></td>
        </tr>`;
      }).join('');
    }
    $$('#tbTable th').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      asc = k === sortKey ? !asc : true;
      sortKey = k;
      $$('#tbTable th').forEach(x => x.classList.toggle('sorted', x === th));
      th.classList.toggle('asc', asc);
      th.classList.toggle('desc', !asc);
      render();
    }));
    render();
  }


  /* ─── 14. INICIO EN TELÉFONO ──────────────────────── */
  const phDay = $('#phDay');
  if (phDay) {
    const mine = $('#phMine');
    const dayN = $('#phDayN');
    const doneEl = $('#phDone');
    const visibleItems = () => $$('.mx-item:not([hidden])', phDay);
    const refreshN = () => { dayN.textContent = visibleItems().filter(i => !i.classList.contains('done')).length; };
    mine.addEventListener('click', () => {
      const on = !mine.classList.contains('on');
      mine.classList.toggle('on', on);
      mine.setAttribute('aria-pressed', on);
      $$('.mx-item', phDay).forEach(i => { i.hidden = on && i.dataset.mine === '0'; });
      refreshN();
    });
    phDay.addEventListener('click', e => {
      const ck = e.target.closest('.mx-ck');
      if (!ck) return;
      const item = ck.closest('.mx-item');
      const done = item.classList.toggle('done');
      const due = $('.mx-due', item);
      if (!due.dataset.orig) due.dataset.orig = due.textContent;
      due.textContent = done ? 'Hecho' : due.dataset.orig;
      countTo(doneEl, (+doneEl.dataset.val || 48) + (done ? 1 : -1), { dur: 400 });
      refreshN();
      if (done) burstAt(ck, 14);
    });
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
    [costM, costO, save].forEach(el => { el.dataset.val = 0; });
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
      burstAt($('button', form), 28);
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
