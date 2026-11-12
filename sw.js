'use strict';
const CACHE='pythermal-shell-v5';
const ASSETS=['./','./index.html','./style.css?v=50','./app.js?v=50','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{await Promise.allSettled(ASSETS.map(url=>cache.add(url)));}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('pythermal-shell-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
event.respondWith((async()=>{try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone()).catch(()=>{});}return response;}catch(e){const cached=await caches.match(req);if(cached)return cached;if(req.mode==='navigate'){const shell=await caches.match('./index.html');if(shell)return shell;}throw e;}})());});
