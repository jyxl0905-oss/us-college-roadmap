// 지원 방식 가이드 콘텐츠 — Common App Application Dictionary(2026-09)·Common App ED 동의서(2026)·NACAC Guide to Ethical Practice(2026-08)·
// College Board BigFuture·각 대학 공식 입학처 페이지 기준 (2026-11-21 확인). 마감 분포는 이 사이트 학교 데이터(공식 입학처 확인분) 집계.
// [한국어, 영어] 쌍

export type PlanKey = 'ed' | 'ed2' | 'ea' | 'rea' | 'rd' | 'rolling'
type KE = [string, string]

export interface Plan {
  key: PlanKey; short: string; full: string; binding: boolean
  oneLine: KE; bindingText: KE; others: KE; deadline: KE; decision: KE
  points: KE[]; caution?: KE
}

export const PLANS: Plan[] = [
  {
    key: 'ed', short: 'ED', full: 'Early Decision', binding: true,
    oneLine: ['합격하면 꼭 가는 조기 지원', 'Binding early application'],
    bindingText: ['예 (구속력 있음)', 'Yes (binding)'],
    others: ['ED는 한 곳만. 다른 학교 EA·RD는 가능', 'Only one ED; other EA/RD allowed'],
    deadline: ['대부분 11월 초~중순', 'Mostly early–mid Nov'],
    decision: ['보통 12월 중순', 'Usually mid-Dec'],
    points: [
      ['합격하면 그 학교에 등록하겠다고 약속하는 방식이에요. ED는 딱 한 학교에만 쓸 수 있어요.', 'You promise to enroll if admitted. You can apply ED to only one college.'],
      ['다른 학교에 EA·RD로 같이 지원하는 건 괜찮아요. 대신 ED로 합격하면 다른 학교 원서를 모두 철회하고, 새로 지원하지도 않아야 해요.', 'You may apply elsewhere EA or RD, but if admitted ED you must withdraw all other applications and not file new ones.'],
      ['학생·부모(보호자)·학교 카운슬러 세 명이 ED 동의서(Early Decision Agreement)에 서명해요.', 'The student, a parent/guardian and the school counselor all sign the Early Decision Agreement.'],
      ['재정지원 결과를 받기 전까지는 다른 학교 원서를 철회하지 않아도 돼요. 받은 재정지원으로 다닐 수 없으면 약속에서 풀려날 수 있어요(NACAC 윤리 기준, 예: Dartmouth).', 'You don’t have to withdraw other applications until you receive the ED school’s aid offer, and you can be released if that aid doesn’t make attendance possible (NACAC; e.g., Dartmouth).'],
      ['국제학생이 재정지원이 필요하면 더 신중해야 해요. 국제학생은 재정지원 신청이 심사에 영향을 줄 수 있는 학교(need-aware, 예: Northwestern)가 많고, 국제학생 장학금 지원자에게 RD를 권해 온 학교도 있어요(예: Carleton).', 'International students who need aid should be extra careful: many schools are need-aware for international applicants (e.g., Northwestern), and some have asked international scholarship applicants to use RD (e.g., Carleton).'],
    ],
    caution: ['동의서에는 ED 학교가 내 이름과 ED 약속을 다른 대학과 공유할 수 있다는 내용도 있어요. 두 곳에 ED를 내면 안 돼요.', 'The agreement lets colleges share your name and ED commitment with each other — never apply ED to two schools.'],
  },
  {
    key: 'ed2', short: 'ED2', full: 'Early Decision II', binding: true,
    oneLine: ['마감만 늦은 ED (역시 구속력)', 'ED with a later deadline (still binding)'],
    bindingText: ['예 (구속력 있음)', 'Yes (binding)'],
    others: ['ED1과 마찬가지로 한 곳만', 'Only one, like ED1'],
    deadline: ['대부분 1월 초~중순', 'Mostly early–mid Jan'],
    decision: ['보통 2월 중순', 'Usually mid-Feb'],
    points: [
      ['규칙은 ED와 똑같고 마감만 늦어요. 합격하면 꼭 가야 해요.', 'Same rules as ED, just a later deadline. Binding if admitted.'],
      ['ED1에서 불합격·보류된 뒤 다른 학교에 한 번 더 "1지망" 카드를 쓸 수 있는 기회예요.', 'A second chance to make a binding first-choice commitment after an ED1 denial or deferral.'],
      ['예: Tufts는 2027년 1월 4일 마감, 2월 중순 발표, WashU는 1월 4일 마감, 2월 12일까지 발표예요.', 'E.g., Tufts: due Jan 4, 2027, decisions mid-Feb; WashU: due Jan 4, decisions by Feb 12.'],
    ],
  },
  {
    key: 'ea', short: 'EA', full: 'Early Action', binding: false,
    oneLine: ['일찍 내고 일찍 받지만 약속은 없음', 'Apply early, no commitment'],
    bindingText: ['아니요', 'No'],
    others: ['여러 학교에 EA 가능 (학교별 예외 있음)', 'EA to many schools (some exceptions)'],
    deadline: ['대부분 11월 초~중순', 'Mostly early–mid Nov'],
    decision: ['보통 12월~2월', 'Usually Dec–Feb'],
    points: [
      ['일찍 지원해서 결과를 일찍 받는 방식이에요. 합격해도 꼭 갈 필요가 없고, 5월 1일까지 고민할 수 있어요.', 'Apply early and hear early. Admission is non-binding and you have until May 1 to decide.'],
      ['여러 학교에 동시에 EA로 지원할 수 있어요.', 'You can apply EA to several colleges at once.'],
    ],
    caution: ['EA인데 조건이 붙은 학교도 있어요. 예: Georgetown EA 지원자는 다른 학교 ED(ED2 포함)에 지원할 수 없어요.', 'Some EA plans have conditions — e.g., Georgetown EA applicants may not apply ED (including ED2) elsewhere.'],
  },
  {
    key: 'rea', short: 'REA·SCEA', full: 'Restrictive / Single-Choice Early Action', binding: false,
    oneLine: ['약속은 없지만 다른 조기 지원을 제한', 'Non-binding, but limits other early apps'],
    bindingText: ['아니요', 'No'],
    others: ['다른 사립대 조기 지원 제한 (학교마다 다름)', 'Limits other private early apps (varies)'],
    deadline: ['11월 초', 'Early Nov'],
    decision: ['보통 12월 중순', 'Usually mid-Dec'],
    points: [
      ['합격해도 꼭 갈 필요는 없지만, 그 대신 다른 학교 조기 지원을 제한하는 방식이에요. Harvard·Stanford·Notre Dame은 REA, Yale·Princeton은 SCEA라고 불러요.', 'Non-binding, but restricts your other early applications. Harvard, Stanford and Notre Dame call it REA; Yale and Princeton call it SCEA.'],
      ['다른 학교의 RD·롤링 지원은 막지 않는 게 원칙이에요(NACAC 기준).', 'Colleges shouldn’t restrict other schools’ Regular or Rolling plans (NACAC).'],
      ['무엇을 같이 쓸 수 있는지는 학교마다 꽤 달라요. 아래 표를 확인하세요.', 'What else you may apply to varies a lot by school — see the table below.'],
    ],
    caution: ['Yale은 SCEA에서 불합격하면 같은 해 RD로 다시 지원할 수 없어요.', 'At Yale, applicants denied in SCEA can’t reapply Regular Decision the same year.'],
  },
  {
    key: 'rd', short: 'RD', full: 'Regular Decision', binding: false,
    oneLine: ['일반 지원', 'Standard application'],
    bindingText: ['아니요', 'No'],
    others: ['제한 없음', 'No restrictions'],
    deadline: ['대부분 1월 초~2월 초', 'Mostly early Jan–early Feb'],
    decision: ['보통 3월 말~4월 초', 'Usually late Mar–early Apr'],
    points: [
      ['정해진 마감까지 지원하고, 정해진 시기에 결과를 받는 일반 방식이에요. 합격해도 꼭 갈 필요는 없어요.', 'Apply by a set date and hear back in a stated period. Non-binding.'],
      ['예: Princeton 1월 1일, Yale 1월 2일, Stanford 1월 5일 마감이고 3월 말~4월 초에 발표해요.', 'E.g., Princeton Jan 1, Yale Jan 2, Stanford Jan 5 deadlines, with decisions late March–early April.'],
    ],
  },
  {
    key: 'rolling', short: 'Rolling', full: 'Rolling admission', binding: false,
    oneLine: ['들어오는 대로 심사', 'Reviewed as they arrive'],
    bindingText: ['아니요', 'No'],
    others: ['제한 없음', 'No restrictions'],
    deadline: ['최종 마감 전 아무 때나', 'Any time before the final closing date'],
    decision: ['원서마다 수시로', 'Throughout the year'],
    points: [
      ['서류가 다 갖춰지는 대로 하나씩 심사해서 1년 내내 결과를 내는 방식이에요.', 'Each application is reviewed once complete, with decisions throughout the year.'],
      ['최종 마감 전까지 아무 때나 낼 수 있어요. 장학금 우선 검토 마감이 따로 있는 학교도 있으니 학교 페이지를 확인하세요.', 'You can apply any time before the final closing date; some schools have a priority date for scholarships.'],
    ],
  },
]

export const TIMELINE: { when: KE; what: KE }[] = [
  { when: ['11월 초~중순', 'Early–mid Nov'], what: ['ED·EA·REA 마감', 'ED, EA and REA deadlines'] },
  { when: ['12월 중순', 'Mid-Dec'], what: ['ED·REA 결과 (합격·불합격·보류)', 'ED and REA decisions (admit, deny, defer)'] },
  { when: ['1월 초~중순', 'Early–mid Jan'], what: ['RD·ED2 마감 (1월 1~5일이 많아요)', 'RD and ED2 deadlines (often Jan 1–5)'] },
  { when: ['2월 중순', 'Mid-Feb'], what: ['ED2 결과', 'ED2 decisions'] },
  { when: ['3월 말~4월 초', 'Late Mar–early Apr'], what: ['RD 결과', 'RD decisions'] },
  { when: ['5월 1일', 'May 1'], what: ['등록 결정 마감 (National Candidates Reply Date) — ED 합격자는 예외', 'Enrollment reply date (National Candidates Reply Date) — ED admits are the exception'] },
]

export const OUTCOMES: { title: KE; body: KE }[] = [
  { title: ['합격 (Admit)', 'Admit'], body: ['ED면 재정지원을 확인한 뒤 다른 원서를 모두 철회해요. EA·REA면 5월 1일까지 고민할 수 있어요.', 'ED: confirm aid, then withdraw all other applications. EA/REA: you have until May 1.'] },
  { title: ['불합격 (Deny)', 'Deny'], body: ['그해 그 학교의 최종 결과예요(예: Yale은 SCEA 불합격자가 같은 해 RD로 다시 지원할 수 없다고 밝혀요). 남은 RD·ED2 학교 목록을 점검하세요.', 'That school’s final decision for the year (e.g., Yale says SCEA denials can’t reapply RD). Review your remaining RD/ED2 list.'] },
  { title: ['보류 (Defer)', 'Defer'], body: ['불합격이 아니라 RD에서 다시 심사받는 거예요. 다시 지원할 필요는 없고, 12학년 성적을 유지하고 새 점수·수상 같은 업데이트를 보내면 돼요. ED에서 보류되면 더 이상 구속력이 없어요(예: Tufts).', 'Not a denial — you’re reviewed again in RD. No need to reapply; keep senior grades strong and send new scores or honors. A deferred ED application is no longer binding (e.g., Tufts).'] },
]

// REA·SCEA 학교별로 같이 쓸 수 있는 것 — 각 학교 공식 페이지 (2026-11-21 확인)
export const REA_RULES: { school: string; ko: string; plan: string; allows: KE; url: string }[] = [
  { school: 'Harvard', ko: '하버드', plan: 'REA', url: 'https://college.harvard.edu/resources/faq/if-i-apply-restrictive-early-action-harvard-may-i-apply-another-colleges-early',
    allows: ['공립대·해외 대학 EA(구속력 없는 것) 가능. 다른 사립대 조기 지원은 불가. ED는 하버드 결과(12월 중순) 뒤에만 — 그 뒤엔 ED2 포함 무엇이든 가능.', 'Non-binding EA at public or non-U.S. universities is fine; no other private early plans. No ED until Harvard’s mid-December decisions — after that, any plan including ED2.'] },
  { school: 'Yale', ko: '예일', plan: 'SCEA', url: 'https://admissions.yale.edu/single-choice-early-action',
    allows: ['구속력 없는 롤링, 공립대의 구속력 없는 조기 지원, 해외 대학, 1월 1일 이후 발표하는 ED·EA(=ED2) 가능.', 'Non-binding rolling, non-binding early plans at public universities, non-U.S. universities, and ED/EA plans that notify after January 1 (i.e., ED2).'] },
  { school: 'Princeton', ko: '프린스턴', plan: 'SCEA', url: 'https://admission.princeton.edu/apply/first-year-application-dates-deadlines',
    allows: ['미국 사립대 조기 지원 불가. 공립대·사관학교·해외 대학의 구속력 없는 조기 지원과 구속력 없는 롤링은 가능.', 'No early plans at other U.S. private colleges. Non-binding early plans at public universities, service academies and non-U.S. universities, and non-binding rolling, are fine.'] },
  { school: 'Stanford', ko: '스탠퍼드', plan: 'REA', url: 'https://admission.stanford.edu/apply/first-year/decision_process.html',
    allows: ['다른 사립대의 조기 지원(EA·ED 등)과 공립대 ED는 불가. 해외 대학(구속력 없는 것)·사관학교·조기 마감이 필수인 장학 프로그램은 가능. ED2는 스탠퍼드에서 불합격·보류된 경우에만.', 'No early plans (EA, ED, etc.) at other private colleges and no binding ED at public universities. Non-binding non-U.S. universities, military academies and scholarship programs that require early application are fine. ED2 only if Stanford denies or defers you.'] },
  { school: 'Notre Dame', ko: '노터데임', plan: 'REA', url: 'https://admissions.nd.edu/apply/decision-planning/',
    allows: ['다른 사립·공립대 EA 가능. ED1은 불가. ED2는 가능하지만 거기 합격하면 노터데임 원서를 철회해야 해요.', 'EA at other private or public colleges is fine; no ED1. ED2 is allowed, but if admitted there you must withdraw from Notre Dame.'] },
  { school: 'Georgetown', ko: '조지타운', plan: 'EA (ED 제한)', url: 'https://uadmissions.georgetown.edu/early-action-program/',
    allows: ['REA라고 부르진 않지만, EA 지원자는 다른 학교 ED1·ED2에 동시에 지원할 수 없어요. 보류된 학생만 이후 자유롭게 지원 가능.', 'Not called REA, but EA applicants may not apply to any ED1 or ED2 program; only deferred students are then free to apply elsewhere.'] },
]

export const SOURCES: { label: string; url: string }[] = [
  { label: 'Common App — Application Dictionary (2026-09)', url: 'https://www.commonapp.org/static/eb936e0080b0c7535a04c720aabf4b75/Application-Dictionary_0.pdf' },
  { label: 'Common App — Early Decision Agreement (2026)', url: 'https://apply.jhu.edu/wp-content/uploads/2026/08/2026_EDagreement.pdf' },
  { label: 'NACAC — Guide to Ethical Practice in College Admission (2026)', url: 'https://www.nacacnet.org/wp-content/uploads/NACAC-Guide-to-Ethical-Practice-in-College-Admission.pdf' },
  { label: 'College Board BigFuture — Facts about early decision and early action', url: 'https://bigfuture.collegeboard.org/plan-for-college/apply-to-college/facts-about-early-decision-and-early-action' },
  { label: 'College Board BigFuture — What’s deferred admission?', url: 'https://bigfuture.collegeboard.org/help-center/whats-deferred-admission' },
  { label: 'Dartmouth — ED release for financial reasons', url: 'https://admissions.dartmouth.edu/glossary-question/i-was-admitted-early-decision-cannot-enroll-due-financial-reasons-can-i-be' },
  { label: 'Tufts — Early Decision', url: 'https://admissions.tufts.edu/apply/applying-to-tufts/early-decision/' },
  { label: 'Georgetown — Early Action program', url: 'https://uadmissions.georgetown.edu/early-action-program/' },
  { label: 'Northwestern — International applicants (need-aware)', url: 'https://admissions.northwestern.edu/apply/identities/international.html' },
  { label: 'Carleton — International applicants', url: 'https://www.carleton.edu/international/applying/' },
]
