/* SleepAura – PWA Install Button Controller */
(function () {
  'use strict';
  const btn = document.getElementById('installBtn');
  if (!btn) return;

  // Hide by default; show only when eligible
  btn.style.display = 'none';
  btn.disabled = true;

  // If already installed, keep hidden
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  let deferredPrompt = null;

  // Show the button when installable (Chrome/Edge/Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.style.display = 'inline-flex';
    btn.disabled = false;
  });

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      btn.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome !== 'accepted') btn.disabled = false;
      return;
    }
    // iOS fallback
    alert('On iPhone/iPad: tap the Share icon and choose \"Add to Home Screen\".');
  });

  // Hide on install
  window.addEventListener('appinstalled', () => {
    btn.style.display = 'none';
  });

  // Register SW
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
  }
})();