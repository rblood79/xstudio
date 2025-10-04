---
applyTo: "**/*.{tsx,css}"
---

# 🎨 XStudio 스타일 가이드 (Non-Inline TailwindCSS)

## ✅ 원칙
- 컴포넌트 코드(.tsx)에는 Tailwind 유틸리티를 직접 작성하지 않는다.
- 모든 스타일은 의미 클래스(`.react-aria-Button.primary`, `.sm` 등)로 구성.
- Tailwind는 `components.css`에서만 `@apply`로 사용.
- 커스터마이징은 Property Editor → props.className으로만 허용.

## 🧩 구조
tv()는 다음처럼 단순 클래스 매핑만 포함:
```tsx
const button = tv({
  base: 'react-aria-Button',
  variants: { variant: { primary: 'primary', ... }, size: { sm: 'sm', ... } }
});