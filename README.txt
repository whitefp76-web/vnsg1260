VNSG 1260 Clinical Charting Tool — DEPLOY-READY PWA (v3)

Upload the CONTENTS of this folder (index.html at the top level) to any HTTPS static host
(GitHub Pages, Netlify, Cloudflare Pages, or an institutional web server). One URL serves
Windows laptops (Edge/Chrome), Android (Chrome/Samsung Internet), and iPhone (Safari).

What changed from v2
- app.html: unchanged (original). index.html: same app; only head metadata and one script tag changed.
- install.js: one-tap Install button on Android/Windows/ChromeOS; written steps on iPhone, Mac Safari,
  and Firefox; update notice when a new version is published; asks the browser to keep this
  site's storage persistent so saved charting is less likely to be evicted.
- sw.js: network-first for the app page (students get updates when online, cached copy offline
  or on weak hospital Wi-Fi), cache for icons and assets. Never reads charting data.
- manifest: separate standard and maskable icons (no cropped Android icon), screenshots for the
  richer install sheet on Android and Windows, categories, description.
- icons: redrawn at high resolution; favicon added.

Releasing an update: edit files, change CACHE_NAME in sw.js (e.g. -v4), re-upload to the SAME URL.
Never move the app to a different URL after students start charting; saved data is tied to the URL origin.
