---
title: WebGL 컴포넌트 Border-Box 모델 필수
impact: HIGH
impactDescription: 컴포넌트 크기 불일치로 iframe과 WebGL 간 시각적 차이 발생
tags: [pixi, webgl, css, layout, size]
---

WebGL 컴포넌트의 크기 계산 시 CSS border-box 모델과 동일하게 border를 포함해야 합니다.

## 배경

CSS의 `box-sizing: border-box`는 요소의 총 크기(width/height)에 border와 padding이 포함됩니다. WebGL 컴포넌트에서 크기를 수동 계산할 때 border를 누락하면 iframe과 크기가 달라집니다.

## Incorrect

```tsx
// ❌ border 없이 높이 계산 - Button보다 2px 작아짐
const minRequiredHeight = paddingTop + textHeight + paddingBottom;
```

## Correct

```tsx
// ✅ border-box 모델: border + padding + content
const borderWidth = 1; // 컴포넌트의 border 두께
const minRequiredWidth = borderWidth + paddingLeft + textWidth + paddingRight + borderWidth;
const minRequiredHeight = borderWidth + paddingTop + textHeight + paddingBottom + borderWidth;
```

## 체크리스트

새 WebGL 컴포넌트 구현 시:

1. **CSS 파일 확인**: 해당 컴포넌트의 border 스타일 확인
   ```css
   .react-aria-Button {
     border: 1px solid var(--border-color);
   }
   ```

2. **크기 계산에 border 포함**: 4방향 border를 모두 고려
   ```tsx
   // 4방향 border가 다를 수 있음
   const minRequiredWidth = borderWidthLeft + paddingLeft + contentWidth + paddingRight + borderWidthRight;
   const minRequiredHeight = borderWidthTop + paddingTop + contentHeight + paddingBottom + borderWidthBottom;
   ```

3. **유사 컴포넌트와 비교 검증**: 동일한 padding/size를 사용하는 컴포넌트와 높이 비교
   ```
   예: Button(26px) vs ToggleButton(26px) - 동일해야 함
   ```

## 참조 구현

- **PixiButton.tsx:284** - 올바른 border-box 계산 예시
  ```tsx
  const minRequiredHeight = borderWidthTop + paddingTop + textHeight + paddingBottom + borderWidthBottom;
  ```

## 관련 파일

- `src/builder/workspace/canvas/ui/PixiButton.tsx` - 참조 구현
- `src/builder/workspace/canvas/ui/PixiToggleButton.tsx` - 수정 예시
- `src/builder/workspace/canvas/utils/cssVariableReader.ts` - 크기 프리셋
- `src/builder/workspace/canvas/layout/engines/utils.ts` - enrichWithIntrinsicSize, applyCommonTaffyStyle
- `packages/layout-flow/src/adapters/xstudio-adapter.ts` - Dropflow boxSizing: 'border-box'

## 레이아웃 엔진 box-sizing 아키텍처 (2026-02-26)

레이아웃 엔진 수준에서 웹 CSS `* { box-sizing: border-box }` 동작과 일치하도록 구현됨:

### enrichWithIntrinsicSize → 항상 border-box

`enrichWithIntrinsicSize()`는 리프 컴포넌트(Button, Badge, Text 등)에 **항상 border-box 값**(content + padding + border)을 주입합니다.

```typescript
// ✅ 항상 border-box (조건 분기 없음)
let injectWidth = baseContentWidth;
injectWidth += box.padding.left + box.padding.right;
injectWidth += box.border.left + box.border.right;
injectedStyle.width = injectWidth;
```

### 엔진별 box-sizing 처리

| 엔진 | box-sizing | 변환 위치 |
|------|-----------|----------|
| Dropflow | border-box (네이티브) | `xstudio-adapter.ts`: `boxSizing: 'border-box'` 고정 |
| Taffy | content-box → border-box 변환 | `applyCommonTaffyStyle()`: width/height에서 padding+border 차감 |

### 주의사항

- `enrichWithIntrinsicSize`에서 `boxSizing: 'content-box'` 를 주입하지 마세요 — Dropflow가 무시합니다
- Taffy `applyCommonTaffyStyle()`의 border-box → content-box 변환은 numeric width/height에만 적용됩니다 (percentage, auto, fit-content 등은 변환하지 않음)
- `parseBoxModel()`의 `treatAsBorderBox` 로직은 별개입니다 (content size 계산용)
