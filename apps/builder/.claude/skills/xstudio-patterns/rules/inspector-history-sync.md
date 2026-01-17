---
title: Sync Inspector Changes with History
impact: HIGH
impactDescription: Undo/Redo 지원, 상태 일관성, 사용자 경험
tags: [inspector, history, state]
---

Inspector에서 속성 변경 시 히스토리 시스템과 동기화합니다.

## Incorrect

```tsx
// ❌ 직접 상태 변경 (히스토리 미기록)
function PropertyInput({ elementId, propName, value }) {
  const updateElement = useStore(s => s.updateElement);

  const handleChange = (newValue) => {
    updateElement(elementId, { [propName]: newValue });
  };

  return <input value={value} onChange={e => handleChange(e.target.value)} />;
}
```

## Correct

```tsx
// ✅ 히스토리 통합 액션 사용
function PropertyInput({ elementId, propName, value }: PropertyInputProps) {
  const { executeCommand } = useHistory();

  const handleChange = (newValue: string) => {
    executeCommand(
      new UpdatePropertyCommand(elementId, propName, value, newValue)
    );
  };

  return <input value={value} onChange={e => handleChange(e.target.value)} />;
}

// commands/UpdatePropertyCommand.ts
export class UpdatePropertyCommand implements Command {
  constructor(
    private elementId: string,
    private propName: string,
    private oldValue: unknown,
    private newValue: unknown
  ) {}

  execute() {
    updateElement(this.elementId, { [this.propName]: this.newValue });
  }

  undo() {
    updateElement(this.elementId, { [this.propName]: this.oldValue });
  }

  getDescription() {
    return `Update ${this.propName}`;
  }
}
```
