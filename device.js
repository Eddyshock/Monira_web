/* ══════════════════════════════════════════════════════
   MONIRA — device.js
   Detecta el dispositivo antes de pintar la página y lo
   marca en <html> para que CSS y main.js se adapten:
     · is-mobile / is-tablet / is-desktop  (tipo de equipo)
     · is-touch / is-pointer               (entrada principal)
   Expone window.MoniraDevice y avisa con el evento
   «devicechange» cuando algo cambia (rotar, conectar mouse…).
══════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const root = document.documentElement;
  const mq = q => matchMedia(q);
  const coarse = mq('(pointer: coarse)');
  const noHover = mq('(hover: none)');

  function uaMobile() {
    const uad = navigator.userAgentData;
    if (uad && typeof uad.mobile === 'boolean') return uad.mobile;
    return /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini|Mobile Safari/i.test(navigator.userAgent);
  }
  // iPadOS se presenta como Mac de escritorio; lo delata la pantalla táctil
  const iPadOS = () => /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;

  function detect() {
    const touch = coarse.matches || noHover.matches;
    // Lado corto de la pantalla física: no cambia al rotar ni al redimensionar la ventana
    const short = Math.min(screen.width, screen.height);
    let type = 'desktop';
    if (uaMobile() || (touch && short < 600)) type = 'mobile';
    else if (touch || iPadOS()) type = 'tablet';
    return {
      type,
      touch,
      input: touch ? 'touch' : 'pointer',
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
      landscape: innerWidth > innerHeight
    };
  }

  const device = { on: fn => addEventListener('devicechange', e => fn(e.detail)) };

  function apply() {
    const d = detect();
    const changed = d.type !== device.type || d.input !== device.input;
    Object.assign(device, d);
    root.classList.remove('is-mobile', 'is-tablet', 'is-desktop', 'is-touch', 'is-pointer');
    root.classList.add(`is-${d.type}`, `is-${d.input}`);
    root.classList.toggle('is-landscape', d.landscape);
    root.dataset.device = d.type;
    return changed;
  }

  apply();
  window.MoniraDevice = device;

  let raf = 0;
  const recheck = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (apply()) dispatchEvent(new CustomEvent('devicechange', { detail: device }));
    });
  };
  coarse.addEventListener('change', recheck);
  noHover.addEventListener('change', recheck);
  addEventListener('resize', recheck);
  addEventListener('orientationchange', recheck);
})();
