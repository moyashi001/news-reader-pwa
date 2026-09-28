function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1') return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

module.exports = async (req, res) => {
  const { url, type, apiKey } = req.query;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    res.status(400).json({ error: 'invalid url' });
    return;
  }
  if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    res.status(400).json({ error: 'invalid or blocked url' });
    return;
  }

  try {
    let targetUrl = url;
    if (type === 'api') {
      if (!apiKey) {
        res.status(400).json({ error: 'apiKey is required for api type' });
        return;
      }
      const sep = url.includes('?') ? '&' : '?';
      targetUrl = `${url}${sep}apiKey=${encodeURIComponent(apiKey)}`;
    }

    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-reader-pwa/1.0)' },
    });
    const body = await upstream.text();
    const fallbackType = type === 'rss' ? 'application/xml; charset=utf-8' : 'application/json; charset=utf-8';
    const contentType = upstream.headers.get('content-type') || fallbackType;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstream.status).send(body);
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed', message: String((e && e.message) || e) });
  }
};
