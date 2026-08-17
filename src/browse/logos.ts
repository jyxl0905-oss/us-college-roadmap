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

// 고해상도 공식 마크 — 각 대학 영문 위키피디아 인포박스의 현행 인장/방패 — 표시 크기(≤52px, 2x)에 맞춘 120px 썸네일로 전송량 최소화 (2026-08-10 63곳 전수 검증)
const hiResLogos: Record<number, string> = {
  1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Princeton_seal.svg/120px-Princeton_seal.svg.png',
  2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/MIT_2023_red_logo.svg/120px-MIT_2023_red_logo.svg.png',
  3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Harvard_University_coat_of_arms.svg/120px-Harvard_University_coat_of_arms.svg.png',
  4: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Seal_of_Leland_Stanford_Junior_University.svg/120px-Seal_of_Leland_Stanford_Junior_University.svg.png',
  5: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Yale_University_Shield_1.svg/120px-Yale_University_Shield_1.svg.png',
  6: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/79/University_of_Chicago_shield.svg/120px-University_of_Chicago_shield.svg.png',
  7: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Duke_University_logo.svg/120px-Duke_University_logo.svg.png',
  8: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Johns_Hopkins_University%27s_Academic_Seal.svg/120px-Johns_Hopkins_University%27s_Academic_Seal.svg.png',
  9: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Northwestern_University_seal.svg/120px-Northwestern_University_seal.svg.png',
  10: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/UPenn_shield_with_banner.svg/120px-UPenn_shield_with_banner.svg.png',
  11: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Seal_of_the_California_Institute_of_Technology.svg/120px-Seal_of_the_California_Institute_of_Technology.svg.png',
  12: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Cornell_University_seal.svg/120px-Cornell_University_seal.svg.png',
  13: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Shield_of_Brown_University.svg/120px-Shield_of_Brown_University.svg.png',
  14: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Dartmouth_College_shield.svg/120px-Dartmouth_College_shield.svg.png',
  15: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Coat_of_Arms_of_Columbia_University.svg/120px-Coat_of_Arms_of_Columbia_University.svg.png',
  16: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Seal_of_University_of_California%2C_Berkeley.svg/120px-Seal_of_University_of_California%2C_Berkeley.svg.png',
  17: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/Rice_University_seal.svg/120px-Rice_University_seal.svg.png',
  18: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/The_University_of_California_UCLA.svg/120px-The_University_of_California_UCLA.svg.png',
  19: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Vanderbilt_University_seal.svg/120px-Vanderbilt_University_seal.svg.png',
  20: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bb/Carnegie_Mellon_University_seal.svg/120px-Carnegie_Mellon_University_seal.svg.png',
  21: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Seal_of_the_University_of_Michigan.svg/120px-Seal_of_the_University_of_Michigan.svg.png',
  22: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/University_of_Notre_Dame_seal_%282%29.svg/120px-University_of_Notre_Dame_seal_%282%29.svg.png',
  23: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/WashU_St._Louis_seal.svg/120px-WashU_St._Louis_seal.svg.png',
  24: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/63/Emory_University_Seal.svg/120px-Emory_University_Seal.svg.png',
  25: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Georgetown_University_seal.svg/120px-Georgetown_University_seal.svg.png',
  26: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/University_of_North_Carolina_at_Chapel_Hill_seal.svg/120px-University_of_North_Carolina_at_Chapel_Hill_seal.svg.png',
  27: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/University_of_Virginia_seal.svg/120px-University_of_Virginia_seal.svg.png',
  28: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/University_of_Southern_California_%28USC%29_seal.svg/120px-University_of_Southern_California_%28USC%29_seal.svg.png',
  29: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Seal_of_the_University_of_California%2C_San_Diego.svg/120px-Seal_of_the_University_of_California%2C_San_Diego.svg.png',
  30: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6d/University_of_Florida_seal.svg/120px-University_of_Florida_seal.svg.png',
  31: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/University_of_Texas_at_Austin_seal.svg/120px-University_of_Texas_at_Austin_seal.svg.png',
  32: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Georgia_Tech_seal.svg/120px-Georgia_Tech_seal.svg.png',
  33: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/New_York_University_Seal.svg/120px-New_York_University_Seal.svg.png',
  34: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/The_University_of_California_Davis.svg/120px-The_University_of_California_Davis.svg.png',
  35: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/The_University_of_California_Irvine.svg/120px-The_University_of_California_Irvine.svg.png',
  36: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/00/Boston_College_seal.svg/120px-Boston_College_seal.svg.png',
  37: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b1/Tufts_official_seal.svg/120px-Tufts_official_seal.svg.png',
  38: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/University_of_Illinois_seal.svg/120px-University_of_Illinois_seal.svg.png',
  39: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Seal_of_the_University_of_Wisconsin.svg/120px-Seal_of_the_University_of_Wisconsin.svg.png',
  40: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/UC_Santa_Barbara_Seal.png/120px-UC_Santa_Barbara_Seal.png',
  41: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Ohio_State_University_seal.svg/120px-Ohio_State_University_seal.svg.png',
  42: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Boston_University_seal.svg/120px-Boston_University_seal.svg.png',
  43: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Rutgers_University_seal.svg/120px-Rutgers_University_seal.svg.png',
  44: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/University_of_Maryland_seal.svg/120px-University_of_Maryland_seal.svg.png',
  45: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/58/University_of_Washington_seal.svg/120px-University_of_Washington_seal.svg.png',
  46: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/63/Lehigh_University_seal.png/120px-Lehigh_University_seal.png',
  47: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/NU_RGB_seal_R.png/120px-NU_RGB_seal_R.png',
  48: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/61/Purdue_University_seal.svg/120px-Purdue_University_seal.svg.png',
  49: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/University_of_Georgia_seal_1801.svg/120px-University_of_Georgia_seal_1801.svg.png',
  50: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c8/University_of_Rochester_seal.svg/120px-University_of_Rochester_seal.svg.png',
  51: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/08/Case_Western_Reserve_University_seal.svg/120px-Case_Western_Reserve_University_seal.svg.png',
  52: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6b/Florida_State_University_seal.svg/120px-Florida_State_University_seal.svg.png',
  53: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/Texas_A%26M_University_seal.svg/120px-Texas_A%26M_University_seal.svg.png',
  54: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Virginia_Tech_seal.svg/120px-Virginia_Tech_seal.svg.png',
  55: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0a/Wake_Forest_University_seal.svg/120px-Wake_Forest_University_seal.svg.png',
  56: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/College_of_William_%26_Mary_Coat_of_Arms.png/120px-College_of_William_%26_Mary_Coat_of_Arms.png',
  57: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/51/UC_Merced_Seal.png/120px-UC_Merced_Seal.png',
  58: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/da/Villanova_University_seal.svg/120px-Villanova_University_seal.svg.png',
  59: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d8/George_Washington_University_seal.svg/120px-George_Washington_University_seal.svg.png',
  60: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Pennsylvania_State_University_seal.svg/120px-Pennsylvania_State_University_seal.svg.png',
  61: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/ad/Santa_Clara_U_Seal.svg/120px-Santa_Clara_U_Seal.svg.png',
  62: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1d/Stony_Brook_University_seal.svg/120px-Stony_Brook_University_seal.svg.png',
  63: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Seal_of_the_University_of_Minnesota.svg/120px-Seal_of_the_University_of_Minnesota.svg.png',
}

// 소스별 화질·진위 실측 결과 (2026-08-10, 63곳 전수 확인):
// - DDG가 더 선명한 곳: Emory(24)·UCI(35)·Villanova(58)
// - 양쪽 모두 실제 로고가 아닌 플레이스홀더만 나오는 곳: UGA(49)·GWU(59) → 파비콘 제외
const DDG_OVERRIDE = new Set([24, 35, 58])
const NO_FAVICON = new Set([49, 59])

function faviconUrl(schoolId: number): string | null {
  const domain = domains[schoolId]
  if (!domain || NO_FAVICON.has(schoolId)) return null
  if (DDG_OVERRIDE.has(schoolId)) return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

// 시도 순서: 고해상도 마크 → 파비콘 (SchoolLogo가 onError로 순차 폴백)
export function schoolLogoSources(schoolId: number): string[] {
  return [hiResLogos[schoolId], faviconUrl(schoolId)].filter(Boolean) as string[]
}
