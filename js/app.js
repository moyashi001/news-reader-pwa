(function () {
  const views = {
    news: document.getElementById('view-news'),
    article: document.getElementById('view-article'),
    settings: document.getElementById('view-settings'),
  };

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });
    Array.from(document.querySelectorAll('.tab-item')).forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === name);
    });
  }

  function route() {
    const hash = location.hash || '#/';
    const articleMatch = hash.match(/^#\/article\/(.+)$/);
    if (articleMatch) {
      showView('article');
      ArticleDetail.open(decodeURIComponent(articleMatch[1]));
      return;
    }
    if (hash === '#/settings') {
      showView('settings');
      Settings.refreshAll();
      return;
    }
    showView('news');
  }

  function setupTabs() {
    Array.from(document.querySelectorAll('.tab-item')).forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        location.hash = tab === 'settings' ? '#/settings' : '#/';
      });
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
    }
  }

  async function init() {
    Theme.init();
    setupTabs();
    ArticleDetail.init();
    Settings.init();
    await NewsList.init();
    Sync.init();
    Storage.deleteOlderThan(Settings.getCacheDays());
    window.addEventListener('hashchange', route);
    route();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
