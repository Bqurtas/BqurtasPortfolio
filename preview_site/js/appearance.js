(function () {
  const root = document.documentElement;
  function apply(theme, persist) {
    const value = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = value;
    root.style.colorScheme = value;
    if (persist) { try { localStorage.setItem('bq_theme3', value); localStorage.setItem('bq_light_v1', '1'); } catch (e) {} }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'dark' ? '#151713' : '#f5f4f0');
    document.querySelectorAll('[data-site-theme]').forEach(button => {
      button.textContent = value === 'dark' ? 'Light mode' : 'Dark mode';
      button.setAttribute('aria-pressed', String(value === 'dark'));
      button.setAttribute('aria-label', value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  let saved = 'light';
  try { saved = localStorage.getItem('bq_theme3') || 'light'; } catch (e) {}
  apply(saved, false);
  function mount() {
    apply(root.dataset.theme, false);
    document.querySelectorAll('[data-site-theme]').forEach(button => button.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();