-- 연구 모듈 시드 (R1) — 확정 실문항 (사용자 제공, FINAL_PATCH_AND_BOARD_v2 §1, 2026-08-10 교체)
delete from quiz_items;
insert into quiz_items (id, question, answer, explanation_2lines, sort_order) values
(1, 'test-optional 학교는 SAT 점수를 제출해도 평가에 반영하지 않는다', false, E'제출하면 반영됨.\n"선택"은 제출 여부가 선택이라는 뜻이고, 범위 안의 좋은 점수라면 내는 쪽이 유리한 경우가 많음', 10),
(2, 'ED(Early Decision)로 합격해도 다른 학교 결과를 보고 등록을 결정할 수 있다', false, E'ED 합격은 등록 의무가 있음.\n다른 지원은 철회해야 하며, 그래서 ED는 진짜 1지망에만 쓰는 카드임', 20),
(3, 'need-blind는 그 학교가 장학금을 많이 준다는 뜻이다', false, E'재정지원을 신청해도 합격 심사에 영향이 없다는 뜻.\n지원금을 얼마나 주는지는 별개의 문제라 따로 확인해야 함', 30),
(4, '전공은 어차피 입학 후에 정하니까, 지원할 때 전공 선택은 중요하지 않다', false, E'전공 단위로 뽑는(direct-admit) 학교가 많음.\n특히 CS·공학·간호는 지원 전공이 합격 난도를 바꾸고 전과도 어려움', 40),
(5, '대학이 발표하는 전체 합격률은 국제학생에게도 거의 그대로 적용된다', false, E'국제학생 합격률은 보통 전체보다 낮고 따로 집계됨.\n목표를 잡을 땐 국제학생 기준 숫자를 봐야 함', 50);

delete from clarity_items;
insert into clarity_items (id, question, sort_order) values
(1, '내가 어떤 전공을 원하는지 명확하다', 10),
(2, '내 성적·활동이 목표 대학 수준에 맞는지 스스로 판단할 수 있다', 20),
(3, '지금 학년에 무엇을 준비해야 하는지 알고 있다', 30),
(4, '미국 입시 절차(지원 방식·마감·서류)를 이해하고 있다', 40);
