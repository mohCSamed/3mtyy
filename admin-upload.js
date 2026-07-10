/* Vault Admin — photo upload & ZIP packaging */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  let pendingFiles = [];

  function padName(n) {
    return String(n).padStart(3, '0') + '.webp';
  }

  function parseImageList(data) {
    if (Array.isArray(data)) return [...data];
    return [...(data.images || [])];
  }

  function nextIndex(images) {
    let max = 0;
    for (const name of images) {
      const m = /^(\d+)\.webp$/i.exec(name);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
  }

  async function loadAlbumImages(folder) {
    const base = VaultSecurity.getSiteBase();
    const url = `${base}Dalia-WebP/${encodeURIComponent(folder)}/images.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('تعذر قراءة الألبوم');
    return parseImageList(await res.json());
  }

  async function fileToWebpBlob(file, quality = 0.86) {
    if (file.type === 'image/webp') return file;
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d').drawImage(bmp, 0, 0);
    bmp.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('تحويل فشل'))), 'image/webp', quality);
    });
    return blob;
  }

  function renderPreview(folder, existing, newNames) {
    const el = $('#upload-preview');
    if (!el) return;
    el.innerHTML = `
      <p class="admin-note">الألبوم: <strong>${folder}</strong> — موجود: ${existing.length} صورة — جديد: ${newNames.length}</p>
      <div class="upload-preview-grid">
        ${newNames.map((n) => `<div class="upload-thumb"><span>${n}</span></div>`).join('')}
      </div>`;
  }

  async function handleFileSelect(files) {
    const folder = $('#upload-album')?.value;
    if (!folder) { alert('اختر الألبوم أولاً.'); return; }

    pendingFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!pendingFiles.length) { alert('لم يتم اختيار صور.'); return; }

    const existing = await loadAlbumImages(folder);
    let idx = nextIndex(existing);
    const newNames = pendingFiles.map(() => padName(idx++));

    renderPreview(folder, existing, newNames);
    $('#btn-build-zip').disabled = false;
    $('#upload-status').textContent = `${pendingFiles.length} صورة جاهزة للتعبئة.`;
  }

  async function buildZip() {
    if (!window.JSZip) { alert('مكتبة ZIP لم تُحمّل.'); return; }
    const folder = $('#upload-album')?.value;
    if (!folder || !pendingFiles.length) return;

    const status = $('#upload-status');
    status.textContent = 'جاري التحويل والضغط...';
    $('#btn-build-zip').disabled = true;

    try {
      const existing = await loadAlbumImages(folder);
      let idx = nextIndex(existing);
      const zip = new JSZip();
      const albumPath = `Dalia-WebP/${folder}`;
      const added = [];

      for (const file of pendingFiles) {
        const name = padName(idx++);
        const blob = await fileToWebpBlob(file);
        zip.file(`${albumPath}/${name}`, blob);
        added.push(name);
      }

      const merged = [...existing, ...added];
      zip.file(`${albumPath}/images.json`, JSON.stringify(merged, null, 2) + '\n');

      const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = `upload-${folder.replace(/\s+/g, '-')}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);

      status.textContent = `تم! ${added.length} صورة في ZIP. فك الضغط في مجلد المشروع ثم Push.`;
      pendingFiles = [];
    } catch (e) {
      status.textContent = 'خطأ: ' + (e.message || 'فشل التعبئة');
      $('#btn-build-zip').disabled = false;
    }
  }

  function initUpload() {
    const albums = ['Images', '5tobtyyy', 'fun', '5tobt Gamal', 'after edit', '2014'];
    const sel = $('#upload-album');
    if (sel) {
      sel.innerHTML = albums.map((a) => `<option value="${a}">${a}</option>`).join('');
    }

    const input = $('#upload-files');
    const drop = $('#upload-drop');

    input?.addEventListener('change', () => handleFileSelect(input.files));

    if (drop) {
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('is-drag');
        handleFileSelect(e.dataTransfer.files);
      });
      drop.addEventListener('click', () => input?.click());
    }

    $('#btn-build-zip')?.addEventListener('click', buildZip);
  }

  window.VaultUpload = { initUpload };
})();
