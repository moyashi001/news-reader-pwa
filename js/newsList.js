function formatRelativeTime(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

const NewsList = (() => {
  const PAGE_SIZE = 20;
  let allArticles = [];
  let currentCategory = 'トップ';
  let visibleCount = PAGE_SIZE;
  let loading = false;
  let pullStartY = null;

  function categories() {
    const set = new Set();
    allArticles.forEach((a) => { if (a.category) set.add(a.category); });
    return ['トップ', ...Array.from(set).slice(0, 5)];
  }

  function filtered() {
    if (currentCategory === 'トップ') return allArticles;
    return allArticles.filter((a) => a.category === currentCategory);
  }

  function renderCategories() {
    const row = document.getElementById('category-row');
    row.innerHTML = '';
    categories().forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (c === currentCategory ? ' active' : '');
      btn.textContent = c;
      btn.addEventListener('click', () => {
        currentCategory = c;
        visibleCount = PAGE_SIZE;
        renderCategories();
        renderList();
        document.getElementById('news-scroll').scrollTop = 0;
      });
      row.appendChild(btn);
    });
  }

  function renderSkeleton() {
    const list = document.getElementById('news-list');
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `<div class="skeleton-row"><div class="skeleton-thumb"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div></div>`;
    }
    list.innerHTML = html;
  }

  function renderList() {
    const list = document.getElementById('news-list');
    const items = filtered();
    if (!items.length) {
      list.innerHTML = '<div class="empty-state">表示できる記事がありません。<br>設定画面でRSSを購読するか、しばらくしてから更新してください。</div>';
      return;
    }
    const visible = items.slice(0, visibleCount);
    list.innerHTML = visible.map((a) => `
      <div class="news-row" data-id="${escapeHtml(a.id)}">
        ${a.thumbnailUrl
          ? `<img class="thumb" src="${escapeHtml(a.thumbnailUrl)}" alt="" loading="lazy" onerror="this.removeAttribute('src')">`
          : '<div class="thumb"></div>'}
        <div class="news-body">
          <div class="news-title">${escapeHtml(a.title)}</div>
          <div class="news-meta">${escapeHtml(a.source)}・${formatRelativeTime(a.publishedAt)}</div>
        </div>
      </div>
    `).join('');
    Array.from(list.querySelectorAll('.news-row')).forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        location.hash = `#/article/${encodeURIComponent(id)}`;
      });
    });
  }

  function setStatusBanner(text, kind) {
    const el = document.getElementById('status-banner');
    if (!text) { el.classList.remove('show', 'updated'); return; }
    el.textContent = text;
    el.classList.add('show');
    el.classList.toggle('updated', kind === 'updated');
    if (kind === 'updated') {
      setTimeout(() => el.classList.remove('show', 'updated'), 2500);
    }
  }

  async function loadFromCache() {
    allArticles = await Storage.getAllArticles();
    renderCategories();
    renderList();
  }

  async function refresh({ manual } = {}) {
    if (loading) return;
    loading = true;
    if (!allArticles.length) renderSkeleton();
    try {
      const { articles, errors } = await Sources.fetchAllEnabled();
      if (articles.length) {
        await Storage.saveArticles(articles);
        allArticles = await Storage.getAllArticles();
        renderCategories();
        renderList();
        setStatusBanner(manual ? '更新しました' : '更新済み', 'updated');
        localStorage.setItem('news-pwa:last-fetch', String(Date.now()));
      } else if (errors.length) {
        throw new Error(errors[0].message || '記事を取得できませんでした');
      }
      if (errors.length && articles.length) {
        console.warn('一部のソースの取得に失敗しました', errors);
      }
    } catch (e) {
      console.warn('news fetch failed', e);
      if (!allArticles.length) await loadFromCache();
      setStatusBanner('オフライン・取得エラーのためキャッシュを表示しています', 'offline');
    } finally {
      loading = false;
    }
  }

  function setupInfiniteScroll() {
    const scroll = document.getElementById('news-scroll');
    scroll.addEventListener('scroll', () => {
      if (scroll.scrollTop + scroll.clientHeight > scroll.scrollHeight - 200) {
        if (visibleCount < filtered().length) {
          visibleCount += PAGE_SIZE;
          renderList();
        }
      }
    });
  }

  function setupPullToRefresh() {
    const scroll = document.getElementById('news-scroll');
    const indicator = document.getElementById('pull-indicator');
    scroll.addEventListener('touchstart', (e) => {
      if (scroll.scrollTop <= 0) pullStartY = e.touches[0].clientY;
      else pullStartY = null;
    }, { passive: true });
    scroll.addEventListener('touchmove', (e) => {
      if (pullStartY == null) return;
      const diff = e.touches[0].clientY - pullStartY;
      if (diff > 0) {
        indicator.style.height = Math.min(diff, 60) + 'px';
        indicator.textContent = diff > 60 ? '離して更新' : '引っぱって更新';
      }
    }, { passive: true });
    scroll.addEventListener('touchend', (e) => {
      if (pullStartY == null) return;
      const diff = (indicator.style.height || '0px');
      const height = parseInt(diff, 10) || 0;
      indicator.style.height = '0px';
      pullStartY = null;
      if (height >= 60) refresh({ manual: true });
    }, { passive: true });
  }

  async function init() {
    await loadFromCache();
    setupInfiniteScroll();
    setupPullToRefresh();
    document.getElementById('refresh-btn').addEventListener('click', () => refresh({ manual: true }));
    const today = new Date();
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];
    document.getElementById('today-label').textContent = `${today.getMonth() + 1}月${today.getDate()}日 ${weekday}曜日`;
    await refresh({ manual: false });
  }

  async function getArticleById(id) {
    let a = allArticles.find((x) => x.id === id);
    if (a) return a;
    a = await Storage.getArticleById(id);
    return a;
  }

  return { init, refresh, getArticleById, setStatusBanner };
})();
