/*
 * 离线缓存（stale-while-revalidate）
 * 修改页面后请把 VERSION 加一，旧缓存会在下一次激活时自动清除。
 */
var VERSION = 'altitude-v3';
var ROOT = self.registration.scope;
var ROOT_PATH = new URL(ROOT).pathname;
var INDEX_PATH = ROOT_PATH + 'index.html';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.add(ROOT);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== VERSION;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') { return; }

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) { return; }

  // 只有应用入口导航才映射到根键，避免其它页面覆盖 app shell
  var isShell = request.mode === 'navigate' &&
    (url.pathname === ROOT_PATH || url.pathname === INDEX_PATH);
  var key = isShell ? ROOT : request.url;

  event.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(key).then(function (cached) {
        var network = fetch(request).then(function (response) {
          if (response && response.ok) {
            cache.put(key, response.clone());
          }
          return response;
        }).catch(function () {
          return cached;
        });
        return cached || network;
      });
    })
  );
});
