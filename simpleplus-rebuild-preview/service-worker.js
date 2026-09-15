// App shell cache is scoped by hosted path and version; data stays in IndexedDB.
const SCOPE_KEY=encodeURIComponent(new URL(self.registration.scope).pathname);
const PREFIX=`simpleplus-rebuild-shell:${SCOPE_KEY}:`;
const CACHE=PREFIX+'0.1.1-mobile';
const FILES=['./','./index.html','./styles.css','./app.mjs','./domain.mjs','./time.mjs','./pwa.mjs','./storage.mjs','./intake.mjs','./migration.mjs','./csv.mjs','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
const urls=FILES.map(file=>new URL(file,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'}))))
));
// Wait for old tabs to close, or explicit consent after drafts have been saved.
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const clean=new URL(url);clean.search='';clean.hash='';
  const key=urls.includes(clean.href)?clean.href:null;
  if(!key)return;
  event.respondWith((async()=>{
    const cached=await(await caches.open(CACHE)).match(key);
    if(cached)return cached;
    try{return await fetch(event.request);}
    catch{return new Response('初回はインターネットに接続して、このアプリのHTTPSアドレスを開いてください。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  })());
});
