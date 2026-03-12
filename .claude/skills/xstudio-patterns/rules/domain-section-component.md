---
title: Section 컴포넌트 사용 필수
impact: HIGH
impactDescription: 수동 section 마크업 사용 시 collapse/persist/lazy/memo 최적화 누락, 패널 간 구조 불일치
tags: [domain, component, panel, section]
---

모든 패널의 섹션 구조는 `Section` 컴포넌트를 사용해야 한다. 수동 `.section` > `.section-header` + `.section-content` 마크업 금지.

**위치**: `builder/components/panel/Section.tsx`
**import**: `import { Section } from "../../components"` 또는 `from "../../../components"`

### 주요 Props

| Prop          | 타입                           | 기본값 | 용도                          |
| ------------- | ------------------------------ | ------ | ----------------------------- |
| `title`       | `string`                       | 필수   | 섹션 제목                     |
| `children`    | `ReactNode \| () => ReactNode` | 필수   | 내용 (함수 시 lazy)           |
| `id`          | `string`                       | -      | collapse 상태 persist 키      |
| `collapsible` | `boolean`                      | `true` | collapse 토글 표시            |
| `onReset`     | `() => void`                   | -      | Reset 버튼 (undefined면 숨김) |
| `actions`     | `ReactNode`                    | -      | 헤더 우측 커스텀 액션         |
| `badge`       | `ReactNode`                    | -      | 제목 옆 badge                 |

### 하위호환

`PropertySection`은 `Section`의 re-export alias. 기존 코드 동작 유지.

## Incorrect

```tsx
// ❌ 수동 마크업
<div className="section">
  <div className="section-header">
    <div className="section-title">Title</div>
    <div className="section-actions">
      <button className="iconButton" onClick={toggle}>
        <ChevronUp />
      </button>
    </div>
  </div>
  {expanded && (
    <div className="section-content">
      {children}
    </div>
  )}
</div>

// ❌ SectionHeader + 수동 wrapper
<div className="section">
  <SectionHeader title="List" actions={<span>3개</span>} />
  <div className="section-content">{children}</div>
</div>
```

## Correct

```tsx
// ✅ 스타일 패널 - collapse + reset
<Section id="appearance" title="Appearance" onReset={hasDirty ? handleReset : undefined}>
  <AppearanceSectionContent />
</Section>

// ✅ DataTable 패널 - badge + 비접기
<Section id="datatable-list" title="Table List"
  badge={<span className="datatable-list-count">{count}개</span>}
  collapsible={false}
>
  {children}
</Section>

// ✅ 커스텀 액션 슬롯
<Section id="schema-preview" title="Schema"
  actions={<input type="number" value={count} onChange={...} />}
  collapsible={false}
>
  {children}
</Section>
```
