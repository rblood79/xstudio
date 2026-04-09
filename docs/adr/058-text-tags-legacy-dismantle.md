# ADR-058: TEXT_TAGS 예외 경로 해체 — Text/Heading/Paragraph/Kbd/Code Spec-First 전환

## Status

Proposed — 2026-04-10

## 원칙

본 ADR의 원칙 선언은 [ADR-057 §원칙](./057-text-spec-first-migration.md#원칙--spec-ssot--symmetric-consumers-adr-036-준수)을 그대로 상속한다.

핵심:

- **Spec이 SSOT**, CSS/Skia는 대등한 consumer
- **ADR-058의 본질**: Phase B bias(프로젝트 초기 CSS 단일 엔진 시대의 "CSS가 기준" 멘탈 모델)의 잔존물인 `buildTextNodeData` 경로를 정리하여 Text/Heading/Paragraph/Kbd/Code를 spec source로 복귀시킨다. "CSS↔Skia 맞춤"이 아니라 **"잘못 배치된 consumer의 재배치"**이다.

## Context

ADR-057이 `specShapeConverter` text shape에 13개 feature parity를 이식하여 spec 경로가 충분한 표현력을 확보하면, `Text`/`Heading`/`Paragraph`/`Kbd`/`Code`가 `buildTextNodeData` 예외 경로에서 spec 경로로 이전할 수 있게 된다. 본 ADR은 이 이전 작업을 다룬다.

### 현재 예외 상태

| 컴포넌트    | spec 존재 | `shapes()` 정의 | `skipCSSGeneration` | 렌더 경로                           |
| ----------- | --------- | --------------- | ------------------- | ----------------------------------- |
| `Text`      | ✅        | **`() => []`**  | `true`              | **`buildTextNodeData` 예외 경로**   |
| `Heading`   | ✅        | **`() => []`**  | `true`              | **`buildTextNodeData` 예외 경로**   |
| `Paragraph` | **❌**    | —               | —                   | **spec 부재, `TEXT_TAGS`에만 등록** |
| `Kbd`       | **❌**    | —               | —                   | **spec 부재, `TEXT_TAGS`에만 등록** |
| `Code`      | **❌**    | —               | —                   | **spec 부재, `TEXT_TAGS`에만 등록** |

### 5-point patch 증상 (2026-04-09 발생)

`Text` 컴포넌트의 `size` prop 변경이 CSS/Skia 모두에 반영되지 않는 버그로 **5개 경로 동시 패치**(`f140f173`)가 이루어졌다:

1. `buildTextNodeData.ts` — `textStyle.fontSize || preset` 패턴에서 preset이 무시되는 버그
2. `LayoutRenderers.renderText` — `data-size` 속성 및 size-aware 스타일 미주입
3. `layout/engines/utils.ts` `calculateContentWidth` — `extractSpecTextStyle("text")`가 빈 shapes[] 때문에 null 반환
4. `layout/engines/utils.ts` `calculateContentHeight` — TEXT_LEAF_TAGS 경로 fontSize 해석 누락
5. `layout/engines/utils.ts` `enrichWithIntrinsicSize` — intrinsic width 계산 시 size preset 누락

이 5곳이 `getTextPresetFontSize()` 헬퍼를 독립적으로 호출하는 구조는 SSOT 원칙 위반이며, `Text.spec.ts`의 `shapes()`가 빈 배열을 반환하는 것이 근본 원인이다. **본 ADR은 이 근본 원인을 제거한다**.

### Hard Constraints

1. **ADR-057 Phase A/B 완료 + Gate 통과 필수** — 선결 조건 (feature parity 미확보 시 본 ADR 착수 금지)
2. **Text/Heading의 5-point patch 완전 제거** — `getTextPresetFontSize` 헬퍼의 분산 호출 소멸
3. **TextEditOverlay (ADR-027) 무회귀** — Text/Heading의 인라인 텍스트 편집이 auto-generated CSS 경로 전환 후에도 정상 동작
4. **Preview DOM semantic element 불변** — Text → `<p>`, Heading → `<h1~h6>`, Paragraph → `<p>`, Kbd → `<kbd>`, Code → `<code>`
5. **`TEXT_LEAF_TAGS` layout 엔진 셋 유지** — `enrichWithIntrinsicSize`/2-pass reflow에 load-bearing. `paragraph`/`kbd`/`code`는 lowercase로 **추가** 등록
6. **CSS ↔ Skia 정합성 ≤1px** — ADR-057이 보장한 feature parity로 이 제약 충족
7. **generated/Text.css `undefined` 값 원인 선행 해결** — `skipCSSGeneration: true` 제거 전제

### Soft Constraints

- `className`, CSS cascade, media query, theme variable로 텍스트 자유 제어 (현재 inline style 패치는 불가)
- 향후 `Strong`, `Em`, `Blockquote`, `Abbr` 등 HTML 의미론적 태그 추가 시 동일 spec 패턴으로 확장
- ADR-056 (Base Typography SSOT)과 시너지 — spec 경로 통일 후 단일 주입 지점

## 의존성

- **ADR-057 Phase A 완료** (필수): Layout feature 이식
- **ADR-057 Phase B 완료** (필수): Paint feature 이식
- **ADR-027 (Inline Text Editing)** 현황: Phase C 완료 상태. 본 ADR Phase 2에서 호환성 검증
- **ADR-056 (Base Typography SSOT)** 병행 권장: ADR-058 선행 → ADR-056은 단일 주입 지점만 수정

## Alternatives Considered

### 대안 A: 현상 유지 (5-point patch 영속화)

- 설명: ADR-057 완료 후에도 `buildTextNodeData` 경로를 유지. 향후 새 text 컴포넌트 추가 시 동일 헬퍼를 소비하도록 가이드라인화.
- 근거: 최소 변경, 회귀 위험 제로
- 위험:
  - 기술: L — 변경 없음
  - 성능: L
  - 유지보수: **H** — 5곳 동기화 부담 영구화, Text가 spec SSOT 외부에 영구 고립
  - 마이그레이션: L

### 대안 B: 일괄 전환 (5개 컴포넌트 동시 마이그레이션)

- 설명: 5개 컴포넌트를 단일 Phase에서 일괄 spec 경로로 전환.
- 근거: 작업 기간 단축
- 위험:
  - 기술: M — 5개 동시 전환 시 회귀 원인 추적 어려움
  - 성능: L
  - 유지보수: L
  - 마이그레이션: **H** — Rollback 단위가 거대함. 실패 시 전체 롤백

### 대안 C: 점진적 전환 — Heading → Text → Paragraph/Kbd/Code (본 제안)

- 설명: 시험대(Heading)를 먼저 전환하고 Gate 통과 시 Text, 이후 신설 컴포넌트(Paragraph/Kbd/Code) 순서로 진행.
- 근거:
  - Heading은 가장 단순한 구조(level만 다른 6개 변형) → 시험대로 적합
  - Text는 5-point patch의 직접 당사자이므로 Heading 후속으로 검증
  - Paragraph/Kbd/Code는 spec 부재이므로 신설 작업 — Heading/Text 패턴 복제 가능
  - Phase별 rollback 가능, 부분 완료 상태에서도 정합성 유지
- 위험:
  - 기술: M — 각 Phase 내부 전환은 검증된 패턴 적용
  - 성능: L
  - 유지보수: L
  - 마이그레이션: **H** — 4 Phase coordinated 변경, 신규 컴포넌트 3개 spec 작성

### 대안 D: TEXT_TAGS 태그만 제거하고 `buildTextNodeData`는 legacy로 유지

- 설명: `TEXT_TAGS`에서 5개 태그만 제거하여 spec 경로로 라우팅. `buildTextNodeData` 파일은 legacy/deprecated 상태로 보존.
- 근거: 롤백 안전성
- 위험:
  - 기술: M
  - 성능: L
  - 유지보수: **M** — `buildTextNodeData`가 호출자 없이 잔존 → dead code
  - 마이그레이션: M

### Risk Threshold Check

| 대안                        | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| --------------------------- | ---- | ---- | -------- | ------------ | :--------: |
| A (현상 유지)               | L    | L    | **H**    | L            |     1      |
| B (일괄 전환)               | M    | L    | L        | **H**        |     1      |
| C (**점진적 전환**)         | M    | L    | L        | **H**        |     1      |
| D (태그 제거 + legacy 잔존) | M    | L    | M        | M            |     0      |

루프 판정: 대안 A는 유지보수 H 1개(근본 원인 미해결), 대안 B/C는 마이그레이션 H 1개이지만 C는 rollback 단위가 작아 관리 가능. 대안 D는 HIGH+ 없지만 dead code 영속화로 실질 해결 아님.

**선택 기준**: 근본 원인 제거 + rollback 단위 최소화. 대안 C의 Phase 경계가 점진적 검증 포인트를 제공.

## Decision

**대안 C: 점진적 전환 (Heading → Text → Paragraph/Kbd/Code → buildTextNodeData 폐지)**를 선택한다.

기각 사유:

- **대안 A**: Text가 spec SSOT 외부에 영구 고립, 5-point patch 영속화
- **대안 B**: 일괄 전환 시 회귀 원인 추적이 어려워 Gate 실패 시 전체 롤백 필요
- **대안 D**: dead code 잔존은 실질 해결이 아님, `buildTextNodeData` 완전 폐지가 목표

### 실행 구조 (요약)

- **Pre-Phase**: CSS Generator 안정화 — `generated/Text.css` `undefined` 값 원인 분석 및 수정. Phase 1/2에서 `skipCSSGeneration: true` 제거 전제 조건.
- **Phase 1**: Heading 마이그레이션 — 시험대. 가장 단순한 구조(h1~h6 level 차이)로 spec 경로 전환 절차 검증.
- **Phase 2**: Text 마이그레이션 + 5-point patch 제거 — `LayoutRenderers.renderText` 폐기, `f140f173`의 분산 동기화 소멸.
- **Phase 3**: Paragraph/Kbd/Code spec 신설 — 3개 신규 spec 파일 + `TEXT_LEAF_TAGS` lowercase 확장.
- **Phase 4**: `buildTextNodeData` 완전 폐지 + `TEXT_TAGS` 축소 — 잔존 호출자 제거, dead code 정리.

각 Phase의 작업 순서, 파일 변경 목록, 검증 체크리스트, 파일 인벤토리, 회귀 진단 절차는 breakdown 문서 참조.

> 구현 상세: [058-text-tags-legacy-dismantle-breakdown.md](../design/058-text-tags-legacy-dismantle-breakdown.md)

## Gates

잔존 HIGH 위험: 마이그레이션 (4 Phase coordinated 변경). Phase 경계로 관리.

| Gate                          | 시점           | 통과 조건                                                                                 | 실패 시 대안                                 |
| ----------------------------- | -------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| Pre-Phase CSSGenerator 안정화 | Pre-Phase 완료 | `generated/Text.css` undefined 0건, 기존 CSS 생성자 회귀 0건                              | `skipCSSGeneration: true` 복원, Phase 1 차단 |
| Heading 마이그레이션          | Phase 1 완료   | Heading size 변경 CSS/Skia 반영, Preview DOM `outerHTML` diff 0건, TextEditOverlay 정상   | Phase 1 롤백, Pre-Phase 재검토               |
| ADR-027 호환 (Heading)        | Phase 1 완료   | Heading 인라인 편집 Quill 오버레이 위치 ≤0.5px                                            | Phase 1.5 TextEditOverlay 재배선             |
| Text 5-point patch 제거       | Phase 2 완료   | 5-point patch 코드 grep 0건, Text size 변경 정상, `outerHTML` diff 0건                    | 5-point patch 일부 복원, Phase 2 롤백        |
| ADR-027 호환 (Text)           | Phase 2 완료   | Text 인라인 편집 정상                                                                     | Phase 2.5 TextEditOverlay 재배선             |
| Paragraph/Kbd/Code 신설       | Phase 3 완료   | 3개 신설 spec default 렌더링 정상, semantic element 매핑 확인, `TEXT_LEAF_TAGS` 등록 확인 | 신설 spec 점진 보완                          |
| `buildTextNodeData` 완전 폐지 | Phase 4 완료   | grep 0건, 전체 text 컴포넌트 ≤1px 최종 검증                                               | 잔존 호출자 재마이그레이션                   |
| 2-pass reflow 무회귀          | 각 Phase 완료  | Checkbox/Radio/Switch 내부 Label 세로 출력 버그 미재발                                    | `TEXT_LEAF_TAGS` 경로 분리 유지              |

## Consequences

### Positive

- **ADR-036 Spec-First 완전 준수** — Text/Heading/Paragraph/Kbd/Code가 spec SSOT로 복귀. 더 이상 예외 경로 없음
- **5-point patch 근본 해결** — `getTextPresetFontSize` 분산 호출 소멸, spec source가 단일 진실
- **Typography 범위 L2~L5 확보** (L1은 ADR-057이 해결):
  - **L2 StylesPanel 신뢰성** — 어느 text 컴포넌트에 적용해도 동일 결과
  - **L3 Property Editor 기반** — spec.properties 확장으로 Typography 노출 가능 (실제 노출은 별도 작업)
  - **L4 Advanced Typography 경로** — `font-feature-settings`, variable font 추가 시 단일 지점 수정
  - **L5 ADR-056 시너지** — Base Typography SSOT와 단일 주입 지점 정합
- **CSS cascade/theme/media query 정상 동작** — `className` 및 CSS override로 텍스트 자유 제어
- **DevTools 경험 개선** — inspector에서 `[data-size="md"]` 셀렉터 및 CSS 변수 체인 확인
- **Paragraph spec 신설** — 웹 콘텐츠 기본 단위 편입
- **새 semantic 텍스트 태그 추가 부담 제거** — spec 1곳만 수정

### Negative

- **Pre-Phase 실측 부담** — CSSGenerator 버그 원인 분석 필요 (가설: truthy check 버그)
- **Phase 2의 TextEditOverlay 회귀 리스크** — `LayoutRenderers.renderText` 제거 시 DOM 구조 미세 변화 가능성. Gate로 관리하지만 Phase 2.5 (재배선) 준비 필요
- **4 Phase coordinated 변경** — Phase 중단 시 부분 통합 상태 유지. Phase 경계 커밋 및 rollback 가능성 확보 필수
- **Paragraph/Kbd/Code 3개 신설 spec 검증 부담** — 각각 default variant/size/styling 작성 + auto-generated CSS 검증

### 후속 작업

- **ADR-056 (Base Typography SSOT)** 병행 가속 — 본 ADR 완료 시 단일 주입 지점만 수정
- **`font-feature-settings` HIGH 이슈** 통합 (ADR-100 Phase 10+ 미해결) — 본 ADR 완료 후 `specShapeConverter` 단일 지점에 추가
- **Label의 `skipCSSGeneration: true` 재검토** — Description과 정합성 결정
- **`Strong`, `Em`, `Blockquote`, `Abbr` 등 HTML 의미론 태그 확장** — Phase 3 패턴 복제
- **Property Editor Typography 섹션 확장** (ADR-041 연계) — spec.properties에 Typography 필드 추가로 자동 노출
