var CACHE = 'hsk-v2';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(function(hit){
    var net = fetch(e.request).then(function(r){
      if(r && r.status === 200) caches.open(CACHE).then(function(c){ c.put(e.request, r.clone()); });
      return r;
    }).catch(function(){
      return hit || caches.match('./index.html');
    });
    return hit || net;
  }));
});