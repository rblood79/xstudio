# ADR-042 Phase 2: Breadcrumbs + Tabs containerWidth 주입

> **작성일**: 2026-03-29
> **관련 ADR**: ADR-042 (Spec Container Dimension Injection)
> **Phase 1 참조**: Tag.spec.ts 패턴 (완료)

---

## 목표

Breadcrumbs와 Tabs의 Spec shapes에서 텍스트 폭 추정(`fontSize * 0.55`)을 제거하고, ElementSprite가 주입하는 `_containerWidth`를 사용하여 정확한 배치로 전환한다.

## 변경 파일

| 파일                                                                       | 변경                                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx:2069` | Tag 전용 조건 → Tag/Breadcrumbs/Tabs 공통 주입                                   |
| `packages/specs/src/components/Breadcrumbs.spec.ts`                        | Props에 `_containerWidth` 추가, shapes에서 추정 대신 containerWidth 기반 배치    |
| `packages/specs/src/components/Tabs.spec.ts`                               | Props에 `_containerWidth` 추가, shapes에서 추정 대신 containerWidth 기반 탭 너비 |

## 상세 설계

### 1. ElementSprite.tsx — 주입 대상 확장

현재 Tag 전용:

```typescript
if (tag === "Tag") {
  specProps = {
    ...specProps,
    _containerWidth: finalWidth,
    _containerHeight: specHeight,
  };
}
```

변경: Breadcrumbs/Tabs 추가:

```typescript
if (tag === "Tag" || tag === "Breadcrumbs" || tag === "Tabs") {
  specProps = {
    ...specProps,
    _containerWidth: finalWidth,
    _containerHeight: specHeight,
  };
}
```

### 2. Breadcrumbs.spec.ts — crumb 배치 전환

**현재**: `charWidthFactor = fontSize * 0.55`, `sepEstimate = fontSize * 0.35`로 x 좌표 누적

**변경**:

- Props에 `_containerWidth?: number` 추가
- `_containerWidth > 0`이면: containerWidth 기반으로 각 crumb의 maxWidth를 계산하여 텍스트 잘림 방지
- `_containerWidth === 0` 또는 미주입이면: 기존 0.55 추정 fallback 유지

### 3. Tabs.spec.ts — 탭 너비 전환

**현재**: `charWidth = fontSize * 0.55`, `tabWidth = Math.max(48, label.length * charWidth + paddingX * 2)`

**변경**:

- Props에 `_containerWidth?: number` 추가
- `_containerWidth > 0`이면: `containerWidth / tabCount`로 균등 분배 (최소 48px 유지)
- `_containerWidth === 0` 또는 미주입이면: 기존 0.55 추정 fallback 유지

### Fallback 원칙

`_containerWidth`가 0이거나 undefined인 경우 기존 추정 로직을 유지한다. 이는:

- 초기 렌더링 시 아직 Taffy 레이아웃이 계산되지 않은 경우
- Skia 외 경로(Preview CSS)에서 Spec shapes를 호출하는 경우

### Phase 3 범위 제외

세로 중앙 배치(`height/2`, `size.height/2` → `_containerHeight/2`)는 이번 Phase에서 변경하지 않는다.
