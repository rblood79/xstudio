# ADR-084 Breakdown — implicitStyles 하드코딩 분기 해체 (4 spec parent container primitive 해체, Phase A2 scope 외)

> 본 문서는 ADR-084 (`docs/adr/084-implicitstyles-branch-dissolution.md`) 의 Decision 섹션에서 분리된 구현 상세. **Revision 2 (Codex Round 3 반영)** — Phase A2 (ProgressBar/Meter) 는 본 ADR scope 에서 완전 분리 (ContainerStylesSchema grid-template-\* 확장 후속 ADR 로 이관). 본 ADR scope = Phase A1/A3/A4 (Calendar/RangeCalendar/SelectTrigger/Breadcrumbs parent container).

## 배경 요약

ADR-083 Phase 0 이 `applyImplicitStyles` 진입부에서 `LOWERCASE_TAG_SPEC_MAP` 기반 `resolveContainerStylesFallback()` 을 호출하여 parentStyle 에 spec containerStyles 를 공통 선주입. 하지만 아래 5 분기가 **직접 할당** 패턴(`display: "flex"` 등) 으로 parentStyle 의 spec 값 override — Phase 0 효력 무효화.

| spec                     | 분기 위치                                                | override 패턴                                                                      | archetype vs 실제 구조                       |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| Calendar / RangeCalendar | `implicitStyles.ts:1850` (진입)                          | `display: ps.display ?? "flex"; flexDirection: "column"`                           | archetype=`grid` / 실제=flex column          |
| ProgressBar / Meter      | `implicitStyles.ts:1566` (진입, `:1657` effectiveParent) | `display: ps.display ?? "flex"; flexDirection: "row"; flexWrap; rowGap; columnGap` | archetype=`grid` / 실제=flex row wrap        |
| SelectTrigger            | `implicitStyles.ts:1256` (진입)                          | `display: "flex"; flexDirection: "row"; alignItems: "center"`                      | archetype=`button` (inline-flex) / 실제=flex |
| Breadcrumbs              | `implicitStyles.ts:914` (진입, `:976` effectiveParent)   | `display: "flex"; alignItems: "center"; flexWrap: nowrap`                          | archetype=`simple` (inline-flex) / 실제=flex |

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

> ⚠️ **Codex Revision 1 — HIGH 위험 발견**: `ProgressBar.css` 는 `grid-template-areas: "label value" "bar bar"` + `grid-template-columns: 1fr auto` + 자식 `grid-area: label/value/bar` 를 **적극 사용 중**. spec.containerStyles.display 를 `grid → flex` 로 변경 시 grid-template 무효 + 자식 grid-area 무효 → **Preview Label/Value/Bar 배치 구조적 깨짐**. ADR-084 ADR Gate G5: Phase A2 진입 전 Chrome MCP 실측으로 깨짐 여부 확증 필수. 깨지면 Phase A2 를 **ContainerStylesSchema `grid-template-areas/columns` 확장 후속 ADR 로 이관**하고 본 Phase A2 skip.

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

**`rowGap` / `columnGap` 완전 이관 불가 (scope 외)**:
`ContainerStylesSchema` (`packages/specs/src/types/spec.types.ts:59-93`) 에는 `rowGap` / `columnGap` 필드가 **부재**. `gap` (shorthand) 만 지원. 따라서 ProgressBar/Meter 의 `rowGap: PROGRESSBAR_ROW_GAP` / `columnGap: PROGRESSBAR_COL_GAP` 는 spec 으로 구조적 이관 불가 → 본 ADR scope 에서 **분기 잔존**. 완전 SSOT 복귀는 후속 ADR 에서 schema 확장(`rowGap`/`columnGap` 필드 추가 + `CONTAINER_STYLES_FALLBACK_KEYS` 확장 + CSSGenerator `emitContainerStyles` 처리) 과 함께 수행.

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

**주의**: SelectTrigger 의 archetype 은 `button` (inline-flex) 이지만 실제 구조는 `flex` — **archetype 기준 vs 실제 구현 기준 불일치**. ADR-083 Phase 8 은 당시 "archetype 기준 리프팅" 원칙에 따라 `display:"inline-flex"` 로 선언했고, 이는 당시 원칙 준수. ADR-084 는 "실제 구현 기준" 으로 정책을 전환하여 `display:"flex"` 로 재조정 (archetype 과 실제 구현의 사전 존재 불일치를 정면 해소).

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

**Breadcrumb child 주입 잔존 (Codex HIGH 반영, scope 외)**:

`implicitStyles.ts:955-971` 에서 Breadcrumbs 분기는 child Breadcrumb 별로도 style 을 주입:

```typescript
// child Breadcrumb style 주입 (line 955-971, ADR-084 scope 외)
style: {
  ...cs,
  display: cs.display ?? "flex",              // Phase 11 BreadcrumbSpec.display="inline-flex" 가 cs 에 주입되어 있으면 spec 값 승리
  flexDirection: cs.flexDirection ?? "row",   // spec 미선언 → "row" 하드코딩 유지
  alignItems: cs.alignItems ?? "center",      // Phase 11 BreadcrumbSpec.alignItems="center" 와 일치
  flexShrink: cs.flexShrink ?? 0,             // spec 미선언 → 0 하드코딩
  flexGrow: cs.flexGrow ?? 0,                 // spec 미선언 → 0 하드코딩
  width: itemWidth,                           // 직접 할당 (measureTextWidth 계산)
  minWidth: itemWidth,                        // 직접 할당
  height: breadcrumbsHeight,                  // 직접 할당 (spec.size 테이블)
  minHeight: breadcrumbsHeight,               // 직접 할당
}
```

**해체 가능 vs 잔존 분류**:

- **`display` / `alignItems`** — `??` 패턴 + Phase 11 BreadcrumbSpec 에 선언됨 → spec 값 승리 (ADR-083 Phase 0 공통 선주입 효과). **이미 부분 해체 상태**
- **`flexDirection` / `flexShrink` / `flexGrow`** — `??` 패턴이지만 BreadcrumbSpec 에 미선언 → 하드코딩 값 사용. 부분 해체 가능 (BreadcrumbSpec 에 필드 추가 시) 하지만 ADR-084 scope 밖 (본 ADR 은 parent container 만)
- **`width` / `minWidth`** — `measureTextWidth` 로 text label 기반 계산. spec 이관 = `spec.render.shapes` 에 text measurement hook 신설 필요 → 대안 C 경로 후속 ADR
- **`height` / `minHeight`** — `breadcrumbsHeight` (BreadcrumbsSpec.sizes.\*.height). spec 이관 = size-indexed layout 필드 신설 필요 → 대안 C 경로 후속 ADR

**결론**: ADR-084 실행 후 Breadcrumbs 는 "parent SSOT + child partial SSOT + child width/height branch-owned" 혼합 상태. 완전 SSOT 복귀는 대안 C 후속 ADR 필요.

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

### ADR-084 scope 내 확장 (선행 작업 — Phase 0)

현재 Schema 에 `flexWrap` 없음. **Phase A4 Breadcrumbs 에서 `flexWrap: "nowrap"`** 필요 (Breadcrumbs parent container 의 자식 Breadcrumb 줄바꿈 방지). Phase A2 (ProgressBar/Meter) 의 `flexWrap: "wrap"` 은 본 ADR scope 외 — 별도 후속 ADR.

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

### ADR-084 scope 외 (후속 ADR 필요)

아래 필드는 본 ADR scope 에서는 **완전 이관 불가** — 분기에 잔존하되 후속 ADR 에서 schema 확장 + 이관:

- **`rowGap` / `columnGap`** — ProgressBar/Meter 분기 (`PROGRESSBAR_ROW_GAP` / `PROGRESSBAR_COL_GAP`). 현재 Schema 는 shorthand `gap` 만 지원. flex-wrap 레이아웃에서 row/col 분리 제어가 Spec 에서 불가능 → 분기 유지
- **size-based padding/height** — Calendar 의 `calPadGap` 테이블, Breadcrumbs 의 `breadcrumbsHeight`, ProgressBar 의 `PROGRESSBAR_BAR_HEIGHT` 등. 대안 C (size-indexed 필드 추가) 경로가 열려야 이관 가능
- **비즈니스 로직** — ProgressBar 의 `formatProgressValue`, Breadcrumbs 의 Breadcrumb child width 측정, Calendar 의 CalendarHeader/Grid whiteSpace 주입. 이들은 "layout primitive" 범위 밖 → spec.render / spec 계산 hook 모델 확장 필요

후속 ADR 후보: "ContainerStylesSchema Tier 2 확장 — rowGap/columnGap + size-indexed layout".

## 롤백 전략

각 Phase 독립 커밋. **Phase A2 는 본 ADR scope 외 — 커밋 계획에서 제외** (Codex Round 3 반영):

| 커밋                                                     | 범위                                                                         |    Scope    |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | :---------: |
| `feat(adr-084): P0 flexWrap schema + fallback keys 확장` | Schema + Keys + Generator                                                    |  ✅ 본 ADR  |
| `feat(adr-084): P1 Calendar 분기 해체`                   | Calendar.spec + implicitStyles Calendar 분기                                 |  ✅ 본 ADR  |
| ~~`feat(adr-084): P2 ProgressBar/Meter 분기 해체`~~      | ~~ProgressBar/Meter.spec + implicitStyles PROGRESSBAR 분기~~                 | ❌ 후속 ADR |
| `feat(adr-084): P3 SelectTrigger 분기 해체`              | SelectTrigger.spec + implicitStyles SelectTrigger 분기                       |  ✅ 본 ADR  |
| `feat(adr-084): P4 Breadcrumbs parent 분기 해체`         | Breadcrumbs.spec + implicitStyles Breadcrumbs parent (child 주입은 scope 외) |  ✅ 본 ADR  |
| `docs(adr-084): Status Proposed → Implemented`           | ADR + README                                                                 |  ✅ 본 ADR  |

### Phase A2 (ProgressBar/Meter) 별도 후속 ADR

Phase A2 는 `ProgressBar.css` grid-template-areas/columns cascade 깨짐 위험(R3-A HIGH 수준)으로 본 ADR 에서 **완전 분리**. 별도 후속 ADR 필요:

1. ContainerStylesSchema `grid-template-areas` / `grid-template-columns` 필드 추가
2. `CONTAINER_STYLES_FALLBACK_KEYS` 확장
3. CSSGenerator `emitContainerStyles` 에 grid-template-\* 처리
4. ProgressBar.spec + Meter.spec 에 containerStyles grid-template-\* 선언 (archetype table 값과 동일)
5. implicitStyles PROGRESSBAR_TAGS 분기의 display/flexDirection/flexWrap/justifyContent 직접 할당 제거
6. Chrome MCP 실측으로 Preview Label/Value/Bar 배치 동일성 확증

## 세션 분할 권장

본 ADR scope = **4 spec 3 Phase** (Phase A2 제외):

| 세션 | 범위                                                                                                         | 시간 |
| :--: | ------------------------------------------------------------------------------------------------------------ | :--: |
|  A   | Phase 0 (flexWrap Schema 확장) + Phase A1 (Calendar) + Chrome MCP 실측 (R3 Calendar grid→flex 확증)          |  2h  |
|  B   | Phase A3 (SelectTrigger) + Phase A4 (Breadcrumbs parent 만) + Chrome MCP 실측 + 최종 검증 + docs Status 전이 |  2h  |

**총 4h / 2 세션** (Phase A2 분리로 1 세션 절감).

### Phase A2 실행 조건 (후속 ADR scope, 본 ADR 외)

본 ADR 이 Implemented 된 이후 Phase A2 를 실행하려면:

1. ContainerStylesSchema grid-template-\* 확장 ADR 이 Proposed → Implemented
2. ProgressBar.spec + Meter.spec 에 `containerStyles.grid-template-areas/columns` 선언
3. Chrome MCP 실측으로 Label/Value/Bar 배치 회귀 0 확증 (Gate 통과 조건)
4. implicitStyles PROGRESSBAR_TAGS 분기 해체

## 참조

- ADR-083: Phase 0 공통 선주입 layer 구축
- ADR-083 breakdown §하드코딩 분기 감사 (R0)
- ADR-080: resolveContainerStylesFallback export seam
- ADR-063: SSOT Chain Charter (D3 symmetric consumer 원칙)
- `packages/specs/src/types/spec.types.ts:59` ContainerStylesSchema
- `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:483-520` applyImplicitStyles 진입부 (Phase 0)
