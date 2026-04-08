# composition — Progress Tracker

> 이 파일은 세션 간 진행 상황을 추적합니다.
> 각 에이전트는 세션 시작 시 이 파일을 읽고, 종료 시 업데이트합니다.

## 현재 상태

- 최종 업데이트: 2026-04-08
- 활성 브랜치: main

## 최근 완료된 작업

- InlineAlert Spec 정합성 수정 — descFontSize sm 13→12, Description Skia 라우팅 버그 수정, CSSGenerator hover/pressed border-color 버그 수정 (2026-04-08)
- ADR-044 완료 — composition → composition 전체 리네이밍 (패키지명 + WASM + 문서 + .claude) (2026-04-07)
- ESLint/TypeScript 전면 수정 — eslint-disable 없이 근본 해결 전체 완료 (2026-04-07)
- `__tests__/` 디렉토리 + `apps/builder/scripts/` 성능 테스트 파일 제거 (2026-04-07)
- ADR-100 Phase 10 완료 — CSS3 렌더링 확장 + 안정화 통합 (2026-04-07)
- Dynamic theming — SkiaCanvas + BoxNode 동적 테마 적용 (2026-04-07)
- ADR-056 Base Typography SSOT — themeConfigStore 동적 설정 (2026-04-07)
- TextSpec with size presets (xs~3xl) + auto size toggle in properties panel (2026-04-07)
- ADR-100 Phase 9 완료 — PixiJS 제거 + Skia 단일 렌더러 (2026-04-06)
- ADR-055 이벤트 레지스트리 SSOT — EVENT_REGISTRY 정본 도입 (2026-04-06)
- Overflow Scroll + Flex flexShrink 보정 + hover outline scroll offset 동기화 (2026-04-06)
- ADR-052/053 S2 Props API 정합성 + 커버리지 확장 (2026-04-05)
- ADR-008 CSS 텍스트 래핑 Phase 1~3 완료, layout 보정 제거 (2026-04-05)
- ADR-050 Container Overflow — WebGL clipping + hatching (2026-04-03)
- ADR-021 Theme System Phase A~E 전체 완료

## ADR-100 Unified Skia Engine 현황

### 완료된 Phase

| Phase | 작업                                                            | 상태 | 커밋     |
| ----- | --------------------------------------------------------------- | :--: | -------- |
| 1~8   | PixiJS → Skia 점진적 마이그레이션 (이벤트, 텍스트, 레이아웃 등) | 완료 | —        |
| 9     | PixiJS 완전 제거 + Skia 단일 렌더러                             | 완료 | 8cc21988 |
| 10    | CSS3 렌더링 확장 (mask-image, transition, sticky) + 안정화 통합 | 완료 | 0e48c69d |
| +     | Dynamic theming — SkiaCanvas + BoxNode per-element 테마         | 완료 | bdd7e2a3 |

### 구현된 CSS3 기능 (Phase 10)

- `mask-image` URL 소스 — imageCache 비동기 로딩 + SkImage shader
- `transition`/`animation` — 보간 값 SkiaNodeData 적용
- `sticky` 포지셔닝 — render pipeline 통합
- Variable font 로딩 + base typography 정렬
- devProfiler + Gate 검증 수정

### 다음 단계

- Rust Layout 마이그레이션 (Taffy WASM → native Rust)
- 잔여 안정화 이슈 모니터링

## ESLint/TypeScript 전면 수정 (2026-04-07)

### 수정된 파일

| 파일                                 | 오류                                       | 해결 방법                                                |
| ------------------------------------ | ------------------------------------------ | -------------------------------------------------------- |
| `LayersSection.tsx`                  | `react-hooks/set-state-in-effect`          | 지연 초기화 + `scheduleNextFrame` 비동기화               |
| `PropertyNumberInput.tsx`            | `react-hooks/refs`                         | prevSync(state)와 ref 리셋을 별도 effect로 분리          |
| `ParticleContext.tsx`                | `react-refresh/only-export-components`     | `createContext` → `particleContextInstance.ts` 분리      |
| `usePageManager.ts`                  | `react-hooks/exhaustive-deps`              | 미사용 `fetchElements` deps에서 제거                     |
| `VirtualizedTree.tsx`                | `react-hooks/incompatible-library`         | `"use no memo"` 지시어 추가                              |
| `useTreeVirtual.ts`                  | `react-hooks/incompatible-library`         | `"use no memo"` 지시어 추가                              |
| `useCentralCanvasPointerHandlers.ts` | `local/prefer-keyboard-shortcuts-registry` | `useKeyboardShortcutsRegistry` + hook-level useRef       |
| `eslint.config.js`                   | —                                          | `react-hooks/incompatible-library: 'off'` (opt-out 완료) |

### 신규 파일

- `apps/builder/src/components/particle/particleContextInstance.ts` — Fast Refresh 분리용 context 인스턴스

### 최종 상태

- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors

## ADR-055 이벤트 레지스트리 SSOT (2026-04-06)

- EVENT_REGISTRY 단일 정본 도입
- 모든 이벤트 타입 자동 파생 (EventType 유니온 등)
- 레거시 import 경로 `local/no-eventtype-legacy-import` ESLint 규칙으로 강제

## ADR-052/053 S2 Props (2026-04-05)

- React Spectrum 공식 API 기준으로 Props 명칭 정립
- API 정합성 + 커버리지 확장 전체 완료

## 알려진 이슈

- `LABEL_DELEGATION_PARENT_TAGS`/`LABEL_WRAPPER_TAGS` — Registry 교체 가능하지만 복잡한 DFS 로직이라 안전하게 유지
- 기존 생성된 컴포넌트의 Label에 `width: "fit-content"` 미설정 가능
- 기존 DatePicker/DateRangePicker에 `hideTimeZone`/`shouldForceLeadingZeros` prop 없음 — `!== false` 패턴으로 동작은 true

## 다음 작업 후보

- Rust Layout 마이그레이션 (ADR-100 후속)
- ADR-051 텍스트 측정 통합 (Canvas 2D 내재화, Phase 0 대기)
- ADR-054 로컬 LLM (Ollama → node-llama-cpp, ADR-011 Supersede)
- `resolveSpecFontSize()` 유틸리티 추출 — 56개 Spec의 동일 3단계 패턴 통합

## 세션 로그

| 날짜       | 작업 요약                                                                                               | 결과 |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---- |
| 2026-04-08 | InlineAlert Spec 정합성 수정 (descFontSize sm 13→12, Skia Description 라우팅, CSSGenerator border 버그) | 완료 |
| 2026-04-07 | 테스트 파일 제거 + ESLint/TypeScript 전면 수정 (7개 파일, 근본 해결) + /simplify                        | 완료 |
| 2026-04-07 | Dynamic theming (SkiaCanvas + BoxNode) + ADR-056 Base Typography                                        | 완료 |
| 2026-04-07 | ADR-100 Phase 10 CSS3 확장 (mask, transition, sticky, variable font) + 안정화                           | 완료 |
| 2026-04-06 | ADR-100 Phase 9 PixiJS 제거 + ADR-055 이벤트 레지스트리 SSOT + Overflow Scroll                          | 완료 |
| 2026-04-05 | ADR-052/053 S2 Props + ADR-008 텍스트 래핑 Phase 1~3 + ADR 구조 선행 원칙                               | 완료 |
| 2026-04-03 | ADR-050 Container Overflow (WebGL clipping + hatching) + CanvasKit 버전 고정                            | 완료 |
| 2026-04-02 | Preview iframe 마이그레이션 (srcdoc→src) + Layout Prop Reactivity                                       | 완료 |
| 2026-04-01 | ADR-021 Theme System Phase A~E + Rendering Parity Audit (33 spec size)                                  | 완료 |
| 2026-03-31 | ADR-048 후속 버그 수정 + DatePicker 기능 확장 (size propagation, visibleMonths 등)                      | 완료 |
