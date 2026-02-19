# XStudio 통합 실행 가이드

> **작성일**: 2026-02-19
> **목적**: 4개 핵심 문서의 미완료 항목을 단일 실행 로드맵으로 통합
> **소스**: `ENGINE_CHECKLIST.md`, `COMPONENT_SPEC_ARCHITECTURE.md`, `WASM.md`, `AI.md`

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
| **Spec 시스템** | Phase 0~6 완료 (66개 컴포넌트 Spec, specShapeConverter, Skia 렌더링 파이프라인) | COMPONENT_SPEC |
| **렌더링 엔진** | CanvasKit/Skia 메인 렌더러, 이중 Surface 캐싱, PixiJS 이벤트 전용 | WASM Phase 5-6 |
| **레이아웃 엔진** | Taffy WASM (Flex/Grid) + Dropflow Fork (Block), Yoga/@pixi/layout 제거 | WASM Phase 11 |
| **AI Agent** | Phase A1~A4 완료 (Tool Calling, Agent Loop, 7개 도구, G.3 시각 피드백) | AI |

### 1.2 현재 수치

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
| Phase A | 상태 표현 연결 (ElementSprite→ComponentState) | +4~6% | P1 | 없음 |
| Phase B | 아이콘 폰트 도입 (Pencil 방식) | +5~6% | P1 | 없음 |
| Phase C | 컬렉션 아이템 Shape 생성 | +6~8% | P2 | 없음 |
| Phase D | FancyButton 제거 (코드 정리) | — | P2 | 없음 |
| Phase E | overflow scroll/auto 완성 | +1~2% | P2 | 없음 |
| Phase F | Overlay 개선 (arrow, backdrop) | +2~3% | P3 | 없음 |
| Phase G | Color 그라디언트 렌더링 | +3~4% | P3 | Phase F |
| M-2 | shadow spread radius | +2~3% | P2 | 없음 |
| M-3 | image shape 렌더링 | +3~5% | P2 | 없음 |
| M-4 | CSS variable 실시간 캐시 | +2~3% | P3 | 없음 |
| M-5 | state 파라미터 일관성 (42개 spec) | +2% | P3 | Phase A 권장 |
| M-6 | partial border 지원 | +1% | P3 | 없음 |

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

### WS-3: WASM 성능 최적화 (WASM.md)

> Phase 0-4 성능 경로 + Phase 6 이후 장기 최적화

| ID | 설명 | 상태 | 우선순위 |
|----|------|------|---------|
| W-0a | 벤치마크 유틸리티 작성 | 보류 (CanvasKit 전환으로 재설계 필요) | P3 |
| W-0b | 기준선 데이터 수집 (4개 시나리오) | 보류 | P3 |
| W-0c | CI/CD에 `wasm:build` 스텝 추가 | 미완료 | P2 |
| W-1 | SpatialIndex 재연동 (라쏘 `query_rect`) | 미완료 (뷰포트 컬링은 CanvasKit 대체) | P2 |
| W-4 | Web Worker 통합 (레이아웃 오프로드) | 미완료 | P3 |
| W-LT1 | Skia 포크 + Worker 고도화 | 장기 | P4 |
| W-LT2 | Rust 메모리 최적화 + WASM SIMD | 장기 | P4 |
| W-LT3 | WebGPU 전환 | 장기 | P4 |

### WS-4: AI 확장 (AI.md)

> Phase A5 (캔버스 통합) + 미래 도구

| ID | 설명 | 상태 | 의존성 |
|----|------|------|--------|
| AI-A5a | styleAdapter → CanvasKit 스키마 변환 | 차단됨 | RC-3 (단위 정규화) |
| AI-A5b | 스크린샷 기반 컨텍스트 (멀티모달) | 차단됨 | Groq Vision API 미지원 |
| AI-A5c | get_style_guide, get/set_variables 도구 | 보류 | 컴포넌트 인스턴스 시스템 선행 |
| AI-A5d | create/override_instance 도구 (G.1) | 보류 | 컴포넌트 인스턴스 시스템 선행 |

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

  [WS-1] Phase A (상태 표현 연결) ─── 독립 ★
    │
    ├──→ [WS-1] QW-2 (disabled opacity)
    ├──→ [WS-1] QW-3 (focus ring)
    └──→ [WS-1] M-5 (state 일관성)

  [WS-1] QW-1, Phase B~G, M-2~4, M-6 ─── 모두 독립

  [WS-3] W-0a ──→ W-0b ──→ W-1, W-4

  [WS-4] AI-A5c, AI-A5d ──→ 컴포넌트 인스턴스 시스템 (외부 의존)
```

---

## 4. 통합 실행 순서

> 4개 워크스트림의 의존성을 반영한 6-Stage 실행 계획

```
──────────────────────────────────────────────────────────
  Stage 1: 기초 + Quick Win                    ~ 1주
──────────────────────────────────────────────────────────
  [WS-1] QW-1 (border style)          병렬 ─┐
  [WS-1] Phase A (상태 표현 연결)      병렬 ─┤
  [WS-1] M-3 (image shape)            병렬 ─┤
  [WS-1] Phase D (FancyButton 제거)   병렬 ─┘

──────────────────────────────────────────────────────────
  Stage 2: Phase A 후속 + RC 기초             ~ 2주
──────────────────────────────────────────────────────────
  [WS-1] QW-2 (disabled opacity)      ← Phase A 의존
  [WS-1] QW-3 (focus ring)            ← Phase A 의존
  [WS-2] RC-3 (단위 정규화)            병렬 (최우선)
  [WS-2] RC-1 + RC-2 (available space) ← RC-3 이후

──────────────────────────────────────────────────────────
  Stage 3: RC 후속 + 기능 로드맵 시작         ~ 2주
──────────────────────────────────────────────────────────
  [WS-2] RC-6 (intrinsic 통합)        ← RC-3
  [WS-2] RC-4 (2-pass 기준)           ← RC-1, RC-6
  [WS-1] Phase B (아이콘 폰트)         병렬
  [WS-4] AI-A5a (styleAdapter 변환)   ← RC-3 해제

──────────────────────────────────────────────────────────
  Stage 4: 주요 기능 확장                     ~ 2주
──────────────────────────────────────────────────────────
  [WS-1] Phase C (컬렉션 아이템)       병렬 ─┐
  [WS-1] Phase E (overflow scroll)    병렬 ─┤
  [WS-2] RC-7 (blockification)        ← RC-1,2
  [WS-2] RC-5 (inline baseline)       ← RC-7
  [WS-3] W-0c (CI/CD wasm:build)     병렬 ─┘

──────────────────────────────────────────────────────────
  Stage 5: 정밀도 + 마무리                    ~ 2주
──────────────────────────────────────────────────────────
  [WS-1] M-2 (shadow spread)          병렬 ─┐
  [WS-1] M-4 (CSS var 캐시)           병렬 ─┤
  [WS-1] M-5 (state 일관성)           ← Phase A
  [WS-1] M-6 (partial border)         병렬 ─┤
  [WS-1] Phase F + G (Overlay/Color)  병렬 ─┘

──────────────────────────────────────────────────────────
  Stage 6: 장기 과제 (최후순위)               별도 일정
──────────────────────────────────────────────────────────
  [WS-1] Phase Z (애니메이션 인프라)   새 인프라 필요
  [WS-3] W-1 (SpatialIndex 재연동)    벤치마크 후
  [WS-3] W-4 (Web Worker 통합)        벤치마크 후
  [WS-3] W-LT1~3 (장기 최적화)        실측 데이터 기반
  [WS-4] AI-A5b~d (멀티모달/인스턴스)  외부 의존 해소 후
```

---

## 5. Stage 상세

### Stage 1: 기초 + Quick Win (~1주)

**목표**: 독립 항목 병렬 실행으로 빠른 정합성 확보

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **QW-1** | `specShapeConverter.ts` (~265줄) | BorderShape.style → SkiaNodeData.box.strokeStyle 전달 (1줄) | 0.5일 |
| **Phase A** | `ElementSprite.tsx`, Zustand store, `StylesPanel.tsx` | `'default'` 하드코딩 → ComponentState 전달, state selector UI | 2~3일 |
| **M-3** | `specShapeConverter.ts` (462-464) | case 'image' skip 제거 → getSkImage() + drawImageRect() | 1~2일 |
| **Phase D** | `FancyButton.spec.ts`, `PixiFancyButton.tsx` | FancyButton 제거, Button gradient variant로 대체 | 0.5일 |

**완료 기준**: QW-1 +1.5%, Phase A +4%, M-3 +3% = 누적 **~70.5%**

---

### Stage 2: Phase A 후속 + RC 기초 (~2주)

**목표**: Phase A 의존 항목 해제 + 레이아웃 근본 원인 착수

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **QW-2** | `specShapeConverter.ts`, `ElementSprite.tsx` | state=disabled 시 saveLayer(opacity:0.38) | 1일 |
| **QW-3** | `types.ts`, `specShapeConverter.ts`, `nodeRenderers.ts` | outline 필드 추가, 외곽 stroke 렌더링 | 1~2일 |
| **RC-3** | `TaffyFlexEngine.ts` (205-216) | cssValueParser.resolveCSSSizeValue() 연결 | 1~2일 |
| **RC-1+2** | `TaffyFlexEngine.ts` (434-439), `TaffyGridEngine.ts` (626-631), `BuilderCanvas.tsx` (720-725) | Definite→Indefinite 계약 수정 | 2~3일 |

**완료 기준**: QW-2/3 +6%, RC-3 +2.5%, RC-1/2 +4% = 누적 **~83%**

---

### Stage 3: RC 후속 + 기능 로드맵 시작 (~2주)

**목표**: 레이아웃 정밀도 마무리 + 아이콘/AI 차단 해제

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **RC-6** | `DropflowBlockEngine.ts` (262-268) | auto/fit-content enrichment 실패 시 fallback | 1~2일 |
| **RC-4** | `TaffyFlexEngine.ts` (352) | 2-pass 트리거 비교 기준 정확화 | 2~3일 |
| **Phase B** | Icon Font 번들, `specShapeConverter.ts` | Icon Font Node + CanvasKit Paragraph | 3~4일 |
| **AI-A5a** | `styleAdapter.ts` | CSS 단위 → CanvasKit 스키마 변환 업데이트 (RC-3 해제) | 1~2일 |

**완료 기준**: RC +2.5%, Phase B +5%, AI-A5a 해제 = 누적 **~90.5%**

---

### Stage 4: 주요 기능 확장 (~2주)

**목표**: 컬렉션/스크롤 기능 + 나머지 RC 완료

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **Phase C** | `specShapeConverter.ts`, layout engines | Table/ListBox/Menu/Tree/Calendar 자식 렌더링 | 4~5일 |
| **Phase E** | `BoxSprite.tsx`, `scrollState.ts` | 스크롤바 UI + wheel/touch 이벤트 | 3~4일 |
| **RC-7** | `index.ts` (131-144, 193-221) | blockification 경계 display 전환 처리 | 1~2일 |
| **RC-5** | `DropflowBlockEngine.ts` (226-231) | inline-run baseline y-offset 정밀화 | 1일 |
| **W-0c** | CI/CD 설정 | `wasm:build` 빌드 스텝 추가 | 0.5일 |

**완료 기준**: Phase C +7%, Phase E +1.5%, RC +2% = 누적 **~96%** (구조차원 97%)

---

### Stage 5: 정밀도 + 마무리 (~2주)

**목표**: 정밀도 개선 + Overlay/Color 완성

| 항목 | 대상 파일 | 작업 내용 | 예상 |
|------|----------|----------|------|
| **M-2** | `specShapeConverter.ts` (382-383) | shadow spread → sigma 확장 워크어라운드 | 1~2일 |
| **M-4** | `cssVariableReader.ts` (180-195, 216-220) | :root CSS var 메모리 캐시 + 테마 무효화 | 1~2일 |
| **M-5** | `stateEffect.ts` (신규) | 62개 spec 중 42개 _state 미사용 → applyStateEffect() | 2~3일 |
| **M-6** | `specShapeConverter.ts` (251-292), `nodeRenderers.ts` (748-763) | BorderShape.sides 개별 Line 렌더링 | 1일 |
| **Phase F+G** | Overlay specs, Color component specs | arrow/backdrop + 2D/원형 그라디언트 | 3~4일 |

**완료 기준**: M +3%, Phase F+G +4% = 누적 **~100%** (목표 93% 초과 달성)

---

### Stage 6: 장기 과제 (별도 일정)

| 항목 | 진입 기준 | 예상 |
|------|----------|------|
| **Phase Z** (애니메이션) | Stage 5 완료 + 새 인프라 설계 | 2주+ |
| **W-0a/b** (벤치마크) | CanvasKit 안정화 후 시나리오 재설계 | 1주 |
| **W-1** (SpatialIndex) | 벤치마크 기준선 확보 후 | 1~2주 |
| **W-4** (Web Worker) | SpatialIndex 검증 후 | 2~3주 |
| **W-LT1~3** (Skia 포크/SIMD/WebGPU) | Phase 6 + 실측 데이터 | 분기 단위 |
| **AI-A5b** (멀티모달 컨텍스트) | Groq Vision API 또는 LLM 전환 | 외부 의존 |
| **AI-A5c/d** (인스턴스 도구) | 컴포넌트 인스턴스 시스템 구축 후 | 시스템 의존 |

---

## 6. 누적 진행률 예측

```
현재 기준                                    62%
│
├─ Stage 1 (Quick Win + Phase A)
│  ├─ QW-1  border style              +1.5%  → 63.5%
│  ├─ Phase A  상태 표현 연결          +4.0%  → 67.5%
│  └─ M-3  image shape                +3.0%  → 70.5%
│
├─ Stage 2 (Phase A 후속 + RC 기초)
│  ├─ QW-2  disabled opacity          +2.5%  → 73.0%
│  ├─ QW-3  focus ring                +3.5%  → 76.5%
│  ├─ RC-3  단위 정규화               +2.5%  → 79.0%
│  └─ RC-1/2  available space/height  +4.0%  → 83.0%
│
├─ Stage 3 (RC 후속 + 기능 시작)
│  ├─ RC-6  intrinsic 통합            +1.5%  → 84.5%
│  ├─ RC-4  2-pass 기준               +1.0%  → 85.5%
│  └─ Phase B  아이콘 폰트            +5.0%  → 90.5%
│
├─ Stage 4 (주요 기능 확장)
│  ├─ Phase C  컬렉션 아이템          +7.0%  → 97.5%
│  ├─ Phase E  overflow scroll        +1.5%  → 99.0%
│  └─ RC-7/5  blockification/baseline +2.0%  → 101.0% (cap→~96%)
│
├─ Stage 5 (정밀도 마무리)
│  ├─ M-2/4/5/6  정밀도 개선          +3.0%
│  └─ Phase F+G  Overlay/Color        +4.0%
│
└─ Stage 6 (장기)
   └─ Phase Z  애니메이션             +3.0%

═══════════════════════════════════════════
최종 예상: ~93% (Stage 4 완료) → ~96% (Stage 5)
```

### 차원별 목표 달성 시점

| 차원 | 현재 | Stage 2 | Stage 3 | Stage 5 |
|------|------|---------|---------|---------|
| 구조/레이아웃 | 85% | 93% | 96% | 97% |
| 렌더링 정밀도 | 65% | 73% | 73% | 80% |
| 시각 장식 | 50% | 50% | 80% | 80% |
| 상태 표현 | 33% | 70% | 70% | 72% |
| 색상/Variant | 80% | 80% | 80% | 85% |

---

## 7. 리스크 및 완화 전략

### 높은 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| RC-1/2 (AvailableSpace 수정)가 기존 레이아웃을 regression | 다수 컴포넌트 영향 | Stage 2에서 집중 회귀 테스트. 스냅샷 비교 도입 |
| Phase C (컬렉션 아이템)의 범위가 예상보다 넓음 | 일정 지연 | Table→ListBox→Menu 순서로 점진적 출시 |
| CanvasKit 메모리 누수 (`.delete()` 누락) | 장시간 사용 시 OOM | Disposable 패턴 래퍼 + Chrome DevTools 모니터링 |

### 중간 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Groq 무료 tier 30 req/min 제한 | AI 응답 지연 | 429 지수 백오프 구현 완료. 배치 도구로 호출 수 최소화 |
| Icon Font 번들 크기 (+200KB~) | 초기 로드 지연 | 서브셋 추출 + lazy loading |
| RC-3 (단위 정규화) 범위 확대 | 파급 효과 | cssValueParser에 국한. 기존 parseFloat 경로를 fallback 유지 |

### 크로스 워크스트림 차단 관계

| 차단 항목 | 차단 받는 항목 | 해소 시점 |
|-----------|--------------|----------|
| RC-3 (WS-2) | AI-A5a (WS-4) | Stage 2 |
| Phase A (WS-1) | QW-2, QW-3, M-5 (WS-1) | Stage 1 |
| 컴포넌트 인스턴스 시스템 (외부) | AI-A5c/d (WS-4) | Stage 6 |
| Groq Vision API (외부) | AI-A5b (WS-4) | 미정 |

---

## 8. 문서 참조 매트릭스

각 실행 항목의 상세 설계는 원본 문서를 참조한다.

| Stage | 항목 | 상세 문서 | 섹션 |
|-------|------|----------|------|
| 1 | QW-1, Phase A, M-3, Phase D | `ENGINE_CHECKLIST.md` | §Quick Win, §Phase A, §Medium |
| 2 | QW-2/3 | `ENGINE_CHECKLIST.md` | §Quick Win |
| 2 | RC-3, RC-1/2 | `ENGINE_CHECKLIST.md` | §Root Cause |
| 3 | RC-6, RC-4 | `ENGINE_CHECKLIST.md` | §Root Cause |
| 3 | Phase B | `ENGINE_CHECKLIST.md` | §Phase B |
| 3 | AI-A5a | `AI.md` | §8 Phase A5 |
| 4 | Phase C, E | `ENGINE_CHECKLIST.md` | §Phase C, §Phase E |
| 4 | RC-7, RC-5 | `ENGINE_CHECKLIST.md` | §Root Cause |
| 4 | W-0c | `WASM.md` | §0.4 산출물 |
| 5 | M-2~6, Phase F/G | `ENGINE_CHECKLIST.md` | §Medium, §Phase F/G |
| 6 | Phase Z | `ENGINE_CHECKLIST.md` | §Phase Z |
| 6 | W-0a/b, W-1, W-4 | `WASM.md` | §Phase 0-1, §Phase 4 |
| 6 | W-LT1~3 | `WASM.md` | §장기 최적화 경로 |
| 6 | AI-A5b~d | `AI.md` | §4.3 도구 정의, §8 Phase A5 |
| — | Spec Shape 타입/렌더러 | `COMPONENT_SPEC_ARCHITECTURE.md` | §Phase 6 |
| — | CanvasKit 렌더 파이프라인 | `WASM.md` | §Phase 5-6 |
