# ADR-063 구현 상세 — SSOT 체인 정본 3-Domain 분할

본 문서는 ADR-063의 구현 상세만 담는다. 결정 근거/대안/위험은 ADR 본문 참조.

## 정본 파일 위치

- 최상위 규칙: `.claude/rules/ssot-hierarchy.md` — 3-domain 정의, 용어 사전, 경계 판정, 집행 메커니즘
- ADR 형식 정식화: 본 ADR-063

본 ADR이 프로젝트 charter 수준이지만 **세부 원칙은 규칙 파일이 정본**. ADR 본문은 결정 기록, 규칙 파일은 운영 참조.

## 소급 적용 매트릭스 (기존 ADR과의 정합성)

| ADR | 본 charter와의 관계 | 재해석 |
| --- | --- | --- |
| ADR-036 Spec-First | D3 내부 구체화 | "Spec=SSOT"는 D3 한정. D1/D2 침범 아님 |
| ADR-057 Text Spec-First Migration | D3 정리 (Text 컴포넌트 시각 SSOT 복원) | 정합 |
| ADR-058 Text Tags Legacy Dismantle | D3 정리 + Phase 5 Deferred는 D1 수용 | 정합 — Phase 5 Deferral은 "DOM 축 완성" 대신 "RAC 구조 존중" 선택 |
| ADR-059 Composite Field skipCSSGeneration | D3 내부 대칭 복원 | 정합 — variant 블로커는 ADR-062로 분리됨 |
| ADR-062 Field Spec RSP Conformance | D2 정리 | 정합 — framing을 "RSP=최우선"에서 "D1/D2/D3 분할"로 재배치 필요 (별도 amend) |
| ADR-100 Unified Skia Engine | D3 Builder consumer 통합 | 정합 — PixiJS 제거, Skia 단일화 |

## 소급 수정 필요 ADR

### ADR-036 (재승격 시)

- Status를 "Implemented"로 재승격 시 framing을 "시각 domain(D3) SSOT"로 명시
- Scope 경계를 Context에 추가: D1/D2 침범 없음 확인

### ADR-059 v2

- Status 블록의 "Blocked by ADR-062" 문구는 유지
- Context에 "D3 symmetric consumer 복원이 목적" 명시 (현재 이 문구 부재)
- 나머지 블로커(size/state/composition)는 "D3 내부 계약 확장" 성격으로 재분류

### ADR-062 (Field RSP Conformance)

- Context의 "RSP = 최우선 권위" framing을 **"D1/D2/D3 분할에서 D2 정리"**로 재작성
- Alternative C 기각 사유 3개가 여전히 유효하지만 추가로 "D2 규칙 위반"이 first principle
- 이는 ADR-062 커밋 전 amend 가능 (현재 uncommitted)

## 집행 로드맵

### Phase 0 — 현재 상태 (본 ADR 승인 시)

- `.claude/rules/ssot-hierarchy.md` 정본 파일 생성 ✅
- ADR-063 본문 + breakdown ✅
- `CLAUDE.md` 프로젝트 컨텍스트에 SSOT 체인 명시
- `docs/adr/README.md` ADR-063 등록

### Phase 1 — 문서 체계 정비

| 파일 | 변경 |
| --- | --- |
| `.claude/rules/react-aria-skill.md` | 3-domain 참조, D1 소유 명시 |
| `.claude/rules/adr-writing.md` | 신규 ADR Context에 domain 명시 의무화 |
| `.claude/rules/canvas-rendering.md` | Skia = D3 consumer 명시 |
| `.claude/rules/css-tokens.md` | CSS = D3 consumer 명시 |
| `.claude/skills/composition-patterns/SKILL.md` | 3-domain 개요 + 정본 규칙 포인터 |
| `.claude/skills/cross-check/SKILL.md` | 시각 결과 대칭 = D3 집행 수단 명시 |
| `.claude/skills/parallel-verify/SKILL.md` | 동일 |
| CLAUDE.md | SSOT 체인 섹션 신규 + 정본 규칙 포인터 |

### Phase 2 — agents 업데이트

| Agent | 변경 |
| --- | --- |
| architect | ADR 설계 시 3-domain 판정 의무 |
| implementer | 구현 시 domain 경계 확인 |
| reviewer | PR 리뷰 시 domain 위반 체크 |
| evaluator | 시각 대칭 검증 집행 |

### Phase 3 — 기존 ADR 소급 주석

ADR-036/057/058/059/062 각각 상단에 `> SSOT domain: D3 (시각 스타일)` 형태 헤더 추가.

### Phase 4 — memory 업데이트

- `MEMORY.md` 인덱스에 SSOT 체인 정본 섹션 신규
- `architecture-ssot-evolution.md` (기존) 업데이트 or `ssot-chain-definition.md` 신설

### Phase 5 — 검증

- `pnpm type-check` 통과 (코드 변경 없으므로 자동)
- 신규 ADR 발의 시 domain 필드 존재 확인 (리뷰 단계)
- 기존 skill/agent 호출 시 domain 판단 통합 확인

## 변경 파일 규모

| 레이어 | 파일 수 | 성격 |
| --- | --- | --- |
| 정본 규칙 신규 | 1 | `ssot-hierarchy.md` |
| ADR 신규 | 2 | ADR-063 본문 + breakdown |
| 기존 규칙 업데이트 | 4 | react-aria / adr-writing / canvas-rendering / css-tokens |
| 기존 skill 업데이트 | 3 | composition-patterns / cross-check / parallel-verify |
| 기존 agent 업데이트 | 4 | architect / implementer / reviewer / evaluator |
| 프로젝트 컨텍스트 | 1 | CLAUDE.md |
| 기존 ADR 소급 | 5 | 036 / 057 / 058 / 059 / 062 (각 1줄 헤더) |
| ADR README | 1 | 063 등록 |
| memory | 2 | MEMORY.md + ssot-chain-definition.md |
| **총계** | **~23** | 대부분 포인터 업데이트 |

## 롤백 전략

- 정본 규칙 파일 삭제 시 모든 포인터가 깨짐 → 전면 revert 단위
- 단, 본 ADR은 **기존 관행의 명문화**이므로 실질 코드 영향 0. 문서 revert만으로 롤백 완료
