// Service Worker for PWA
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/js/renderer.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // 对 JS 文件使用 network-first 策略
  if (requestUrl.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 获取成功后，将响应的副本存入缓存
          const responseClone = response.clone();
          caches.open('v1').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // 网络请求失败时，尝试从缓存中获取
          return caches.match(event.request);
        })
    );
  } else {
    // 其他资源仍然使用 cache-first 策略
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
