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

type StateGeom = { type: string; coordinates: number[][][] | number[][][][] }
function ringPath(ring: number[][]): string {
  return 'M' + ring.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z'
}
function geomPath(geom: StateGeom): string {
  if (geom.type === 'Polygon') return (geom.coordinates as number[][][]).map(ringPath).join('')
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).map((poly) => poly.map(ringPath).join('')).join('')
  return ''
}

// 핀 위에 띄우는 로고 칩 (SVG image, 실패 시 다음 소스 → 전부 실패면 숨김)
function PinLogo({ schoolId, x, y, size }: { schoolId: number; x: number; y: number; size: number }) {
  const [i, setI] = useState(0)
  const sources = schoolLogoSources(schoolId)
  if (i >= sources.length) return null
  const pad = size * 0.18
  return (
    <g pointerEvents="none">
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

interface MapPageProps {
  profile: ProfileRow | null
}

export default function MapPage({ profile }: MapPageProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [kind, setKind] = useState<'all' | 'university' | 'lac' | 'targets'>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [box, setBox] = useState({ x: 0, y: 0, w: W, h: H })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ px: number; py: number; box: typeof box } | null>(null)
  const movedRef = useRef(false)

  useEffect(() => {
    loadSchools().then(setSchools)
  }, [])

  const statePaths = useMemo(() => {
    const topo = statesTopo as unknown as Topology<{ states: GeometryCollection }>
    const fc = feature(topo, topo.objects.states) as unknown as { features: { geometry: StateGeom; id: string }[] }
    return fc.features.map((f) => ({ id: f.id, d: geomPath(f.geometry) }))
  }, [])

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

  const scale = W / box.w // 화면 확대 배율 — 점 크기를 화면상 일정하게 유지
  const zoomAt = (factor: number) => {
    setBox((b) => {
      const w = Math.min(W, Math.max(60, b.w / factor))
      const h = (w / W) * H
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      return { x: cx - w / 2, y: cy - h / 2, w, h }
    })
  }
  const zoomNortheast = () => {
    // 학교가 몰려 있는 동북부 (워싱턴 DC~메인)
    const a = project([-78.2, 44.6])
    const b = project([-69.2, 38.6])
    if (!a || !b) return
    const pad = 12
    const w = b[0] - a[0] + pad * 2
    const h = (w / W) * H
    setBox({ x: a[0] - pad, y: a[1] - pad, w, h })
  }
  const resetZoom = () => setBox({ x: 0, y: 0, w: W, h: H })

  // 드래그 팬
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { px: e.clientX, py: e.clientY, box }
    movedRef.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    const el = svgRef.current
    if (!d || !el) return
    const rect = el.getBoundingClientRect()
    const dx = ((e.clientX - d.px) / rect.width) * d.box.w
    const dy = ((e.clientY - d.py) / rect.height) * d.box.h
    if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) > 4) movedRef.current = true
    setBox({ ...d.box, x: d.box.x - dx, y: d.box.y - dy })
  }
  const onPointerUp = () => {
    dragRef.current = null
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
            <p className="text-xs text-gray-400">{t('점을 누르면 학교 정보가 떠요 · 드래그로 이동, 버튼으로 확대', 'Tap a dot for school info · drag to pan, buttons to zoom')}</p>
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
            <button onClick={zoomNortheast} className="rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{t('동북부 확대', 'Northeast')}</button>
            <button onClick={() => zoomAt(1.5)} aria-label={t('확대', 'Zoom in')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">＋</button>
            <button onClick={() => zoomAt(1 / 1.5)} aria-label={t('축소', 'Zoom out')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">－</button>
            <button onClick={resetZoom} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">{t('전체', 'Reset')}</button>
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border-2 border-gray-200 bg-white">
          <svg
            ref={svgRef}
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            className="block w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {statePaths.map((p) => (
              <path key={p.id} d={p.d} className="map-state" />
            ))}
            {dots.map(({ s, x, y }) => {
              const isTarget = targetIds.has(s.id)
              const isSel = selectedId === s.id
              const lac = (s.kind ?? 'university') === 'lac'
              return (
                <g
                  key={s.id}
                  onClick={() => { if (!movedRef.current) setSelectedId(isSel ? null : s.id) }}
                  className="cursor-pointer"
                >
                  <circle cx={x} cy={y} r={12 / scale} fill="transparent" />
                  <circle
                    cx={x}
                    cy={y}
                    r={(isTarget || isSel ? 6.5 : 4.5) / scale}
                    strokeWidth={(isTarget || isSel ? 2.2 : 1.2) / scale}
                    className={`${lac ? 'fill-emerald-500' : 'fill-blue-600'} ${isSel ? 'stroke-gray-900' : isTarget ? 'stroke-amber-400' : 'map-dot-ring'}`}
                  />
                  {(kind === 'targets' || scale >= 2.2 || isSel) && (
                    <PinLogo schoolId={s.id} x={x} y={y} size={18 / scale} />
                  )}
                  {(isSel || (isTarget && scale > 1.8) || kind === 'targets') && (
                    <text x={x} y={y - 32 / scale} textAnchor="middle" style={{ fontSize: 11 / scale }} className="map-label pointer-events-none font-semibold">
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
          <div className="mt-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
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
