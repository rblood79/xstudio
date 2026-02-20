# XStudio 통합 실행 가이드

> **작성일**: 2026-02-19 | **수정일**: 2026-02-20
> **목적**: 4개 핵심 문서의 미완료 항목을 단일 실행 로드맵으로 통합
> **소스**: `ENGINE_CHECKLIST.md`, `COMPONENT_SPEC_ARCHITECTURE.md`, `WASM.md`, `AI.md`
> **수정 이력**: 1차 리뷰 (C4/H12/M10/L5건) + 2차 리뷰 (C1/H1/M5/W6건) 반영

---

## 목차

1. [현재 상태 요약](#1-현재-상태-요약)
2. [워크스트림 정의](#2-워크스트림-정의)
3. [의존성 그래프](#3-의존성-그래프)
4. [통합 실행 순서](#4-통합-실행-순서)
5. [Stage 상세](#5-stage-상세)
6. [누적 진행률 예측](#6-누적-진행률-예측)
7. [리스크 및 완화 전략](#7-리스크-및-완화-전략)
8. [문서 참조 매트릭스](#8-문서-참조-매트릭스)

---

## 1. 현재 상태 요약

### 1.1 완료된 인프라

| 영역 | 완료 항목 | 소스 문서 |
|------|----------|----------|
| **Spec 시스템** | Phase 0 인프라 + Phase 6 Skia 파이프라인 완료 (62개 대상 컴포넌트, specShapeConverter, nodeRenderers). ※ Phase 2~4 개별 spec 파일 대부분 미작성 — COMPONENT_SPEC §5.3/§6.3/§7.3 참조 | COMPONENT_SPEC |
| **렌더링 엔진** | CanvasKit/Skia 메인 렌더러, 이중 Surface 캐싱, PixiJS 이벤트 전용. ※ Phase 6 잔여 항목(샘플링 정책, 색공간 고정, 오버레이 텍스트 Paragraph 통일 등) 미완 — WASM.md §6.8 참조 | WASM Phase 5-6 |
| **레이아웃 엔진** | Taffy WASM (Flex/Grid) + Dropflow Fork (Block), Yoga/@pixi/layout 제거 | WASM Phase 11 |
| **AI Agent** | Phase A1~A4 완료 (Tool Calling, Agent Loop, 7개 도구) + G.3 시각 피드백 (Phase A5 선행 완료) | AI |

### 1.2 소스 문서 내부 불일치 (주의)

> 아래 항목은 소스 문서 자체의 내부 불일치로, 본 문서의 수치 추적 시 주의가 필요하다.

| 소스 문서 | 불일치 항목 | 상세 |
|-----------|-----------|------|
| `COMPONENT_SPEC` | 컴포넌트 수 | §1.3(62개 합산) vs §1.2(72개 목표) vs 부록 A(73개). 본 문서는 §9 Skia 전환 기준 **62개**를 사용 |
| `COMPONENT_SPEC` | A등급 수량 | §9.8.6 본문 "12개"로 수정 완료. 요약 테이블도 14→12 수정 (2차 리뷰). v3.5 이력 B등급 49→47 수정 |
| `ENGINE_CHECKLIST` | Phase A 영향도 | 로드맵 테이블(+5~6%) vs 예측 표(+4%). 본 문서는 로드맵 테이블 기준 **+5~6%** 사용 |

### 1.3 현재 수치

> ※ "컴포넌트 정합성 62%"의 산출 근거는 `ENGINE_CHECKLIST.md`의 5개 차원별 가중 평균이다.
> COMPONENT_SPEC의 "62개 컴포넌트"와는 무관한 수치이다.

| 지표 | 현재 | 목표 | 갭 |
|------|------|------|-----|
| CSS 속성 지원율 | **88%** | 92~95% | +4~7% |
| 컴포넌트 정합성 (전체) | **62%** | **93%** | **+31%** |
| 구조/레이아웃 차원 | 85% | 93~97% | +8~12% |
| 렌더링 정밀도 | 65% | 75~80% | +10~15% |
| 시각 장식 (아이콘/pseudo) | 50% | 80% | +30% |
| 상태 표현 | 33% | 70% | +37% |

---

## 2. 워크스트림 정의

4개 문서에서 추출한 미완료 항목을 **4개 워크스트림**으로 분류한다.

### WS-1: 렌더링 정합성 (ENGINE_CHECKLIST)

> 컴포넌트 정합성 62% → 93% 달성

| ID | 설명 | 영향 | 우선순위 | 의존성 |
|----|------|------|---------|--------|
| QW-1 | border style 전달 (1줄 수정) | +1.5% | P1 | 없음 |
| QW-2 | disabled opacity 일괄 적용 | +2.5% | P1 | Phase A |
| QW-3 | focus ring 렌더링 | +3.5% | P1 | Phase A |
| Phase A | 상태 표현 연결 (ElementSprite→ComponentState) | +5~6% | P1 | 없음 |
| Phase B | 아이콘 폰트 도입 (Pencil 방식) | +5~6% | P1 | 없음 |
| Phase C | 컬렉션 아이템 Shape 생성: Table/Tree/Menu(Phase 3) + ListBox(Phase 2) + Calendar(Phase 4) + Phase 3 미완료 spec (Tabs, Breadcrumbs, Pagination 등) | +6~8% | P2 | 없음 |
| Phase D | FancyButton 제거 (코드 정리) | — | P2 | 없음 |
| Phase E | overflow scroll/auto 완성 | +1~2% | P2 | 없음 |
| Phase F | Overlay 개선 (arrow, backdrop) | +2~3% | P3 | 없음 |
| Phase G | Color 그라디언트 렌더링 | +3~4% | P3 | Phase F |
| Phase Z | 애니메이션 인프라 (장기) | +5~10% | P4 | Stage 5 완료 + 신규 인프라 ※ |
| M-2 | shadow spread radius | +2~3% | P2 | 없음 |
| M-3 | image shape 렌더링 | +3~5% | P2 | 없음 |
| M-4 | CSS variable 실시간 캐시 | +2~3% | P3 | 없음 |
| M-5 | state 파라미터 일관성 (42개 spec) | +2% | P3 | Phase A 선행 필수 |
| M-6 | partial border 지원 | +1% | P3 | 없음 |

> ※ Phase Z 의존성 "Stage 5 완료 + 신규 인프라"는 ENGINE_CHECKLIST에 명시되지 않은 EXECUTION_GUIDE 도출 조건이다. ENGINE_CHECKLIST 원본에서 Phase Z는 P4(최후) 우선순위만 기재.

### WS-2: 레이아웃 근본 원인 (ENGINE_CHECKLIST — RC)

> 구조/레이아웃 85% → 93~97%

| ID | 설명 | 영향 | 우선순위 | 의존성 |
|----|------|------|---------|--------|
| RC-3 | CSS 단위 정규화 (rem/em/vh/vw/calc) | +2~3% | **P0** | 없음 (최우선) |
| RC-1 | AvailableSpace 항상 Definite 고정 수정 | +3~5% | P0 | RC-3 |
| RC-2 | 부모 height 무조건 강제 주입 수정 | (RC-1 포함) | P0 | RC-1 통합 |
| RC-6 | auto/fit-content 엔진별 분기 처리 | +1~2% | P0 | RC-3 |
| RC-4 | 2-pass 트리거 비교 기준 부정확 | +1~2% | P0 | RC-1, RC-6 |
| RC-7 | blockification 경계 처리 불완전 | +1% | P1 | RC-1, RC-2 |
| RC-5 | inline-run baseline 단순화 | +1% | P1 | RC-7 |

> ※ RC 항목의 P0 배정은 ENGINE_CHECKLIST의 심각도 HIGH 분류와 레이아웃 근본 원인(Root Cause) 성격을 반영한 우선순위 승격이다. P0 항목이 Stage 1이 아닌 Stage 2부터 착수되는 이유는, WS-1 Quick Win 항목들의 비용 대비 효과가 높아 먼저 처리하는 전략적 선택에 의한 것이다.

### WS-3: WASM 성능 최적화 (WASM.md)

> Phase 0-4 성능 경로 + Phase 6 이후 장기 최적화

| ID | 설명 | 상태 | 우선순위 |
|----|------|------|---------|
| W-0a | 벤치마크 유틸리티 작성 | 보류 (CanvasKit 전환으로 재설계 필요) | P3 |
| W-0b | 기준선 데이터 수집 (4개 시나리오) | 보류 | P3 |
| W-0c | CI/CD에 `wasm:build` 스텝 추가 | 미완료 | P2 |
| W-1 | SpatialIndex 재연동 (라쏘 `query_rect`) | 미완료 (뷰포트 컬링은 CanvasKit 대체) | P2 |
| W-4 | Web Worker 통합 (레이아웃 오프로드) | 구현 완료 (layoutWorker, bridge.ts), 현 레이아웃 경로(TaffyFlex/Dropflow)와 미연결 — 재연동 필요 | P3 |
| W-LT1 | Skia 포크 + 커스텀 빌드 (§7.1) | 장기 | P4 |
| W-LT2 | 고급 멀티스레딩: SharedArrayBuffer/WASM Pthreads (§7.2) | 장기 | P4 |
| W-LT3 | Rust 메모리 최적화 + WASM SIMD + 커스텀 할당기 (§7.3) | 장기 | P4 |
| W-LT4 | 브라우저 컴포지터 통합 + Display P3 색상 정밀도 (§7.4) | 장기 | P4 |
| W-LT5 | WebGPU 전환 (§7.5) | 장기 | P4 |
| W-LT6 | 대규모 파일 지원: Incremental Loading, OPFS, Tiling (§7.6) | 장기 | P4 |

### WS-4: AI 확장 (AI.md)

> Phase A5 (캔버스 통합) + 미래 도구

| ID | 설명 | 상태 | 의존성 |
|----|------|------|--------|
| AI-A5a | styleAdapter → CanvasKit 스키마 변환 | 차단됨 | RC-3 (단위 정규화) + CanvasKit 스키마 전환 완료 ※ |
| AI-A5b | 스크린샷 기반 컨텍스트 (멀티모달) | 차단됨 | Groq Vision API 미지원 |
| AI-A5c | get_style_guide, get/set_variables 도구 | 보류 | 컴포넌트 인스턴스 시스템 선행 |
| AI-A5d | create_component, create_instance, override_instance 도구 (G.1) | 보류 | 컴포넌트 인스턴스 시스템 선행 |

> ※ AI-A5a의 "CanvasKit 스키마 전환 완료" 조건은 AI.md §6.6 컨텍스트에서 도출한 EXECUTION_GUIDE 추가 조건이다. AI.md §8에는 RC-3만 차단 조건으로 명시되어 있다.

---

## 3. 의존성 그래프

```
┌─────────────────────────────────────────────────────────────────┐
│                    CROSS-WORKSTREAM DEPENDENCIES                │
└─────────────────────────────────────────────────────────────────┘

  [WS-2] RC-3 (단위 정규화) ─── 최우선 ★
    │
    ├──→ [WS-2] RC-1 + RC-2 (available space)
    │       │
    │       ├──→ [WS-2] RC-4 (2-pass)
    │       └──→ [WS-2] RC-7 → RC-5 (blockification)
    │
    ├──→ [WS-2] RC-6 (intrinsic)
    │       └──→ [WS-2] RC-4 (2-pass)
    │
    └──→ [WS-4] AI-A5a (styleAdapter 변환) ← 크로스 워크스트림
              ※ RC-3 + CanvasKit 스키마 전환 완료 필요

  [WS-1] Phase A (상태 표현 연결) ─── 독립 ★
    │
    ├──→ [WS-1] QW-2 (disabled opacity)
    ├──→ [WS-1] QW-3 (focus ring)
    └──→ [WS-1] M-5 (state 일관성) ← 선행 필수

  [WS-1] QW-1, Phase B~F, M-2~4, M-6 ─── 독립
  [WS-1] Phase G ──→ Phase F (직렬, Phase F 선행 필수)

  [WS-1] Phase Z ──→ Stage 5 전체 완료 + 신규 인프라 설계 (P4)

  [WS-3] W-0a ──→ W-0b ──→ W-1, W-4
  [WS-3] W-0c ─── 독립 (CI/CD 인프라)

  [WS-4] AI-A5c, AI-A5d ──→ 컴포넌트 인스턴스 시스템 (외부 의존)
```

---

## 4. 통합 실행 순서

> 4개 워크스트림의 의존성을 반영한 6-Stage 실행 계획

```
──────────────────────────────────────────────────────────
  Stage 1: 기초 + Quick Win                    ~ 1주
──────────────────────────────────────────────────────────
  [WS-1] QW-1 (border style, P1)      병렬 ─┐
  [WS-1] Phase A (상태 표현 연결, P1)  병렬 ─┤
  [WS-1] M-3 (image shape, P2)        병렬 ─┤ ※ 독립+고효과로 앞당김
  [WS-1] Phase D (FancyButton 제거)   병렬 ─┘

──────────────────────────────────────────────────────────
  Stage 2: Phase A 후속 + RC 기초             ~ 2주
──────────────────────────────────────────────────────────
  ┌ 2a (1주차) ─────────────────────────────────────
  │ [WS-1] QW-2 (disabled opacity)    ← Phase A 의존
  │ [WS-1] QW-3 (focus ring)          ← Phase A 의존
  │ [WS-2] RC-3 (단위 정규화)          병렬 (최우선)
  └ 2b (2주차) ─────────────────────────────────────
    [WS-2] RC-1 + RC-2 (available space) ← RC-3 이후

──────────────────────────────────────────────────────────
  Stage 3: RC 후속 + 기능 로드맵 시작         ~ 2주
──────────────────────────────────────────────────────────
  [WS-2] RC-6 (intrinsic 통합)        ← RC-3
  [WS-2] RC-4 (2-pass 기준)           ← RC-1(S2 완료), RC-6(S3 선행)
  [WS-1] Phase B (아이콘 폰트)         병렬
  [WS-4] AI-A5a (styleAdapter 변환)   ← RC-3 + CanvasKit 스키마 전환

──────────────────────────────────────────────────────────
  Stage 4: 주요 기능 확장                     ~ 2주
──────────────────────────────────────────────────────────
  [WS-1] Phase C (컬렉션+미완료 spec)  병렬 ─┐
  [WS-1] Phase E (overflow scroll)    병렬 ─┤
  [WS-2] RC-7 (blockification)        ← RC-1,2
  [WS-2] RC-5 (inline baseline)       ← RC-7
  [WS-3] W-0c (CI/CD wasm:build)     병렬 ─┘

──────────────────────────────────────────────────────────
  Stage 5: 정밀도 + 마무리                    ~ 2주
──────────────────────────────────────────────────────────
  [WS-1] M-2 (shadow spread)          병렬 ─┐
  [WS-1] M-4 (CSS var 캐시)           병렬 ─┤
  [WS-1] M-5 (state 일관성)           ← Phase A (선행 필수)
  [WS-1] M-6 (partial border)         병렬 ─┤
  [WS-1] Phase F (Overlay 개선)       병렬 ─┘
  [WS-1] Phase G (Color 그라디언트)   ← Phase F (직렬)

──────────────────────────────────────────────────────────
  Stage 6: 장기 과제 (최후순위)               별도 일정
──────────────────────────────────────────────────────────
  [WS-1] Phase Z (애니메이션 인프라)   새 인프라 필요
  [WS-3] W-1 (SpatialIndex query_rect) 실측 병목 확인 후
  [WS-3] W-4 (Web Worker 재연동)      현 경로와 연결 필요
  [WS-3] W-LT1~6 (장기 최적화)        실측 데이터 기반
  [WS-4] AI-A5b~d (멀티모달/인스턴스)  외부 의존 해소 후
```

---

## 5. Stage 상세

### Stage 1: 기초 + Quick Win (~1주)

**목표**: 독립 항목 병렬 실행으로 빠른 정합성 확보

> ※ M-3(P2)는 의존성이 없고 비용 대비 효과가 높아 Stage 1에 배치. Phase D(P2)는 영향도 없으나 비용이 극히 낮아(0.5일) 병렬 배치에 적합

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **QW-1** | `specShapeConverter.ts` (~265줄) | BorderShape.style → SkiaNodeData.box.strokeStyle 전달 (1줄) | 0.5일 |
| **Phase A** | `ElementSprite.tsx`, Zustand store, `StylesPanel.tsx` | `'default'` 하드코딩 → ComponentState 전달, state selector UI | 2~3일 |
| **M-3** | `specShapeConverter.ts` (462-464) | case 'image' skip 제거 → getSkImage() + drawImageRect() | 1~2일 |
| **Phase D** | `FancyButton.spec.ts`, `PixiFancyButton.tsx` | FancyButton 제거, Button gradient variant로 대체 | 0.5일 |

**완료 기준**: QW-1 +1.5%, Phase A +5.0%, M-3 +4.0% = 원시 누적 **~72.5%** / 보정 예상 **~71%**

---

### Stage 2: Phase A 후속 + RC 기초 (~2주)

**목표**: Phase A 의존 항목 해제 + 레이아웃 근본 원인 착수

> ※ Stage 2는 내부적으로 2a(1주차)와 2b(2주차)로 분리된다.
> - **2a**: QW-2/3 + RC-3 병렬 실행
> - **2b**: RC-1/2 (RC-3 완료 이후 착수)

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **QW-2** | `specShapeConverter.ts`, `ElementSprite.tsx` | state=disabled 시 saveLayer(opacity:0.38) | 1일 |
| **QW-3** | `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`, `specShapeConverter.ts` | outline 필드 추가(SkiaNodeData.box 확장), 외곽 stroke 렌더링 | 1~2일 |
| **RC-3** | `TaffyFlexEngine.ts` (205-216) | cssValueParser.resolveCSSSizeValue() 연결 | 1~2일 |
| **RC-1+2** | `TaffyFlexEngine.ts` (434-439), `TaffyGridEngine.ts` (626-631), `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` (720-725) | Definite→Indefinite 계약 수정. ※ Taffy WASM 바이너리의 Definite space 전제와 충돌 시 Rust 측 수정 필요 가능 | 2~3일 |

**완료 기준**: QW-2/3 +6%, RC-3 +2.5%, RC-1/2 +4% = 원시 누적 **~85.0%** / 보정 예상 **~82%**

---

### Stage 3: RC 후속 + 기능 로드맵 시작 (~2주)

**목표**: 레이아웃 정밀도 마무리 + 아이콘/AI 차단 해제

> ※ Phase B (Icon Font + CanvasKit Paragraph)에서 새 Skia 리소스 생성이 증가하므로, Disposable 패턴 래퍼 적용을 병행해야 한다 (§7 CanvasKit 메모리 누수 리스크 참조).

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **RC-6** | `DropflowBlockEngine.ts` (262-268) | auto/fit-content enrichment 실패 시 fallback | 1~2일 |
| **RC-4** | `TaffyFlexEngine.ts` (352) | 2-pass 트리거 비교 기준 정확화. ※ **RC-6 완료 후 착수** (RC-1은 Stage 2 완료, RC-6은 Stage 3 선행) | 2~3일 |
| **Phase B** | Icon Font 번들, `specShapeConverter.ts` | Icon Font Node + CanvasKit Paragraph | 3~4일 |
| **AI-A5a** | `styleAdapter.ts` | CSS 단위 → CanvasKit 스키마 변환 업데이트 (RC-3 해제 + fills/effects/stroke 구조화) | 1~2일 |

**완료 기준**: RC +3.0%, Phase B +5.0%, AI-A5a 해제 = 원시 누적 **~93.0%** / 보정 예상 **~89%**

---

### Stage 4: 주요 기능 확장 (~2주)

**목표**: 컬렉션/스크롤 기능 + 나머지 RC 완료

> ※ Phase C는 점진적 출시 권장: Table → ListBox → Menu → Tabs/Breadcrumbs/Pagination 순서

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **Phase C** | `specShapeConverter.ts`, layout engines | Table/Tree/Menu(Phase 3) + ListBox(Phase 2) + Calendar(Phase 4) 자식 렌더링 + Phase 3 미완료 spec (Tabs, Breadcrumbs, Pagination 등) | 4~5일 |
| **Phase E** | `BoxSprite.tsx`, `scrollState.ts` | 스크롤바 UI + wheel/touch 이벤트 | 3~4일 |
| **RC-7** | `apps/builder/src/builder/workspace/canvas/layout/engines/index.ts` (131-144, 193-221) | blockification 경계 display 전환 처리 | 1~2일 |
| **RC-5** | `DropflowBlockEngine.ts` (226-231) | inline-run baseline y-offset 정밀화 (**RC-7 완료 후 착수**) | 1일 |
| **W-0c** | CI/CD 설정 | `wasm:build` 빌드 스텝 추가 | 0.5일 |

**완료 기준 (원시 합산)**: Phase C +7%, Phase E +1.5%, RC +2% = 원시 누적 ~103.5% → **보정 예상 ~93%**

---

### Stage 5: 정밀도 + 마무리 (~2주)

**목표**: 정밀도 개선 + Overlay/Color 완성

> ※ M-4(CSS var 캐시)는 Builder 메인 프레임의 `:root`를 읽으므로, Preview iframe 내 CSS 변수와의 경계 처리를 고려해야 한다.

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **M-2** | `specShapeConverter.ts` (382-383) | shadow spread → sigma 확장 워크어라운드 | 1~2일 |
| **M-4** | `cssVariableReader.ts` (90-109) | getCSSVariable()/resolveVariableFromDOM()에 :root CSS var 메모리 캐시 + 테마 무효화 추가. ※ Builder↔Preview iframe 경계 고려 | 1~2일 |
| **M-5** | `stateEffect.ts` (신규) | 62개 spec 중 42개 _state 미사용 → applyStateEffect() | 2~3일 |
| **M-6** | `specShapeConverter.ts` (251-292), `nodeRenderers.ts` (748-763) | BorderShape.sides 개별 Line 렌더링 | 1일 |
| **Phase F** | Overlay specs | arrow/backdrop 렌더링 | 2일 |
| **Phase G** | Color component specs | 2D/원형 그라디언트 렌더링 (**Phase F 완료 후 직렬 착수**) | 2일 |

**완료 기준 (원시 합산)**: M +8%, Phase F +2.5%, Phase G +3.5% = 원시 누적 ~117.5% → **보정 예상 ~96%** (목표 93% 초과 달성)

---

### Stage 6: 장기 과제 (별도 일정)

| 항목 | 진입 기준 | 예상 |
|------|----------|------|
| **Phase Z** (애니메이션) | Stage 5 완료 + 새 인프라 설계 | 2주+ |
| **W-0a/b** (벤치마크) | CanvasKit 안정화 후 시나리오 재설계. ※ Phase 5-6이 사전 기준선 없이 진행되었으므로 사후 검증 목적으로 절대 수치 측정 | 1주 |
| **W-1** (SpatialIndex query_rect) | SelectionLayer.utils.ts O(n) 필터가 실측 병목으로 확인 시. ※ 뷰포트 컬링은 CanvasKit AABB로 대체 완료 — 라쏘 선택만 잔존 | 1~2주 |
| **W-4** (Web Worker 재연동) | Phase 4 구현 완료(layoutWorker, bridge.ts) 상태. 현 레이아웃 경로(TaffyFlex/Dropflow)와 재연결 필요 | 2~3주 |
| **W-LT1~6** (장기 최적화) | §7.1 Skia 포크, §7.2 멀티스레딩, §7.3 WASM SIMD, §7.4 Display P3, §7.5 WebGPU, §7.6 대규모 파일 지원 | 분기 단위 |
| **AI-A5b** (멀티모달 컨텍스트) | Groq Vision API 또는 LLM 전환. 참조: AI.md §3.2, §7.5 | 외부 의존 |
| **AI-A5c/d** (인스턴스 도구) | 컴포넌트 인스턴스 시스템 구축 후. AI-A5d는 create_component 포함 — AI.md §4.3 참조 | 시스템 의존 |

---

## 6. 누적 진행률 예측

> **영향도 환산 규칙**: 범위값(예: +5~6%)은 중간값을 사용한다. 단, 감쇄 중복이 예상되는 고영향 항목(Phase A +5~6%→5.0%, Phase B +5~6%→5.0%)은 원시값에 보수적으로 하한값을 적용한다. Phase C(+6~8%)도 고영향이나, RC-1/2와의 감쇄가 보정 예상 단계에서 별도 반영되므로 원시값은 중간값(7.0%)을 사용한다.
>
> **감쇄 계수 적용**: 개별 항목의 영향도는 **독립 실행 시 추정치**이며, 선행 항목 완료 후에는
> 중복 효과로 실제 개선폭이 축소된다. 특히 RC-1/2(+4%) ↔ Phase C(+7%),
> Phase A(+5%) ↔ M-5(+2%)는 측정 차원이 겹치므로 ~15~25% 감쇄를 적용한다.

```
현재 기준                                    62%
│                                  원시 누적   보정 예상
├─ Stage 1 (Quick Win + Phase A)
│  ├─ QW-1  border style              +1.5%
│  ├─ Phase A  상태 표현 연결          +5.0%  (ENGINE_CHECKLIST +5~6% 하한값, 고영향 감쇄)
│  └─ M-3  image shape                +4.0%  (ENGINE_CHECKLIST +3~5% 중간값)
│                                    = 72.5%    ~71%
│
├─ Stage 2 (Phase A 후속 + RC 기초)
│  ├─ QW-2  disabled opacity          +2.5%
│  ├─ QW-3  focus ring                +3.5%
│  ├─ RC-3  단위 정규화               +2.5%
│  └─ RC-1/2  available space/height  +4.0%
│                                    = 85.0%    ~82%
│
├─ Stage 3 (RC 후속 + 기능 시작)
│  ├─ RC-6  intrinsic 통합            +1.5%
│  ├─ RC-4  2-pass 기준               +1.5%  (중간값)
│  └─ Phase B  아이콘 폰트            +5.0%  (하한값, 고영향 감쇄)
│                                    = 93.0%    ~89%
│
├─ Stage 4 (주요 기능 확장)
│  ├─ Phase C  컬렉션+미완료 spec     +7.0%
│  ├─ Phase E  overflow scroll        +1.5%
│  └─ RC-7/5  blockification/baseline +2.0%
│                                   = 103.5%    ~93%  ← 목표 93% 달성 시점
│
├─ Stage 5 (정밀도 마무리)
│  ├─ M-2/4/5/6  정밀도 개선          +8.0%  (2.5+2.5+2.0+1.0)
│  ├─ Phase F  Overlay 개선           +2.5%
│  └─ Phase G  Color 그라디언트       +3.5%  (← Phase F 직렬)
│                                   = 117.5%    ~96%
│
└─ Stage 6 (장기)
   └─ Phase Z  애니메이션             +5~10%  (별도 측정)

═══════════════════════════════════════════════════════
최종 보정 예상: ~93% (Stage 4 완료) → ~96% (Stage 5 완료)
※ 원시 합산이 100%를 초과하는 것은 영향도 중복에 의한 것이며,
   보정 예상이 실제 달성치에 가까울 것으로 판단한다.
※ 고영향 항목(Phase A, Phase B)만 하한값 적용, 나머지는 중간값 사용.
```

### 차원별 목표 달성 시점

> ※ 아래 수치는 보정 예상 기준이다.

| 차원 | 현재 | Stage 2 | Stage 3 | Stage 4 | Stage 5 |
|------|------|---------|---------|---------|---------|
| 구조/레이아웃 | 85% | 93% | 96% | 97% | 97% |
| 렌더링 정밀도 | 65% | 73% | 73% | 78% | 80% |
| 시각 장식 | 50% | 50% | 80% | 80% | 80% |
| 상태 표현 | 33% | 70% | 70% | 70% | 72% |
| 색상/Variant | 80% | 80% | 80% | 80% | 85% |

---

## 7. 리스크 및 완화 전략

### 높은 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| RC-1/2 (AvailableSpace 수정)가 기존 레이아웃을 regression | 다수 컴포넌트 영향 | Stage 2에서 집중 회귀 테스트. 스냅샷 비교 도입 |
| RC-1/2의 Taffy WASM 바이너리 계약 변경 | Definite space 전제와 충돌 시 Rust 측 수정 필요 → 일정 지연 | Taffy 소스 분석 선행. Rust 수정 필요 시 일정 버퍼 1주 추가 |
| Phase C (컬렉션 아이템)의 범위가 예상보다 넓음 | 일정 지연 | Table→ListBox→Menu→Tabs/Breadcrumbs 순서로 점진적 출시 |
| CanvasKit 메모리 누수 (`.delete()` 누락) | 장시간 사용 시 OOM | Disposable 패턴 래퍼 + Chrome DevTools 모니터링 |
| Phase 0 벤치마크 미완료 상태에서 Phase 5-6 진행됨 | 성능 기준선 없이 비교 불가 | W-0a/b를 사후 검증 용도로 재설계. 이전/이후 비교 대신 절대 수치 측정 |

### 중간 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Groq 무료 tier 30 req/min + 30K tokens/min 이중 제한 | AI 응답 지연. batch_design 대용량 작업 시 token/min 선 도달 가능 | 429 지수 백오프 구현 완료 (3회 재시도). 배치 도구로 호출 수 최소화 |
| Icon Font 번들 크기 (+200KB~) + CanvasKit WASM 복합 영향 | 초기 로드 500KB 목표 위협 | 서브셋 추출 + lazy loading. 두 리소스의 통합 로딩 전략(Critical Path 우선순위) 수립 필요 |
| RC-3 (단위 정규화) 범위 확대 | 파급 효과 | cssValueParser에 국한. 기존 parseFloat 경로를 fallback 유지 |
| `specShapeConverter.ts` 핫스팟 | Stage 1~5 전 Stage에서 수정 → merge conflict 누적 | 기능별 모듈 분리 검토 (borderConverter, shadowConverter, stateEffectConverter) |
| Builder↔Preview iframe 동기화 부정합 | RC-3 등 Builder 측 계산 변경 시 Preview CSS 엔진과 일시적 불일치 | Delta 동기화 로직에 단위 변환 결과 반영. 스냅샷 비교에 Preview 포함 |

### 주요 차단 관계 (크로스 워크스트림 + 워크스트림 내부)

| 차단 항목 | 차단 받는 항목 | 해소 시점 |
|-----------|--------------|----------|
| RC-3 (WS-2) | AI-A5a (WS-4) | Stage 2 |
| Phase A (WS-1) | QW-2, QW-3 (WS-1) | Stage 1 |
| Phase A (WS-1) | M-5 (WS-1) — **선행 필수** | Stage 1 |
| Phase F (WS-1) | Phase G (WS-1) — **직렬** | Stage 5 내부 |
| 컴포넌트 인스턴스 시스템 (외부) | AI-A5c/d (WS-4) | Stage 6 |
| Groq Vision API (외부) | AI-A5b (WS-4) | 미정 |

---

## 8. 문서 참조 매트릭스

각 실행 항목의 상세 설계는 원본 문서를 참조한다.

| Stage | 항목 | 상세 문서 | 섹션 |
|-------|------|----------|------|
| 1 | QW-1, Phase A, M-3 | `ENGINE_CHECKLIST.md` | `### Quick Win 상세: 렌더링 정밀도 개선`, `### Phase A 상세: 상태 표현 연결`, `### Medium 상세: 렌더링 인프라 확장` |
| 1 | Phase D | `ENGINE_CHECKLIST.md`, `COMPONENT_SPEC_ARCHITECTURE.md` | `### Phase D 상세: FancyButton 제거`, `### 7.1 대상 컴포넌트 (16개)`의 #15 FancyButton |
| 2 | QW-2/3 | `ENGINE_CHECKLIST.md` | `### Quick Win 상세: 렌더링 정밀도 개선` |
| 2 | RC-3, RC-1/2 | `ENGINE_CHECKLIST.md` | `## 레이아웃 엔진 구조적 근본 원인 (7건, 전수 코드 검증 완료)`, `### 7건 근본 원인 목록` |
| 3 | RC-6, RC-4 | `ENGINE_CHECKLIST.md` | `## 레이아웃 엔진 구조적 근본 원인 (7건, 전수 코드 검증 완료)`, `### 7건 근본 원인 목록` |
| 3 | Phase B | `ENGINE_CHECKLIST.md` | `### Phase B 상세: 아이콘 폰트 도입 (Pencil 방식 참조)` |
| 3 | AI-A5a | `AI.md` | `### 6.6 스타일 변환 레이어`, `## 8. 실행 로드맵`의 `Phase A5: 캔버스 통합` |
| 4 | Phase C, E | `ENGINE_CHECKLIST.md` | `## 컴포넌트 수준 정합성 로드맵 (CSS 웹 ↔ 캔버스)`, `### 개선 로드맵` 표의 Phase C/E 행, `### Phase E 상세: overflow: scroll/auto 완성` |
| 4 | RC-7, RC-5 | `ENGINE_CHECKLIST.md` | `## 레이아웃 엔진 구조적 근본 원인 (7건, 전수 코드 검증 완료)`, `### 7건 근본 원인 목록` |
| 4 | W-0c | `WASM.md` | `### 0.4 Phase 0 산출물` |
| 5 | M-2~6, Phase F/G | `ENGINE_CHECKLIST.md` | `### Medium 상세: 렌더링 인프라 확장`, `### 개선 로드맵` 표의 Phase F+G 행 |
| 6 | Phase Z | `ENGINE_CHECKLIST.md` | `### 개선 로드맵` 표의 Phase Z 행, `### 권장 실행 순서 (v2 보정)` |
| 6 | W-0a/b | `WASM.md` | `## Phase 0: 환경 구축 및 벤치마크 기준선`, `### 0.2 벤치마크 기준선 수집`, `### 0.4 Phase 0 산출물` |
| 6 | W-1 | `WASM.md` | `## Phase 1: Spatial Index (뷰포트 컬링 + 히트 테스트 가속)`, `### 1.5 Phase 1 산출물` |
| 6 | W-4 | `WASM.md` | `## Phase 4: Web Worker 통합 및 최종 최적화`, `### 4.1 Worker 아키텍처`, `### 4.7 SpatialIndex 인스턴스 역할 분리` |
| 6 | W-LT1~6 | `WASM.md` | `## 장기 최적화 경로 (Phase 6 이후)`, `### 7.1`~`### 7.6` |
| 6 | AI-A5b | `AI.md` | `### 3.2 Pencil Claude Agent SDK 대체 가능성`, `### 7.5 낮은 영향 — AI 컨텍스트 (스크린샷)`, `## 8. 실행 로드맵`의 `Phase A5: 캔버스 통합` |
| 6 | AI-A5c | `AI.md` | `### 4.3 AI 도구 정의`, `## 8. 실행 로드맵`의 `Phase A5: 캔버스 통합` |
| 6 | AI-A5d | `AI.md` | `### 4.3 AI 도구 정의` (Phase 5+ G.1 `create_component`/`create_instance`/`override_instance`) |
| — | Spec Shape 타입/렌더러 | `COMPONENT_SPEC_ARCHITECTURE.md` | `## 9. Phase 6: Spec Shapes → Skia 렌더링 파이프라인`, `### 9.3 구현 내용` |
| — | CanvasKit 렌더 파이프라인 | `WASM.md` | `## Phase 5: CanvasKit/Skia WASM 메인 렌더러 도입`, `## Phase 6: 고급 렌더링 기능 (CanvasKit 활용)`, `### 6.8 Pencil 정합성 잔여 체크리스트 (추가로 맞춰야 할 부분)` |
| — | Phase 2~4 미작성 spec | `COMPONENT_SPEC_ARCHITECTURE.md` | `### 5.3 Phase 2 체크리스트`, `### 6.3 Phase 3 체크리스트`, `### 7.3 Phase 4 체크리스트` |
