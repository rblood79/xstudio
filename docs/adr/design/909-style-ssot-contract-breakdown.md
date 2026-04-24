# ADR-909 Breakdown — Style SSOT Contract

## Phase 0 — Evidence 수집 (2026-04-24 완료)

Audit grep 으로 24+ consumer 가 shorthand-only 읽기로 확인:

### A. Spec render.shapes (7건)

| 파일                        | 줄  | 패턴                                                |
| --------------------------- | --- | --------------------------------------------------- |
| `Button.spec.ts`            | 416 | `parsePxValue(props.style?.gap, size.gap ?? 8)`     |
| `Meter.spec.ts`             | 478 | 동일                                                |
| `ProgressBar.spec.ts`       | 496 | 동일                                                |
| `Form.spec.ts`              | 362 | `parsePxValue(props.style?.padding, size.paddingY)` |
| `Card.spec.ts`              | 375 | 동일                                                |
| `ColorSwatchPicker.spec.ts` | 195 | 동일                                                |
| `List.spec.ts`              | 135 | 동일                                                |

### B. Layout utils.ts 분기 (9건 단독 + 2건 부분 longhand)

단독 shorthand-only: L1006, L1089, L1271, L1977, L2041, L2105, L2167, L2540, L2646 — `parseNumericValue(style?.gap) ?? N`

부분 longhand-aware (순서 뒤집힘): L1191 `style?.gap ?? style?.columnGap`, L2434 `style?.gap ?? style?.rowGap`

### C. Inspector UI (1건)

`LayoutSection.tsx:517-534` `LAYOUT_PROPS` 배열에 `rowGap`/`columnGap` 누락 → reset 버튼 gap 편집 미감지.

### D. PropertyUnitInput commit 경로 (Track 2 별개)

`PropertyUnitInput.tsx:280-287` — `valueActuallyChanged = parseUnitValue(value).numericValue !== num` 판정이 preview 경로 (elementsMap mutate) 로 인해 value prop 이 이미 편집값을 반영하면 false → commit skip. 또한 `useEffect([value, ...])` 가 focus 중 `lastSavedValueRef` 리셋 → commit skip 연쇄.

## Phase 1 — PropertyUnitInput fix (Track 2)

**파일**: `apps/builder/src/builder/components/property/PropertyUnitInput.tsx`

### 변경 1 — useEffect focus guard

Focus 중 (같은 element) 에는 effect body skip. Preview-induced value prop 변경으로부터 편집 세션 보존.

### 변경 2 — handleInputBlur commit 조건

`valueActuallyChanged` 이중 체크 제거 → `newValue !== lastSavedValueRef.current` 단독 기준. 또한 blur 종료 시 `focusedElementIdRef.current = null` 리셋.

### 변경 3 — handleKeyDown Enter 경로

동일하게 `newVal !== lastSavedValueRef.current` 단독 기준.

## Phase 2 — Spec sweep (Track 1, 7건)

각 spec 의 shorthand-only 읽기를 longhand-우선 + shorthand-fallback 패턴으로 치환.

- Button/Meter/ProgressBar (gap): `parsePxValue(style?.rowGap ?? style?.columnGap ?? style?.gap, defaultGap)`
- Form/Card/ColorSwatchPicker/List (padding uniform): `parsePxValue(style?.paddingTop ?? style?.padding, defaultPadY)`

## Phase 3 — Layout utils sweep (11건)

`utils.ts` 내부에 `readGapValue(style)` helper 신설 — `parseNumericValue(style?.rowGap ?? style?.columnGap ?? style?.gap)` 단일 경로. 11개 분기 모두 `readGapValue(style)` 로 교체 (단독 9건 + 순서 뒤집힌 2건).

## Phase 4 — Inspector LAYOUT_PROPS 보강

`LayoutSection.tsx:517-534` `LAYOUT_PROPS` 에 `"rowGap"`, `"columnGap"` 추가 — reset 버튼 gap 편집 감지.

## Phase 5 — Docs

- `.claude/rules/style-ssot.md` 신설 — store longhand 정책 + consumer 필수 읽기 패턴 + 신규 추가 체크리스트 + 금지 패턴.
- ADR-909 본문 + 본 breakdown.

## Phase 6 — Contract Test (follow-up 여지)

**현재 세션 보류**, 별도 follow-up ADR 로 검토 가능:

- `packages/specs/src/__tests__/shorthand-longhand-consumer.test.ts` — 7 spec × longhand input → shapes 반영 검증.
- `apps/builder/src/.../utils.test.ts` — 11 분기 × longhand input → calculateContentHeight 반영 검증.

현재는 `rules/style-ssot.md` 의 체크리스트 + 자가 리뷰로 재발 방지 (weak gate). 강한 gate 로 승격 시 ESLint custom rule + vitest contract test 병행 검토.

## Verification

### Runtime (Chrome MCP 실측)

- Padding 88 편집 + Enter → DB saveOps +1, `paddingTop=88` 저장, memory 일치 ✅
- Gap 33 편집 + Enter → DB saveOps +1, `rowGap=33 + columnGap=33` 저장, memory 일치 ✅
- 새로고침 후 Inspector + Canvas 값 유지 ✅
- Reset 버튼 활성화 — LAYOUT_PROPS 에 longhand 추가 후 gap 편집 감지 (visual 확인 후속)

### 자동 test

- specs: 311/311 PASS
- type-check: 3/3 PASS (builder / shared / publish)
- rendererStyleContract: 72/72 PASS

## 개방 과제 (follow-up)

- Phase 6 contract test 공식화 (ESLint + vitest)
- Form/Card/ColorSwatchPicker/List 의 padding 4-way 비대칭 지원 (현재 uniform 가정) — 필요 시 `resolveContainerSpacing` 전체 전환
- Branded type `NormalizedStyle` 도입 검토 (ADR-909 대안 C — 별도 ADR 로 검토)
