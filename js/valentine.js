(function () {
  // -----------------------------
  // Helpers
  // -----------------------------
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }

  // -----------------------------
  // Background gentle movement
  // -----------------------------
  let bgEl = null;
  let mx = 0, my = 0; // target -1..1
  let vx = 0, vy = 0; // current

  function setBgTargetFromEvent(ev) {
    const t = (ev.touches && ev.touches.length) ? ev.touches[0] : ev;
    const x = t.clientX / window.innerWidth;
    const y = t.clientY / window.innerHeight;
    mx = (x - 0.5) * 2;
    my = (y - 0.5) * 2;
  }

  function animateBg() {
    if (!bgEl) bgEl = document.querySelector('.bg');
    if (bgEl) {
      vx += (mx - vx) * 0.035;
      vy += (my - vy) * 0.035;
      const tx = vx * 14; // px
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
    }
    requestAnimationFrame(animateBg);
  }

  window.addEventListener('mousemove', setBgTargetFromEvent, { passive: true });
  window.addEventListener('touchmove', setBgTargetFromEvent, { passive: true });

  // tilt support (optional)
  window.addEventListener('deviceorientation', function (ev) {
    if (typeof ev.gamma === 'number' && typeof ev.beta === 'number') {
      mx = clamp(ev.gamma / 20, -1, 1);
      my = clamp(ev.beta / 35, -1, 1);
    }
  }, true);

  requestAnimationFrame(animateBg);

  // -----------------------------
  // NO button evasive behavior
  // Razor has: id="noBtn" wrapped in .no-wrap, inside #btnArena
  // Goal: move across WHOLE screen and prevent Blazor click
  // -----------------------------
  let noBtn = null;
  let lastMoveTs = 0;

  function ensureNoPositioning() {
    if (!noBtn) return;

    // Make it float over everything
    noBtn.style.position = 'fixed';
    noBtn.style.left = '50%';
    noBtn.style.top = '75%';
    noBtn.style.transform = 'translate(-50%, -50%)';
    noBtn.style.zIndex = '9999';
    noBtn.style.touchAction = 'none'; // helps prevent ghost click
  }

  function moveNoRandom() {
    if (!noBtn) return;
    lastMoveTs = Date.now();

    const pad = 10;
    const rect = noBtn.getBoundingClientRect();
    const bw = rect.width;
    const bh = rect.height;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxX = vw - bw - pad;
    const maxY = vh - bh - pad;

    const x = rand(pad, Math.max(pad, maxX));
    const y = rand(pad, Math.max(pad, maxY));

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.transform = 'translate(0, 0)';
  }

  function swallow(ev) {
    // This prevents Blazor @onclick from firing
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
  }

  function setupNoButton() {
    noBtn = document.getElementById('noBtn');
    if (!noBtn) return;

    ensureNoPositioning();

    // Important:
    // - Move on pointerdown/touchstart so user never "clicks"
    // - Also swallow click just in case
    const dodge = (ev) => {
      swallow(ev);
      moveNoRandom();
      if (navigator.vibrate) navigator.vibrate(18);
      return false;
    };

    noBtn.addEventListener('pointerdown', dodge, { passive: false });
    noBtn.addEventListener('touchstart', dodge, { passive: false });

    // Backup: swallow click if it ever happens
    noBtn.addEventListener('click', (ev) => {
      // ignore accidental click after move
      swallow(ev);
      // if click happens without a recent move, still move
      if (Date.now() - lastMoveTs > 250) moveNoRandom();
      return false;
    }, { passive: false });

    // Optional fun: if finger gets close, it runs away
    document.addEventListener('pointermove', (ev) => {
      if (!noBtn) return;
      const r = noBtn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) moveNoRandom();
    }, { passive: true });

    window.addEventListener('resize', () => {
      ensureNoPositioning();
      // keep it visible
      moveNoRandom();
    }, { passive: true });
  }

  // -----------------------------
  // Celebration FX (canvas fireworks + hearts)
  // -----------------------------
  let fxCanvas, fxCtx, fxW, fxH;
  let particles = [];
  let running = false;
  let lastT = 0;

  function setupFxCanvas() {
    fxCanvas = document.getElementById('fx');
    if (!fxCanvas) return;
    fxCtx = fxCanvas.getContext('2d', { alpha: true });
    resizeFx();
    window.addEventListener('resize', resizeFx, { passive: true });
  }

  function resizeFx() {
    if (!fxCanvas) return;
    fxW = fxCanvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    fxH = fxCanvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  }

  function addBurst(cx, cy, count, speed, gravity, shape) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = speed * rand(0.55, 1.15);
      particles.push({
        x: cx * devicePixelRatio,
        y: cy * devicePixelRatio,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.9, 1.7),
        gravity,
        shape,
        rot: rand(0, Math.PI * 2),
        vr: rand(-3, 3),
        size: rand(7, 14) * devicePixelRatio,
        alpha: 1
      });
    }
  }

  function drawHeart(ctx, x, y, s, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, -0.35);
    ctx.bezierCurveTo(0.5, -0.85, 1.2, -0.05, 0, 0.9);
    ctx.bezierCurveTo(-1.2, -0.05, -0.5, -0.85, 0, -0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function tick(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;

    fxCtx.clearRect(0, 0, fxW, fxH);

    const palette = [
      [255, 59, 92],
      [255, 210, 0],
      [120, 90, 255],
      [62, 255, 165],
      [255, 140, 210]
    ];

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      const fade = clamp(p.life / 1.2, 0, 1);
      p.alpha = fade;

      const c = palette[i % palette.length];
      fxCtx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p.alpha})`;

      if (p.shape === 'heart') {
        drawHeart(fxCtx, p.x, p.y, p.size / 18, p.rot, p.alpha);
      } else {
        fxCtx.save();
        fxCtx.translate(p.x, p.y);
        fxCtx.rotate(p.rot);
        fxCtx.globalAlpha = p.alpha;
        fxCtx.fillRect(-p.size * 0.25, -p.size * 0.25, p.size * 0.5, p.size * 0.5);
        fxCtx.restore();
      }
    }

    if (particles.length > 0) requestAnimationFrame(tick);
    else running = false;
  }

  window.startCelebration = function () {
    if (!fxCanvas) setupFxCanvas();
    if (!fxCanvas) return;

    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.45;

    for (let k = 0; k < 7; k++) {
      addBurst(rand(cx * 0.3, cx * 1.7), rand(cy * 0.55, cy * 1.25), 28, 720, 950, 'square');
    }
    for (let k = 0; k < 6; k++) {
      addBurst(rand(cx * 0.3, cx * 1.7), rand(cy * 0.45, cy * 1.15), 18, 560, 650, 'heart');
    }

    running = true;
    lastT = performance.now();
    requestAnimationFrame(tick);

    setTimeout(() => {
      for (let k = 0; k < 4; k++) addBurst(rand(cx * 0.35, cx * 1.65), rand(cy * 0.55, cy * 1.2), 22, 680, 950, 'square');
      if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(tick); }
    }, 520);
  };

  // Blazor calls this once on first render
  window.valentineSetup = function () {
    setupNoButton();
    setupFxCanvas();
  };
})();
