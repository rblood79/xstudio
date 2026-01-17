---
title: No Inline Tailwind
impact: CRITICAL
impactDescription: 코드 일관성, 유지보수성, 번들 최적화
tags: [style, tailwind, css]
---

.tsx 파일에서 inline Tailwind 클래스 사용을 금지합니다.
semantic classes + CSS @apply를 사용하세요.

## Incorrect

```tsx
// ❌ inline Tailwind 클래스 직접 사용
<Button className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600 text-white font-medium">
  Submit
</Button>

<div className="flex flex-col gap-4 p-6 bg-gray-100 rounded-xl shadow-md">
  <span className="text-lg font-bold text-gray-800">Title</span>
</div>
```

## Correct

```tsx
// ✅ tv() + semantic class names
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'react-aria-Button',
  variants: {
    variant: { primary: 'primary', outline: 'outline' },
    size: { sm: 'sm', md: 'md', lg: 'lg' }
  }
});

<Button className={button({ variant: 'primary', size: 'md' })}>
  Submit
</Button>
```

```css
/* components.css */
.react-aria-Button {
  @apply font-medium rounded-lg transition-colors;
}

.react-aria-Button.primary {
  @apply bg-blue-500 px-4 py-2 text-white hover:bg-blue-600;
}
```
