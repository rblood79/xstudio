# WASM.md 실행 시 문서 영향 분석 및 Pencil 아키텍처 패턴 적용 계획

> 작성일: 2026-01-31
> 최종 수정: 2026-02-02 (Round 4 Skia 렌더링 감사 결과 추가)
> 대상: `docs/LAYOUT_REQUIREMENTS.md`, `docs/COMPONENT_SPEC_ARCHITECTURE.md`, `docs/AI.md`
> 기준: `docs/WASM.md` Phase 5-6, `docs/PENCIL_APP_ANALYSIS.md` §11–§26
> 참고: `docs/AI.md` (AI 기능 업그레이드 설계)

---

## 목적

1. `docs/WASM.md` Phase 5-6 (CanvasKit/Skia 메인 렌더러 전환) 실행 시, 기존 문서에서 수정이 필요한 항목을 식별하고 수정 계획을 수립한다.
2. `docs/PENCIL_APP_ANALYSIS.md` 심층 분석 결과, 렌더링/AI 외에 XStudio에 추가 적용할 수 있는 Pencil 아키텍처 패턴을 식별하고 영향 범위를 평가한다.

## 핵심 아키텍처 변경

### 렌더링 전환 (WASM.md 기준)

```
현재(전환 완료):
  렌더링: Yoga 계산 → renderSkia() → CanvasKit Surface 렌더링
          PixiJS는 씬 그래프 + 이벤트(EventBoundary) 전용으로 축소
  성능 가속: Rust WASM (SpatialIndex O(k) 컬링, Block/Grid 레이아웃 가속, Web Worker 비동기)
```

### Pencil 아키텍처 패턴 추가 적용 (신규)

```
렌더링/AI 외에 Pencil에서 차용할 아키텍처 패턴:
1. 컴포넌트-인스턴스 시스템 (reusable/ref/descendants)
2. 디자인 변수 참조 시스템 ($-- 변수 + 테마별 분기)
3. AI 시각 피드백 (Generating Effect + Flash Animation)
4. 내장 디자인 킷 (JSON 임베딩)
5. 히스토리 트랜잭션 확장 (AI batch + 인스턴스 전파 연동만 — XStudio 기존 시스템 우수)
```

---

## A. LAYOUT_REQUIREMENTS.md 영향 분석

### 변경 불필요 (레이아웃 계산 = 렌더러 무관)

| 섹션 | 라인 범위 | 이유 |
|------|---------|------|
| §1 CSS vs Yoga 동작 차이 분석 | 46–363 | CSS 명세 분석, 렌더러 독립적 |
| §3.1–3.4 BlockEngine/GridEngine/FlexEngine | 401–940 | Yoga 레이아웃 계산 로직, Phase 5에서도 유지 |
| §3.6–3.8 마진 병합/BFC/인라인 | 1024–1358 | 레이아웃 규칙, 렌더러 무관 |
| §8.1–8.4 기존 이슈 (Phase 9–12) | 1681–2183 | 이미 해결된 PixiJS 이슈, 이력 보존 |

### 수정 필요

| # | 섹션 | 라인 범위 | 현재 내용 | 변경 내용 | 우선순위 |
|---|------|---------|----------|----------|---------|
| L1 | §3.5 엔진 디스패처 | 941–1023 | `shouldDelegateToPixiLayout()` 가정 | Phase 5+ 렌더 단계 변경 주석 추가 ("Yoga 계산 유지, 렌더만 CanvasKit") | 중간 |
| L2 | §4.1–4.3 BuilderCanvas 통합 | 1363–1530 | PixiJS `LayoutContainer` + `ElementSprite` 렌더 파이프라인 | Phase 5+ CanvasKit 렌더 파이프라인 섹션 추가 (Yoga → renderSkia() → Surface) | **높음** |
| L3 | §5.1–5.3 검증 방법 | 1535–1638 | 레이아웃 단위 테스트만 | §5.4 추가: CanvasKit 렌더링 정확성 검증 (border-radius, 텍스트, 그래디언트) | 중간 |
| L4 | §7 참조 문서 | 1659–1678 | PixiJS/Yoga 참조만 | CanvasKit/Skia 공식 문서 + Pencil renderSkia() 참조 추가 | 낮음 |
| L5 | §9 변경 이력 | 2185–2217 | Phase 1.27까지 | Phase 5 CanvasKit 통합 항목 추가 | 낮음 |

**요약:** 5건 수정 (높음 1, 중간 2, 낮음 2). 레이아웃 엔진 핵심 로직(§1, §3.1–3.4)은 변경 불필요.

---

## B. COMPONENT_SPEC_ARCHITECTURE.md 영향 분석

### 변경 불필요

| 섹션 | 라인 범위 | 이유 |
|------|---------|------|
| Component Spec 인터페이스 | 225–293 | Shape[] 반환 타입 유지, 해석기만 변경 |
| 상태 관리 (Zustand) | 4048–4191 | Store/Adapter 패턴 렌더러 무관 |
| Token 시스템 (Colors/Spacing) | 783–1155 | 토큰 정의 렌더러 독립적 |

### 수정 필요

| # | 섹션 | 라인 범위 | 현재 내용 | 변경 내용 | 우선순위 |
|---|------|---------|----------|----------|---------|
| C1 | Executive Summary | 24–70 | PixiJS 3-소스 아키텍처 설명 | CanvasKit 메인 렌더러 전환 컨텍스트 추가 | **높음** |
| C2 | Architecture Diagram | 116–160 | Spec → PixiJS Graphics 흐름도 | CanvasKit Surface/Paint/Path 경로 추가 | **높음** |
| C3 | Directory Structure | 181–220 | renderers/에 PixiRenderer만 | CanvasKit 렌더러 위치 명시 (`builder/.../skia/nodeRenderers.ts`) | ✅ 정정 완료 |
| C4 | GradientShape | 732–747 | linear/radial 2종 | angular/mesh 추가 + TileMode/colorSpace 속성 | **높음** |
| C5 | ShadowShape/Effects | 569–607 | 기본 Shadow만 | CanvasKit saveLayer 기반 이펙트 (opacity, blur, background-blur) 확장 | **높음** |
| C6 | BorderShape Stroke | 609–647 | style: solid/dashed/dotted | strokeAlignment(inside/center/outside) + lineCap/lineJoin/miterLimit 추가 | **높음** |
| C7 | PIXI Renderer | 1342–1620 | Graphics로 도형 렌더링 | 범위 축소 (씬 그래프만) + CanvasKitRenderer 분리 설명 | **높음** |
| C8 | 렌더링 Note | 1478–1483 | "text/shadow 별도 처리" | CanvasKit에서 통합 처리 명시 | 중간 |
| C9 | Color Conversion | 1487–1533 | cssColorToPixiHex()만 | cssColorToSkiaColor() (uint32 ARGB) 함수 추가 | 중간 |
| C10 | TextShape | 532–567 | 기본 텍스트 속성 | ParagraphBuilder 속성 (subpixel, strutStyle, kerning) 추가 | 중간 |
| C11 | CSS Generator | 1633–1693 | CSS 생성 로직 | "CSS는 React/Publish 전용, Canvas 렌더링은 CanvasKitRenderer" 주석 추가 | 중간 |
| C12 | ContainerLayout Overflow | 684–727 | overflow: hidden/scroll | CanvasKit clipRect()/clipPath() 구현 주석 추가 | 중간 |
| C13 | PixiButton 예시 | 2401–2471 | Graphics로 버튼 그리기 | Phase 5+ renderSkia() 패턴으로 대체 예시 | **높음** |
| C14 | Performance Optimization | 3889–3919 | 변형 색상 캐싱 | 이중 Surface 캐싱 + Dirty Rect 전략 추가 | **높음** |
| C15 | Visual Regression Testing | 3666–3887 | React vs PixiJS 비교 | React vs CanvasKit 비교로 업데이트 + waitForCanvasKitRender() | **높음** |
| C16 | CSS vs WebGL 규칙 | 2540–2586 | CSS 단위 해석 경고 | CanvasKit은 Yoga 계산 결과(px)만 사용, CSS 미적용 명시 | 중간 |
| C17 | Phase 0 Checklist | 1902–1915 | 기본 설정 항목 | CanvasKit WASM 설정 + CanvasKitRenderer 구현 항목 추가 | **높음** |
| C18 | Component Migration Mapping | 신규 | 없음 | Spec Shape ↔ CanvasKit API 매핑 테이블 (rect→drawRRect, text→drawParagraph 등) | 중간 |

**요약:** 18건 수정 (높음 10, 중간 8). Shape 타입 확장(C4-C6)과 렌더러 분리(C2, C7, C13-C15)가 핵심.

---

## G. Pencil 아키텍처 패턴 추가 적용 분석

> 분석 기준: `docs/PENCIL_APP_ANALYSIS.md` §15–§26
> 분석 범위: 렌더링(WASM.md) / AI(AI.md) 외의 아키텍처 패턴

렌더링 전환과 AI 업그레이드 외에, Pencil 분석에서 XStudio에 적용하면 유의미한 개선을 가져올 아키텍처 패턴을 식별했다. 각 패턴에 대해 XStudio 현재 상태를 평가하고 적용 필요성과 영향 범위를 분석한다.

### G.1 컴포넌트-인스턴스 시스템 — 적용 필요 (높음)

> Pencil 참조: §15.5 컴포넌트-인스턴스 시스템, §23.8 상세

**Pencil 패턴:**
- `reusable: true` 노드가 컴포넌트(마스터)로 등록
- `ref` 타입 노드가 인스턴스, `descendants` 맵으로 하위 노드 속성 개별 오버라이드
- 원본 변경 → 모든 인스턴스에 자동 전파 (오버라이드된 속성 제외)
- `attachToPrototype()` / `detachFromPrototype()` / `prototypePropertyChanged()` API

**XStudio 현재 상태:**

```
현재 Element 타입 (unified.types.ts):
  interface Element {
    id: string;
    tag: string;
    props: Record<string, unknown>;
    parent_id?: string | null;
    // componentType, masterId, overrides 필드 없음
  }
```

- 각 요소가 완전히 독립적 — 마스터-인스턴스 관계 없음
- 복제 시 완전 새로운 요소 생성 (원본과 연결 끊김)
- Props의 variant/size만으로 변형 (구조적 오버라이드 불가)

**적용 시 영향 범위:**

| 영향 대상 | 변경 내용 | 규모 |
|----------|----------|------|
| `packages/shared/src/types/element.types.ts` | `componentType`, `masterId`, `overrides`, `descendants` 필드 추가 | 타입 확장 |
| `apps/builder/src/builder/stores/elements.ts` | 인스턴스 생성/전파/오버라이드 로직 | 핵심 변경 |
| `apps/builder/src/builder/stores/history.ts` | 인스턴스 변경의 원자적 undo (마스터↔인스턴스 동기화) | 중간 |
| `apps/builder/src/preview/` | 인스턴스 resolve 로직 (렌더링 시 마스터+오버라이드 병합) | 중간 |
| `COMPONENT_SPEC_ARCHITECTURE.md` | Component Spec에 인스턴스 패턴 섹션 추가 | 문서 |
| Supabase 스키마 | elements 테이블에 컬럼 추가 | DB 변경 |

**제안 인터페이스:**

```typescript
interface Element {
  // ... 기존 필드
  componentType?: 'main' | 'instance';
  masterId?: string;                          // 마스터 Element ID 참조
  overrides?: Record<string, unknown>;        // 직접 오버라이드된 속성
  descendants?: Record<string, Record<string, unknown>>;  // 하위 노드별 오버라이드
}
```

### G.2 디자인 변수 참조 시스템 강화 — 적용 필요 (높음)

> Pencil 참조: §16 스타일 관리 체계, §16.2 디자인 변수 시스템

**Pencil 패턴:**
- `$--` 접두사 변수 참조: `fill: "$--primary"` → VariableManager가 테마별 resolve
- 3가지 타입: `color`, `string`, `number`
- 테마별 분기: 같은 변수가 Light/Dark에서 다른 값 반환
- 스타일 우선순위: 인스턴스 오버라이드 > 직접 값 > 변수 참조 > 기본값

**XStudio 현재 상태:**

```
현재 변수 시스템:
  - cssVariableReader.ts: Runtime CSS 변수 읽기 (DOM에서 getComputedStyle)
  - themeStore.ts: HCT 색상 공간 기반 토큰 (600+ 라인)
  - 한계: CSS 변수 → PixiJS hex 변환만 지원, 요소 스타일에서 변수 참조 불가
```

- `cssColorToPixiHex()`로 색상만 다룸 (타이포그래피, 스페이싱 변수 미지원)
- 요소 props에서 변수를 직접 참조하는 문법 없음 (`$--primary` 같은 패턴 불가)
- 테마 전환 시 요소별 스타일 자동 반영 불가

**적용 시 영향 범위:**

| 영향 대상 | 변경 내용 | 규모 |
|----------|----------|------|
| `packages/shared/src/types/` | `VariableReference` 타입 정의 (`$--` 접두사 참조) | 타입 추가 |
| `apps/builder/src/stores/themeStore.ts` | VariableManager 역할 확장 — `resolve()` 함수 | 핵심 변경 |
| `apps/builder/src/builder/stores/elements.ts` | 속성값에 변수 참조 허용 (string 또는 resolved value) | 중간 |
| 캔버스 스프라이트/renderSkia | 렌더링 시 변수 resolve → 실제 값 적용 | 중간 |
| 인스펙터 패널 | 속성 편집 UI에 변수 선택 드롭다운 추가 | UI 변경 |
| Supabase 스키마 | variables 테이블 신규 또는 project 메타데이터 확장 | DB 변경 |

**적용 흐름:**

```
노드 프로퍼티: fill = "$--primary"
      ↓
VariableManager.resolve("$--primary", currentTheme)
      ↓
현재 테마(Light/Dark) 확인 → activeTheme = { "Mode": "Light" }
      ↓
매칭 테마값 조회 → "#5749F4"
      ↓
렌더러가 resolved 값으로 렌더링
```

### G.3 AI 시각 피드백 시스템 — 적용 필요 (중간)

> Pencil 참조: §21.14 시각적 피드백 시스템

**Pencil 패턴:**
1. **Generating Effect** (AI 작업 중):
   - `placeholder: true` 노드에 블러 레이어 + 회전 파란색 원형 파티클
   - `currentTime / 2000`으로 각도 회전, AI 응답 완료 시 제거
2. **Flash Animation** (AI 작업 완료 후):
   - 변경된 노드에 스캔라인 그라디언트 + 스트로크 RRect 애니메이션
   - `addFlashForNode(node, { color, strokeWidth, scanLine })`

**XStudio 현재 상태:**
- AI 작업 중 캔버스 레벨 시각 피드백 없음
- AIPanel에서 텍스트 스트리밍만 표시
- `docs/AI.md`에서 시각 피드백을 문제점으로 지적 (§1.2)

**적용 시 영향 범위:**

| 영향 대상 | 변경 내용 | 규모 |
|----------|----------|------|
| `canvas/sprites/` 또는 renderSkia 파이프라인 | `renderGeneratingEffects()` 구현 — placeholder 노드 위 오버레이 | 신규 기능 |
| `canvas/sprites/` 또는 renderSkia 파이프라인 | `renderFlashes()` 구현 — 변경 노드 하이라이트 | 신규 기능 |
| `builder/stores/elements.ts` | `placeholder` 속성 추가 (AI 생성 중 표시) | 속성 추가 |
| `services/ai/` | AI 응답 완료 시 flash 트리거, 작업 중 placeholder 관리 | 연동 |
| `docs/AI.md` | §A3 시각 피드백 상세 설계 추가 | 문서 |

**CanvasKit 전환과의 관계:**
- Phase 5 이전 (PixiJS): PixiJS Graphics overlay로 구현 가능
- Phase 5 이후 (CanvasKit): `renderGeneratingEffects(canvas)` / `renderFlashes(canvas)` — Skia Paint + ImageFilter로 구현 (Pencil과 동일)
- **권장**: CanvasKit 전환 후 구현이 효율적 (Pencil과 동일한 API 사용 가능)

### G.4 내장 디자인 킷 — ✅ 구현 완료

> Pencil 참조: §22 내장 디자인 킷

**Pencil 패턴:**
- 4개 디자인 킷(HALO, Lunaris, Nitro, Shadcn) JSON으로 에디터 번들에 임베딩
- 킷 로드 시: variables/themes/reusable 컴포넌트를 프로젝트에 병합
- 사용자가 인스턴스(`ref`)를 생성하여 디자인에 배치

**XStudio 구현 완료:**
- `utils/designKit/builtinKits/basicKit.ts`: Basic Kit (5 색상 변수 + Default 테마 12토큰 + Card/Badge 마스터 컴포넌트)
- `stores/designKitStore.ts`: `loadAvailableKits()` 내장 킷 자동 로드, `loadBuiltinKit()` ID 기반 조회, 시각 피드백 연동
- `panels/designKit/DesignKitPanel.tsx`: KitComponentList 통합, `handleSelectKit` → `loadBuiltinKit` 연결
- `panels/designKit/components/KitComponentList.tsx`: 마스터 컴포넌트 목록 + `createInstance()` 연결
- `stores/elements.ts`: `createInstance` 스토어 액션 추가

**적용 시 영향 범위:**

| 영향 대상 | 변경 내용 | 규모 |
|----------|----------|------|
| `packages/shared/src/` | 디자인 킷 JSON 스키마 정의 + 기본 킷 작성 | 신규 |
| `apps/builder/src/builder/panels/` | 디자인 킷 브라우저 패널 | UI 신규 |
| `apps/builder/src/builder/stores/` | 킷 로드 로직 (변수/테마/컴포넌트 병합) | 신규 |
| G.1 컴포넌트-인스턴스 시스템 | **선행 의존**: 킷의 컴포넌트를 인스턴스로 배치하려면 필수 | 블로커 |
| G.2 변수 참조 시스템 | **선행 의존**: 킷의 `$--` 변수 참조를 resolve하려면 필수 | 블로커 |

**의존 관계:**

```
G.1 컴포넌트-인스턴스 ─┐
                       ├──→ G.4 디자인 킷
G.2 변수 참조 시스템 ──┘
```

### G.5 히스토리 시스템 — XStudio 기존 우수 (Pencil 적용 불필요)

> Pencil 참조: §16.4 트랜잭션 기반 상태 변경, §24.10 Undo/Redo 트랜잭션
> XStudio 히스토리: Adobe Photoshop History 패널을 벤치마크한 플래그십 기능

**규모:** 4,714줄 / 8개 파일 — XStudio에서 가장 정교한 대규모 서브시스템

| 파일 | 줄 수 | 역할 |
|------|-----:|------|
| `stores/history.ts` | 861 | HistoryManager 싱글톤: Hot Cache(50개) + Cold Storage(IndexedDB), 페이지 격리, 메모리 통계 |
| `stores/history/historyActions.ts` | 1,847 | Undo/Redo/GoToIndex: 7개 작업 타입 × 3단계 파이프라인 (메모리 → iframe → DB) |
| `stores/history/historyIndexedDB.ts` | 529 | 영구 저장소: 90일 자동 정리, 세션 복원, 배치 저장/조회 |
| `stores/utils/elementDiff.ts` | 537 | Diff 계산 엔진: 메모리 80% 절감 (2-5KB → 100-500 bytes/변경) |
| `stores/commandDataStore.ts` | 334 | 압축 메타데이터: max 100 commands + 500 cached elements |
| `stores/utils/historyHelpers.ts` | 263 | 고수준 래퍼: trackBatchUpdate, trackGroupCreation, trackUngroup, trackMultiDelete, trackMultiPaste |
| `panels/history/HistoryPanel.tsx` | 259 | Photoshop-like UI: 시간순 리스트, goToIndex 점프, 시작 상태 마커 |
| `panels/history/HistoryPanel.css` | 84 | 패널 스타일: active 상태 하이라이트, 카운터 뱃지 |

**지원하는 7개 작업 타입:**

| 타입 | 라벨 | Undo 동작 | Redo 동작 |
|------|------|----------|----------|
| `add` | 추가 | 요소 + 자식 삭제 | 요소 + 자식 복원 |
| `remove` | 삭제 | 요소 + 자식 복원 | 요소 + 자식 삭제 |
| `update` | 수정 | prevProps/prevElement 복원 | newProps 적용 |
| `move` | 이동 | prevParentId + prevOrderNum 복원 | newParentId + newOrderNum 적용 |
| `batch` | 일괄 수정 | 각 요소의 prevProps 일괄 복원 | 각 요소의 newProps 일괄 적용 |
| `group` | 그룹 | 그룹 삭제 + 자식 원래 parent로 | 그룹 복원 + 자식 그룹 안으로 |
| `ungroup` | 그룹 해제 | 그룹 복원 + 자식 그룹 안으로 | 그룹 삭제 + 자식 원래 parent로 |

**아키텍처 특징:**

```
3단계 저장 아키텍처:
  Hot Cache (메모리 50개) ─── 즉시 Undo/Redo (~0ms)
         ↓ 백그라운드 저장
  Cold Storage (IndexedDB) ─── 세션 복원 / 90일 보관
         ↓ 비동기 동기화
  Supabase (클라우드) ─────── 영구 저장 / 다중 디바이스

Undo/Redo 3단계 파이프라인 (7개 타입 모두 동일):
  Phase 1: 메모리 상태 업데이트 (즉시, _rebuildIndexes 포함)
  Phase 2: iframe postMessage 동기화 (WebGL-only 모드 스킵)
  Phase 3: DB 동기화 (IndexedDB + Supabase, 비동기 — UI 블로킹 없음)
```

**Photoshop-like UI 기능:**
- 시간순 역순 리스트 (최신이 상단)
- 임의 항목 클릭 → `goToIndex()` 로 중간 렌더링 없이 일괄 적용
- "시작 상태" (Initial State) 마커
- 한국어 액션 라벨: 추가/삭제/수정/이동/일괄 수정(N)/그룹(N)/그룹 해제(N)
- 카운터 뱃지 (3/10 형식), Undo/Redo/Clear 버튼
- Keyboard shortcuts: Cmd+Z, Cmd+Y, Cmd+Shift+H (패널 토글)
- `historyOperationInProgress` 플래그로 동시 작업 방지

**Diff 엔진 상세 (`elementDiff.ts` 537줄):**
- `PropsDiff`: changed(key→prev/next) + added(key→value) + removed(key→value)
- `ElementDiff`: props + parentId + orderNum + metadata(customId, events, dataBinding)
- `deepEqual()`: 재귀 깊은 비교로 불필요한 diff 방지
- `isDiffEmpty()`: 빈 diff 감지 → 히스토리 엔트리 생성 스킵
- 직렬화: `serializeDiff()` / `deserializeDiff()` (Map → Array 변환, IndexedDB 저장용)
- 메모리 추정: `estimateDiffSize()` → `estimatedSize` 필드로 Hot Cache 관리

**Pencil vs XStudio 비교:**

| 기능 | Pencil | XStudio | 비교 |
|------|--------|---------|------|
| 기본 구조 | `UndoManager` 단순 선형 스택 | `HistoryManager` 싱글톤 + `PageHistory` 격리 | XStudio 우수 |
| 저장 방식 | 전체 스냅샷 메모리 저장 | Diff 기반 (80% 메모리 절감) | XStudio 우수 |
| 영속성 | 없음 (세션 종료 시 소멸) | IndexedDB 90일 보관 + Supabase 영구 | XStudio 우수 |
| 페이지 격리 | 없음 (전역 단일 스택) | 페이지별 독립 히스토리 | XStudio 우수 |
| 작업 타입 | 범용 undo/redo | 7개 전문 타입 | XStudio 우수 |
| 점프 이동 | 미지원 | `goToIndex()` — 중간 렌더링 없이 일괄 적용 | XStudio 우수 |
| UI 패널 | 없음 | Photoshop-style History Panel | XStudio 우수 |
| 트랜잭션 | `beginUpdate()` → `commitBlock()` | `addBatchDiffEntry()` + `trackBatchUpdate()` | 동등 |
| DB 동기화 | 없음 | 3단계 (Memory → IndexedDB → Supabase) | XStudio 우수 |
| 메모리 관리 | 없음 | `getMemoryStats()`, `optimizeMemory()`, maxSize 제한 | XStudio 우수 |

**평가:** XStudio의 히스토리 시스템은 Adobe Photoshop을 벤치마크한 **4,714줄 규모의 플래그십 기능**으로, Pencil의 단순 선형 스택(`UndoManager`)과는 비교 자체가 부적절하다. Pencil의 `beginUpdate()` → `commitBlock()` 트랜잭션 패턴이 제공하는 기능은 XStudio의 `addBatchDiffEntry()` 및 `trackBatchUpdate()`가 이미 완전히 커버하고 있다.

**소규모 확장 가능 영역 (기존 시스템의 래퍼 함수 추가 수준):** ✅ 완료

- ✅ AI batch-design 통합 시 `addBatchDiffEntry()`를 활용한 원자적 트랜잭션 보장 → `trackAIBatchOperation()`
- ✅ 컴포넌트-인스턴스 시스템(G.1) 도입 시 마스터 변경 → 인스턴스 전파를 `trackBatchUpdate()`로 처리 → `trackInstancePropagation()`

| 영향 대상 | 변경 내용 | 규모 | 상태 |
|----------|----------|------|------|
| `builder/stores/utils/historyHelpers.ts` | `trackAIBatchOperation()` + `trackInstancePropagation()` 래퍼 추가 | ~45줄 | ✅ 완료 |

### G.6 XStudio 기존 우수 패턴 (Pencil 대비)

분석 결과, 다음 영역에서는 XStudio가 이미 Pencil보다 우수하여 변경이 불필요하다:

| 영역 | XStudio | Pencil | 평가 |
|------|---------|--------|------|
| **Undo/Redo** | **4,714줄/8파일 플래그십**: Diff 기반 (80% 메모리 절감) + 3단계 저장 (RAM→IndexedDB→Supabase) + 페이지 격리 + 7개 작업 타입 + goToIndex 점프 + Photoshop-like Panel UI | 단순 선형 스택 (`UndoManager`: pushUndo/popUndo) | XStudio 압도적 우수 |
| **캔버스 이벤트** | `useDragInteraction` 상태머신 훅 + 동적 해상도 + SelectionBoxRef 명령형 API | 인라인 조건문 분기 | XStudio 우수 |
| **이벤트 배칭** | `MessageCoalescer` 우선순위 큐 + RAF throttle + requestIdleCallback | 기본 debounce | XStudio 우수 |
| **Preview 격리** | iframe srcdoc + postMessage + Delta 동기화 | Electron IPC 전용 | 웹 환경에서 XStudio 우수 |

---

## H. AI.md 연동 영향 분석

> 기준: `docs/AI.md`, `docs/PENCIL_APP_ANALYSIS.md` §20

### 수정 필요

| # | 항목 | 현재 내용 | 변경 내용 | 우선순위 |
|---|------|----------|----------|---------|
| A1 | AI Tool 정의 | 10개 도구 (create/update/delete_element 등) | G.1 반영: `create_component`, `create_instance`, `override_instance` 도구 추가 | **높음** |
| A2 | AI Tool 정의 | `get_variables`, `set_variables` | G.2 반영: 변수 참조 resolve 로직, 테마별 분기 지원 | **높음** |
| A3 | 시각 피드백 | §1.2에서 문제점으로만 지적 | G.3 반영: Generating Effect + Flash Animation 상세 설계 추가 | **높음** |
| A4 | batch-design | 미정의 | Pencil §24.11.4 참조: handleInsert/Update/Copy/Delete IPC 패턴 설계 추가 | **높음** |
| A5 | 스타일 어댑터 | CSS ↔ 내부 스키마 변환만 | G.2 반영: `$--` 변수 참조를 AI가 직접 사용할 수 있도록 어댑터 확장 | 중간 |
| A6 | 에이전트 컨텍스트 | 최근 5개 요소 간략 정보 | 컴포넌트 라이브러리, 디자인 변수 목록, 현재 테마를 컨텍스트에 포함 | 중간 |

**요약:** 6건 수정 (높음 4, 중간 2). 컴포넌트-인스턴스(G.1)와 변수 참조(G.2) 시스템이 AI 도구 정의에 직접 영향.

---

## C. 수정 전략 — 순차 실행 (업데이트)

### 원칙: 렌더링 전환 우선 → 기반 시스템 → AI 연동 → 문서 수정

렌더러가 확정되지 않은 상태에서 G.1/G.2를 구현하면, CanvasKit 전환 시 렌더링 경로를 재작성해야 한다.
**WASM.md 렌더링 전환을 최우선**으로 실행하고, 후속 기능은 확정된 CanvasKit 기반으로 1회 구현한다.
G.1/G.2의 **데이터 모델 설계**(타입 정의, 스토어 인터페이스)는 렌더러 무관이므로 WASM.md와 병행하여 미리 진행할 수 있다.

| 순서 | 대상 | 수정 항목 | 이유 | 상태 |
|------|------|----------|------|------|
| **1** | `docs/WASM.md` Phase 0-6 구현 | 렌더링 코드 작업 | 렌더러 확정이 모든 후속 기능의 전제 조건 | ✅ 완료 |
| **1'** | G.1/G.2 데이터 모델 설계 (병행) | 타입 정의, 스토어 인터페이스, DB 스키마 | 렌더러 무관 부분만 선행 설계 | ✅ 완료 |
| **2** | G.1/G.2 렌더링 경로 구현 | CanvasKit 기반 인스턴스 렌더링, 변수 resolve → Skia 색상 | 확정된 CanvasKit API로 1회 구현 | ✅ 완료 |
| **3** | `docs/AI.md` 업데이트 구현 | A1–A6 (6건) + G.3 시각 피드백 | G.1/G.2 + CanvasKit 확정 후 AI 도구 정의 | ✅ 완료 |
| **4** | `docs/LAYOUT_REQUIREMENTS.md` | L1–L5 (5건) | 영향 적음, 빠르게 완료 | ✅ 완료 |
| **5** | `docs/COMPONENT_SPEC_ARCHITECTURE.md` | C1–C18 (18건) + G.1/G.2 반영 | 렌더러 + 컴포넌트 시스템 전면 업데이트 | ✅ 완료 |
| **6** | 디자인 킷 + 시각 피드백 | G.4 킷 구현 + G.3 피드백 구현 | G.1/G.2 + CanvasKit 완료 후 진행 | ✅ 완료 |

**의존 그래프:**

```
순서 1: WASM.md Phase 0-6 ──────────┐
        (렌더러 확정)                 │
                                     ├──→ 순서 2: G.1/G.2 렌더링 경로 구현
순서 1': G.1/G.2 데이터 모델 설계 ──┘         │
         (병행 — 렌더러 무관)                  │
                                              ├──→ 순서 3: AI.md (A1–A6) + G.3
                                              ├──→ 순서 4: LAYOUT_REQUIREMENTS.md
                                              ├──→ 순서 5: COMPONENT_SPEC_ARCHITECTURE.md
                                              └──→ 순서 6: G.4 디자인 킷 + G.3 시각 피드백
```

**WASM.md 우선 실행의 이점:**
- G.1/G.2의 렌더링 경로를 CanvasKit 기반으로 **1회만 구현** (PixiJS→CanvasKit 재작성 방지)
- G.3 시각 피드백(Generating Effect, Flash)을 CanvasKit `renderGeneratingEffects()`로 직접 구현 가능
- 모든 후속 문서 수정(L1–L5, C1–C18)이 확정된 아키텍처 기준으로 1회 진행
- G.1/G.2 데이터 모델은 병행 설계로 시간 손실 없음

---

## D. 영향 범위 요약 (업데이트)

```
LAYOUT_REQUIREMENTS.md
├── 변경 불필요: 레이아웃 엔진 핵심 (§1, §3.1–3.4, §3.6–3.8) ····· ~70%
├── 수정 필요 (높음): BuilderCanvas 통합 (§4.1–4.3) ·················· 1건
├── 수정 필요 (중간): 엔진 디스패처 주석, 검증 방법 추가 ·············· 2건
└── 수정 필요 (낮음): 참조 문서, 변경 이력 ···························· 2건
                                                         소계: 5건

COMPONENT_SPEC_ARCHITECTURE.md
├── 변경 불필요: Spec 인터페이스, 상태 관리, Token 시스템 ············ ~30%
├── 수정 필요 (높음): 아키텍처/렌더러/Shape/테스트 ···················· 10건
├── 수정 필요 (중간): 텍스트/색상/CSS/매핑 ···························· 8건
└── 신규 섹션: Component ↔ CanvasKit API 매핑 테이블 ················· 1건
                                                         소계: 18건 (기존)

AI.md (신규 분석)
├── 수정 필요 (높음): AI 도구 확장, batch-design, 시각 피드백 ········ 4건
└── 수정 필요 (중간): 스타일 어댑터, 에이전트 컨텍스트 ················ 2건
                                                         소계: 6건

Pencil 패턴 추가 적용 (신규 분석)
├── 적용 필요 (높음): G.1 컴포넌트-인스턴스, G.2 변수 참조 ··········· 2건
├── 적용 필요 (중간): G.3 시각 피드백, G.4 디자인 킷 ·················· 2건
├── ★ 변경 불필요: G.5 히스토리 (4,714줄 플래그십 — Pencil 적용 불필요) · 0건
│   └── 소규모 확장만: AI batch 래퍼 + G.1 인스턴스 전파 연동 ········· (~20줄)
└── 변경 불필요: 이벤트 배칭, 캔버스 상태머신, Preview 격리 ··········· (XStudio 우수)
                                                         소계: 4건 + 소규모 확장 1건
                                                    ─────────────
                                                    전체: 33건 + 소규모 확장 1건
```

**결론:**
- **LAYOUT_REQUIREMENTS.md**: 영향 적음 (5건). 레이아웃 계산은 렌더러 독립적.
- **COMPONENT_SPEC_ARCHITECTURE.md**: 영향 큼 (18건). 렌더링 + 컴포넌트 시스템 전면 업데이트.
- **AI.md**: 영향 중간 (6건). G.1/G.2 시스템이 AI 도구 정의에 직접 영향.
- **Pencil 패턴**: 렌더링/AI 외 4건 추가 적용 + 1건 소규모 확장 식별. G.1(컴포넌트-인스턴스)과 G.2(변수 참조)가 핵심 블로커. G.5 히스토리는 4,714줄 규모의 플래그십 시스템으로 Pencil 대비 **압도적 우수** — 트랜잭션 패턴 차용 불필요.

---

## E. 수정 실행 방법

각 편집은 **기존 내용을 삭제하지 않고**, Phase 5+ 관련 블록을 추가/보강하는 방식으로 진행한다.
현재 PixiJS 기반 내용은 Phase 5 전까지 유효하므로, "Phase 5+ 변경사항" 서브섹션으로 분리하여 추가한다.

### 예시 패턴 (렌더링 관련):
```markdown
### 기존 섹션 제목

(기존 PixiJS 기반 내용 유지)

#### Phase 5+ 변경사항 (CanvasKit/Skia 전환)

> Phase 5 이후 이 섹션의 PixiJS 렌더링 부분은 CanvasKit으로 대체된다.
> 상세: `docs/WASM.md` Phase 5.x 참조

(CanvasKit 관련 추가 내용)
```

### 예시 패턴 (G.1/G.2 관련):
```markdown
### 기존 Element 정의

(기존 내용 유지)

#### 컴포넌트-인스턴스 확장

> Pencil 참조: `docs/PENCIL_APP_ANALYSIS.md` §15.5, §23.8

- `componentType?: 'main' | 'instance'`
- `masterId?: string`
- `descendants?: Record<string, Record<string, unknown>>`

(확장 내용)
```

---

## F. 검증 (업데이트)

### 렌더링 관련 (기존)
1. 각 수정 항목이 WASM.md의 해당 Phase 섹션과 교차 참조가 올바른지 확인
2. Shape 타입 확장(C4-C6)이 WASM.md Phase 6.3의 Fill/Stroke 설계와 일치하는지 확인
3. 렌더 파이프라인 다이어그램(C2, L2)이 WASM.md Phase 5.7 캔버스 오버레이 구조와 일치하는지 확인
4. 기존 PixiJS 내용이 삭제되지 않고 Phase 5+ 블록으로 분리되었는지 확인

### Pencil 패턴 적용 관련 (신규)
5. G.1 컴포넌트-인스턴스 구현이 Pencil §23.8의 `attachToPrototype/detachFromPrototype/prototypePropertyChanged` 패턴과 일관되는지 확인
6. G.2 변수 참조 시스템이 Pencil §16.2–16.3의 `$--` 참조 + 테마별 분기 해석 흐름과 일관되는지 확인
7. G.1/G.2가 AI.md의 도구 정의(A1-A2)와 정합하는지 확인 (도구가 컴포넌트/변수를 올바르게 조작)
8. G.4 디자인 킷 JSON 스키마가 Pencil §22.3의 킷 구조(variables + themes + reusable 컴포넌트)와 호환되는지 확인
9. G.3 시각 피드백이 CanvasKit 렌더 루프(WASM.md Phase 5)의 `renderGeneratingEffects()` / `renderFlashes()` 위치에 올바르게 통합되는지 확인

---

## I. Round 4: Skia 렌더링 파이프라인 감사 (2026-02-02)

> Round 1–3 수정 완료 후 전체 Skia 관련 파일 18개를 대상으로 수행한 종합 감사.
> 총 22건 발견 (CRITICAL 3, HIGH 4, MEDIUM 7, LOW 8)

### CRITICAL (서비스 불가 / 렌더링 왜곡)

#### I-C1. Inner Shadow 렌더링 오류

- **파일**: `canvas/skia/effects.ts:75-82`
- **문제**: `MakeDropShadowOnly`는 그림자만 그리고 원본 콘텐츠를 삭제한다. inner shadow 구현에 사용하면 **소스 콘텐츠가 사라짐**
- **현상**: inner shadow가 적용된 요소가 그림자만 보이고 내부 콘텐츠가 투명하게 렌더됨
- **수정 방안**: `MakeDropShadow` (소스 포함) 사용 + clip rect로 외부 그림자 잘라내어 내부만 표시, 또는 `MakeDropShadowOnly` → `MakeCompose(inner, src)` 합성

#### I-C2. Lasso 좌표 불일치 (Selection 렌더)

- **파일**: `canvas/skia/SkiaOverlay.tsx:289-308`
- **문제**: Lasso 사각형이 **screen 좌표**(마우스 좌표)를 직접 사용하지만 캔버스는 이미 camera transform(translate + scale)이 적용된 상태. 결과적으로 줌/팬 시 Lasso가 의도와 다른 위치에 렌더됨
- **현상**: 줌 100% 이외에서 Lasso 드래그 영역과 실제 선택 영역 불일치
- **수정 방안**: Lasso 좌표를 scene-local 좌표로 변환 (screen → world: `(screenX - cameraX) / zoom`)하거나, Lasso 렌더링을 camera transform 이전에 수행

#### I-C3. 타입 불일치 (styleConverter ↔ effects)

- **파일**: `canvas/skia/sprites/styleConverter.ts` — `buildSkiaEffects()`
- **문제**: `SkiaEffectItem`은 `[key: string]: unknown` 인덱스 시그니처를 가진 로컬 타입으로, `EffectStyle` 유니언 타입과 구조적으로 호환되지 않음. TypeScript 컴파일은 통과하지만 런타임에서 `effects.ts`의 switch/case가 예상 필드를 찾지 못할 수 있음
- **현상**: 특정 조합에서 이펙트가 무시되거나 잘못된 분기로 진입 가능
- **수정 방안**: `SkiaEffectItem` 제거 → `EffectStyle` 유니언 직접 import/사용. 또는 각 case에서 `as OpacityEffect` 등 명시적 타입 단언

### HIGH (기능 결함 / 성능 심각)

#### I-H4. DPR 변경 시 SkiaRenderer.dpr 미갱신

- **파일**: `canvas/skia/SkiaRenderer.ts:54, 306-319`
- **문제**: `SkiaOverlay`에서 DPR 변경 감지 + 캔버스 리사이즈를 수행하지만, `SkiaRenderer` 인스턴스의 `this.dpr` 필드는 생성자에서만 설정됨. DPR 변경 후 Surface 재생성 시 이전 DPR로 스케일링하여 **흐릿하거나 과도하게 확대**된 렌더링
- **수정 방안**: `SkiaRenderer`에 `updateDpr(newDpr)` 메서드 추가 또는 `render()` 호출 시 DPR 파라미터 수신

#### I-H5. 이미지 캐시 레이스 컨디션

- **파일**: `canvas/skia/imageCache.ts` — `clearImageCache()` / `loadSkImage()`
- **문제**: `clearImageCache()`가 모든 SkImage를 delete하지만, 진행 중인 `loadSkImage()` Promise가 완료 후 이미 삭제된 SkImage 참조를 반환할 수 있음
- **현상**: 페이지 전환 중 이미지 로드 완료 시 use-after-free 크래시 또는 빈 이미지
- **수정 방안**: `clearImageCache()` 시 진행 중인 Promise에 취소 토큰 전파, 또는 generation counter로 stale 로드 결과 무시

#### I-H6. 프레임당 대량 GC 압력

- **파일**: `canvas/skia/SkiaOverlay.tsx` — `buildSkiaTreeHierarchical()`, `buildTreeBoundsMap()`
- **문제**: 60fps 렌더 루프에서 매 프레임 수백 개의 `SkiaNodeData` 객체, `Map`, 중간 배열을 생성. Minor GC가 빈번하게 발생하여 프레임 드롭
- **수정 방안**: 객체 풀링, 이전 프레임 트리 재사용(registryVersion 비교), 또는 `buildSkiaTreeHierarchical`를 registryVersion 변경 시에만 실행

#### I-H7. useSkiaNode 불필요한 재등록

- **파일**: `canvas/skia/useSkiaNode.ts` + 각 Sprite 컴포넌트
- **문제**: `useMemo`로 생성하는 `skiaNodeData`에 `Float32Array.of(...)` 포함 → 매 렌더마다 새 참조 → `useEffect` deps 변경 → `registerSkiaNode` + `unregisterSkiaNode` 매 프레임 호출
- **현상**: 정적 요소도 매 프레임 레지스트리 업데이트, registryVersion 무한 증가, 렌더 루프 항상 full render
- **수정 방안**: `skiaNodeData`에 shallow-equal 비교 래퍼 적용, 또는 `Float32Array` 를 `useMemo` 외부에서 캐싱

### MEDIUM (부분 결함 / 비효율)

#### I-M8. Store 구독 중복 읽기

- **파일**: `canvas/skia/SkiaOverlay.tsx` — `useBuilderStore` selectors
- **문제**: `elements`, `currentPageId`, `selectedElementIds` 등을 개별 selector로 구독 → 하나의 Store 업데이트가 다수의 리렌더 트리거
- **수정 방안**: 단일 selector로 필요한 값을 한 번에 추출 (`shallow` comparator 사용)

#### I-M9. AI 시각 피드백 Store 중복

- **파일**: `canvas/skia/SkiaOverlay.tsx` — `useAIVisualFeedbackStore` 다중 구독
- **문제**: `generatingElementIds`, `flashElementIds`, `flashPhase`를 개별 구독 → AI 작업 중 불필요한 리렌더
- **수정 방안**: 단일 shallow selector로 통합

#### I-M10. Mesh Gradient에서 SrcOver 블렌드 누락

- **파일**: `canvas/skia/fills.ts` — `case 'mesh-gradient'`
- **문제**: 현재 `return null` 스텁이지만, 구현 시 생성하는 셰이더의 블렌드 모드를 명시하지 않으면 기본값이 아닌 이전 Paint의 블렌드가 상속될 수 있음
- **수정 방안**: mesh-gradient 구현 시 `paint.setBlendMode(ck.BlendMode.SrcOver)` 명시

#### I-M11. ParagraphStyle 메모리 누수

- **파일**: `canvas/skia/nodeRenderers.ts:278-294` — `renderText()`
- **문제**: `new ck.ParagraphStyle()`로 생성한 객체가 `scope.track()`에 추가되지 않음. `ParagraphBuilder`와 `Paragraph`만 추적 중
- **현상**: `renderText()` 호출마다 ParagraphStyle WASM 메모리 누수
- **수정 방안**: `scope.track(paraStyle)` 추가, 또는 ParagraphStyle이 CanvasKit에서 delete 불필요한 plain object인지 확인

#### I-M12. ResizeObserver 스테일 엔트리

- **파일**: `canvas/skia/SkiaOverlay.tsx` — ResizeObserver callback
- **문제**: 캔버스 컨테이너가 언마운트된 후에도 ResizeObserver 콜백이 호출될 수 있으며, `entry.contentRect`이 stale 상태
- **수정 방안**: `observer.disconnect()`를 cleanup에서 보장 + 콜백 내 `if (!containerRef.current) return` 가드

#### I-M13. blendModes.ts 캐시 미활용

- **파일**: `canvas/skia/blendModes.ts` — `toSkiaBlendMode()`
- **문제**: 매 호출마다 `switch` 문으로 string → CanvasKit enum 변환. 프레임당 노드 수만큼 호출됨
- **수정 방안**: `Map<string, EmbindEnumEntity>` 캐시를 `CanvasKit` 인스턴스 초기화 시 구축

#### I-M14. fills.ts conic-gradient fallback 누락

- **파일**: `canvas/skia/fills.ts` — `applyFill()`
- **문제**: `conic-gradient` 타입이 `FillStyle` 유니언에 없지만, CSS에서는 `conic-gradient`를 사용할 수 있음. 파싱 단계에서 누락되면 silent fail
- **수정 방안**: `FillStyle`에 `conic-gradient` 타입 추가하거나, `styleConverter`에서 명시적 경고 로깅

### LOW (코드 품질 / 엣지 케이스)

#### I-L15. BodyLayer 빈 ID 가드 미완

- **파일**: `canvas/layers/BodyLayer.tsx`
- **문제**: `useSkiaNode(bodyElement?.id ?? '', ...)` — 빈 문자열 ID로 등록 시 레지스트리에 `''` 키가 생성됨
- **현상**: bodyElement 없을 때 불필요한 레지스트리 엔트리
- **상태**: 이전 라운드에서 부분 수정. `null` 전달로 등록 자체를 스킵하도록 완료 필요

#### I-L16. export.ts 타입 단언

- **파일**: `canvas/skia/export.ts`
- **문제**: 내보내기 시 `as unknown as ...` 타입 단언이 여러 곳에 사용되어 타입 안전성 약화
- **수정 방안**: 제네릭 또는 타입 가드로 교체

#### I-L17. cssColorToAlpha HSLA 미지원

- **파일**: `canvas/sprites/styleConverter.ts` — `cssColorToAlpha()`
- **문제**: `rgba()` 만 파싱. `hsla()`, `oklch()`, CSS named colors의 알파값 추출 불가 → 기본값 1 반환
- **수정 방안**: `canvas` 2D context `getImageData()` 기반 범용 파서, 또는 `color` npm 패키지 사용

#### I-L18. eventBridge 미사용 코드

- **파일**: `canvas/skia/eventBridge.ts`
- **문제**: 일부 exported 함수가 현재 어디서도 import되지 않음 (dead code)
- **수정 방안**: 실제 사용처 확인 후 미사용 함수 제거

#### I-L19. fontManager 예외 처리

- **파일**: `canvas/skia/fontManager.ts`
- **문제**: 폰트 로드 실패 시 `throw` → 렌더 루프 전체가 중단될 수 있음
- **수정 방안**: `try-catch` + fallback 폰트 반환, 또는 에러를 로깅하고 `null` 반환

#### I-L20. ImageSprite 이중 로딩

- **파일**: `canvas/sprites/ImageSprite.tsx`
- **문제**: `src` 변경 시 이전 로드가 완료되기 전에 새 로드 시작 → 이전 라운드에서 `cancelled` 플래그로 수정했으나, `loadSkImage` 자체가 캐시에서 중복 fetch를 시작할 수 있음
- **수정 방안**: `imageCache.ts`에 진행 중 Promise 캐시 (`Map<string, Promise>`) 추가

#### I-L21. Selection elementRegistry fallback zoom

- **파일**: `canvas/skia/SkiaOverlay.tsx` — `buildSelectionRenderData()`
- **문제**: `treeBoundsMap`에서 요소를 찾지 못하면 `elementRegistry` fallback으로 좌표를 가져오는데, 이 fallback 경로에서 zoom 스케일이 적용되지 않음
- **수정 방안**: fallback 경로에도 `/ cameraZoom` 스케일 적용, 또는 fallback 제거 (treeBoundsMap이 항상 완전해야 함)

#### I-L22. updateTextChildren 고정 lineHeight 배수

- **파일**: `canvas/sprites/TextSprite.tsx` 관련 업데이트 경로
- **문제**: 텍스트 높이 계산에서 `lineHeight`가 `fontSize * 1.2` 고정 배수로 사용되는 경로 존재. CSS lineHeight가 다른 값일 때 높이 불일치
- **수정 방안**: 실제 `style.lineHeight` 값 사용, 없으면 브라우저 기본값(약 1.2) fallback

---

### Round 4 요약

| 심각도 | 건수 | 주요 영향 영역 |
|--------|------|---------------|
| CRITICAL | 3 | inner shadow 렌더, Lasso 좌표, 타입 안전성 |
| HIGH | 4 | DPR 동기화, 이미지 캐시 안전성, GC 압력, 레지스트리 성능 |
| MEDIUM | 7 | Store 효율, 메모리 누수, 블렌드 모드, 그라디언트 |
| LOW | 8 | 코드 품질, 엣지 케이스, dead code |
| **합계** | **22** | |

### 수정 우선순위

1. **CRITICAL 3건** → 즉시 수정 (렌더링 왜곡 / 기능 불가)
2. **HIGH 4건** → 우선 수정 (성능 / 안정성)
3. **MEDIUM 7건** → 순차 수정
4. **LOW 8건** → 리팩토링 시 함께 처리
