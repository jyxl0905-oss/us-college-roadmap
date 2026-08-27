import { useEffect, useMemo, useRef, useState } from 'react'
import { geoAlbersUsa } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import statesTopo from 'us-atlas/states-albers-10m.json'
import coordsData from '../data/school-coords.json'
import type { School } from '../lib/types'
import { loadSchools } from '../lib/schoolsCache'
import { navigate, slugify } from '../lib/router'
import SchoolLogo from './SchoolLogo'
import { schoolLogoSources } from './logos'
import type { ProfileRow } from '../lib/profile'
import { t } from '../i18n'

// 🗺️ 대학 지도 — 미국 지도(자체 SVG, 외부 요청 없음) 위에 99개교 위치 표시.
// 주 경계: us-atlas(미 인구조사국, 퍼블릭 도메인, Albers USA 사전 투영 975×610).
// 좌표: 미 교육부 College Scorecard 공식 위경도.

const W = 975
const H = 610
const coords = coordsData as unknown as Record<string, [number, number]>
// us-atlas albers 파일과 동일한 투영 (scale 1300, translate 487.5/305)
const project = geoAlbersUsa().scale(1300).translate([W / 2, H / 2])

// 주 FIPS → 약자 (확대 시 지리 참조용)
const STATE_ABBR: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
  '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY',
}

// 주요 도시 참조 라벨 (위치 감 잡기용 — 일반 상식 좌표)
const CITIES: { name: string; en: string; lat: number; lng: number }[] = [
  { name: '보스턴', en: 'Boston', lat: 42.36, lng: -71.06 },
  { name: '뉴욕', en: 'New York', lat: 40.71, lng: -74.01 },
  { name: '워싱턴 DC', en: 'Washington DC', lat: 38.91, lng: -77.04 },
  { name: '시카고', en: 'Chicago', lat: 41.88, lng: -87.63 },
  { name: '애틀랜타', en: 'Atlanta', lat: 33.75, lng: -84.39 },
  { name: '마이애미', en: 'Miami', lat: 25.76, lng: -80.19 },
  { name: '댈러스', en: 'Dallas', lat: 32.78, lng: -96.8 },
  { name: '휴스턴', en: 'Houston', lat: 29.76, lng: -95.37 },
  { name: '덴버', en: 'Denver', lat: 39.74, lng: -104.99 },
  { name: 'LA', en: 'Los Angeles', lat: 34.05, lng: -118.24 },
  { name: '샌프란시스코', en: 'San Francisco', lat: 37.77, lng: -122.42 },
  { name: '시애틀', en: 'Seattle', lat: 47.61, lng: -122.33 },
]

type StateGeom = { type: string; coordinates: number[][][] | number[][][][] }
function ringPath(ring: number[][]): string {
  return 'M' + ring.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z'
}
function geomPath(geom: StateGeom): string {
  if (geom.type === 'Polygon') return (geom.coordinates as number[][][]).map(ringPath).join('')
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).map((poly) => poly.map(ringPath).join('')).join('')
  return ''
}
// 라벨용 중심점 — 가장 큰 링의 바운딩 박스 중앙
function geomCenter(geom: StateGeom): [number, number] {
  const rings: number[][][] = geom.type === 'Polygon' ? (geom.coordinates as number[][][]) : (geom.coordinates as number[][][][]).flat()
  let best: number[][] = rings[0] ?? []
  for (const r of rings) if (r.length > best.length) best = r
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of best) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

// 핀 위에 띄우는 로고 칩 (SVG image, 실패 시 다음 소스 → 전부 실패면 숨김)
function PinLogo({ schoolId, x, y, size }: { schoolId: number; x: number; y: number; size: number }) {
  const [i, setI] = useState(0)
  const sources = schoolLogoSources(schoolId)
  if (i >= sources.length) return null
  const pad = size * 0.18
  return (
    <g pointerEvents="none" filter="url(#pinShadow)">
      <rect x={x - size / 2 - pad} y={y - size - size * 0.55 - pad} width={size + pad * 2} height={size + pad * 2} rx={size * 0.2} className="map-logo-bg" />
      <image
        href={sources[i]}
        x={x - size / 2}
        y={y - size - size * 0.55}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        onError={() => setI((v) => v + 1)}
      />
    </g>
  )
}

interface Box { x: number; y: number; w: number; h: number }
const FULL: Box = { x: 0, y: 0, w: W, h: H }
const clampBox = (b: Box): Box => {
  const w = Math.min(W, Math.max(50, b.w))
  const h = (w / W) * H
  return { x: b.x, y: b.y, w, h }
}

interface MapPageProps {
  profile: ProfileRow | null
}

export default function MapPage({ profile }: MapPageProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [kind, setKind] = useState<'all' | 'university' | 'lac' | 'targets'>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const [box, setBox] = useState<Box>(FULL)
  const boxRef = useRef(box)
  boxRef.current = box
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<number | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ dist: number; box: Box } | null>(null)
  const dragRef = useRef<{ px: number; py: number; box: Box } | null>(null)
  const movedRef = useRef(false)

  useEffect(() => {
    loadSchools().then(setSchools)
  }, [])

  const statePaths = useMemo(() => {
    const topo = statesTopo as unknown as Topology<{ states: GeometryCollection }>
    const fc = feature(topo, topo.objects.states) as unknown as { features: { geometry: StateGeom; id: string }[] }
    return fc.features.map((f) => ({ id: f.id, d: geomPath(f.geometry), c: geomCenter(f.geometry) }))
  }, [])
  const cityPts = useMemo(
    () =>
      CITIES.map((c) => {
        const p = project([c.lng, c.lat])
        return p ? { ...c, x: p[0], y: p[1] } : null
      }).filter((c): c is (typeof CITIES)[number] & { x: number; y: number } => c !== null),
    [],
  )

  const targetIds = useMemo(() => new Set(profile?.target_mode === 'schools' ? profile.target_school_ids : []), [profile])
  const dots = useMemo(
    () =>
      schools
        .filter((s) => (kind === 'targets' ? targetIds.has(s.id) : kind === 'all' || (s.kind ?? 'university') === kind))
        .map((s) => {
          const ll = coords[String(s.id)]
          if (!ll) return null
          const p = project([ll[1], ll[0]])
          if (!p) return null
          return { s, x: p[0], y: p[1] }
        })
        .filter((d): d is { s: School; x: number; y: number } => d !== null),
    [schools, kind, targetIds],
  )
  const selected = selectedId !== null ? schools.find((s) => s.id === selectedId) ?? null : null

  const scale = W / box.w // 화면 확대 배율 — 점·글자 크기를 화면상 일정하게 유지

  // 부드러운 줌 (버튼·프리셋) — 300ms ease
  const animateTo = (target: Box) => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const from = boxRef.current
    const to = clampBox(target)
    const t0 = performance.now()
    const dur = 320
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setBox({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      })
      if (p < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
  }
  const zoomAt = (factor: number) => {
    const b = boxRef.current
    const w = Math.min(W, Math.max(50, b.w / factor))
    const h = (w / W) * H
    animateTo({ x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h })
  }
  const zoomPreset = (lngLat1: [number, number], lngLat2: [number, number]) => {
    const a = project(lngLat1)
    const b = project(lngLat2)
    if (!a || !b) return
    const pad = 12
    const w = Math.abs(b[0] - a[0]) + pad * 2
    const h = (w / W) * H
    animateTo({ x: Math.min(a[0], b[0]) - pad, y: Math.min(a[1], b[1]) - pad, w, h })
  }
  const resetZoom = () => animateTo(FULL)

  // 휠 줌 (커서 기준) — preventDefault를 위해 non-passive로 직접 등록
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const b = boxRef.current
      const fx = (e.clientX - rect.left) / rect.width
      const fy = (e.clientY - rect.top) / rect.height
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18
      const w = Math.min(W, Math.max(50, b.w / factor))
      const h = (w / W) * H
      const mx = b.x + fx * b.w
      const my = b.y + fy * b.h
      setBox({ x: mx - fx * w, y: my - fy * h, w, h })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // 드래그 팬 + 두 손가락 핀치 줌
  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()]
      pinchRef.current = { dist: Math.hypot(p1.x - p2.x, p1.y - p2.y), box: boxRef.current }
      dragRef.current = null
    } else {
      dragRef.current = { px: e.clientX, py: e.clientY, box: boxRef.current }
    }
    movedRef.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const el = svgRef.current
    if (!el) return
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const rect = el.getBoundingClientRect()
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [p1, p2] = [...pointersRef.current.values()]
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      const factor = dist / pinchRef.current.dist
      const b0 = pinchRef.current.box
      const w = Math.min(W, Math.max(50, b0.w / factor))
      const h = (w / W) * H
      const cx = (p1.x + p2.x) / 2
      const cy = (p1.y + p2.y) / 2
      const fx = (cx - rect.left) / rect.width
      const fy = (cy - rect.top) / rect.height
      const mx = b0.x + fx * b0.w
      const my = b0.y + fy * b0.h
      movedRef.current = true
      setBox({ x: mx - fx * w, y: my - fy * h, w, h })
      return
    }
    const d = dragRef.current
    if (!d) return
    const dx = ((e.clientX - d.px) / rect.width) * d.box.w
    const dy = ((e.clientY - d.py) / rect.height) * d.box.h
    if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) > 4) movedRef.current = true
    setBox({ ...d.box, x: d.box.x - dx, y: d.box.y - dy })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) dragRef.current = null
  }
  const onDoubleClick = (e: React.MouseEvent) => {
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const b = boxRef.current
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    const w = Math.max(50, b.w / 2)
    const h = (w / W) * H
    animateTo({ x: b.x + fx * b.w - fx * w, y: b.y + fy * b.h - fy * h, w, h })
  }

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-medium ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 md:max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/targets')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">🗺️ {t('대학 지도', 'College Map')}</h1>
            <p className="text-xs text-gray-400">{t('점을 누르면 학교 정보 · 드래그 이동 · 휠/핀치/더블탭 확대', 'Tap a dot for info · drag to pan · wheel/pinch/double-tap to zoom')}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setKind('all')} className={chip(kind === 'all')}>{t('전체', 'All')} {schools.length}</button>
          <button onClick={() => setKind('university')} className={chip(kind === 'university')}>{t('종합대학', 'Universities')}</button>
          <button onClick={() => setKind('lac')} className={chip(kind === 'lac')}>{t('리버럴 아츠', 'Liberal arts')}</button>
          {targetIds.size > 0 && (
            <button onClick={() => setKind('targets')} className={chip(kind === 'targets')}>🎯 {t('내 목표', 'My targets')} {targetIds.size}</button>
          )}
          <span className="ml-auto flex shrink-0 gap-1.5">
            <button onClick={() => zoomPreset([-78.2, 44.6], [-69.2, 38.6])} className="rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{t('동북부', 'Northeast')}</button>
            <button onClick={() => zoomPreset([-124.5, 39.5], [-116.5, 32.4])} className="rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{t('캘리포니아', 'California')}</button>
            <button onClick={() => zoomAt(1.5)} aria-label={t('확대', 'Zoom in')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">＋</button>
            <button onClick={() => zoomAt(1 / 1.5)} aria-label={t('축소', 'Zoom out')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">－</button>
            <button onClick={resetZoom} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">{t('전체', 'Reset')}</button>
          </span>
        </div>

        <div className="map-ocean mt-3 overflow-hidden rounded-2xl border-2 border-gray-200">
          <svg
            ref={svgRef}
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            className="block w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            <defs>
              <filter id="pinShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy={1.2 / scale} stdDeviation={1.4 / scale} floodOpacity="0.28" />
              </filter>
            </defs>
            {statePaths.map((p) => (
              <path key={p.id} d={p.d} className="map-state" />
            ))}
            {/* 주 약자 — 확대 시에만 */}
            {scale >= 1.5 &&
              statePaths.map((p) =>
                STATE_ABBR[p.id] ? (
                  <text key={`ab-${p.id}`} x={p.c[0]} y={p.c[1]} textAnchor="middle" style={{ fontSize: 11 / scale }} className="map-state-label pointer-events-none">
                    {STATE_ABBR[p.id]}
                  </text>
                ) : null,
              )}
            {/* 주요 도시 참조 — 약간 확대하면 표시 */}
            {scale >= 1.35 &&
              cityPts.map((c) => (
                <g key={c.en} className="pointer-events-none">
                  <circle cx={c.x} cy={c.y} r={1.6 / scale} className="map-city-dot" />
                  <text x={c.x + 4 / scale} y={c.y + 3 / scale} style={{ fontSize: 9.5 / scale }} className="map-city-label">
                    {t(c.name, c.en)}
                  </text>
                </g>
              ))}
            {dots.map(({ s, x, y }) => {
              const isTarget = targetIds.has(s.id)
              const isSel = selectedId === s.id
              const isHover = hoverId === s.id
              const lac = (s.kind ?? 'university') === 'lac'
              const big = isTarget || isSel || isHover
              return (
                <g
                  key={s.id}
                  onClick={() => { if (!movedRef.current) setSelectedId(isSel ? null : s.id) }}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoverId(s.id) }}
                  onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHoverId((v) => (v === s.id ? null : v)) }}
                  className="cursor-pointer"
                >
                  <circle cx={x} cy={y} r={12 / scale} fill="transparent" />
                  {(isSel || isHover) && <circle cx={x} cy={y} r={9 / scale} className={`${lac ? 'fill-emerald-500' : 'fill-blue-600'} opacity-25`} />}
                  <circle
                    cx={x}
                    cy={y}
                    r={(big ? 6.5 : 4.5) / scale}
                    strokeWidth={(big ? 2.2 : 1.2) / scale}
                    className={`${lac ? 'fill-emerald-500' : 'fill-blue-600'} ${isSel ? 'stroke-gray-900' : isTarget ? 'stroke-amber-400' : 'map-dot-ring'}`}
                  />
                  {(kind === 'targets' || scale >= 2.2 || isSel) && (
                    <PinLogo schoolId={s.id} x={x} y={y} size={18 / scale} />
                  )}
                  {(isSel || isHover || (isTarget && scale > 1.8) || kind === 'targets') && (
                    <text x={x} y={y - ((kind === 'targets' || scale >= 2.2 || isSel) ? 32 : 10) / scale} textAnchor="middle" style={{ fontSize: 11 / scale }} className="map-label pointer-events-none font-semibold">
                      {s.name}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-600 align-middle" />{t('종합대학', 'University')}</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 align-middle" />{t('리버럴 아츠 칼리지', 'Liberal arts college')}</span>
          {targetIds.size > 0 && (
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-amber-400 bg-blue-600 align-middle" />{t('내 목표 학교', 'My target')}</span>
          )}
          <span className="text-gray-400">{t('· 좌표: 미 교육부 College Scorecard', '· Coordinates: US Dept. of Education College Scorecard')}</span>
        </div>

        {selected && (
          <div className="mt-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
                <SchoolLogo schoolId={selected.id} name={selected.name} size={38} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-gray-900">{selected.name}</p>
                <p className="truncate text-xs text-gray-400">{selected.name_ko}{selected.location_note ? ` · ${selected.location_note}` : ''}</p>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label={t('닫기', 'Close')} className="shrink-0 px-1 text-gray-300">✕</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {selected.kind === 'lac' ? `LAC #${selected.lac_rank ?? '–'}` : `US News #${selected.usnews_rank}`}
              </span>
              {selected.overall_accept_rate != null && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{t(`합격률 ${selected.overall_accept_rate}%`, `Accept ${selected.overall_accept_rate}%`)}</span>
              )}
              {selected.intl_accept_rate !== null && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{t(`국제 ${selected.intl_accept_rate}%`, `Intl. ${selected.intl_accept_rate}%`)}</span>
              )}
              {targetIds.has(selected.id) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{t('내 목표 학교', 'My target')}</span>}
            </div>
            <button
              onClick={() => navigate(`/schools/${slugify(selected.name)}`)}
              className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700"
            >
              {t('학교 카드 자세히 보기', 'See the full school card')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
