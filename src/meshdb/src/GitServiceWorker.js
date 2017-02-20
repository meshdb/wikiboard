'use strict'
// Run in a ServiceWorker environment, e.g.
// import { GitServiceWorkerController } from './'
// let sw = GitServiceWorkerController.register()
// sw.postMessage(data)
// sw.addEventListener(function (e) {
//   let data = e.data
// })

console.log('Hello from GitServiceWorker.js')
import { GithubRemote } from './GithubRemote'
import { GitRepo } from './GitRepo'

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        '/skeleton',
      ]);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('wittr-') &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});