---
description: ADR 문서 작성/편집 시 Risk-First Design Loop 가이드라인 적용
globs:
  - "docs/adr/**"
---

# ADR 작성 규칙 — Risk-First Design Loop

> **SSOT 체인 연계 (CRITICAL)**: 새 ADR의 Context 섹션에 **3-domain 분할(D1 DOM/접근성 / D2 Props/API / D3 시각 스타일) 중 어느 것에 해당하는지** 명시 필수. 경계 교차 시 정당화 필요. 정본 원칙: [ssot-hierarchy.md](ssot-hierarchy.md). 공식 결정: [ADR-063](../../docs/adr/063-ssot-chain-charter.md).

## 왜 이 프로세스인가

ADR의 목적은 **미래의 개발자가 "왜 이렇게 결정했는가"를 이해하는 것**이다. 결론을 먼저 쓰고 위험을 나중에 붙이면 confirmation bias가 작동하여 위험이 과소 평가된다. 대안을 먼저 나열하고, 각각의 위험을 독립 평가한 뒤, 그 결과로 결정을 내려야 사후 합리화를 방지할 수 있다.

## 필수 순서 (CRITICAL)

```
[금지]  Context → Decision → Consequences/Risks (결론 먼저, 위험 나중)
[필수]  Context → Alternatives → Risk per Alternative → Threshold Check → Decision → Gates
```

## 작성 순서 — 스캐폴딩 먼저 (CRITICAL)

```
[금지]  내용 작성 → 파일 저장 → 체크리스트 → 위반 발견 → 사후 분리
[필수]  1. ADR 섹션 스캐폴딩 (빈 섹션 헤더만)
        2. design 파일 먼저 생성 (구현 상세 대상이면)
        3. Decision 직후에 `> 구현 상세: [링크]` 포인터 배치
        4. 각 섹션 내용 채움 (구현 상세는 design 파일에만)
        5. 체크리스트 최종 검증
```

대화 맥락에 분석 데이터가 이미 있어도 ADR 본문에 직접 삽입 금지. 구현 상세(Phase, 파일 목록, 체크리스트, 코드 예시)는 반드시 `docs/design/*-breakdown.md`에 분리.

## 섹션별 요구사항

### Context

- **측정 가능한 제약** (hard constraints): 성능 수치(60fps, <3초, <500KB), API 계약, 하위 호환
- **측정 불가능한 제약**: 팀 역량, 일정, 외부 의존성 성숙도
- 제약이 없으면 결정의 자유도가 무한 → Context가 약하면 Decision도 약하다

### Alternatives Considered

- **최소 2개, 권장 3개** — 하나의 접근법만 제시하는 것은 ADR이 아니라 제안서
- 외부 리서치 근거 포함 (경쟁사, 오픈소스, 업계 패턴). 리서치 없이 직관만으로 대안 나열 금지
- 직관적 "정답"도 대안 중 하나일 뿐
- 각 대안에 4축 위험 평가 필수 (아래 참조)

### Decision

- 선택된 대안 + **위험 수용 근거** ("왜 이 대안의 잔존 위험이 수용 가능한가")
- **기각된 대안별 기각 사유** 명시 — 미래의 개발자가 "대안 A를 왜 안 했지?"를 물어보지 않게
- 구현 상세(phase, 파일 경계, 작업 순서)는 `docs/design/*-breakdown.md`로 분리. ADR에는 `> 구현 상세: [링크]` 포인터만

### Gates

- 선택된 대안에 HIGH 위험이 남아있으면 Gate 테이블 필수
- HIGH 위험이 없으면 "잔존 HIGH 위험 없음" 명시
- Gate 테이블 형식:

| Gate | 시점 | 통과 조건 | 실패 시 대안 |
| ---- | ---- | --------- | ------------ |

### Consequences

- Positive / Negative 분리
- 구체적 영향 명시 (어떤 파일, 어떤 워크플로우에 영향)

## 위험 평가 4축

| 축            | 평가 내용                        |
| ------------- | -------------------------------- |
| 기술 위험     | 미검증 기술, 복잡도, 외부 의존성 |
| 성능 위험     | FPS, 번들, 로딩, 메모리          |
| 유지보수 위험 | 향후 변경 비용, 결합도           |
| 마이그레이션  | 롤백 난이도, 하위 호환           |

등급: **LOW** / **MEDIUM** / **HIGH** / **CRITICAL**

## Risk Threshold Check (필수 루프)

- 모든 대안이 HIGH 1개 이상 → 위험을 회피하는 새 대안 추가
- 어떤 대안이든 CRITICAL 1개 이상 → 근본적으로 다른 접근 추가
- 최대 2회 루프 후에도 HIGH 이상이면 "위험 수용 근거" 명시

## Status 전이 규칙

```
Proposed → Accepted    : Decision 섹션이 Gate를 모두 통과, 또는 Gate 없이 합의 완료
Accepted → Implemented : 코드가 main에 머지, 검증 통과
Any      → Deprecated  : 더 이상 유효하지 않으나 후속 ADR 없음
Any      → Superseded  : 후속 ADR이 이 결정을 대체. 본문 상단에 "Superseded by ADR-NNN" 필수
```

- Superseded 시 **후속 ADR 링크 필수** — 체인이 끊기면 히스토리 추적 불가
- Status 변경 시 `docs/adr/README.md` 테이블도 동시 갱신

## 템플릿

```markdown
# ADR-NNN: [Title]

## Status

Proposed — YYYY-MM-DD

## Context

[문제 설명 + hard constraints + soft constraints]

## Alternatives Considered

### 대안 A: [이름]

- 설명: ...
- 위험: 기술(L/M/H/C) / 성능(L/M/H/C) / 유지보수(L/M/H/C) / 마이그레이션(L/M/H/C)

### 대안 B: [이름]

- 설명: ...
- 위험: 기술(L/M/H/C) / 성능(L/M/H/C) / 유지보수(L/M/H/C) / 마이그레이션(L/M/H/C)

### Risk Threshold Check

[대안별 HIGH+ 요약 테이블 + 루프 판정]

## Decision

[선택된 대안 + 위험 수용 근거 + 기각된 대안별 기각 사유]

> 구현 상세: [NNN-title-breakdown.md](../design/NNN-title-breakdown.md)

## Gates

[Gate 테이블 또는 "잔존 HIGH 위험 없음"]

## Consequences

### Positive

### Negative
```

## 검증 체크리스트 (작성 완료 시)

ADR 작성 후 아래를 자가 검증한다. 하나라도 실패하면 해당 섹션 보강:

- [ ] Context에 측정 가능한 hard constraint가 1개 이상 있는가?
- [ ] 대안이 2개 이상이고, 각각 4축 위험 평가가 있는가?
- [ ] Risk Threshold Check 테이블이 있고, HIGH+ 대안에 대한 루프 판정이 있는가?
- [ ] Decision에 기각된 대안의 기각 사유가 있는가?
- [ ] 구현 상세가 ADR 본문이 아닌 design 문서에 있는가? (또는 구현 상세가 불필요한 수준인가?)
- [ ] Gate가 있거나, "잔존 HIGH 위험 없음"이 명시되어 있는가?

## 금지 패턴

- Context → Decision → Risks 순서 (결론 먼저 금지)
- 대안 1개만 제시 (비교 없는 결정 금지)
- 위험 평가 없는 결정
- 기각된 대안에 기각 사유 없음
- 구현 상세를 ADR 본문에 장문으로 포함 (Phase 목록, 파일 변경표, 체크리스트, 코드 예시 포함)
- 내용 먼저 작성 후 구조 검증 (스캐폴딩 먼저 필수)
- Superseded 시 후속 ADR 링크 누락
- Status 변경 시 README.md 미갱신
