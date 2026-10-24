/* Shared by the static archive and server-rendered artwork pages. A native
   footer anchor still works when scripts are unavailable. */
export const BACK_TO_TOP_HTML = '<a class="document-to-top" data-document-top href="#page-top" aria-label="Back to top"><span aria-hidden="true">↑</span><span class="document-top-label">Back to top</span></a>';

export const BACK_TO_TOP_STYLE = `
.document-to-top{display:inline-flex;align-items:center;gap:8px;min-height:44px}
.document-to-top.is-ready{position:fixed;inset-inline-end:20px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:20;display:flex;align-items:center;justify-content:center;width:46px;height:46px;padding:0;border:1px solid var(--line,rgba(20,20,20,.2));border-radius:50%;background:var(--paper,#f6f5f1);color:var(--ink,#141414);font:400 24px/1 system-ui,sans-serif;text-decoration:none;transition:opacity .2s,transform .2s,visibility .2s}
.document-to-top.is-ready:not(.is-shown){opacity:0;visibility:hidden;pointer-events:none;transform:translateY(6px)}
.document-to-top.is-ready .document-top-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.document-to-top:focus-visible{outline:2px solid currentColor;outline-offset:4px}
body:has(.document-to-top.is-ready){padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}
@media(prefers-reduced-motion:reduce){.document-to-top.is-ready{transition:none}html{scroll-behavior:auto!important}}
`;

export const BACK_TO_TOP_JS = String.raw`(() => {
  const control = document.querySelector('[data-document-top]');
  if (!control) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let shown = false, frame = 0;
  const update = () => {
    frame = 0;
    const position = Math.max(0, Number.isFinite(window.scrollY) ? window.scrollY : (document.scrollingElement?.scrollTop || 0));
    shown = shown ? position > 40 : position > 160;
    control.classList.toggle('is-shown', shown);
    control.setAttribute('aria-hidden', String(!shown));
    control.tabIndex = shown ? 0 : -1;
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
  control.addEventListener('click', event => {
    if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try {
      window.scrollTo({ top:0, behavior:reduced.matches ? 'auto' : 'smooth' });
      event.preventDefault();
      queue();
    } catch { /* Keep the native #page-top anchor as the fallback. */ }
  });
  window.addEventListener('scroll', queue, { passive:true });
  window.addEventListener('touchmove', queue, { passive:true });
  window.addEventListener('pageshow', queue);
  window.addEventListener('resize', queue, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queue(); });
  update();
  control.classList.add('is-ready');
})();`;
