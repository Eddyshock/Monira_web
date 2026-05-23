/* ══════════════════════════════════════════════════════
   MONIRA — main.js
   Sticky nav · Reveal · CountUp · Views · Carousel ·
   FAQ · Pricing Toggle · Mobile Menu · Progress anim
══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. STICKY NAV ─────────────────────────────── */
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });


  /* ─── 2. MOBILE MENU ────────────────────────────── */
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');

  menuToggle?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    const [s1, s2, s3] = menuToggle.querySelectorAll('span');
    if (open) {
      s1.style.cssText = 'transform:translateY(7px) rotate(45deg)';
      s2.style.cssText = 'opacity:0';
      s3.style.cssText = 'transform:translateY(-7px) rotate(-45deg)';
    } else {
      [s1, s2, s3].forEach(s => s.removeAttribute('style'));
    }
  });
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.querySelectorAll('span').forEach(s => s.removeAttribute('style'));
    });
  });


  /* ─── 3. SCROLL REVEAL ──────────────────────────── */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));


  /* ─── 4. COUNTUP (original + stats section) ─────── */
  function countUp(el, target, duration = 1400) {
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('es-MX');
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString('es-MX');
    };
    requestAnimationFrame(tick);
  }

  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Dashboard metric-numbers use current text; stat-num uses data-target
      const target = parseInt(el.dataset.target || el.textContent, 10);
      countUp(el, target);
      countObs.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.metric-number, .stat-num').forEach(el => countObs.observe(el));


  /* ─── 5. PROGRESS BAR ───────────────────────────── */
  const progObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const fill = entry.target.querySelector('.dp-fill');
      if (fill) {
        const target = fill.style.width;
        fill.style.width = '0%';
        setTimeout(() => { fill.style.width = target; }, 200);
      }
      progObs.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.dash-card-full').forEach(el => progObs.observe(el));


  /* ─── 6. VIEW TABS ──────────────────────────────── */
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('view-' + tab.dataset.view);
      if (panel) panel.classList.add('active');
    });
  });


  /* ─── 7. PRICING TOGGLE ─────────────────────────── */
  const priceTgl = document.getElementById('priceTgl');
  const lblM     = document.getElementById('lbl-m');
  const lblA     = document.getElementById('lbl-a');

  const prices = {
    m: { std: 200, pro: 300, exp: 100 },
    a: { std: 170, pro: 255, exp: 85  }
  };
  let isAnnual = false;

  function animPrice(id, from, to) {
    const el = document.getElementById(id);
    if (!el) return;
    const dur = 400, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 2);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  priceTgl?.addEventListener('click', () => {
    isAnnual = !isAnnual;
    priceTgl.classList.toggle('on', isAnnual);
    lblM?.classList.toggle('active', !isAnnual);
    lblA?.classList.toggle('active', isAnnual);
    const prev = isAnnual ? prices.m : prices.a;
    const next = isAnnual ? prices.a : prices.m;
    animPrice('p-std', prev.std, next.std);
    animPrice('p-pro', prev.pro, next.pro);
    animPrice('p-exp', prev.exp, next.exp);
  });


  /* ─── 8. TESTIMONIALS CAROUSEL ──────────────────── */
  const track  = document.getElementById('testiTrack');
  const dotsEl = document.getElementById('tDots');
  const prevB  = document.getElementById('tPrev');
  const nextB  = document.getElementById('tNext');

  if (track) {
    const cards   = track.querySelectorAll('.testi-card');
    const total   = cards.length;
    const perView = () => window.innerWidth < 768 ? 1 : 3;
    let cur = 0, timer;

    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      const max = total - perView();
      for (let i = 0; i <= max; i++) {
        const d = document.createElement('div');
        d.className = 'tcar-dot' + (i === 0 ? ' on' : '');
        d.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(d);
      }
    }
    function updateDots() {
      dotsEl?.querySelectorAll('.tcar-dot').forEach((d, i) => d.classList.toggle('on', i === cur));
    }
    function goTo(i) {
      const max = total - perView();
      cur = Math.max(0, Math.min(i, max));
      const w = cards[0].offsetWidth + 24;
      track.style.transform = `translateX(-${cur * w}px)`;
      updateDots();
    }
    const next = () => goTo(cur >= total - perView() ? 0 : cur + 1);
    const prev = () => goTo(cur <= 0 ? total - perView() : cur - 1);

    const startAuto = () => { timer = setInterval(next, 4500); };
    prevB?.addEventListener('click', () => { clearInterval(timer); prev(); startAuto(); });
    nextB?.addEventListener('click', () => { clearInterval(timer); next(); startAuto(); });

    buildDots(); startAuto();
    track.addEventListener('mouseenter', () => clearInterval(timer));
    track.addEventListener('mouseleave', startAuto);

    // Touch
    let tx = 0;
    track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const d = tx - e.changedTouches[0].clientX;
      if (Math.abs(d) > 50) d > 0 ? next() : prev();
    });
    window.addEventListener('resize', () => { buildDots(); goTo(0); });
  }


  /* ─── 9. FAQ ACCORDION ──────────────────────────── */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q')?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });


  /* ─── 10. SMOOTH SCROLL ─────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });


  /* ─── 11. CTA FORM ──────────────────────────────── */
  const ctaInput  = document.querySelector('.cta-input');
  const ctaSubmit = document.querySelector('.cta-submit');
  ctaSubmit?.addEventListener('click', () => {
    const v = ctaInput?.value.trim();
    if (!v || !v.includes('@')) {
      ctaInput?.classList.add('err');
      ctaInput?.focus();
      setTimeout(() => ctaInput?.classList.remove('err'), 1200);
      return;
    }
    ctaSubmit.textContent = '✓ ¡Listo! Pronto nos ponemos en contacto';
    ctaSubmit.style.background = 'linear-gradient(135deg,#52c41a,#389e0d)';
    if (ctaInput) { ctaInput.value = ''; ctaInput.placeholder = 'Revisa tu bandeja de entrada 📬'; }
    setTimeout(() => {
      ctaSubmit.textContent = 'Solicita tu prueba gratuita de 30 días →';
      ctaSubmit.removeAttribute('style');
      if (ctaInput) ctaInput.placeholder = 'tu@empresa.com';
    }, 4500);
  });


  /* ─── 12. FEATURE CARD CURSOR GLOW ─────────────── */
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.background = `radial-gradient(circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(255,106,0,0.07) 0%, #161616 55%)`;
    });
    card.addEventListener('mouseleave', () => { card.style.background = ''; });
  });


  /* ─── 13. ACTIVE NAV HIGHLIGHT ──────────────────── */
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let id = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) id = s.id; });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.style.color = a.getAttribute('href') === '#' + id ? 'var(--primary)' : '';
    });
  }, { passive: true });


  /* ─── Extra: inline error style ────────────────── */
  const s = document.createElement('style');
  s.textContent = `.cta-input.err{border-color:#e62e00!important;animation:ctaShake 0.4s ease}@keyframes ctaShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`;
  document.head.appendChild(s);

});
