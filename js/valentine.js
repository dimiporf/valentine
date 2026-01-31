(function () {
  // Helpers
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }

  // -------------------------
  // Background gentle movement
  // -------------------------
  let bgEl = null;
  let mx = 0, my = 0;   // target -1..1
  let vx = 0, vy = 0;   // smoothed

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
      vx += (mx - vx) * 0.04;
      vy += (my - vy) * 0.04;
      const tx = vx * 14;
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
    }
    requestAnimationFrame(animateBg);
  }

  window.addEventListener('mousemove', setBgTargetFromEvent, { passive: true });
  window.addEventListener('touchmove', setBgTargetFromEvent, { passive: true });

  window.addEventListener('deviceorientation', function (ev) {
    if (typeof ev.gamma === 'number' && typeof ev.beta === 'number') {
      mx = clamp(ev.gamma / 20, -1, 1);
      my = clamp(ev.beta / 35, -1, 1);
    }
  }, true);

  requestAnimationFrame(animateBg);

  // -------------------------
  // NO button evasive behavior
  // -------------------------
  let noBtn = null;
  let isNoFloating = false;
  let lastMoveTs = 0;

  function ensureNoCanMove() {
    if (!noBtn) return;

    // ΜΟΝΟ όταν αρχίσει να “δραπετεύει”, το κάνουμε fixed
    if (!isNoFloating) {
      isNoFloating = true;

      // κρατάμε την οπτική θέση που έχει τώρα πριν το κάνουμε fixed
      const r = noBtn.getBoundingClientRect();

      noBtn.style.position = 'fixed';
      noBtn.style.left = `${r.left}px`;
      noBtn.style.top = `${r.top}px`;
      noBtn.style.zIndex = '40'; // πάνω από panel
      noBtn.style.margin = '0';
    }
  }

  function positionNoRandom() {
    if (!noBtn) return;

    ensureNoCanMove();

    const pad = 12;
    const rect = noBtn.getBoundingClientRect();
    const bw = rect.width || 90;
    const bh = rect.height || 44;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxX = Math.max(pad, vw - bw - pad);
    const maxY = Math.max(pad, vh - bh - pad);

    const x = rand(pad, maxX);
    const y = rand(pad, maxY);

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.transform = 'translate(0,0)';

    lastMoveTs = Date.now();
  }

  function setupNoButton() {
    noBtn = document.getElementById('noBtn');
    if (!noBtn) return;

    // Mobile: dodge on pointerdown/touchstart so it never really clicks
    const dodge = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      positionNoRandom();
      if (navigator.vibrate) navigator.vibrate(18);
      return false;
    };

    noBtn.addEventListener('pointerdown', dodge, { passive: false });
    noBtn.addEventListener('touchstart', dodge, { passive: false });

    // Αν πατήσει click (σπάνιο), πάλι να φύγει
    noBtn.addEventListener('click', (ev) => {
      // ignore “ghost click” right after a move
      if (Date.now() - lastMoveTs < 350) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      positionNoRandom();
    }, { passive: false });

    // Desktop fun: if pointer gets close, run away
    document.addEventListener('pointermove', (e) => {
      if (!noBtn) return;

      // αν δεν έχει γίνει floating ακόμα, μην κάνει τρέλες
      // (αλλά μπορείς να το αλλάξεις σε true αν θες να ξεκινά αμέσως)
      if (!isNoFloating) return;

      const r = noBtn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 100) positionNoRandom();
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (isNoFloating) positionNoRandom();
    }, { passive: true });
  }

  // -------------------------
  // Celebration FX (canvas)
  // -------------------------
  let fxCanvas, fxCtx, fxW, fxH;
  let particles = [];
  let running = false;
  let lastT = 0;

  function setupFxCanvas() {
    fxCanvas = document.getElementById('fx');
    if (!fxCanvas) return;
    fxCtx = fxCanvas.getContext('2d');
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
        life: rand(0.8, 1.6),
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

      p.alpha = clamp(p.life / 1.0, 0, 1);

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
    const cy = window.innerHeight * 0.42;

    for (let k = 0; k < 7; k++) {
      addBurst(rand(cx * 0.35, cx * 1.65), rand(cy * 0.65, cy * 1.25), 28, 700, 900, 'square');
    }
    for (let k = 0; k < 6; k++) {
      addBurst(rand(cx * 0.3, cx * 1.7), rand(cy * 0.4, cy * 1.2), 18, 520, 600, 'heart');
    }

    running = true;
    lastT = performance.now();
    requestAnimationFrame(tick);

    setTimeout(() => {
      for (let k = 0; k < 4; k++) {
        addBurst(rand(cx * 0.4, cx * 1.6), rand(cy * 0.55, cy * 1.15), 22, 650, 900, 'square');
      }
      if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(tick); }
    }, 520);
  };

  // -------------------------
  // Detect YES mode (Blazor shows .meme.show)
  // -------------------------
  function setupYesModeObserver() {
    const meme = document.querySelector('.meme');
    if (!meme) return;

    const apply = () => {
      const isYes = meme.classList.contains('show');
      document.body.classList.toggle('yes-mode', isYes);
    };

    apply();

    const obs = new MutationObserver(() => apply());
    obs.observe(meme, { attributes: true, attributeFilter: ['class'] });
  }

  // Blazor calls this on first render
  window.valentineSetup = function () {
    setupNoButton();
    setupFxCanvas();
    setupYesModeObserver();
  };
})();
