(function () {
  // ---------- Helpers ----------
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ---------- Background parallax ----------
  let bgEl = null;
  let mx = 0, my = 0; // -1..1
  let vx = 0, vy = 0;
  let bgBound = false;

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
      const tx = vx * 14;
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
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

  // ---------- Meme observer (hide bottom panel when meme shows) ----------
  let memeObserver = null;

  function syncMemeState() {
    const meme = document.querySelector(".meme");
    const isShow = meme && meme.classList.contains("show");
    document.body.classList.toggle("meme-on", !!isShow);
  }

  function observeMeme() {
    if (memeObserver) return;

    const target = document.body;
    if (!target) return;

    memeObserver = new MutationObserver(() => {
      // Any DOM/class change -> re-check
      syncMemeState();
    });

    memeObserver.observe(target, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    // initial
    syncMemeState();
  }

  // ---------- FX Canvas (optional, but LIGHT) ----------
  // Αν θες ΤΕΛΕΙΩΣ χωρίς fireworks, άφησε το startCelebration() κενό.
  // Εδώ το κρατάω ultra-light (ένα “flash” στο canvas) για να μη κολλάει.
  let fxCanvas, fxCtx;

  function setupFxCanvas() {
    fxCanvas = document.getElementById("fx");
    if (!fxCanvas) return;
    fxCtx = fxCanvas.getContext("2d");
    resizeFx();
    window.addEventListener("resize", resizeFx, { passive: true });
  }

  function resizeFx() {
    if (!fxCanvas) return;
    fxCanvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    fxCanvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  }

  function flashFx() {
    if (!fxCanvas || !fxCtx) return;
    const w = fxCanvas.width, h = fxCanvas.height;
    fxCtx.clearRect(0, 0, w, h);
    fxCtx.globalAlpha = 0.18;
    fxCtx.fillStyle = "white";
    fxCtx.fillRect(0, 0, w, h);
    fxCtx.globalAlpha = 1;

    // clear quickly
    setTimeout(() => {
      if (!fxCtx) return;
      fxCtx.clearRect(0, 0, w, h);
    }, 120);
  }

  // Called by Blazor ONLY on YES (στο Razor σου ήδη το κάνεις)
  window.startCelebration = function () {
    // ensure canvas exists (but keep it light)
    if (!fxCanvas) setupFxCanvas();
    flashFx();

    // ensure meme state applied (hide bottom panel)
    syncMemeState();
  };

  // Blazor calls this on first render
  window.valentineSetup = function () {
    bindBgOnce();
    setupFxCanvas();
    observeMeme();

    // Ensure NO is default: do NOT bind any dodge handlers.
    // (Το @onclick="OnNo" θα δείχνει μόνο το μήνυμα, όπως θες.)
  };

  // Safety fallback
  document.addEventListener("DOMContentLoaded", () => {
    if (window.valentineSetup) window.valentineSetup();
  });
})();
