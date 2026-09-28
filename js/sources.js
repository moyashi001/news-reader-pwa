const Sources = (() => {
  const KEY = 'news-pwa:feeds';
  const NEWSAPI_KEY_STORAGE = 'news-pwa:newsapi-key';

  // おすすめ一覧。日経・読売は公式の無料RSSが現在提供されていないため、
  // 日経は「日経ビジネス電子版」のRSSで代替、読売は対象外にしている。
  const DEFAULT_FEEDS = [
    { id: 'nhk', name: 'NHKニュース', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', type: 'rss', enabled: true, builtin: true },
    { id: 'nikkei-business', name: '日経ビジネス電子版', url: 'https://business.nikkei.com/rss/sns/nb.rdf', type: 'rss', enabled: true, builtin: true },
    { id: 'asahi', name: '朝日新聞', url: 'https://rss.asahi.com/rss/asahi/newsheadlines.rdf', type: 'rss', enabled: true, builtin: true },
    { id: 'itmedia', name: 'ITmedia', url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml', type: 'rss', enabled: true, builtin: true },
    { id: 'gigazine', name: 'GIGAZINE', url: 'https://gigazine.net/news/rss_2.0/', type: 'rss', enabled: true, builtin: true },
    { id: 'newsapi-top-jp', name: 'NewsAPI トップニュース', url: 'https://newsapi.org/v2/top-headlines?country=jp', type: 'api', enabled: false, builtin: true },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT_FEEDS.slice();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_FEEDS.slice();
      return parsed;
    } catch (e) {
      return DEFAULT_FEEDS.slice();
    }
  }

  function save(feeds) {
    localStorage.setItem(KEY, JSON.stringify(feeds));
  }

  function getAll() {
    return load();
  }

  function toggle(id) {
    const next = load().map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
    save(next);
    return next;
  }

  function getNewsApiKey() {
    return localStorage.getItem(NEWSAPI_KEY_STORAGE) || '';
  }

  function setNewsApiKey(key) {
    localStorage.setItem(NEWSAPI_KEY_STORAGE, key.trim());
  }

  async function fetchViaProxy(url, type) {
    const params = new URLSearchParams({ url, type });
    if (type === 'api') params.set('apiKey', getNewsApiKey());
    const res = await fetch(`/api/fetch-source?${params.toString()}`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`取得に失敗しました (HTTP ${res.status}) ${body}`.trim());
    }
    if (type === 'rss') return res.text();
    return res.json();
  }

  function parseByType(raw, type, feed) {
    if (type === 'rss') return RssParser.parse(raw, feed);
    if (type === 'json_feed') return JsonFeedParser.parse(raw, feed);
    if (type === 'api') return NewsApiParser.parse(raw, feed);
    throw new Error('未知のソース種別です: ' + type);
  }

  async function fetchArticlesForFeed(feed) {
    if (feed.type === 'api' && !getNewsApiKey()) {
      throw new Error('NewsAPIキーが未設定のため取得をスキップしました');
    }
    const raw = await fetchViaProxy(feed.url, feed.type);
    return parseByType(raw, feed.type, feed);
  }

  async function fetchAllEnabled() {
    const feeds = load().filter((f) => f.enabled);
    const results = await Promise.allSettled(feeds.map(fetchArticlesForFeed));
    const articles = [];
    const errors = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') articles.push(...r.value);
      else errors.push({ feed: feeds[i], message: r.reason && r.reason.message });
    });
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return { articles, errors };
  }

  function makeId(url) {
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function add({ url, type }) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      throw new Error('有効なURLを入力してください');
    }
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      throw new Error('有効なURLを入力してください');
    }
    const feeds = load();
    if (feeds.some((f) => f.url === url)) {
      throw new Error('すでに追加されています');
    }
    const tentative = { id: makeId(url), name: parsedUrl.hostname, url, type, enabled: true, builtin: false };
    let name = parsedUrl.hostname;
    try {
      const raw = await fetchViaProxy(url, type);
      if (type === 'rss') {
        const doc = new DOMParser().parseFromString(raw, 'application/xml');
        const titleEl = doc.querySelector('channel > title, feed > title');
        if (titleEl && titleEl.textContent.trim()) name = titleEl.textContent.trim();
      } else if (type === 'json_feed') {
        if (raw && raw.title) name = raw.title;
      }
    } catch (e) {
      // 取得確認に失敗してもホスト名で追加は継続する
    }
    const feed = { ...tentative, name };
    save([...feeds, feed]);
    return feed;
  }

  function remove(id) {
    save(load().filter((f) => f.id !== id));
  }

  return { getAll, toggle, add, remove, getNewsApiKey, setNewsApiKey, fetchAllEnabled, fetchArticlesForFeed };
})();
