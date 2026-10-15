// AI 도우미가 참고할 사이트 데이터를 public/ai/에 그대로 복사 (빌드 때마다 src/data에서 다시 만듦)
// 서버 함수(supabase/functions/ask)가 https://www.uscollegeroadmap.com/ai/<파일>로 읽음 (실패하면 GitHub 원본으로 대체)
// 학교 기본 정보(마감·합격률·장학금·에세이 문항)는 DB schools 테이블에서 직접 읽으므로 여기엔 없음
import { copyFileSync, mkdirSync } from 'node:fs'

export const AI_FILES = [
  'schools.index.json', 'schoolAliases.ts', 'app-fees.json', 'english.json', 'requirements.json', 'apCredit.json',
  'cost.json', 'usData.json', 'scholarships.json', 'programs.json', 'music-schools.json', 'aidRules.json', 'essays-that-worked.json',
  'major-roadmaps.json', 'major-roadmaps.en.json', 'major-careers.json', 'majors.ts',
]
const out = new URL('../public/ai/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const f of AI_FILES) copyFileSync(new URL(`../src/data/${f}`, import.meta.url), new URL(f.replace(/\.ts$/, '.ts.txt'), out))
console.log(`gen-ai-data: public/ai/ ${AI_FILES.length} files`)
