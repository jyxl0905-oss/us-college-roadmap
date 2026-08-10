// 학교 로고 — 각 대학 공식 웹사이트의 파비콘(엠블럼)을 구글 파비콘 서비스로 표시
// (API 키·외부 계약 불필요, 로고 파일을 직접 호스팅하지 않으므로 상표 이슈 최소화)
const domains: Record<number, string> = {
  1: 'princeton.edu', 2: 'mit.edu', 3: 'harvard.edu', 4: 'stanford.edu', 5: 'yale.edu',
  6: 'uchicago.edu', 7: 'duke.edu', 8: 'jhu.edu', 9: 'northwestern.edu', 10: 'upenn.edu',
  11: 'caltech.edu', 12: 'cornell.edu', 13: 'brown.edu', 14: 'dartmouth.edu', 15: 'columbia.edu',
  16: 'berkeley.edu', 17: 'rice.edu', 18: 'ucla.edu', 19: 'vanderbilt.edu', 20: 'cmu.edu',
  21: 'umich.edu', 22: 'nd.edu', 23: 'wustl.edu', 24: 'emory.edu', 25: 'georgetown.edu',
  26: 'unc.edu', 27: 'virginia.edu', 28: 'usc.edu', 29: 'ucsd.edu', 30: 'ufl.edu',
  31: 'utexas.edu', 32: 'gatech.edu', 33: 'nyu.edu', 34: 'ucdavis.edu', 35: 'uci.edu',
  36: 'bc.edu', 37: 'tufts.edu', 38: 'illinois.edu', 39: 'wisc.edu', 40: 'ucsb.edu',
  41: 'osu.edu', 42: 'bu.edu', 43: 'rutgers.edu', 44: 'umd.edu', 45: 'washington.edu',
  46: 'lehigh.edu', 47: 'northeastern.edu', 48: 'purdue.edu', 49: 'uga.edu', 50: 'rochester.edu',
  51: 'case.edu', 52: 'fsu.edu', 53: 'tamu.edu', 54: 'vt.edu', 55: 'wfu.edu',
  56: 'wm.edu', 57: 'ucmerced.edu', 58: 'villanova.edu', 59: 'gwu.edu', 60: 'psu.edu',
  61: 'scu.edu', 62: 'stonybrook.edu', 63: 'umn.edu',
}

// 소스별 화질·진위 실측 결과 (2026-08-10, 63곳 전수 확인):
// - DDG가 더 선명한 곳: Emory(24)·UCI(35)·Villanova(58)
// - 양쪽 모두 실제 로고가 아닌 플레이스홀더만 나오는 곳: UGA(49)·GWU(59) → 로고 숨김
const DDG_OVERRIDE = new Set([24, 35, 58])
const NO_LOGO = new Set([49, 59])

export function schoolLogoUrl(schoolId: number): string | null {
  const domain = domains[schoolId]
  if (!domain || NO_LOGO.has(schoolId)) return null
  if (DDG_OVERRIDE.has(schoolId)) return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}
