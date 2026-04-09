---
title: No Manual ARIA Attributes
impact: HIGH
impactDescription: 일관된 접근성, 올바른 ARIA 패턴 보장
tags: [react-aria, accessibility, aria]
---

ARIA 속성(aria-label 등)을 수동으로 직접 추가하지 않습니다.
React-Aria 컴포넌트가 자동으로 처리합니다.

## Incorrect

```tsx
// ❌ ARIA 속성 수동 추가
<div
  role="button"
  aria-pressed={isPressed}
  aria-label="Toggle button"
  tabIndex={0}
>
  Toggle
</div>

// ❌ aria-* 속성 직접 관리
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? 'error-message' : undefined}
  aria-required={isRequired}
/>

// ❌ 접근성 속성 수동 설정
<div
  role="listbox"
  aria-multiselectable={true}
  aria-activedescendant={activeId}
>
  {items.map(item => (
    <div role="option" aria-selected={item.selected} key={item.id}>
      {item.label}
    </div>
  ))}
</div>
```

## Correct

```tsx
// ✅ React-Aria 컴포넌트 사용 (자동 ARIA 처리)
import { ToggleButton } from 'react-aria-components';

<ToggleButton>Toggle</ToggleButton>
// 자동으로 role, aria-pressed 등 설정

// ✅ TextField 사용 (에러 상태 자동 처리)
import { TextField, Input, Label, FieldError } from 'react-aria-components';

<TextField isInvalid={hasError} isRequired={isRequired}>
  <Label>Email</Label>
  <Input />
  <FieldError>Invalid email</FieldError>
</TextField>
// 자동으로 aria-invalid, aria-describedby, aria-required 설정

// ✅ ListBox 사용 (선택 상태 자동 처리)
import { ListBox, ListBoxItem } from 'react-aria-components';

<ListBox selectionMode="multiple">
  {items.map(item => (
    <ListBoxItem key={item.id}>{item.label}</ListBoxItem>
  ))}
</ListBox>
// 자동으로 role, aria-multiselectable, aria-selected 등 설정
```
