// 274 Safety Inspection — service worker
// Cache name bumped so phones pull the latest app. Change the number
// whenever you upload a new index.html.
const CACHE = 'safety274-v7';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(u){
        return c.add(u).catch(function(){});
      }));
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  var url = req.url;

  // Never cache Firebase / Google traffic — sync must always hit the network.
  if (url.indexOf('googleapis.com') > -1 ||
      url.indexOf('firebaseio.com') > -1 ||
      url.indexOf('firestore') > -1 ||
      url.indexOf('gstatic.com') > -1 ||
      url.indexOf('firebaseinstallations') > -1) {
    return; // let the browser handle it directly
  }

  // HTML pages: network-first so the newest app is always served when online.
  if (req.mode === 'navigate' ||
      (req.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(
      fetch(req).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        return resp;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Other assets: cache-first with background refresh.
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return resp;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
