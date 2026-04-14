# ADR-102: Workspace Dot Background Layer

## Status

Proposed — 2026-04-14

## Context

Builder workspace의 실제 작업 영역(Skia canvas) 배경은 현재 단색이다. 사용자에게 **무한 캔버스라는 공간감**과 **커서 위치 시각적 피드백**을 제공하기 위해 도트 패턴 + 마우스 추적 글로우 효과를 도입하려 한다.

레퍼런스로 조사한 **Stitch (Google, React Flow 기반)** 에디터는 동일 목적을 위해 작업 영역 **아래 레이어**에 SVG `<pattern>` 기반 도트 배경 2장(베이스 회색 + 마우스 따라가는 검정 글로우)을 깔고, 글로우 레이어에 `mask-image: radial-gradient` 를 적용해 커서 주변만 노출한다.

### Domain (SSOT 체인 — [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

- **해당 domain**: **없음** — 본 변경은 **에디터 크롬(Builder 전용 UI shell)** 이며 D1/D2/D3 어디에도 속하지 않는다.
- **D3 비적용 근거**: 배경 장식은 Preview/Publish에 존재하지 않는 Builder 전용 요소. CSS↔Skia 대칭 검증(`/cross-check`) 대상이 아님.
- **Spec 관여 금지** 확인: `packages/specs` 건드리지 않음.

### Hard Constraints (측정 가능)

1. **Canvas 60fps 유지** — 배경 처리가 Skia 재렌더를 트리거하면 안 됨
2. **Skia canvas 불간섭** — 작업 영역 좌표계/히트테스트/export 경로에 영향 0
3. **Bundle 영향 < 2KB** — 컴포넌트 1개 + CSS 추가분 한정
4. **pointer-events 무간섭** — 기존 ViewportController/PixiJS 이벤트 레이어와 충돌 금지

### Soft Constraints

- 시맨틱 토큰(`--fg-muted`, `--accent`) 기반 → 다크모드 자동 전환
- 사용자 on/off 토글 없이 기본 노출 (Stitch 패턴 동일)
- 기존 DOM 구조(`.workspace` → `.canvas-container` → `<canvas>`) 최소 변경

### 현재 DOM 구조 (확인됨)

```
.workspace (Workspace.tsx)
└─ .canvas-container (BuilderCanvas.tsx, position: absolute; inset: 0)
   ├─ <SkiaCanvasLazy/>  ──► 내부에 <canvas data-testid="skia-canvas-unified" z-index: 2, pointer-events: auto>
   │                         (SkiaCanvas.tsx)
   └─ <ViewportControlBridge/>
```

`.canvas-container` 는 `BuilderCanvas.tsx` 에서 생성되며, 실제 `<canvas>` 는 lazy-loaded `SkiaCanvas` 컴포넌트 내부에 있다. `DotBackground` 는 **`.canvas-container` 내부에 `SkiaCanvasLazy` 와 형제 노드**로 삽입한다. 이 지점이 Skia 렌더 파이프라인 경계 밖이므로 canvas 내부 구조/렌더 영향 0.

### 적용 범위

- **WebGL 편집 캔버스 전용** (BuilderCanvas). Compare mode(`WorkspaceCompareMode.tsx`)는 **좌측 = CSS fallback, 우측 = `BuilderCanvas`** 구조이므로, 삽입 1회로 **우측 Canvas 패널만 자동 커버**된다. 좌측 CSS 패널에는 도트 배경이 적용되지 않으며, 이는 의도된 scope(편집 캔버스 전용)와 일치한다.
- Preview/Publish, Property 패널, Layer 트리 등 非-캔버스 UI에는 적용하지 않음.

### Stitch 레퍼런스 분석 요지

- 두 `<svg class="react-flow__background">` 가 z-index `-1` 로 작업 영역 아래 배치
- pan/zoom 시 `<pattern x y width height>` 속성을 React Flow가 viewport 값으로 갱신 → 도트가 무한 스크롤
- 글로우 레이어는 `mask-image: radial-gradient(circle at <cx> <cy>, black, transparent)` + `opacity` 토글로 마우스 주변만 노출
- pattern id 충돌 회피를 위해 id 접미사 분리 (`pattern-1` vs `pattern-1dot-glow-bg`)

## Alternatives Considered

### 대안 A: Skia 내부 렌더 (gridRenderer 패턴 확장)

- **설명**: `apps/builder/src/builder/workspace/canvas/skia/` 에 `dotBackgroundRenderer.ts` 추가. `renderScreenOverlay()` 경로에 합류하여 scene 좌표계에서 `drawCircle` 루프. 글로우는 도트별 색상 보간 또는 `saveLayer + RadialGradient shader`.
- **위험 평가**:
  - 기술: **MEDIUM** — Skia saveLayer/shader 경로 복잡. 도트별 per-frame 계산.
  - 성능: **HIGH** — 커서 mousemove 마다 Skia 전체 재렌더 트리거. 노드 多 문서에서 60fps 위협.
  - 유지보수: **MEDIUM** — Skia 렌더 파이프라인과 결합. ADR-100 (Unified Skia) 경계와 충돌 가능 — "문서 콘텐츠 렌더러"에 에디터 크롬 혼입.
  - 마이그레이션: **LOW** — 롤백 시 renderer 1개 제거로 끝.
- **부가 문제**: scene 좌표계에 들어가므로 (0,0) 근처 배치 시 도트와 사용자 요소가 겹쳐 혼동. export 경로에 도트 박힘 위험.

### 대안 B: Canvas 2D 별도 레이어

- **설명**: Skia canvas 아래 별도 `<canvas>` 2D 추가. `requestAnimationFrame` 에서 도트 그리드 + 마우스 글로우 직접 drawing.
- **위험 평가**:
  - 기술: **LOW** — Canvas 2D API는 성숙.
  - 성능: **MEDIUM** — 매 프레임 전체 도트 re-draw 비용. 뷰포트 크기 클수록 선형 증가. GPU 컴포지팅 혜택 없음.
  - 유지보수: **MEDIUM** — DPR 처리, 리사이즈 대응 등 별도 리소스 관리 필요.
  - 마이그레이션: **LOW**.
- **부가 문제**: CSS로 해결 가능한 것을 JS 렌더 루프로 돌리는 것은 DRY 위반. 토큰/테마 연동 수작업.

### 대안 C: DOM + CSS `background-image` 레이어 (Stitch 패턴 단순화)

- **설명**: `.canvas-container` 내부에 `<canvas>` 형제로 `<div class="dot-background--base"/>` + `<div class="dot-background--glow"/>` 2개 추가. 도트는 `background-image: radial-gradient(circle, var(--dot-color) 1px, transparent 1.5px)` + `background-size: <gap>px` 로 브라우저가 타일링. viewport의 `{panOffset, zoom}` 을 `useViewportSyncStore` 로 구독해 CSS 변수(`--dot-gap`, `--dot-offset-x/y`) 업데이트. 글로우는 `mask-image: radial-gradient` + `pointermove` → rAF → CSS 변수(`--cx`, `--cy`) 업데이트.
- **위험 평가**:
  - 기술: **LOW** — CSS mask-image + background-image 는 모든 타겟 브라우저 지원 (`-webkit-mask-image` prefix로 Safari 커버).
  - 성능: **LOW** — GPU 컴포지팅, Skia 재렌더 미유발. mousemove 핸들러 rAF 스로틀.
  - 유지보수: **LOW** — 컴포넌트 1개 + CSS 블록 1개. 시맨틱 토큰으로 다크모드 자동.
  - 마이그레이션: **LOW** — 컴포넌트 제거로 완전 롤백.

### 대안 D: DOM + SVG `<pattern>` 레이어 (Stitch 1:1 복제)

- **설명**: 대안 C와 구조 동일, 도트 렌더만 `<svg><pattern><circle/></pattern><rect fill="url(#...)"/></svg>` 로 Stitch 1:1 복제.
- **위험 평가**: 대안 C와 동일하나 DOM 노드 수/코드량 증가. 토큰 연동이 CSS 대비 간접적(SVG fill → CSS 변수 참조 필요).

### Risk Threshold Check

| 대안          | 기술 | 성능  | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ------------- | :--: | :---: | :------: | :----------: | :--------: |
| A (Skia 내부) |  M   | **H** |    M     |      L       |     1      |
| B (Canvas 2D) |  L   |   M   |    M     |      L       |     0      |
| C (DOM+CSS)   |  L   |   L   |    L     |      L       |     0      |
| D (DOM+SVG)   |  L   |   L   |    L     |      L       |     0      |

판정: 대안 A만 HIGH 위험 존재 (성능 — Skia 재렌더 연쇄). 대안 C/D는 모든 축이 LOW. 루프 불필요.

## Decision

**대안 C (DOM + CSS `background-image` 레이어)** 채택.

### 선택 근거

1. **Skia canvas 완전 불간섭** — 별도 DOM 레이어이므로 작업 영역 좌표계/히트테스트/export/재렌더에 영향 0 (Hard Constraint #2 충족)
2. **60fps 자연 충족** — CSS `background-image` + `mask-image` 는 GPU 컴포지팅 경로. mousemove 는 rAF 스로틀된 CSS 변수 업데이트 뿐 (Hard Constraint #1 충족)
3. **최소 코드** — 컴포넌트 1개, CSS 블록 1개 (Hard Constraint #3 충족)
4. **토큰/다크모드 자동 전환** — 시맨틱 변수(`--fg-muted`, `--accent`) 활용, 별도 처리 불필요
5. **Stitch 레퍼런스와 시각적 동등성** — SVG vs CSS 차이는 구현 수단일 뿐 시각 결과 동일

### 기각 사유

- **대안 A (Skia 내부)**: 성능 HIGH — 커서 이동마다 Skia 전체 재렌더 트리거. ADR-100 Unified Skia 경계("문서 콘텐츠 렌더러") 침범. scene 좌표계 간섭 문제.
- **대안 B (Canvas 2D)**: CSS로 무료로 해결 가능한 것을 JS 렌더 루프로 구현하는 과잉 복잡도. 토큰 연동 수작업.
- **대안 D (SVG pattern 1:1 복제)**: 대안 C와 시각 결과 동일하면서 DOM 노드 수/코드량 증가. 토큰 연동 간접적.

> 구현 상세: [102-workspace-dot-background-breakdown.md](../design/102-workspace-dot-background-breakdown.md)

## Gates

잔존 HIGH 위험은 없으나, Hard Constraint #1(60fps) / #4(pointer-events 무간섭)을 런타임에서 검증하는 게이트 1개를 둔다.

| Gate                   | 시점              | 통과 조건                                                                                                                                                                                                                                                                                                                         | 실패 시 대안                                                                                                                                                                                                          |
| ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1. 런타임 무간섭 검증 | Phase 3 완료 직후 | (a) **배경 on/off 비교** — DotBackground 장착/제거 상태에서 동일 조작(hover, pan, zoom) 시 Skia invalidation 카운트 증가 **0건** (기존 hover 경로의 RAF는 허용, 배경 때문에 추가된 것만 검출), (b) DotBackground의 pointermove 핸들러 frame budget **< 2ms**, (c) 기존 ViewportController의 드래그/선택/휠 zoom 동작 회귀 **0건** | (a) 실패 시 글로우 레이어를 scroll/pan 중 `opacity: 0` 강제로 축소. (b) 실패 시 대안 B(Canvas 2D)로 격리. (c) 실패 시 pointer 리스너를 캡처 페이즈로 이동하거나 `.canvas-container` 자식이 아닌 형제 레이어로 재배치. |

## Consequences

### Positive

- Builder workspace에 공간감 있는 시각적 배경 + 커서 피드백 확보
- Skia 렌더 파이프라인 완전 격리 → ADR-100 Unified Skia 경계 유지
- 시맨틱 토큰 활용으로 다크모드/테마 변경 시 추가 작업 0
- Stitch 수준의 시각 효과를 < 100 LoC 로 재현

### Negative

- `.canvas-container` 내부 DOM 복잡도 +2 노드 증가
- `useViewportSyncStore` React 구독이 1개 추가됨 (기존 `ZoomControls.tsx` 외 두 번째). 구독 비용은 미미.
- Safari 대응을 위해 `mask-image` 와 `-webkit-mask-image` 이중 선언 필요

## References

- Stitch (Google) React Flow 배경 패턴 분석 — 본 ADR 준비 과정에서 수행. 2레이어 SVG `<pattern>` + `mask-image: radial-gradient`. 외부 공개 문서 없음(내부 분석 결과).
- [ADR-100: Unified Skia Rendering Engine](100-unified-skia-rendering-engine.md)
- [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md)
- [canvas-rendering.md](../../.claude/rules/canvas-rendering.md)
- [css-tokens.md](../../.claude/rules/css-tokens.md)
