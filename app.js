(() => {
  'use strict';
  const errorBox = document.getElementById('error');
  const launchBox = document.getElementById('launch');
  const readerBox = document.getElementById('reader');
  const startButton = document.getElementById('start');
  const retryButton = document.getElementById('retry');
  const config = globalThis.HISTOIRE_POC_CONFIG || {};
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const challenge = fragment.get('challenge') || '';
  history.replaceState(null, '', location.pathname + location.search);
  let scanner = null;
  let completed = false;
  let starting = false;

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

  function cameraErrorKind(err) {
    const name = String((err && err.name) || '');
    const message = String((err && err.message) || err || '').toLowerCase();
    if (/notallowed|permissiondenied|securityerror/i.test(name) || /permission|not allowed|denied|許可/.test(message)) return 'PERMISSION';
    if (/notfound|devicesnotfound/i.test(name) || /no camera|camera not found|見つかりません/.test(message)) return 'NOT_FOUND';
    if (/overconstrained|constraintnotsatisfied|typeerror/i.test(name) || /facingmode|constraint|exact as key|設定値/.test(message)) return 'CONFIG';
    return 'OTHER';
  }

  function cameraErrorMessage(err) {
    const kind = cameraErrorKind(err);
    if (kind === 'PERMISSION') return 'カメラの使用が許可されていません。Safariではアドレスバーの「ぁあ」→「Webサイトの設定」→「カメラ」を「許可」にしてください。Android Chromeではサイトのカメラ権限を許可してください。';
    if (kind === 'NOT_FOUND') return '利用できるカメラが見つかりません。端末のカメラが他のアプリで使用中でないか確認してください。';
    if (kind === 'CONFIG') return 'カメラの設定値を端末が受け付けませんでした。カメラ指定を解除して再試行してください。';
    return 'カメラを起動できませんでした。ブラウザを再読み込みして、もう一度お試しください。';
  }

  function scanConfig() {
    return {
      fps: 10,
      qrbox: (width, height) => {
        const edge = Math.floor(Math.min(width, height) * 0.72);
        return { width: edge, height: edge };
      },
      aspectRatio: 1
    };
  }

  function onDecoded(decodedText) {
    if (completed) return;
    completed = true;
    stopScanner().then(() => {
      const target = new URL(config.callbackUrl);
      target.searchParams.set('view', 'callback');
      target.searchParams.set('challenge', challenge);
      target.searchParams.set('qr', decodedText);
      location.replace(target.toString());
    });
  }

  function newScanner() {
    return new Html5Qrcode('reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
      verbose: false
    });
  }

  async function startWith(camera) {
    scanner = newScanner();
    await scanner.start(camera, scanConfig(), onDecoded, () => {});
  }

  async function startWithoutFacingMode() {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || !cameras.length) {
      const err = new Error('No camera found');
      err.name = 'NotFoundError';
      throw err;
    }
    const preferred = cameras.find(camera => /back|rear|environment|背面/i.test(String(camera.label || '')));
    await startWith((preferred || cameras[cameras.length - 1]).id);
  }

  async function startScanner() {
    if (starting) return;
    starting = true;
    errorBox.textContent = '';
    launchBox.hidden = true;
    readerBox.hidden = false;
    startButton.disabled = true;
    retryButton.hidden = true;
    if (!challenge || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(challenge) || !validCallback(config.callbackUrl)) {
      errorBox.textContent = '読取開始情報が不正です。Histoire Time cardから開き直してください。';
      readerBox.hidden = true;
      starting = false;
      return;
    }
    if (!globalThis.isSecureContext || typeof globalThis.Html5Qrcode !== 'function') {
      errorBox.textContent = '安全なHTTPSカメラ環境を初期化できませんでした。';
      readerBox.hidden = true;
      starting = false;
      return;
    }

    try {
      try {
        await startWith({ facingMode: 'environment' });
      } catch (primaryError) {
        if (cameraErrorKind(primaryError) === 'PERMISSION') throw primaryError;
        await stopScanner();
        await startWithoutFacingMode();
      }
    } catch (finalError) {
      await stopScanner();
      readerBox.hidden = true;
      errorBox.textContent = cameraErrorMessage(finalError);
      retryButton.hidden = false;
    } finally {
      starting = false;
      startButton.disabled = false;
    }
  }

  startButton.addEventListener('click', startScanner);
  retryButton.addEventListener('click', async () => {
    completed = false;
    await stopScanner();
    startScanner();
  });
  window.addEventListener('pagehide', stopScanner, { once: true });
})();
