# 완성형 스타일 시스템 아키텍처

> **레거시 사유**: 이 문서는 미완성 설계안입니다. Phase 1 (섹션별 스타일 훅)은 구현 완료되었으나, Phase 2~4의 핵심 파일들이 미구현 상태입니다.
>
> **미구현 항목**:
> - `src/stores/styleStore.ts` (통합 스타일 스토어)
> - `src/builder/panels/styles/utils/tokenResolver.ts` (토큰 해석 엔진)
> - `src/builder/export/atomicCssGenerator.ts` (Atomic CSS 생성기)
> - `src/builder/export/cssVariableGenerator.ts` (CSS 변수 생성기)
>
> **현재 실제 구현**: Jotai 기반 섹션별 스타일 훅 (`useTransformValuesJotai`, `useLayoutValuesJotai`, 등) + `themeStore.ts` + `designKitStore.ts`

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE STYLE SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Token     │───▶│   Style     │───▶│   Canvas    │───▶│   Export    │  │
│  │   Layer     │    │   Layer     │    │   Layer     │    │   Layer     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        │                  │                  │                  │          │
│        ▼                  ▼                  ▼                  ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 3-Layer     │    │ Sectional   │    │ Style       │    │ Atomic CSS  │  │
│  │ Hierarchy   │    │ Hooks       │    │ Converter   │    │ Generator   │  │
│  │ + Multi-Mode│    │ + Caching   │    │ + Caching   │    │ + Minifier  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Token Layer (디자인 토큰 시스템) — 설계안

### 2.1 3-Layer Token Hierarchy

```typescript
// src/types/theme/tokenHierarchy.ts (미구현)

export type TokenScope = 'primitive' | 'semantic' | 'component';

export interface PrimitiveToken {
  scope: 'primitive';
  value: TokenValue;
}

export interface SemanticToken {
  scope: 'semantic';
  value: TokenReference;
  fallback?: TokenValue;
}

export interface ComponentToken {
  scope: 'component';
  value: TokenReference;
  component_type: string;
  property: string;
}

export interface TokenReference {
  ref: string;
}
```

### 2.2 Multi-Mode System (Light/Dark/Custom)

```typescript
// src/types/theme/multiMode.ts (미구현)

export type TokenMode = 'light' | 'dark' | 'high-contrast' | string;

export interface ModeValues {
  light: TokenValue;
  dark: TokenValue;
  'high-contrast'?: TokenValue;
  [customMode: string]: TokenValue | undefined;
}

export interface MultiModeToken extends EnhancedToken {
  modes: ModeValues;
  default_mode: TokenMode;
}

export interface TokenCollection {
  id: string;
  name: string;
  description?: string;
  tokens: string[];
  modes: TokenMode[];
  default_mode: TokenMode;
}

export interface ThemeConfig {
  id: string;
  name: string;
  collections: TokenCollection[];
  active_mode: TokenMode;
  supports_system_preference: boolean;
}
```

### 2.3 Token Resolution Engine (미구현)

```typescript
// src/builder/panels/styles/utils/tokenResolver.ts (미구현)

export class TokenResolver {
  private cache: Map<string, ResolvedTokenCache> = new Map();
  private maxDepth = 10;

  resolve(tokenId: string, mode: TokenMode = 'light'): TokenValue {
    // 참조 체인을 따라 최종값 반환 (순환 참조 방지)
  }

  invalidate(tokenId: string): void {
    // 이 토큰을 참조하는 모든 캐시 무효화
  }
}

export const tokenResolver = new TokenResolver();
```

---

## 3. Style Layer (스타일 관리 시스템) — 구현 완료 (Phase 1)

### 3.1 Sectional Style Hooks (구현됨)

실제 파일:
- `src/builder/panels/styles/hooks/useTransformValues.ts` — width, height, top, left
- `src/builder/panels/styles/hooks/useLayoutValues.ts` — display, flexDirection, gap, padding...
- `src/builder/panels/styles/hooks/useAppearanceValues.ts` — backgroundColor, borderRadius...
- `src/builder/panels/styles/hooks/useTypographyValues.ts` — fontFamily, fontSize...

Jotai 버전 (실제 사용):
- `src/builder/panels/styles/hooks/useTransformValuesJotai.ts`
- `src/builder/panels/styles/hooks/useLayoutValuesJotai.ts`
- `src/builder/panels/styles/hooks/useAppearanceValuesJotai.ts`
- `src/builder/panels/styles/hooks/useTypographyValuesJotai.ts`

```typescript
// 구현 패턴 예시
export interface TransformStyleValues {
  width: string;
  height: string;
  top: string;
  left: string;
}

export function useTransformValues(element: SelectedElement | null): TransformStyleValues | null {
  return useMemo(() => {
    if (!element) return null;
    return {
      width: getStyleValue(element, 'width', 'auto'),
      height: getStyleValue(element, 'height', 'auto'),
      top: getStyleValue(element, 'top', 'auto'),
      left: getStyleValue(element, 'left', 'auto'),
    };
  }, [element?.id, element?.style?.width, element?.style?.height, element?.style?.top, element?.style?.left]);
}
```

### 3.2 Enhanced Style Actions (구현됨)

```typescript
// src/builder/panels/styles/hooks/useStyleActions.ts (구현됨)
export interface StyleActionsReturn {
  updateStyle: (property: keyof CSSProperties, value: string) => void;
  updateStyles: (styles: Partial<CSSProperties>) => void;
  resetStyles: (properties: (keyof CSSProperties)[]) => void;
  applyToken: (property: keyof CSSProperties, tokenId: string) => void;
  detachToken: (property: keyof CSSProperties) => void;
  handleFlexDirection: (value: string) => void;
  handleFlexAlignment: (position: string, flexDirection: string) => void;
  handleJustifyContentSpacing: (value: string) => void;
  handleFlexWrap: (value: string) => void;
  copyStyles: (styles: CSSProperties) => Promise<void>;
  pasteStyles: () => Promise<void>;
  batchUpdate: (updates: StyleUpdate[]) => void;
}
```

---

## 4. Canvas Layer (렌더링 시스템) — 설계안

### 4.1 Cached Style Converter (설계안)

```typescript
// apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts

class StyleConversionCache {
  private cache: Map<string, { result: ConvertedStyle; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttl = 60000) { ... }

  get(style: CSSStyle): ConvertedStyle | null { ... }
  set(style: CSSStyle, result: ConvertedStyle): void { ... }
}

export function convertStyleCached(style: CSSStyle | undefined): ConvertedStyle { ... }

export function convertStyleWithTokens(
  style: CSSStyle | undefined,
  tokenBindings: Record<string, string> | undefined,
  mode: TokenMode = 'light'
): ConvertedStyle { ... }
```

---

## 5. Export Layer (CSS 출력 시스템) — 미구현

### 5.1 Atomic CSS Generator (미구현)

```typescript
// src/builder/export/atomicCssGenerator.ts (미구현)

export class AtomicCssGenerator {
  private rules: Map<string, AtomicRule> = new Map();

  generate(style: CSSProperties): string[] {
    // 각 CSS 속성을 개별 클래스로 변환, 중복 제거 및 재사용
  }

  compile(): string {
    // 최종 CSS 문자열 생성 (사용 빈도순 정렬)
  }
}
```

### 5.2 CSS Variable Generator (미구현)

```typescript
// src/builder/export/cssVariableGenerator.ts (미구현)

export function generateCSSVariables(
  tokens: EnhancedToken[],
  mode: TokenMode = 'light'
): string {
  // Design Token → CSS Variable 변환
  // :root { --color-brand-primary: #3b82f6; }
  // @media (prefers-color-scheme: dark) { :root { ... } }
}
```

---

## 6. Store Architecture (설계안)

### 6.1 Unified Style Store (미구현)

```typescript
// src/stores/styleStore.ts (미구현)

export interface StyleState {
  tokens: Map<string, EnhancedToken>;
  collections: Map<string, TokenCollection>;
  activeMode: TokenMode;
  elementStyles: Map<string, CSSProperties>;
  elementTokenBindings: Map<string, Record<string, string>>;
  resolvedTokenCache: Map<string, TokenValue>;
  convertedStyleCache: Map<string, ConvertedStyle>;

  // Actions
  setToken: (token: EnhancedToken) => void;
  setActiveMode: (mode: TokenMode) => void;
  updateElementStyle: (elementId: string, property: keyof CSSProperties, value: string) => void;
  bindTokenToElement: (elementId: string, property: keyof CSSProperties, tokenId: string) => void;
}
```

---

## 7. 구현 현황

### Phase 1 (구현 완료)

| 파일 | 상태 |
|------|------|
| `src/builder/panels/styles/hooks/useTransformValues.ts` | 구현됨 |
| `src/builder/panels/styles/hooks/useLayoutValues.ts` | 구현됨 |
| `src/builder/panels/styles/hooks/useAppearanceValues.ts` | 구현됨 |
| `src/builder/panels/styles/hooks/useTypographyValues.ts` | 구현됨 |
| `src/builder/panels/styles/hooks/useStyleActions.ts` | 구현됨 |
| `src/builder/panels/styles/hooks/useStyleSource.ts` | 구현됨 |
| `*Jotai.ts` 변형 파일들 | 구현됨 |

### Phase 2~4 (미구현)

| 파일 | 상태 |
|------|------|
| `src/stores/styleStore.ts` | 미구현 |
| `src/builder/panels/styles/utils/tokenResolver.ts` | 미구현 |
| `src/builder/export/atomicCssGenerator.ts` | 미구현 |
| `src/builder/export/cssVariableGenerator.ts` | 미구현 |
| `src/types/theme/tokenHierarchy.ts` | 미구현 |
| `src/types/theme/multiMode.ts` | 미구현 |

---

## 8. 예상 성능 지표

| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 스타일 재계산 (속성 수) | 28개 | 4-11개 | 75% |
| Section 리렌더링 | 4개 | 1개 | 75% |
| 토큰 해석 시간 | N/A | <1ms (캐시) | - |
| CSS 변환 시간 | ~5ms | <1ms (캐시) | 80% |
| 메모리 사용량 | 무제한 | <50MB | 관리됨 |
| CSS 번들 크기 | 인라인 | Atomic | 50-70% |
