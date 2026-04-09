# ADR-058 Breakdown — TEXT_TAGS 예외 경로 해체 구현 상세

> 본 문서는 [ADR-058](../adr/058-text-tags-legacy-dismantle.md)의 구현 상세를 분리 관리한다.
> ADR 본문은 결정과 위험 평가, 고수준 Gate 테이블만 담고, 각 Phase의 파일 변경·작업 순서·검증 체크리스트·파일 인벤토리는 여기에 둔다.

## 목차

- [Pre-Phase — CSS Generator Stabilization](#pre-phase--css-generator-stabilization)
- [Phase 1 — Heading 마이그레이션](#phase-1--heading-마이그레이션)
- [Phase 2 — Text 마이그레이션 + 5-point patch 제거](#phase-2--text-마이그레이션--5-point-patch-제거)
- [Phase 3 — Paragraph/Kbd/Code spec 신설](#phase-3--paragraphkbdcode-spec-신설)
- [Phase 4 — `buildTextNodeData` 완전 폐지](#phase-4--buildtextnodedata-완전-폐지)
- [호환성 유지](#호환성-유지)
- [파일 변경 인벤토리](#파일-변경-인벤토리)
- [검증 프로토콜](#검증-프로토콜)

---

## Pre-Phase — CSS Generator Stabilization

### 목적

`generated/Text.css`의 `undefined` 값 stale 상태 근본 원인 분석 및 수정. Phase 1/2에서 `skipCSSGeneration: true`를 제거할 때 깨끗한 CSS가 생성되도록 선제 수정.

### 가설

CSSGenerator가 `Text.spec.ts`의 `height: 0`, `paddingX: 0`, `paddingY: 0` 같은 **정상 초기값(0)**을 falsy로 오판하여 undefined 출력. CSS에서 0은 정상값이지만 truthy check가 이를 스킵하여 `undefined`가 생성되는 구조.

**의심 패턴**:

```typescript
// Bad (가설)
if (size.height) css.height = `${size.height}px`; // 0 → falsy → skip → undefined

// Good
if (size.height != null) css.height = `${size.height}px`; // 0 → 정상 처리
```

### 작업 순서

1. **원인 특정** — `Text.spec.ts` 사본에 `skipCSSGeneration: false` 임시 설정 → `pnpm build:specs` 실행 → `generated/Text.css` 내용 확인 → undefined 발생 지점 식별
2. **CSSGenerator truthy check 검사** — CSS 생성 로직에서 `if (value)` → `if (value != null)` 치환 필요 지점 전수 조사
3. **수정 적용** — 식별된 모든 truthy check 치환
4. **재검증** — `skipCSSGeneration: false`에서 `generated/Text.css` undefined 0건 확인
5. **복원** — `Text.spec.ts`는 다시 `skipCSSGeneration: true`로 되돌림 (Phase 1에서 정식 제거)

### 검증 체크리스트

- [ ] `generated/Text.css`에 `undefined` 문자열 0건
- [ ] 기존 spec의 CSS 생성물(Button/Badge/Label/Description/InlineAlert 등)과 diff 0건
- [ ] CSSGenerator 단위 테스트 통과
- [ ] `pnpm type-check` 통과

### 실패 시 대안

- 가설이 틀린 경우: 실제 undefined 원인을 별도 분석 후 수정 범위 재정의
- 원인이 CSSGenerator가 아닌 spec 해석 로직에 있는 경우: `packages/specs` 빌드 파이프라인 조사

---

## Phase 1 — Heading 마이그레이션

### 목적

Heading을 시험대로 삼아 spec 경로 전환 절차를 검증. Heading은 level 차이만 있는 6개 변형(h1~h6)으로 구조가 단순하여 위험 격리가 용이.

### 전제

- ADR-057 Phase A/B 완료 (specShapeConverter text shape feature parity 확보)
- Pre-Phase Gate 통과 (CSSGenerator 안정)

### 작업 순서

1. **`Heading.spec.ts` `shapes()` 구현**
   - 현재 `shapes: () => []` → 실제 text shape 반환
   - ADR-057에서 이식한 13개 feature 활용 (whiteSpace/wordBreak/lineHeight 등)
   - level별 fontSize/fontWeight 기본값 매핑
2. **`skipCSSGeneration: true` 제거**
   - auto-generated CSS 활성화
   - `generated/Heading.css` 정상 생성 확인
3. **`TEXT_TAGS`에서 `Heading` 제거** (`tagSpecMap.ts`)
4. **라우팅 등록**
   - `TAG_SPEC_MAP` 등록 또는 `SPEC_PREFERRED_TEXT_TAGS` 이동
   - `StoreRenderBridge.ts` 라우팅 분기 확인
5. **semantic element 매핑 확인**
   - Heading.spec.ts의 `element` 필드가 level에 따라 `h1~h6` 반환하는지 확인
   - factory의 `renderHeading` 로직이 유지되는지 점검
6. **auto-generated CSS 검증**
   - Preview iframe에서 Heading이 정상 렌더링
   - CSS variable 체인 (`--text-xl` 등) 정상 연결
7. **Skia 렌더링 검증**
   - Canvas에서 Heading이 size 변경에 반응
   - xs~3xl 전 사이즈 시각 비교

### 검증 체크리스트

- [ ] Heading size 변경 시 CSS/Skia 모두 반영 (xs~3xl 전 사이즈 ≤1px)
- [ ] Preview DOM에서 `<h1>~<h6>` 태그 유지, `outerHTML` diff 0건
- [ ] `aria-level` 속성 정상 유지
- [ ] TextEditOverlay (ADR-027) Heading 편집 정상 — Quill 오버레이 위치 ≤0.5px
- [ ] `document.querySelector('[data-element-id="${headingId}"]')` 결과물이 Phase 전후 동일 구조
- [ ] dark mode / light mode 전환 시 색상 정상 반영
- [ ] 2-pass reflow 무회귀 (Heading 내부에 긴 텍스트 시 wrap 정상)

### 실패 시 대안

- CSS↔Skia 불일치 발생: ADR-057 Phase A/B 재검증 (feature parity 미흡 가능성)
- TextEditOverlay 회귀: Phase 1.5 삽입하여 TextEditOverlay 재배선
- semantic element 오매핑: factory의 `renderHeading`을 spec.element 기반으로 재작성

---

## Phase 2 — Text 마이그레이션 + 5-point patch 제거

### 목적

Text 컴포넌트를 spec 경로로 전환하여 `f140f173`의 5-point patch를 근본 제거. `LayoutRenderers.renderText`를 폐기하고 auto-generated CSS로 대체.

### 전제

- Phase 1 Gate 통과 (Heading 전환 검증 완료)
- ADR-027 호환성 확인 (Heading 편집 정상 동작)

### 작업 순서

1. **`Text.spec.ts` `shapes()` 구현** (Heading과 동일 절차)
   - 현재 `shapes: () => []` → 실제 text shape 반환
   - size preset (xs~3xl) 매핑
2. **`skipCSSGeneration: true` 제거**
   - `generated/Text.css` 정상 생성 확인 (Pre-Phase 수정의 실전 검증 시점)
3. **`LayoutRenderers.renderText` 제거**
   - `packages/shared/src/renderers/LayoutRenderers.tsx:671`
   - `packages/shared/src/renderers/index.ts`의 Text 바인딩 제거
   - auto-generated CSS가 대체하는지 Preview 확인
4. **5-point patch 코드 제거** — 아래 5곳의 `tag === "text"` 분기 삭제
   - `apps/builder/src/builder/workspace/canvas/skia/buildTextNodeData.ts` (Text 관련 분기)
   - `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` `calculateContentWidth` (이전 line 1277 근처)
   - `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` `calculateContentHeight` (이전 line 2507 근처)
   - `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` `enrichWithIntrinsicSize` (이전 line 2929 근처)
   - `LayoutRenderers.renderText` (Phase 2 step 3에서 제거됨)
5. **`getTextPresetFontSize` 분산 호출 소멸 확인**
   - grep으로 `getTextPresetFontSize` 호출처 확인
   - spec source (`Text.spec.ts`의 sizes)가 SSOT가 되었는지 점검
6. **`TEXT_TAGS`에서 `Text` 제거** + 라우팅 등록

### 검증 체크리스트

- [ ] Text size 변경이 CSS/Skia 모두 반영 (5-point patch 없이)
- [ ] 5-point patch 코드 grep 0건 — `tag === "text"` 분기 소멸
- [ ] `LayoutRenderers.renderText` grep 0건
- [ ] Preview DOM에서 `<p>` 태그 유지, `outerHTML` diff 0건
- [ ] TextEditOverlay의 Text 편집 정상 — Quill 오버레이 위치 ≤0.5px
- [ ] `document.querySelector('[data-element-id="${textId}"]')` outerHTML이 Phase 전후 동일 구조
- [ ] StylesPanel의 Typography 섹션 편집이 Text에 정상 반영 (Button과 동일 경로)
- [ ] 2-pass reflow 무회귀 (긴 텍스트 wrap)

### 실패 시 대안

- 5-point patch 일부 복원 (가장 파괴적 분기부터 복원)
- Phase 2 전체 롤백 → Phase 1만 유지
- Phase 2.5 삽입하여 `LayoutRenderers.renderText`를 점진 제거 (Text 외 라우팅 분리)

---

## Phase 3 — Paragraph/Kbd/Code spec 신설

### 목적

현재 spec 부재 상태인 3개 컴포넌트를 Spec-First 패턴으로 신설. Heading/Text에서 검증된 패턴을 복제 적용.

### 전제

- Phase 2 Gate 통과
- ADR-057 feature parity 활용 가능

### 작업 순서

1. **`Paragraph.spec.ts` 신설**
   - semantic element: `<p>`
   - default size/variant 정의 (text-base, neutral color)
   - `shapes()`에서 text shape 반환 (Text.spec.ts 참조)
   - `skipCSSGeneration: false` (auto-generated CSS 활성)
2. **`Kbd.spec.ts` 신설**
   - semantic element: `<kbd>`
   - default: monospace font, 작은 size, border/padding으로 키 모양 시각화
   - inline 특화 속성 (display: inline-block, whiteSpace: nowrap 기본)
3. **`Code.spec.ts` 신설**
   - semantic element: `<code>`
   - default: monospace font, muted 배경, 인라인 코드 스타일
4. **export 등록**
   - `packages/specs/src/index.ts` — 3개 spec export
   - `packages/specs/src/components/index.ts` — 3개 spec 바렐 export
   - `pnpm build:specs` 실행
5. **`TAG_SPEC_MAP` 등록** — `tagSpecMap.ts`의 매핑 추가
6. **`TEXT_TAGS`에서 3개 제거**
7. **`TEXT_LEAF_TAGS` 추가 등록** — `utils.ts:2831`
   - lowercase `paragraph`, `kbd`, `code` 추가
   - **근거**: CSS 기본 `white-space: normal` → wrap 가능 → 2-pass reflow 대상 (Kbd의 긴 키 조합, Code의 긴 코드 스니펫 등)
8. **factory 라우팅 확인** — `renderParagraph` / `renderKbd` / `renderCode` 필요 시 추가 또는 spec 경로로 통합

### 검증 체크리스트

- [ ] 3개 신설 spec의 default size/variant로 Preview 렌더링 정상
- [ ] Canvas Skia 렌더링 정상 (Paragraph는 Text와 유사, Kbd/Code는 monospace 확인)
- [ ] Preview DOM tag 정확 — `<p>`, `<kbd>`, `<code>`
- [ ] `TEXT_LEAF_TAGS`에 `paragraph`, `kbd`, `code` lowercase 등록 확인
- [ ] Kbd의 긴 키 조합(`Ctrl+Shift+Alt+F12`) wrap 동작 정상
- [ ] Code의 긴 코드 스니펫 wrap 동작 정상 (inline context에서)
- [ ] Paragraph의 긴 문단 wrap + line-height 정상
- [ ] dark mode 전환 시 Code 배경색 적절히 반영
- [ ] `pnpm build:specs` 성공

### 실패 시 대안

- 개별 spec 점진 보완 (Paragraph만 먼저, Kbd/Code는 후순)
- semantic element 매핑 오류 시 factory에 fallback 추가

---

## Phase 4 — `buildTextNodeData` 완전 폐지

### 목적

`buildTextNodeData` 파일과 관련 분기 코드를 전면 제거하여 spec SSOT를 완전히 복원.

### 전제

- Phase 1~3 모두 Gate 통과
- Text/Heading/Paragraph/Kbd/Code 모두 spec 경로로 전환 완료

### 작업 순서

1. **호출자 grep** — `buildTextNodeData` import/호출 전수 조사
2. **잔존 호출자 마이그레이션** — 발견 시 spec 경로로 전환
3. **`buildTextNodeData.ts` 파일 삭제**
4. **`TEXT_TAGS` 축소**
   - 남은 항목이 `Label`/`FieldError`/`InlineAlert` 등 `SPEC_PREFERRED_TEXT_TAGS` 항목뿐이면 `TEXT_TAGS` 자체 제거 + `SPEC_PREFERRED_TEXT_TAGS`로 대체
   - 또는 `TEXT_TAGS`를 유지하되 주석으로 축소된 범위 명시
5. **`StoreRenderBridge.ts` 분기 정리**
   - `SPEC_PREFERRED_TEXT_TAGS` 분기 로직 단순화
   - "나머지 TEXT_TAGS는 buildTextNodeData" 주석(line 47~49) 제거 또는 업데이트
6. **`getTextPresetFontSize` 헬퍼 제거 검토**
   - 호출자 0건이면 `@composition/specs`에서 export 제거
7. **import 정리** — 사용하지 않는 import 전수 제거

### 검증 체크리스트

- [ ] `buildTextNodeData` grep 0건 (파일, import, 호출 전부)
- [ ] `LayoutRenderers.renderText` grep 0건
- [ ] `getTextPresetFontSize` 잔존 호출 0건 (또는 Phase 4에서 제거 유예 시 사유 명시)
- [ ] 전체 text 컴포넌트(Text/Heading/Paragraph/Kbd/Code/Label/Description/InlineAlert/Button/Badge 등) 시각 회귀 ≤1px
- [ ] `TEXT_LEAF_TAGS`는 유지 확인 (layout 엔진 2-pass reflow에 load-bearing)
- [ ] `pnpm type-check` 통과
- [ ] `pnpm build:specs` 성공
- [ ] dev 실행 시 console error 0건

### 실패 시 대안

- 잔존 호출자 존재 시 재마이그레이션 (Phase 4 연기)
- `TEXT_TAGS` 분기 정리 시 회귀 발생: 분기 정리만 별도 Phase로 지연

---

## 호환성 유지

### `TEXT_LEAF_TAGS` (layout 엔진 별도 셋)

- 모든 Phase에서 **유지 + 확장**
- lowercase 태그 기반 (`text`, `heading`, `description`, `label`, 그리고 Phase 3에서 `paragraph`/`kbd`/`code` 추가)
- `TaffyFlexEngine` 2-pass reflow 동작에 load-bearing
- **주의**: `TEXT_TAGS`(Skia 라우팅)와 혼동 금지. 두 셋은 서로 다른 목적의 독립 집합

### `SPEC_PREFERRED_TEXT_TAGS`

- Phase 진행 중 **임시 홀딩 구역**으로 활용 가능
- Heading/Text를 `TEXT_TAGS`에서 제거한 직후 `TAG_SPEC_MAP` 등록 전 단계에 임시로 거쳐갈 수 있음
- Phase 4 완료 시 최종 범위 재평가

### Theme/dark mode

- CSS 변수 기반 자동 반영 (Button/Badge 기존 패턴과 동일)
- spec의 `{color.neutral}`, `{color.layer-2}` 등 토큰 체인이 light/dark 자동 전환
- Skia 측은 `themeVersion` + `setDarkMode` 경로로 동기화

### ADR-027 (Inline Text Editing)

- TextEditOverlay는 Preview iframe DOM의 `getBoundingClientRect()`로 오버레이 위치 계산
- Phase 1/2의 DOM 구조 불변이 보장되면 Quill 바인딩 무영향
- Gate 실패 시 Phase 1.5 / Phase 2.5 삽입하여 재배선

---

## 파일 변경 인벤토리

### Pre-Phase

| 파일                                                   | 변경 내용                         |
| ------------------------------------------------------ | --------------------------------- |
| `packages/specs/src/generators/CSSGenerator.ts` (추정) | truthy check → `!= null` 치환     |
| `packages/specs/src/components/Text.spec.ts` (임시)    | `skipCSSGeneration` 토글 → 재복원 |

### Phase 1

| 파일                                                                  | 변경 내용                                           |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| `packages/specs/src/components/Heading.spec.ts`                       | `shapes()` 구현, `skipCSSGeneration: true` 제거     |
| `apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts`     | `TEXT_TAGS`에서 `Heading` 제거, `TAG_SPEC_MAP` 등록 |
| `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts` | 라우팅 분기 확인                                    |
| `packages/shared/src/renderers/*` (조건부)                            | Heading 바인딩 유지 여부 결정                       |

### Phase 2

| 파일                                                                  | 변경 내용                                        |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/specs/src/components/Text.spec.ts`                          | `shapes()` 구현, `skipCSSGeneration` 제거        |
| `apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts`     | `TEXT_TAGS`에서 `Text` 제거                      |
| `packages/shared/src/renderers/LayoutRenderers.tsx`                   | `renderText` 제거                                |
| `packages/shared/src/renderers/index.ts`                              | Text 바인딩 제거                                 |
| `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`   | 5-point patch의 3개 분기 제거 (`tag === "text"`) |
| `apps/builder/src/builder/workspace/canvas/skia/buildTextNodeData.ts` | Text 관련 분기 제거 (Phase 4 전까지 잔존)        |

### Phase 3

| 파일                                                                | 변경 내용                                     |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `packages/specs/src/components/Paragraph.spec.ts` (신설)            | 신규 spec 파일                                |
| `packages/specs/src/components/Kbd.spec.ts` (신설)                  | 신규 spec 파일                                |
| `packages/specs/src/components/Code.spec.ts` (신설)                 | 신규 spec 파일                                |
| `packages/specs/src/components/index.ts`                            | 3개 export                                    |
| `packages/specs/src/index.ts`                                       | 3개 export                                    |
| `apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts`   | `TEXT_TAGS`에서 3개 제거, `TAG_SPEC_MAP` 등록 |
| `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` | `TEXT_LEAF_TAGS`에 lowercase 3개 추가         |
| `packages/shared/src/renderers/*` (조건부)                          | factory 경로 추가 여부 검토                   |

### Phase 4

| 파일                                                                  | 변경 내용                         |
| --------------------------------------------------------------------- | --------------------------------- |
| `apps/builder/src/builder/workspace/canvas/skia/buildTextNodeData.ts` | **파일 삭제**                     |
| `apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts`     | `TEXT_TAGS` 축소 또는 제거        |
| `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts` | 분기 로직 단순화                  |
| `packages/specs/src/` (조건부)                                        | `getTextPresetFontSize` 제거 검토 |
| 기타 import 정리                                                      | 미사용 import 전수 제거           |

---

## 검증 프로토콜

### 공통 측정 환경

- DPR: 1.0 / 2.0 / 3.0
- 해상도: 1440×900 (builder 표준)
- 폰트 로딩: `document.fonts.ready` 완료 후
- 테마: light / dark 양쪽
- 측정 시점: Phase 각 완료 직후 + 다음 Phase 진입 전

### ≤1px 정합성 측정 (Phase 1/2/3/4 공통)

- **기준**: spec 토큰 source (`typography.text-*`)
- **비교 대상**: Preview iframe CSS 렌더링 ↔ Canvas Skia 렌더링 (두 consumer 대칭 검증)
- **측정 방법**:
  - Width: `getBoundingClientRect().width` vs `paragraph.getLongestLine()`
  - Height: `getBoundingClientRect().height` vs `paragraph.getHeight()`
  - Line count: `Range.getClientRects().length` vs `paragraph.getLineMetrics().length`
- **통과 조건**: 모든 샘플 |diff| ≤ 1.0px, 95% 샘플 |diff| ≤ 0.5px, line count 불일치 0건

### A11y 불변조건 검증

- **ground truth**: `spec.element` + `spec.properties`
- **검증 대상**: Preview DOM
- **측정**:
  - `spec.element` = Preview DOM `tagName` (Text→`p`, Heading→`h1~h6`, Paragraph→`p`, Kbd→`kbd`, Code→`code`)
  - ARIA role, `aria-label`, `aria-level` 속성 Phase 전후 동일
  - `textContent` (screen reader text) 동일
  - Tab order 변화 없음

### TextEditOverlay (ADR-027) 호환 검증

- Heading 편집 시 Quill 오버레이 위치 ≤ 0.5px
- Text 편집 시 Quill 오버레이 위치 ≤ 0.5px
- 편집 모드 진입/종료 시 DOM 구조 변화 없음 (`outerHTML` diff 0건)
- 실패 시 Phase 1.5 / Phase 2.5 삽입하여 재배선

### 회귀 진단 분류 (ADR-058 원칙 기반)

| 증상                          | 1차 조사 지점           | 가능한 원인                                         |
| ----------------------------- | ----------------------- | --------------------------------------------------- |
| Preview만 틀림                | CSS consumer 경로       | CSSGenerator, `@layer components` cascade, variable |
| Skia만 틀림                   | Skia consumer 경로      | `specShapeConverter`, `nodeRendererText`            |
| Preview + Skia 동일 방향 오류 | Spec source             | 토큰 값 / `spec.sizes` / `spec.variants` 정의       |
| Preview + Skia 상이 방향 오류 | 양쪽 consumer 독립 오역 | spec 인터페이스 모호성                              |

"Skia가 CSS를 따라가야 한다"는 framing은 금지. 항상 spec source를 1차 조사 지점으로 삼는다.
