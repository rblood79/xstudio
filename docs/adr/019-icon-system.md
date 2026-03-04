# ADR-019: 아이콘 시스템 — Builder UI 아이콘 선택/변경/추가

## Status

Proposed

## Context

### 문제

XStudio의 WebGL/Skia 렌더링 파이프라인에는 아이콘 렌더링 기능이 **완전히 구현**되어 있다:

- `IconFontShape` 타입 + `lucideIcons.ts` SVG path 레지스트리
- `specShapeConverter.ts` — `icon_font` → `icon_path` SkiaNodeData 변환
- `nodeRenderers.ts` — `renderIconPath()` (CanvasKit `Path.MakeFromSVGString()`)
- 6개 Spec에서 사용 중: Select, SelectIcon, Calendar, CalendarHeader, ComboBox, ListBox, Tree

그러나 **사용자가 아이콘을 선택/변경/추가할 수 있는 Builder UI가 전혀 없다.** Pencil 앱은 `icon_font` 노드 타입을 기본 지원하며 5개 아이콘 라이브러리(lucide, feather, Material Symbols 3종)와 아이콘 이름 변경, weight 조절, 색상 변경 UI를 제공한다.

### 현재 상태

| 영역                        | 상태    | 비고                                        |
| --------------------------- | ------- | ------------------------------------------- |
| **Skia 렌더링**             | ✅ 완료 | `renderIconPath()` — SVG path + circle 지원 |
| **PixiJS 이벤트**           | ✅ 스킵 | 부모 frame hitArea 사용 (정상)              |
| **Spec 시스템**             | ✅ 완료 | `IconFontShape` 타입, 6개 Spec 사용 중      |
| **아이콘 데이터**           | ✅ 부분 | `lucideIcons.ts` — 12개 아이콘만 하드코딩   |
| **Element `iconName` prop** | ❌ 없음 | `unified.types.ts`에 아이콘 관련 prop 없음  |
| **아이콘 피커 UI**          | ❌ 없음 | 검색/선택 팔레트 미존재                     |
| **프로퍼티 에디터 연동**    | ❌ 없음 | SelectEditor 등에 아이콘 편집 필드 없음     |
| **독립 Icon 컴포넌트**      | ❌ 없음 | `Icon` 태그 + Factory 미존재                |
| **Preview/Publish 렌더링**  | ❌ 없음 | HTML에서 아이콘 렌더링 미구현               |

### 제약 조건 (Hard Constraints)

1. **기존 Spec `icon_font` shape 하위 호환** — 현재 6개 Spec의 하드코딩 아이콘 동작 유지
2. **Skia 렌더링 파이프라인 재사용** — `renderIconPath()`는 건드리지 않음
3. **O(1) 검색** — elementsMap 기반, 아이콘 검색에 배열 순회 금지
4. **60fps 유지** — 아이콘 데이터 조회는 동기 O(1), 렌더링 파이프라인 영향 없음
5. **번들 크기 제약** — 초기 번들 < 500KB, 아이콘 데이터는 lazy load 또는 tree-shake

---

## Alternatives Considered

### 대안 A: Prop-Only 확장 (최소 변경)

Element에 `iconName`/`iconFontFamily` prop을 추가하고, 기존 Spec의 하드코딩 아이콘을 props에서 읽도록 변경. 독립 Icon 컴포넌트는 만들지 않음.

- **설명**: SelectIcon, CalendarHeader 등 기존 아이콘 사용 컴포넌트에서 `iconName` prop을 읽어 동적으로 아이콘 변경 가능. 아이콘 피커 UI를 프로퍼티 에디터에 통합.
- **위험**:
  - 기술: **L** — 기존 Spec render 함수에 props.iconName 분기 추가만으로 구현
  - 성능: **L** — 기존 렌더링 경로 변경 없음
  - 유지보수: **M** — 독립 아이콘 배치 불가, 항상 부모 컴포넌트 종속
  - 마이그레이션: **L** — optional prop 추가, 하위 호환

### 대안 B: Icon 독립 컴포넌트 + Prop 확장 (권장)

독립 `Icon` 컴포넌트 태그를 신설하고, 기존 Spec도 props 기반으로 확장. IconPicker 패널 + 프로퍼티 에디터 통합.

- **설명**: `Icon` 태그를 Factory에 등록하여 사용자가 독립적으로 아이콘을 캔버스에 배치 가능. 동시에 기존 SelectIcon 등은 `iconName` prop으로 변경 가능. 아이콘 피커 패널에서 검색/선택.
- **위험**:
  - 기술: **M** — 새 컴포넌트 태그 + Factory + Spec + Editor + Preview 렌더러 추가
  - 성능: **L** — 기존 파이프라인 활용, 아이콘 데이터 O(1) 조회
  - 유지보수: **L** — 독립 컴포넌트로 분리되어 확장성 높음
  - 마이그레이션: **L** — 신규 추가, 기존 코드 영향 없음

### 대안 C: 외부 아이콘 라이브러리 런타임 로드

lucide-react, @iconify/react 등 외부 라이브러리를 런타임에 로드하여 수천 개 아이콘 지원.

- **설명**: 아이콘 데이터를 번들에 포함하지 않고, CDN에서 동적 로드. 방대한 아이콘 선택지 제공.
- **위험**:
  - 기술: **H** — CanvasKit SVG path 렌더링과 외부 라이브러리 데이터 포맷 변환 필요, 오프라인 미지원
  - 성능: **M** — 네트워크 의존, 첫 로드 지연, 캐싱 전략 필요
  - 유지보수: **H** — 외부 의존성 버전 관리, API 변경 추적 부담
  - 마이그레이션: **L** — 신규 추가

---

## Decision

**대안 B: Icon 독립 컴포넌트 + Prop 확장** 선택.

**근거**:

- 대안 A는 독립 아이콘 배치가 불가능하여 노코드 빌더의 기본 기대(아이콘을 자유롭게 배치)를 충족하지 못함
- 대안 C는 기술/유지보수 위험이 HIGH이며, 오프라인 시나리오를 지원하지 못함
- 대안 B는 기존 렌더링 파이프라인을 그대로 활용하면서 독립 + 내장 양쪽 아이콘을 지원

---

## Gates

| Gate                                  | 시점            | 조건                                                   | 실패 시 대안                        |
| ------------------------------------- | --------------- | ------------------------------------------------------ | ----------------------------------- |
| **G1: Lucide 레지스트리 번들 크기**   | Phase A 완료 시 | 아이콘 데이터 전체(~1,400개) gzip 후 < 80KB            | 카테고리별 chunk 분리 + 동적 import |
| **G2: IconPicker 검색 성능**          | Phase B 완료 시 | 1,400개 아이콘 필터링 < 16ms (60fps 유지)              | 가상 스크롤 + debounce 300ms 적용   |
| **G3: Preview/Publish 아이콘 렌더링** | Phase D 완료 시 | HTML `<svg>` 렌더링이 Canvas Skia 렌더링과 시각적 동일 | SVG viewBox/stroke 파라미터 정규화  |

---

## Consequences

### Positive

- 사용자가 아이콘을 자유롭게 검색/선택/변경 가능
- 독립 Icon 컴포넌트로 캔버스 어디든 아이콘 배치 가능
- 기존 컴포넌트(Select, Calendar 등) 내장 아이콘도 변경 가능
- Lucide 전체 라이브러리(~1,400개) 지원으로 풍부한 아이콘 선택지
- 기존 Skia 렌더링 파이프라인 100% 재사용

### Negative

- 아이콘 데이터 번들 크기 증가 (Lucide 전체 SVG path ~60-80KB gzip)
- 7개 서브시스템 변경 필요 (Factory, Type, Spec, Editor, Preview, Publish, Canvas)
- Preview/Publish에서 SVG 렌더링 구현 추가 필요

---

## 실행 계획

### Phase A. 아이콘 레지스트리 확장 + 타입 시스템

> Lucide 전체 아이콘 데이터를 레지스트리로 확장하고, Element 타입에 아이콘 prop을 추가한다.

**A1. Lucide 아이콘 데이터 전체 등록**

현재 `lucideIcons.ts`에 12개만 하드코딩 → Lucide 전체 아이콘(~1,400개) SVG path 데이터로 확장.

- Lucide 패키지에서 SVG path 데이터를 추출하는 빌드 스크립트 작성
- 카테고리 메타데이터 포함 (navigation, action, media, file 등)
- 검색용 키워드/태그 포함 (아이콘 이름 + 별칭)
- Tree-shake 가능하도록 개별 export 또는 lazy load 설계

```ts
// packages/specs/src/icons/lucideIcons.ts 확장
export interface LucideIconData {
  paths: string[];
  circles?: Array<{ cx: number; cy: number; r: number }>;
  /** 검색용 태그 */
  tags?: string[];
  /** 카테고리 */
  category?: string;
}
```

**A2. Element 타입 확장**

```ts
// unified.types.ts — 아이콘 관련 공통 props
interface IconProps {
  /** 아이콘 이름 (lucide 레지스트리 키) */
  iconName?: string;
  /** 아이콘 라이브러리 (기본: 'lucide') */
  iconFontFamily?: string;
}

// Icon 독립 컴포넌트 props
interface IconElementProps extends IconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  strokeWidth?: number;
}

// 기존 컴포넌트에 IconProps mixin
interface ButtonElementProps extends IconProps { ... }
interface SelectIconElementProps extends IconProps { ... }
```

**A3. defaultPropsMap 등록**

```ts
// createDefaultIconProps()
{
  iconName: 'circle',
  iconFontFamily: 'lucide',
  size: 'md',
  color: 'currentColor',
  strokeWidth: 2,
}
```

**산출물**:

- 확장된 Lucide 아이콘 레지스트리 (~1,400개)
- Element 타입 확장 (`IconProps`, `IconElementProps`)
- `defaultPropsMap`에 Icon 등록

**변경 파일**:
| 파일 | 변경 |
|------|------|
| `packages/specs/src/icons/lucideIcons.ts` | 전체 아이콘 데이터 + 메타데이터 |
| `apps/builder/src/types/builder/unified.types.ts` | `IconProps`, `IconElementProps` 추가 |
| `packages/specs/src/icons/index.ts` | **NEW** — 아이콘 레지스트리 public API |

---

### Phase B. IconPicker UI 컴포넌트

> 아이콘 검색/선택/미리보기를 위한 Builder UI 컴포넌트를 구현한다.

**B1. PropertyIconPicker 컴포넌트**

프로퍼티 에디터에서 사용하는 인라인 아이콘 선택 필드.

```
[아이콘 미리보기] [아이콘 이름 ▼]  ← 클릭 시 IconPicker 팝오버 열림
```

- 현재 선택된 아이콘 SVG 미리보기 (16x16)
- 아이콘 이름 표시
- 클릭 시 IconPicker 팝오버

**B2. IconPicker 팝오버/패널**

```
┌─────────────────────────────┐
│ 🔍 아이콘 검색...            │
├─────────────────────────────┤
│ [카테고리 필터 칩]           │
├─────────────────────────────┤
│ ◻ ◻ ◻ ◻ ◻ ◻ ◻ ◻          │  ← 아이콘 그리드 (가상 스크롤)
│ ◻ ◻ ◻ ◻ ◻ ◻ ◻ ◻          │
│ ◻ ◻ ◻ ◻ ◻ ◻ ◻ ◻          │
│ ...                         │
├─────────────────────────────┤
│ [선택: home] [크기: md ▼]   │  ← 선택 상태 표시
└─────────────────────────────┘
```

- 텍스트 검색 (아이콘 이름 + 태그 fuzzy match)
- 카테고리 필터 (칩 형태)
- 가상 스크롤 그리드 (react-aria `useGridList` 또는 커스텀)
- 아이콘 호버 시 이름 툴팁
- 선택 시 콜백으로 `iconName` 전달

**B3. 아이콘 SVG 미리보기 렌더러**

- DOM `<svg>` 기반 미리보기 (Canvas 아닌 DOM — 패널용)
- `LucideIconData` → `<svg><path d="..."/></svg>` 변환 유틸
- stroke 색상/두께/크기 prop 지원

**산출물**:

- `PropertyIconPicker` 컴포넌트
- `IconPickerPopover` 팝오버
- `IconPreview` SVG 렌더러
- 아이콘 검색/필터 로직

**신규 파일**:
| 파일 | 역할 |
|------|------|
| **NEW** `components/property/PropertyIconPicker.tsx` | 인라인 아이콘 선택 필드 |
| **NEW** `components/property/PropertyIconPicker.css` | 스타일 |
| **NEW** `panels/icons/IconPickerPopover.tsx` | 아이콘 검색/그리드 팝오버 |
| **NEW** `panels/icons/IconPickerPopover.css` | 스타일 |
| **NEW** `panels/icons/components/IconGrid.tsx` | 가상 스크롤 아이콘 그리드 |
| **NEW** `panels/icons/components/IconPreview.tsx` | SVG 미리보기 렌더러 |
| **NEW** `panels/icons/hooks/useIconSearch.ts` | 검색/필터 로직 |

---

### Phase C. Icon 독립 컴포넌트 (Spec + Factory + Editor)

> 사용자가 캔버스에 독립적으로 아이콘을 배치할 수 있도록 Icon 컴포넌트를 구현한다.

**C1. Icon Spec**

```ts
// packages/specs/src/components/Icon.spec.ts
export const IconSpec: ComponentSpec<IconElementProps> = {
  name: "Icon",
  description: "독립 아이콘 컴포넌트",
  element: "span",
  // ...
  render: {
    shapes: (props, variant, size) => {
      const iconName = props.iconName ?? "circle";
      return [
        {
          type: "icon_font",
          iconName,
          x: effectiveSize / 2,
          y: effectiveSize / 2,
          fontSize: effectiveSize,
          fill: variant.text,
          strokeWidth: props.strokeWidth ?? 2,
        },
      ];
    },
  },
};
```

**C2. Icon Factory**

```ts
// factories/definitions/ 에 Icon 등록
{
  tag: 'Icon',
  label: '아이콘',
  category: 'basic',
  icon: Smile, // lucide-react
  props: {
    iconName: 'home',
    iconFontFamily: 'lucide',
    size: 'md',
    style: { width: 24, height: 24 },
  },
}
```

**C3. IconEditor (프로퍼티 에디터)**

```tsx
// editors/IconEditor.tsx
export const IconEditor = memo(function IconEditor({
  elementId, currentProps, onUpdate
}: PropertyEditorProps) {
  return (
    <>
      <PropertyIconPicker
        value={currentProps.iconName}
        onChange={(iconName) => onUpdate({ ...currentProps, iconName })}
      />
      <PropertySelect label="크기" value={currentProps.size} ... />
      <PropertyInput label="선 두께" value={currentProps.strokeWidth} ... />
    </>
  );
});
```

**C4. 기존 컴포넌트 Spec에 iconName prop 연동**

SelectIcon.spec.ts, CalendarHeader.spec.ts 등에서 하드코딩된 아이콘 이름을 `props.iconName`으로 대체:

```ts
// Before (SelectIcon.spec.ts)
iconName: 'chevron-down',

// After
iconName: props.iconName ?? 'chevron-down',
```

**C5. 기존 컴포넌트 Editor에 iconName 필드 추가**

SelectEditor, ComboBoxEditor 등에 `PropertyIconPicker` 통합:

- SelectIcon 자식의 iconName 변경 가능
- CalendarHeader의 화살표 아이콘 변경 가능

**산출물**:

- `Icon.spec.ts` + `IconSpec` 등록
- Icon Factory 정의
- `IconEditor.tsx`
- 기존 6개 Spec의 iconName prop 연동
- 기존 Editor에 iconName 필드 추가

**신규/수정 파일**:
| 파일 | 변경 |
|------|------|
| **NEW** `packages/specs/src/components/Icon.spec.ts` | Icon Spec |
| **NEW** `editors/IconEditor.tsx` | Icon 프로퍼티 에디터 |
| `packages/specs/src/components/index.ts` | IconSpec export |
| `packages/specs/src/index.ts` | IconSpec export |
| `factories/definitions/` | Icon Factory 등록 |
| `panels/properties/PropertiesPanel.tsx` | IconEditor 등록 |
| `packages/specs/src/components/SelectIcon.spec.ts` | `props.iconName ?? 'chevron-down'` |
| `packages/specs/src/components/CalendarHeader.spec.ts` | `props.iconName ?? 'chevron-left/right'` |
| `packages/specs/src/components/Calendar.spec.ts` | iconName prop 연동 |
| `packages/specs/src/components/ComboBox.spec.ts` | iconName prop 연동 |
| `packages/specs/src/components/ListBox.spec.ts` | iconName prop 연동 |
| `packages/specs/src/components/Tree.spec.ts` | iconName prop 연동 |
| `editors/SelectEditor.tsx` | PropertyIconPicker 추가 |
| `editors/ComboBoxEditor.tsx` | PropertyIconPicker 추가 |
| `editors/TreeEditor.tsx` | PropertyIconPicker 추가 |

---

### Phase D. Preview/Publish 아이콘 렌더링

> HTML 기반 Preview/Publish에서 아이콘을 SVG로 렌더링한다.

**D1. 아이콘 HTML 렌더러**

```tsx
// preview/renderers/IconRenderer.tsx
function IconRenderer({ element }: { element: Element }) {
  const iconData = getIconData(element.props.iconName ?? "circle");
  if (!iconData) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={element.props.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconData.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {iconData.circles?.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
    </svg>
  );
}
```

**D2. Preview `resolveHtmlTag` 확장**

- `Icon` 태그 → `IconRenderer` 매핑
- SelectIcon 등 기존 아이콘 컴포넌트 → SVG 렌더링 연동

**D3. Publish 앱 아이콘 렌더링**

- 동일 `IconRenderer` 로직을 Publish 앱에서 재사용
- 아이콘 데이터를 프로젝트 데이터에 포함 (사용된 아이콘만 tree-shake)

**D4. 정적 Export 아이콘 인라인**

- Export 시 사용된 아이콘 SVG를 HTML에 인라인 — 외부 의존성 없음

**산출물**:

- `IconRenderer` (Preview/Publish 공유)
- Preview `resolveHtmlTag` 확장
- Publish 아이콘 렌더링
- 정적 Export 아이콘 인라인

**신규/수정 파일**:
| 파일 | 변경 |
|------|------|
| **NEW** `preview/renderers/IconRenderer.tsx` | SVG 아이콘 렌더러 |
| `preview/App.tsx` | `resolveHtmlTag`에 Icon 추가 |
| `preview/renderers/index.ts` | IconRenderer export |
| `apps/publish/src/` | IconRenderer 연동 |

---

### Phase E. 아이콘 라이브러리 확장 (향후)

> Lucide 외 추가 아이콘 라이브러리 지원. **현재 라운드에서는 미구현.**

- Material Symbols (Outlined, Rounded, Sharp)
- Feather Icons
- `iconFontFamily` prop으로 라이브러리 전환
- 아이콘 피커에서 라이브러리 탭 전환

---

## 구현 순서 제안

| 순서 | Phase | 내용                                 | 규모 | 의존성     |
| :--: | :---: | ------------------------------------ | :--: | ---------- |
|  1   |   A   | 아이콘 레지스트리 확장 + 타입 시스템 |  중  | 없음       |
|  2   |   B   | IconPicker UI 컴포넌트               |  중  | Phase A    |
|  3   |   C   | Icon 독립 컴포넌트 + 기존 Spec 확장  |  대  | Phase A, B |
|  4   |   D   | Preview/Publish 아이콘 렌더링        |  중  | Phase C    |
|  5   |   E   | 추가 아이콘 라이브러리 (향후)        |  중  | Phase D    |

---

## 현재 아이콘 사용 현황 (코드 대조)

### Spec에서 `icon_font` shape 사용 현황

| Spec 파일                | 사용 아이콘                     | 하드코딩 여부 |
| ------------------------ | ------------------------------- | :-----------: |
| `SelectIcon.spec.ts`     | `chevron-down`                  |  ✅ 하드코딩  |
| `Select.spec.ts`         | `chevron-down`                  |  ✅ 하드코딩  |
| `CalendarHeader.spec.ts` | `chevron-left`, `chevron-right` |  ✅ 하드코딩  |
| `Calendar.spec.ts`       | `chevron-left`, `chevron-right` |  ✅ 하드코딩  |
| `ComboBox.spec.ts`       | `chevron-down`                  |  ✅ 하드코딩  |
| `ListBox.spec.ts`        | `check`                         |  ✅ 하드코딩  |
| `Tree.spec.ts`           | `chevron-right`                 |  ✅ 하드코딩  |

### lucideIcons.ts 현재 등록 아이콘 (12개)

| 카테고리   | 아이콘                                                        |
| ---------- | ------------------------------------------------------------- |
| Navigation | `chevron-down`, `chevron-up`, `chevron-right`, `chevron-left` |
| Actions    | `check`, `x`, `plus`, `minus`                                 |
| UI         | `search`, `eye`, `eye-off`                                    |
| Form       | `circle`, `info`, `alert-circle`                              |

### 렌더링 파이프라인 파일

| 파일                                              | 역할                                   |
| ------------------------------------------------- | -------------------------------------- |
| `packages/specs/src/types/shape.types.ts:316-332` | `IconFontShape` 인터페이스             |
| `packages/specs/src/icons/lucideIcons.ts`         | SVG path 데이터 + `getIconData()`      |
| `canvas/skia/specShapeConverter.ts`               | `icon_font` → `icon_path` SkiaNodeData |
| `canvas/skia/nodeRenderers.ts:229-245`            | `iconPath` SkiaNodeData 타입           |
| `canvas/skia/nodeRenderers.ts:1256-1299`          | `renderIconPath()` CanvasKit 렌더링    |
| `canvas/skia/nodeRenderers.ts:397-399`            | 렌더 루프 `case "icon_path"`           |
| `renderers/PixiRenderer.ts`                       | `icon_font` 스킵 (이벤트 불필요)       |

---

## 리스크 및 대응

| 리스크                                     | 등급 | 대응                                                                |
| ------------------------------------------ | :--: | ------------------------------------------------------------------- |
| **Lucide 전체 아이콘 데이터 번들 크기**    |  M   | 카테고리별 chunk 분리 + 동적 import. Gate G1에서 80KB 기준 체크     |
| **1,400개 아이콘 검색/렌더링 성능**        |  M   | 가상 스크롤 + debounce 검색. Gate G2에서 16ms 기준 체크             |
| **Canvas ↔ HTML 아이콘 렌더링 불일치**     |  M   | SVG viewBox 24x24 + stroke 파라미터 정규화. Gate G3에서 시각 비교   |
| **기존 Spec 하위 호환 깨짐**               |  L   | `props.iconName ?? 'chevron-down'` fallback 패턴으로 기존 동작 보장 |
| **Preview/Publish에서 아이콘 데이터 누락** |  L   | 사용된 아이콘만 프로젝트 데이터에 포함 (tree-shake)                 |

---

## 수용 기준 (Acceptance Criteria)

1. 사용자가 Icon 컴포넌트를 캔버스에 드래그하여 배치할 수 있다
2. 아이콘 피커에서 검색/카테고리 필터로 아이콘을 선택할 수 있다
3. 선택한 아이콘이 Builder Canvas(Skia)에서 즉시 렌더링된다
4. 기존 컴포넌트(Select, Calendar 등)의 내장 아이콘을 프로퍼티 에디터에서 변경할 수 있다
5. Preview iframe에서 아이콘이 SVG로 정상 렌더링된다
6. Publish 앱에서 아이콘이 정상 렌더링된다
7. 정적 Export에서 아이콘 SVG가 인라인으로 포함된다
8. 아이콘 변경 시 히스토리(Undo/Redo)가 정상 동작한다

---

## 테스트 계획

- **단위 테스트 (Phase A)**:
  - Lucide 아이콘 레지스트리 조회 (`getIconData`)
  - 아이콘 검색/필터 로직 (이름, 태그, 카테고리)
  - `IconElementProps` 기본값 생성

- **통합 테스트 (Phase B~C)**:
  - IconPicker 검색 → 선택 → onUpdate 콜백
  - Icon Spec shapes 생성 → `icon_font` shape 포함 확인
  - 기존 Spec iconName prop 연동 (chevron-down fallback)

- **E2E 테스트 (Phase D)**:
  - Icon 배치 → Canvas 렌더링 → Preview 렌더링 시각 비교
  - SelectIcon 아이콘 변경 → Canvas + Preview 동기 확인
  - 프로젝트 저장/재로드 후 아이콘 유지 확인
