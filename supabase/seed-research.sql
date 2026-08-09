-- 연구 모듈 시드 (R1) — 실제 문항은 사용자가 별도 제공 (PLACEHOLDER)
delete from quiz_items;
insert into quiz_items (id, question, answer, explanation_2lines, sort_order) values
(1, 'PLACEHOLDER — 입시 상식 OX 문항 1', true, E'PLACEHOLDER 해설 첫째 줄\nPLACEHOLDER 해설 둘째 줄', 10),
(2, 'PLACEHOLDER — 입시 상식 OX 문항 2', false, E'PLACEHOLDER 해설 첫째 줄\nPLACEHOLDER 해설 둘째 줄', 20),
(3, 'PLACEHOLDER — 입시 상식 OX 문항 3', true, E'PLACEHOLDER 해설 첫째 줄\nPLACEHOLDER 해설 둘째 줄', 30),
(4, 'PLACEHOLDER — 입시 상식 OX 문항 4', false, E'PLACEHOLDER 해설 첫째 줄\nPLACEHOLDER 해설 둘째 줄', 40),
(5, 'PLACEHOLDER — 입시 상식 OX 문항 5', true, E'PLACEHOLDER 해설 첫째 줄\nPLACEHOLDER 해설 둘째 줄', 50);

delete from clarity_items;
insert into clarity_items (id, question, sort_order) values
(1, 'PLACEHOLDER — 진로 명확성 문항 1', 10),
(2, 'PLACEHOLDER — 진로 명확성 문항 2', 20),
(3, 'PLACEHOLDER — 진로 명확성 문항 3', 30),
(4, 'PLACEHOLDER — 진로 명확성 문항 4', 40);
