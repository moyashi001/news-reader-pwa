const JsonFeedParser = (() => {
  function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').trim();
  }

  function extractFirstImage(html) {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.getAttribute('src') : null;
  }

  function parse(jsonData, feed) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    if (!data || !Array.isArray(data.items)) {
      throw new Error('JSON Feed の形式が不正です');
    }
    return data.items.map((item) => {
      const authorName = (item.author && item.author.name)
        || (Array.isArray(item.authors) && item.authors[0] && item.authors[0].name)
        || feed.name;
      const rawContent = item.content_text || item.content_html || item.summary || '';
      const image = item.image || item.banner_image || extractFirstImage(item.content_html) || null;
      const category = Array.isArray(item.tags) && item.tags.length ? item.tags[0] : '';
      return {
        id: String(item.id || item.url || `${feed.id}-${item.title}`),
        feedId: feed.id,
        title: stripHtml(item.title || ''),
        source: authorName,
        publishedAt: item.date_published ? new Date(item.date_published).toISOString() : new Date().toISOString(),
        thumbnailUrl: image,
        imageUrl: image,
        url: item.url || '',
        category,
        content: stripHtml(rawContent),
      };
    });
  }

  return { parse };
})();
