---
title: Use tv() from tailwind-variants
impact: CRITICAL
impactDescription: 타입 안전한 스타일 관리, 일관된 variant 시스템
tags: [style, tailwind-variants, tv]
---

클래스명 생성 시 tv() (tailwind-variants)를 사용하여 semantic class names만 생성합니다.

## Incorrect

```tsx
// ❌ 문자열 직접 합치기
const className = `button ${isPrimary ? 'primary' : ''} ${isLarge ? 'large' : ''}`;

// ❌ clsx만 사용
import clsx from 'clsx';
const className = clsx('button', isPrimary && 'primary', isLarge && 'large');

// ❌ Tailwind 클래스 직접 합치기
const className = clsx(
  'px-4 py-2 rounded',
  isPrimary ? 'bg-blue-500' : 'bg-gray-500'
);
```

## Correct

```tsx
// ✅ tv() 사용
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'react-aria-Button',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      outline: 'outline'
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg'
    }
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md'
  }
});

// 사용
<Button className={button({ variant: 'primary', size: 'lg' })}>
  Click
</Button>
// 결과: "react-aria-Button primary lg"
```
