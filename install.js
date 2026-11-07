/* VNSG 1260 install helper. Adds an install prompt, a persistent "Install app" link, in-app browser
   detection, offline registration, an update notice, and a request for persistent storage.
   Does not read, transmit, or modify charting entries. */
(function () {
  'use strict';
  var DISMISS_KEY = 'vnsg1260-install-dismissed';
  var ua = navigator.userAgent || '';
  var APP_URL = new URL('./', location.href).href;
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  // Apps that open links inside their own built-in browser, where installing is not possible.
  var inAppToken = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Snapchat|Line\/|Twitter|MicroMessenger|GSA\/|Teams\/|Outlook|YahooMobile|Blackboard|BbStudent|Pinterest|TikTok|musical_ly|Bytedance/i.test(ua);
  var isIOSInApp = isIOS && (inAppToken || !/Safari\//.test(ua));
  var isAndroidInApp = isAndroid && (inAppToken || /; wv\)/.test(ua));
  var isInApp = isIOSInApp || isAndroidInApp;
  var isIOSSafari = isIOS && !isIOSInApp && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
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
    'padding:12px 14px;font:14px/1.45 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;max-height:80vh;overflow:auto}' +
    '.ip-bar b{color:var(--blue,#004C97)}.ip-bar p{margin:4px 0}.ip-bar ol{margin:6px 0 4px 18px;padding:0}.ip-bar li{margin:2px 0}' +
    '.ip-row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap}' +
    '.ip-btn{border:1px solid var(--blue,#004C97);background:var(--blue,#004C97);color:#fff;border-radius:6px;padding:7px 14px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}' +
    '.ip-btn.ghost{background:transparent;color:var(--blue,#004C97)}' +
    '.ip-note{font-size:12.5px;color:var(--muted,#56606C)}' +
    '.ip-url{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:7px 8px;border:1px solid var(--line,#C9D2DC);border-radius:6px;background:var(--page,#F2F5F9);color:var(--ink,#17202B);font:13px/1.3 ui-monospace,Menlo,Consolas,monospace}' +
    '.ip-link{align-self:flex-start;margin-top:3px;padding:2px 9px;border:1px solid var(--blue,#004C97);border-radius:999px;background:transparent;color:var(--blue,#004C97);font:600 12.5px/1.5 inherit;cursor:pointer}' +
    '.ip-link:hover,.ip-link:focus-visible{background:var(--blue-wash,#E8F0F8)}' +
    '@media print{.ip-bar,.ip-link{display:none!important}}';

  function ensureCss() {
    if (!document.getElementById('ip-css')) { var s = document.createElement('style'); s.id = 'ip-css'; s.textContent = css; document.head.appendChild(s); }
  }
  function bar(html, buttons) {
    var old = document.getElementById('ip-bar'); if (old) old.remove();
    ensureCss();
    var d = document.createElement('div'); d.id = 'ip-bar'; d.className = 'ip-bar'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Install this app');
    d.innerHTML = html;
    var row = document.createElement('div'); row.className = 'ip-row';
    buttons.forEach(function (b) {
      var x;
      if (b.href) { x = document.createElement('a'); x.href = b.href; }
      else { x = document.createElement('button'); x.type = 'button'; x.onclick = function () { b.run(x); }; }
      x.className = 'ip-btn' + (b.ghost ? ' ghost' : ''); x.textContent = b.label; row.appendChild(x);
    });
    d.appendChild(row); document.body.appendChild(d); return d;
  }
  function close() { var b = document.getElementById('ip-bar'); if (b) b.remove(); }
  function later() { store(false, String(Date.now())); close(); }

  function copyLink(btn) {
    function done(ok) { btn.textContent = ok ? 'Link copied' : 'Press and hold the link above to copy'; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(APP_URL).then(function () { done(true); }, function () { fallback(); });
        return;
      }
    } catch (e) {}
    fallback();
    function fallback() {
      var f = document.getElementById('ip-url');
      try { f.focus(); f.select(); f.setSelectionRange(0, APP_URL.length); done(document.execCommand('copy')); } catch (e) { done(false); }
    }
  }
  var urlField = function () { return '<input id="ip-url" class="ip-url" readonly value="' + APP_URL + '" aria-label="App link" onfocus="this.select()">'; };

  // Shown when the link was opened inside Blackboard, Gmail, Outlook, Teams, Facebook, Instagram, and similar apps.
  function showInAppWarning() {
    if (isIOSInApp) {
      bar('<b>Open this link in Safari to install</b>' +
        '<p>You opened this page inside another app, so it cannot be installed here and your charting would not be saved reliably.</p>' +
        '<ol><li>Tap <b>Copy link</b>.</li><li>Open <b>Safari</b>, paste the link in the address bar, and go.</li>' +
        '<li>Tap <b>Share</b> &rarr; <b>Add to Home Screen</b> &rarr; <b>Add</b>.</li></ol>' + urlField() +
        '<p class="ip-note">Some apps also offer an <b>Open in Safari</b> or <b>Open in browser</b> option in their &#8943; or share menu.</p>',
        [{ label: 'Close', ghost: true, run: close }, { label: 'Copy link', run: copyLink }]);
    } else {
      var intent = 'intent://' + APP_URL.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(APP_URL) + ';end';
      bar('<b>Open this link in Chrome to install</b>' +
        '<p>You opened this page inside another app, so it cannot be installed here and your charting would not be saved reliably.</p>' +
        '<p>Tap <b>Open in Chrome</b>. If nothing happens, tap the app&rsquo;s menu (&#8942;) and choose <b>Open in Chrome</b> or <b>Open in browser</b>, or copy the link and paste it into Chrome.</p>' + urlField(),
        [{ label: 'Close', ghost: true, run: close }, { label: 'Copy link', ghost: true, run: copyLink }, { label: 'Open in Chrome', href: intent }]);
    }
  }

  function showGuide(force) {
    if (standalone) return;
    if (!force && recentlyDismissed()) return;
    if (isInApp) { showInAppWarning(); return; }
    var dismiss = force ? { label: 'Close', ghost: true, run: close } : { label: 'Not now', ghost: true, run: later };
    if (isIOS) {
      var steps = isIOSSafari
        ? '<ol><li>Tap the <b>Share</b> button (square with arrow) in Safari. If you don&rsquo;t see it, tap the &#8943; button first.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Keep <b>Open as Web App</b> on, then tap <b>Add</b>.</li></ol>'
        : '<p>Open this same link in <b>Safari</b>, then tap Share &rarr; <b>Add to Home Screen</b> &rarr; <b>Add</b>.</p>' + urlField();
      bar('<b>Install VNSG 1260 on your iPhone</b>' + steps +
        '<p class="ip-note">iPhones never show an install button for web apps. After installing, chart only from the Home Screen icon; the installed app keeps its own saved data, separate from Safari.</p>',
        isIOSSafari ? [dismiss] : [dismiss, { label: 'Copy link', run: copyLink }]);
    } else if (isMacSafari) {
      bar('<b>Install on your Mac</b><p>In Safari choose <b>File &rarr; Add to Dock</b>.</p>', [dismiss]);
    } else if (isFirefoxDesktop) {
      bar('<b>Install as an app</b><p>Firefox does not install web apps on all systems. Open this link in <b>Microsoft Edge</b> or <b>Google Chrome</b> to install it with its own icon and window.</p>', [dismiss]);
    } else if (isAndroid) {
      bar('<b>Install VNSG 1260 on your phone</b>' +
        '<ol><li>Tap the browser menu (&#8942;) at the top right.</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>, then <b>Install</b>.</li></ol>' +
        '<p class="ip-note">Don&rsquo;t see either option? Check your home screen and app drawer for the VNSG 1260 icon; it may already be installed. On Samsung Internet, tap the menu, then <b>Add page to</b> &rarr; <b>Home screen</b>.</p>',
        [dismiss]);
    } else {
      bar('<b>Install VNSG 1260 on this computer</b>' +
        '<p>In Microsoft Edge or Google Chrome, click the install icon at the right end of the address bar, or open the browser menu and choose <b>Install VNSG 1260 Clinical Charting Tool</b> (Chrome: Cast, save, and share &rarr; Install).</p>' +
        '<p class="ip-note">If you don&rsquo;t see it, the app may already be installed. Check your Start menu or Applications folder.</p>',
        [dismiss]);
    }
  }

  // Persistent "Install app" link in the header, visible whenever the page is not running as the installed app.
  function addHeaderLink() {
    if (standalone || document.getElementById('ip-link')) return;
    var brand = document.querySelector('header.bar .brand'); if (!brand) return;
    ensureCss();
    var b = document.createElement('button'); b.type = 'button'; b.id = 'ip-link'; b.className = 'ip-link';
    b.textContent = isInApp ? (isIOS ? 'Open in Safari to install' : 'Open in Chrome to install') : 'Install this app';
    b.onclick = function () {
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; close(); });
      } else { showGuide(true); }
    };
    brand.appendChild(b);
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
  window.addEventListener('appinstalled', function () {
    close(); deferred = null;
    var l = document.getElementById('ip-link'); if (l) l.remove();
  });

  function onReady(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  onReady(function () {
    addHeaderLink();
    // In-app browsers always get the warning on arrival, regardless of earlier dismissals.
    if (isInApp && !standalone) showInAppWarning();
  });

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
    if (!isInApp) setTimeout(function () { if (!deferred && !document.getElementById('ip-bar')) showGuide(false); }, 2500);
  });
})();
