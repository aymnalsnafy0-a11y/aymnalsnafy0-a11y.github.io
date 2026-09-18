var CACHE = 'hsk-v7';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
    .then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function isDoc(req){
  return req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0;
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  // اترك الطلبات خارج نطاقنا للشبكة مباشرة (بيانات رسم الحروف/الذكاء لاحقًا)
  try{ if(new URL(req.url).origin !== self.location.origin) return; }catch(e){ return; }

  // صفحة التطبيق: الشبكة أولًا (أحدث نسخة دائمًا)، والمحفوظة احتياطًا عند انقطاع الإنترنت
  if(isDoc(req)){
    e.respondWith(
      fetch(req, {cache:'no-store'}).then(function(r){
        var copy = r.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        return r;
      }).catch(function(){
        return caches.match('./index.html').then(function(hit){ return hit || caches.match('./'); });
      })
    );
    return;
  }

  // الأيقونات والمانيفست: المحفوظة أولًا (لا تتغيّر)
  e.respondWith(caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(r){
      if(r && r.status === 200){
        var c2 = r.clone();
        caches.open(CACHE).then(function(c){ c.put(req, c2); });
      }
      return r;
    });
  }));
});
