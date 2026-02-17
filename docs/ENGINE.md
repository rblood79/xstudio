# 레이아웃 엔진 교체 타당성 검토

> 작성일: 2026-02-17
> 최종 수정: 2026-02-17 (전략 D: Dropflow Fork + Taffy 보완 분석 추가)
> 대상: `apps/builder/src/builder/workspace/canvas/layout/`
> 현재 스택: @pixi/layout (Yoga 3.2.1) + @pixi/ui 2.3.2 + 커스텀 BlockEngine + 커스텀 GridEngine + Rust WASM 가속
> 검토 대상: Taffy (Rust WASM), Dropflow (TypeScript), @pixi/ui 로직 추출

---

## 0. 현재 문제점 요약

| 문제 | 영향 | 근본 원인 |
|------|------|----------|
| @pixi/layout + 커스텀 엔진 충돌 | 레이아웃 깨짐, 위치 오차 | Yoga와 커스텀 BlockEngine/GridEngine 좌표계 불일치 |
| @pixi/ui 이벤트 충돌 | 클릭/호버 오작동 | PixiJS EventBoundary와 @pixi/ui 이벤트 중복 |
| 3개 독립 CSS 파서 | 동일 값 다른 해석 | `parseSize`, `parseCSSValue`, `parseCSSSize` 파편화 |
| formatStyles 캐싱 버그 | 스타일 삭제 시 이전 값 잔존 | @pixi/layout의 shallow merge 최적화 |
| Yoga 한계 | Block, Grid, margin collapse 미지원 | Yoga = Flexbox 전용 |

---

## 1. 현재 레이아웃 아키텍처

```
CSS Style (사용자 입력)
    |
    +-- display: flex/inline-flex --> FlexEngine (shouldDelegate: true)
    |                                   --> @pixi/layout (Yoga WASM) 위임
    +-- display: block/inline-block --> BlockEngine (커스텀 JS + Rust WASM)
    +-- display: grid/inline-grid ---> GridEngine (커스텀 JS + Rust WASM)
    |
    +-- styleToLayout.ts ------------> Yoga layout prop 변환
    +-- styleConverter.ts -----------> PixiJS 시각 속성 변환
    +-- engines/utils.ts ------------> Box Model, 텍스트 측정
```

### 엔진별 구현 현황

| 엔진 | 구현 상태 | WASM 가속 | 핵심 기능 |
|------|----------|----------|----------|
| FlexEngine | @pixi/layout 위임 | Yoga WASM | flex-direction, wrap, gap, align, justify |
| BlockEngine | 커스텀 (~150줄) | children > 10개 시 Rust | margin collapse, BFC, inline-block |
| GridEngine | 커스텀 (~80줄) | auto-flow 시 Rust | template-columns/rows, auto-flow, areas |

### @pixi/ui 실제 사용 현황

| 컴포넌트 | 파일 | 대체 가능성 |
|---------|------|-----------|
| FancyButton | PixiButton, PixiFancyButton, PixiToggleButton 등 6개 | PixiJS 이벤트 + 커스텀 렌더링으로 대체 가능 |
| ScrollBox | PixiListBox, PixiScrollBox | 커스텀 스크롤 로직 필요 |
| Slider | PixiSlider | 커스텀 드래그 로직 필요 |
| ProgressBar | PixiProgressBar | 단순 렌더링으로 대체 |
| MaskedFrame | PixiMaskedFrame | CanvasKit clipRect로 대체 |
| Select, List, Switcher | 각 1개 파일 | 커스텀 구현 필요 |

---

## 2. 제안: @pixi/ui 계산 로직 추출

@pixi/ui에서 실제 필요한 로직만 추출하여 Skia 렌더러에 적용한다.

### 추출 대상 분석

| 기능 | 코드량 | 추출 난이도 | 판정 |
|------|--------|-----------|------|
| border-box 크기 계산 (borderUtils.ts) | ~120줄 | 순수 수학, 즉시 추출 | **추출** |
| 텍스트 크기 측정 (measureTextWidth) | ~50줄 | Canvas 2D API 의존 | **교체** (Skia Paragraph API) |
| 색상 블렌딩 (adjustColor, mixWithBlack) | ~40줄 | 순수 수학, 즉시 추출 | **추출** |
| 둥근 모서리 경로 (smoothRoundRect) | ~190줄 | Skia RRectXY가 우수 | **불필요** |
| 이벤트 처리 (click, hover, drag) | ~60줄/컴포넌트 | EventBoundary가 이미 처리 | **불필요** |

### 추출 전략

```
@pixi/ui 의존성 제거 후:
1. borderUtils.ts --> utils/boxCalculation.ts (순수 함수)
2. measureTextWidth --> Skia ParagraphBuilder.getMaxIntrinsicWidth()
3. adjustColor/mixWithBlack --> utils/colorMath.ts (순수 함수)
4. FancyButton 등 UI --> PixiJS Container + CanvasKit 렌더링으로 재구현
5. ScrollBox --> 커스텀 스크롤 (CanvasKit clipRect + 이벤트)
```

### 예상 작업량

| 작업 | 기간 | 난이도 |
|------|------|--------|
| 순수 수학 로직 추출 (box, color) | 1일 | 하 |
| 텍스트 측정 Skia 교체 | 2일 | 중 |
| UI 컴포넌트 재구현 (Button, Slider 등) | 5-7일 | 중 |
| ScrollBox 커스텀 구현 | 3일 | 중-상 |
| @pixi/ui 의존성 제거 + 테스트 | 2일 | 중 |
| **합계** | **13-15일** | |

---

## 3. 제안: Taffy (Rust WASM) -- @pixi/layout(Yoga) 대체

### 3.1 Taffy 개요

- **저장소**: [DioxusLabs/taffy](https://github.com/DioxusLabs/taffy)
- **버전**: v0.9.2 (2025-11-22)
- **언어**: Rust
- **프로덕션 사용**: Servo (브라우저), Zed (에디터), Bevy (게임 엔진), Dioxus, Iced
- **GitHub Stars**: ~3,000
- **라이선스**: MIT/Apache-2.0

### 3.2 CSS 속성 지원 비교

| 속성 | Yoga (현재) | Taffy | 개선 |
|------|-----------|-------|------|
| **Flexbox** | O | O | 동등 |
| **CSS Grid** | X (제한적 PR 진행중) | O (250+ 테스트) | **핵심 개선** |
| **Block Layout** | X | O (feature flag) | **핵심 개선** |
| **calc()** | X | O | **개선** |
| **box-sizing** | content-box만 | content-box + border-box | 개선 |
| **aspect-ratio** | O | O | 동등 |
| **gap** | O | O | 동등 |
| **min/max size** | O | O | 동등 |
| **position** | relative, absolute | relative, absolute | 동등 |
| **overflow** | O | O + scrollbar_width | 개선 |
| **text-align** | X | O | 개선 |

### 3.3 성능 비교 (WASM)

| 시나리오 | Taffy WASM | Yoga WASM | 비고 |
|---------|-----------|-----------|------|
| 10,000 노드 생성 (최적화 후) | ~5-19ms | ~5-15ms | 동등 수준 |
| Chrome 기준 | ~19ms | ~15ms | Yoga 약간 우세 |
| Firefox 기준 | ~5ms | ~10ms | Taffy 2배 빠름 |
| WASM 바이너리 크기 | ~200KB | ~290KB | Taffy 더 작음 |

> 주의: 초기 벤치마크에서 Taffy가 느려 보인 원인은 WASM 경계를 넘는 반복적 스타일 파싱이었으며, `Style::DEFAULT` 기반 변경점 전용 설정으로 해결됨.

### 3.4 WASM 바인딩 현황

| 바인딩 | 상태 | 비고 |
|--------|------|------|
| 공식 PR #394 | Draft/미완성 | ~350줄, setter만 존재, getter 미구현 |
| @loading/taffy (JSR) | v0.1.2, 2년 전 | 구버전 Taffy, Deno 전용 |
| @takumi-rs/wasm | 프로덕션 사용 | Taffy 내부 사용, 간접 참고 가능 |

### 3.5 직접 WASM 빌드 시 필요 작업

```
필요 도구:
- Rust 툴체인 + wasm32-unknown-unknown 타겟
- wasm-pack (이미 프로젝트에 사용 중)
- wasm-opt (선택, 크기 최적화)

빌드 파이프라인 (기존 xstudio-wasm 확장):
wasm/
├── Cargo.toml          # taffy 의존성 추가
├── src/
│   ├── lib.rs
│   ├── block_layout.rs  # 기존 유지
│   ├── grid_layout.rs   # 기존 유지
│   ├── spatial_index.rs # 기존 유지
│   └── taffy_bridge.rs  # 신규: Taffy WASM 바인딩
```

### 3.6 Taffy 통합 장단점

**장점:**
1. Flexbox + Grid + Block을 **단일 엔진**으로 통합 (현재 3개 엔진 → 1개)
2. 현재 커스텀 BlockEngine/GridEngine 제거 가능 → 코드 복잡도 대폭 감소
3. calc() 네이티브 지원 → CSS 파서 L2 문제 부분 해결
4. 기존 Rust WASM 인프라(`wasm/`, `wasm-pack`, `Cargo.toml`) 재활용 가능
5. 프로덕션 검증됨 (Servo, Zed, Bevy)
6. WASM 바이너리 ~200KB로 Yoga(~290KB)보다 작음

**단점:**
1. 공식 WASM 바인딩이 미완성 → 직접 바인딩 작성 필요 (~350-500줄)
2. npm 패키지 부재 → 직접 빌드/유지보수 부담
3. TypeScript 타입 자동생성 시 `any` 포함 → 수동 보강 필요
4. WASM 경계 오버헤드 → 배치 API 설계 필요
5. Layout 결과에 padding/border/content 치수 미포함 이슈
6. Send/Sync bounds 문제 (measure function)

### 3.7 예상 작업량

| 작업 | 기간 | 난이도 |
|------|------|--------|
| Rust 바인딩 크레이트 작성 (taffy_bridge.rs) | 3-5일 | 중 |
| wasm-pack 빌드 파이프라인 확장 | 1-2일 | 하 |
| TypeScript 타입 정의 보강 | 2-3일 | 중 |
| JS 래퍼 (메모리 관리 자동화) | 3-5일 | 중-상 |
| styleToLayout.ts 마이그레이션 | 5-7일 | 상 |
| FlexEngine/BlockEngine/GridEngine 통합 | 3-5일 | 상 |
| 테스트 (Flex + Grid + Block) | 3-5일 | 중 |
| 성능 최적화 (배치 API) | 3-5일 | 상 |
| **합계** | **23-37일** | |

---

## 4. 제안: Dropflow -- 커스텀 BlockEngine 대체

### 4.1 Dropflow 개요

- **저장소**: [chearon/dropflow](https://github.com/chearon/dropflow)
- **버전**: v0.6.1
- **언어**: 순수 TypeScript + HarfBuzz WASM (텍스트 셰이핑)
- **의존성**: 0개 (모든 JS 의존성 내장)
- **프로덕션 사용**: 캔버스 기반 스프레드시트, PDF 생성 등
- **라이선스**: MIT

### 4.2 CSS 속성 지원

| 카테고리 | 지원 속성 |
|---------|---------|
| **Block Formatting** | block, inline, inline-block, flow-root, none, float, clear |
| **Box Model** | margin (collapsing 포함), padding, width, height, box-sizing, border |
| **Inline Formatting** | color, font-*, line-height, text-align, vertical-align, white-space, word-break |
| **Position** | relative (지원), absolute/fixed (계획 중) |
| **Visual** | background-color, overflow, z-index, zoom |
| **텍스트** | writing-mode (부분), RTL/BiDi, word-spacing, overflow-wrap |

### 4.3 미지원 속성

| 속성 | 상태 | XStudio 영향 |
|------|------|-------------|
| **Flexbox** | 미지원 | Taffy 또는 Yoga로 보완 필수 |
| **Grid** | 미지원 | Taffy로 보완 필수 |
| **absolute/fixed** | 계획 중 | 직접 확장 또는 커스텀 처리 |
| **min/max-width/height** | 계획 중 | 직접 확장 필요 |

### 4.4 레이아웃/렌더링 분리 (핵심)

Dropflow는 레이아웃 계산과 렌더링을 **명시적으로 분리**:

```typescript
// 1. DOM 생성 (hyperscript API)
const doc = flow.dom(
  flow.h('div', { style: myStyle }, [
    flow.h('span', {}, [flow.t('Hello')]),
  ])
);

// 2. 레이아웃 계산만 (렌더링 없이)
const layoutTree = flow.layout(doc);
flow.reflow(layoutTree, 800, 600);

// 3. 좌표 추출 --> 기존 Skia 렌더러에 전달
const boxes = doc.query('span').boxes;
const area = boxes[0].getBorderArea();
// area.x, area.y, area.width, area.height
```

### 4.5 PaintBackend 인터페이스 (Skia 통합)

Dropflow는 커스텀 렌더링 백엔드를 공식 지원 (7개 메서드):

| PaintBackend 메서드 | CanvasKit 대응 |
|---------------------|---------------|
| `rect(x, y, w, h)` | `canvas.drawRect()` |
| `edge(x, y, len, side)` | `canvas.drawLine()` |
| `text(x, y, item, start, end)` | `canvas.drawText()` / `drawGlyphs()` |
| `pushClip(x, y, w, h)` | `canvas.save()` + `clipRect()` |
| `popClip()` | `canvas.restore()` |
| `image(x, y, w, h, img)` | `canvas.drawImage()` |

### 4.6 성능 벤치마크

| 시나리오 | 시간 (2019 MacBook Pro) |
|---------|----------------------|
| 10글자 단어 레이아웃 + 이미지 | < 25 microseconds |
| 8 문단 + 인라인 스팬 | 9ms |
| 500+ 문단 (어린왕자 전문) | 160ms |

### 4.7 Dropflow 통합 장단점

**장점:**
1. CSS2 Block/Inline 레이아웃 **세계 최고 수준** 구현
2. Margin Collapse, BFC, Float/Clear 정확 구현 → 현재 커스텀 BlockEngine 대체
3. 순수 TypeScript → 빌드 파이프라인 추가 없이 소스 코드 직접 통합
4. PaintBackend 인터페이스로 CanvasKit 직접 연동 가능
5. HarfBuzz 기반 텍스트 셰이핑 → 비라틴 스크립트/RTL 지원
6. layout()/reflow()로 좌표만 추출 가능 (렌더링 분리)
7. 의존성 0개 → 번들 충돌 위험 없음

**단점:**
1. Flexbox/Grid **미지원** → 보완 엔진 필수
2. absolute/fixed positioning 미지원 → 직접 확장 필요
3. min/max-width/height 미지원 → 직접 확장 필요
4. HarfBuzz WASM 추가 번들 (+200-400KB) → 초기 로드 영향
5. CanvasKit 내부 HarfBuzz와 중복 → 폰트 이중 관리
6. v0.6.1 (2019 릴리스), 1인 프로젝트 → 장기 유지보수 리스크
7. 0.x 버전 → API breaking changes 가능성

### 4.8 예상 작업량

| 작업 | 기간 | 난이도 |
|------|------|--------|
| Dropflow 소스 코드 포팅 (레이아웃만) | 3-5일 | 중 |
| CanvasKit PaintBackend 구현 | 2-3일 | 중 |
| 기존 BlockEngine 대체 연동 | 3-5일 | 상 |
| HarfBuzz WASM 중복 해결 (또는 CanvasKit 텍스트로 교체) | 3-5일 | 상 |
| absolute/fixed, min/max 확장 | 5-7일 | 상 |
| 테스트 | 3-5일 | 중 |
| **합계** | **19-30일** | |

---

## 5. 통합 전략 비교

### 전략 A: Taffy 단일 엔진 (Yoga + 커스텀 Block + 커스텀 Grid 모두 대체)

```
변경 전:                          변경 후:
FlexEngine --> Yoga WASM          |
BlockEngine --> 커스텀 JS/Rust     +--> Taffy WASM (통합)
GridEngine --> 커스텀 JS/Rust      |
```

| 항목 | 평가 |
|------|------|
| 코드 복잡도 감소 | 3개 엔진 → 1개 엔진 (대폭 감소) |
| CSS 커버리지 | Flex + Grid + Block + calc() |
| Block Layout 정밀도 | 중간 (Taffy block은 기본 수준, margin collapse 부분 지원) |
| 텍스트 레이아웃 | 미지원 (별도 텍스트 측정 필요) |
| WASM 바인딩 작업 | ~350-500줄 Rust 바인딩 직접 작성 |
| 기존 인프라 활용 | 높음 (Cargo.toml, wasm-pack 재활용) |
| **총 예상 기간** | **23-37일** |

### 전략 B: Taffy(Flex+Grid) + Dropflow(Block) 듀얼 엔진

```
변경 전:                          변경 후:
FlexEngine --> Yoga WASM          FlexEngine --> Taffy WASM
BlockEngine --> 커스텀 JS/Rust     BlockEngine --> Dropflow (TS)
GridEngine --> 커스텀 JS/Rust      GridEngine --> Taffy WASM
```

| 항목 | 평가 |
|------|------|
| 코드 복잡도 | 2개 외부 엔진 (중간) |
| CSS 커버리지 | Flex + Grid + Block + calc() + Float + margin collapse + inline |
| Block Layout 정밀도 | 최고 (Dropflow = CSS2 세계 최고 수준) |
| 텍스트 레이아웃 | HarfBuzz 기반 정밀 텍스트 (Dropflow) |
| 추가 번들 크기 | Taffy ~200KB + HarfBuzz ~300KB |
| 엔진 간 좌표 동기화 | 복잡 (두 엔진 결과 합성 필요) |
| **총 예상 기간** | **35-55일** |

### 전략 C: Taffy(Flex+Grid) + 커스텀 Block 유지 (점진적 교체)

```
변경 전:                          변경 후:
FlexEngine --> Yoga WASM          FlexEngine --> Taffy WASM
BlockEngine --> 커스텀 JS/Rust     BlockEngine --> 기존 유지 (커스텀)
GridEngine --> 커스텀 JS/Rust      GridEngine --> Taffy WASM
```

| 항목 | 평가 |
|------|------|
| 코드 복잡도 | 1개 외부 엔진 + 1개 커스텀 (최소 변경) |
| CSS 커버리지 | Flex + Grid + calc() + 기존 Block |
| 리스크 | 최소 (커스텀 Block은 이미 검증됨) |
| 향후 확장 | Taffy block_layout 성숙 시 커스텀 Block 대체 가능 |
| **총 예상 기간** | **20-30일** |

---

## 6. 권장 전략

### 1차 권장: 전략 C (Taffy + 커스텀 Block 유지)

**이유:**

1. **리스크 최소화**: 검증된 커스텀 BlockEngine은 유지하면서, Yoga만 Taffy로 교체
2. **핵심 개선 확보**: CSS Grid 네이티브 지원 + calc() 추가
3. **기존 인프라 활용**: `wasm/Cargo.toml`에 `taffy` 의존성 추가, `wasm-pack` 파이프라인 재활용
4. **점진적 전환**: Feature Flag로 Yoga ↔ Taffy 전환 가능
5. **Dropflow는 보류**: Taffy의 block_layout이 성숙하면 커스텀 Block도 Taffy로 통합

### @pixi/ui 처리

전략과 무관하게 **@pixi/ui 로직 추출은 즉시 진행** 가능:

1. `borderUtils.ts`, `adjustColor`/`mixWithBlack` → 순수 함수 추출 (1일)
2. `measureTextWidth` → Skia Paragraph API 교체 (2일)
3. UI 컴포넌트 → 점진적 커스텀 교체 (Feature Flag)

### 구현 로드맵

```
Phase 0: @pixi/ui 로직 추출 (2주)
  - 순수 수학 로직 추출
  - 텍스트 측정 Skia 교체
  - UI 컴포넌트 커스텀 재구현

Phase 1: Taffy WASM 바인딩 (2-3주)
  - taffy_bridge.rs 작성
  - TypeScript 래퍼 + 타입 정의
  - 배치 API 설계 (WASM 경계 최적화)

Phase 2: FlexEngine 마이그레이션 (1-2주)
  - styleToLayout.ts → Taffy Style 변환
  - Yoga → Taffy 전환 (Feature Flag)
  - 회귀 테스트

Phase 3: GridEngine 통합 (1-2주)
  - 커스텀 GridEngine → Taffy Grid 위임
  - grid-template-areas, auto-flow 검증
  - 커스텀 GridEngine 코드 제거

Phase 4: @pixi/layout + @pixi/ui 의존성 제거 (1주)
  - Yoga WASM 제거
  - @pixi/layout 제거
  - @pixi/ui 제거
  - 번들 크기 검증

Phase 5: (향후) Taffy block_layout 검토
  - Taffy Block 성숙도 평가
  - 커스텀 BlockEngine → Taffy Block 전환 검토
  - Dropflow 재평가
```

---

## 7. 결론

| 판단 기준 | Taffy (Rust WASM) | Dropflow (TS) | @pixi/ui 추출 |
|----------|-------------------|---------------|---------------|
| 기술 타당성 | **가능** (기존 WASM 인프라 활용) | **가능** (순수 TS, 소스 통합) | **가능** (순수 함수 추출) |
| 핵심 가치 | Grid + Block + calc() 통합 엔진 | CSS2 Block 최고 수준 | 의존성 제거 + 렌더러 통합 |
| 리스크 | 중 (바인딩 직접 작성) | 중-상 (1인 프로젝트, HarfBuzz 중복) | 하 (순수 수학) |
| 우선순위 | **1순위** (핵심 교체) | **보류** (Taffy block 성숙 후 재검토) | **즉시** (병행 가능) |
| 예상 기간 | 20-30일 (전략 C) | 19-30일 (단독 사용 시) | 13-15일 |

### 최종 판정

> **@pixi/ui 로직 추출 + Taffy WASM 통합(전략 C)이 현재 가장 현실적이고 효과적인 접근이다.**
>
> - Taffy는 Yoga 대비 CSS 커버리지가 넓고(Grid, Block, calc()), 성능은 동등하며, 기존 Rust WASM 빌드 인프라를 재활용할 수 있다.
> - Dropflow는 Block Layout 정밀도가 뛰어나지만, Flexbox/Grid 미지원 + HarfBuzz 중복 + 유지보수 리스크로 인해 현 시점에서는 보류한다.
> - @pixi/ui 의존성 제거는 충돌 버그의 근본 원인 해결이므로 최우선 병행 작업으로 진행한다.
> - 라이브러리 설치가 아닌 **GitHub 소스 코드 기반 통합**은 Taffy의 경우 Cargo.toml 의존성 + wasm-pack으로 자연스럽게 달성되며, Dropflow는 소스 직접 포팅이 가능하다.

---

## 8. 전략 D: Dropflow Fork + Taffy 보완 (심층 분석)

> **배경:** 전략 C(Taffy + 커스텀 Block 유지) 검토 후, Taffy의 Block Layout 갭이 예상보다 크다는 사실이 발견됨.
> Dropflow를 Fork하여 Taffy가 커버하지 못하는 Inline Formatting Context를 보완하는 전략을 추가 검토.

### 8.1 Taffy Block Layout의 실제 갭 (심층 분석)

Taffy 메인테이너(Nico Burns)의 공식 입장 ([Issue #627](https://github.com/DioxusLabs/taffy/issues/627)):

> "inline / flow layout 지원은 계획되어 있으나, 대부분 Taffy **외부**(Parley, Cosmic-Text 같은 전문 텍스트 레이아웃 라이브러리)에서 구현될 것"

| 영역 | Taffy 상태 | 웹 빌더 필요도 | 비고 |
|------|-----------|--------------|------|
| **Inline Formatting Context** | 완전 부재 | 필수 | 텍스트+인라인 요소 혼합 배치 |
| `display: inline` | 없음 | 필수 | Display enum에 미포함 |
| `display: inline-block` | 없음 | 필수 | Display enum에 미포함 |
| `display: flow-root` | 없음 | 중간 | 명시적 BFC 생성 불가 |
| Line Box / 줄바꿈 | 없음 | 필수 | 텍스트 줄 배치 |
| `vertical-align` (라인 내) | 없음 | 높음 | 인라인 수직 정렬 |
| `white-space`, `word-break` | 없음 | 높음 | 텍스트 줄바꿈 규칙 |
| `line-height` | 없음 | 높음 | 라인 높이 제어 |
| 익명 블록 박스 생성 | 없음 | 높음 | CSS2 normal flow 필수 |
| Writing modes | 미지원 ([#752](https://github.com/DioxusLabs/taffy/issues/752)) | 중간 | RTL/세로쓰기 |
| Intrinsic sizing keywords | 미지원 ([#751](https://github.com/DioxusLabs/taffy/issues/751)) | 중간 | min-content, fit-content |
| `align-content` in Block | 미지원 ([#709](https://github.com/DioxusLabs/taffy/issues/709)) | 낮음 | 최신 CSS |
| Float (테스트) | 구현됨 (테스트 **5개**) | 중간 | 미성숙 |
| `width: auto` 블록 | **버그 ([#908](https://github.com/DioxusLabs/taffy/issues/908))** | 치명적 | shrink-to-fit 오동작 |

**결론: Taffy만으로는 웹 빌더의 Block/Inline 레이아웃을 해결할 수 없다.**

### 8.2 현재 BlockEngine vs Dropflow 상세 비교

#### 현재 BlockEngine 구현 현황 (949줄 + Rust 626줄)

| 기능 | BlockEngine | Dropflow | 판정 |
|------|------------|----------|------|
| Margin Collapse (인접 블록) | 완전 구현 | 완전 구현 | 동등 |
| Margin Collapse (부모-자식) | 완전 구현 | 완전 구현 | 동등 |
| Empty Block Self-Collapse | 완전 구현 | 완전 구현 | 동등 |
| BFC (9가지 조건) | 완전 구현 | 완전 구현 | 동등 |
| Inline-block + LineBox | 완전 구현 | 완전 구현 | 동등 |
| vertical-align (4가지) | baseline, top, bottom, middle | + text-top, text-bottom, super, sub | **Dropflow 우위** |
| min/max-width/height | 완전 구현 | 미구현 (planned) | **BlockEngine 우위** |
| fit-content / intrinsic sizing | 완전 구현 | 미구현 | **BlockEngine 우위** |
| box-sizing: border-box | 완전 구현 | 완전 구현 | 동등 |
| CSS Blockification | 완전 구현 | 완전 구현 | 동등 |
| WASM 가속 | children > 10 시 Rust | 순수 TS | **BlockEngine 우위** |
| **Float / Clear** | **미구현** | 완전 구현 | **Dropflow 필수** |
| **display: inline** | **미구현** | 완전 구현 | **Dropflow 필수** |
| **블록+인라인 혼합 콘텐츠** | **미구현** | CSS2 normal flow | **Dropflow 필수** |
| **익명 블록/인라인 박스** | **미구현** | 자동 생성 | **Dropflow 필수** |
| **position: absolute/fixed** | **미구현** | relative만 (absolute 계획중) | 둘 다 미흡 |
| **텍스트 줄바꿈 (word-break)** | **미구현** | HarfBuzz 기반 | **Dropflow 필수** |
| **RTL / BiDi** | **미구현** | SheenBidi WASM | **Dropflow 우위** |
| 테스트 케이스 | 19개 | 200+개 | **Dropflow 우위** |

### 8.3 Dropflow 소스 코드 레이어 분리

Dropflow 전체 소스: ~446KB / ~12,744줄 (22개 TS 파일 + 1 C++ 파일)

```
Layer A: 순수 레이아웃 (HarfBuzz 비의존) -- Fork 핵심 대상
├── layout-flow.ts   60KB ~1,700줄  Block FC, Float, Margin Collapse
├── layout-box.ts    24KB ~700줄    Box Model, BoxArea, Writing Mode
└── layout-image.ts   7KB ~200줄    이미지 치수 파싱
                     합계 ~91KB ~2,600줄

Layer B: 텍스트 레이아웃 (HarfBuzz 부분 의존) -- 인터페이스 추출 후 Fork
├── layout-text.ts      88KB ~2,500줄  Line breaking, positioning
│   └── HarfBuzz 직접 호출: shapePart() 계열 4곳에만 집중
├── text-line-break.ts  15KB ~430줄    UAX#14 줄바꿈 (순수 Unicode 로직)
└── text-grapheme-break.ts 7KB ~200줄  그래핌 경계 (순수 Unicode 로직)
                     합계 ~110KB ~3,130줄

Layer C: 텍스트 인프라 (HarfBuzz 완전 의존) -- 제외, CanvasKit으로 대체
├── text-harfbuzz.ts  17KB  HarfBuzz WASM 바인딩
├── text-font.ts      37KB  Font cascade, matching
└── text-itemize.ts   19KB  Script/Bidi/Style segmentation
                     합계 ~73KB (제외)

Layer D: 렌더링 -- 제외, 기존 Skia 파이프라인 유지
├── paint.ts          25KB  PaintBackend + stacking context
├── paint-canvas.ts   10KB  Canvas2D 구현
├── paint-html.ts      4KB  HTML 출력
└── paint-svg.ts       6KB  SVG 출력
                     합계 ~45KB (제외)

Layer E: DOM / Style / API -- 제외, XStudio 자체 시스템 사용
├── dom.ts, style.ts, api.ts 등
                     합계 ~127KB (제외)
```

**Fork 대상 합계: Layer A (~91KB) + Layer B (~110KB) = ~201KB, ~5,730줄**

### 8.4 HarfBuzz → CanvasKit 교체 전략

Dropflow의 HarfBuzz 의존은 `layout-text.ts`의 **4개 함수**에 집중:

1. `shapePartWithWordCache()` → `hb.shape()` 호출
2. `shapePartWithoutWordCache()` → `hb.shape()` 호출
3. `loadHyphen()` → 하이픈 글리프 shaping
4. `ShapedItem.reshape()` → 분할 후 재shaping

**교체 인터페이스:**

```typescript
// Dropflow 원본 (HarfBuzz 직접 호출)
function shapePart(
  text: string,
  font: LoadedFontFace,
  script: string,
  lang: string,
  direction: 'ltr' | 'rtl'
): ShapedItem {
  const buf = hb.createBuffer();
  hb.shape(font.hbFont, buf, features);
  return new ShapedItem(buf.extractGlyphs());
}

// Fork 후 (CanvasKit 어댑터)
function shapePart(
  text: string,
  font: CanvasKitFont,
  script: string,
  lang: string,
  direction: 'ltr' | 'rtl'
): ShapedItem {
  const paragraph = paragraphBuilder
    .addText(text)
    .build();
  paragraph.layout(Infinity); // single-line measurement
  return new CanvasKitShapedItem(paragraph);
}
```

| HarfBuzz 기능 | CanvasKit 대체 | 난이도 |
|--------------|---------------|--------|
| `hb.shape()` → 글리프 배열 | `Paragraph` API + `getGlyphPositionAtCoordinate()` | 중 |
| Font metrics (ascent, descent) | `SkFontMetrics` (직접 매핑) | 하 |
| Font coverage 확인 | `SkFont.getGlyphIDs()` → 0이면 미지원 | 하 |
| OpenType feature 분석 | 생략 가능 (웹 빌더에서 불필요) | - |
| BiDi (SheenBidi) | CanvasKit ICU 내장 BiDi | 하 |

**HarfBuzz WASM 완전 제거 → 번들 +0KB (CanvasKit이 이미 로드됨)**

### 8.5 Fork 패키지 구조

```
xstudio/
└── packages/
    └── layout-flow/                  # Dropflow Fork (MIT 라이선스)
        ├── package.json
        ├── LICENSE                   # MIT (원본: Caleb Hearon)
        ├── src/
        │   ├── layout-flow.ts        # Block FC, Float, Margin Collapse (Layer A)
        │   ├── layout-box.ts         # Box Model, BoxArea (Layer A)
        │   ├── layout-image.ts       # 이미지 치수 (Layer A)
        │   ├── layout-text.ts        # Line breaking + positioning (Layer B)
        │   ├── text-line-break.ts    # UAX#14 줄바꿈 규칙 (Layer B, 순수 로직)
        │   ├── text-grapheme-break.ts # 그래핌 경계 (Layer B, 순수 로직)
        │   ├── types.ts              # 공유 타입 정의
        │   └── adapters/
        │       └── canvaskit-shaper.ts  # shapePart() CanvasKit 구현
        └── tests/
            └── ...                   # Dropflow 원본 테스트 포팅

제외된 파일 (CanvasKit/XStudio가 담당):
  - text-harfbuzz.ts  → CanvasKit Paragraph API
  - text-font.ts      → CanvasKit SkFontMgr
  - text-itemize.ts   → CanvasKit ICU
  - paint-*.ts        → 기존 Skia nodeRenderers
  - dom.ts            → XStudio Zustand store
  - style.ts          → XStudio 스타일 시스템
  - api.ts            → XStudio 자체 API
```

### 8.6 전략 D 아키텍처

```
변경 전:                                변경 후:
                                        ┌─────────────────────────────────┐
FlexEngine  --> Yoga/@pixi/layout       │ Taffy WASM                     │
BlockEngine --> 커스텀 JS + Rust WASM    │  ├── Flexbox  (display: flex)  │
GridEngine  --> 커스텀 JS + Rust WASM    │  └── CSS Grid (display: grid)  │
(Inline 미지원)                         ├─────────────────────────────────┤
                                        │ Dropflow Fork (TypeScript)     │
                                        │  ├── Block FC (display: block) │
                                        │  ├── Inline FC (display: inline)│
                                        │  ├── Float / Clear             │
                                        │  ├── Margin Collapsing         │
                                        │  ├── Line Box + 텍스트 줄바꿈   │
                                        │  └── vertical-align (8가지)    │
                                        ├─────────────────────────────────┤
                                        │ CanvasKit/Skia (기존)          │
                                        │  ├── 텍스트 shaping (Paragraph) │
                                        │  ├── 폰트 관리 (SkFontMgr)     │
                                        │  └── 렌더링 (nodeRenderers)    │
                                        └─────────────────────────────────┘
```

**엔진 디스패처 변경:**

```typescript
// engines/index.ts 변경
export function selectEngine(display: string | undefined): LayoutEngine {
  switch (display) {
    case 'flex':
    case 'inline-flex':
      return new TaffyFlexEngine();     // Taffy WASM
    case 'grid':
    case 'inline-grid':
      return new TaffyGridEngine();     // Taffy WASM
    case 'block':
    case 'inline':
    case 'inline-block':
    case 'flow-root':
    default:
      return new DropflowBlockEngine(); // Dropflow Fork
  }
}
```

### 8.7 전략 비교 (C vs D)

| 항목 | 전략 C (Taffy + 커스텀 Block) | 전략 D (Taffy + Dropflow Fork) |
|------|-------------------------------|-------------------------------|
| **CSS 커버리지** | Flex + Grid + calc() + 기존 Block | **Flex + Grid + calc() + Block + Inline + Float** |
| **Inline 지원** | 미지원 (영구적 갭) | **완전 지원** (Dropflow) |
| **Float/Clear** | 미구현 | **완전 구현** (Dropflow) |
| **텍스트 줄바꿈** | 단순 측정만 | **UAX#14 + HarfBuzz급** (CanvasKit 어댑터) |
| **vertical-align** | 4가지 | **8가지** (text-top, sub 등 추가) |
| **블록+인라인 혼합** | 불가 | **CSS2 normal flow** |
| **코드 품질** | 커스텀 19개 테스트 | **Dropflow 200+ 테스트 기반** |
| **HarfBuzz 중복** | 없음 | **없음** (CanvasKit으로 교체) |
| **추가 번들** | Taffy ~200KB | Taffy ~200KB + Flow TS ~91KB (gzip ~25KB) |
| **엔진 수** | Taffy + 커스텀 Block = 2개 | Taffy + Dropflow = 2개 |
| **min/max 지원** | BlockEngine 자체 구현 | Fork에 추가 구현 필요 |
| **WASM 가속** | 기존 Rust 유지 | TS 기반 (WASM 가속 없음) |
| **유지보수 부담** | 커스텀 코드 유지 | Fork 코드 유지 |
| **기간** | 5-8주 | **12-15주** |
| **장기 CSS 커버리지** | Inline 영원히 미지원 | **CSS2 normal flow 완전 커버** |

### 8.8 Dropflow Fork 시 보완 필요 사항

Dropflow에 없지만 현재 BlockEngine이 가진 기능 → Fork에 추가 구현 필요:

| 기능 | 현재 BlockEngine | Dropflow | Fork 작업 |
|------|-----------------|----------|----------|
| min/max-width/height | `clampSize()` | 미지원 | `layout-flow.ts`에 clamp 로직 추가 (~50줄) |
| fit-content / intrinsic sizing | sentinel -2 패턴 | 미지원 | shrink-to-fit 확장 (~80줄) |
| position: absolute | blockification만 | relative만 | 절대 위치 계산 추가 (~200줄) |
| WASM 가속 (children > 10) | Rust block_layout.rs | 없음 | 성능 문제 시 hot path만 Rust 포팅 |
| CSS Blockification | `computeEffectiveDisplay()` | 있음 | 동등 |

**예상 추가 코드: ~330줄 (기존 BlockEngine에서 이식 가능)**

### 8.9 구현 로드맵 (전략 D)

```
Phase 0: @pixi/ui 로직 추출 (2주)
  - 순수 수학 로직 추출
  - 텍스트 측정 Skia 교체
  - UI 컴포넌트 커스텀 재구현

Phase 1: Dropflow Fork - Layer A 추출 (1주)
  - layout-flow.ts, layout-box.ts, layout-image.ts 포크
  - XStudio 타입 시스템에 맞게 인터페이스 조정
  - 불필요한 의존성 제거 (dom.ts, style.ts 참조 제거)

Phase 2: CanvasKit Shaper 어댑터 (2주)
  - shapePart() → CanvasKit Paragraph API 교체
  - ShapedItem.measure() → Paragraph.getLineMetrics() 매핑
  - font metrics 어댑터 (ascent, descent, lineGap)
  - text-line-break.ts, text-grapheme-break.ts 통합

Phase 3: BlockEngine → Dropflow Fork 교체 (2주)
  - engines/index.ts 디스패처 변경
  - styleToLayout.ts → Dropflow Style 변환 레이어
  - min/max-width/height, fit-content 보완 구현
  - 기존 BlockEngine 19개 테스트 → Dropflow Fork 회귀 테스트
  - 기존 BlockEngine.ts + block_layout.rs 제거

Phase 4: Taffy WASM 바인딩 (2-3주)
  - taffy_bridge.rs 작성
  - TypeScript 래퍼 + 타입 정의
  - 배치 API 설계 (WASM 경계 최적화)

Phase 5: FlexEngine Yoga → Taffy 전환 (1-2주)
  - styleToLayout.ts → Taffy Style 변환
  - Feature Flag로 Yoga ↔ Taffy 전환
  - 회귀 테스트

Phase 6: GridEngine → Taffy Grid 통합 (1-2주)
  - 커스텀 GridEngine → Taffy Grid 위임
  - grid-template-areas, auto-flow 검증

Phase 7: 레거시 제거 (1주)
  - @pixi/layout + @pixi/ui 의존성 제거
  - Yoga WASM 제거
  - 커스텀 BlockEngine + GridEngine 제거
  - 번들 크기 검증
```

### 8.10 리스크 및 완화 전략

| 리스크 | 심각도 | 완화 전략 |
|--------|--------|----------|
| CanvasKit Paragraph API가 shapePart() 인터페이스에 완전히 매핑되지 않을 수 있음 | 상 | Phase 2에서 PoC 먼저 진행, 실패 시 HarfBuzz WASM 유지 (번들 +300KB) |
| Dropflow 원본 업데이트와 Fork 동기화 부담 | 중 | Layer A (순수 레이아웃)만 Fork → 업데이트 빈도 낮음 (v0.6.1 이후 변화 적음) |
| min/max, absolute 보완 구현의 복잡도 | 중 | 기존 BlockEngine 코드에서 직접 이식 가능 (~330줄) |
| Dropflow Fork + Taffy 좌표 동기화 | 중 | 엔진 디스패처 수준에서 분리 → 동일 노드에 두 엔진 동시 적용 없음 |
| 성능 (WASM 가속 없는 TS 기반) | 중-하 | Dropflow 벤치마크: 8문단 9ms, 500+문단 160ms → 웹 빌더 규모에서 충분 |

### 8.11 전략 D 최종 판정

> **Dropflow Fork + Taffy 보완은 기술적으로 타당하며, 전략 C의 근본적 한계(Inline FC 영구 미지원)를 해결한다.**
>
> **핵심 근거:**
>
> 1. **Taffy의 구조적 한계**: 메인테이너가 inline/flow layout은 "Taffy 외부에서 구현"이라고 명시 (Issue #627). 이 갭은 Taffy 자체 업데이트로 해결되지 않는다.
>
> 2. **Dropflow의 모듈성**: HarfBuzz 의존이 `shapePart()` 4곳에 집중되어 있어 CanvasKit 어댑터로 교체 가능. Layer A(91KB)는 완전 독립적.
>
> 3. **HarfBuzz 중복 해결**: CanvasKit이 이미 HarfBuzz/ICU를 내장하므로, Dropflow의 HarfBuzz를 제거하면 번들 추가 비용 없음.
>
> 4. **기존 코드 재활용**: BlockEngine의 min/max, fit-content, blockification 로직을 Fork에 직접 이식 가능 (~330줄).
>
> 5. **테스트 품질 향상**: 19개 → 200+개 테스트 케이스 기반으로 신뢰도 대폭 상승.
>
> **권장: 전략 C → 전략 D로 변경. 단, Phase 2(CanvasKit Shaper PoC)의 성공이 전제 조건.**

---

## 9. 수정된 최종 결론

### 권장 전략: D (Taffy + Dropflow Fork)

| 판단 기준 | Taffy (Rust WASM) | Dropflow Fork (TS) | @pixi/ui 추출 |
|----------|-------------------|-------------------|---------------|
| 기술 타당성 | **가능** (기존 WASM 인프라) | **가능** (순수 TS, CanvasKit 어댑터) | **가능** (순수 함수) |
| 핵심 가치 | Flex + Grid + calc() | **Block + Inline + Float + 텍스트 줄바꿈** | 의존성 제거 |
| 리스크 | 중 (바인딩 작성) | 중 (CanvasKit 어댑터 PoC 필요) | 하 |
| 우선순위 | **1순위** | **1순위** (병행) | **즉시** |
| 예상 기간 | Phase 4-6: 4-7주 | Phase 1-3: 5주 | Phase 0: 2주 |

### 전체 기간: 12-15주

```
전략 D 최종 아키텍처:

  ┌──────────────────────────────┐
  │         엔진 디스패처          │
  │  selectEngine(display)       │
  └────────┬──────────┬──────────┘
           │          │
  ┌────────▼──────┐ ┌─▼──────────────┐
  │ Taffy WASM    │ │ Dropflow Fork  │
  │               │ │ (TypeScript)   │
  │ - Flexbox     │ │ - Block FC     │
  │ - CSS Grid    │ │ - Inline FC    │
  │ - calc()      │ │ - Float/Clear  │
  │ - abs/fixed   │ │ - Margin Coll. │
  │               │ │ - Line Box     │
  │               │ │ - vert-align   │
  └───────────────┘ └────────┬───────┘
                             │
                    ┌────────▼────────┐
                    │ CanvasKit/Skia  │
                    │ - Paragraph API │
                    │ - SkFontMgr     │
                    │ - nodeRenderers │
                    └─────────────────┘
```

### Gate 조건

- **Phase 2 완료 시점**에서 CanvasKit Shaper PoC 결과를 평가:
  - **성공**: 전략 D 계속 진행
  - **실패**: 전략 C로 롤백 (Taffy + 커스텀 Block 유지, Inline은 향후 재검토)

---

## 부록 A: 참고 저장소

| 저장소 | 용도 | 링크 |
|--------|------|------|
| DioxusLabs/taffy | Flex + Grid + Block WASM 엔진 | https://github.com/DioxusLabs/taffy |
| chearon/dropflow | CSS2 Block/Inline 엔진 | https://github.com/chearon/dropflow |
| tchayen/red-otter | WebGL Flexbox 참고 | https://github.com/tchayen/red-otter |
| alibaba/canvas-ui | CSS-like 스타일 시스템 참고 | https://github.com/alibaba/canvas-ui |
| kane50613/takumi | Taffy WASM 통합 사례 | https://github.com/kane50613/takumi |
| Taffy PR #394 | 공식 WASM 바인딩 (Draft) | https://github.com/DioxusLabs/taffy/pull/394 |
| Taffy Issue #627 | Inline/Flow layout 지원 논의 | https://github.com/DioxusLabs/taffy/issues/627 |
| DioxusLabs/blitz | Taffy + Parley 통합 사례 | https://github.com/DioxusLabs/blitz |

## 부록 B: 관련 XStudio 문서

- [CSS 엔진 업그레이드 계획](./CSS_ENGINE_UPGRADE_PLAN.md)
- [WASM 아키텍처](./WASM.md)
- [Canvas 렌더링 ADR](./adr/003-canvas-rendering.md)
- [레이아웃 요구사항](./LAYOUT_REQUIREMENTS.md)
