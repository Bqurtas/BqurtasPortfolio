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
