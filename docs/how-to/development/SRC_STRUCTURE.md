# src 구조 개선 실행 계획

## 개요

현재 src 폴더 내부 구조 분석 결과, 중복/분산된 기능과 일관성 없는 패턴이 발견되었습니다.
이 문서는 단계별 개선 계획을 정의합니다.

| Phase | 내용                      | 예상 기간 | 상태       |
| ----- | ------------------------- | --------- | ---------- |
| 1     | 즉시 개선 (낮은 위험도)   | 1-2일     | ✅ 완료    |
| 2     | 계획적 개선 (중간 위험도) | 1-2주     | 🔲 대기    |
| 3     | 장기 개선 (높은 위험도)   | 1개월+    | 🔲 대기    |

---

# Phase 1: 즉시 개선 (낮은 위험도)

## 1.1 색상 유틸리티 통합 ✅ 완료

### 현재 상태

```
utils/color/colorUtils.ts    ← 통합 완료 (colord + 레거시 호환 함수)
utils/theme/colorUtils.ts    ← 삭제됨
```

### 완료 내용

1. **레거시 호환 함수 추가** (`utils/color/colorUtils.ts`)
   - `hslToRgb`, `rgbToHsl`, `hexToRgb`, `rgbToHex`
   - `hslToHex`, `hexToHsl`, `hslToString`
   - `generateDarkVariant`, `parseColorString`
   - `adjustLightness`, `adjustSaturationHsl`
   - `getSplitComplementaryColors`

2. **Import 경로 변경** (6개 파일)
   - `services/theme/FigmaService.ts`
   - `services/theme/ThemeGenerationService.ts`
   - `services/theme/HctThemeService.ts`
   - `services/theme/ExportService.ts`
   - `services/theme/FigmaPluginService.ts`
   - `builder/panels/themes/components/TokenEditor.tsx`

3. **중복 파일 삭제**
   - `utils/theme/colorUtils.ts` 삭제 완료

### 검증 체크리스트

- [x] TypeScript 빌드 성공
- [x] 색상 변환 기능 정상 동작
- [x] 테마 시스템 정상 동작

---

## 1.2 builder/stores/index.ts 생성 ✅ 완료

### 현재 상태

```
builder/stores/           (38개 파일)
├── data.ts
├── elements.ts
├── history.ts
├── selection.ts
├── ...
└── index.ts              ✅ 생성됨
```

### 문제점

1. **모듈 검색 어려움**: 어떤 store가 있는지 파악 어려움
2. **IDE 자동완성 불량**: barrel export 없어서 자동완성 불가
3. **import 경로 불일치**:
   ```typescript
   // 현재 - 경로가 다양함
   import { useStore } from "@/builder/stores";
   import { useStore } from "../../../stores";
   import { useDataStore } from "../stores/data";
   ```

### 개선 방안

```typescript
// builder/stores/index.ts (신규 생성)
// State Management
export { useStore, type StoreState } from "./store";
export { useDataStore } from "./data";
export { useHistoryStore } from "./history";
export { useSelectionStore } from "./selection";
// ... 기타 store exports
```

### 마이그레이션 단계

- [x] `builder/stores/` 내 모든 파일 목록 확인
- [x] 각 파일의 주요 export 확인
- [x] `builder/stores/index.ts` 생성
- [x] 기존 import 경로 정상 동작 확인 (하위 호환성)
- [x] 빌드 검증

### 영향 범위

- 신규 파일 생성 (기존 코드 변경 없음)
- 하위 호환성 유지

### 검증 체크리스트

- [x] TypeScript 빌드 성공
- [x] 기존 import 경로 정상 동작
- [x] 새로운 barrel import 동작 확인

---

## 1.3 builder/hooks/index.ts 생성 ✅ 완료

### 현재 상태

```
builder/hooks/            (35개 파일)
├── usePageManager.ts
├── useSelection.ts
├── useClipboard.ts
├── ...
└── index.ts              ✅ 생성됨
```

### 완료 내용

- 35개 hook에 대한 barrel export 생성
- 카테고리별 그룹핑 (Async, Data, UI State, Keyboard 등)

### 마이그레이션 단계

- [x] `builder/hooks/` 내 모든 파일 목록 확인
- [x] 각 파일의 주요 export 확인
- [x] `builder/hooks/index.ts` 생성
- [x] 빌드 검증

### 검증 체크리스트

- [x] TypeScript 빌드 성공
- [x] 기존 import 경로 정상 동작

---

## 1.4 작은 폴더 통합 (1-2개 파일) ❌ 취소

> **취소 사유**: 현재 폴더 구조 유지 결정. 향후 각 패널에 추가 파일이 생길 가능성 고려.

### 원래 계획 (참고용)

```
builder/panels/
├── ai/                   (1개 파일)
│   └── AIPanel.tsx
├── history/              (1개 파일)
│   └── HistoryPanel.tsx
...
```

~~**옵션 A: 단순 패널들을 직접 배치**~~

```
builder/panels/
├── AIPanel.tsx           (폴더 없이 직접)
├── HistoryPanel.tsx      (폴더 없이 직접)
...
```

~~**옵션 B: 현재 구조 유지 (index.ts만 추가)**~~

```
builder/panels/
├── ai/
│   ├── AIPanel.tsx
│   └── index.ts          (export 추가)
└── ...
```

~~### 권장: 옵션 A~~

~~단순 패널(파일 1-2개)은 폴더 없이 직접 배치~~

### ~~마이그레이션 단계~~ (취소됨)

- ~~대상 폴더 목록 확정~~
- ~~파일 이동 (폴더 → 상위)~~
- ~~import 경로 업데이트~~
- ~~빈 폴더 삭제~~
- ~~빌드 검증~~

---

# Phase 2: 계획적 개선 (중간 위험도)

## 2.1 Store 구조 재설계

### 현재 상태

```
src/stores/               (전역 - 2개)
├── settingsStore.ts      (54줄)
└── themeStore.ts         (735줄) ⚠️ 과대

builder/stores/           (빌더 전용 - 20개)
├── settings.ts           (190줄) ⚠️ 중복?
├── elements.ts           (613줄)
├── history.ts            (821줄)
└── ...
```

### 문제점

1. **위치 혼재**: 전역 store와 builder store가 분리되어 있음
2. **중복 가능성**: `settingsStore.ts`가 두 곳에 존재
3. **과대 파일**: `themeStore.ts` 735줄 (리팩토링 필요)

### 개선 방안

```
src/stores/                         # 모든 상태 관리 통합
├── index.ts                        # 통합 export
├── global/                         # 전역 상태
│   ├── settings/
│   │   ├── settingsStore.ts
│   │   └── index.ts
│   └── theme/
│       ├── themeStore.ts (분할)
│       ├── themeActions.ts
│       ├── themeSelectors.ts
│       └── index.ts
└── builder/                        # 빌더 전용 상태
    ├── index.ts
    ├── elements/
    ├── selection/
    ├── history/
    └── ...
```

### 마이그레이션 단계

- [ ] 현재 store 의존성 분석
- [ ] 신규 폴더 구조 생성
- [ ] themeStore.ts 분할 (actions, selectors 분리)
- [ ] settings 중복 확인 및 통합
- [ ] import 경로 업데이트 (69+ 파일)
- [ ] 빌드 검증

### 영향 범위

- 69+ 파일 import 변경
- 테스트 필수

### 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] 전역 상태 정상 동작
- [ ] 빌더 상태 정상 동작
- [ ] 테마 변경 정상 동작

---

## 2.2 Export 패턴 통일

### 현재 상태

```typescript
// 패턴 1 - Named exports (권장)
export { PropertyInput } from "./property/PropertyInput";

// 패턴 2 - Wildcard exports (비권장)
export * from "./actions";

// 패턴 3 - 혼합 (일관성 부족)
export * from "./canvas/store";
export { useOverlay } from "./overlay/useOverlay";
```

### 문제점

1. **Tree-shaking 어려움**: wildcard export는 번들 크기 증가
2. **IDE 자동완성 부정확**: 어떤 것이 export되는지 불명확
3. **의존성 추적 어려움**: 순환 참조 발견이 어려움

### 개선 방안

모든 `index.ts`에서 명시적 named exports 사용

```typescript
// Before
export * from "./actions";
export * from "./components";

// After
export { ActionEditor } from "./actions/ActionEditor";
export { NavigateActionEditor } from "./actions/NavigateActionEditor";
export { DebounceThrottleEditor } from "./components/DebounceThrottleEditor";
// 내부 전용은 export하지 않음
```

### 마이그레이션 단계

- [ ] wildcard export 사용 파일 목록 작성
- [ ] 각 파일의 실제 사용되는 export 확인
- [ ] named export로 변경
- [ ] 사용되지 않는 export 제거
- [ ] 빌드 검증

### 영향 범위

- 모든 `index.ts` 파일 (~50개)
- 번들 크기 감소 기대

### 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] 모든 import 정상 동작
- [ ] 번들 크기 확인

---

# Phase 3: 장기 개선 (높은 위험도)

## 3.1 이벤트 시스템 코어 모듈화

### 현재 상태

```
types/events/              (타입 정의 - 2개)
├── events.registry.ts
└── events.types.ts

utils/events/              (엔진 - 2개)
├── eventEngine.ts
└── eventHandlers.ts

builder/panels/events/     (UI + 로직 - 94개) ⚠️ 과대
├── actions/
├── blocks/
├── components/
├── editors/
├── execution/
├── hooks/
├── state/
└── ...
```

### 문제점

1. **로직 분산**: 이벤트 코어 로직이 3곳에 분산
2. **과대한 panels/events**: 94개 파일 (UI와 로직 혼재)
3. **계층 불명확**: types → utils → panels 의존성 복잡

### 개선 방안

```
src/events/                         # 이벤트 시스템 코어 (신규)
├── index.ts
├── types/
│   ├── events.ts
│   ├── actions.ts
│   └── registry.ts
├── engine/                         # utils/events → 이동
│   ├── eventEngine.ts
│   ├── eventHandlers.ts
│   └── index.ts
├── execution/                      # panels/events/execution → 이동
│   ├── executor.ts
│   ├── evaluator.ts
│   └── logger.ts
└── registry/
    └── actionRegistry.ts

builder/panels/events/              # UI 레이어만 유지
├── EventsPanel.tsx
├── components/
├── editors/
├── hooks/                          # UI 전용 hooks만
└── index.ts
```

### 마이그레이션 단계

- [ ] `/src/events/` 폴더 생성
- [ ] types/events → events/types 이동
- [ ] utils/events → events/engine 이동
- [ ] panels/events/execution → events/execution 이동
- [ ] import 경로 업데이트 (94+ 파일)
- [ ] 빌드 검증
- [ ] 통합 테스트

### 영향 범위

- 94+ 파일 변경
- 대규모 리팩토링

### 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] EventsPanel 정상 동작
- [ ] 이벤트 추가/수정/삭제 동작
- [ ] 이벤트 실행 정상 동작
- [ ] 순환 참조 없음 확인

---

## 3.2 성능 모니터링 모듈 통합

### 현재 상태

```
utils/performanceMonitor.ts         (기본)
utils/performance/                  (상세)
├── memoryMonitor.ts
├── stylePanelMetrics.ts
├── fpsMonitor.ts
└── index.ts

builder/hooks/usePerformanceMonitor.ts
builder/hooks/usePerformanceStats.ts
builder/utils/performanceMonitor.ts  ⚠️ 중복?
```

### 문제점

1. **분산된 구현**: 여러 위치에 성능 관련 코드
2. **중복 가능성**: `performanceMonitor.ts`가 두 곳에 존재

### 개선 방안

```
utils/performance/                  # 통합
├── index.ts
├── monitors/
│   ├── memoryMonitor.ts
│   ├── fpsMonitor.ts
│   └── performanceMonitor.ts       # 통합
├── metrics/
│   └── stylePanelMetrics.ts
└── types.ts

builder/hooks/                      # 래퍼만 유지
├── usePerformanceMonitor.ts        # utils/performance 사용
└── usePerformanceStats.ts
```

### 마이그레이션 단계

- [ ] 중복 코드 확인 및 통합
- [ ] utils/performance 구조 재정리
- [ ] builder 측 코드를 래퍼로 변경
- [ ] import 경로 업데이트
- [ ] 빌드 검증

### 영향 범위

- 20개 파일 내외

### 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] MonitorPanel 정상 동작
- [ ] 성능 측정 정상 동작

---

# 부록

## A. 파일 수 통계

| 영역                 | 파일 수    | 비중 |
| -------------------- | ---------- | ---- |
| `builder/panels/`    | 301개      | 35%  |
| `builder/workspace/` | 114개      | 13%  |
| `shared/`            | 73개       | 9%   |
| `builder/stores/`    | 38개       | 4%   |
| `utils/`             | 38개       | 4%   |
| `builder/hooks/`     | 35개       | 4%   |
| `services/`          | 23개       | 3%   |
| `types/`             | 22개       | 3%   |
| 기타                 | ~211개     | 25%  |
| **총계**             | **~855개** | 100% |

> 📅 마지막 업데이트: 2025-12-28

## B. 의존성 방향 원칙

```
UI Layer (panels, components)
    ↓
Hooks Layer (builder/hooks)
    ↓
Store Layer (stores)
    ↓
Core Layer (utils, services)
    ↓
Types Layer (types)
```

**금지**: 하위 레이어가 상위 레이어를 import

## C. 네이밍 규칙

| 유형       | 패턴              | 예시                |
| ---------- | ----------------- | ------------------- |
| React Hook | `useXxx.ts`       | `useSelection.ts`   |
| 유틸리티   | `xxxUtils.ts`     | `colorUtils.ts`     |
| 서비스     | `xxxService.ts`   | `saveService.ts`    |
| 타입 정의  | `xxx.types.ts`    | `events.types.ts`   |
| 상수       | `xxxConstants.ts` | `styleConstants.ts` |
| Store      | `xxxStore.ts`     | `themeStore.ts`     |

## D. 관련 문서

- [BUILDER_COMPONENTS_CONSOLIDATION_PLAN.md](./BUILDER_COMPONENTS_CONSOLIDATION_PLAN.md) - 완료됨
- [README.md](../README.md) - 프로젝트 개요

---

**작성일**: 2025-12-27
**마지막 업데이트**: 2025-12-29
**상태**: Phase 1 완료 (1.1 ✅, 1.2 ✅, 1.3 ✅, 1.4 ❌취소)
