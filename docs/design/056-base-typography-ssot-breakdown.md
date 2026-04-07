# ADR-056: Base Typography SSOT — 구현 상세

## 변경 파일 목록

| 파일                                                                         | 변경 유형 | 내용                                                                   |
| ---------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| `apps/builder/src/stores/themeConfigStore.ts`                                | Modify    | `baseTypography` 상태 + `setBaseTypography` 액션 + localStorage 영속화 |
| `apps/builder/src/builder/fonts/customFonts.ts`                              | Modify    | `DEFAULT_BASE_TYPOGRAPHY` 상수 추가                                    |
| `apps/builder/src/builder/workspace/canvas/layout/engines/cssResolver.ts`    | Modify    | `ROOT_COMPUTED_STYLE`을 store에서 동적 구성 (lineHeight 추가)          |
| `apps/builder/src/builder/workspace/canvas/layout/engines/cssValueParser.ts` | Modify    | rem 기준값을 store에서 읽기                                            |
| `apps/builder/src/preview/index.tsx`                                         | Modify    | body 스타일을 postMessage로 동적 갱신                                  |
| `apps/builder/src/builder/panels/themes/ThemesPanel.tsx`                     | Modify    | Typography 섹션 추가                                                   |
| `apps/publish/src/styles/index.css`                                          | Modify    | `:root` font-family에 Pretendard 추가                                  |

## Phase 1: DEFAULT_BASE_TYPOGRAPHY 상수 + themeConfigStore 확장

### customFonts.ts

```typescript
export const DEFAULT_BASE_TYPOGRAPHY = {
  fontFamily:
    "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', sans-serif",
  fontSize: 16,
  lineHeight: 1.5,
} as const;

export type BaseTypography = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

// 기존 DEFAULT_FONT_FAMILY 유지 (하위 호환)
export const DEFAULT_FONT_FAMILY = "Pretendard";
```

### themeConfigStore.ts

기존 `PersistedThemeConfig`에 `baseTypography` 추가:

```typescript
import {
  DEFAULT_BASE_TYPOGRAPHY,
  type BaseTypography,
} from "../builder/fonts/customFonts";

interface PersistedThemeConfig {
  tint: TintPreset;
  darkMode: DarkModePreference;
  neutral: NeutralPreset;
  radiusScale: RadiusScale;
  baseTypography: BaseTypography; // 추가
}

interface ThemeConfigState extends PersistedThemeConfig {
  // ...기존 액션
  setBaseTypography: (typography: Partial<BaseTypography>) => void; // 추가
}
```

Store 초기값:

```typescript
baseTypography: DEFAULT_BASE_TYPOGRAPHY,
```

`setBaseTypography` 액션:

```typescript
setBaseTypography: (typography) => {
  set((state) => ({
    baseTypography: { ...state.baseTypography, ...typography },
    themeVersion: state.themeVersion + 1,
  }));
  persistCurrentConfig();
  notifyLayoutChange();  // lineHeight/fontSize 변경 시 레이아웃 재계산
},
```

`initThemeConfig`에서 복원:

```typescript
baseTypography: saved?.baseTypography ?? DEFAULT_BASE_TYPOGRAPHY,
```

## Phase 2: ROOT_COMPUTED_STYLE 동적 구성

### cssResolver.ts

정적 `ROOT_COMPUTED_STYLE` → store에서 읽는 함수로 변경:

```typescript
import { useThemeConfigStore } from "../../../../stores/themeConfigStore";
import { DEFAULT_BASE_TYPOGRAPHY } from "../../../../fonts/customFonts";

/** 현재 프로젝트의 root computed style (themeConfigStore에서 동적 구성) */
export function getRootComputedStyle(): ComputedStyle {
  const { baseTypography } = useThemeConfigStore.getState();
  const typo = baseTypography ?? DEFAULT_BASE_TYPOGRAPHY;
  return {
    color: "#000000",
    fontSize: typo.fontSize,
    fontFamily: typo.fontFamily,
    fontWeight: 400,
    fontStyle: "normal",
    fontVariant: "normal",
    fontStretch: "normal",
    lineHeight: typo.lineHeight, // 추가!
    letterSpacing: 0,
    wordSpacing: 0,
    textAlign: "left",
    textTransform: "none",
    visibility: "visible",
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: "normal",
  };
}

// 기존 ROOT_COMPUTED_STYLE 호출부를 getRootComputedStyle()로 교체
// 또는 lazy getter로 유지
```

### CSS_INITIAL_VALUES 정렬

```typescript
export const CSS_INITIAL_VALUES: Record<string, string | number> = {
  fontFamily: DEFAULT_BASE_TYPOGRAPHY.fontFamily, // was: "sans-serif"
  fontSize: DEFAULT_BASE_TYPOGRAPHY.fontSize,
  lineHeight: "normal", // CSS initial은 "normal" 유지
  // ...
};
```

## Phase 3: Preview iframe 동적 갱신

### preview/index.tsx

기존 하드코딩된 body 스타일을 postMessage로 동적 갱신:

```typescript
// postMessage 수신 핸들러에 추가
case "THEME_BASE_TYPOGRAPHY": {
  const { fontFamily, fontSize, lineHeight } = msg.payload;
  document.body.style.fontFamily = fontFamily;
  document.body.style.fontSize = `${fontSize}px`;
  document.body.style.lineHeight = String(lineHeight);
  break;
}
```

Builder 측에서 themeConfigStore 변경 시 postMessage 전송:

```typescript
// themeConfigStore.setBaseTypography 내부 또는 구독
postMessageToPreview({
  type: "THEME_BASE_TYPOGRAPHY",
  payload: state.baseTypography,
});
```

초기 로드 시에도 동일 메시지 전송하여 Preview body 스타일 설정.

## Phase 4: ThemesPanel Typography 섹션

```tsx
// ThemesPanel.tsx에 추가
<PropertySection title="Typography" icon={Type}>
  {/* Font Family — 프로젝트 등록 폰트 + system 프리셋 */}
  <PropertySelect
    label="Font"
    value={baseTypography.fontFamily}
    options={fontFamilyOptions}
    onChange={(v) => setBaseTypography({ fontFamily: v })}
  />

  {/* Base Size — 프리셋 */}
  <PropertySelect
    label="Size"
    value={String(baseTypography.fontSize)}
    options={[
      { value: "14", label: "14px (Small)" },
      { value: "16", label: "16px (Default)" },
      { value: "18", label: "18px (Large)" },
    ]}
    onChange={(v) => setBaseTypography({ fontSize: Number(v) })}
  />

  {/* Line Height — 프리셋 */}
  <PropertySelect
    label="Line Height"
    value={String(baseTypography.lineHeight)}
    options={[
      { value: "1.4", label: "1.4 (Compact)" },
      { value: "1.5", label: "1.5 (Default)" },
      { value: "1.6", label: "1.6 (Relaxed)" },
      { value: "1.75", label: "1.75 (Spacious)" },
    ]}
    onChange={(v) => setBaseTypography({ lineHeight: Number(v) })}
  />
</PropertySection>
```

## Phase 5: Publish CSS + rem 연동

### publish/styles/index.css

```css
:root {
  /* 정본: apps/builder/src/builder/fonts/customFonts.ts DEFAULT_BASE_TYPOGRAPHY */
  font-family:
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    system-ui,
    Roboto,
    "Helvetica Neue",
    "Segoe UI",
    sans-serif;
  font-size: 16px;
  line-height: 1.5;
}
```

### cssValueParser.ts rem 연동

```typescript
import { useThemeConfigStore } from "../../../../stores/themeConfigStore";
import { DEFAULT_BASE_TYPOGRAPHY } from "../../../../fonts/customFonts";

function getRemBase(): number {
  return (
    useThemeConfigStore.getState().baseTypography?.fontSize ??
    DEFAULT_BASE_TYPOGRAPHY.fontSize
  );
}

// rem → px 변환에서 사용
// 기존: parseFloat(value) * 16
// 변경: parseFloat(value) * getRemBase()
```

## 검증 체크리스트

- [ ] `themeConfigStore.baseTypography` 초기값 === `DEFAULT_BASE_TYPOGRAPHY`
- [ ] localStorage에 baseTypography 없는 기존 프로젝트 → DEFAULT fallback 정상
- [ ] `getRootComputedStyle().lineHeight` === store.baseTypography.lineHeight === Preview body line-height
- [ ] ThemesPanel에서 fontSize 변경 → Canvas + Preview 동시 반영
- [ ] ThemesPanel에서 fontFamily 변경 → Canvas + Preview 동시 반영
- [ ] 22+ Spec 컴포넌트 텍스트 높이 ≤1px 변화 확인
- [ ] Publish 앱에서 Pretendard 폰트 렌더링 정상
- [ ] rem 기반 값이 fontSize 변경 시 자동 연동
- [ ] pnpm type-check 0 errors
- [ ] vitest 전체 pass
