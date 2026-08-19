// 최소 서비스 워커 — 설치 가능 조건 충족용. 네비게이션은 항상 네트워크 우선(배포 직후에도 옛 index.html을 주지 않음),
// 성공한 응답으로 오프라인용 셸 사본을 갱신하고, 실패 시(오프라인)에만 캐시된 셸 제공.
// Supabase 등 교차 출처 요청과 /api/ 요청은 절대 캐시하지 않음.
const CACHE = 'roadmap-shell-v2'
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest'])).then(() => self.skipWaiting()),
  )
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  if (e.request.mode !== 'navigate') return
  if (new URL(e.request.url).pathname.startsWith('/api/')) return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // SPA는 모든 경로가 같은 index.html → 최신 셸 1부만 '/' 키로 보관
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match('/')),
  )
})
