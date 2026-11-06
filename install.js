/* VNSG 1260 install helper. Adds an install prompt, offline registration, update notice,
   and a request for persistent storage. Does not read, transmit, or modify charting entries. */
(function () {
  'use strict';
  var DISMISS_KEY = 'vnsg1260-install-dismissed';
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  var isMacSafari = !isIOS && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  var isFirefoxDesktop = /Firefox/.test(ua) && !isAndroid && !isIOS;
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var deferred = null;

  function store(get, val) {
    try { if (get) return localStorage.getItem(DISMISS_KEY); localStorage.setItem(DISMISS_KEY, val); } catch (e) { return null; }
  }
  function recentlyDismissed() {
    var t = parseInt(store(true) || '0', 10);
    return t && (Date.now() - t) < 3 * 24 * 3600 * 1000;
  }

  var css = '' +
    '.ip-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;max-width:560px;margin:0 auto;' +
    'background:var(--surface,#fff);color:var(--ink,#17202B);border:2px solid var(--blue,#004C97);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.22);' +
    'padding:12px 14px;font:14px/1.45 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif}' +
    '.ip-bar b{color:var(--blue,#004C97)}.ip-bar p{margin:4px 0}.ip-bar ol{margin:6px 0 4px 18px;padding:0}.ip-bar li{margin:2px 0}' +
    '.ip-row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap}' +
    '.ip-btn{border:1px solid var(--blue,#004C97);background:var(--blue,#004C97);color:#fff;border-radius:6px;padding:7px 14px;font:inherit;cursor:pointer}' +
    '.ip-btn.ghost{background:transparent;color:var(--blue,#004C97)}' +
    '.ip-note{font-size:12.5px;color:var(--muted,#56606C)}' +
    '@media print{.ip-bar{display:none!important}}';

  function bar(html, buttons) {
    var old = document.getElementById('ip-bar'); if (old) old.remove();
    if (!document.getElementById('ip-css')) { var s = document.createElement('style'); s.id = 'ip-css'; s.textContent = css; document.head.appendChild(s); }
    var d = document.createElement('div'); d.id = 'ip-bar'; d.className = 'ip-bar'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Install this app');
    d.innerHTML = html;
    var row = document.createElement('div'); row.className = 'ip-row';
    buttons.forEach(function (b) {
      var x = document.createElement('button'); x.type = 'button'; x.className = 'ip-btn' + (b.ghost ? ' ghost' : ''); x.textContent = b.label;
      x.onclick = function () { b.run(); }; row.appendChild(x);
    });
    d.appendChild(row); document.body.appendChild(d); return d;
  }
  function close() { var b = document.getElementById('ip-bar'); if (b) b.remove(); }
  function later() { store(false, String(Date.now())); close(); }

  function showGuide() {
    if (standalone || recentlyDismissed()) return;
    if (isIOS) {
      var steps = isIOSSafari
        ? '<ol><li>Tap the <b>Share</b> button (square with arrow) in Safari.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Keep <b>Open as Web App</b> on, then tap <b>Add</b>.</li></ol>'
        : '<p>Open this same link in <b>Safari</b>, then tap Share &rarr; <b>Add to Home Screen</b> &rarr; <b>Add</b>.</p>';
      bar('<b>Install VNSG 1260 on your iPhone</b>' + steps +
        '<p class="ip-note">After installing, chart only from the Home Screen icon. On iPhone the installed app keeps its own saved data, separate from Safari.</p>',
        [{ label: 'Not now', ghost: true, run: later }]);
    } else if (isMacSafari) {
      bar('<b>Install on your Mac</b><p>In Safari choose <b>File &rarr; Add to Dock</b>.</p>', [{ label: 'Not now', ghost: true, run: later }]);
    } else if (isFirefoxDesktop) {
      bar('<b>Install as an app</b><p>Firefox does not install web apps on all systems. Open this link in <b>Microsoft Edge</b> or <b>Google Chrome</b> to install it with its own icon and window.</p>',
        [{ label: 'Not now', ghost: true, run: later }]);
    } else if (isAndroid) {
      bar('<b>Install VNSG 1260 on your phone</b><p>Tap the browser menu (&#8942;) and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>',
        [{ label: 'Not now', ghost: true, run: later }]);
    }
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (standalone || recentlyDismissed()) return;
    bar('<b>Install VNSG 1260 Clinical Charting Tool</b><p>Get its own icon and window, and open it without internet during clinical.</p>', [
      { label: 'Not now', ghost: true, run: later },
      { label: 'Install app', run: function () {
          if (!deferred) return; deferred.prompt();
          deferred.userChoice.then(function () { deferred = null; close(); });
        } }
    ]);
  });
  window.addEventListener('appinstalled', function () { close(); deferred = null; });

  window.addEventListener('load', function () {
    // Ask the browser not to evict this site's storage (charting data) under storage pressure.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(function (p) { if (!p) navigator.storage.persist(); }); } catch (e) {}

    if ('serviceWorker' in navigator) {
      var hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
      }).catch(function () {});
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController) return;
        bar('<b>An updated version is ready.</b><p class="ip-note">Your saved entries are kept. Reload when you reach a stopping point.</p>', [
          { label: 'Later', ghost: true, run: close },
          { label: 'Reload', run: function () { location.reload(); } }
        ]);
      });
    }
    // Browsers without an install event get written steps after a short delay.
    setTimeout(function () { if (!deferred && !document.getElementById('ip-bar')) showGuide(); }, 2500);
  });
})();
