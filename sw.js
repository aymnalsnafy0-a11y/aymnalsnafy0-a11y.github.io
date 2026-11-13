var CACHE = 'hsk-v81';
var PAGES = ['/', '/en/'];
var DOCUMENTS = PAGES.flatMap(function(page){
  return [page, page + 'privacy.html'];
});

function pathFor(url){
  return new URL(url, self.location.origin).pathname.replace(/\/index\.html$/, '/');
}

function loadPage(cache, path){
  return fetch(path, {cache:'reload'}).then(function(response){
    if(!response.ok) throw new Error('Unavailable page ' + path);
    return Promise.all([cache.put(path, response.clone()), response.text()]);
  }).then(function(results){
    if(!PAGES.includes(path)) return;
    var assets = Array.from(results[1].matchAll(
      /<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+\.(?:js|css|webmanifest|png)(?:\?[^"]*)?)"/g
    ), function(match){ return new URL(match[1], self.location.origin + '/'); });
    return cache.addAll(Array.from(new Set(assets.filter(function(url){
      return url.origin === self.location.origin;
    }).map(function(url){ return url.href; }))));
  });
}

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(cache){
    return Promise.all(DOCUMENTS.map(function(path){ return loadPage(cache, path); }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){
      return key.indexOf('hsk-v') === 0 && key !== CACHE;
    }).map(function(key){ return caches.delete(key); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  var url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== self.location.origin) return;
  var path = pathFor(url);
  if(/^\/(masari|aymn-englhs|api)(\/|$)/.test(path)) return;

  if(req.mode === 'navigate'){
    if(!DOCUMENTS.includes(path)) return;
    e.respondWith(caches.open(CACHE).then(async function(cache){
      try{
        var response = await fetch(req, {cache:'no-store'});
        if(response.ok) await cache.put(path, response.clone());
        return response;
      }catch(error){
        return await cache.match(path) || Response.error();
      }
    }));
    return;
  }

  e.respondWith(caches.open(CACHE).then(async function(cache){
    var hit = await cache.match(req);
    if(hit) return hit;
    var response = await fetch(req);
    if(response.ok && response.status === 200 && !req.headers.has('range')){
      await cache.put(req, response.clone());
    }
    return response;
  }));
});
