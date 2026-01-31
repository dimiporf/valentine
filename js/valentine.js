(function () {
  // Helpers
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }

  // Elements
  let bgEl = null;
  let noBtn = null;

  // Parallax
  let mx = 0, my = 0;
  let vx = 0, vy = 0;
  let bgBound = false;

  // NO movement
  let hasMovedOnce = false;
  let lastMoveTs = 0;
  let noBound = false;

  // FX canvas
  let fxCanvas, fxCtx, fxW, fxH;
  let particles = [];
  let running = false;
  let lastT = 0;
  let fxReady = false;

  // -------------------------
  // Background parallax
  // -------------------------
  function setBgTargetFromEvent(ev) {
    const t = (ev.touches && ev.touches.length) ? ev.touches[0] : ev;
    const x = t.clientX / window.innerWidth;
    const y = t.clientY / window.innerHeight;
    mx = (x - 0.5) * 2;
    my = (y - 0.5) * 2;
  }

  function animateBg() {
    if (!bgEl) bgEl = document.querySelector(".bg");
    if (bgEl) {
      vx += (mx - vx) * 0.04;
      vy += (my - vy) * 0.04;
      bgEl.style.transform = `translate3d(${vx * 14}px, ${vy * 14}px, 0) scale(1.06)`;
    }
    requestAnimationFrame(animateBg);
  }

  function bindBgOnce() {
    if (bgBound) return;
    bgBound = true;

    window.addEventListener("mousemove", setBgTargetFromEvent, { passive: true });
    window.addEventListener("touchmove", setBgTargetFromEvent, { passive: true });

    window.addEventListener("deviceorientation", function (ev) {
      if (typeof ev.gamma === "number" && typeof ev.beta === "number") {
        mx = clamp(ev.gamma / 20, -1, 1);
        my = clamp(ev.beta / 35, -1, 1);
      }
    }, true);

    requestAnimationFrame(animateBg);
  }

  // -------------------------
  // NO button dodge (keep visible, never disappears)
  // -------------------------
  function positionNoRandom() {
    if (!noBtn) return;

    const pad = 12;
    const b = noBtn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxX = Math.max(pad, vw - b.width - pad);
    const maxY = Math.max(pad, vh - b.height - pad);

    const x = rand(pad, maxX);
    const y = rand(pad, maxY);

    // Important: fixed inside viewport
    noBtn.style.position = "fixed";
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.transform = "translate(0,0)";

    hasMovedOnce = true;
    lastMoveTs = Date.now();
  }

  function bindNoOnce() {
    if (!noBtn || noBound) return;
    noBound = true;

    const dodge = (ev) => {
      // move first so click is hard
      positionNoRandom();
      if (navigator.vibrate) navigator.vibrate(18);

      // stop event so Blazor OnNo won't fire most of the time
      ev.preventDefault();
      ev.stopPropagation();
      return false;
    };

    noBtn.addEventListener("pointerdown", dodge, { passive: false });
    noBtn.addEventListener("touchstart", dodge, { passive: false });

    // Desktop: if mouse enters AFTER it has moved once
    noBtn.addEventListener("mouseenter", () => {
      if (hasMovedOnce) positionNoRandom();
    });

    window.addEventListener("resize", () => {
      if (hasMovedOnce) positionNoRandom();
    }, { passive: true });
  }

  // -------------------------
  // FX canvas
  // -------------------------
  function setupFxCanvas() {
    if (fxReady) return;
    fxCanvas = document.getElementById("fx");
    if (!fxCanvas) return;
    fxCtx = fxCanvas.getContext("2d");
    resizeFx();
    window.addEventListener("resize", resizeFx, { passive: true });
    fxReady = true;
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

      if (p.shape === "heart") {
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

  // Public: called by Blazor from OnYes (ONLY YES)
  window.startCelebration = function () {
    setupFxCanvas();
    if (!fxCanvas) return;

    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.42;

    for (let k = 0; k < 7; k++) {
      addBurst(rand(cx * 0.35, cx * 1.65), rand(cy * 0.65, cy * 1.25), 28, 700, 900, "square");
    }
    for (let k = 0; k < 6; k++) {
      addBurst(rand(cx * 0.3, cx * 1.7), rand(cy * 0.4, cy * 1.2), 18, 520, 600, "heart");
    }

    running = true;
    lastT = performance.now();
    requestAnimationFrame(tick);
  };

  // Public: called by Blazor after first render
  window.valentineSetup = function () {
    bindBgOnce();
    setupFxCanvas();

    // Your Razor id is "noBtn"
    noBtn = document.getElementById("noBtn");
    bindNoOnce();

    // Retry in case Blazor renders a bit later
    let tries = 12;
    const timer = setInterval(() => {
      noBtn = document.getElementById("noBtn");
      if (noBtn) bindNoOnce();
      tries--;
      if (tries <= 0) clearInterval(timer);
    }, 150);
  };
})();
