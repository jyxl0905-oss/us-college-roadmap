// 사이트맵 생성 — 정적 경로 + 학교 136곳 + 전공 58개 (빌드마다 자동 재생성)
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://www.uscollegeroadmap.com'
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const schools = JSON.parse(readFileSync('src/data/schools.index.json', 'utf8'))
const majorsTs = readFileSync('src/data/majors.ts', 'utf8')
const majorValues = [...majorsTs.matchAll(/\{ value: '([^']+)', label:/g)].map((m) => m[1])

const urls = [
  '/', '/schools', '/majors', '/map',
  ...schools.map((s) => `/schools/${slugify(s.name)}`),
  ...majorValues.map((v) => `/major/${v}`),
]
const today = new Date().toISOString().slice(0, 10)
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${BASE}${u}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')}\n</urlset>\n`
writeFileSync('public/sitemap.xml', xml)
console.log(`sitemap.xml: ${urls.length} urls`)
