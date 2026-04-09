# ADR-057: specShapeConverter Text Shape Feature Parity 이식

## Status

Proposed — 2026-04-10

## 원칙 — Spec SSOT + Symmetric Consumers (ADR-036 준수)

본 ADR의 모든 의사결정은 다음 원칙에 기반한다:

1. **Spec이 SSOT**. `typography` 토큰을 포함한 spec 정의가 유일한 source이며, Preview/Publish(DOM/CSS)와 Builder(Skia)는 모두 이 spec의 **대등한 consumer**다. 어느 consumer도 다른 consumer의 기준이 아니다.

2. **CSS와 Skia는 symmetric pipeline**. "CSS가 기준, Skia가 따라간다"가 아니라, 두 경로가 동일 spec source로부터 동일 결과를 산출하는지 교차 검증한다.
   - `typography` 토큰 → CSS 변수 → browser CSS engine → Preview/Publish
   - `typography` 토큰 → spec `shapes()` → Skia → Builder Canvas

3. **ADR-057의 본질**. `specShapeConverter.ts`의 text shape 처리에 13개 feature가 누락되어 있어 **spec 경로가 충분히 표현력을 갖추지 못한 상태**다. 이는 ADR-058 (TEXT_TAGS 해체)의 **선결 조건**이자, 현재 `Button`/`Badge`/`Label`/`Description`/`InlineAlert` 사용자가 Typography 기능을 온전히 쓸 수 없는 **직접적 결함**이다.

4. **Phase 분할의 의미**. 13개 feature는 "CSS가 가진 기능을 Skia가 못 가짐"이 아니라 **"spec shape 인터페이스에 정의되어야 할 속성이 누락됨"**이다. Layout 영향 속성과 Paint 영향 속성을 분리하여 blast radius를 축소한다.

5. **≤1px 정합성의 의미**. 두 consumer가 동일 source로부터 대칭 파생되는지 검증하는 것. 회귀 발생 시 **"어느 consumer가 spec을 잘못 해석했는가"**로 분류하며, CSS/Skia 중 어느 쪽도 특권화하지 않는다.

   | 증상                          | 1차 조사 지점           | 가능한 원인                                         |
   | ----------------------------- | ----------------------- | --------------------------------------------------- |
   | Preview만 틀림                | CSS consumer 경로       | CSSGenerator, `@layer components` cascade, variable |
   | Skia만 틀림                   | Skia consumer 경로      | `specShapeConverter`, `nodeRendererText`            |
   | Preview + Skia 동일 방향 오류 | Spec source             | 토큰 값 / `spec.sizes` / `spec.variants` 정의       |
   | Preview + Skia 상이 방향 오류 | 양쪽 consumer 독립 오역 | spec 인터페이스 모호성                              |

## Context

현재 `specShapeConverter.ts`의 text shape 처리는 `fontSize`/`fontWeight`/`fontFamily`/`letterSpacing`/기초 `textDecoration` 정도만 지원한다. 반면 `buildTextNodeData.ts`(TEXT_TAGS 경로)는 이보다 훨씬 많은 13개의 Typography feature를 처리한다.

이로 인해 spec 경로를 사용하는 `Button`/`Badge`/`Label`/`Description`/`InlineAlert` 사용자는 `textShadow`, `wordBreak`, `overflowWrap`, `whiteSpace`, `wordSpacing`, `textOverflow` 등의 속성을 StylesPanel에서 설정해도 **Canvas Skia에 반영되지 않는다**. Preview는 CSS 경로로 표시되므로 정상 동작하지만, Canvas는 spec 경로의 기능 결손으로 인해 틀린 결과를 렌더링한다.

### 현재 결손된 feature 목록

| #   | Feature                                         | `buildTextNodeData` 지원 | `specShapeConverter` 지원 | Layout 영향 |
| --- | ----------------------------------------------- | :----------------------: | :-----------------------: | :---------: |
| 1   | `whiteSpace` (nowrap/pre/pre-wrap/pre-line)     |            ✅            |            ❌             |     ✅      |
| 2   | `wordBreak` (break-all/keep-all)                |            ✅            |            ❌             |     ✅      |
| 3   | `overflowWrap` (break-word/anywhere)            |            ✅            |            ❌             |     ✅      |
| 4   | `leading` → `lineHeight` 변환                   |            ✅            |           부분            |     ✅      |
| 5   | `textIndent`                                    |            ✅            |            ❌             |     ✅      |
| 6   | `overflow: hidden/clip → clipText`              |            ✅            |            ❌             |     ✅      |
| 7   | `textDecoration` 풀셋 (bitmask + style + color) |            ✅            |           부분            |     ❌      |
| 8   | `textOverflow` (ellipsis/clip)                  |            ✅            |            ❌             |     ❌      |
| 9   | `wordSpacing`                                   |            ✅            |            ❌             |     ❌      |
| 10  | `fontVariant`, `fontStretch`                    |            ✅            |            ❌             |     ❌      |
| 11  | `textShadow`                                    |            ✅            |            ❌             |     ❌      |
| 12  | `verticalAlign` + flex alignment                |            ✅            |            ❌             |     ❌      |
| 13  | theme-aware 기본 color                          |            ✅            |           부분            |     ❌      |

### Hard Constraints

1. **`Button`/`Badge`/`Label`/`Description`/`InlineAlert` 시각 회귀 ≤1px** — 이미 spec 경로로 동작 중인 5개 컴포넌트에 회귀가 없어야 한다.
2. **`button-text-wrapping-css-skia-parity.md` 5-layer 체크리스트 통과** — text shape 수정 시 `measureWrapped` / `verifyLines` / `specShapeConverter paddingTop/Bottom` / `computeDrawY` / `lineHeightPx fallback` 전 경로 재검증.
3. **60fps 유지** — 기능 추가가 Canvas 렌더링 성능을 저해하지 않는다.
4. **Spec 인터페이스 확장만 허용, 파괴적 변경 금지** — 기존 `textShape` 타입 시그니처는 옵셔널 필드 추가만 가능.
5. **ADR-036 Spec-First / ADR-100 Unified Skia / ADR-021 Theme / ADR-014 Font** 모두 공존.
6. **LAYOUT_AFFECTING_PROPS + LAYOUT_PROP_KEYS 등록 필수** — layout 영향 feature 추가 시 `layoutVersion` 트리거 2곳 동시 등록 (layout-engine.md 규칙).

### Soft Constraints

- ADR-058 (TEXT_TAGS 해체)의 선결 조건 확보
- StylesPanel의 Typography 편집이 모든 spec 경로 컴포넌트에서 동일 동작
- `font-feature-settings`, variable font 등 향후 확장 시 단일 지점만 수정

## Alternatives Considered

### 대안 A: 현상 유지 (feature parity 결손 영속화)

- 설명: `specShapeConverter` text shape은 현재 수준 유지. 사용자는 Button/Badge에 고급 Typography를 적용할 수 없음을 수용.
- 근거: 최소 변경, 회귀 위험 제로.
- 위험:
  - 기술: L — 변경 없음
  - 성능: L — 현상 유지
  - 유지보수: **H** — StylesPanel 편집이 일부 컴포넌트에서만 동작하는 inconsistency 영구화. 향후 ADR-058 불가
  - 마이그레이션: L — 변경 없음

### 대안 B: `buildTextNodeData` 코드를 그대로 복제

- 설명: `buildTextNodeData`의 13개 feature 처리 코드를 `specShapeConverter` text shape 경로에 그대로 복사.
- 근거: 구현 단순, 기존 동작 보장.
- 위험:
  - 기술: L — 검증된 로직 복제
  - 성능: L
  - 유지보수: **H** — 동일 로직이 2곳에 존재하여 SSOT 위반. 새 feature 추가 시 2곳 동기화 부담
  - 마이그레이션: L — 단일 파일 수정

### 대안 C: 13개 feature를 `specShapeConverter`에 이식 + Layout/Paint 분할 (본 제안)

- 설명: 13개 feature를 `specShapeConverter` text shape 처리에 이식하되 **Layout 영향 6개(Phase A)**와 **Paint 영향 7개(Phase B)**로 분할. Phase A 완료 후 Gate 통과 시 Phase B 진행.
- 근거:
  - ADR-036 Spec-First 원칙 정합
  - `buildTextNodeData`의 단일 source가 여전히 유지 (Text/Heading 경로). 복제 아님
  - Phase 분할로 blast radius 축소 — Layout 회귀와 Paint 회귀가 다른 검증 비용을 가지므로 단계적 검증
  - ADR-058 (TEXT_TAGS 해체)의 선결 조건 충족
- 위험:
  - 기술: **H** — 기존 5개 spec 경로 사용자(Button/Badge/Label/Description/InlineAlert) 회귀 가능성. `button-text-wrapping-css-skia-parity.md` 5-layer 버그 재발 리스크
  - 성능: L — 추가되는 feature는 기존 CanvasKit API 호출 확장. 추가 per-frame 비용 무시 가능
  - 유지보수: **L** — 단일 구현 지점으로 수렴
  - 마이그레이션: L — `specShapeConverter.ts` 단일 파일 + `LAYOUT_AFFECTING_PROPS` 등록 2곳

### 대안 D: 신설 textShape v2 API + 점진 이전

- 설명: 새 `textShape` 인터페이스를 정의하고 기존 shape과 병행. 5개 기존 사용자를 점진적으로 신 API로 이전.
- 근거: 기존 API 완전 보호
- 위험:
  - 기술: **H** — 두 API 병존 기간 동안 분기 로직 증가
  - 성능: L
  - 유지보수: **H** — 마이그레이션 중 2개 API 동시 유지, 완료 시점 불확실
  - 마이그레이션: **H** — 5개 컴포넌트 spec 재작성 필요

### Risk Threshold Check

| 대안                      | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ------------------------- | ----- | ---- | -------- | ------------ | :--------: |
| A (현상 유지)             | L     | L    | **H**    | L            |     1      |
| B (코드 복제)             | L     | L    | **H**    | L            |     1      |
| C (**이식 + Phase 분할**) | **H** | L    | L        | L            |     1      |
| D (신 API 병존)           | **H** | L    | **H**    | **H**        |     3      |

루프 판정: 대안 A/B는 유지보수 H 1개(SSOT 위반 영속화), 대안 C는 기술 H 1개(기존 사용자 회귀 리스크)지만 **Phase A/B 분할 + Gate**로 관리 가능. 대안 D는 HIGH+ 3개로 비권장.

**선택 기준**: ADR-058의 선결 조건이자 기존 사용자 결함 해결. 대안 C가 SSOT 원칙 정합성과 실행 가능성의 균형점.

## Decision

**대안 C: 13개 feature parity 이식 + Layout/Paint 2단계 분할**을 선택한다.

기각 사유:

- **대안 A**: 결함 영속화로 ADR-058 봉쇄
- **대안 B**: 유지보수 부담 2배, SSOT 원칙 위반
- **대안 D**: API 병존 기간의 복잡도가 이식 리스크를 상회

### 실행 구조 (요약)

**Phase A — Layout 영향 feature 이식 (선행, HIGH blast radius)**

| #   | Feature                     | 처리 방법                                 |
| --- | --------------------------- | ----------------------------------------- |
| 1   | `whiteSpace`                | CanvasKit `ParagraphStyle.textWrap` 매핑  |
| 2   | `wordBreak`                 | `lineBreakStrategy` + break-all 특수 처리 |
| 3   | `overflowWrap`              | `wordBreak` 보조 플래그                   |
| 4   | `lineHeight` (leading 변환) | `heightMultiplier` + `halfLeading: true`  |
| 5   | `textIndent`                | 첫 line box x offset 계산                 |
| 6   | `overflow → clipText`       | clip mask 적용                            |

**Phase A Gate**:

- Button/Badge 레이아웃 ≤1px (wrap 없는 기본 케이스)
- Label wrap 동작 무회귀 (기존 fit-content + nowrap 패턴)
- `LAYOUT_AFFECTING_PROPS` + `LAYOUT_PROP_KEYS` 2곳 등록 확인
- `button-text-wrapping-css-skia-parity.md` 5-layer 체크리스트 통과
- 2-pass reflow 정상 (`TEXT_LEAF_TAGS` 경로 무회귀)

**Phase B — Paint 영향 feature 이식 (후행, LOW blast radius)**

| #   | Feature                          | 처리 방법                                 |
| --- | -------------------------------- | ----------------------------------------- |
| 7   | `textDecoration` 풀셋            | `DecorationStyle` + decoration color 추출 |
| 8   | `textOverflow`                   | ellipsis character 삽입 + truncation      |
| 9   | `wordSpacing`                    | glyph advance 조정                        |
| 10  | `fontVariant`, `fontStretch`     | `TextStyle` 확장 필드                     |
| 11  | `textShadow`                     | `parseTextShadow` + shadow effect layer   |
| 12  | `verticalAlign` + flex alignment | baseline offset 계산                      |
| 13  | theme-aware 기본 color           | `lightColors`/`darkColors` fallback       |

**Phase B Gate**:

- Button/Badge/Label/Description/InlineAlert 전체 ≤1px (paint 포함)
- `Button.textShadow` 테스트 시각 검증 (기능 동작)
- 성능: paint feature 추가 후 60fps 유지

> 구현 상세는 Phase가 작아 ADR 본문 내 요약으로 충분. 파일 변경 목록과 검증 스크립트는 PR 설명에 기술.

## Gates

잔존 HIGH 위험: 기술 (기존 사용자 회귀). Phase A → Phase B 경계로 관리.

| Gate                   | 시점          | 통과 조건                                                                                  | 실패 시 대안                                |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Phase A Layout parity  | Phase A 완료  | Button/Badge/Label 레이아웃 ≤1px, 2-pass reflow 무회귀, `LAYOUT_AFFECTING_PROPS` 등록 확인 | Phase A 롤백, 개별 feature 분리 이식 재시도 |
| 5-layer 버그 재발 방지 | Phase A 완료  | `button-text-wrapping-css-skia-parity.md` 체크리스트 5항목 통과                            | Phase A 롤백                                |
| Phase B Paint parity   | Phase B 완료  | Button/Badge/Label/Description/InlineAlert 시각 회귀 ≤1px 전체                             | Phase B 부분 롤백 (개별 feature 제외)       |
| 성능 비회귀            | Phase B 완료  | Canvas 60fps 유지 (기존 벤치 대비 ±1fps)                                                   | 성능 저하 feature 식별 후 optimization      |
| 2-pass reflow 검증     | 각 Phase 완료 | Checkbox/Radio/Switch 내부 Label 세로 출력 버그 미재발                                     | `TEXT_LEAF_TAGS` 경로 분리 유지             |

## Consequences

### Positive

- **5개 기존 spec 경로 사용자가 13개 Typography feature 획득** — Button/Badge/Label/Description/InlineAlert에 textShadow, wordBreak, whiteSpace 등 전 기능 사용 가능
- **StylesPanel Typography 신뢰성 확보** — 어느 컴포넌트에 설정해도 동일 렌더링 결과
- **ADR-058 선결 조건 충족** — TEXT_TAGS 해체 시 `Text`/`Heading`이 spec 경로로 이전해도 기능 손실 없음
- **SSOT 단일화 진전** — 13개 feature의 Skia 구현이 `specShapeConverter` 단일 지점으로 수렴
- **향후 확장 기반** — `font-feature-settings`, variable font 추가 시 수정 지점이 1곳 (현재는 `buildTextNodeData` + `specShapeConverter` 2곳)

### Negative

- `specShapeConverter` 코드 복잡도 증가 (13개 feature 처리 로직 추가)
- Phase A 실패 시 Layout feature 부분 적용 상태 가능 — Phase 경계 커밋으로 완화
- 13개 feature를 모두 CSS 표준 의미론과 일치시키는 검증 작업 자체가 난이도 높음
- `buildTextNodeData`의 기존 구현과 **동치성** 검증 필요 — 동일 style 입력에 동일 측정/렌더링 결과가 나와야 함

### 후속 작업

- **ADR-058**: TEXT_TAGS 예외 경로 해체 (Text/Heading/Paragraph/Kbd/Code Spec-First 전환). 본 ADR 완료 + Phase A/B Gate 통과가 선결 조건.
- ADR-021 dark mode + color-mix 정합성 재검증 (theme-aware 기본 color 이식 후)
- `font-feature-settings` HIGH 이슈(ADR-100 Phase 10+ 미해결) 통합 — 본 ADR 완료 후 `specShapeConverter` 단일 지점에 추가 가능
