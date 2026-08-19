(() => {
  'use strict';
  const errorBox = document.getElementById('error');
  const retryButton = document.getElementById('retry');
  const config = globalThis.HISTOIRE_POC_CONFIG || {};
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const challenge = fragment.get('challenge') || '';
  history.replaceState(null, '', location.pathname + location.search);
  let scanner = null;
  let completed = false;

  function validCallback(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'script.google.com' &&
        /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.hash;
    } catch (_) { return false; }
  }

  async function stopScanner() {
    if (!scanner) return;
    try { await scanner.stop(); } catch (_) {}
    try { await scanner.clear(); } catch (_) {}
  }

  async function startScanner() {
    errorBox.textContent = '';
    retryButton.hidden = true;
    if (!challenge || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(challenge) || !validCallback(config.callbackUrl)) {
      errorBox.textContent = '読取開始情報が不正です。Histoire Time cardから開き直してください。';
      return;
    }
    if (!globalThis.isSecureContext || typeof globalThis.Html5Qrcode !== 'function') {
      errorBox.textContent = '安全なHTTPSカメラ環境を初期化できませんでした。';
      return;
    }

    scanner = new Html5Qrcode('reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
      verbose: false
    });
    try {
      await scanner.start(
        { facingMode: { ideal: 'environment' } },
        {
          fps: 10,
          qrbox: (width, height) => {
            const edge = Math.floor(Math.min(width, height) * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: 1
        },
        async decodedText => {
          if (completed) return;
          completed = true;
          await stopScanner();
          const target = new URL(config.callbackUrl);
          target.searchParams.set('view', 'callback');
          target.searchParams.set('challenge', challenge);
          target.searchParams.set('qr', decodedText);
          location.replace(target.toString());
        },
        () => {}
      );
    } catch (err) {
      errorBox.textContent = 'カメラを起動できませんでした。Safari／Chromeのカメラ許可を確認してください。 ' + String(err);
      retryButton.hidden = false;
    }
  }

  retryButton.addEventListener('click', async () => {
    completed = false;
    await stopScanner();
    startScanner();
  });
  window.addEventListener('pagehide', stopScanner, { once: true });
  startScanner();
})();
