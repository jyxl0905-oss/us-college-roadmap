// 사이트맵 생성 — 정적 경로 + 학교 147곳 + 전공 (빌드마다 자동 재생성)
// 한국어판(/x)과 영어판(/en/x)을 모두 넣고 서로를 hreflang으로 연결 (x-default = 영어판)
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://www.uscollegeroadmap.com'
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const schools = JSON.parse(readFileSync('src/data/schools.index.json', 'utf8'))
const majorsTs = readFileSync('src/data/majors.ts', 'utf8')
const majorValues = [...majorsTs.matchAll(/\{ value: '([^']+)', label:/g)].map((m) => m[1])

const paths = [
  '/', '/schools', '/majors', '/map', '/guide/courses', '/guide/ap', '/guide/cost', '/guide/programs', '/guide/english', '/majors/trends', '/demo', '/about', '/privacy', '/terms',
  ...schools.map((s) => `/schools/${slugify(s.name)}`),
  ...majorValues.map((v) => `/major/${v}`),
]
const today = new Date().toISOString().slice(0, 10)
const ko = (p) => `${BASE}${p === '/' ? '' : p}`
const en = (p) => `${BASE}/en${p === '/' ? '' : p}`
const entry = (loc, p) => `  <url><loc>${loc}</loc><lastmod>${today}</lastmod>` +
  `<xhtml:link rel="alternate" hreflang="ko" href="${ko(p)}"/>` +
  `<xhtml:link rel="alternate" hreflang="en" href="${en(p)}"/>` +
  `<xhtml:link rel="alternate" hreflang="x-default" href="${en(p)}"/></url>`
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${paths
  .flatMap((p) => [entry(ko(p), p), entry(en(p), p)])
  .join('\n')}\n</urlset>\n`
writeFileSync('public/sitemap.xml', xml)
console.log(`sitemap.xml: ${paths.length * 2} urls (ko + en)`)
