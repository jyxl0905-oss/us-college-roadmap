import { axisOrder, axisKo, type AxisScores } from '../lib/score'

// 6축 레이더 차트 — 외부 라이브러리 없이 SVG로 직접 그림 (print/PDF에도 그대로 쓰임)
const SIZE = 300
const CX = SIZE / 2
const CY = SIZE / 2
const R = 96

function point(axisIndex: number, ratio: number): [number, number] {
  const angle = -Math.PI / 2 + (axisIndex * Math.PI) / 3 // 12시 방향부터 시계방향 60도 간격
  return [CX + R * ratio * Math.cos(angle), CY + R * ratio * Math.sin(angle)]
}

function polygonPoints(ratios: number[]): string {
  return ratios.map((r, i) => point(i, r).join(',')).join(' ')
}

export default function RadarChart({ scores }: { scores: AxisScores }) {
  const ratios = axisOrder.map((a) => scores[a] / 100)

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-xs" role="img" aria-label="6축 밸런스 차트">
      {/* 배경 그리드 (25/50/75/100%) */}
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon
          key={g}
          points={polygonPoints(axisOrder.map(() => g))}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      {/* 축 선 */}
      {axisOrder.map((_, i) => {
        const [x, y] = point(i, 1)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />
      })}
      {/* 점수 폴리곤 */}
      <polygon
        points={polygonPoints(ratios)}
        fill="rgba(37, 99, 235, 0.18)"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {ratios.map((r, i) => {
        const [x, y] = point(i, r)
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#2563eb" />
      })}
      {/* 축 라벨 + 점수 */}
      {axisOrder.map((axis, i) => {
        const [x, y] = point(i, 1.24)
        return (
          <text
            key={axis}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-600"
            fontSize="12"
          >
            <tspan x={x} dy="-0.3em" fontWeight="600">
              {axisKo[axis]}
            </tspan>
            <tspan x={x} dy="1.2em" className="fill-gray-400" fontSize="11">
              {scores[axis]}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
