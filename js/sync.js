const Sync = (() => {
  const LAST_FETCH_KEY = 'news-pwa:last-fetch';

  function lastFetchAt() {
    const raw = localStorage.getItem(LAST_FETCH_KEY);
    return raw ? Number(raw) : 0;
  }

  function shouldAutoFetch(interval) {
    const last = lastFetchAt();
    const now = Date.now();
    if (interval === 'off') return false;
    if (interval === '3h') return now - last >= 3 * 60 * 60 * 1000;
    if (interval === '1d') return now - last >= 24 * 60 * 60 * 1000;
    if (interval === 'daily7') {
      const today7 = new Date();
      today7.setHours(7, 0, 0, 0);
      if (now < today7.getTime()) return false;
      return last < today7.getTime();
    }
    return false;
  }

  async function checkFallback() {
    const interval = Settings.getInterval();
    if (shouldAutoFetch(interval)) {
      await NewsList.refresh({ manual: false });
    }
  }

  async function registerPeriodicSync() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    if (!('periodicSync' in registration)) return;
    try {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state !== 'granted') return;
      const interval = Settings.getInterval();
      if (interval === 'off') {
        await registration.periodicSync.unregister('fetch-news');
        return;
      }
      const minInterval = interval === '3h' ? 3 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
      await registration.periodicSync.register('fetch-news', { minInterval });
    } catch (e) {
      // Periodic Background Sync 未対応・権限なしの環境では無視する
    }
  }

  function reschedule() {
    registerPeriodicSync();
  }

  function listenServiceWorkerMessages() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'news-updated') {
        NewsList.refresh({ manual: false });
        NewsList.setStatusBanner('更新済み', 'updated');
      }
    });
  }

  function init() {
    listenServiceWorkerMessages();
    registerPeriodicSync();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkFallback();
    });
    checkFallback();
  }

  return { init, reschedule, checkFallback };
})();
