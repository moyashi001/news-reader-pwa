const ArticleDetail = (() => {
  const FONT_SIZES = { md: '16px', lg: '18px', xl: '20px' };
  const FONT_KEY = 'news-pwa:font-size';
  let currentArticle = null;

  function applyFontSize(size) {
    document.documentElement.style.setProperty('--article-font-size', FONT_SIZES[size] || FONT_SIZES.md);
    localStorage.setItem(FONT_KEY, size);
  }

  function cycleFontSize() {
    const order = ['md', 'lg', 'xl'];
    const current = localStorage.getItem(FONT_KEY) || 'md';
    const next = order[(order.indexOf(current) + 1) % order.length];
    applyFontSize(next);
  }

  function render(article) {
    currentArticle = article;
    const hero = document.getElementById('article-hero');
    if (article.imageUrl) {
      hero.src = article.imageUrl;
      hero.style.display = '';
      hero.onerror = () => { hero.style.display = 'none'; };
    } else {
      hero.removeAttribute('src');
      hero.style.display = 'none';
    }
    document.getElementById('article-category').textContent = article.category || '';
    document.getElementById('article-category').style.display = article.category ? '' : 'none';
    document.getElementById('article-title').textContent = article.title;
    const publishedLabel = new Date(article.publishedAt).toLocaleString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    document.getElementById('article-meta').textContent = `${article.source}・${publishedLabel}`;
    document.getElementById('article-content').textContent = article.content || 'この記事の本文は提供されていません。「元記事を読む」から全文をご覧ください。';
    const openBtn = document.getElementById('open-original-btn');
    openBtn.href = article.url || '#';
    document.getElementById('article-scroll').scrollTop = 0;
  }

  async function open(id) {
    const article = await NewsList.getArticleById(id);
    if (!article) {
      location.hash = '#/';
      return;
    }
    render(article);
  }

  function openShareSheet() {
    document.getElementById('share-sheet-article-title').textContent = currentArticle ? currentArticle.title : '';
    document.getElementById('share-sheet-overlay').classList.add('show');
  }

  function closeShareSheet() {
    document.getElementById('share-sheet-overlay').classList.remove('show');
  }

  async function share() {
    if (!currentArticle) return;
    const shareData = { title: currentArticle.title, url: currentArticle.url || location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { /* ユーザーによるキャンセル等は無視 */ }
      return;
    }
    openShareSheet();
  }

  async function handleShareTarget(target) {
    if (!currentArticle) return;
    const url = currentArticle.url || location.href;
    const title = currentArticle.title;
    if (target === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
      } catch (e) { /* clipboard未対応環境は無視 */ }
    } else if (target === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
    } else if (target === 'line') {
      window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank');
    } else if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (e) { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch (e) { /* ignore */ }
    }
    closeShareSheet();
  }

  function init() {
    applyFontSize(localStorage.getItem(FONT_KEY) || 'md');
    document.getElementById('font-size-btn').addEventListener('click', cycleFontSize);
    document.getElementById('share-btn').addEventListener('click', share);
    document.getElementById('back-btn').addEventListener('click', () => { location.hash = '#/'; });
    document.getElementById('share-cancel-btn').addEventListener('click', closeShareSheet);
    document.getElementById('share-sheet-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'share-sheet-overlay') closeShareSheet();
    });
    Array.from(document.querySelectorAll('.share-target')).forEach((btn) => {
      btn.addEventListener('click', () => handleShareTarget(btn.getAttribute('data-share')));
    });
  }

  return { init, open, applyFontSize };
})();
