(function () {
  // Helpers
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

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

  // -------------------------
  // Meme overlay handling
  // -------------------------
  function updateMemeOpenFlag() {
    const memeIsShown = !!document.querySelector('.meme.show');
    if (memeIsShown) document.body.classList.add('meme-open');
    else document.body.classList.remove('meme-open');
  }

  function hookYesButton() {
    // Your Razor YES button has class btn-yes
    const yesBtn = document.querySelector('.btn-yes');
    if (!yesBtn) return;

    // When YES is clicked, Blazor will re-render and add "show" class to .meme.
    // We just wait a moment and then apply body flag so bottom card hides.
    yesBtn.addEventListener('click', () => {
      setTimeout(updateMemeOpenFlag, 60);
      setTimeout(updateMemeOpenFlag, 200);
      setTimeout(updateMemeOpenFlag, 500);
    }, { passive: true });
  }

  // Public init called from Razor OnAfterRenderAsync
  window.valentineSetup = function () {
    // bg listeners
    window.addEventListener('mousemove', setBgTargetFromEvent, { passive: true });
    window.addEventListener('touchmove', setBgTargetFromEvent, { passive: true });
    window.addEventListener('deviceorientation', function (ev) {
      if (typeof ev.gamma === 'number' && typeof ev.beta === 'number') {
        mx = clamp(ev.gamma / 20, -1, 1);
        my = clamp(ev.beta / 35, -1, 1);
      }
    }, true);

    requestAnimationFrame(animateBg);

    // hook YES to show meme after Blazor updates DOM
    hookYesButton();

    // in case meme is already shown (after refresh)
    updateMemeOpenFlag();
  };

  // Keep this, because your Razor calls startCelebration()
  // If you don't want fireworks anymore, we make it a no-op.
  window.startCelebration = function () { /* no-op */ };

})();
