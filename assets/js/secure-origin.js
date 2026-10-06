// Run before application modules: geolocation and installed PWAs require HTTPS.
(() => {
  const url = new URL(window.location.href);
  if (url.protocol === 'http:' && ['app.almadanilombok.com', 'madanilombok-f692d.web.app', 'madanilombok-f692d.firebaseapp.com'].includes(url.hostname)) {
    url.protocol = 'https:';
    window.location.replace(url.href);
  }
})();
