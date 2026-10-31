/* Page guard — right-click, dragging artwork out, and the DevTools /
   view-source / save-page shortcuts stay closed on the archive. Source and
   rationale: functions/_page-guard.js (keep this copy verbatim). */
(() => {
  if (window.__bqPageGuard) return;
  window.__bqPageGuard = true;
  const FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
  const MEDIA = 'img, video, picture';
  const DEVTOOLS = ['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyE'];
  const nav = window.navigator || {};
  const mac = /Mac|iPhone|iPad|iPod/.test(nav.platform || nav.userAgent || '');
  const touch = window.matchMedia ? window.matchMedia('(pointer: coarse)') : { matches: false };
  const within = (event, selector) => event.target && event.target.closest ? event.target.closest(selector) : null;
  document.addEventListener('contextmenu', (event) => {
    const field = within(event, FIELD);
    if (field && (event.pointerType === 'touch' || touch.matches || field.closest('#dash'))) return;
    event.preventDefault();
  }, true);
  // A card drags as its link, and that drag carries the image inside it.
  document.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (within(event, MEDIA) || (target && target.querySelector && target.querySelector(MEDIA))) event.preventDefault();
  }, true);
  window.addEventListener('keydown', (event) => {
    const code = event.code || '';
    // Cmd on a Mac, Ctrl elsewhere. Alt stays out of the Ctrl rules: AltGr
    // arrives as Ctrl+Alt and types letters on many layouts.
    const command = mac ? event.metaKey : event.ctrlKey;
    if (code === 'F12' || event.key === 'F12'
      || (command && event.shiftKey && !event.altKey && DEVTOOLS.includes(code))
      || (mac && event.metaKey && event.altKey && (DEVTOOLS.includes(code) || code === 'KeyU'))
      || (command && !event.shiftKey && !event.altKey && (code === 'KeyU' || code === 'KeyS'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();

/* Progressive entrance motion for the standalone archive. Native scrolling,
   links and artwork never depend on this file loading or running. */
(() => {
  if (!window.IntersectionObserver || !window.matchMedia) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return;

  const pending = new Set();
  let observer;
  const reveal = target => {
    if (!pending.delete(target)) return;
    target.classList.add('is-visible');
    observer.unobserve(target);
    if (!pending.size) stop();
  };
  const focus = event => {
    const target = event.target.closest?.('.reveal-pending');
    if (target) reveal(target);
  };
  const reduce = event => { if (event.matches) stop(); };
  function stop() {
    for (const target of pending) target.classList.remove('reveal-pending');
    pending.clear();
    observer?.disconnect();
    document.removeEventListener('focusin', focus);
    window.removeEventListener('pagehide', stop);
    if (preference.removeEventListener) preference.removeEventListener('change', reduce);
    else preference.removeListener?.(reduce);
  }

  try {
    // Read geometry once, before changing classes. Nothing reads layout or
    // writes styles on scroll; each target is released after its first entry.
    const boundary = window.innerHeight - 32;
    const targets = Array.from(document.querySelectorAll('.category-card,.card,.section-heading,.archive-stats,footer'))
      .filter(target => target.getBoundingClientRect().top >= boundary);
    if (!targets.length) return;
    observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { rootMargin: '0px 0px -32px 0px', threshold: 0 });
    document.addEventListener('focusin', focus);
    window.addEventListener('pagehide', stop, { once: true });
    if (preference.addEventListener) preference.addEventListener('change', reduce);
    else preference.addListener?.(reduce);
    for (const target of targets) {
      pending.add(target);
      target.classList.add('reveal-pending');
      observer.observe(target);
    }
  } catch {
    // A partial API failure must never leave artwork hidden.
    stop();
  }
})();
