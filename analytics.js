/* Vault Analytics — cloud visitor log via Supabase (optional) */
(() => {
  'use strict';

  const LOCAL_CFG_KEY = 'vault_analytics_cfg';
  const VISITOR_KEY = 'vault_visitor_id';

  let config = {
    enabled: false,
    url: '',
    anonKey: '',
    siteLaunchedAt: '2026-07-10T00:00:00.000Z',
  };

  function getSiteBase() {
    if (window.VaultSecurity?.getSiteBase) return VaultSecurity.getSiteBase();
    const meta = document.querySelector('meta[name="site-base"]');
    const raw = meta?.getAttribute('content')?.trim() || '';
    if (raw) return raw.replace(/\/?$/, '/');
    return '';
  }

  function configUrl(file) {
    return `${getSiteBase()}config/${file}`;
  }

  function randomId() {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return 'v_' + Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function getVisitorId() {
    try {
      let id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = randomId();
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch (_) {
      return randomId();
    }
  }

  function parseDevice() {
    const ua = navigator.userAgent;
    const mobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
    let browser = 'Other';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    return { device: mobile ? 'موبايل' : 'كمبيوتر', browser };
  }

  async function loadConfig() {
    try {
      const res = await fetch(configUrl('analytics.json'), { cache: 'no-store' });
      if (res.ok) config = { ...config, ...(await res.json()) };
    } catch (_) { /* offline */ }

    try {
      const local = localStorage.getItem(LOCAL_CFG_KEY);
      if (local) config = { ...config, ...JSON.parse(local) };
    } catch (_) { /* bad json */ }

    config.url = (config.url || '').replace(/\/$/, '');
    return config;
  }

  function saveConfigLocal(partial) {
    config = { ...config, ...partial };
    config.url = (config.url || '').replace(/\/$/, '');
    try { localStorage.setItem(LOCAL_CFG_KEY, JSON.stringify(config)); } catch (_) { /* quota */ }
    return config;
  }

  function isReady() {
    return !!(config.enabled && config.url && config.anonKey);
  }

  function headers() {
    return {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    };
  }

  async function logVisit(entry = 'password_unlock') {
    if (!isReady()) return false;
    const { device, browser } = parseDevice();
    try {
      const res = await fetch(`${config.url}/rest/v1/visits`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          device,
          browser,
          language: navigator.language || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
          screen: `${screen.width}x${screen.height}`,
          entry,
        }),
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  async function fetchVisits(limit = 300) {
    if (!isReady()) return [];
    const since = config.siteLaunchedAt ? `&created_at=gte.${encodeURIComponent(config.siteLaunchedAt)}` : '';
    const res = await fetch(
      `${config.url}/rest/v1/visits?order=created_at.desc&limit=${limit}${since}`,
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function testConnection() {
    if (!config.url || !config.anonKey) return { ok: false, msg: 'أدخل الرابط والمفتاح' };
    try {
      const res = await fetch(`${config.url}/rest/v1/visits?limit=1`, { headers: headers() });
      if (res.ok) return { ok: true, msg: 'الاتصال ناجح' };
      return { ok: false, msg: `خطأ ${res.status} — تأكد من SQL والمفتاح` };
    } catch (e) {
      return { ok: false, msg: 'فشل الاتصال بالسيرفر' };
    }
  }

  function exportConfig() {
    return { ...config };
  }

  function getConfig() {
    return { ...config };
  }

  window.VaultAnalytics = {
    loadConfig,
    saveConfigLocal,
    logVisit,
    fetchVisits,
    testConnection,
    exportConfig,
    getConfig,
    isReady,
    getVisitorId,
  };
})();
