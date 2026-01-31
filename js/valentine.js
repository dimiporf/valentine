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
      const tx = vx * 14;
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
  // GIF overlay (outside Blazor)
  // ---------------------------
  function showGifOverlay() {
    const overlay = document.getElementById('gifOverlay');
    if (!overlay) return;

    overlay.classList.add('show');

    // hide bottom card while overlay is open (no :has needed)
    document.body.classList.add('gif-open');
  }

  function hideGifOverlay() {
    const overlay = document.getElementById('gifOverlay');
    if (!overlay) return;

    overlay.classList.remove('show');
    document.body.classList.remove('gif-open');
  }

  function bindOverlayCloseOnce() {
    const overlay = document.getElementById('gifOverlay');
    if (!overlay) return;

    if (overlay.dataset.bound === '1') return;
    overlay.dataset.bound = '1';

    // tap anywhere to close
    overlay.addEventListener('click', hideGifOverlay);
    overlay.addEventListener('touchstart', hideGifOverlay, { passive: true });
  }

  // ---------------------------
  // Public functions called by Blazor
  // ---------------------------
  window.valentineSetup = function () {
    bindBgOnce();
    bindOverlayCloseOnce();
    // IMPORTANT: no NO-button hijacking -> default behavior
  };

  // Called only from OnYes() in Razor
  window.startCelebration = function () {
    showGifOverlay();
  };

})();