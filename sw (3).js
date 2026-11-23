/* Projeto Gol Testes · funciona sem internet: guarda o app no tablet */
var VERSAO = 'golt-1.1.2';
var ARQS = ['./', 'index.html', 'app.css', 'app.js', 'motor.js', 'qrcode.js', 'manifest.webmanifest', 'img/gol_dark.png', 'img/gol_light.png', 'img/icone-192.png', 'img/icone-512.png',
  'fonts/poppins-regular.woff2', 'fonts/poppins-bold.woff2', 'fonts/codigo-cracha.woff'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQS); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('golt-') === 0 && k !== VERSAO; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // chamadas ao banco nunca passam pelo cache
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    var rede = fetch(e.request).then(function (resp) { if (resp && resp.ok) { var cp = resp.clone(); caches.open(VERSAO).then(function (c) { c.put(e.request, cp); }); } return resp; }).catch(function () { return r; });
    return r || rede;
  }));
});
