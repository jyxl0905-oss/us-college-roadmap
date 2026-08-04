import type { ChecklistItem, School } from './types'
import type { ProfileRow } from './profile'
import { profileGrade } from './profile'
import { currentSeason, seasonLabelKo, nextCheckinKo } from './academics'
import { axisOrder, axisKo, type AxisScores } from './score'
import { majorLabel } from '../data/majors'

// Word(docx) 내보내기 — docx 라이브러리는 무거워서 버튼 클릭 시에만 동적 로드
export async function downloadDocx(
  profile: ProfileRow,
  scores: AxisScores,
  items: ChecklistItem[],
  checkedIds: Set<number>,
  schools: School[],
): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  const h = (text: string) =>
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun(text)] })
  const p = (text: string, bold = false) =>
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, bold })] })

  const grade = profileGrade(profile)
  const doneCount = items.filter((i) => checkedIds.has(i.id)).length

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`${profile.nickname}님의 시즌 리포트`)],
    }),
    p(`${grade}학년 · ${majorLabel(profile.major_primary)} · ${seasonLabelKo[currentSeason()]}`),

    h('6축 밸런스'),
    ...axisOrder.map((a) => p(`${axisKo[a]}: ${scores[a]} / 100`)),

    h(`이번 시즌 진행률: ${doneCount} / ${items.length}`),

    h('이번 시즌 체크리스트'),
    ...items.map((i) => p(`${checkedIds.has(i.id) ? '☑' : '☐'} ${i.title}${i.why_how ? ` — ${i.why_how}` : ''}`)),
  ]

  if (schools.length > 0) {
    children.push(h('목표 학교'))
    for (const s of schools) {
      children.push(p(`${s.name} (${s.name_ko}) · US News #${s.usnews_rank}`, true))
      const parts = []
      if (s.sat_mid50_low && s.sat_mid50_high) parts.push(`SAT 중간 50%: ${s.sat_mid50_low}-${s.sat_mid50_high}`)
      parts.push(s.need_blind_intl ? 'Need-blind(국제학생)' : 'Need-aware(국제학생)')
      if (s.demonstrated_interest) parts.push('Demonstrated Interest 반영')
      children.push(p(parts.join(' · ')))
    }
  }

  children.push(
    new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: `미국 대입 로드맵 · 다음 체크인: ${nextCheckinKo()}`, italics: true })] }),
  )

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `시즌리포트_${profile.nickname ?? ''}_${new Date().toISOString().slice(0, 10)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
