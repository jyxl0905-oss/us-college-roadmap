import type { ChecklistItem, School } from './types'
import type { ProfileRow } from './profile'
import { profileGrade } from './profile'
import { currentSeason, seasonLabelKo, nextCheckinKo } from './academics'
import { axisOrder, axisKo, type AxisScores } from './score'
import { majorLabel } from '../data/majors'
import { t } from '../i18n'

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
      children: [new TextRun(t(`${profile.nickname}님의 시즌 리포트`, `${profile.nickname}’s Season Report`))],
    }),
    p(`${t(`${grade}학년`, `Grade ${grade}`)} · ${majorLabel(profile.major_primary)} · ${seasonLabelKo[currentSeason()]}`),

    h(t('6축 밸런스', '6-Axis Balance')),
    ...axisOrder.map((a) => p(`${axisKo[a]}: ${scores[a]} / 100`)),

    h(`${t('이번 시즌 진행률', 'This season’s progress')}: ${doneCount} / ${items.length}`),

    h(t('이번 시즌 체크리스트', 'This Season’s Checklist')),
    ...items.map((i) => p(`${checkedIds.has(i.id) ? '☑' : '☐'} ${i.title}${i.why_how ? ` — ${i.why_how}` : ''}`)),
  ]

  if (schools.length > 0) {
    children.push(h(t('목표 학교', 'Target Schools')))
    for (const s of schools) {
      children.push(p(`${s.name} (${s.name_ko}) · US News #${s.usnews_rank}`, true))
      const parts: string[] = []
      if (s.test_policy === 'test-free') parts.push(t('SAT/ACT 미반영(test-free)', 'Test-free (SAT/ACT not considered)'))
      else if (s.sat_mid50_low && s.sat_mid50_high) parts.push(`${t('SAT 중간 50%', 'SAT middle 50%')}: ${s.sat_mid50_low}-${s.sat_mid50_high}`)
      // null = 학교가 공식 표명하지 않음 → 웹 카드와 동일하게 표시 생략
      if (s.need_blind_intl !== null) parts.push(s.need_blind_intl ? t('Need-blind(국제학생)', 'Need-blind (intl.)') : t('Need-aware(국제학생)', 'Need-aware (intl.)'))
      if (s.intl_accept_rate !== null) parts.push(`${t('국제학생 합격률', 'Intl. acceptance rate')} ${s.intl_accept_rate}%`)
      if (s.demonstrated_interest) parts.push(t('Demonstrated Interest 반영', 'Considers demonstrated interest'))
      if (parts.length > 0) children.push(p(parts.join(' · ')))
    }
  }

  children.push(
    new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: `${t('미국 대입 로드맵', 'US College Roadmap')} · ${t('다음 체크인', 'Next check-in')}: ${nextCheckinKo()}`, italics: true })] }),
  )

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${t('시즌리포트', 'season-report')}_${profile.nickname ?? ''}_${new Date().toISOString().slice(0, 10)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
