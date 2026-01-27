---
title: Token Reference Format
impact: HIGH
impactDescription: 테마 일관성, 디자인 시스템 통합
tags: [spec, token, design-system]
---

ComponentSpec에서 색상, 간격 등의 값은 **토큰 참조 형식** `{category.name}`을 사용합니다.

## Incorrect

```tsx
// ❌ 하드코딩된 값
const ButtonSpec = {
  variants: {
    primary: {
      background: '#3b82f6',      // 하드코딩
      text: 'white',              // 하드코딩
    },
  },
  sizes: {
    md: {
      paddingX: 16,               // 매직 넘버
      fontSize: 14,
    },
  },
};

// ❌ CSS 변수 직접 사용
const background = 'var(--primary)';
```

## Correct

```tsx
// ✅ 토큰 참조 형식 사용
const ButtonSpec: ComponentSpec<ButtonProps> = {
  variants: {
    primary: {
      background: '{color.primary}',
      backgroundHover: '{color.primary-hover}',
      text: '{color.on-primary}',
      border: '{color.primary}',
    },
  },
  sizes: {
    md: {
      paddingX: '{spacing.4}',    // 16px
      paddingY: '{spacing.2}',    // 8px
      fontSize: '{typography.body}',
      radius: '{radius.md}',
    },
  },
  states: {
    focusVisible: {
      boxShadow: '{shadow.focus}',
    },
  },
};
```

## 토큰 카테고리

| 카테고리 | 형식 | 예시 |
|---------|------|------|
| 색상 | `{color.*}` | `{color.primary}`, `{color.on-surface}` |
| 간격 | `{spacing.*}` | `{spacing.2}`, `{spacing.4}` |
| 타이포그래피 | `{typography.*}` | `{typography.body}`, `{typography.heading}` |
| 반경 | `{radius.*}` | `{radius.sm}`, `{radius.md}` |
| 그림자 | `{shadow.*}` | `{shadow.sm}`, `{shadow.focus}` |

## 토큰 해석

```tsx
// 토큰 리졸버가 테마에 따라 실제 값으로 변환
resolveToken('{color.primary}', 'light');  // → '#3b82f6'
resolveToken('{color.primary}', 'dark');   // → '#60a5fa'

// CSS 변수로 변환
tokenToCSSVar('{color.primary}');   // → 'var(--primary)'
tokenToCSSVar('{spacing.4}');       // → 'var(--spacing-4)'
tokenToCSSVar('{shadow.md}');       // → 'var(--shadow-md)'
```

## 타입 안전성

```tsx
// TokenRef 타입이 유효한 토큰만 허용
type ColorTokenRef = `{color.${keyof ColorTokens}}`;
type ShadowTokenRef = `{shadow.${keyof ShadowTokens}}`;

// 컴파일 타임 검증
const valid: ColorTokenRef = '{color.primary}';     // ✅
const invalid: ColorTokenRef = '{color.invalid}';  // ❌ 타입 에러
```

## 참조

- `docs/COMPONENT_SPEC_ARCHITECTURE.md` - 토큰 시스템 설계
- `packages/specs/src/primitives/colors.ts` - 색상 토큰 정의
- `packages/specs/src/primitives/shadows.ts` - 그림자 토큰 정의
- `packages/specs/src/renderers/utils/tokenResolver.ts` - 토큰 해석
