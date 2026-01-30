---
title: "Spec ↔ Builder ↔ CSS 값 동기화"
impact: CRITICAL
impactDescription: 세 소스 간 값 불일치 시 WebGL/CSS 렌더링 차이 발생
tags: [spec, layout, sync]
---

컴포넌트 수치(padding, fontSize, borderWidth 등)는 **3곳에서 동일하게** 유지해야 합니다:
1. `@xstudio/specs` — ComponentSpec (예: `ButtonSpec.sizes.md.paddingX`)
2. Builder 내부 상수 (예: `BUTTON_SIZE_CONFIG`)
3. CSS 토큰 (예: `Button.css`의 `--spacing-*`)

## Incorrect

```typescript
// ❌ Spec과 Builder 상수 값 불일치
// packages/specs/src/components/Button.spec.ts
md: { paddingX: 24 }

// apps/builder/.../engines/utils.ts
md: { paddingLeft: 16, paddingRight: 16 }  // 불일치!
```

## Correct

```typescript
// ✅ 세 소스 동일한 값
// packages/specs/src/components/Button.spec.ts
md: { paddingX: 24 }

// apps/builder/.../engines/utils.ts
md: { paddingLeft: 24, paddingRight: 24, borderWidth: 1 }  // 일치

// CSS: --spacing-xl = 24px, border: 1px solid  // 일치
```

## 동기화 대상 값

| Spec 값 | Builder 내부 상수 | CSS 토큰 |
|---------|-------------------|----------|
| `ButtonSpec.sizes[size].paddingX` | `BUTTON_SIZE_CONFIG[size].paddingLeft/Right` | `Button.css [data-size] padding` |
| `ButtonSpec.sizes[size].fontSize` | `BUTTON_SIZE_CONFIG[size].fontSize` | `Button.css [data-size] font-size` |
| `fontFamily.sans` (typography.ts) | `measureTextWidth()` 기본 폰트 | `body { font-family }` |
| CSS base `border: 1px solid` | `BUTTON_SIZE_CONFIG[size].borderWidth` (=1) | `Button.css base: border` |
| `ButtonSpec.variants[v].border` | `PixiButton specDefaultBorderWidth` (=1) | `Button.css border-color` |

## parseBoxModel 기본값

`parseBoxModel()`은 폼 요소(`button`, `input`, `select`)에 inline style이 없을 때
`BUTTON_SIZE_CONFIG` 기본값을 적용합니다. inline style이 있으면 해당 값을 우선 사용합니다.

- `calculateContentWidth()` → 순수 텍스트 너비만 반환 (padding/border 미포함)
- `parseBoxModel()` → padding/border 기본값 제공 (BUTTON_SIZE_CONFIG 또는 inline)
- `BlockEngine` → `contentWidth + padding + border` = 정확한 한 번 계산

## 체크리스트

값 수정 시 반드시 확인:
- [ ] `packages/specs/src/components/[Component].spec.ts`
- [ ] `apps/builder/.../engines/utils.ts` (`BUTTON_SIZE_CONFIG` 등 내부 상수)
- [ ] `apps/builder/.../canvas/ui/Pixi[Component].tsx` (self-rendering 기본값)
- [ ] CSS 파일의 토큰/변수
- [ ] `pnpm --filter @xstudio/specs build` 실행

## 참조

- [spec-build-sync](spec-build-sync.md) — 빌드 동기화 필수
- `docs/COMPONENT_SPEC_ARCHITECTURE.md` §4.7.4.0, §4.7.4.5~4.7.4.6
