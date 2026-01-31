(function () {
  // called from Razor: JS.InvokeVoidAsync("valentineSetup");
  window.valentineSetup = function () {
    // nothing fancy, just ensure the meme is hidden on first load
    const meme = document.querySelector(".meme");
    if (meme) meme.classList.remove("show");
  };

  // called from Razor on YES: JS.InvokeVoidAsync("startCelebration");
  window.startCelebration = function () {
    // show the existing meme div that Razor already renders
    const meme = document.querySelector(".meme");
    if (meme) meme.classList.add("show");
  };
})();
