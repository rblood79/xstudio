# 스타일 패널 Skia-native Read Path 전환 (Jotai 제거)

> Design spec — 2026-04-15
> 대상 ADR: ADR-067 (단일 ADR로 원칙 + 실행 통합)
> 구현 breakdown: `docs/design/067-style-panel-skia-native-read-path-breakdown.md`

## 1. Context

### 1-1. 문제

스타일 패널은 DOM+CSS Preview 시절의 구조를 Skia-native Builder에 그대로 이식한 상태다. 선택된 요소의 값을 표시하기 위해 다음 4단계 체인을 거친다:

```
inline (element.style.*)
 → computed (element.computedStyle.*)
 → synthetic (computeSyntheticStyle — Spec preset을 CSS 문자열로 직렬화)
 → default
```

`computeSyntheticStyle`은 Skia 렌더링의 D3 시각 SSOT인 Spec을 **CSS 문자열로 흉내**낸 후 패널이 다시 파싱하는 구조 — D3 대칭 원칙(Builder Skia ↔ Preview DOM+CSS가 대등한 consumer) 위반. CSS consumer 출력을 Skia 패널이 역참조한다.

### 1-2. 증거 (profiling 기반)

| 지표                         | 현재                                                    | 측정 출처                                                                                      |
| ---------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `computeSyntheticStyle` 호출 | 선택당 3–5회 (중복)                                     | `services/computedStyleService.ts:329-370`, `panels/styles/atoms/styleAtoms.ts` redundant 구독 |
| `buildSelectedElement` 비용  | O(depth) 부모 체인 탐색, **캐시 없음**                  | `panels/styles/hooks/useZustandJotaiBridge.ts:138-200`                                         |
| Jotai 생태계 범위            | `apps/builder/src/builder/panels/styles/` **15 파일만** | 전수 조사 (preview/publish/shared/specs 0건)                                                   |
| Canvas 블로킹                | **없음** (startTransition으로 분리)                     | `useCanvasElementSelectionHandlers.ts:61`                                                      |

결론: 패널 체감 지연은 **Canvas FPS와 독립**. Jotai bridge + CSS 흉내 레이어가 panel-only 부채로 남아있음.

### 1-3. Hard Constraints

- 쓰기 경로 불변: `updateElementProps` → `elementsMap.properties` → Memory→Index→History→DB→Preview→Rebalance (`.claude/rules/state-management.md`)
- Canvas FPS 60 유지
- Preview/Publish와의 SSOT 정합성 (쓰기 경로 공유로 자동 보존)
- 기존 Jotai 섹션(Layout/Appearance/Typography/Fill/ComponentState)은 phase 완료 전까지 작동 유지

### 1-4. SSOT 3-Domain 관련 (ADR-063)

본 설계는 **D3(시각 스타일) 내부 정비**. 패널은 D3 SSOT(Spec) + 런타임 파생(layoutMap, propagation)을 **직접 consumer**로 참조하도록 복귀. CSS consumer의 흉내를 역참조하지 않는다.

## 2. Goals / Non-goals

### Goals

- CSS 흉내 레이어(`computeSyntheticStyle`) 제거 → Spec 직접 lookup
- Jotai 완전 제거 → 생태계 단일화 (Zustand only)
- Figma 동형 UX: live granular subscribe (`selectAtom` 역할을 Zustand selector + `useShallow`가 수행)
- "미설정 값" 의미론 명확화: 빈 input + placeholder(실효값 hint)

### Non-goals (본 spec 범위 밖)

- 선택 입력 파이프라인(A/B축) 최적화 — 별도 ADR-069로 분리. 특히 `selectedElementId` commit 이전의 hitTest/pointerdown/startTransition 경계는 본 spec 범위 밖
- BuilderCanvas 구독 슬림화
- DB schema / Preview postMessage 프로토콜 변경

(Appearance propagation chain은 Non-goal이 아니라 Phase 4 범위에 포함 — §5 Phases 참조)

## 3. 확정된 결정

| #   | 결정                                                                                                        | 근거                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D1  | **Pilot 범위 = Transform 섹션** (width/height/top/left/min/max/aspectRatio)                                 | layoutMap 직접 매핑 최소 단위, 실패 시 롤백 비용 최소                           |
| D2  | **Hybrid semantics** — input value는 inline만, placeholder로 실효값 hint. 편집 시작 시 실효값을 seed로 복사 | pencil/Figma 관용. "명시적 설정 vs 미설정" 구분 보존                            |
| D3  | **Figma 동형 live granular** — drag/resize 중 실효값 placeholder가 실시간 추적                              | "보이는 것 = 편집 대상" UX 정합                                                 |
| D4  | **Zustand 단일 생태계** — Jotai 완전 제거 (phase migration)                                                 | Skia 전환 후 Jotai의 atom graph 이점 소멸. bridge/buildSelectedElement는 순비용 |
| D5  | **쓰기 경로 불변** — 모든 phase에서 `elementsMap.properties` 경유 파이프라인 보존                           | SSOT 정합성, rollback 안전, Preview/Publish 무영향                              |

## 4. Architecture

### 4-1. Read Path (전환 후)

```
[Pilot: Transform 섹션]

useTransformValue(id, 'width')
  └─ inline   = useStore((s) => s.elementsMap.get(id)?.properties?.style?.width)
     effective = useStore((s) => s.layoutMap.get(id)?.width)
     type      = useStore((s) => s.elementsMap.get(id)?.type)
     size      = useStore((s) => s.elementsMap.get(id)?.properties?.size)
  → specDefault = useMemo(() => resolveSpecPreset(type, size).width, [type, size])
  → return { inline, effective, specDefault }
```

**구현 제약 (CRITICAL)**: 프로젝트 로컬 ESLint 룰(`apps/builder/eslint-local-rules/index.js:55-80`)이 `useStore(useShallow(...))`를 **금지**한다 (infinite loop 방지). 따라서 3-tier를 object selector + useShallow로 묶지 않고, **개별 primitive selector + `useMemo` 조립** 패턴을 사용한다. 각 selector는 primitive 값을 반환하므로 기본 Object.is equality로 충분 — 불필요한 리렌더 없음.

**3-tier는 sequential fallback이 아니라 역할 분리**. `inline`은 input value에 바인딩, `effective`/`specDefault`는 placeholder/edit-seed 전용. 즉 input value는 inline이 없으면 빈 문자열이고, placeholder는 `effective ?? specDefault ?? 'auto'` 순으로 표시.

| tier        | source                               | 용도                                  | 반응성                   |
| ----------- | ------------------------------------ | ------------------------------------- | ------------------------ |
| inline      | `elementsMap.properties.style[prop]` | 사용자 override. input value에 바인딩 | Zustand change           |
| effective   | `layoutMap.get(id)[prop]`            | placeholder hint, edit seed           | `layoutVersion` change   |
| specDefault | `resolveSpecPreset(el)[prop]`        | effective도 없을 때 fallback hint     | 정적 (Spec 빌드 시 고정) |

### 4-2. Spec Preset Resolver

신규 모듈: `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts`

```ts
export function resolveSpecPreset(
  el: Element | undefined,
): Partial<StylePreset> {
  if (!el) return {};
  const cacheKey = `${el.type}:${el.properties?.size ?? "md"}:${el.properties?.variant ?? ""}`;
  let preset = cache.get(cacheKey);
  if (!preset) {
    preset = extractSpecPreset(TAG_SPEC_MAP[el.type], el.properties);
    cache.set(cacheKey, preset);
  }
  return preset;
}
```

- **캐시 키**: `type:size:variant` (removable 제외 — Transform에 영향 없음)
- **무효화**: Spec 빌드 타임에 고정 → 런타임 무효화 불필요
- **출력**: CSS 문자열 아님. **숫자 그대로** (예: `{ width: 120, height: 32 }`)
- **위치**: panel 서브트리 내부. D3 SSOT 역참조가 아니라 "Spec을 직접 조회"하는 얇은 adapter

### 4-3. Hooks 계층 (Pilot)

```
apps/builder/src/builder/panels/styles/hooks/
  useTransformValue.ts           (신규, Zustand 직접)
    - useTransformValue(id: string, prop: TransformProp): TransformTier
  useTransformValues.ts          (신규, bulk)
    - useTransformValues(id: string): Record<TransformProp, TransformTier>
  useTransformValuesJotai.ts     (Phase 1 완료 시 삭제 — Transform 전용)
  // styleAtoms.ts / useZustandJotaiBridge.ts / selectedElementAtom 삭제는 Phase 4
```

**Jotai 섹션과의 공존 (phase 1)**: Transform만 새 hook 사용. Layout/Appearance 등은 기존 Jotai hook 유지 → 일시 비대칭 허용.

### 4-4. Section 컴포넌트 (`TransformSection.tsx`)

```tsx
// Before
const { width, height, ... } = useTransformValuesJotai();

// After
const id = useStore(s => s.selectedElementId);
const values = useTransformValues(id);
<NumberField
  value={values.width.inline ?? ''}
  placeholder={values.width.effective ?? values.width.specDefault ?? 'auto'}
  onFocus={() => seedFromEffective(values.width)}
  onChange={(v) => updateElementProps(id, { style: { width: v } })}
/>
```

## 5. Phases (Jotai 완전 제거 경로)

> **재분할 근거**: TransformSection은 `useTransformValuesJotai` 외에도 `widthSizeModeAtom` / `parentDisplayAtom` / `parentFlexDirectionAtom` / `selfAlignmentKeysAtom`에 의존 (`sections/TransformSection.tsx:138-154`). 또한 Layout/Typography/Spacing과 Fill/ComponentState는 각각 결합도가 낮은 항목 — 원 4-phase는 독립 PR 경계를 보장하지 못함. 따라서 6-phase로 재분할하고, Transform pilot에는 4개 보조 selector 이관을 함께 포함.

| Phase         | 범위                                                                                                                                  | 산출                                                                                                                | 검증                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **1 (pilot)** | Transform 섹션 + Transform 보조 selector 4종(`widthSizeMode`/`parentDisplay`/`parentFlexDirection`/`selfAlignment`) Zustand 직접 전환 | `useTransformValue` + `resolveSpecPreset` + `useTransformAuxiliary` + `TransformSection` 수정 (기존 atom 참조 제거) | Transform 섹션 paint metric (G1) + Canvas FPS 회귀 0                 |
| **2**         | Layout/Spacing 섹션 이관                                                                                                              | `useLayoutValue` 계열 hooks. `styleAtoms.ts` Layout/Spacing 부분 제거                                               | Layout 섹션 시각 회귀 0 + flex/grid prop 편집 정합성                 |
| **3**         | Typography 섹션 이관                                                                                                                  | `useTypographyValue`. `styleAtoms.ts` Typography 부분 제거. `resolveSpecPreset`에 text primitive 확장               | fontSize/lineHeight/family 표시 일치                                 |
| **4**         | Appearance 이관 — **propagation chain 설계 포함**                                                                                     | `useAppearanceValue` + `resolvePropagatedProp` 유틸 (ADR-048 레지스트리 기반)                                       | propagation 정합 (size=lg Card → 자식 Label 반영, 기존 동작과 동일)  |
| **5**         | Fill 섹션 이관                                                                                                                        | `useFillValue` + `fillAtoms.ts` 제거                                                                                | ColorInput/Gradient 편집 정합성                                      |
| **6**         | ComponentState + panel shell(bridge/selectedElementAtom/styleAtoms) 제거 + `jotai` dependency 삭제                                    | `useZustandJotaiBridge`/`selectedElementAtom`/`styleAtoms` 파일 삭제. `package.json` jotai 제거                     | 전체 패널 스모크 + `pnpm type-check` + `grep -r "from [\"']jotai"` 0 |

각 phase는 **독립 PR + ADR-067 Gate 통과 후 다음 phase**. phase 사이 일시 비대칭은 수용 (Jotai/Zustand 혼재 섹션 공존, 단일 디렉터리 내).

## 6. Transform 섹션 prop별 Read Source

| prop               | inline                           | effective (layoutMap)                                   | specDefault                 |
| ------------------ | -------------------------------- | ------------------------------------------------------- | --------------------------- |
| width              | `properties.style.width`         | `layoutMap.get(id).width`                               | `spec.sizes[size].width`    |
| height             | `properties.style.height`        | `layoutMap.get(id).height`                              | `spec.sizes[size].height`   |
| top                | `properties.style.top`           | `layoutMap.get(id).y` (flow/absolute 공통)              | —                           |
| left               | `properties.style.left`          | `layoutMap.get(id).x` (동일)                            | —                           |
| minWidth/minHeight | `properties.style.minWidth` etc. | — (Taffy constraint, 렌더 결과는 width/height에 반영됨) | `spec.sizes[size].minWidth` |
| maxWidth/maxHeight | 동일                             | —                                                       | 동일                        |
| aspectRatio        | `properties.style.aspectRatio`   | —                                                       | `spec.aspectRatio` (드묾)   |

## 7. Write Path (불변)

변경 없음. 사용자 input → `updateElementProps(id, partial)` → Memory→Index→History→DB→Preview→Rebalance 파이프라인. `.claude/rules/state-management.md` 준수.

## 8. Cache Invalidation

| 캐시                         | 무효화 트리거                                           | 비고                             |
| ---------------------------- | ------------------------------------------------------- | -------------------------------- |
| `resolveSpecPreset` Map      | Spec 빌드 시 고정 → 런타임 무효화 불필요                | HMR 시 module reload로 자연 해결 |
| `useShallow` object identity | Zustand store change 시 selector 재평가 → shallow 비교  | Zustand 내장                     |
| `layoutMap`                  | `layoutVersion` bump (`.claude/rules/layout-engine.md`) | 기존 계약 그대로                 |

**신규 캐시 없음** — `computeSyntheticStyle`의 LRU 제거로 캐시 관리 부담 감소.

## 9. Testing

### 9-1. 단위

- `resolveSpecPreset` — tag × size × variant 매트릭스에서 숫자 정확성
- `useTransformValue` — inline 있음/없음 × layoutMap 있음/없음 × specDefault 있음/없음 (8 경로)

### 9-2. 통합

- 요소 선택 → Transform 섹션 렌더 → 값 표시 일치 (Storybook)
- drag 중 placeholder live 갱신 (Playwright pointer events)
- input 편집 → Zustand 갱신 → Skia 렌더 반영 (`/cross-check` skill)

### 9-3. 회귀

- Canvas FPS 60 유지 (Chrome DevTools Performance)
- Preview 렌더 시각 동일 (쓰기 경로 불변 확인)

## 10. Risks / Gates

### 위험 (4축)

| 축           | 등급     | 근거                                                                                            |
| ------------ | -------- | ----------------------------------------------------------------------------------------------- |
| 기술         | LOW      | 기존 Zustand/useShallow 관용 패턴. 새 메커니즘 0                                                |
| 성능         | LOW      | 4단계 → 3-tier 파생으로 단축. caching 부담 감소. Canvas 블로킹 없음 (startTransition 경계 유지) |
| 유지보수     | **감소** | Jotai bridge/atom 3파일 + CSS 흉내 1파일 제거. 생태계 단일화                                    |
| 마이그레이션 | MEDIUM   | phase 1→4 경로 상 일시 비대칭 (15 파일, 단일 디렉터리) 존재. 각 phase 독립 롤백 가능            |

### Gates

**측정 범위 원칙 (공통)**: 모든 Gate는 **`selectedElementId`/`layoutVersion`이 store에 commit된 이후 패널이 값을 resolve/present하는 시간**만 측정한다. 클릭 → commit 이전의 hitTest/pointerdown/startTransition 경계는 ADR-069 범위이며 본 Gate에 포함하지 않음.

| Gate | 시점       | 통과 조건                                                                                                                                                                                                                                                                                                                               | 실패 시 대안                                                                                             |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| G1   | Phase 1 끝 | **(a) 수량 지표**: Transform 섹션 렌더 동안 `computeSyntheticStyle` 호출 0회 (PerformanceObserver/console trace). **(b) 지연 지표**: same scenario(100 요소 페이지에서 동일 element 선택) × 30 samples, median Transform value resolve+paint **≤ 8ms 또는 baseline 대비 median 30–40% 개선**, p95 회귀 없음. **(c)** Canvas FPS 60 유지 | resolveSpecPreset/useTransformValue 내부 롤백 후 재측정. 필요 시 phase 1 scope 축소 (보조 selector 분리) |
| G2   | Phase 4 끝 | propagation chain 정합: size=lg Card → 자식 Label `fontSize` 정확히 반영 (기존 동작과 동일). 6개 이상 propagation 시나리오 스냅샷 테스트                                                                                                                                                                                                | propagation 유틸을 ADR-048 레지스트리로 재조정                                                           |
| G3   | Phase 6 끝 | `grep -r "from ['\"]jotai" apps/builder/src` → 0 hit + `package.json`에서 `jotai` 제거 + `pnpm type-check` 통과 + 전체 패널 시각 회귀 0                                                                                                                                                                                                 | 남은 atoms를 Zustand로 이관하거나 phase 분할                                                             |

## 11. Success Criteria

- [ ] `computeSyntheticStyle` 호출 0회 (Transform 섹션)
- [ ] `buildSelectedElement` O(depth) 탐색 제거 또는 Transform 범위에서 우회
- [ ] `useTransformValue` 선택당 <1ms (Chrome DevTools)
- [ ] drag 중 Transform placeholder live 갱신 (시각 확인)
- [ ] Phase 6 종결 시 `grep -r "from ['\"]jotai"` apps/builder/src → 0 hit
- [ ] Preview/Publish 렌더 변경 0 (쓰기 경로 불변)

## 12. 참고

- `.claude/rules/state-management.md` — 쓰기 파이프라인 순서
- `.claude/rules/ssot-hierarchy.md` — D3 symmetric 원칙
- ADR-048 — Props Propagation (phase 3 근거)
- ADR-063 — SSOT 체인 charter
- `memory/user-workflow.md` — 반복 디버깅 방지 + 근본 해결 선호
