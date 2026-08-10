import { useState } from 'react'
import { schoolLogoSources } from './logos'

interface SchoolLogoProps {
  schoolId: number
  name: string
  size?: number // px
}

// 대학 엠블럼 — 고해상도 로고 → 공식 사이트 파비콘 순으로 시도, 전부 실패 시 조용히 숨김
export default function SchoolLogo({ schoolId, name, size = 32 }: SchoolLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0)
  const sources = schoolLogoSources(schoolId)
  if (srcIndex >= sources.length) return null
  return (
    <img
      src={sources[srcIndex]}
      alt={`${name} 로고`}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setSrcIndex((i) => i + 1)}
      className="shrink-0 rounded-md bg-white object-contain"
      style={{ width: size, height: size }}
    />
  )
}
