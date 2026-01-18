---
title: Reuse Existing CSS Classes
impact: HIGH
impactDescription: 코드 중복 제거, 번들 크기 감소
tags: [style, css, reuse]
---

새 CSS 파일 생성을 지양하고 기존 CSS 클래스를 재사용합니다.
`apps/builder/src/builder/components/styles/index.css` 확인 후 기존 클래스 활용.

## Incorrect

```css
/* ❌ 새 파일에 중복 스타일 생성 */
/* MyComponent.css */
.my-combobox-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.my-label {
  font-size: 12px;
  font-weight: 500;
}
```

## Correct

```tsx
// ✅ 기존 클래스 재사용
// 먼저 styles/index.css 확인
import './styles/index.css';

<div className="combobox-container">
  <label className="control-label">Label</label>
  <ComboBox className="react-aria-ComboBox" />
</div>
```

```css
/* styles/index.css - 기존 클래스 활용 */
.combobox-container { /* 이미 정의됨 */ }
.control-label { /* 이미 정의됨 */ }

/* 필요한 경우에만 variant 추가 */
.react-aria-UnitComboBox {
  /* UnitComboBox 전용 스타일 */
}
```
