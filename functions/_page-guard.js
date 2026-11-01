/* =========================================================
   Page guard — one source for every page that shows the work
   ---------------------------------------------------------
   Right-click (Save image…, Inspect), dragging artwork out of the page, and
   the DevTools / view-source / save-page shortcuts stay closed. Text fields
   keep their own menu on a touch screen and in the Studio dashboard, so paste
   and spelling suggestions still work there.

   A deterrent, not protection: the browser's own menu bar can still open
   DevTools, and every image the page shows has already been downloaded.

   iOS never sends contextmenu for a long-press, so each page's CSS also sets
   -webkit-touch-callout:none on the artwork and the links around it.

   The work pages inline this text with their CSP nonce. preview_site/js/
   main.js (the site) and preview_site/js/archive.js (the archive) carry the
   same text verbatim — tests/page-guard.test.mjs fails if a copy drifts.
   ========================================================= */
export const PAGE_GUARD_JS = `(() => {
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
})();`;
