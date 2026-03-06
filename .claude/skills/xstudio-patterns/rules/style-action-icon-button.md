---
title: ActionIconButton 사용 필수
impact: CRITICAL
impactDescription: Builder 아이콘 버튼에 공유 Button을 사용하면 .button-base 스타일 충돌 + tooltip/shortcut 누락
tags: [style, builder, ui]
---

Builder UI의 아이콘 전용 버튼은 공유 `Button variant="ghost"` 대신 전용 `ActionIconButton` 컴포넌트를 사용합니다.

## 이유

- 공유 `Button`은 `.button-base` utility 클래스를 사용하여 Preview 컴포넌트와 스타일을 공유함
- Builder 전용 아이콘 버튼에 `.button-base`가 적용되면 hover/pressed 색상이 Preview 테마에 의존하는 충돌 발생
- `ActionIconButton`은 tooltip + keyboard shortcut 표시가 내장되어 있어 일관된 UX 제공

## Incorrect

```tsx
// ❌ Builder 패널에서 공유 Button을 아이콘 용도로 사용
import { Button } from "@/shared/components/Button";

<Button variant="ghost" onPress={handleDelete}>
  <Icon name="trash" />
</Button>;
```

## Correct

```tsx
// ✅ ActionIconButton 사용 — tooltip/shortcut 내장
import { ActionIconButton } from "@/builder/components/ui/ActionIconButton";

<ActionIconButton
  icon="trash"
  tooltip="Delete"
  shortcut="⌫"
  onPress={handleDelete}
/>;
```

## 참조 파일

- `apps/builder/src/builder/components/ui/ActionIconButton.tsx` — 컴포넌트 구현
