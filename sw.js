/* =====================================================================
   Classificação Final · sw.js (service worker)
   Guarda os arquivos do sistema no aparelho para ele abrir sem internet.
   Os dados (Supabase) NUNCA são guardados aqui: só os arquivos do app.
   A cada versão nova, o nome do cache muda e o antigo é apagado.
   ===================================================================== */
var VERSAO = 'cf-1.3.1';
var ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'vendor/supabase.js',
  'js/tema.js',
  'js/config.js',
  'js/ui.js',
  'js/api.js',
  'js/auth.js',
  'js/foto.js',
  'js/views/telas.js',
  'js/views/minha-conta.js',
  'js/app.js',
  'assets/fonts/poppins-regular.woff2',
  'assets/fonts/poppins-medium.woff2',
  'assets/fonts/poppins-bold.woff2',
  'assets/img/kolping_dark.png',
  'assets/img/gol_dark.png',
  'assets/img/kolping_light.png',
  'assets/img/gol_light.png',
  'assets/img/favicon.png',
  'assets/img/icon-180.png',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png',
  'assets/img/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'ATUALIZAR') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e outros endereços: sempre pela internet

  // Página principal: tenta a internet primeiro (pega a versão mais nova); sem internet, usa a guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () { return caches.match('index.html'); })
    );
    return;
  }
  // Demais arquivos do sistema: usa o guardado; se não tiver, busca na internet
  e.respondWith(
    caches.match(req).then(function (r) { return r || fetch(req); })
  );
});
