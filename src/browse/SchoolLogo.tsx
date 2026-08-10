import { useState } from 'react'
import { schoolLogoUrl } from './logos'

interface SchoolLogoProps {
  schoolId: number
  name: string
  size?: number // px
}

// 대학 엠블럼 (공식 사이트 파비콘) — 로드 실패 시 조용히 숨김
export default function SchoolLogo({ schoolId, name, size = 32 }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false)
  const url = schoolLogoUrl(schoolId)
  if (!url || failed) return null
  return (
    <img
      src={url}
      alt={`${name} 로고`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md bg-white object-contain"
      style={{ width: size, height: size }}
    />
  )
}
