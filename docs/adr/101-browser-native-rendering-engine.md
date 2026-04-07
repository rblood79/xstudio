# ADR-101: Browser-Native Rendering Engine — "최고의 렌더링 엔진은 렌더링 엔진이 없는 것"

## Status

Proposed — 2026-04-06

Supersedes: [ADR-003](completed/003-canvas-rendering.md) (PixiJS Canvas Rendering), [ADR-008](completed/008-layout-engine.md) (Taffy WASM Layout Engine)

> "The best part is no part. The best process is no process."
> — Elon Musk, 5-Step Engineering Process

## Context

### Step 1: 요구사항을 덜 바보같이 만들어라

현재 composition는 **브라우저가 이미 완벽하게 하는 일을 다시 만들고 있다.**

| 우리가 만든 것                         | 브라우저가 이미 하는 것                          |
| -------------------------------------- | ------------------------------------------------ |
| CanvasKit/Skia WASM (6MB)              | GPU 가속 합성 렌더러 (0MB, 내장)                 |
| Taffy Rust WASM (flex/grid)            | Blink/WebKit/Gecko (CSS3 100%, 내장)             |
| WASM SpatialIndex (히트 테스트)        | `document.elementFromPoint()` (내장)             |
| specShapeConverter (10,000줄)          | CSS (수십줄의 스타일시트)                        |
| nodeRendererText (CanvasKit Paragraph) | 브라우저 텍스트 렌더링 (HarfBuzz 내장, 서브픽셀) |
| nodeRendererBorders (커스텀 보더)      | CSS border (한 줄)                               |
| dual-surface 캐싱                      | 브라우저 합성 레이어 캐싱 (자동)                 |
| 커스텀 dirty region                    | DOM 변경 감지 + 합성 레이어 (자동)               |

**바보같은 요구사항 목록:**

1. ~~"Canvas에서 CSS3를 구현해야 한다"~~ → **왜?** 브라우저가 CSS3를 완벽하게 렌더링한다. CSS3를 _다시 만드는_ 것은 브라우저를 _다시 만드는_ 것이다.
2. ~~"Skia로 렌더링해야 한다"~~ → **왜?** 브라우저의 렌더링 엔진은 수천 명의 엔지니어가 수십 년간 최적화한 결과다. 우리가 이길 수 없다.
3. ~~"WASM 레이아웃 엔진이 필요하다"~~ → **왜?** 브라우저 자체가 WASM보다 빠른 네이티브 C++ 레이아웃 엔진이다.
4. "무한 캔버스(zoom/pan)가 필요하다" → **유효.** 하지만 `CSS transform: scale() translate()`로 가능.
5. "선택/핸들 UI가 필요하다" → **유효.** 하지만 DOM 오버레이로 가능.
6. "60fps가 필요하다" → **유효.** 브라우저 합성 레이어는 이미 60fps.

**3개만 유효하고 나머지는 삭제 대상.**

### Step 2: 삭제하라

| 삭제 대상                           | 크기                           | 이유                                             |
| ----------------------------------- | ------------------------------ | ------------------------------------------------ |
| CanvasKit/Skia WASM                 | 6MB + ~15,000줄                | 브라우저가 이미 렌더링한다                       |
| PixiJS                              | ~450KB + ~5,000줄              | 브라우저가 이미 이벤트 처리한다                  |
| Taffy WASM                          | ~200KB + ~4,000줄              | 브라우저가 이미 CSS 레이아웃한다                 |
| WASM SpatialIndex                   | ~50KB + ~500줄                 | `elementFromPoint()` + `getBoundingClientRect()` |
| specShapeConverter                  | ~10,000줄                      | CSS로 직접 표현                                  |
| 13개 nodeRenderer 파일              | ~3,000줄                       | CSS가 렌더링한다                                 |
| effects.ts, fills.ts, blendModes.ts | ~500줄                         | CSS filter, background, mix-blend-mode           |
| canvas2dSegmentCache (텍스트 측정)  | ~600줄                         | 브라우저가 알아서 줄바꿈한다                     |
| dual-surface 캐싱 로직              | ~800줄                         | 브라우저 합성 레이어가 자동 캐싱한다             |
| **총 삭제**                         | **~6.7MB WASM + ~39,000줄 TS** |                                                  |

**삭제 후 남는 것:**

1. Zustand Store (상태 관리) — 유지
2. CSS 스타일시트 (렌더링) — Preview 것을 재활용
3. DOM 요소 (레이아웃 + 렌더링) — 브라우저에 위임
4. CSS transform (zoom/pan) — 캔버스 변환
5. DOM 오버레이 (선택/핸들) — 인터랙션 UI
6. Virtual DOM Pool (성능) — 대량 요소 처리

### Hard Constraints

| 제약           | 값                                   | 근거                        |
| -------------- | ------------------------------------ | --------------------------- |
| Canvas FPS     | ≥ 60fps                              | 편집 반응성                 |
| 초기 로드      | < 3초                                | 사용자 이탈 임계            |
| 번들 (초기)    | < 500KB                              | 네트워크 예산               |
| CSS3 레이아웃  | Level 3 완전                         | 노코드 빌더 = 브라우저 동일 |
| Preview 렌더링 | CSS 유지                             | 변경 없음                   |
| 브라우저 호환  | Chrome 90+, Safari 16+, Firefox 100+ | 타겟 사용자                 |

### 핵심 통찰

**Builder Canvas ≡ Preview iframe.**

현재 composition는 같은 요소를 **두 번** 렌더링하고 있다:

1. Builder Canvas: Skia + PixiJS + Taffy로 **CSS를 시뮬레이션**
2. Preview iframe: 브라우저 CSS로 **실제 렌더링**

이 두 경로가 완벽하게 일치해야 하는데, 근본적으로 다른 엔진이므로 **영원히 불일치**한다.
해법: **하나만 쓰면 된다.** Builder Canvas를 브라우저 CSS로 렌더링하면 Preview와 100% 일치가 보장된다.

## Alternatives Considered

### 대안 A: Browser-Native Live DOM (추천)

**"렌더링 엔진을 삭제하라."**

Builder Canvas 영역에 실제 DOM 요소를 렌더링. CSS transform으로 zoom/pan. DOM 오버레이로 선택/핸들.

**구조:**

```
Zustand Store
  → DOMBridge (store→DOM 동기화)
  → Live DOM Tree (실제 브라우저 렌더링)
       CSS transform: scale(zoom) translate(panX, panY)
  → InteractionOverlay (SVG/DOM, position:absolute)
       선택 박스, 리사이즈 핸들, 가이드, 호버
  → VirtualPool (DOM 요소 풀링, 뷰포트 밖 해제)
```

**핵심:**

- CSS3 100% — 브라우저 자체가 렌더링 엔진
- 레이아웃 엔진 0줄 — 브라우저가 수행
- WASM 0개 — 모든 것이 네이티브
- Preview와 100% 일치 — 같은 CSS 사용
- 초기 로드: WASM 6.7MB 제거 → 번들 90%+ 절감

**위험:**

- 기술: **LOW** — 브라우저가 모든 렌더링/레이아웃 수행, 검증 불필요
- 성능: **MEDIUM** — 수천 DOM 요소 시 reflow 비용. DOM 풀링으로 완화.
- 유지보수: **LOW** — CSS 표준 = 브라우저 업데이트가 자동으로 기능 추가
- 마이그레이션: **MEDIUM** — 캔버스 전체 재작성이지만 코드량은 대폭 감소

### 대안 B: OffscreenCanvas + DOM Layout Worker

DOM 레이아웃은 메인 스레드에서, 렌더링은 OffscreenCanvas Worker에서.

**구조:**

- 메인 스레드: DOM tree (layout) + Interaction
- Worker: OffscreenCanvas + 2D Context로 렌더링
- Layout 결과를 SharedArrayBuffer로 Worker에 전달

**위험:**

- 기술: **MEDIUM** — OffscreenCanvas 2D는 아직 제한적 (Safari 미지원 이슈)
- 성능: **LOW** — 렌더링이 Worker에서 실행, 메인 스레드 free
- 유지보수: **MEDIUM** — 2개 스레드 동기화 복잡도
- 마이그레이션: **HIGH** — Worker 통신 프로토콜 설계 필요

### 대안 C: Retained Mode SceneGraph + Custom Rust CSS3 Engine (ADR-100)

PixiJS/Taffy 제거하고 커스텀 Rust WASM CSS3 레이아웃 엔진 구축.

**위험:**

- 기술: **HIGH** — CSS3 레이아웃 엔진을 _다시 만든다_ (float/table/inline/multicol)
- 성능: **LOW** — WASM 네이티브 속도
- 유지보수: **HIGH** — CSS 스펙 변경마다 자체 엔진 업데이트 필요
- 마이그레이션: **MEDIUM** — Shadow Engine 병행

### Risk Threshold Check

| 대안                              |  기술  |  성능  | 유지보수 | 마이그레이션 | HIGH+ 수 |
| --------------------------------- | :----: | :----: | :------: | :----------: | :------: |
| **A: Browser-Native Live DOM**    |  LOW   | MEDIUM |   LOW    |    MEDIUM    |    0     |
| **B: OffscreenCanvas + Worker**   | MEDIUM |  LOW   |  MEDIUM  |     HIGH     |    1     |
| **C: Rust CSS3 Engine (ADR-100)** |  HIGH  |  LOW   |   HIGH   |    MEDIUM    |    2     |

- 대안 A: HIGH 0개. 모든 축 MEDIUM 이하.
- 대안 B: HIGH 1개 (마이그레이션). Safari OffscreenCanvas 2D 미지원이 hard constraint 위반 가능.
- 대안 C: HIGH 2개 (기술 + 유지보수). CSS3 엔진을 처음부터 만드는 것은 **수천 명이 수십 년간 만든 것을 혼자 재현하겠다는 것**.

**루프 판정**: 대안 A가 유일하게 HIGH 0개. 대안 C는 "브라우저를 다시 만든다"는 근본적 문제. 대안 B는 Safari 호환성 이슈.

## Decision

**대안 A: Browser-Native Live DOM** 선택.

### Musk 5단계 적용 근거

**Step 1 (요구사항 검증)**: "Canvas에서 CSS3를 구현해야 한다"는 바보같은 요구사항이었다. 진짜 요구사항은 "사용자가 편집하는 화면이 배포 결과와 동일해야 한다"이다. 같은 렌더링 엔진(브라우저)을 쓰면 자동으로 달성된다.

**Step 2 (삭제)**: CanvasKit(6MB), PixiJS(450KB), Taffy(200KB), WASM SpatialIndex, 13개 nodeRenderer, specShapeConverter — 전부 삭제. ~39,000줄 삭제, 6.7MB WASM 제거.

**Step 3 (단순화)**: Builder Canvas = 실제 DOM + CSS transform(zoom/pan) + DOM 오버레이(선택). 개념적으로 3개 레이어, 코드 ~5,000줄 이하.

**Step 4 (가속)**: WASM 3개 초기화(~2.5초) → 0개(0초). 초기 로드 시간이 근본적으로 제거됨.

**Step 5 (자동화)**: 브라우저가 CSS3 업데이트 시 자동으로 새 기능 지원. 유지보수 0.

### 성능 문제 해결: DOM 풀링 + 합성 레이어

"DOM이 느리다"는 통념에 대한 반론:

1. **DOM이 느린 것이 아니라 reflow가 느리다.** → `transform`, `opacity`만 변경하면 reflow 없이 합성 레이어에서 처리 (GPU 가속).
2. **수만 요소가 느린 것이지, 수천은 괜찮다.** → 노코드 빌더에서 한 페이지에 10,000+ 요소는 비현실적. 일반적으로 50~500개.
3. **뷰포트 밖 요소는 렌더 불필요.** → DOM 풀링(virtualization)으로 뷰포트 내 요소만 DOM에 존재.
4. **레이아웃은 변경된 서브트리만 재계산.** → CSS containment (`contain: layout style paint`)으로 격리.
5. **Skia WASM도 결국 JavaScript→WASM→GPU 경로.** → 브라우저 네이티브 C++→GPU 경로가 더 짧다.

```
현재 경로:  JS → WASM(Taffy) → JS → WASM(CanvasKit) → WebGL → GPU
브라우저:   DOM mutation → Style → Layout → Paint → Composite → GPU
                         (전부 네이티브 C++, 최적화 30년)
```

### 기각 사유

- **대안 B (OffscreenCanvas + Worker)**: Safari OffscreenCanvas 2D context 미지원 (2026년 기준). hard constraint 위반. Worker 통신 복잡도 대비 이점 불명확.
- **대안 C (Rust CSS3 Engine, ADR-100)**: CSS3 레이아웃 엔진을 Rust로 직접 구현하는 것은 **Chromium, WebKit, Gecko 팀이 수천 명이 수십 년간 해온 일을 소규모 팀이 재현하겠다는 것**. float + margin collapse + inline formatting context + table layout의 엣지 케이스만 수천 개. 이것을 만드는 동안 브라우저는 CSS4를 출시할 것이다. 레이스에서 영원히 뒤쳐진다.

> 구현 상세: [101-browser-native-engine-breakdown.md](../design/101-browser-native-engine-breakdown.md)

## Gates

| Gate                  | 시점         | 통과 조건                                                        | 실패 시 대안                     |
| --------------------- | ------------ | ---------------------------------------------------------------- | -------------------------------- |
| G1: DOM 렌더링 파리티 | Phase 1 완료 | 기존 Preview CSS를 Builder Canvas에 적용, 100개 요소 시각적 동일 | CSS 격리 이슈 조사               |
| G2: Zoom/Pan 성능     | Phase 2 완료 | CSS transform zoom/pan이 60fps, 500 요소                         | will-change + containment 최적화 |
| G3: DOM 풀링 성능     | Phase 3 완료 | 1000 요소 페이지에서 스크롤/줌 60fps, DOM에 동시 존재 <300개     | 풀링 전략 조정 (더 적극적 해제)  |
| G4: 인터랙션 동등성   | Phase 4 완료 | 선택/드래그/리사이즈/텍스트 편집이 기존과 동일 UX                | 개별 인터랙션 fallback           |
| G5: 전체 기능 동등성  | Phase 5 완료 | 기존 Builder 기능 100% 재현 + CSS3 100%                          | 남은 기능 점진 마이그레이션      |

## Consequences

### Positive

- **WASM 6.7MB 제거** → 초기 로드 ~2.5초 → ~0.5초 (JS만, WASM 초기화 0)
- **~39,000줄 삭제** → 유지보수 코드 대폭 감소, 새 개발자 온보딩 단순화
- **CSS3 100% 자동** → 브라우저 업데이트 = 새 CSS 기능 자동 지원 (subgrid, container queries, :has() 등)
- **Preview ≡ Canvas** → 두 렌더링 경로 불일치 문제 근본 제거 (정합성 검증 불필요)
- **WebGL 컨텍스트 0개** → GPU 메모리 완전 해방, 모바일 안정성 극대화
- **접근성 자동** → 실제 DOM이므로 스크린 리더, 키보드 네비게이션 자동 작동
- **SEO/크롤링** → Canvas는 크롤러가 읽을 수 없지만 DOM은 읽을 수 있음
- **개발 속도** → CSS3 엔진 구현(ADR-100: 수개월) 대신 DOM 풀링(수주)

### Negative

- **Canvas 특유 기능 제한** — 픽셀 단위 셰이더 효과, 커스텀 블렌드 모드 등 Canvas/WebGL 전용 기능 사용 불가
- **DOM 조작 오버헤드** — 수천 요소 변경 시 reflow 비용 (풀링 + containment로 완화)
- **CSS 격리 복잡도** — Builder UI의 CSS와 사용자 콘텐츠 CSS가 충돌하지 않도록 격리 필요 (Shadow DOM 또는 iframe)
- **줌/팬 품질** — CSS transform scale은 비트맵 스케일링 → 고배율에서 흐림 (SVG 또는 re-render로 완화)
- **기존 Skia 투자 포기** — 13개 nodeRenderer, specShapeConverter 등 기존 투자 매몰 비용
- **Spec 렌더링 경로 재설계** — ComponentSpec shapes가 현재 Skia 전용이므로 CSS 표현으로 변환 필요
