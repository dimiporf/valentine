(function () {
  // ---------------------------
  // Helpers
  // ---------------------------
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }

  // ---------------------------
  // Elements (provided by Blazor markup)
  // ---------------------------
  let bgEl = null;
  let yesBtn = null;
  let noBtn = null;

  // Overlays we can inject from JS (toast + meme)
  let toastEl = null;
  let memeWrap = null;

  // Background target (-1..1)
  let mx = 0, my = 0;
  let vx = 0, vy = 0;

  // NO movement state
  let hasMovedOnce = false;
  let lastMoveTs = 0;

  // FX canvas
  let fxCanvas, fxCtx, fxW, fxH;
  let particles = [];
  let running = false;
  let lastT = 0;

  // Prevent double-binding
  let noBound = false;
  let yesBound = false;

  // ---------------------------
  // Background parallax
  // ---------------------------
  function setBgTargetFromEvent(ev) {
    const t = ev.touches && ev.touches.length ? ev.touches[0] : ev;
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
      const tx = vx * 14; // px
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
    }
    requestAnimationFrame(animateBg);
  }

  function bindBgInputsOnce() {
    // Passive listeners, safe on mobile
    window.addEventListener("mousemove", setBgTargetFromEvent, { passive: true });
    window.addEventListener("touchmove", setBgTargetFromEvent, { passive: true });

    // Optional tilt
    window.addEventListener("deviceorientation", function (ev) {
      if (typeof ev.gamma === "number" && typeof ev.beta === "number") {
        mx = clamp(ev.gamma / 20, -1, 1);
        my = clamp(ev.beta / 35, -1, 1);
      }
    }, true);

    requestAnimationFrame(animateBg);
  }

  // ---------------------------
  // Toast + Meme overlay (injected)
  // ---------------------------
  function ensureOverlays() {
    toastEl = document.querySelector(".toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.textContent = "Nice try 😅";
      document.body.appendChild(toastEl);
    }

    memeWrap = document.querySelector(".meme-wrap");
    if (!memeWrap) {
      memeWrap = document.createElement("div");
      memeWrap.className = "meme-wrap";
      memeWrap.innerHTML = `
        <div class="meme-card">
          <img src="img/daft-love.gif" alt="meme" />
        </div>
      `;
      document.body.appendChild(memeWrap);

      // Tap anywhere to close
      memeWrap.addEventListener("click", () => memeWrap.classList.remove("show"));
      memeWrap.addEventListener("touchstart", () => memeWrap.classList.remove("show"), { passive: true });
    }
  }

  function showToast(text) {
    ensureOverlays();
    toastEl.textContent = text || "Nice try 😅";
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 900);
  }

  function showMeme() {
    ensureOverlays();
    memeWrap.classList.add("show");
  }

  // ---------------------------
  // NO button random positioning
  // ---------------------------
  function positionNoRandom() {
    if (!noBtn) return;

    const pad = 12;

    // Button size
    const b = noBtn.getBoundingClientRect();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxX = Math.max(pad, vw - b.width - pad);
    const maxY = Math.max(pad, vh - b.height - pad);

    const x = rand(pad, maxX);
    const y = rand(pad, maxY);

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.transform = "translate(0, 0)";

    hasMovedOnce = true;
    lastMoveTs = Date.now();
  }

  function bindNoButtonOnce() {
    if (!noBtn || noBound) return;
    noBound = true;

    const dodge = (ev) => {
      // Move instantly on tap attempt
      positionNoRandom();

      if (navigator.vibrate) navigator.vibrate(18);

      ev.preventDefault();
      ev.stopPropagation();
      return false;
    };

    // Mobile-first: these two are the most important
    noBtn.addEventListener("pointerdown", dodge, { passive: false });
    noBtn.addEventListener("touchstart", dodge, { passive: false });

    // Fallback: if click fires anyway, still move (but avoid immediate double-trigger)
    noBtn.addEventListener("click", (ev) => {
      if (Date.now() - lastMoveTs < 350) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      positionNoRandom();
      showToast("Try again 😇");
    });

    // Desktop fun: only after first move
    noBtn.addEventListener("mouseenter", () => {
      if (hasMovedOnce) positionNoRandom();
    });

    window.addEventListener("resize", () => {
      if (hasMovedOnce) positionNoRandom();
    }, { passive: true });
  }

  // ---------------------------
  // YES button binding
  // ---------------------------
  function bindYesButtonOnce() {
    if (!yesBtn || yesBound) return;
    yesBound = true;

    yesBtn.addEventListener("click", () => {
      window.startCelebration();
      showMeme();
    });
  }

  // ---------------------------
  // FX Canvas setup + animation
  // ---------------------------
  function setupFxCanvas() {
    fxCanvas = document.getElementById("fx");
    if (!fxCanvas) return;
    fxCtx = fxCanvas.getContext("2d");
    resizeFx();
    window.addEventListener("resize", resizeFx, { passive: true });
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

  // Public: called by Blazor (or by YES handler above)
  window.startCelebration = function () {
    if (!fxCanvas) setupFxCanvas();
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

    setTimeout(() => {
      for (let k = 0; k < 4; k++) {
        addBurst(rand(cx * 0.4, cx * 1.6), rand(cy * 0.55, cy * 1.15), 22, 650, 900, "square");
      }
      if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(tick); }
    }, 520);
  };

  // ---------------------------
  // Public init: call after Blazor renders
  // ---------------------------
  function tryBind(retries) {
    bgEl = document.querySelector(".bg");
    yesBtn = document.getElementById("btnYes");
    noBtn = document.getElementById("btnNo");

    // We can always bind background + overlays + fx
    ensureOverlays();
    setupFxCanvas();

    // bind buttons if present
    if (noBtn) bindNoButtonOnce();
    if (yesBtn) bindYesButtonOnce();

    // If buttons not there yet, retry a few times (Blazor rendering timing)
    if ((!yesBtn || !noBtn) && retries > 0) {
      setTimeout(() => tryBind(retries - 1), 120);
    }
  }

  // This is the function you call from Blazor after render
  window.valentineSetup = function () {
    bindBgInputsOnce();
    tryBind(20);
  };

  // Fallback: if you forget to call it from Blazor, try anyway
  document.addEventListener("DOMContentLoaded", () => {
    // do NOT bind bg multiple times; valentineSetup handles it
    // but calling it once here is harmless because we guard with flags
    if (window.valentineSetup) window.valentineSetup();
  });

})();
