---
name: cross-check
description: CSS↔WebGL↔Canvas 렌더링 경로 정합성 검증. 변경된 컴포넌트의 모든 렌더링 경로를 교차 검증합니다.
TRIGGER when: user mentions "정합성 체크", "정합성 검증", "렌더링 체크", "cross check", "CSS WebGL 비교", "렌더링 경로 확인", "Preview Canvas 비교", "CSS↔WebGL", or asks to verify rendering parity across paths.
user_invocable: true
---

## Superpowers Integration (중요)

이 스킬은 Superpowers 프레임워크와 함께 사용되도록 설계되었습니다.

- Systematic Debugging 스킬 실행 중 rendering parity 관련 이슈 발견 시 **즉시** 이 스킬 호출
- TDD (RED-GREEN-REFACTOR) 사이클의 REFACTOR 단계 종료 후 **반드시** cross-check 실행
- Structured Planning 완료 후 rendering 관련 작업인 경우 cross-check를 verification step으로 포함
- CRITICAL 이슈 발견 시 즉시 수정 후 `pnpm build:specs && pnpm type-check` 실행

# Cross-Check: 렌더링 경로 정합성 검증

변경된 컴포넌트의 CSS(Preview), WebGL(Skia Canvas), PixiJS(이벤트) 렌더링 경로가 일관되게 동작하는지 검증합니다.

## Phase 1: 변경 대상 식별

`git diff --name-only`로 변경된 파일에서 영향받는 컴포넌트를 식별합니다.

변경 파일 → 컴포넌트 매핑:

- `*.spec.ts` → 해당 컴포넌트
- `*.css` → 해당 컴포넌트
- `ElementSprite.tsx` → TAG_SPEC_MAP에 등록된 모든 변경 컴포넌트
- `fullTreeLayout.ts` / `utils.ts` → 영향받는 모든 컴포넌트
- `implicitStyles.ts` → 해당 컨테이너 컴포넌트
- `*Renderers.tsx` → 해당 Preview 렌더러 컴포넌트

## Phase 2: 컴포넌트별 5-레이어 교차 검증

각 컴포넌트에 대해 아래 테이블을 작성합니다:

| 레이어               | 파일                                                  | 검증 항목                                           | 상태 |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------- | ---- |
| **Spec**             | `packages/specs/src/components/{Name}.spec.ts`        | variants, sizes, render.shapes(), properties        |
| **Factory**          | `apps/builder/src/builder/factories/definitions/*.ts` | 기본 props, style, 자식 구조                        |
| **CSS Renderer**     | `packages/shared/src/components/styles/{Name}.css`    | data-variant/data-size 선택자, 토큰                 |
| **WebGL Renderer**   | `ElementSprite.tsx` + `specTextStyle.ts` + `utils.ts` | TAG_SPEC_MAP, TEXT_BEARING_SPECS, INLINE_BLOCK_TAGS |
| **Preview Renderer** | `packages/shared/src/renderers/*.tsx`                 | variant/size props 전달, data-\* 속성               |

## Phase 3: 정합성 검증 항목

각 컴포넌트에 대해 아래를 확인합니다:

### 3.1 Variant 정합성

- [ ] Spec `defaultVariant`와 React 컴포넌트 기본값 일치
- [ ] Spec `variants` 키와 CSS `[data-variant="..."]` 선택자 일치
- [ ] Preview 렌더러가 `variant` prop을 컴포넌트에 전달

### 3.2 Size 정합성

- [ ] Spec `defaultSize`와 React 컴포넌트 기본값 일치
- [ ] Size casing 일관성 (sm/md/lg, S/M/L 혼용 금지)
- [ ] Spec sizes의 fontSize/paddingX/paddingY/lineHeight/borderWidth가 CSS와 일치
- [ ] Preview 렌더러가 `size` prop을 컴포넌트에 전달

### 3.3 WebGL 레이아웃 정합성

- [ ] `INLINE_BLOCK_TAGS` 또는 `BUTTON_LIKE_TAGS` 등록 여부 (fit-content 필요 시)
- [ ] `TEXT_BEARING_SPECS` 등록 여부 (텍스트 폭 측정 필요 시)
- [ ] `DEFAULT_SIZE_BY_TAG` 등록 여부
- [ ] `calculateContentWidth`의 `isFormElement` 경로 포함 여부
- [ ] `calculateContentHeight`의 `isButtonLike` 경로 포함 여부

### 3.4 토큰 정합성

- [ ] Spec TokenRef와 CSS 변수 매핑 일치 (css-tokens.md 참조)
- [ ] 금지된 M3 토큰 사용 없음
- [ ] `--bg-inset` / `{color.layer-2}` 필드 배경 통일 (해당 시)

### 3.5 상태 정합성

- [ ] disabled 상태: opacity 0.38, pointerEvents: none (Spec ↔ CSS)
- [ ] focusVisible: outline 2px solid var(--focus-ring) (CSS) / var(--accent) (Spec)

## Phase 4: 결과 보고

검증 결과를 테이블로 보고합니다:

| 컴포넌트 | 레이어 | 이슈                      | 심각도   | 수정 여부 |
| -------- | ------ | ------------------------- | -------- | --------- |
| Menu     | WebGL  | TEXT_BEARING_SPECS 미등록 | CRITICAL | 수정 완료 |

발견된 이슈는 즉시 수정합니다. 수정 후 `pnpm build:specs && pnpm type-check`로 검증합니다.
