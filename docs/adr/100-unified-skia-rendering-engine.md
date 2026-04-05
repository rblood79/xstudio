# ADR-100: Unified Skia Rendering Engine — PixiJS/Taffy 제거 및 CSS3 단일 렌더러

## Status

Proposed — 2026-04-06

Supersedes: [ADR-003](completed/003-canvas-rendering.md) (PixiJS Canvas Rendering), [ADR-008](completed/008-layout-engine.md) (Taffy WASM Layout Engine)

## Context

### 문제

XStudio Builder Canvas는 현재 **3개의 독립 엔진**이 동시 운영되는 Dual Renderer 아키텍처:

- **CanvasKit/Skia WASM**: 실제 화면 렌더링 (100%)
- **PixiJS v8.14.3**: 씬 그래프 + 이벤트 레이어 (alpha=0, WebGL 컨텍스트 #2)
- **Taffy WASM (Rust)**: Flex/Grid/Block 레이아웃 계산

이 구조의 근본적 문제:

1. **정합성 동기화 비용**: Skia↔PixiJS 위치 동기화, 카메라 변환 이중 적용, 레이아웃 결과 3곳 배포
2. **리소스 낭비**: WebGL 컨텍스트 2개, GPU 메모리 이중 점유, @pixi/react React 렌더 사이클
3. **CSS3 커버리지 한계**: Taffy는 flex/grid/block만 지원 (~75%), float/table/inline/multicol/sticky 미구현
4. **퍼포먼스 병목 복합**: 초기 WASM 3개 로딩, 대량 요소 시 3곳 갱신, 드래그 중 동기화 지연

### Hard Constraints

| 제약           | 값                                   | 근거                                        |
| -------------- | ------------------------------------ | ------------------------------------------- |
| Canvas FPS     | ≥ 60fps                              | 편집 반응성 (기존 성능 기준)                |
| 초기 로드      | < 3초                                | 사용자 이탈 임계                            |
| 번들 (초기)    | < 500KB (WASM 제외)                  | 네트워크 예산                               |
| CSS3 레이아웃  | Level 3 완전                         | 노코드 빌더 = 브라우저 결과물과 동일해야 함 |
| Preview 렌더링 | CSS 유지 (변경 없음)                 | Builder Canvas만 대상                       |
| 브라우저 호환  | Chrome 90+, Safari 16+, Firefox 100+ | 타겟 사용자                                 |

### Soft Constraints

- Shadow Engine 방식 (병렬 개발 → 기능 동등성 → 전환)으로 마이그레이션 리스크 최소화
- WebGPU 전환 경로를 추상화 레이어로 준비 (현재는 WebGL2)
- Pretext 원리 기반 텍스트 측정 (ADR-051) 통합

## Alternatives Considered

### 대안 A: Retained Mode Scene Graph + Custom Rust CSS3 Engine (추천)

PixiJS와 Taffy를 모두 제거하고, 순수 TypeScript SceneGraph + 커스텀 Rust WASM CSS3 레이아웃 엔진으로 대체.

**구조:**

```
Zustand Store
  → StoreBridge (구독, diff 감지)
  → SceneGraph (순수 TS retained mode, dirty flag)
  → CSS3 Layout Engine (Rust WASM, Taffy fork 기반 확장)
  → SkiaRenderer (dirty region 기반 부분 렌더)
  → DOM Events → WASM SpatialIndex → SceneGraph → Store
```

**Layout Engine 전략:**

- Taffy의 검증된 flex/grid 알고리즘을 **포크**하여 기반
- Float, inline, inline-block, table, multicol, sticky를 Servo layout2020 **알고리즘 참조**하여 추가 구현
- 텍스트 측정: Pretext 원리 기반 Canvas 2D (ADR-051) → Break Hint → CanvasKit 렌더링
- 단일 WASM 바이너리로 통합 (layout + spatial index)

**CSS3 렌더링 확장:**

- backdrop-filter (SaveLayer + blur behind)
- text-shadow (CanvasKit ParagraphStyle shadow)
- mask-image (CanvasKit Shader mask)
- CSS transitions/animations (SceneGraph 프레임 보간)
- sepia, invert 필터 (ColorMatrix 확장)
- outline-style (dashed, dotted 추가)
- grid-template-areas (네이밍 영역 → 숫자 변환)

**위험:**

- 기술: **HIGH** — CSS3 레이아웃 엔진 직접 구현 (float/table/inline/multicol)
- 성능: **LOW** — React 렌더 사이클 제거 + dirty region + WebGL 컨텍스트 절반
- 유지보수: **MEDIUM** — 자체 레이아웃 엔진 유지 부담, 하지만 완전한 제어
- 마이그레이션: **MEDIUM** — Shadow Engine으로 기존 시스템과 병행 가능

### 대안 B: PixiJS 제거 + Taffy 유지 + CSS3 렌더링만 확장

PixiJS만 제거하고 Taffy는 유지. CSS3 레이아웃 갭(float/table/inline)은 구현하지 않음.

**구조:**

- SceneGraph + 기존 Taffy WASM + Skia 렌더링 확장
- 레이아웃은 현재 수준 유지 (flex/grid/block ~75%)

**위험:**

- 기술: **LOW** — 레이아웃 변경 없음, PixiJS 제거만
- ��능: **MEDIUM** — WebGL 절반이지만 React 트리 유지 시 한계
- 유지보수: **LOW** — 기존 Taffy 생태계 활용
- 마이그레이션: **LOW** — 변경 범위 최소

### 대안 C: 브라우저 위임 Layout + Skia 렌더링

숨겨진 offscreen DOM에 CSS 적용 → `getBoundingClientRect()`로 레이아웃 → Skia 렌더링.

**구조:**

- Shadow DOM으로 CSS3 100% 레이아웃 (브라우저 엔진 활용)
- 레이아웃 결과를 SceneGraph에 주입
- Skia는 렌더링만 담당

**위험:**

- 기술: **LOW** — 브라우저가 레이아웃 계산, 검증 불필요
- 성능: **HIGH** — DOM 조작 오버헤드, 수천 요소 시 reflow 비용, 60fps 위험
- 유지보수: **LOW** — 브라우저 CSS 엔진에 위임
- 마이그레이션: **LOW** — 기존 Preview CSS 코드 재활용 가능

### Risk Threshold Check

| 대안                            | 기술 |  성능  | 유지보수 | 마이그레이션 | HIGH+ 수 |
| ------------------------------- | :--: | :----: | :------: | :----------: | :------: |
| **A: SceneGraph + Rust CSS3**   | HIGH |  LOW   |  MEDIUM  |    MEDIUM    |    1     |
| **B: PixiJS 제거 + Taffy 유지** | LOW  | MEDIUM |   LOW    |     LOW      |    0     |
| **C: 브라우저 위임 Layout**     | LOW  |  HIGH  |   LOW    |     LOW      |    1     |

- 대안 A: HIGH 1개 (기술) — CSS3 레이아웃 엔진 구현 복잡도. **완화**: Taffy fork으로 flex/grid 검증 코드 재활용 + Servo 알고리즘 참조 + Phase별 점진 구현 + 각 Phase Gate로 Go/No-Go 판정
- 대안 B: HIGH 0개 — 안전하지만 CSS3 완전 지원 요구사항 미충족 (hard constraint 위반)
- 대안 C: HIGH 1개 (성능) — DOM reflow가 60fps 제약과 직접 충돌. **완화 어려움**: 요소 수 증가에 비례하는 DOM 비용은 구조적 한계

**루프 판정**: 대안 B는 CSS3 hard constraint 미충족으로 탈락. 대안 A와 C만 비교 대상. 대안 A의 HIGH는 점진적 구현과 Phase Gate로 완화 가능하지만, 대안 C의 HIGH는 구조적으로 완화 불가 (DOM reflow는 요소 수에 O(n)).

## Decision

**대안 A: Retained Mode Scene Graph + Custom Rust CSS3 Engine** 선택.

### 위험 수용 근거

유일한 HIGH 위험인 "CSS3 레이아웃 엔진 구현 복잡도"를 다음으로 완화:

1. **Taffy fork**: flex/grid는 이미 검증된 코드 재활용 (0에서 시작이 아님)
2. **Servo 참조**: float/table/inline 알고리즘은 Servo layout2020에서 로직만 참조 (구조 의존 없음)
3. **Phase Gate**: 각 레이아웃 모드(float → inline → table → multicol → sticky)를 독립 Phase로 분리, Go/No-Go 판정
4. **Shadow Engine**: 기존 시스템과 병행 운영하므로 실패 시 롤백 가능
5. **Pretext 텍스트 측정**: ADR-051의 Canvas 2D 측정을 통합하여 텍스트 레이아웃 정합성 확보

### 기각 사유

- **대안 B (Taffy 유지)**: CSS Level 3 완전 지원이 hard constraint인데 flex/grid/block만으로는 ~75% 커버리지. float, table, inline 미지원은 노코드 빌더로서 치명적 한계.
- **대안 C (브라우저 위임)**: 수천 요소의 DOM reflow 비용이 60fps 제약과 구조적으로 충돌. 드래그 중 실시간 레이아웃 재계산에서 프레임 드롭 불가피.

> 구현 상세: [100-unified-skia-engine-breakdown.md](../design/100-unified-skia-engine-breakdown.md)

## Gates

| Gate                                | 시점         | 통과 조건                                                       | 실패 시 대안                               |
| ----------------------------------- | ------------ | --------------------------------------------------------------- | ------------------------------------------ |
| G1: Rust CSS3 엔진 flex/grid 패리티 | Phase 1 완료 | Taffy 대비 flex/grid 레이아웃 결과 100% 일치 (기존 테스트 통과) | Taffy 유지하고 래퍼만 교체                 |
| G2: SceneGraph + Skia 단일 렌더     | Phase 2 완료 | PixiJS 없이 기존 캔버스 기능 100% 동작, 60fps 유지              | PixiJS 이벤트 레이어만 유지                |
| G3: Float/Inline 레이아웃           | Phase 3 완료 | float, inline, inline-block 레이아웃이 CSS 결과와 ≤1px 오차     | 해당 레이아웃만 브라우저 위임 (하이브리드) |
| G4: Table/Multicol 레이아웃         | Phase 4 완료 | table, multi-column 레이아웃이 CSS 결과와 ≤1px 오차             | 해당 레이아웃만 브라우저 위임 (하이브리드) |
| G5: 성능 벤치마크                   | Phase 5 완료 | 1000 요소 캔버스에서 60fps, 초기 로드 <3초, 드래그 지연 <16ms   | 프로파일링 후 hot path 최적화 반복         |
| G6: Shadow→Production 전환          | Phase 6 완료 | 기존 기능 100% 동등성 + 성능 동등 이상 + CSS3 확장 동작         | Shadow 엔진 계속 병행, 점진 전환           |

## Consequences

### Positive

- **WebGL 컨텍스트 1개 → GPU 메모리 ~50% 절감**, 모바일/저사양 디바이스 안정성 향상
- **React 렌더 사이클 제거** → 드래그/리사이즈 중 zero GC pressure, 프레임 드롭 제거
- **CSS Level 3 완전 지원** → 노코드 빌더의 "브라우저와 동일한 결과" 약속 달성
- **단일 레이아웃 WASM** (layout + spatial index) → WASM 초기화 횟수 3→1, 초기 로드 개선
- **Dirty Region 렌더링** → 대량 요소 시 O(changed) 성능, 1000+ 요소 캔버스에서도 60fps
- **WebGPU 마이그레이션 경로** → GPU 백엔드 추상화로 향후 WebGPU 전환 비용 최소화
- **코드 단순화** → @pixi/react 제거로 ElementSprite/BoxSprite/TextSprite React 트리 제거, ~3000줄+ 삭제

### Negative

- **개발 기간 장기** — CSS3 레이아웃 엔진 구현에 수개월 소요 (특히 float, table)
- **자체 레이아웃 엔진 유지 부담** — Taffy 커뮤니티 업데이트를 직접 포팅해야 함
- **Shadow Engine 병행 기간** — 전환 완료까지 두 시스템 공존, 일부 기능 이중 구현
- **CSS3 엣지 케이스** — 브라우저별 CSS 해석 차이 (특히 float + margin collapse)를 자체 엔진에서 재현해야 함
- **영향 범위 광범위** — Builder Canvas 전체 파일 (~50개) 수정/교체, apps/builder/src/builder/workspace/canvas/ 하위 대부분
