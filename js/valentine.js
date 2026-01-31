(function () {
  // ---------------------------
  // Helpers
  // ---------------------------
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }

  // ---------------------------
  // Elements
  // ---------------------------
  let bgEl = null;

  let yesBtn = null;
  let noBtn = null;

  let toastEl = null;
  let memeWrap = null;

  // Background parallax target (-1..1)
  let mx = 0, my = 0;
  let vx = 0, vy = 0;

  // NO move debounce
  let lastMoveTs = 0;

  // ---------------------------
  // Init DOM
  // ---------------------------
  function ensureOverlays() {
    // Toast
    toastEl = document.querySelector(".toast");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.textContent = "Nice try 😅";
      document.body.appendChild(toastEl);
    }

    // Meme overlay
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
    if (!toastEl) return;
    toastEl.textContent = text || "Nice try 😅";
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 900);
  }

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
      const tx = vx * 14;
      const ty = vy * 14;
      bgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.06)`;
