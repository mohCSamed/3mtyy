/* ==========================================================================
   VAULT SECURITY — shared auth, rate-limit, session, audit (no dependencies)
   ========================================================================== */
(() => {
  'use strict';

  const SITE_SESSION_KEY = 'vault_site_session';
  const ADMIN_SESSION_KEY = 'vault_admin_session';
  const ATTEMPT_KEY = 'vault_login_attempts';
  const AUDIT_KEY = 'vault_audit_log';
  const MAX_AUDIT = 80;

  const DEFAULT_SITE_HASHES = [
    'c111c42a38df3784c1d304d0c46230f5e8b19c0efcec2dfd6bb0a6443338078b',
    'c7873afe21ee60c3afda2e322481e09395df4048381b558603803faa6b685083',
  ];

  /* Admin hash — password: 3mtyy@Vault2026! */
  const ADMIN_HASH = 'd005ac77120e8fc4bc49f0ce89fc81934de521f474cfb24b7cbc54e26c89623f';

  let sitePasswordHashes = [...DEFAULT_SITE_HASHES];
  let securityConfig = {
    maxAttempts: 5,
    lockoutMinutes: 15,
    sessionHours: 12,
    disableDownload: false,
    disableContextMenu: true,
    disableDrag: true,
  };

  function getSiteBase() {
    const meta = document.querySelector('meta[name="site-base"]');
    const raw = meta?.getAttribute('content')?.trim() || '';
    if (raw) return raw.replace(/\/?$/, '/');
    if (location.hostname.endsWith('github.io')) {
      const seg = location.pathname.split('/').filter(Boolean)[0];
      if (seg && !/\.html?$/i.test(seg)) return `/${seg}/`;
    }
    return '';
  }

  function configUrl(file) {
    return `${getSiteBase()}config/${file}`;
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text.toLowerCase());
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let out = 0;
    for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return out === 0;
  }

  function randomToken(bytes = 24) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function now() { return Date.now(); }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* quota */ }
  }

  function audit(event, detail = '') {
    const log = readJSON(AUDIT_KEY, []);
    log.unshift({
      t: new Date().toISOString(),
      e: event,
      d: String(detail).slice(0, 120),
    });
    writeJSON(AUDIT_KEY, log.slice(0, MAX_AUDIT));
  }

  function getAttempts() {
    return readJSON(ATTEMPT_KEY, { count: 0, lockUntil: 0 });
  }

  function isLockedOut() {
    const a = getAttempts();
    if (a.lockUntil && now() < a.lockUntil) {
      return { locked: true, remainingMs: a.lockUntil - now() };
    }
    if (a.lockUntil && now() >= a.lockUntil) {
      writeJSON(ATTEMPT_KEY, { count: 0, lockUntil: 0 });
    }
    return { locked: false, remainingMs: 0 };
  }

  function recordFailedAttempt() {
    const a = getAttempts();
    const count = (a.count || 0) + 1;
    let lockUntil = 0;
    if (count >= securityConfig.maxAttempts) {
      lockUntil = now() + securityConfig.lockoutMinutes * 60 * 1000;
      audit('lockout', `${count} failed attempts`);
    }
    writeJSON(ATTEMPT_KEY, { count, lockUntil });
    return { count, lockUntil };
  }

  function clearAttempts() {
    writeJSON(ATTEMPT_KEY, { count: 0, lockUntil: 0 });
  }

  function createSession(key, hours) {
    const session = {
      token: randomToken(),
      exp: now() + hours * 60 * 60 * 1000,
      ua: navigator.userAgent.slice(0, 80),
    };
    try { sessionStorage.setItem(key, JSON.stringify(session)); } catch (_) { /* private mode */ }
    return session;
  }

  function getSession(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s?.token || !s?.exp || now() > s.exp) {
        sessionStorage.removeItem(key);
        return null;
      }
      return s;
    } catch (_) {
      return null;
    }
  }

  function clearSession(key) {
    try { sessionStorage.removeItem(key); } catch (_) { /* noop */ }
  }

  async function verifySitePassword(plain) {
    const lock = isLockedOut();
    if (lock.locked) return { ok: false, reason: 'locked', remainingMs: lock.remainingMs };

    const hash = await sha256(plain.trim());
    const ok = sitePasswordHashes.some((h) => safeEqual(h, hash));
    if (ok) {
      clearAttempts();
      createSession(SITE_SESSION_KEY, securityConfig.sessionHours);
      audit('site_login_ok');
      if (window.VaultAnalytics) VaultAnalytics.logVisit('password_unlock').catch(() => {});
      return { ok: true };
    }
    const att = recordFailedAttempt();
    audit('site_login_fail', `attempt ${att.count}`);
    return { ok: false, reason: 'bad', attempts: att.count };
  }

  async function verifyAdminPassword(plain) {
    const lock = isLockedOut();
    if (lock.locked) return { ok: false, reason: 'locked', remainingMs: lock.remainingMs };

    const hash = await sha256(plain.trim());
    if (safeEqual(hash, ADMIN_HASH)) {
      clearAttempts();
      createSession(ADMIN_SESSION_KEY, 2);
      audit('admin_login_ok');
      return { ok: true };
    }
    recordFailedAttempt();
    audit('admin_login_fail');
    return { ok: false, reason: 'bad' };
  }

  function hasSiteSession() { return !!getSession(SITE_SESSION_KEY); }
  function hasAdminSession() { return !!getSession(ADMIN_SESSION_KEY); }

  function logoutSite() {
    clearSession(SITE_SESSION_KEY);
    audit('site_logout');
  }

  function logoutAdmin() {
    clearSession(ADMIN_SESSION_KEY);
    audit('admin_logout');
  }

  async function loadAuthConfig() {
    try {
      const res = await fetch(configUrl('auth.json'), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.sitePasswordHashes) && data.sitePasswordHashes.length) {
        sitePasswordHashes = data.sitePasswordHashes;
      }
    } catch (_) { /* use defaults */ }
  }

  async function loadSiteConfig() {
    try {
      const res = await fetch(configUrl('site.json'), { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.security) Object.assign(securityConfig, data.security);
      return data;
    } catch (_) {
      return null;
    }
  }

  function applyProtections(cfg = {}) {
    const sec = { ...securityConfig, ...cfg.security };

    if (sec.disableContextMenu) {
      document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.viewer, .book, .book-item, #admin-panel')) {
          e.preventDefault();
        }
      });
    }

    if (sec.disableDrag) {
      document.addEventListener('dragstart', (e) => {
        if (e.target.matches('img, .book-item__cover, .book__cover-art')) e.preventDefault();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
      if (e.ctrlKey && e.key === 'u') e.preventDefault();
    });
  }

  function formatLockout(ms) {
    const m = Math.ceil(ms / 60000);
    return m <= 1 ? '1 minute' : `${m} minutes`;
  }

  async function hashPassword(plain) {
    return sha256(plain);
  }

  function getAuditLog() {
    return readJSON(AUDIT_KEY, []);
  }

  function getSecurityConfig() {
    return { ...securityConfig };
  }

  function getSitePasswordHashes() {
    return [...sitePasswordHashes];
  }

  window.VaultSecurity = {
    loadAuthConfig,
    loadSiteConfig,
    verifySitePassword,
    verifyAdminPassword,
    hasSiteSession,
    hasAdminSession,
    logoutSite,
    logoutAdmin,
    applyProtections,
    audit,
    formatLockout,
    hashPassword,
    getAuditLog,
    getSecurityConfig,
    getSitePasswordHashes,
    isLockedOut,
    configUrl,
    getSiteBase,
    ADMIN_SESSION_KEY,
    SITE_SESSION_KEY,
  };
})();
