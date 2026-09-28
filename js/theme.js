const Theme = (() => {
  const KEY = 'news-pwa:theme';

  function get() {
    return localStorage.getItem(KEY) || 'auto';
  }

  function apply(theme) {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', isDark ? '#111111' : '#FAFAF9');
    }
  }

  function set(theme) {
    localStorage.setItem(KEY, theme);
    apply(theme);
  }

  function resolved() {
    const t = get();
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function init() {
    apply(get());
  }

  return { get, set, apply, init, resolved };
})();
