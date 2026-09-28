const NewsApiParser = (() => {
  function parse(jsonData, feed) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    if (!data || !Array.isArray(data.articles)) {
      throw new Error('NewsAPI のレスポンス形式が不正です');
    }
    return data.articles.map((a, i) => ({
      id: a.url || `${feed.id}-${i}`,
      feedId: feed.id,
      title: a.title || '',
      source: (a.source && a.source.name) || feed.name,
      publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
      thumbnailUrl: a.urlToImage || null,
      imageUrl: a.urlToImage || null,
      url: a.url || '',
      category: '',
      content: a.content || a.description || '',
    }));
  }

  return { parse };
})();
