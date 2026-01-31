\
(function () {
  // --- Helpers
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }

  // --- Background gentle movement (parallax-ish)
  let bgEl = null;
  let mx = 0, my = 0; // -1..1
  let vx = 0, vy = 0;

  function setBgTargetFromEvent(ev) {
    const t = ev.touches && ev.touches.length ? ev.touches[0] : ev;
    const x = t.clientX / window.innerWidth;
    const y = t.clientY / window.innerHeight;
    mx = (x - 0.5) * 2;
    my = (y - 0.5) * 2;
  }

  function animateBg() {
    if (!bgEl) bgEl = document.querySelector('.bg');
    if (bgEl) {
      // Smooth follow
      vx += (mx - vx) * 0.04;
      vy += (my - vy) * 0.04;
      const tx = vx * 14; // px
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
    }
    requestAnimationFrame(animateBg);
  }

  window.addEventListener('mousemove', setBgTargetFromEvent, { passive: true });
  window.addEventListener('touchmove', setBgTargetFromEvent, { passive: true });
  window.addEventListener('deviceorientation', function (ev) {
    // Optional: tilt support (mobile). If permission denied, no harm.
    if (typeof ev.gamma === 'number' && typeof ev.beta === 'number') {
      mx = clamp(ev.gamma / 20, -1, 1);
      my = clamp(ev.beta / 35, -1, 1);
    }
  }, true);

  requestAnimationFrame(animateBg);

  // --- NO button evasive behavior
  let noBtn = null;
  let arena = null;
  let hasMovedOnce = false;

    function positionNoRandom() {
        if (!noBtn) return;

        const pad = 12;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const b = noBtn.getBoundingClientRect();

        const maxX = vw - b.width - pad;
        const maxY = vh - b.height - pad;

        const x = rand(pad, maxX);
        const y = rand(pad, maxY);

        noBtn.style.left = `${x}px`;
        noBtn.style.top = `${y}px`;

        hasMovedOnce = true;
    }


  function setupNoButton() {
    noBtn = document.getElementById('noBtn');      

    if (!noBtn || !arena) return;

    // Start at a predictable spot (right column)
    noBtn.style.left = '0px';
    noBtn.style.top = '0px';

    const dodge = (ev) => {
      // On mobile "hover" doesn't exist; so we dodge on pointerdown/touchstart.
      // On desktop: dodge also on pointerenter so it's playful.
      positionNoRandom();

      // Provide subtle haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(18);

      ev.preventDefault();
      ev.stopPropagation();
      return false;
    };

    noBtn.addEventListener('pointerdown', dodge, { passive: false });
    noBtn.addEventListener('touchstart', dodge, { passive: false });
    noBtn.addEventListener('mouseenter', (ev) => {
      // Only do mouseenter dodge after first time to avoid immediate chaos on desktop
      if (hasMovedOnce) positionNoRandom();
    });

    // In case layout changes
    window.addEventListener('resize', () => {
      if (hasMovedOnce) positionNoRandom();
    }, { passive: true });
  }

  // Blazor will call this when it renders
  window.valentineSetup = function () {
    setupNoButton();
    setupFxCanvas();
  };

  // --- Celebration FX (canvas fireworks + hearts)
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
        age: 0,
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
    // Heart path
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

    // No explicit colors requested by user? They did ask for hearts/fireworks.
    // We'll use a small palette but not "style" the whole page; only particles.
    const palette = [
      [255, 59, 92],
      [255, 210, 0],
      [120, 90, 255],
      [62, 255, 165],
      [255, 140, 210]
    ];

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      const fade = clamp(p.life / 1.0, 0, 1);
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
    const cy = window.innerHeight * 0.42;

    // Firework-like squares
    for (let k = 0; k < 7; k++) {
      addBurst(rand(cx * 0.35, cx * 1.65), rand(cy * 0.65, cy * 1.25), 28, 700, 900, 'square');
    }
    // Hearts shower
    for (let k = 0; k < 6; k++) {
      addBurst(rand(cx * 0.3, cx * 1.7), rand(cy * 0.4, cy * 1.2), 18, 520, 600, 'heart');
    }

    running = true;
    lastT = performance.now();
    requestAnimationFrame(tick);

    // Extra micro-bursts
    setTimeout(() => {
      for (let k = 0; k < 4; k++) addBurst(rand(cx * 0.4, cx * 1.6), rand(cy * 0.55, cy * 1.15), 22, 650, 900, 'square');
      if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(tick); }
    }, 520);
  };

})();

(function () {
  const noBtn = document.getElementById("btnNo");
  if (!noBtn) return;

  // Helps prevent "click" firing after touch
  let lastMoveTs = 0;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function moveNoRandom() {
    const now = Date.now();
    lastMoveTs = now;

    // Button size
    const rect = noBtn.getBoundingClientRect();
    const bw = rect.width;
    const bh = rect.height;

    // Safe area: whole viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Random position so the whole button stays visible
    const padding = 10;
    const minX = padding;
    const maxX = vw - bw - padding;
    const minY = padding;
    const maxY = vh - bh - padding;

    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;

    noBtn.style.left = `${clamp(x, minX, maxX)}px`;
    noBtn.style.top = `${clamp(y, minY, maxY)}px`;
    noBtn.style.transform = `translate(0, 0)`;
  }

  // Best for mobile: move on pointerdown/touchstart so it "dodges"
  noBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveNoRandom();
  }, { passive: false });

  noBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveNoRandom();
  }, { passive: false });

  // Fallback: if click happens, still move
  noBtn.addEventListener("click", (e) => {
    // Ignore click if it immediately follows our move
    if (Date.now() - lastMoveTs < 350) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    moveNoRandom();
  });

  // Optional: also dodge when finger gets close (fun)
  document.addEventListener("pointermove", (e) => {
    const r = noBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If finger is within 70px, dodge
    if (dist < 70) moveNoRandom();
  });
})();

