/* Vault Admin Panel */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const ALBUM_FOLDERS = ['Images', '5tobtyyy', 'fun', '5tobt Gamal', 'after edit', '2014'];

  let siteConfig = {
    ownerDisplay: 'Our Family',
    maintenanceMode: false,
    hiddenAlbums: [],
    security: {
      maxAttempts: 5,
      lockoutMinutes: 15,
      sessionHours: 12,
      disableDownload: false,
      disableContextMenu: true,
      disableDrag: true,
    },
  };

  let authConfig = {
    sitePasswordHashes: VaultSecurity.getSitePasswordHashes(),
  };

  let pendingHashes = [...authConfig.sitePasswordHashes];

  function albumPath(folder, file) {
    return `${VaultSecurity.getSiteBase()}Dalia-WebP/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
  }

  async function countPhotos() {
    let total = 0;
    for (const folder of ALBUM_FOLDERS) {
      try {
        const res = await fetch(albumPath(folder, 'images.json'), { cache: 'force-cache' });
        if (!res.ok) continue;
        const data = await res.json();
        total += Array.isArray(data) ? data.length : (data.images?.length || 0);
      } catch (_) { /* skip */ }
    }
    return total;
  }

  function showDashboard() {
    $('#admin-login').classList.add('admin-hidden');
    $('#admin-dashboard').classList.remove('admin-hidden');
    populateForm();
    populateAnalyticsForm();
    refreshStats();
    renderAuditLog();
    refreshVisitors();
    VaultUpload.initUpload();
  }

  function showLogin() {
    $('#admin-dashboard').classList.add('admin-hidden');
    $('#admin-login').classList.remove('admin-hidden');
  }

  function populateForm() {
    $('#cfg-owner').value = siteConfig.ownerDisplay || 'Our Family';
    $('#cfg-maintenance').checked = !!siteConfig.maintenanceMode;
    $('#cfg-max-attempts').value = siteConfig.security.maxAttempts;
    $('#cfg-lockout').value = siteConfig.security.lockoutMinutes;
    $('#cfg-session').value = siteConfig.security.sessionHours;
    $('#cfg-no-download').checked = !!siteConfig.security.disableDownload;
    $('#cfg-no-context').checked = siteConfig.security.disableContextMenu !== false;
    $('#cfg-no-drag').checked = siteConfig.security.disableDrag !== false;

    const list = $('#cfg-albums');
    list.innerHTML = '';
    ALBUM_FOLDERS.forEach((folder) => {
      const hidden = siteConfig.hiddenAlbums.includes(folder);
      const row = document.createElement('label');
      row.className = 'admin-album-item';
      row.innerHTML = `
        <input type="checkbox" data-folder="${folder}" ${hidden ? '' : 'checked'} />
        <span>${folder}</span>
      `;
      list.appendChild(row);
    });

    $('#password-list-note').textContent = `عدد باسوردات الموقع المحفوظة: ${pendingHashes.length}`;
  }

  async function refreshStats() {
    const photos = await countPhotos();
    const visible = ALBUM_FOLDERS.length - (siteConfig.hiddenAlbums?.length || 0);
    const att = JSON.parse(localStorage.getItem('vault_login_attempts') || '{}');
    $('#stat-albums').textContent = ALBUM_FOLDERS.length;
    $('#stat-photos').textContent = photos;
    $('#stat-visible').textContent = visible;
    $('#stat-attempts').textContent = att.count || 0;
  }

  function renderAuditLog() {
    const log = VaultSecurity.getAuditLog();
    const el = $('#admin-audit-log');
    if (!log.length) {
      el.innerHTML = '<div>لا توجد أحداث بعد.</div>';
      return;
    }
    el.innerHTML = log.slice(0, 30).map((row) =>
      `<div>[${row.t.slice(11, 19)}] ${row.e}${row.d ? ' — ' + row.d : ''}</div>`
    ).join('');
  }

  function collectConfigFromForm() {
    const hidden = [];
    $$('#cfg-albums input[type=checkbox]').forEach((cb) => {
      if (!cb.checked) hidden.push(cb.dataset.folder);
    });

    siteConfig = {
      ownerDisplay: $('#cfg-owner').value.trim() || 'Our Family',
      maintenanceMode: $('#cfg-maintenance').checked,
      hiddenAlbums: hidden,
      security: {
        maxAttempts: clamp(+$('#cfg-max-attempts').value, 3, 20),
        lockoutMinutes: clamp(+$('#cfg-lockout').value, 5, 120),
        sessionHours: clamp(+$('#cfg-session').value, 1, 72),
        disableDownload: $('#cfg-no-download').checked,
        disableContextMenu: $('#cfg-no-context').checked,
        disableDrag: $('#cfg-no-drag').checked,
      },
    };
    authConfig = { sitePasswordHashes: [...pendingHashes] };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
  }

  function $$ (sel) { return Array.from(document.querySelectorAll(sel)); }

  function downloadJSON(filename, data) {
    collectConfigFromForm();
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toLocalDatetimeValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromLocalDatetimeValue(val) {
    if (!val) return new Date().toISOString();
    return new Date(val).toISOString();
  }

  function populateAnalyticsForm() {
    const cfg = VaultAnalytics.getConfig();
    $('#cfg-supa-url').value = cfg.url || '';
    $('#cfg-supa-key').value = cfg.anonKey || '';
    $('#cfg-analytics-enabled').checked = !!cfg.enabled;
    $('#cfg-launched').value = toLocalDatetimeValue(cfg.siteLaunchedAt);
    $('#visitors-status').textContent = cfg.enabled && cfg.url
      ? 'السجل السحابي مفعّل — يُسجّل كل دخول ناجح بالباسورد.'
      : 'فعّل Supabase أدناه لعرض من دخل الموقع منذ الرفع.';
  }

  function collectAnalyticsFromForm() {
    return {
      enabled: $('#cfg-analytics-enabled').checked,
      url: $('#cfg-supa-url').value.trim().replace(/\/$/, ''),
      anonKey: $('#cfg-supa-key').value.trim(),
      siteLaunchedAt: fromLocalDatetimeValue($('#cfg-launched').value),
    };
  }

  async function refreshVisitors() {
    const tbody = $('#visitors-tbody');
    const status = $('#visitors-status');

    if (!VaultAnalytics.isReady()) {
      $('#stat-visits-total').textContent = '—';
      $('#stat-visits-unique').textContent = '—';
      $('#stat-visits-today').textContent = '—';
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--admin-muted)">فعّل Supabase لعرض الزوار</td></tr>';
      return;
    }

    try {
      const visits = await VaultAnalytics.fetchVisits(400);
      const unique = new Set(visits.map((v) => v.visitor_id)).size;
      const todayStr = new Date().toDateString();
      const today = visits.filter((v) => new Date(v.created_at).toDateString() === todayStr).length;

      $('#stat-visits-total').textContent = visits.length;
      $('#stat-visits-unique').textContent = unique;
      $('#stat-visits-today').textContent = today;
      status.textContent = `${visits.length} زيارة مسجّلة منذ رفع الموقع.`;

      if (!visits.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--admin-muted)">لا زيارات بعد — سيُسجّل أول دخول بالباسورد.</td></tr>';
        return;
      }

      tbody.innerHTML = visits.map((v) => {
        const d = new Date(v.created_at);
        const date = d.toLocaleDateString('ar-EG');
        const time = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const vid = (v.visitor_id || '').slice(0, 12);
        return `<tr>
          <td>${date}</td>
          <td>${time}</td>
          <td>${v.device || '—'}</td>
          <td>${v.browser || '—'}</td>
          <td>${v.language || '—'}</td>
          <td><code>${vid}</code></td>
        </tr>`;
      }).join('');
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f0a898">تعذر تحميل السجل — تأكد من الإعداد.</td></tr>';
      status.textContent = 'خطأ في الاتصال بقاعدة البيانات.';
    }
  }

  async function init() {
    await VaultSecurity.loadAuthConfig();
    await VaultAnalytics.loadConfig();
    const loaded = await VaultSecurity.loadSiteConfig();
    if (loaded) siteConfig = { ...siteConfig, ...loaded, security: { ...siteConfig.security, ...loaded.security } };
    pendingHashes = VaultSecurity.getSitePasswordHashes();

    if (VaultSecurity.hasAdminSession()) showDashboard();

    $('#admin-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#admin-login-error');
      err.classList.remove('is-visible');

      const hp = $('input[name="vault_hp"]');
      if (hp?.value) {
        err.textContent = 'تم رفض المحاولة.';
        err.classList.add('is-visible');
        return;
      }

      const lock = VaultSecurity.isLockedOut();
      if (lock.locked) {
        err.textContent = `الحساب مقفل. انتظر ${VaultSecurity.formatLockout(lock.remainingMs)}.`;
        err.classList.add('is-visible');
        return;
      }

      const pw = $('#admin-password').value;
      const result = await VaultSecurity.verifyAdminPassword(pw);
      if (result.ok) {
        $('#admin-password').value = '';
        showDashboard();
        return;
      }
      err.textContent = result.reason === 'locked'
        ? `مقفل لمدة ${VaultSecurity.formatLockout(result.remainingMs)}.`
        : 'كلمة المرور غير صحيحة.';
      err.classList.add('is-visible');
    });

    $('#admin-logout').addEventListener('click', () => {
      VaultSecurity.logoutAdmin();
      showLogin();
    });

    $('#btn-export-site').addEventListener('click', () => {
      collectConfigFromForm();
      downloadJSON('site.json', siteConfig);
    });

    $('#btn-export-auth').addEventListener('click', () => {
      collectConfigFromForm();
      downloadJSON('auth.json', authConfig);
    });

    $('#btn-export-analytics').addEventListener('click', () => {
      const cfg = collectAnalyticsFromForm();
      downloadJSON('analytics.json', cfg);
    });

    $('#btn-refresh-visits').addEventListener('click', refreshVisitors);

    $('#btn-test-analytics').addEventListener('click', async () => {
      VaultAnalytics.saveConfigLocal(collectAnalyticsFromForm());
      await VaultAnalytics.loadConfig();
      const result = await VaultAnalytics.testConnection();
      const el = $('#analytics-test-result');
      el.textContent = result.msg;
      el.style.color = result.ok ? 'var(--admin-ok)' : '#f0a898';
    });

    $('#btn-save-analytics').addEventListener('click', async () => {
      const cfg = collectAnalyticsFromForm();
      VaultAnalytics.saveConfigLocal(cfg);
      await VaultAnalytics.loadConfig();
      downloadJSON('analytics.json', cfg);
      alert('تم الحفظ. ضع analytics.json في مجلد config/ ثم Commit + Push.');
      populateAnalyticsForm();
      refreshVisitors();
    });

    $('#btn-add-password').addEventListener('click', async () => {
      const a = $('#new-site-pw').value;
      const b = $('#new-site-pw2').value;
      if (!a || a.length < 4) { alert('الباسورد قصير جداً (4 أحرف على الأقل).'); return; }
      if (a !== b) { alert('الباسوردات غير متطابقة.'); return; }
      const hash = await VaultSecurity.hashPassword(a);
      if (!pendingHashes.includes(hash)) pendingHashes.push(hash);
      $('#new-site-pw').value = '';
      $('#new-site-pw2').value = '';
      $('#password-list-note').textContent = `عدد باسوردات الموقع: ${pendingHashes.length} — حمّل auth.json وارفعه.`;
      VaultSecurity.audit('admin_password_added');
      alert('تمت الإضافة. اضغط "تحميل auth.json" ثم ارفعه في مجلد config/ عبر GitHub Desktop.');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
