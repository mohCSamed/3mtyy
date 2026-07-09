/* ==========================================================================
   PRIVATE PHOTO COLLECTION — script.js
   Vanilla JS. No dependencies.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     0. CONFIG — the only two things you are likely to want to change
     ------------------------------------------------------------------ */
  const OWNER_PASSWORDS   = ['عمتيي', 'داليا'];  // any of these unlocks the site, case-insensitive
  const OWNER_DISPLAY     = 'Our Family';        // shown in the subtitle

  const ALBUMS_BASE = 'Dalia-WebP';

  /* GitHub Pages: optional <meta name="site-base" content="/repo-name/"> */
  const SITE_BASE = (() => {
    const meta = document.querySelector('meta[name="site-base"]');
    const raw = meta?.getAttribute('content')?.trim() || '';
    if (!raw) return '';
    return raw.replace(/\/?$/, '/');
  })();

  function assetPath(...segments) {
    const path = segments
      .flat()
      .filter(Boolean)
      .map((s) => encodeURIComponent(String(s)))
      .join('/');
    return SITE_BASE ? `${SITE_BASE}${path}` : path;
  }

  /* Album folders — titles & spine colours only; image lists come from images.json */
  const ALBUM_DIRS = [
    { folder: 'Images',       title: 'Images',      subtitle: '', spineColor: '#8a5a34' },
    { folder: '5tobtyyy',     title: '5tobtyyy',    subtitle: '', spineColor: '#6f4a35' },
    { folder: 'fun',          title: 'fun',         subtitle: '', spineColor: '#7a5030' },
    { folder: '5tobt Gamal',  title: '5tobt Gamal', subtitle: '', spineColor: '#5f3f2b' },
    { folder: 'after edit',   title: 'after edit',  subtitle: '', spineColor: '#8c6a3f' },
    { folder: '2014',         title: '2014',        subtitle: '', spineColor: '#6a4428' },
  ];

  function albumPath(folder, ...segments) {
    return assetPath(ALBUMS_BASE, folder, ...segments);
  }

  /* ------------------------------------------------------------------
     1. DOM helpers
     ------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const screens = {
    loading: $('#loading-screen'),
    password: $('#password-screen'),
    shelf: $('#shelf-screen'),
    book: $('#book-screen'),
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (key === name) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  }

  /* ------------------------------------------------------------------
     2. AMBIENT DUST PARTICLES (canvas, whole-page, cheap & GPU-friendly)
     ------------------------------------------------------------------ */
  const dustCanvas = $('#dust-canvas');
  const dctx = dustCanvas.getContext('2d');
  let dustParticles = [];
  let dustRAF = null;

  function resizeDustCanvas() {
    dustCanvas.width = window.innerWidth * devicePixelRatio;
    dustCanvas.height = window.innerHeight * devicePixelRatio;
    dustCanvas.style.width = window.innerWidth + 'px';
    dustCanvas.style.height = window.innerHeight + 'px';
  }

  function initDust(count = 95) {
    resizeDustCanvas();
    dustParticles = Array.from({ length: count }, () => spawnDust());
  }

  function spawnDust() {
    const depth = Math.random();
    const isMote = Math.random() > 0.72;
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: isMote ? Math.random() * 0.9 + 0.2 : (Math.random() * 2.2 + 0.4) * (0.45 + depth * 0.9),
      speedY: -(Math.random() * 0.26 + 0.02) * (0.5 + depth * 0.75),
      speedX: (Math.random() - 0.5) * 0.16,
      alpha: (Math.random() * 0.5 + 0.06) * (0.35 + depth * 0.65),
      drift: Math.random() * Math.PI * 2,
      depth,
      isMote,
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function drawDust() {
    if (document.hidden) { dustRAF = null; return; }
    const sunX = 0.72 + Math.sin(performance.now() * 0.00008) * 0.04;
    dctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    dctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of dustParticles) {
      p.drift += 0.004 + p.depth * 0.005;
      p.twinkle += 0.02;
      p.x += p.speedX + Math.sin(p.drift) * (0.05 + p.depth * 0.07);
      p.y += p.speedY;
      if (p.y < -12) { Object.assign(p, spawnDust(), { y: window.innerHeight + 12 }); }
      if (p.x < -12) p.x = window.innerWidth + 12;
      if (p.x > window.innerWidth + 12) p.x = -12;

      const inBeam = p.x > window.innerWidth * (sunX - 0.18) && p.x < window.innerWidth * (sunX + 0.12);
      const sparkle = inBeam ? 0.25 + Math.sin(p.twinkle) * 0.18 : 0;
      dctx.globalAlpha = clamp(p.alpha + sparkle, 0.04, 0.75);

      if (p.isMote) {
        dctx.fillStyle = inBeam ? '#fff4d4' : '#e9c88c';
        dctx.beginPath();
        dctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        dctx.fill();
      } else {
        const g = dctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.2);
        g.addColorStop(0, inBeam ? 'rgba(255,240,200,0.9)' : 'rgba(233,200,140,0.85)');
        g.addColorStop(1, 'rgba(233,200,140,0)');
        dctx.fillStyle = g;
        dctx.beginPath();
        dctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        dctx.fill();
      }
    }
    dctx.globalAlpha = 1;
    dustRAF = requestAnimationFrame(drawDust);
  }

  window.addEventListener('resize', resizeDustCanvas, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !dustRAF) drawDust();
  });

  /* ------------------------------------------------------------------
     2b. PARALLAX — subtle depth on mouse / touch move
     ------------------------------------------------------------------ */
  let parallaxX = 0;
  let parallaxY = 0;
  let parallaxTargetX = 0;
  let parallaxTargetY = 0;
  let parallaxRAF = null;

  function initParallax() {
    const onMove = (clientX, clientY) => {
      parallaxTargetX = (clientX / window.innerWidth - 0.5) * 2;
      parallaxTargetY = (clientY / window.innerHeight - 0.5) * 2;
      if (!parallaxRAF) parallaxRAF = requestAnimationFrame(tickParallax);
    };
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    tickParallax();
  }

  function tickParallax() {
    parallaxX += (parallaxTargetX - parallaxX) * 0.055;
    parallaxY += (parallaxTargetY - parallaxY) * 0.055;
    document.documentElement.style.setProperty('--px', parallaxX.toFixed(4));
    document.documentElement.style.setProperty('--py', parallaxY.toFixed(4));
    $$('.library-parallax').forEach((el) => {
      const depth = parseFloat(el.dataset.depth || '0.15');
      el.style.transform = `translate3d(${parallaxX * depth * -14}px, ${parallaxY * depth * -9}px, 0)`;
    });
    parallaxRAF = Math.abs(parallaxTargetX - parallaxX) > 0.002 || Math.abs(parallaxTargetY - parallaxY) > 0.002
      ? requestAnimationFrame(tickParallax)
      : null;
  }

  /* ------------------------------------------------------------------
     3. PLACEHOLDER ART GENERATOR
     Generates a warm, tasteful canvas image whenever a real photo file
     (referenced in images.json) can't be found on disk — so the site is
     always fully functional, even before you've dropped real photos in.
     ------------------------------------------------------------------ */
  const placeholderCache = new Map();

  function generatePlaceholder({ width = 900, height = 1200, label = '', seed = 0, cover = false }) {
    const key = `${width}x${height}:${label}:${seed}:${cover}`;
    if (placeholderCache.has(key)) return placeholderCache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // seeded pseudo-random for stable but varied tones per photo
    const rand = mulberry32(seed + 1);
    const hue = 28 + rand() * 20;              // warm amber/sepia range
    const sat = 28 + rand() * 14;
    const baseL = cover ? 22 + rand() * 8 : 74 + rand() * 10;

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, `hsl(${hue}, ${sat}%, ${baseL + 8}%)`);
    grad.addColorStop(0.55, `hsl(${hue + 6}, ${sat - 4}%, ${baseL}%)`);
    grad.addColorStop(1, `hsl(${hue - 4}, ${sat}%, ${Math.max(baseL - 14, 10)}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // soft vignette
    const vg = ctx.createRadialGradient(width/2, height/2, height*0.2, width/2, height/2, height*0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, cover ? 'rgba(0,0,0,0.45)' : 'rgba(60,40,20,0.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    // gentle grain
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(rand() * width, rand() * height, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // decorative center mark
    ctx.strokeStyle = cover ? 'rgba(238,203,146,0.55)' : 'rgba(120,90,55,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width/2, height/2 - (cover?40:0), Math.min(width,height) * 0.09, 0, Math.PI * 2);
    ctx.stroke();

    if (label) {
      ctx.fillStyle = cover ? 'rgba(238,203,146,0.9)' : 'rgba(90,65,40,0.55)';
      ctx.font = `${cover ? 'italic 600' : '500'} ${Math.round(width * (cover?0.09:0.05))}px 'Cormorant Garamond', Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, height / 2 + (cover ? 40 : height*0.02));
    }

    const url = canvas.toDataURL('image/jpeg', 0.86);
    placeholderCache.set(key, url);
    return url;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Resolve an <img> style source, transparently falling back to a
   *  generated placeholder if the real file 404s. Returns a Promise<string url>. */
  function resolveImage(realSrc, { width, height, label, seed, cover, fallbackSrc } = {}) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(realSrc);
      img.onerror = () => {
        if (fallbackSrc && fallbackSrc !== realSrc) {
          resolveImage(fallbackSrc, { width, height, label, seed, cover })
            .then(resolve);
        } else {
          resolve(generatePlaceholder({ width, height, label, seed, cover }));
        }
      };
      img.src = realSrc;
    });
  }

  /* ------------------------------------------------------------------
     3b. NETWORK-AWARE PRELOAD + IMAGE CACHE
     ------------------------------------------------------------------ */
  const netProfile = { tier: 'medium', ahead: 2, behind: 1 };

  async function detectNetworkProfile() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (conn.saveData) return applyNetProfile('slow');
      const t = conn.effectiveType;
      if (t === 'slow-2g' || t === '2g') return applyNetProfile('slow');
      if (t === '3g') return applyNetProfile('medium');
      if (t === '4g') return applyNetProfile('fast');
    }
    try {
      const probe = albumPath('fun', 'images.json');
      const t0 = performance.now();
      await fetch(probe, { cache: 'force-cache' });
      const ms = performance.now() - t0;
      if (ms < 90) return applyNetProfile('fast');
      if (ms < 280) return applyNetProfile('medium');
      return applyNetProfile('slow');
    } catch (_) {
      return applyNetProfile('medium');
    }
  }

  function applyNetProfile(tier) {
    const map = {
      slow:   { tier: 'slow',   ahead: 1, behind: 1 },
      medium: { tier: 'medium', ahead: 2, behind: 0 },
      fast:   { tier: 'fast',   ahead: 5, behind: 5 },
    };
    Object.assign(netProfile, map[tier] || map.medium);
    return netProfile;
  }

  function imageMeta(index) {
    return { width: 1200, height: 1500, label: `Photo ${index + 1}`, seed: index * 13 + 7, cover: false };
  }

  /** Blur → sharp reveal (Google Photos style, 300–500ms) */
  function revealImageElement(el, url, { asBackground = false, instant = false } = {}) {
    if (!el) return Promise.resolve();
    if (instant) {
      if (asBackground) el.style.backgroundImage = `url("${url}")`;
      else el.src = url;
      el.classList.remove('is-loading-blur');
      el.classList.add('is-sharp');
      return Promise.resolve();
    }
    el.classList.remove('is-sharp');
    el.classList.add('is-loading-blur');

    return new Promise((resolve) => {
      const loader = new Image();
      loader.decoding = 'async';
      loader.onload = () => {
        if (asBackground) el.style.backgroundImage = `url("${url}")`;
        else el.src = url;
        requestAnimationFrame(() => {
          el.classList.remove('is-loading-blur');
          el.classList.add('is-sharp');
          resolve();
        });
      };
      loader.onerror = () => {
        if (!asBackground) el.src = url;
        el.classList.remove('is-loading-blur');
        el.classList.add('is-sharp');
        resolve();
      };
      loader.src = url;
    });
  }

  class ImageCache {
    constructor(maxSize = 28) {
      this.cache = new Map();
      this.pending = new Map();
      this.maxSize = maxSize;
    }

    touch(key, val) {
      this.cache.delete(key);
      this.cache.set(key, val);
    }

    evictIfNeeded() {
      while (this.cache.size >= this.maxSize) {
        const oldest = this.cache.keys().next().value;
        this.cache.delete(oldest);
      }
    }

    get(src, meta) {
      if (this.cache.has(src)) {
        const val = this.cache.get(src);
        this.touch(src, val);
        return Promise.resolve(val);
      }
      if (this.pending.has(src)) return this.pending.get(src);

      const promise = resolveImage(src, meta).then((url) => {
        this.pending.delete(src);
        this.evictIfNeeded();
        this.cache.set(src, url);
        return url;
      });
      this.pending.set(src, promise);
      return promise;
    }

    preload(src, meta, priority = false) {
      if (!src || this.cache.has(src) || this.pending.has(src)) return;
      const run = () => this.get(src, meta);
      if (priority || netProfile.tier === 'fast') {
        run();
      } else if ('requestIdleCallback' in window) {
        requestIdleCallback(run, { timeout: netProfile.tier === 'slow' ? 3000 : 1500 });
      } else {
        setTimeout(run, netProfile.tier === 'slow' ? 120 : 40);
      }
    }

    has(src) {
      return this.cache.has(src) || this.pending.has(src);
    }

    clear() {
      this.cache.clear();
      this.pending.clear();
    }
  }

  const imageCache = new ImageCache(40);
  const coverCache = new ImageCache(8);

  /* ------------------------------------------------------------------
     4. LOADING SCREEN
     ------------------------------------------------------------------ */
  function runLoadingSequence() {
    showScreen('loading');
    initDust();
    drawDust();
    initParallax();
    detectNetworkProfile();

    // Preload album manifests (JSON only — no images) while the loading screen runs
    Promise.all(ALBUM_DIRS.map(loadAlbumManifest)).then((albums) => { ALBUMS = albums; });

    const fill = $('#loading-fill');
    let progress = 0;
    const tick = setInterval(() => {
      progress += Math.random() * 18 + 6;
      progress = Math.min(progress, 100);
      fill.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          screens.loading.classList.add('is-fading-out');
          setTimeout(() => {
            screens.loading.classList.remove('is-active', 'is-fading-out');
            enterPasswordScreen();
          }, 950);
        }, 350);
      }
    }, 260);
  }

  /* ------------------------------------------------------------------
     5. PASSWORD SCREEN
     ------------------------------------------------------------------ */
  function enterPasswordScreen() {
    $('#owner-name').textContent = OWNER_DISPLAY.replace(/^Aunt\s+/i, '') || OWNER_DISPLAY;
    showScreen('password');
    const input = $('#password-input');
    setTimeout(() => input.focus({ preventScroll: true }), 400);

    const form = $('#password-form');
    const card = $('#password-card');
    const errorEl = $('#password-error');
    const submitBtn = $('.password-submit');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.disabled) return; // sequence already running
      const value = input.value.trim().toLowerCase();
      if (value.length && OWNER_PASSWORDS.some((p) => p.toLowerCase() === value)) {
        errorEl.classList.remove('is-visible');
        input.disabled = true;
        submitBtn.disabled = true;
        playUnlockSequence({ card, submitBtn });
      } else {
        card.classList.remove('is-shaking');
        // eslint-disable-next-line no-unused-expressions
        void card.offsetWidth; // restart animation
        card.classList.add('is-shaking');
        errorEl.classList.add('is-visible');
        playTone(160, 0.18, 'sawtooth', 0.04);
        input.value = '';
        input.focus();
      }
    });

    input.addEventListener('input', () => errorEl.classList.remove('is-visible'));
  }

  /* ------------------------------------------------------------------
     5b. CINEMATIC UNLOCK SEQUENCE
     Password accepted → golden glow on the button → an antique key
     slides into the lock → turns 90° with a metallic click → the
     shackle springs open with a soft thunk → warm light blooms outward
     → the blurred background sharpens and slowly pushes in (camera
     push) → crossfade into the bookshelf, where the shelf and its five
     albums fade/stagger into place. Motion lives in CSS; this function
     only decides *when* each stage begins.
     ------------------------------------------------------------------ */
  const UNLOCK_TIMING = {
    cardRecede:   420,
    keySlide:     480,
    keyTurn:      1020,
    metalClick:   1480,
    shackleOpen:  1520,
    lockThunk:    1580,
    bloom:        1720,
    sceneReveal:  1820,
    screenSwap:   3000,
    fadeDuration: 950,
  };

  function playUnlockSequence({ card, submitBtn }) {
    const scene = $('#password-scene');
    const seq = $('#unlock-sequence');
    const mechanism = $('#unlock-mechanism');
    const T = UNLOCK_TIMING;

    // Stage 1 — golden glow around the button, right as the password lands
    submitBtn.classList.add('is-success');
    playTone(680, 0.09, 'sine', 0.045);
    seq.classList.add('is-active');

    // Stage 2 — the card recedes, making room for the mechanism to read clearly
    setTimeout(() => card.classList.add('is-unlocking'), T.cardRecede);

    // Stage 3 — the antique key slides in from off-frame toward the keyhole
    setTimeout(() => mechanism.classList.add('is-key-sliding'), T.keySlide);

    // Stage 4 — the key turns a smooth 90°, the whole mechanism glowing softly
    setTimeout(() => {
      mechanism.classList.add('is-key-turning');
      seq.classList.add('is-glowing');
    }, T.keyTurn);

    // Stage 5 — metallic click at the moment the turn completes
    setTimeout(playMetallicClick, T.metalClick);

    // Stage 6 — the shackle springs open naturally
    setTimeout(() => mechanism.classList.add('is-shackle-open'), T.shackleOpen);
    setTimeout(playLockThunk, T.lockThunk);

    // Stage 7 — warm light blooms outward across the screen
    setTimeout(() => seq.classList.add('is-blooming'), T.bloom);

    // Stage 8 — background blur decreases, brightens, and slowly zooms in
    setTimeout(() => scene.classList.add('is-revealing'), T.sceneReveal);

    // Stage 9 — crossfade to the shelf; bookshelf + albums stagger in there
    setTimeout(() => {
      seq.classList.add('is-done');
      screens.password.classList.add('is-fading-out');
      setTimeout(() => {
        screens.password.classList.remove('is-active', 'is-fading-out');
        enterShelfScreen();
      }, T.fadeDuration);
    }, T.screenSwap);
  }

  /* ------------------------------------------------------------------
     6. TINY WEBAUDIO SFX (page flips, unlock chime) — no external files
     ------------------------------------------------------------------ */
  let actx = null;
  function getAudioCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    return actx;
  }
  function playTone(freq, duration, type = 'sine', gainAmt = 0.05) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainAmt, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) { /* audio not available — silently skip */ }
  }
  /** A short, bright metallic "tick" — the moment the key finishes turning. */
  function playMetallicClick() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      const tick = ctx.createOscillator();
      tick.type = 'triangle';
      tick.frequency.setValueAtTime(1500, now);
      tick.frequency.exponentialRampToValueAtTime(650, now + 0.09);
      const tickGain = ctx.createGain();
      tickGain.gain.setValueAtTime(0.05, now);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      tick.connect(tickGain).connect(ctx.destination);
      tick.start(now); tick.stop(now + 0.12);

      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 2700; bp.Q.value = 9;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.045, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      noise.connect(bp).connect(noiseGain).connect(ctx.destination);
      noise.start(now);
    } catch (_) { /* audio not available — silently skip */ }
  }

  /** A soft, low metal "thunk" — the padlock shackle springing open. */
  function playLockThunk() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      const thud = ctx.createOscillator();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(180, now);
      thud.frequency.exponentialRampToValueAtTime(55, now + 0.26);
      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.09, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      thud.connect(thudGain).connect(ctx.destination);
      thud.start(now); thud.stop(now + 0.3);

      const overtone = ctx.createOscillator();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(920, now);
      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.02, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      overtone.connect(overtoneGain).connect(ctx.destination);
      overtone.start(now); overtone.stop(now + 0.11);
    } catch (_) { /* skip */ }
  }

  function playPageFlipSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const bufferSize = ctx.sampleRate * 0.28;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start();
    } catch (_) { /* skip */ }
  }

  /* ------------------------------------------------------------------
     7. ALBUM DATA LOADING — reads images.json automatically
     ------------------------------------------------------------------ */
  function parseImagesJson(data, cfg) {
    if (Array.isArray(data)) {
      return {
        title: cfg.title,
        subtitle: cfg.subtitle || '',
        spineColor: cfg.spineColor,
        cover: 'cover.webp',
        images: data,
      };
    }
    return {
      title: data.title || cfg.title,
      subtitle: data.subtitle || cfg.subtitle || '',
      spineColor: data.spineColor || cfg.spineColor,
      cover: data.cover || 'cover.webp',
      images: data.images || [],
    };
  }

  async function loadAlbumManifest(cfg) {
    const { folder } = cfg;
    try {
      const res = await fetch(albumPath(folder, 'images.json'), { cache: 'default' });
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      const parsed = parseImagesJson(data, cfg);
      const images = parsed.images.map((f) => albumPath(folder, f));
      const coverPath = albumPath(folder, parsed.cover);
      const coverFallback = images.length ? images[0] : null;

      return {
        folder,
        title: parsed.title,
        subtitle: parsed.subtitle,
        spineColor: parsed.spineColor,
        cover: coverPath,
        coverFallback,
        images,
      };
    } catch (_) {
      return {
        folder,
        title: cfg.title,
        subtitle: cfg.subtitle || '',
        spineColor: cfg.spineColor,
        cover: albumPath(folder, 'cover.webp'),
        coverFallback: null,
        images: [],
      };
    }
  }

  let ALBUMS = [];

  /* ------------------------------------------------------------------
     8. SHELF SCREEN
     ------------------------------------------------------------------ */
  async function enterShelfScreen() {
    showScreen('shelf');
    if (!ALBUMS.length) {
      ALBUMS = await Promise.all(ALBUM_DIRS.map(loadAlbumManifest));
    }
    renderShelf();
  }

  const NUMBER_WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
  function numberWord(n) { return NUMBER_WORDS[n] || String(n); }

  function renderShelf() {
    const row = $('#books-row');
    row.innerHTML = '';
    const caption = $('#shelf-caption');
    if (caption) {
      caption.textContent = `${numberWord(ALBUMS.length)} album${ALBUMS.length === 1 ? '' : 's'}. A lifetime kept close.`;
    }
    ALBUMS.forEach((album, i) => {
      const el = document.createElement('div');
      el.className = 'book-item';
      el.style.animationDelay = `${0.4 + i * 0.16}s`;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Open album: ${album.title}`);

      const spine = document.createElement('div');
      spine.className = 'book-item__spine';
      spine.style.background = album.spineColor;

      const cover = document.createElement('div');
      cover.className = 'book-item__cover';
      cover.style.background = `linear-gradient(160deg, ${shade(album.spineColor, 24)}, ${album.spineColor})`;

      const gleam = document.createElement('div');
      gleam.className = 'book-item__gleam';

      const label = document.createElement('div');
      label.className = 'book-item__label';
      label.innerHTML = `<span class="book-item__title">${escapeHtml(album.title)}</span><span class="book-item__sub">${escapeHtml(album.subtitle || '')}</span>`;

      cover.appendChild(gleam);
      cover.appendChild(label);
      el.appendChild(spine);
      el.appendChild(cover);
      row.appendChild(el);

      // load cover lazily — only shelf covers, not album pages
      const coverMeta = { width: 480, height: 720, label: album.title, seed: i * 97 + 3, cover: true, fallbackSrc: album.coverFallback };
      coverCache.get(album.cover, coverMeta)
        .then((url) => { cover.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55)), url("${url}")`; });

      const openHandler = () => openAlbum(album, el);
      el.addEventListener('click', openHandler);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(); }
      });
    });
  }

  function shade(hex, amt) {
    try {
      const n = hex.replace('#', '');
      const num = parseInt(n, 16);
      let r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
      r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
      return `rgb(${r},${g},${b})`;
    } catch (_) { return hex; }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  /* ------------------------------------------------------------------
     9. OPEN ALBUM → BOOK SCREEN
     ------------------------------------------------------------------ */
  let currentAlbum = null;
  let currentPhotoIndex = 0; /* 0 … images.length-1 — every photo reachable */

  function openAlbum(album, bookEl) {
    currentAlbum = album;
    currentPhotoIndex = 0;
    imageCache.clear();

    if (album.images.length) {
      imageCache.preload(album.images[0], imageMeta(0), true);
      if (album.images.length > 1) imageCache.preload(album.images[1], imageMeta(1), true);
    }

    if (bookEl) {
      bookEl.classList.add('is-pulling');
      $$('.book-item').forEach((b) => { if (b !== bookEl) b.classList.add('is-dimmed'); });
    }

    screens.shelf.classList.add('is-fading-out');
    setTimeout(() => {
      if (bookEl) {
        bookEl.classList.remove('is-pulling');
        $$('.book-item').forEach((b) => b.classList.remove('is-dimmed'));
      }
      screens.shelf.classList.remove('is-active', 'is-fading-out');
      showScreen('book');
      setupBookScreen(album, bookEl);
    }, 720);
  }

  function setBookShadow(state) {
    const shadow = $('#book-shadow');
    if (!shadow) return;
    shadow.classList.remove('is-approach', 'is-settled', 'is-opening', 'is-open');
    if (state) shadow.classList.add(state);
  }

  let shadowRAF = null;
  function startDynamicShadow(duration = 820) {
    const shadow = $('#book-shadow');
    const book = $('#book');
    if (!shadow || !book) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp((now - t0) / duration, 0, 1);
      const lift = 1 - Math.pow(1 - p, 2.2);
      const bounce = p > 0.72 ? Math.sin((p - 0.72) / 0.28 * Math.PI) * 0.06 : 0;
      const scaleX = 0.55 + lift * 0.38 + bounce;
      const scaleY = 0.65 + lift * 0.38 - bounce * 0.5;
      const opacity = 0.18 + lift * 0.48;
      const blur = 8 + lift * 8;
      shadow.style.opacity = opacity;
      shadow.style.filter = `blur(${blur}px)`;
      shadow.style.transform = `translateX(-50%) scaleX(${scaleX}) scaleY(${scaleY})`;
      if (p < 1) shadowRAF = requestAnimationFrame(tick);
      else shadowRAF = null;
    };
    if (shadowRAF) cancelAnimationFrame(shadowRAF);
    shadowRAF = requestAnimationFrame(tick);
  }

  function stopDynamicShadow() {
    if (shadowRAF) { cancelAnimationFrame(shadowRAF); shadowRAF = null; }
  }

  function setPageThickness(album) {
    const block = $('#book-pages-block');
    if (!block || !album) return;
    const depth = clamp(Math.round(album.images.length / 35) + 4, 5, 18);
    block.style.setProperty('--page-depth', `${depth}px`);
    const edge = block.querySelector('.book__page-edge');
    if (edge) edge.style.setProperty('--edge-layers', depth);
  }

  function setupBookScreen(album, sourceBookEl) {
    const book = $('#book');
    const front = $('#book-front-cover');
    const art = $('#book-cover-art');
    const title = $('#book-cover-title');
    const controls = $('#book-controls');
    const pagesBlock = $('#book-pages-block');
    const leftTitle = $('#book-left-title');
    const leftSub = $('#book-left-sub');
    const stage = $('#book-stage');
    const scene = $('#book-scene');

    book.classList.remove('is-open', 'is-from-shelf', 'is-settled');
    controls.classList.remove('is-visible');
    if (pageFlipperBack) { pageFlipperBack.remove(); pageFlipperBack = null; }
    pagesBlock.innerHTML = '<div class="book__page-edge" aria-hidden="true"></div>';
    setPageThickness(album);
    title.textContent = album.title;
    art.style.backgroundImage = '';
    art.classList.remove('is-sharp');
    leftTitle.textContent = album.title;
    leftSub.textContent = album.subtitle || '';
    $('#book-left-photo').classList.remove('is-sharp', 'is-loading-blur');
    $('#book-left-page').classList.remove('is-photo-mode', 'is-turning');

    const coverMeta = { width: 480, height: 720, label: album.title, seed: 42, cover: true, fallbackSrc: album.coverFallback };
    coverCache.get(album.cover, coverMeta).then((url) => revealImageElement(art, url, { asBackground: true }));

    setBookShadow('is-approach');
    startDynamicShadow(820);
    scene.classList.remove('is-camera-open');
    book.classList.remove('is-approaching');
    if (sourceBookEl) book.classList.add('is-from-shelf');
    void book.offsetWidth;
    book.classList.add('is-approaching');
    stage.classList.add('is-book-entering');
    setTimeout(() => {
      stage.classList.remove('is-book-entering');
      book.classList.remove('is-approaching');
      book.classList.add('is-settled');
      stopDynamicShadow();
      setBookShadow('is-settled');
    }, 820);
    playTone(300, 0.15, 'sine', 0.04);

    const openHandler = () => {
      front.removeEventListener('click', openHandler);
      book.classList.add('is-opening');
      setBookShadow('is-opening');
      scene.classList.add('is-camera-open');
      stage.classList.add('is-book-opening');
      setTimeout(() => {
        book.classList.remove('is-opening');
        book.classList.add('is-open');
        stage.classList.remove('is-book-opening');
        setBookShadow('is-open');
        playPageFlipSound();
        buildSpreadBook(album, pagesBlock);
        setTimeout(() => controls.classList.add('is-visible'), 500);
      }, 420);
    };
    front.addEventListener('click', openHandler);
    setTimeout(openHandler, 720);
  }

  $('#back-to-shelf').addEventListener('click', () => {
    imageCache.clear();
    stopDynamicShadow();
    if (pageFlipperBack) { pageFlipperBack.remove(); pageFlipperBack = null; }
    screens.book.classList.add('is-fading-out');
    setTimeout(() => {
      screens.book.classList.remove('is-active', 'is-fading-out');
      showScreen('shelf');
    }, 500);
  });

  /* ------------------------------------------------------------------
     10. PAGE TURNER — simple index 0…N-1, every photo reachable
     ------------------------------------------------------------------ */
  let flipBusy = false;
  let pageFlipperBack = null;

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function photoCount() {
    return currentAlbum?.images?.length || 0;
  }

  function buildSpreadBook(album, container) {
    if (pageFlipperBack) { pageFlipperBack.remove(); pageFlipperBack = null; }

    const edge = container.querySelector('.book__page-edge');
    container.innerHTML = `
      <div class="spread-engine" id="spread-engine">
        <div class="spread-engine__ambient" aria-hidden="true"></div>
        <div class="spread-engine__right spread-page" id="spread-right">
          <div class="spread-page__inner">
            <div class="spread-page__photo" id="spread-right-photo">
              <img id="spread-right-img" class="photo-reveal" alt="" decoding="async" />
              <div class="spread-page__loading" id="spread-right-loading" aria-hidden="true"></div>
            </div>
          </div>
          <div class="spread-page__edge-shadow"></div>
        </div>
        <div class="spread-engine__flipper spread-engine__flipper--fwd" id="spread-flipper-fwd">
          <div class="spread-page__leaf spread-page__leaf--front">
            <div class="spread-page__inner">
              <div class="spread-page__photo"><img id="spread-flip-fwd-img" class="photo-reveal" alt="" decoding="async" /></div>
            </div>
            <div class="spread-page__sheen"></div>
          </div>
          <div class="spread-page__leaf spread-page__leaf--back">
            <div class="spread-page__paper-texture"></div>
          </div>
        </div>
        <div class="spread-engine__cast-shadow" id="spread-cast-shadow" aria-hidden="true"></div>
      </div>
    `;
    if (edge) container.prepend(edge);

    pageFlipperBack = document.createElement('div');
    pageFlipperBack.className = 'spread-engine__flipper spread-engine__flipper--back';
    pageFlipperBack.id = 'spread-flipper-back';
    pageFlipperBack.innerHTML = `
      <div class="spread-page__leaf spread-page__leaf--front">
        <div class="spread-page__inner spread-page__inner--title" id="spread-flip-back-title">
          <div class="spread-flip-back__ornament">
            <svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="0.8"/><path d="M20 8 L22.5 17.5 L32 20 L22.5 22.5 L20 32 L17.5 22.5 L8 20 L17.5 17.5 Z" fill="currentColor" opacity="0.8"/></svg>
          </div>
          <p class="spread-flip-back__label" id="spread-flip-back-label"></p>
        </div>
        <div class="spread-page__inner spread-page__inner--photo" id="spread-flip-back-photo" hidden>
          <div class="spread-page__photo"><img id="spread-flip-back-img" class="photo-reveal" alt="" decoding="async" /></div>
        </div>
        <div class="spread-page__sheen"></div>
      </div>
      <div class="spread-page__leaf spread-page__leaf--back">
        <div class="spread-page__paper-texture"></div>
      </div>
    `;
    $('#book').appendChild(pageFlipperBack);

    $('#spread-right-photo').addEventListener('click', () => {
      if (currentAlbum) openViewer(currentPhotoIndex);
    });

    currentPhotoIndex = 0;
    renderSpread({ instant: true });
    preloadSpread(0);
    if (album.images.length > 1) preloadSpread(1);
  }

  $('#book-left-photo').addEventListener('click', () => {
    if (!currentAlbum || currentPhotoIndex <= 0) return;
    openViewer(currentPhotoIndex - 1);
  });

  async function getResolvedSrc(src, index) {
    return imageCache.get(src, imageMeta(index));
  }

  function leftPhotoIndex(photoIdx) {
    return photoIdx > 0 ? photoIdx - 1 : null;
  }

  function preloadSpread(photoIdx) {
    const album = currentAlbum;
    if (!album || !album.images.length) return;
    const n = album.images.length;

    // أولوية قصوى: الصورة اليمنى + اليسرى للصفحة الحالية والتالية
    imageCache.preload(album.images[photoIdx], imageMeta(photoIdx), true);
    const leftIdx = leftPhotoIndex(photoIdx);
    if (leftIdx !== null) imageCache.preload(album.images[leftIdx], imageMeta(leftIdx), true);
    const nextIdx = photoIdx + 1;
    if (nextIdx < n) {
      imageCache.preload(album.images[nextIdx], imageMeta(nextIdx), true);
      imageCache.preload(album.images[photoIdx], imageMeta(photoIdx), true);
    }
    const prevLeft = leftPhotoIndex(photoIdx - 1);
    if (photoIdx > 0 && prevLeft !== null) {
      imageCache.preload(album.images[prevLeft], imageMeta(prevLeft), true);
    }

    const start = Math.max(0, photoIdx - netProfile.behind);
    const end = Math.min(n - 1, photoIdx + netProfile.ahead);
    for (let i = start; i <= end; i++) {
      imageCache.preload(album.images[i], imageMeta(i));
    }
  }

  function applyLeftPhotoUrl(photoEl, backCover, url) {
    if (!photoEl || !url) return;
    photoEl.style.backgroundImage = `url("${url}")`;
    photoEl.classList.remove('is-loading-blur');
    photoEl.classList.add('is-sharp');
    backCover.classList.add('is-photo-mode');
  }

  async function updateLeftPage(album, photoIdx, { instant = false, urlOverride = null } = {}) {
    const backCover = $('#book-left-page');
    const photoEl = $('#book-left-photo');
    const titleEl = $('#book-left-title');
    const subEl = $('#book-left-sub');

    if (photoIdx <= 0) {
      backCover.classList.remove('is-photo-mode');
      titleEl.textContent = album.title;
      subEl.textContent = album.subtitle || '';
      photoEl.style.backgroundImage = '';
      photoEl.classList.remove('is-loading-blur', 'is-sharp');
      return;
    }

    const idx = photoIdx - 1;
    backCover.classList.add('is-photo-mode');

    if (urlOverride) {
      applyLeftPhotoUrl(photoEl, backCover, urlOverride);
      imageCache.preload(album.images[idx], imageMeta(idx), true);
      return;
    }

    const src = album.images[idx];
    const useInstant = instant || imageCache.has(src);
    const resolved = await getResolvedSrc(src, idx);
    if (useInstant) {
      applyLeftPhotoUrl(photoEl, backCover, resolved);
    } else {
      await revealImageElement(photoEl, resolved, { asBackground: true });
      backCover.classList.add('is-photo-mode');
    }
  }

  function setPhotoLoading(on) {
    const el = $('#spread-right-loading');
    if (el) el.classList.toggle('is-active', on);
  }

  async function setRightPhoto(album, photoIdx, { instant = false } = {}) {
    const img = $('#spread-right-img');
    if (photoIdx < 0 || photoIdx >= album.images.length) return null;
    const src = album.images[photoIdx];
    const useInstant = instant || imageCache.has(src);
    if (!useInstant) setPhotoLoading(true);
    const resolved = await getResolvedSrc(src, photoIdx);
    img.alt = `${album.title} — photo ${photoIdx + 1}`;
    await revealImageElement(img, resolved, { instant: useInstant });
    setPhotoLoading(false);
    return resolved;
  }

  async function renderSpread({ instant = false } = {}) {
    const album = currentAlbum;
    if (!album) return;
    await setRightPhoto(album, currentPhotoIndex, { instant });
    await updateLeftPage(album, currentPhotoIndex, { instant });
    updatePageThickness(album);
    const block = $('#book-pages-block');
    if (block) {
      const remaining = Math.max(0, album.images.length - currentPhotoIndex);
      block.style.setProperty('--page-depth', `${clamp(Math.round(remaining / 28) + 4, 5, 18)}px`);
    }
    preloadSpread(currentPhotoIndex);
    updatePageCounter();
  }

  function updatePageCounter() {
    const n = photoCount();
    const el = $('#page-counter');
    if (!el || !n) {
      if (el) el.textContent = '0 / 0';
      return;
    }

    const rightNum = currentPhotoIndex + 1;
    const leftNum = currentPhotoIndex > 0 ? currentPhotoIndex : null;

    if (leftNum !== null) {
      el.textContent = `${leftNum} – ${rightNum} / ${n}`;
      el.setAttribute('aria-label', `Photos ${leftNum} and ${rightNum} of ${n}`);
    } else {
      el.textContent = `${rightNum} / ${n}`;
      el.setAttribute('aria-label', `Photo ${rightNum} of ${n}`);
    }

    const prev = $('#page-prev');
    const next = $('#page-next');
    if (prev) prev.disabled = currentPhotoIndex <= 0;
    if (next) next.disabled = currentPhotoIndex >= n - 1;
  }

  async function loadFlipImg(imgEl, album, photoIdx) {
    if (!imgEl || photoIdx < 0 || photoIdx >= album.images.length) {
      imgEl?.removeAttribute('src');
      return;
    }
    const url = await getResolvedSrc(album.images[photoIdx], photoIdx);
    imgEl.alt = `${album.title} — photo ${photoIdx + 1}`;
    await revealImageElement(imgEl, url, { instant: true });
  }

  async function prepareBackFlipper(album, photoIdx) {
    const titleWrap = $('#spread-flip-back-title');
    const photoWrap = $('#spread-flip-back-photo');
    const label = $('#spread-flip-back-label');
    const img = $('#spread-flip-back-img');
    if (!titleWrap || !photoWrap) return;

    if (photoIdx <= 0) {
      titleWrap.hidden = false;
      photoWrap.hidden = true;
      if (label) label.textContent = album.title;
    } else {
      titleWrap.hidden = true;
      photoWrap.hidden = false;
      await loadFlipImg(img, album, photoIdx - 1);
    }
  }

  function flipDuration() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 320 : 780;
  }

  function cssFlip(el, angle, castShadow) {
    return new Promise((resolve) => {
      if (!el) { resolve(); return; }
      const dur = flipDuration();
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        el.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (e) => {
        if (e.target === el && e.propertyName === 'transform') done();
      };
      el.style.transition = `transform ${dur}ms cubic-bezier(0.35, 0.15, 0.2, 1)`;
      if (castShadow) {
        castShadow.classList.add('is-active');
        castShadow.style.transition = `opacity ${dur}ms ease`;
        castShadow.style.opacity = '0.28';
      }
      el.addEventListener('transitionend', onEnd);
      requestAnimationFrame(() => {
        el.style.transform = `rotateY(${angle}deg)`;
      });
      setTimeout(done, dur + 80);
    });
  }

  function resetFlipper(el, castShadow) {
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = '';
    el.classList.remove('is-active');
    if (castShadow) {
      castShadow.classList.remove('is-active');
      castShadow.style.opacity = '';
      castShadow.style.transform = '';
      castShadow.style.transition = '';
    }
    void el.offsetWidth;
  }

  async function goPhoto(newIndex) {
    if (flipBusy || !currentAlbum) return;
    const n = photoCount();
    if (newIndex < 0 || newIndex >= n) return;

    const album = currentAlbum;
    const oldIndex = currentPhotoIndex;
    const forward = newIndex > oldIndex;

    flipBusy = true;
    playPageFlipSound();

    const castShadow = $('#spread-cast-shadow');

    try {
      preloadSpread(newIndex);

      if (forward) {
        const flipper = $('#spread-flipper-fwd');
        const flipImg = $('#spread-flip-fwd-img');
        const rightImg = $('#spread-right-img');
        const leftUrl = rightImg?.src && rightImg.classList.contains('is-sharp') ? rightImg.src : null;

        await loadFlipImg(flipImg, album, oldIndex);
        await setRightPhoto(album, newIndex, { instant: true });
        await updateLeftPage(album, newIndex, { instant: true, urlOverride: leftUrl });
        currentPhotoIndex = newIndex;

        flipper.classList.add('is-active');
        flipper.style.transform = 'rotateY(0deg)';
        await cssFlip(flipper, -175, castShadow);
        resetFlipper(flipper, castShadow);
      } else {
        const flipper = pageFlipperBack;
        if (!flipper) throw new Error('no back flipper');
        const leftIdx = leftPhotoIndex(newIndex);
        if (leftIdx !== null) {
          imageCache.preload(album.images[leftIdx], imageMeta(leftIdx), true);
        }
        imageCache.preload(album.images[newIndex], imageMeta(newIndex), true);

        await prepareBackFlipper(album, oldIndex);
        await setRightPhoto(album, newIndex, { instant: true });
        await updateLeftPage(album, newIndex, { instant: true });
        currentPhotoIndex = newIndex;

        flipper.classList.add('is-active');
        flipper.style.transform = 'rotateY(0deg)';
        await cssFlip(flipper, 175, castShadow);
        resetFlipper(flipper, castShadow);
      }
      preloadSpread(currentPhotoIndex);
      updatePageCounter();
    } catch (err) {
      currentPhotoIndex = newIndex;
      await renderSpread({ instant: true });
      console.warn('Page flip fallback:', err);
    } finally {
      flipBusy = false;
    }
  }

  function goNext() { goPhoto(currentPhotoIndex + 1); }
  function goPrev() { goPhoto(currentPhotoIndex - 1); }

  $('#page-next').addEventListener('click', goNext);
  $('#page-prev').addEventListener('click', goPrev);
  $('#page-next')?.addEventListener('mouseenter', () => {
    if (currentPhotoIndex < photoCount() - 1) preloadSpread(currentPhotoIndex + 1);
  });
  $('#page-prev')?.addEventListener('mouseenter', () => {
    if (currentPhotoIndex > 0) preloadSpread(currentPhotoIndex - 1);
  });
  $('#book-tap-next')?.addEventListener('click', goNext);
  $('#book-tap-prev')?.addEventListener('click', goPrev);

  document.addEventListener('keydown', (e) => {
    if (!screens.book.classList.contains('is-active') || viewerOpen || flipBusy) return;
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  (function enableBookSwipe() {
    const stage = $('#book-stage');
    let startX = 0;
    let startY = 0;
    stage.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (flipBusy) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) goNext();
      else goPrev();
    }, { passive: true });
  })();

  /* ------------------------------------------------------------------
     11. FULLSCREEN IMAGE VIEWER — zoom / pan / download / swipe
     ------------------------------------------------------------------ */
  let viewerOpen = false;
  let viewerIndex = 0;
  let viewerScale = 1;
  let viewerX = 0;
  let viewerY = 0;
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let originStart = { x: 0, y: 0 };
  let viewerAnimFrame = null;
  let viewerTransitioning = false;

  const viewerEl = $('#viewer');
  const viewerImg = $('#viewer-image');
  const viewerStage = $('#viewer-stage');

  function openViewer(index) {
    viewerIndex = index;
    viewerOpen = true;
    resetViewerTransform(false);
    viewerEl.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    updateViewerImage();
    imageCache.preload(currentAlbum.images[index], imageMeta(index));
    if (index > 0) imageCache.preload(currentAlbum.images[index - 1], imageMeta(index - 1));
    if (index < currentAlbum.images.length - 1) imageCache.preload(currentAlbum.images[index + 1], imageMeta(index + 1));
  }

  function closeViewer() {
    viewerOpen = false;
    viewerEl.classList.remove('is-active');
    document.body.style.overflow = '';
    resetViewerTransform(false);
  }

  async function updateViewerImage(direction = 0) {
    if (!currentAlbum || viewerTransitioning) return;
    viewerTransitioning = true;
    const album = currentAlbum;
    const src = await getResolvedSrc(album.images[viewerIndex], viewerIndex);

    if (direction !== 0) {
      viewerImg.classList.add(direction > 0 ? 'is-exiting-left' : 'is-exiting-right');
      await wait(220);
    }

    viewerImg.classList.remove('is-exiting-left', 'is-exiting-right', 'is-entering-left', 'is-entering-right', 'is-sharp');
    viewerImg.alt = `${album.title} — photo ${viewerIndex + 1} of ${album.images.length}`;
    $('#viewer-counter').textContent = `${viewerIndex + 1} / ${album.images.length}`;
    $('#viewer-prev').disabled = viewerIndex <= 0;
    $('#viewer-next').disabled = viewerIndex >= album.images.length - 1;
    resetViewerTransform(false);
    await revealImageElement(viewerImg, src);

    if (direction !== 0) {
      viewerImg.classList.add(direction > 0 ? 'is-entering-right' : 'is-entering-left');
      await wait(280);
      viewerImg.classList.remove('is-entering-right', 'is-entering-left');
    }
    viewerTransitioning = false;

    if (viewerIndex > 0) imageCache.preload(album.images[viewerIndex - 1], imageMeta(viewerIndex - 1));
    if (viewerIndex < album.images.length - 1) imageCache.preload(album.images[viewerIndex + 1], imageMeta(viewerIndex + 1));
  }

  function resetViewerTransform(animate = true) {
    viewerScale = 1;
    viewerX = 0;
    viewerY = 0;
    applyViewerTransform(animate);
  }

  function constrainPan() {
    if (viewerScale <= 1) { viewerX = 0; viewerY = 0; return; }
    const rect = viewerImg.getBoundingClientRect();
    const stageRect = viewerStage.getBoundingClientRect();
    const scaledW = rect.width;
    const scaledH = rect.height;
    const maxX = Math.max(0, (scaledW - stageRect.width) / 2);
    const maxY = Math.max(0, (scaledH - stageRect.height) / 2);
    viewerX = clamp(viewerX, -maxX, maxX);
    viewerY = clamp(viewerY, -maxY, maxY);
  }

  function applyViewerTransform(animate = true) {
    constrainPan();
    if (!animate) viewerImg.classList.add('is-dragging');
    viewerImg.style.transform = `translate3d(${viewerX}px, ${viewerY}px, 0) scale(${viewerScale})`;
    if (!animate) {
      requestAnimationFrame(() => viewerImg.classList.remove('is-dragging'));
    }
  }

  function scheduleViewerTransform() {
    if (viewerAnimFrame) return;
    viewerAnimFrame = requestAnimationFrame(() => {
      viewerAnimFrame = null;
      applyViewerTransform(false);
    });
  }

  function zoomAtPoint(delta, clientX, clientY) {
    const prevScale = viewerScale;
    viewerScale = clamp(viewerScale + delta, 1, 4);
    if (viewerScale === 1) {
      viewerX = 0;
      viewerY = 0;
    } else if (prevScale !== viewerScale) {
      const rect = viewerImg.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      const ratio = viewerScale / prevScale - 1;
      viewerX -= cx * ratio;
      viewerY -= cy * ratio;
    }
    applyViewerTransform();
  }

  $('#viewer-close').addEventListener('click', closeViewer);
  viewerEl.querySelector('.viewer__backdrop').addEventListener('click', closeViewer);
  $('#viewer-next').addEventListener('click', () => {
    if (viewerIndex < currentAlbum.images.length - 1) { viewerIndex++; updateViewerImage(1); }
  });
  $('#viewer-prev').addEventListener('click', () => {
    if (viewerIndex > 0) { viewerIndex--; updateViewerImage(-1); }
  });

  $('#viewer-download').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = viewerImg.src;
    const album = currentAlbum;
    a.download = `${(album?.title || 'photo').replace(/\s+/g, '_')}_${String(viewerIndex + 1).padStart(3, '0')}.webp`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  viewerStage.addEventListener('wheel', (e) => {
    if (!viewerOpen) return;
    e.preventDefault();
    zoomAtPoint(-e.deltaY * 0.0018, e.clientX, e.clientY);
  }, { passive: false });

  viewerImg.addEventListener('dblclick', (e) => {
    if (viewerScale > 1) {
      resetViewerTransform();
    } else {
      zoomAtPoint(1.6, e.clientX, e.clientY);
    }
  });

  viewerImg.addEventListener('mousedown', (e) => {
    if (viewerScale <= 1) return;
    dragging = true;
    viewerImg.classList.add('is-dragging');
    dragStart = { x: e.clientX, y: e.clientY };
    originStart = { x: viewerX, y: viewerY };
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    viewerX = originStart.x + (e.clientX - dragStart.x);
    viewerY = originStart.y + (e.clientY - dragStart.y);
    scheduleViewerTransform();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    viewerImg.classList.remove('is-dragging');
    constrainPan();
    applyViewerTransform();
  });

  let touchState = { mode: null, startDist: 0, startScale: 1, startX: 0, startY: 0, originX: 0, originY: 0, swipeStartX: 0, pinchMidX: 0, pinchMidY: 0 };
  viewerStage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      touchState.mode = 'pinch';
      touchState.startDist = touchDist(e.touches);
      touchState.startScale = viewerScale;
      touchState.pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      touchState.pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
      touchState.mode = viewerScale > 1 ? 'pan' : 'swipe';
      touchState.startX = e.touches[0].clientX;
      touchState.startY = e.touches[0].clientY;
      touchState.originX = viewerX;
      touchState.originY = viewerY;
      touchState.swipeStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  viewerStage.addEventListener('touchmove', (e) => {
    if (touchState.mode === 'pinch' && e.touches.length === 2) {
      const dist = touchDist(e.touches);
      const newScale = clamp(touchState.startScale * (dist / touchState.startDist), 1, 4);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const prevScale = viewerScale;
      viewerScale = newScale;
      if (viewerScale === 1) {
        viewerX = 0;
        viewerY = 0;
      } else if (prevScale !== viewerScale && prevScale > 0) {
        const rect = viewerImg.getBoundingClientRect();
        const cx = midX - rect.left - rect.width / 2;
        const cy = midY - rect.top - rect.height / 2;
        const ratio = viewerScale / prevScale - 1;
        viewerX -= cx * ratio;
        viewerY -= cy * ratio;
      }
      scheduleViewerTransform();
    } else if (touchState.mode === 'pan' && e.touches.length === 1) {
      viewerX = touchState.originX + (e.touches[0].clientX - touchState.startX);
      viewerY = touchState.originY + (e.touches[0].clientY - touchState.startY);
      scheduleViewerTransform();
    }
  }, { passive: true });

  viewerStage.addEventListener('touchend', (e) => {
    if (touchState.mode === 'swipe' && viewerScale <= 1) {
      const dx = (e.changedTouches[0]?.clientX ?? touchState.swipeStartX) - touchState.swipeStartX;
      if (Math.abs(dx) > 60) {
        if (dx < 0 && viewerIndex < currentAlbum.images.length - 1) { viewerIndex++; updateViewerImage(1); }
        else if (dx > 0 && viewerIndex > 0) { viewerIndex--; updateViewerImage(-1); }
      }
    }
    touchState.mode = null;
  }, { passive: true });

  function touchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  document.addEventListener('keydown', (e) => {
    if (!viewerOpen) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight' && viewerIndex < currentAlbum.images.length - 1) { viewerIndex++; updateViewerImage(1); }
    if (e.key === 'ArrowLeft' && viewerIndex > 0) { viewerIndex--; updateViewerImage(-1); }
    if (e.key === '+' || e.key === '=') zoomAtPoint(0.35, window.innerWidth / 2, window.innerHeight / 2);
    if (e.key === '-') zoomAtPoint(-0.35, window.innerWidth / 2, window.innerHeight / 2);
    if (e.key === '0') resetViewerTransform();
  });

  /* ------------------------------------------------------------------
     12. BOOT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    runLoadingSequence();
  });
})();
