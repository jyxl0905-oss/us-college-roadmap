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
  // 60~100위 확장 (2026-08)
  100: 'msu.edu',
  101: 'ncsu.edu',
  102: 'rpi.edu',
  103: 'umass.edu',
  104: 'miami.edu',
  105: 'brandeis.edu',
  106: 'tulane.edu',
  107: 'uconn.edu',
  108: 'pitt.edu',
  109: 'binghamton.edu',
  110: 'clemson.edu',
  111: 'newark.rutgers.edu',
  112: 'syracuse.edu',
  113: 'buffalo.edu',
  114: 'ucr.edu',
  115: 'mines.edu',
  116: 'drexel.edu',
  117: 'njit.edu',
  118: 'stevens.edu',
  119: 'pepperdine.edu',
  120: 'uic.edu',
  121: 'wpi.edu',
  122: 'yu.edu',
  123: 'american.edu',
  124: 'baylor.edu',
  125: 'howard.edu',
  126: 'marquette.edu',
  127: 'rit.edu',
  128: 'smu.edu',
  129: 'ucsc.edu',
  130: 'udel.edu',
  131: 'usf.edu',
  132: 'fiu.edu',
  133: 'fordham.edu',
  134: 'camden.rutgers.edu',
  135: 'tcu.edu',
  136: 'colorado.edu',
}

// 고해상도 공식 마크 — 각 대학 영문 위키피디아 인포박스의 현행 인장/방패 — 표시 크기(≤52px, 2x)에 맞춘 120px 썸네일로 전송량 최소화 (2026-08-10 63곳 전수 검증)
const hiResLogos: Record<number, string> = {
  // 60~100위 확장 (2026-08, 위키미디어 200 검증)
  100: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Michigan_State_University_seal.svg/120px-Michigan_State_University_seal.svg.png',
  101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/North_Carolina_State_University_logo.svg/120px-North_Carolina_State_University_logo.svg.png',
  102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Rensselear_poly_inst_seal.png/120px-Rensselear_poly_inst_seal.png',
  103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/UMass_Seal_Medium_PMS_202.png/120px-UMass_Seal_Medium_PMS_202.png',
  104: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/University_of_Miami_logo.svg/120px-University_of_Miami_logo.svg.png',
  105: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/32/Brandeis_University_seal.svg/120px-Brandeis_University_seal.svg.png',
  106: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Tulane_University_Logo.svg/120px-Tulane_University_Logo.svg.png',
  107: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/University_of_Connecticut_logo.svg/120px-University_of_Connecticut_logo.svg.png',
  108: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/fb/University_of_Pittsburgh_seal.svg/120px-University_of_Pittsburgh_seal.svg.png',
  109: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Binghamton_University_logo.svg/120px-Binghamton_University_logo.svg.png',
  110: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9c/Clemson_University_Seal.svg/120px-Clemson_University_Seal.svg.png',
  111: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Rutgers_newark_univ_logo.png/120px-Rutgers_newark_univ_logo.png',
  112: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/Syracuse_University_seal.svg/120px-Syracuse_University_seal.svg.png',
  113: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/University_at_Buffalo_logo.svg/120px-University_at_Buffalo_logo.svg.png',
  114: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/UC_Riverside_logo.svg/120px-UC_Riverside_logo.svg.png',
  115: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Colorado_School_of_Mines_seal.svg/120px-Colorado_School_of_Mines_seal.svg.png',
  116: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8c/Drexel_University_seal.svg/120px-Drexel_University_seal.svg.png',
  117: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/New_Jersey_IT_logo.svg/120px-New_Jersey_IT_logo.svg.png',
  118: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Seal_of_Stevens_Institute_of_Technology.svg/120px-Seal_of_Stevens_Institute_of_Technology.svg.png',
  119: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/af/Pepperdine_University_seal.svg/120px-Pepperdine_University_seal.svg.png',
  120: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/University_of_Illinois_Chicago_wordmark.png/120px-University_of_Illinois_Chicago_wordmark.png',
  121: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ec/WPI_logo.svg/120px-WPI_logo.svg.png',
  122: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Yeshiva_univ_logo.png/120px-Yeshiva_univ_logo.png',
  123: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/American_University_logo.svg/120px-American_University_logo.svg.png',
  124: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Baylor_University_logo.svg/120px-Baylor_University_logo.svg.png',
  125: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/Howard_University_seal.svg/120px-Howard_University_seal.svg.png',
  126: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Marquette_University_seal.jpg/120px-Marquette_University_seal.jpg',
  127: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Rochester_Institute_of_Technology_Seal_%282018%29.svg/120px-Rochester_Institute_of_Technology_Seal_%282018%29.svg.png',
  128: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Southern_Methodist_University_seal.svg/120px-Southern_Methodist_University_seal.svg.png',
  129: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/UC_Santa_Cruz_logo.svg/120px-UC_Santa_Cruz_logo.svg.png',
  130: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/University_of_Delaware_Seal.svg/120px-University_of_Delaware_Seal.svg.png',
  131: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d1/University_of_South_Florida_seal.svg/120px-University_of_South_Florida_seal.svg.png',
  132: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Florida_International_University_logo.svg/120px-Florida_International_University_logo.svg.png',
  133: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Fordham_University_logo_2025.png/120px-Fordham_University_logo_2025.png',
  134: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Rutgers_camden_univ_logo.png/120px-Rutgers_camden_univ_logo.png',
  135: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/72/Texas_Christian_University_seal.svg/120px-Texas_Christian_University_seal.svg.png',
  136: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/UC_Boulder_logo.svg/120px-UC_Boulder_logo.svg.png',
  99: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Indiana_Hoosiers_logo.svg',
  64: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Seal_Williams_College.png/120px-Seal_Williams_College.png', // LAC
  65: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Amherst_College_logo.png/120px-Amherst_College_logo.png', // LAC
  66: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Swarthmore_logo_from_NCAA.svg/120px-Swarthmore_logo_from_NCAA.svg.png', // LAC
  67: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Bowdoin_college_blacklogo.png/120px-Bowdoin_college_blacklogo.png', // LAC
  68: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Claremont_McKenna_College_wordmark.png/120px-Claremont_McKenna_College_wordmark.png', // LAC
  69: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Pomona_College_logo.svg/120px-Pomona_College_logo.svg.png', // LAC
  70: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Formal_Logo_of_Wellesley_College%2C_Wellesley%2C_MA%2C_USA.svg/120px-Formal_Logo_of_Wellesley_College%2C_Wellesley%2C_MA%2C_USA.svg.png', // LAC
  71: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Carleton_College_logo.svg/120px-Carleton_College_logo.svg.png', // LAC
  72: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Harvey_Mudd_College_logo.svg/120px-Harvey_Mudd_College_logo.svg.png', // LAC
  73: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Barnard_College_logo.jpeg/120px-Barnard_College_logo.jpeg', // LAC
  74: 'https://commons.wikimedia.org/wiki/Special:FilePath/Davidson_College_logo_2023.svg?width=120', // LAC
  75: 'https://commons.wikimedia.org/wiki/Special:FilePath/Grinnell_College_logo.svg?width=120', // LAC
  76: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hamilton_College_logo.svg?width=120', // LAC
  77: 'https://commons.wikimedia.org/wiki/Special:FilePath/Middlebury_college_wmark.svg?width=120', // LAC
  78: 'https://commons.wikimedia.org/wiki/Special:FilePath/Smith_college_textlogo.svg?width=120', // LAC
  79: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Vassar_College_logo.svg/120px-Vassar_College_logo.svg.png', // LAC
  80: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Wesleyan_University_logo.svg/120px-Wesleyan_University_logo.svg.png', // LAC
  81: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Washington_and_lee_univ_seal.png/120px-Washington_and_lee_univ_seal.png', // LAC
  82: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Colgate_University_wordmark.svg/120px-Colgate_University_wordmark.svg.png', // LAC
  83: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/University_of_Richmond_logo.png/120px-University_of_Richmond_logo.png', // LAC
  84: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Bates_College_wordmark.svg/120px-Bates_College_wordmark.svg.png', // LAC
  85: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Colby_college_maine_seal.svg/120px-Colby_college_maine_seal.svg.png', // LAC
  86: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Haverford_college_wordmark.png/120px-Haverford_college_wordmark.png', // LAC
  87: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Holy_Cross_College_logo.jpg/120px-Holy_Cross_College_logo.jpg', // LAC
  88: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/MacalesterCollegeSeal.gif/120px-MacalesterCollegeSeal.gif', // LAC
  89: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Mount_Holyoke_College_logo.svg/120px-Mount_Holyoke_College_logo.svg.png', // LAC
  90: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Bryn_Mawr_College_logo.svg/120px-Bryn_Mawr_College_logo.svg.png', // LAC
  91: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Bucknell_University_logo.svg/120px-Bucknell_University_logo.svg.png', // LAC
  92: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Colorado_College_logo.svg/120px-Colorado_College_logo.svg.png', // LAC
  93: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Seal_of_Lafayette_College.jpg/120px-Seal_of_Lafayette_College.jpg', // LAC
  94: 'https://commons.wikimedia.org/wiki/Special:FilePath/Denison_University_seal2.png?width=120', // LAC
  95: 'https://commons.wikimedia.org/wiki/Special:FilePath/Franklin_marshall_college_logo.svg?width=120', // LAC
  96: 'https://commons.wikimedia.org/wiki/Special:FilePath/Occidental_College_logo.svg?width=120', // LAC
  97: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pitzer_college_textlogo.svg?width=120', // LAC
  98: 'https://commons.wikimedia.org/wiki/Special:FilePath/Scripps_College_logo.svg?width=120', // LAC
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
