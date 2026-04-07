---
title: Use React-Stately Hooks
impact: HIGH
impactDescription: 일관된 상태 관리, 접근성 호환
tags: [react-aria, react-stately, state]
---

React-Stately 훅을 우선 사용합니다. useState로 직접 상태 관리를 금지합니다.

## Incorrect

```tsx
// ❌ useState로 토글 상태 직접 관리
function ToggleButton() {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <button onClick={() => setIsSelected(!isSelected)}>
      {isSelected ? 'On' : 'Off'}
    </button>
  );
}

// ❌ 리스트 선택 상태 직접 관리
function SelectableList({ items }) {
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const toggleItem = (key) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedKeys(newSet);
  };

  return items.map(item => (
    <div key={item.id} onClick={() => toggleItem(item.id)}>
      {item.label}
    </div>
  ));
}
```

## Correct

```tsx
// ✅ useToggleState 사용
import { useToggleState } from 'react-stately';
import { useToggleButton } from 'react-aria';

function ToggleButton() {
  const state = useToggleState();
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useToggleButton({}, state, ref);

  return (
    <button {...buttonProps} ref={ref}>
      {state.isSelected ? 'On' : 'Off'}
    </button>
  );
}

// ✅ useListState 사용
import { useListState } from 'react-stately';
import { useListBox, useOption } from 'react-aria';

function SelectableList({ items }) {
  const state = useListState({
    items,
    selectionMode: 'multiple'
  });

  const ref = useRef<HTMLUListElement>(null);
  const { listBoxProps } = useListBox({}, state, ref);

  return (
    <ul {...listBoxProps} ref={ref}>
      {[...state.collection].map(item => (
        <Option key={item.key} item={item} state={state} />
      ))}
    </ul>
  );
}

// ✅ React-Aria Components 사용 (권장)
import { ToggleButton, ListBox, ListBoxItem } from 'react-aria-components';

<ToggleButton>Toggle</ToggleButton>
<ListBox selectionMode="multiple">
  {items.map(item => <ListBoxItem key={item.id}>{item.label}</ListBoxItem>)}
</ListBox>
```
