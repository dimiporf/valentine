(function () {
  // ---------------------------
  // Background gentle movement
  // ---------------------------
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  let bgEl = null;
  let mx = 0, my = 0; // -1..1
  let vx = 0, vy = 0;
  let bgBound = false;

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
      vx += (mx - vx) * 0.04;
      vy += (my - vy) * 0.04;
      const tx = vx * 14; // px
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
    }
    requestAnimationFrame(animateBg);
  }

  function bindBgOnce() {
    if (bgBound) return;
    bgBound = true;

    window.addEventListener('mousemove', setBgTargetFromEvent, { passive: true });
    window.addEventListener('touchmove', setBgTargetFromEvent, { passive: true });

    window.addEventListener('deviceorientation', function (ev) {
      if (typeof ev.gamma === 'number' && typeof ev.beta === 'number') {
        mx = clamp(ev.gamma / 20, -1, 1);
        my = clamp(ev.beta / 35, -1, 1);
      }
    }, true);

    requestAnimationFrame(animateBg);
  }

  // ---------------------------
  // Meme visibility -> body class
  // (so we can hide the bottom panel reliably without :has)
  // ---------------------------
  let observerSet = false;

  function syncMemeState() {
    const meme = document.querySelector('.meme');
    const isOpen = !!(meme && meme.classList.contains('show'));
    document.body.classList.toggle('meme-open', isOpen);
  }

  function watchMemeOnce() {
    if (observerSet) return;
    observerSet = true;

    // Try to find meme now; if not, retry (Blazor timing)
    let tries = 0;
    const timer = setInterval(() => {
      tries++;

      const meme = document.querySelector('.meme');
      if (meme) {
        clearInterval(timer);

        // Initial sync
        syncMemeState();

        // Observe class changes (when Razor toggles show)
        const mo = new MutationObserver(syncMemeState);
        mo.observe(meme, { attributes: true, attributeFilter: ['class'] });

        // If user taps the overlay, close it (optional but nice)
        meme.addEventListener('click', () => {
          meme.classList.remove('show');
          syncMemeState();
        });
      }

      if (tries > 40) clearInterval(timer); // stop after ~4s
    }, 100);
  }

  // ---------------------------
  // Public functions called by Blazor
  // ---------------------------

  // Called from OnAfterRenderAsync(firstRender)
  window.valentineSetup = function () {
    bindBgOnce();
    watchMemeOnce();
    // IMPORTANT: no NO-button hijacking here (default behavior)
  };

  // Called from OnYes() in Razor
  // We keep it super light (no fireworks) to avoid any “κολλάει/πεθαίνει”
  window.startCelebration = function () {
    // no-op by design
    // The Razor already sets _showMeme=true which adds class "show" to .meme
    // Our observer will hide the bottom panel and keep GIF centered.
    syncMemeState();
  };
})();