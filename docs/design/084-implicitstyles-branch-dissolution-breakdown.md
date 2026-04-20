# ADR-084 Breakdown — implicitStyles 하드코딩 분기 해체 (5 spec 완전 SSOT 복귀)

> 본 문서는 ADR-084 (`docs/adr/084-implicitstyles-branch-dissolution.md`) 의 Decision 섹션에서 분리된 구현 상세. ADR-083 에서 R8 후속 ADR 로 이월된 5 spec (Calendar / ProgressBar / Meter / SelectTrigger / Breadcrumbs) 의 하드코딩 분기 해체 방법.

## 배경 요약

ADR-083 Phase 0 이 `applyImplicitStyles` 진입부에서 `LOWERCASE_TAG_SPEC_MAP` 기반 `resolveContainerStylesFallback()` 을 호출하여 parentStyle 에 spec containerStyles 를 공통 선주입. 하지만 아래 5 분기가 **직접 할당** 패턴(`display: "flex"` 등) 으로 parentStyle 의 spec 값 override — Phase 0 효력 무효화.

| spec                     | 분기 위치                   | override 패턴                                                                      | archetype vs 실제 구조                       |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| Calendar / RangeCalendar | `implicitStyles.ts:1850`    | `display: ps.display ?? "flex"; flexDirection: "column"`                           | archetype=`grid` / 실제=flex column          |
| ProgressBar / Meter      | `implicitStyles.ts:1657`    | `display: ps.display ?? "flex"; flexDirection: "row"; flexWrap; rowGap; columnGap` | archetype=`grid` / 실제=flex row wrap        |
| SelectTrigger            | `implicitStyles.ts:1256`    | `display: "flex"; flexDirection: "row"; alignItems: "center"`                      | archetype=`button` (inline-flex) / 실제=flex |
| Breadcrumbs              | `implicitStyles.ts:914-976` | `display: "flex"; alignItems: "center"; flexWrap: nowrap`                          | archetype=`simple` (inline-flex) / 실제=flex |

## 전략: 대안 B (spec containerStyles 를 실제 구조에 맞춰 선언)

ADR-083 의 "spec SSOT" 원칙 유지 + archetype table 무변경. 각 spec.containerStyles 에 **실제 구조** 를 선언하고 분기의 style 주입 중복 부분만 제거.

### 원칙

1. **Spec containerStyles 가 archetype table 을 override** — 이미 Phase 6 Menu 에서 선례 (archetype=collection 의 display:flex 를 Menu.containerStyles 에서 동일값 명시)
2. **비즈니스 로직은 분기에 유지** — size-based padding, children 처리, selectedKey 등은 spec 모델 범위 외 (scope=layout primitive only)
3. **단순 style 중복만 제거** — `display`, `flexDirection`, `alignItems`, `justifyContent`, `flexWrap` 중 archetype 과 spec 에 선언된 것
4. **`?? parentStyle.X` 패턴 활용** — 분기에서 유지할 field 는 `parentStyle.X ?? "fallback"` 패턴으로 재작성 (spec 값 우선, 없으면 fallback)

## 각 분기별 해체 계획

### Phase A1 — Calendar / RangeCalendar

**spec 변경** (`packages/specs/src/components/Calendar.spec.ts`):

```diff
  containerStyles: {
+   display: "flex",
+   flexDirection: "column",
+   width: "fit-content",
  },
```

**분기 수정** (`implicitStyles.ts:1850`):

```diff
  if (containerTag === "calendar" || containerTag === "rangecalendar") {
    const calSize = (containerEl.props?.size as string) || "md";
    const calPadGap = { ... };
    const { pad, gap: calGap } = calPadGap[calSize] ?? calPadGap.md;
    const ps = parentStyle;
    effectiveParent = {
      ...effectiveParent,
      props: {
        ...effectiveParent.props,
        style: {
          ...(effectiveParent.props?.style as Record<string, unknown>),
-         width: ps.width ?? "fit-content",
-         display: ps.display ?? "flex",
-         flexDirection: ps.flexDirection ?? "column",
+         // ADR-084: display/flexDirection/width 는 CalendarSpec.containerStyles SSOT.
+         //   Phase 0 공통 선주입이 parentStyle 에 주입 → spread 시 보존.
          paddingTop: ps.paddingTop ?? pad,
          paddingRight: ps.paddingRight ?? pad,
          paddingBottom: ps.paddingBottom ?? pad,
          paddingLeft: ps.paddingLeft ?? pad,
          gap: ps.gap ?? calGap,
        },
      },
    } as Element;
    // children 처리 (CalendarHeader/CalendarGrid whiteSpace nowrap) 는 유지
  }
```

**결과**:

- Skia: parentStyle spread 로 spec 값(`display:"flex"; flexDirection:"column"; width:"fit-content"`) 보존 + size-based padding/gap 유지
- CSS: archetype table `display:grid` + containerStyles `display:flex` override → CSS 최종 값 = flex (cascade 순서로 containerStyles 가 나중 emit)
- 기존 CSS↔Skia 비대칭 해소 (둘 다 flex)

### Phase A2 — ProgressBar / Meter (PROGRESSBAR_TAGS)

**spec 변경** (`ProgressBar.spec.ts` + `Meter.spec.ts`):

```diff
  containerStyles: {
+   display: "flex",
+   flexDirection: "row",
+   flexWrap: "wrap",                       // ← ContainerStylesSchema 확장 필요?
+   justifyContent: "space-between",
  },
```

**`ContainerStylesSchema` 확장 의존성** (선행):

```typescript
// packages/specs/src/types/spec.types.ts
export interface ContainerStylesSchema {
  // ...
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse"; // ← 신규
}
```

그리고 `CONTAINER_STYLES_FALLBACK_KEYS` 에 `flexWrap` 추가 (`implicitStyles.ts:104-115`).

**분기 수정** (`implicitStyles.ts:1657`):

```diff
  if (PROGRESSBAR_TAGS.has(containerTag)) {
    // ...sizing/formatting/children 로직 유지...
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
-     display: parentStyle.display ?? "flex",
-     flexDirection: parentStyle.flexDirection ?? "row",
-     flexWrap: parentStyle.flexWrap ?? "wrap",
-     justifyContent: parentStyle.justifyContent ?? "space-between",
+     // ADR-084: display/flexDirection/flexWrap/justifyContent 는 ProgressBar/MeterSpec.
+     //   containerStyles SSOT. Phase 0 공통 선주입이 parentStyle 에 주입 → spread 시 보존.
      rowGap: parentStyle.rowGap ?? PROGRESSBAR_ROW_GAP,
      columnGap: parentStyle.columnGap ?? PROGRESSBAR_COL_GAP,
    });
  }
```

### Phase A3 — SelectTrigger

**spec 변경** (`SelectTrigger.spec.ts`):

```diff
  containerStyles: {
-   display: "inline-flex",            // ← Phase 8 에서 추가됨
+   display: "flex",                   // ← 실제 분기와 일치하도록 수정
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
+   // ADR-084: flexDirection "row" 는 archetype 기본이지만 명시.
+   flexDirection: "row",
  },
```

**분기 수정** (`implicitStyles.ts:1256`):

```diff
  if (containerTag === "selecttrigger") {
    const sizeName = getDelegatedSize(containerEl, elementById);
    effectiveParent = withParentStyle(
      containerEl,
      withSpecPadding(
        {
          ...parentStyle,
-         display: "flex",
-         flexDirection: "row",
-         alignItems: "center",
+         // ADR-084: display/flexDirection/alignItems 는 SelectTriggerSpec.containerStyles SSOT.
+         //   Phase 0 공통 선주입이 parentStyle 에 주입 → spread 시 보존.
          gap: parentStyle.gap ?? 4,
          borderWidth: parentStyle.borderWidth ?? 1,
          height: parentStyle.height ?? SPEC_TRIGGER_HEIGHT[sizeName] ?? SPEC_TRIGGER_HEIGHT.md,
        },
        sizeName,
      ),
    );
    // children (SelectValue/SelectIcon) 처리 유지
  }
```

**주의**: SelectTrigger 의 archetype 은 `button` (inline-flex) 이지만 실제 구조는 `flex` — archetype 과 spec 이 **의도적 불일치**. ADR-083 Phase 8 에서 `display:"inline-flex"` 로 리프팅한 것은 잘못 — 실제 코드 동작은 `display:"flex"` 였음. ADR-084 에서 spec 값을 실제에 맞게 수정.

### Phase A4 — Breadcrumbs

**spec 변경** (`Breadcrumbs.spec.ts`):

```diff
  containerStyles: {
-   display: "inline-flex",            // ← Phase 11 에서 추가됨
+   display: "flex",                   // ← 실제 분기와 일치
    alignItems: "center",
+   flexDirection: "row",
+   flexWrap: "nowrap",               // ← ContainerStylesSchema 확장 후
  },
```

**분기 수정** (`implicitStyles.ts:914-976`):

```diff
  if (containerTag === "breadcrumbs") {
    // ...Breadcrumb children 크기 계산 유지...

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
-     display: "flex",
-     flexDirection: "row",
-     alignItems: "center",
-     flexWrap: parentStyle.flexWrap ?? "nowrap",
+     // ADR-084: display/flexDirection/alignItems/flexWrap 는 BreadcrumbsSpec.containerStyles SSOT.
      height: breadcrumbsHeight,
      minHeight: breadcrumbsHeight,
      gap: 0,
    });
  }
```

## 검증 절차

### G1: type-check + unit tests (매 Phase)

```bash
pnpm -w type-check                                    # 3/3 PASS
pnpm --filter @composition/builder test              # 217/217 PASS
pnpm --filter @composition/specs test -u             # 166/166 PASS (snapshot 의도된 update)
```

### G2: Generated CSS diff 검토 (매 spec)

- Calendar.css / ProgressBar.css / Meter.css: `display: grid` (archetype) + `display: flex` (containerStyles) → cascade 최종 = flex ✓
- SelectTrigger.css: 기존 `inline-flex` → `flex` 로 변화. **시각 변화 가능성** — 사용자 확인 필요
- Breadcrumbs.css: 동일

### G3: Chrome MCP 실측 (5 spec 각 1 샘플)

- Calendar: CalendarHeader/CalendarGrid 수직 배치 확인
- ProgressBar/Meter: Label + Value + Track 배치 확인
- SelectTrigger: SelectValue + SelectIcon 가로 배치 확인
- Breadcrumbs: Breadcrumb 수평 배치 + 셀렉터 간격 확인

### G4: `resolveContainerStylesFallback.test.ts` 확장

- 각 spec 의 fallback 반환 snapshot 추가 (9 → 13+ tests)
- `tokenConsumerDrift.test.ts.snap` 의도된 update

## ContainerStylesSchema 확장 필요 여부

현재 Schema 에 `flexWrap` 없음. Phase A2/A4 에서 `flexWrap: "wrap"/"nowrap"` 필요.

**선행 작업** (ADR-084 Phase 0):

```typescript
// packages/specs/src/types/spec.types.ts
export interface ContainerStylesSchema {
  // ...
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
}

// implicitStyles.ts
const CONTAINER_STYLES_FALLBACK_KEYS = [
  // ...
  "flexWrap", // 신규
] as const;
```

그리고 CSSGenerator `emitContainerStyles` 에 flexWrap 처리 추가.

## 롤백 전략

각 Phase 독립 커밋:

| 커밋                                                     | 범위                                                     |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `feat(adr-084): P0 flexWrap schema + fallback keys 확장` | Schema + Keys + Generator                                |
| `feat(adr-084): P1 Calendar 분기 해체`                   | Calendar.spec + implicitStyles Calendar 분기             |
| `feat(adr-084): P2 ProgressBar/Meter 분기 해체`          | ProgressBar/Meter.spec + implicitStyles PROGRESSBAR 분기 |
| `feat(adr-084): P3 SelectTrigger 분기 해체`              | SelectTrigger.spec + implicitStyles SelectTrigger 분기   |
| `feat(adr-084): P4 Breadcrumbs 분기 해체`                | Breadcrumbs.spec + implicitStyles Breadcrumbs 분기       |
| `docs(adr-084): Status Proposed → Implemented`           | ADR + README                                             |

## 세션 분할 권장

| 세션 | 범위                                                               | 시간 |
| :--: | ------------------------------------------------------------------ | :--: |
|  A   | Phase 0 (Schema 확장) + Phase 1 (Calendar) + Chrome MCP 실측       |  2h  |
|  B   | Phase 2 (ProgressBar/Meter) + 실측                                 |  2h  |
|  C   | Phase 3 (SelectTrigger) + Phase 4 (Breadcrumbs) + 실측 + 최종 검증 |  2h  |

**총 6h / 3 세션**.

## 참조

- ADR-083: Phase 0 공통 선주입 layer 구축
- ADR-083 breakdown §하드코딩 분기 감사 (R0)
- ADR-080: resolveContainerStylesFallback export seam
- ADR-063: SSOT Chain Charter (D3 symmetric consumer 원칙)
- `packages/specs/src/types/spec.types.ts:59` ContainerStylesSchema
- `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:483-520` applyImplicitStyles 진입부 (Phase 0)
