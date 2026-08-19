// 캘린더 파일(.ics) 생성 — 다음 체크인(시즌 시작일) + 학생이 직접 입력한 학교별 마감일만.
// 툴이 마감 날짜를 만들어내지 않음(시기 라벨은 캘린더에 넣지 않음).

export interface IcsEvent {
  title: string
  date: string // YYYY-MM-DD (종일 이벤트)
  description?: string
}

// 다음 체크인 날짜: 시즌 시작일 (8/1 Fall, 1/1 Spring, 6/1 Summer)
export function nextCheckinDate(now: Date = new Date()): string {
  const y = now.getFullYear(), m = now.getMonth() + 1
  if (m >= 8) return `${y + 1}-01-01`
  if (m >= 6) return `${y}-08-01`
  return `${y}-06-01`
}

function fmt(date: string): string {
  return date.slice(0, 10).replace(/-/g, '')
}
function nextDay(date: string): string {
  const d = new Date(date.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
// 같은 이벤트를 다시 내려받아도 캘린더에 중복 생성되지 않도록 날짜+제목 기반의 안정적 UID
function stableId(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

export function buildIcs(events: IcsEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//us-college-roadmap//KR', 'CALSCALE:GREGORIAN',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${fmt(e.date)}-${stableId(e.title)}@us-college-roadmap`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fmt(e.date)}`,
      `DTEND;VALUE=DATE:${fmt(nextDay(e.date))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

export function downloadIcs(filename: string, events: IcsEvent[]): void {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
