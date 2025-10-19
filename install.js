/* SleepAura – PWA Install Button Controller (Firefox-friendly) */
(function () {
  'use strict';
  const btn = document.getElementById('installBtn');
  if (!btn) return;

  // Env detection
  const ua = navigator.userAgent.toLowerCase();
  const isFirefox = ua.includes('firefox');
  const supportsBIP = 'onbeforeinstallprompt' in window; // Chrome/Edge/Android
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  // Start hidden
  btn.style.display = 'none';
  btn.disabled = true;

  // If already installed, keep hidden
  if (isStandalone) return;

  let deferredPrompt = null;

  // Show button conditions
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
    // Firefox + other unsupported browsers – show helper button
    btn.style.display = 'inline-flex';
    btn.disabled = false;
    console.log('[PWA] beforeinstallprompt not supported; showing helper button');
  }

  btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Chrome/Edge/Android native prompt
      btn.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome !== 'accepted') btn.disabled = false;
      return;
    }

    // Firefox / unsupported browsers: show one-time helper toast per session
    showInstallHelper();
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

  // ---- Helper UI (non-blocking toast) ----
  function showInstallHelper() {
    // Avoid repeating within the same tab session
    if (sessionStorage.getItem('installHelperShown') === '1') return;
    sessionStorage.setItem('installHelperShown', '1');

    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const msg = isFirefox
      ? (isMobile
          ? 'Firefox on Android: open the ⋮ menu and tap "Add to Home screen".'
          : 'Firefox on Desktop: click the Install icon in the address bar (or Page Actions) and choose "Install".')
      : (isMobile
          ? 'Open the browser menu and choose "Add to Home screen".'
          : 'Use your browser’s install option (address bar or menu).');

    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%)',
      maxWidth: '520px',
      width: 'calc(100% - 32px)',
      padding: '12px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(250,204,21,.3)',
      background: 'linear-gradient(145deg, #1e293b, #334155)',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(0,0,0,.45)',
      font: '600 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      opacity: '0',
      transition: 'opacity .2s ease, transform .2s ease',
    });

    const text = document.createElement('div');
    text.textContent = msg;

    const close = document.createElement('button');
    close.textContent = 'OK';
    Object.assign(close.style, {
      marginLeft: 'auto',
      padding: '6px 10px',
      borderRadius: '999px',
      border: 'none',
      background: 'linear-gradient(145deg, #facc15, #eab308)',
      color: '#0f172a',
      cursor: 'pointer',
      fontWeight: '700',
    });
    close.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(6px)';
      setTimeout(() => toast.remove(), 180);
    });

    toast.append(text, close);
    document.body.appendChild(toast);

    // animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%)';
    });
  }
})();
