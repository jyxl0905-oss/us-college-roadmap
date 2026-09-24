// 학교 검색용 약칭·통칭 (정식 이름·한글 이름에 없는 흔한 검색어). 소문자로 적고 공백 없이 비교
const ALIASES: Record<number, string[]> = {
  1: ['프린스턴'], 2: ['mit'], 3: ['하버드'], 4: ['스탠포드', '스탠퍼드'], 5: ['예일'], 6: ['uchicago', '시카고대'],
  7: ['듀크'], 8: ['jhu', '존스홉킨스', '존스 홉킨스'], 9: ['nu', 'northwestern'], 10: ['upenn', 'penn', '유펜'],
  11: ['caltech', '칼텍'], 12: ['코넬'], 13: ['브라운'], 14: ['다트머스'], 15: ['컬럼비아', '콜롬비아'],
  16: ['ucberkeley', 'berkeley', 'ucb', 'cal', '버클리'], 17: ['라이스'], 18: ['ucla'], 19: ['밴더빌트'],
  20: ['cmu', '카네기멜론', '카네기 멜론'], 21: ['umich', 'michigan', '미시간'], 22: ['노트르담'],
  23: ['washu', 'wustl', '워싱턴대 세인트루이스'], 24: ['에모리'], 25: ['조지타운'], 26: ['unc', 'uncchapelhill'],
  27: ['uva'], 28: ['usc'], 29: ['ucsd'], 30: ['uf'], 31: ['utaustin', 'ut', 'uta', '텍사스오스틴'],
  32: ['gatech', 'georgiatech', 'gt', '조지아텍'], 33: ['nyu', '뉴욕대'], 34: ['ucdavis', 'ucd'], 35: ['uci', 'ucirvine'],
  36: ['bc'], 37: ['터프츠'], 38: ['uiuc', '일리노이'], 39: ['uw-madison', 'uwmadison', 'wisc'], 40: ['ucsb'],
  41: ['osu', 'ohiostate'], 42: ['bu'], 43: ['rutgers', '럿거스'], 44: ['umd', 'umcp'], 45: ['uw', 'udub'],
  47: ['neu'], 48: ['purdue', '퍼듀'], 51: ['cwru'], 53: ['tamu'], 54: ['vt', 'vtech'], 59: ['gwu', 'gw'],
  60: ['psu', 'pennstate'], 62: ['sbu', 'stonybrook'], 63: ['umn'], 102: ['rpi'], 115: ['mines'], 118: ['stevens'],
  120: ['uic'], 121: ['wpi'], 127: ['rit'], 128: ['smu'], 136: ['cuboulder', 'cu'],
  137: ['pratt', '프랫'], 138: ['parsons', '파슨스', 'newschool'], 139: ['risd', '리즈디'], 140: ['calarts', '칼아츠'],
  141: ['cooper', '쿠퍼'], 142: ['saic'], 143: ['sva'], 144: ['fit'], 145: ['mica', '미카'], 146: ['scad', '스캐드'], 147: ['massart'],
}

const norm = (v: string) => v.toLowerCase().replace(/[\s.\-–—,()']/g, '')

// 검색어가 학교 이름·한글 이름·약칭 중 하나에 맞는지 (대소문자·공백·점 무시)
export function schoolMatches(s: { id: number; name: string; name_ko?: string | null }, query: string): boolean {
  const q = norm(query)
  if (!q) return true
  if (norm(s.name).includes(q) || norm(s.name_ko ?? '').includes(q)) return true
  return (ALIASES[s.id] ?? []).some((a) => norm(a) === q || (q.length >= 3 && norm(a).startsWith(q)))
}
