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
| `ButtonSpec.sizes[size].borderRadius` | `UI_COMPONENT_DEFAULT_BORDER_RADIUS[size]` (ElementSprite.tsx) | `Button.css [data-size] border-radius` |
| `spec.sizes[size].height` | `INLINE_FORM_HEIGHTS[tag][size]` (engines/utils.ts) | N/A (Skia 전용) |
| `spec indicator size` | `INLINE_FORM_INDICATOR_WIDTHS[tag][size]` (engines/utils.ts) | N/A |
| `spec indicator size` | `INDICATOR_SIZES[tag][size]` (styleToLayout.ts) | N/A |

## parseBoxModel 기본값

`parseBoxModel()`은 폼 요소(`button`, `input`, `select`)에 inline style이 없을 때
`BUTTON_SIZE_CONFIG` 기본값을 적용합니다. inline style이 있으면 해당 값을 우선 사용합니다.

- `calculateContentWidth()` → 순수 텍스트 너비만 반환 (padding/border 미포함)
- `parseBoxModel()` → padding/border 기본값 제공 (BUTTON_SIZE_CONFIG 또는 inline)
- `BlockEngine` → `contentWidth + padding + border` = 정확한 한 번 계산

## Skia Spec Shapes 렌더링 주의사항

`ElementSprite.tsx`의 Spec shapes 렌더링 경로에서 시각 전용 속성(`borderRadius`, `borderColor` 등)을 읽을 때는
반드시 `convertStyle()`의 반환값을 사용해야 합니다. `style.borderRadius`는 UI 패널에서 CSS 문자열
(`"12px"`)로 저장되므로, `typeof === 'number'` 직접 체크 시 항상 `0`이 됩니다.

```typescript
// ❌ 금지: raw style 직접 typeof 체크
const br = typeof style.borderRadius === 'number' ? style.borderRadius : 0;

// ✅ 필수: convertStyle() 반환값 사용
const { borderRadius: convertedBorderRadius } = convertStyle(style);
const br = typeof convertedBorderRadius === 'number'
  ? convertedBorderRadius : convertedBorderRadius?.[0] ?? 0;
```

> Yoga가 변환하는 레이아웃 속성(width, height, padding)과 달리, `borderRadius`는 시각 전용이므로 Yoga를 거치지 않고 CSS 문자열 형태로 남아 있다.

### Size별 기본 borderRadius

`ElementSprite.tsx`의 `UI_COMPONENT_DEFAULT_BORDER_RADIUS` 상수는 Spec radius 토큰 값을 미러링한다.
`style.borderRadius`가 설정되지 않은 UI 컴포넌트는 `element.props.size`에 따라 기본값을 적용한다:

| size | Spec 토큰 | radius 값 |
|------|-----------|-----------|
| xs, sm | `{radius.sm}` | 4px |
| md | `{radius.md}` | 6px |
| lg, xl | `{radius.lg}` | 8px |

```typescript
// ✅ Spec 토큰 기반 size별 기본 borderRadius
const UI_COMPONENT_DEFAULT_BORDER_RADIUS: Record<string, number> = {
  xs: 4, sm: 4, md: 6, lg: 8, xl: 8,
};
const size = String(props?.size || 'md');
const defaultBorderRadius = UI_COMPONENT_DEFAULT_BORDER_RADIUS[size] ?? 6;

// ❌ 금지: 하드코딩된 기본값
const effectiveBorderRadius = isUIComponent ? 6 : 0;
```

## 체크리스트

값 수정 시 반드시 확인:
- [ ] `packages/specs/src/components/[Component].spec.ts`
- [ ] `apps/builder/.../engines/utils.ts` (`BUTTON_SIZE_CONFIG` 등 내부 상수)
- [ ] `apps/builder/.../canvas/ui/Pixi[Component].tsx` (이벤트 레이어 전용, alpha=0)
- [ ] `apps/builder/.../sprites/ElementSprite.tsx` (Skia 폴백 — `convertStyle()` 사용 필수)
- [ ] CSS 파일의 토큰/변수
- [ ] `pnpm --filter @xstudio/specs build` 실행
- [ ] `apps/builder/.../skia/specShapeConverter.ts` (색상/크기 변환)
- [ ] `apps/builder/.../layout/engines/utils.ts` (`INLINE_FORM_HEIGHTS`, `INLINE_FORM_INDICATOR_WIDTHS`)
- [ ] `apps/builder/.../layout/styleToLayout.ts` (`INDICATOR_SIZES`, `INLINE_FORM_HEIGHTS`)

## 참조

- [spec-build-sync](spec-build-sync.md) — 빌드 동기화 필수
- `docs/COMPONENT_SPEC_ARCHITECTURE.md` §4.7.4.0, §4.7.4.5~4.7.4.6
