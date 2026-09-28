const Settings = (() => {
  const INTERVAL_KEY = 'news-pwa:interval';
  const CACHE_DAYS_KEY = 'news-pwa:cache-days';
  const FONT_KEY = 'news-pwa:font-size';

  const TYPE_LABEL = { rss: 'RSS', json_feed: 'FEED', api: 'API' };

  function getInterval() { return localStorage.getItem(INTERVAL_KEY) || 'off'; }
  function setInterval_(v) { localStorage.setItem(INTERVAL_KEY, v); }
  function getCacheDays() { return Number(localStorage.getItem(CACHE_DAYS_KEY) || '7'); }
  function setCacheDays(v) { localStorage.setItem(CACHE_DAYS_KEY, String(v)); }

  function renderFeedList() {
    const feeds = Sources.getAll();
    const list = document.getElementById('feed-list');
    list.innerHTML = feeds.map((f) => `
      <button type="button" class="feed-row" data-id="${escapeHtml(f.id)}">
        <span class="checkbox${f.enabled ? ' on' : ''}"><span class="check-mark"></span></span>
        <div class="feed-info">
          <span class="feed-name">${escapeHtml(f.name)}<span class="type-badge">${TYPE_LABEL[f.type] || f.type}</span></span>
          <span class="feed-url">${escapeHtml(f.url)}</span>
        </div>
      </button>
    `).join('');
    Array.from(list.querySelectorAll('.feed-row')).forEach((row) => {
      row.addEventListener('click', () => {
        Sources.toggle(row.getAttribute('data-id'));
        renderFeedList();
      });
    });
    const n = feeds.length;
    const m = feeds.filter((f) => f.enabled).length;
    document.getElementById('feed-count-label').textContent = `${n}件中 ${m}件を購読中`;
  }

  function setHint(text, isError) {
    const hint = document.getElementById('add-feed-hint');
    hint.textContent = text;
    hint.classList.toggle('error', !!isError);
  }

  async function handleAddFeed() {
    const type = document.getElementById('source-type-select').value;
    const urlInput = document.getElementById('feed-url-input');
    const url = urlInput.value.trim();
    if (type === 'api') {
      setHint('NewsAPIは下のキー入力欄でキーを保存すればすぐ使えます。追加のURL入力は不要です。', false);
      return;
    }
    try {
      setHint('確認しています...', false);
      await Sources.add({ url, type });
      urlInput.value = '';
      setHint('追加しました', false);
      renderFeedList();
    } catch (e) {
      setHint(e.message || '追加に失敗しました', true);
    }
  }

  function updateTypeUi() {
    const type = document.getElementById('source-type-select').value;
    document.getElementById('newsapi-key-section').style.display = type === 'api' ? '' : 'none';
    const urlInput = document.getElementById('feed-url-input');
    const addBtn = document.getElementById('add-feed-btn');
    urlInput.style.display = type === 'api' ? 'none' : '';
    addBtn.style.display = type === 'api' ? 'none' : '';
    const hints = {
      rss: 'RSS / Atom フィードのURLを入力してください',
      json_feed: 'JSON Feed のURLを入力してください',
      api: 'NewsAPIキーを保存すると「NewsAPI トップニュース」が有効になります',
    };
    setHint(hints[type] || '', false);
  }

  function renderIntervalAndCache() {
    document.getElementById('interval-select').value = getInterval();
    document.getElementById('cache-days-select').value = String(getCacheDays());
  }

  function renderFontSizeSegment() {
    const current = localStorage.getItem(FONT_KEY) || 'md';
    Array.from(document.querySelectorAll('#font-size-segment .segment-item')).forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-size') === current);
    });
  }

  function renderThemeSegment() {
    const current = Theme.resolved();
    Array.from(document.querySelectorAll('#theme-segment .segment-item')).forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === current);
    });
  }

  function init() {
    renderFeedList();
    renderIntervalAndCache();
    renderFontSizeSegment();
    renderThemeSegment();
    updateTypeUi();

    document.getElementById('source-type-select').addEventListener('change', updateTypeUi);
    document.getElementById('add-feed-btn').addEventListener('click', handleAddFeed);
    document.getElementById('newsapi-key-input').value = Sources.getNewsApiKey();
    document.getElementById('save-newsapi-key-btn').addEventListener('click', () => {
      const key = document.getElementById('newsapi-key-input').value;
      Sources.setNewsApiKey(key);
      setHint('NewsAPIキーを保存しました', false);
    });

    document.getElementById('interval-select').addEventListener('change', (e) => {
      setInterval_(e.target.value);
      Sync.reschedule();
    });
    document.getElementById('cache-days-select').addEventListener('change', (e) => {
      setCacheDays(Number(e.target.value));
      Storage.deleteOlderThan(Number(e.target.value));
    });

    Array.from(document.querySelectorAll('#font-size-segment .segment-item')).forEach((btn) => {
      btn.addEventListener('click', () => {
        ArticleDetail.applyFontSize(btn.getAttribute('data-size'));
        renderFontSizeSegment();
      });
    });
    Array.from(document.querySelectorAll('#theme-segment .segment-item')).forEach((btn) => {
      btn.addEventListener('click', () => {
        Theme.set(btn.getAttribute('data-theme'));
        renderThemeSegment();
      });
    });
  }

  function refreshAll() {
    renderFeedList();
    renderIntervalAndCache();
    renderFontSizeSegment();
    renderThemeSegment();
  }

  return { init, renderFeedList, refreshAll, getInterval, getCacheDays };
})();
