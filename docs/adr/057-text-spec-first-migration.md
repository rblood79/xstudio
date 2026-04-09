# ADR-057: TEXT_TAGS → Spec-First 아키텍처 통합

## Status

Proposed — 2026-04-09

## 원칙 — Spec SSOT + Symmetric Consumers (ADR-036 준수)

본 ADR의 모든 의사결정은 다음 원칙에 기반한다:

1. **Spec이 SSOT**. `typography` 토큰을 포함한 spec 정의가 유일한 source이며, Preview/Publish(DOM/CSS)와 Builder(Skia)는 모두 이 spec의 **대등한 consumer**다. 어느 consumer도 다른 consumer의 기준이 아니다.

2. **CSS와 Skia는 symmetric pipeline**. "CSS가 기준, Skia가 따라간다"가 아니라, 두 경로가 동일 spec source로부터 동일 결과를 산출하는지 교차 검증한다.
   - `typography` 토큰 → CSS 변수 → browser CSS engine → Preview/Publish
   - `typography` 토큰 → spec `shapes()` → Skia → Builder Canvas

3. **ADR-057의 본질**. 현재 `Text`/`Heading`이 `buildTextNodeData`로 `element.props.style`을 직접 소비하는 구조는 spec SSOT를 우회한다 (ADR-036 위반). ADR-057은 "CSS↔Skia 맞춤"이 아니라 **"잘못 배치된 consumer를 spec source로 복귀시키는 작업"**이다.

4. **Phase 0 feature parity의 의미**. 13개 항목은 "CSS가 가진 기능을 Skia가 못 가짐"이 아니라 **"spec shape 인터페이스에 정의되어야 할 속성이 누락됨"**이다. Phase 0은 spec 인터페이스 확장 작업이지 Skia 보완 작업이 아니다.

5. **≤1px 정합성의 의미**. 두 consumer가 동일 source로부터 대칭 파생되는지 검증하는 것. 회귀 발생 시 **"어느 consumer가 spec을 잘못 해석했는가"**로 분류하며, CSS/Skia 중 어느 쪽도 특권화하지 않는다.

   | 증상                          | 1차 조사 지점           | 가능한 원인                                         |
   | ----------------------------- | ----------------------- | --------------------------------------------------- |
   | Preview만 틀림                | CSS consumer 경로       | CSSGenerator, `@layer components` cascade, variable |
   | Skia만 틀림                   | Skia consumer 경로      | `specShapeConverter`, `nodeRendererText`            |
   | Preview + Skia 동일 방향 오류 | Spec source             | 토큰 값 / `spec.sizes` / `spec.variants` 정의       |
   | Preview + Skia 상이 방향 오류 | 양쪽 consumer 독립 오역 | spec 인터페이스 모호성                              |

## Context

`Text`, `Heading`, `Paragraph`, `Kbd`, `Code` 등 텍스트 리프 컴포넌트가 Spec-First 아키텍처(ADR-036)에 통합되지 않은 채 예외 경로(`TEXT_TAGS` → `buildTextNodeData.ts`)로 렌더링된다. 웹 페이지 콘텐츠의 대부분을 차지하는 텍스트가 SSOT 시스템의 외부에 있는 상태가 빌더의 완성도를 구조적으로 제약한다.

### 현재 혼재 상태

| 컴포넌트      | spec 존재 | `shapes()` 정의 | `skipCSSGeneration` | 렌더 경로                              |
| ------------- | --------- | --------------- | ------------------- | -------------------------------------- |
| `Label`       | ✅        | ✅              | `true`              | `SPEC_PREFERRED_TEXT_TAGS` → spec 경로 |
| `Description` | ✅        | ✅              | ❌                  | spec 경로                              |
| `InlineAlert` | ✅        | ✅              | ❌                  | `SPEC_PREFERRED_TEXT_TAGS` → spec 경로 |
| `Text`        | ✅        | **`() => []`**  | `true`              | **`buildTextNodeData` 예외 경로**      |
| `Heading`     | ✅        | **`() => []`**  | `true`              | **`buildTextNodeData` 예외 경로**      |
| `Paragraph`   | **❌**    | —               | —                   | **spec 부재, `TEXT_TAGS`에만 등록**    |
| `Kbd`         | **❌**    | —               | —                   | **spec 부재, `TEXT_TAGS`에만 등록**    |
| `Code`        | **❌**    | —               | —                   | **spec 부재, `TEXT_TAGS`에만 등록**    |

### 문제 증상 (2026-04-09 발생)

`Text` 컴포넌트의 `size` prop 변경이 CSS/Skia 모두에 반영되지 않는 버그가 발견되어 **5개 경로 동시 패치**(`f140f173`)로 임시 해결됨:

1. `buildTextNodeData.ts` — `textStyle.fontSize || preset` 패턴에서 preset이 항상 무시되는 버그
2. `LayoutRenderers.renderText` — `data-size` 속성 및 size-aware 스타일 미주입
3. `layout/engines/utils.ts:1277` (`calculateContentWidth`) — `extractSpecTextStyle("text")`가 빈 shapes[] 때문에 null 반환, fontSize fallback 실패
4. `layout/engines/utils.ts:2507` (`calculateContentHeight`) — TEXT_LEAF_TAGS 경로 fontSize 해석 누락
5. `layout/engines/utils.ts:2929` (`enrichWithIntrinsicSize`) — intrinsic width 계산 시 size preset 누락

이 5개 경로가 동일한 `getTextPresetFontSize()` 헬퍼를 독립적으로 호출하는 구조는 SSOT 원칙(`feedback-ssot-dedup.md`) 위반이며, 향후 새 사이즈 추가 시 5곳 모두 동기화 유지되어야 한다.

### Hard Constraints

1. **CSS ↔ Skia 정합성 ≤1px** — ADR-100, ADR-036 핵심 원칙 유지
2. **Button/Badge/Label/Description/InlineAlert 회귀 없음** — 이미 spec 경로로 동작 중인 컴포넌트들이 동일 `specShapeConverter` text shape 경로를 공유하므로 변경 영향 범위 넓음
3. **`button-text-wrapping-css-skia-parity.md` 5-layer 버그 재발 방지** — text shape 수정 시 `measureWrapped` / `verifyLines` / `specShapeConverter paddingTop/Bottom` / `computeDrawY` / `lineHeightPx fallback` 전 경로 검증 필요
4. **TEXT_LEAF_TAGS (layout 엔진 별도 셋) 유지** — `TEXT_TAGS`(skia 라우팅)와 혼동 금지. TEXT_LEAF_TAGS는 `enrichWithIntrinsicSize`, `TaffyFlexEngine` 2-pass reflow, `calculateContentHeight` wrap 높이 재계산에 load-bearing. 마이그레이션과 무관하게 유지한다
5. **60fps 유지** — 웹 페이지 텍스트 밀도가 높으므로 프레임 드롭 없이 렌더링 가능해야 함
6. **ADR-021 Theme / ADR-014 Font / ADR-100 Unified Skia / ADR-036 Spec-First** 모두 공존

### Soft Constraints

- 향후 `Strong`, `Em`, `Blockquote`, `Abbr` 등 HTML 의미론적 텍스트 태그 추가 시 동일 패턴으로 쉽게 확장
- `font-feature-settings`, `text-wrap: balance`, variable font 등 고급 타이포그래피 기능의 통합 경로 확보
- DevTools 디버깅 경험 개선 — 사용자가 inspector에서 `[data-size="md"]` 셀렉터와 CSS 변수 체인 확인 가능

## Alternatives Considered

### 대안 A: 현재 5-point patch 유지 (상태 유지)

- 설명: `f140f173`의 5개 경로 패치를 그대로 두고, 새 TEXT_TAGS 컴포넌트 추가 시 동일 헬퍼를 소비하도록 가이드라인화.
- 근거: 최소 변경, 회귀 위험 제로.
- 위험:
  - 기술: L — 이미 동작 중
  - 성능: L — 현상 유지
  - 유지보수: **H** — 5곳 동기화 부담 영구화, 새 사이즈/속성 추가 시마다 누락 리스크 재발. SSOT 원칙 지속 위반
  - 마이그레이션: L — 변경 없음

### 대안 B: `TEXT_BEARING_SPECS`에 TextSpec 등록 (부분 통합)

- 설명: `extractSpecTextStyle("text")`가 null을 반환하지 않도록 `TEXT_BEARING_SPECS` 맵에 Text/Heading 추가. 단, Text/Heading의 `shapes()`가 빈 배열이므로 `extractSpecTextStyle`에 특수 경로(spec.sizes에서 직접 fontSize 추출)를 추가한다. `buildTextNodeData`는 그대로 유지.
- 근거: 레이아웃 엔진 3경로(1277, 2507, 2929)의 특수 `tag === "text"` 분기를 제거 가능. 현 5-point가 2-point로 축소.
- 위험:
  - 기술: M — `extractSpecTextStyle`의 "shapes에서 text shape 찾기" 로직에 예외 경로 추가 필요, Button/Badge 기존 호출자에게 regression 위험
  - 성능: L — fontSize 해석 경로만 변경
  - 유지보수: M — 여전히 `buildTextNodeData`와 `renderText`가 독립 경로. 아키텍처 통일은 미완성
  - 마이그레이션: L — 2개 파일 수정

### 대안 C: 전면 Spec-First 통합 (본 제안)

- 설명: 5개 컴포넌트(Text, Heading, Paragraph, Kbd, Code)를 Spec-First 경로로 전면 통합한다.
  1. `specShapeConverter.ts`의 text shape에 누락된 13개 feature parity 이식
  2. Text/Heading의 `shapes()`를 실제 text shape 반환하도록 변경
  3. Paragraph/Kbd/Code의 spec 파일 신설
  4. `TEXT_TAGS`에서 이들 5개 태그 제거 (또는 `SPEC_PREFERRED_TEXT_TAGS`로 이동)
  5. `LayoutRenderers.renderText` 제거 → auto-generated CSS가 대체
  6. `buildTextNodeData`는 최종 폐지 또는 레거시 fallback으로만 유지
- 근거:
  - ADR-036 Spec-First 원칙 완전 준수
  - SSOT 단일화 — `typography` 토큰 → CSS 변수 → browser CSS engine **+** `typography` 토큰 → spec shapes() → Skia 같은 파이프라인
  - 사용자가 `className` / CSS cascade / media query / theme variable로 텍스트를 자유롭게 override 가능 (현재 inline style 패치는 불가능)
  - 새 사이즈/속성 추가 시 spec 1곳만 수정
- 위험:
  - 기술: **H** — `specShapeConverter` text shape의 13개 feature parity 이식이 Button/Badge/Label/Description/InlineAlert 기존 동작에 영향. `button-text-wrapping-css-skia-parity.md`의 5-layer 버그 재발 가능성
  - 성능: L — Skia 렌더링 경로는 이미 Button/Badge 등이 spec 경로로 동작 중. Text 추가는 기존 패턴 확장
  - 유지보수: **L (장기)** — SSOT 단일화로 드리프트 방지, 새 태그 추가 부담 최소
  - 마이그레이션: **H** — 11+ 파일 coordinated 변경, Phase 구조 필수

### 대안 D: Text 전용 Sprite 경로 유지하되 spec-driven 데이터로 통일

- 설명: `buildTextNodeData`를 spec 시스템 내부로 흡수 — `TextSpec.render.textData()` 같은 새 API를 spec 인터페이스에 추가. Skia는 `TAG_SPEC_MAP` 우선, text 경로는 `buildSpecNodeData` 내부에서 라우팅. CSS는 auto-generated.
- 근거: 텍스트 렌더링의 특수성(CanvasKit ParagraphBuilder, inline 특화)을 spec 시스템 안에서 표현
- 위험:
  - 기술: **H** — spec 인터페이스 변경은 22+ 컴포넌트 영향, ADR-036 인터페이스 수정 필요
  - 성능: L — 기존 최적화 유지
  - 유지보수: M — spec 인터페이스 복잡도 증가
  - 마이그레이션: **H** — 인터페이스 변경으로 모든 spec 파일 touching

### Risk Threshold Check

| 대안                         | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---------------------------- | ----- | ---- | -------- | ------------ | :--------: |
| A (현재 패치 유지)           | L     | L    | **H**    | L            |     1      |
| B (부분 통합)                | M     | L    | M        | L            |     0      |
| C (**전면 Spec-First 통합**) | **H** | L    | L(장기)  | **H**        |     2      |
| D (spec 인터페이스 확장)     | **H** | L    | M        | **H**        |     2      |

루프 판정: 대안 B는 HIGH+ 없음. 대안 A는 유지보수 HIGH 1개 (현재 드리프트 위험 영속화). 대안 C는 기술/마이그레이션 HIGH 2개이지만 **장기 유지보수 L**이며 Phase 구조로 리스크 관리 가능. 대안 D는 spec 인터페이스 변경이 ADR-036 기반을 흔들어 비권장.

**선택 기준**: 웹 페이지 콘텐츠의 절반 이상을 차지하는 텍스트가 빌더의 1순위 관심사라는 원칙 하에, 단기 리스크보다 장기 완성도를 우선한다. Phase 구조로 리스크 관리 시 대안 C가 최적.

## Decision

**대안 C: 전면 Spec-First 통합**을 선택한다.

5개 텍스트 컴포넌트(Text, Heading, Paragraph, Kbd, Code)를 Spec-First 경로로 전면 통합한다. `buildTextNodeData`의 13개 고유 기능을 `specShapeConverter` text shape에 이식하고, `TEXT_TAGS` 예외 경로를 점진적으로 해체한다.

### Phase 구조

**Phase 0 — Feature Parity 이식** (가장 위험한 단계)

`specShapeConverter.ts`의 text shape 처리에 `buildTextNodeData`의 누락 기능 이식:

1. `textDecoration` 풀셋 (underline/overline/line-through 비트마스크 + style + color)
2. `whiteSpace` (nowrap/pre/pre-wrap/pre-line)
3. `wordBreak` (break-all/keep-all)
4. `overflowWrap` (break-word/anywhere)
5. `wordSpacing`
6. `textOverflow` (ellipsis/clip)
7. `overflow: hidden/clip` → clipText
8. `textIndent`
9. `fontVariant`, `fontStretch`
10. `textShadow` (parseTextShadow)
11. theme-aware 기본 color
12. `leading` → lineHeight 변환
13. `verticalAlign` + flex alignment 매핑

**검증**: Button/Badge/Label/Description/InlineAlert 시각 회귀 ≤1px. `button-text-wrapping-css-skia-parity.md` 5-layer 체크리스트 통과.

**Phase 1 — Heading 마이그레이션** (시험대)

- `Heading.spec.ts`의 `shapes()`를 실제 text shape 반환하도록 수정
- `skipCSSGeneration: true` 제거 → auto-generated CSS 활성화
- `TEXT_TAGS`에서 `Heading` 제거
- `TAG_SPEC_MAP` 등록 또는 `SPEC_PREFERRED_TEXT_TAGS` 이동
- CSS preview 및 Skia 렌더링 검증

**Phase 2 — Text 마이그레이션**

- Heading과 동일 절차 Text에 적용
- `LayoutRenderers.renderText` 제거
- `packages/shared/src/renderers/index.ts`의 Text 바인딩 제거
- 현재 5-point patch의 `tag === "text"` 분기 3곳 제거 (layout 엔진)

**Phase 3 — Paragraph/Kbd/Code spec 신설**

- 3개 spec 파일 신설 (Heading/Text를 참조하여 패턴 복제)
- 각각의 semantic element 매핑 (p, kbd, code)
- `TEXT_TAGS`에서 제거, `TAG_SPEC_MAP` 등록
- default variant/size 및 base styling 정의

**Phase 4 — `buildTextNodeData` 정리**

- 사용처 재검증 — 남은 호출자가 있는지 확인
- 완전 제거 또는 legacy fallback으로만 유지 (`@deprecated` 마킹)
- `TEXT_TAGS` 최종 축소 (필요한 경우 `Label` 등 `SPEC_PREFERRED_TEXT_TAGS` 항목만 유지)
- 5-point patch의 레거시 분기 완전 제거

### 호환성 유지

- **TEXT_LEAF_TAGS** (layout 엔진 별도 셋)는 모든 Phase에서 **유지**. lowercase 태그 기반이며 Flex/2-pass reflow 동작에 load-bearing
- `SPEC_PREFERRED_TEXT_TAGS`는 Phase 진행 중 임시 홀딩 구역으로 활용 가능
- Theme/dark mode 전환 시 CSS 변수 기반 자동 반영 (기존 Button/Badge 패턴과 동일)

> 구현 상세: [057-text-spec-first-migration-breakdown.md](./design/057-text-spec-first-migration-breakdown.md)

## Gates

잔존 HIGH 위험: 기술 / 마이그레이션. Phase 경계에서 검증으로 관리.

| Gate                          | 시점          | 통과 조건                                                                              | 실패 시 대안                         |
| ----------------------------- | ------------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| Phase 0 feature parity        | Phase 0 완료  | Button/Badge/Label/Description/InlineAlert 시각 회귀 ≤1px, 기존 13개 feature 동작 검증 | Phase 0 롤백, ADR 재설계             |
| 5-layer 버그 재발 방지        | Phase 0 완료  | `button-text-wrapping-css-skia-parity.md` 체크리스트 5항목 통과                        | `buildTextNodeData` 유지, Phase 중단 |
| Heading 시각 회귀             | Phase 1 완료  | Heading size 변경 시 CSS/Skia 모두 반영, xs~3xl 모든 사이즈 ≤1px 정합                  | Phase 1 롤백, Phase 0 재검토         |
| Text size 버그 근본 해결      | Phase 2 완료  | 현재 5-point patch 제거 후 Text size 변경이 CSS/Skia에 반영되는지 재검증               | 5-point patch 일부 복원              |
| TEXT_LEAF_TAGS flex layout    | 각 Phase 완료 | Checkbox/Radio/Switch 내부 Label 세로 출력 버그 미재발, 2-pass reflow 정상             | TEXT_LEAF_TAGS 분리 유지             |
| Paragraph/Kbd/Code 기본 동작  | Phase 3 완료  | 신설 spec의 default size/variant로 렌더링 정상                                         | 점진적 속성 추가                     |
| `buildTextNodeData` 호출 없음 | Phase 4 완료  | grep 검사로 신규 호출자 없음                                                           | 호출자 재마이그레이션                |

## Consequences

### Positive

- **ADR-036 Spec-First 원칙 완전 준수** — Text/Heading 등 텍스트 컴포넌트가 더 이상 예외가 아님
- **SSOT 단일화** — `typography` 토큰 1곳이 CSS 변수 및 Skia 경로 모두의 진실 원천
- **CSS cascade/theme/media query 정상 동작** — 사용자가 `className`이나 CSS override로 텍스트 자유롭게 제어 가능
- **DevTools 경험 개선** — inspector에서 `[data-size="md"]` 셀렉터와 CSS 변수 체인 확인 가능
- **새 태그/사이즈 추가 부담 제거** — spec 1곳만 수정
- **Paragraph spec 신설** — 웹의 기본 콘텐츠 단위가 spec 시스템에 편입
- **향후 고급 타이포그래피 통합 경로 확보** — `font-feature-settings`, variable font, `text-wrap: balance` 등

### Negative

- Phase 0의 feature parity 이식은 `specShapeConverter` 구조 변경을 수반 → Button/Badge 등 기존 spec 경로 사용자에게 회귀 위험
- `LayoutRenderers.renderText` 제거 시 iframe CSS preview의 Text 렌더 경로 전면 변경 — 기존 동작과 auto-generated CSS 사이의 미세한 차이 가능
- Heading/Text의 `skipCSSGeneration: true` 제거로 CSS 생성기가 `Text.css`를 재생성. 현재 stale 상태의 `undefined` 값 원인을 먼저 해결해야 함
- `buildTextNodeData`의 13개 feature를 모두 spec 경로로 이식하는 작업 자체가 검증 난이도 높음
- Phase 진행 중 중단 시 부분적 통합 상태가 되므로 Phase 경계에서 커밋 및 롤백 가능성 확보 필요

### 후속 작업

- ADR-051 (Canvas 2D 텍스트 측정 통합)과 Phase 0 이후 연계 검토
- `generated/Text.css`의 `undefined` 값 원인 분석 및 CSS 생성기 수정
- `font-feature-settings` HIGH 이슈(ADR-100 Phase 10+ 미해결) 통합 — Phase 4 완료 후 자연스럽게 해결 가능
- Label의 `skipCSSGeneration: true` 재검토 — Description과 정합성 맞출지 결정
