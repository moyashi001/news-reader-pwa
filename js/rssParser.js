const RssParser = (() => {
  function text(el, selector) {
    if (!el) return '';
    const found = selector ? el.querySelector(selector) : el;
    return found && found.textContent ? found.textContent.trim() : '';
  }

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

  function findNs(el, localName) {
    if (!el) return null;
    const all = el.getElementsByTagName('*');
    for (const node of [el, ...all]) {
      if (node.localName === localName || node.tagName === localName) return node;
    }
    return null;
  }

  function parseImage(item) {
    const media = findNs(item, 'thumbnail') || findNs(item, 'content');
    if (media && media.getAttribute && media.getAttribute('url')) {
      const type = media.getAttribute('medium') || media.getAttribute('type') || '';
      if (!type || type.indexOf('image') !== -1 || media.localName === 'thumbnail') {
        return media.getAttribute('url');
      }
    }
    const enclosure = item.querySelector('enclosure');
    if (enclosure && enclosure.getAttribute('type') && enclosure.getAttribute('type').indexOf('image') !== -1) {
      return enclosure.getAttribute('url');
    }
    const encoded = findNs(item, 'encoded');
    const fromContent = extractFirstImage(encoded ? encoded.textContent : '');
    if (fromContent) return fromContent;
    return extractFirstImage(text(item, 'description'));
  }

  function parseRssItems(doc, feed) {
    const items = Array.from(doc.querySelectorAll('item'));
    return items.map((item) => {
      const title = text(item, 'title');
      const link = text(item, 'link') || (item.querySelector('link') ? item.querySelector('link').getAttribute('href') : '');
      const encoded = findNs(item, 'encoded');
      const rawContent = (encoded && encoded.textContent) || text(item, 'description');
      const pubDate = text(item, 'pubDate') || text(item, 'date') || text(item, 'PubDate');
      const category = text(item, 'category');
      const guid = text(item, 'guid') || link;
      return {
        id: guid || `${feed.id}-${title}`,
        feedId: feed.id,
        title: stripHtml(title),
        source: feed.name,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        thumbnailUrl: parseImage(item),
        imageUrl: parseImage(item),
        url: link,
        category: category || '',
        content: stripHtml(rawContent),
      };
    });
  }

  function parseAtomEntries(doc, feed) {
    const entries = Array.from(doc.querySelectorAll('entry'));
    return entries.map((entry) => {
      const title = text(entry, 'title');
      let link = '';
      const linkEls = entry.querySelectorAll('link');
      for (const l of linkEls) {
        const rel = l.getAttribute('rel');
        if (!rel || rel === 'alternate') { link = l.getAttribute('href'); break; }
      }
      const rawContent = text(entry, 'content') || text(entry, 'summary');
      const published = text(entry, 'published') || text(entry, 'updated');
      const categoryEl = entry.querySelector('category');
      const category = categoryEl ? (categoryEl.getAttribute('term') || categoryEl.textContent || '') : '';
      const id = text(entry, 'id') || link;
      return {
        id: id || `${feed.id}-${title}`,
        feedId: feed.id,
        title: stripHtml(title),
        source: feed.name,
        publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
        thumbnailUrl: parseImage(entry),
        imageUrl: parseImage(entry),
        url: link,
        category: category || '',
        content: stripHtml(rawContent),
      };
    });
  }

  function parse(xmlText, feed) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('RSS/Atom のXMLを解析できませんでした');
    }
    const root = doc.documentElement;
    if (root && root.localName === 'feed') {
      return parseAtomEntries(doc, feed);
    }
    return parseRssItems(doc, feed);
  }

  return { parse };
})();
