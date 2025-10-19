/* SleepAura – PWA Install Button Controller (with iOS/unsupported fallback) */
(function () {
  'use strict';
  const btn = document.getElementById('installBtn');
  if (!btn) return;

  // Capability & platform detection
  const supportsBIP = 'onbeforeinstallprompt' in window;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // Start hidden
  btn.style.display = 'none';
  btn.disabled = true;

  // If already installed, keep hidden
  if (isStandalone) return;

  let deferredPrompt = null;

  if (supportsBIP) {
    // Chrome/Edge/Android path
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      btn.style.display = 'inline-flex';
      btn.disabled = false;
      console.log('[PWA] beforeinstallprompt fired; button shown');
    });
  } else {
    // iOS & unsupported browsers – show helper button
    btn.style.display = 'inline-flex';
    btn.disabled = false;
    console.log('[PWA] beforeinstallprompt not supported; showing helper button');
  }

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      btn.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      console.log('[PWA] userChoice:', outcome);
      if (outcome !== 'accepted') btn.disabled = false;
      return;
    }
    // Fallback helper (iOS / unsupported)
    alert('On iPhone/iPad: tap the Share icon (square with arrow) → "Add to Home Screen".');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] app installed');
    btn.style.display = 'none';
  });

  // Register SW
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((r) => console.log('[PWA] SW registered', r.scope))
        .catch((err) => console.error('[PWA] SW registration failed', err));
    });
  }
})();