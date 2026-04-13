# ADR-064 구현 상세 — ComponentSpec shapes API variant 파라미터 제거

본 문서는 ADR-064의 구현 상세만 담는다. 결정 근거/대안/위험은 ADR 본문 참조.

## 변경 범위 (2026-04-13 실측)

- `packages/specs/src/types/spec.types.ts` — `RenderSpec.shapes` 시그니처 1건
- `packages/specs/src/components/*.spec.ts` — 83개 컴포넌트 Spec 전부
  - variant 실사용: 78파일 (215건 `variant.X` 소비)
  - `_variant` 무시: 13파일 (mechanical 삭제)
  - `shapes: () => []` 또는 기타: 잔여
- `packages/specs/src/renderers/PixiRenderer.ts` — `spec.render.shapes(props, variantSpec, ...)` 호출부 1곳
- `apps/builder/src/builder/workspace/canvas/skia/buildSpecNodeData.ts` — 동일 호출부 1곳
- **총 ~86 파일**

## API 계약 변경

**Before**:
```ts
shapes: (props, variant, size, state) => {
  fill: variant.background
}
// caller: spec.render.shapes(props, variantSpec, sizeSpec, state)
```

**After (self-lookup)**:
```ts
shapes: (props, size, state) => {
  const variant = TextFieldSpec.variants[props.variant ?? TextFieldSpec.defaultVariant];
  fill: variant.background
}
// caller: spec.render.shapes(props, sizeSpec, state)
```

- variant **개념은 유지** (Button/Badge/Link 등 RSP 규정 variant prop 그대로)
- variant **주입 주체만 이전** (caller → callee self-lookup)
- `spec.variants` 객체와 `spec.defaultVariant`는 유지 (self-lookup 대상)

## Phase 구조

### Phase 0 — 타입 + caller 동시 변경 (원자적)

동일 커밋에서 수행 (중간 상태 = 런타임 오류):

1. `spec.types.ts` — `shapes: (props, size, state) => Shape[]` 로 시그니처 변경
2. `PixiRenderer.ts` — `spec.render.shapes(props, sizeSpec, state)` (variantSpec 인자 제거)
3. `buildSpecNodeData.ts` — 동일
4. 83 spec 파일 전부 변경:
   - variant 실사용(78): 본문 상단에 `const variant = Spec.variants[props.variant ?? Spec.defaultVariant]` 도입. `_variant` 파라미터 위치에서 이동
   - `_variant` 무시(13): 파라미터 삭제
   - 기타: 시그니처 축약만

### Phase 1 — 검증

- `pnpm type-check` 통과 (3 tasks)
- `pnpm build:specs` 통과 + generated CSS 0 byte diff 전체 (D3 시각 무변경)
- Storybook 스모크 — 렌더 오류 없이 기동
- `parallel-verify` 샘플 5개 (Button/Badge/TextField/Card/Switch) 대칭 통과

### Phase 2 — 후속 정리

- 사용되지 않는 `VariantSpec` 파라미터 타입 export 제거 (import 체인 점검)
- ADR-062 재개 신호

## Gate

| Gate | 시점 | 통과 조건 | 실패 시 대안 |
| ---- | ---- | --------- | ------------ |
| G1 | Phase 0 커밋 직후 | type-check pass + build:specs 0 byte diff + Storybook 스모크 pass | 전체 revert, 원인 분석 후 재시도 |
| G2 | Phase 1 완료 | parallel-verify 5/5 대칭 통과 | 실패 Spec self-lookup 로직 재검토 |

## 롤백

단일 원자적 커밋이므로 커밋 revert로 완전 롤백.

## 금지 패턴

- `variant` 파라미터를 optional로 두는 절충안 (시그니처 이중 관리 부채)
- spec별로 변경 커밋 분할 (중간 상태 빌드 실패 — 타입 변경과 사용처는 동시)
- `spec.variants` 객체 제거 (본 ADR 범위 밖 — Field variant 제거는 ADR-062)
