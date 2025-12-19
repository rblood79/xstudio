# 완성형 스타일 시스템 아키텍처

> **목표**: 더 이상 개선이 필요없는 엔터프라이즈급 스타일 시스템

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

## 2. Token Layer (디자인 토큰 시스템)

### 2.1 3-Layer Token Hierarchy

```typescript
// src/types/theme/tokenHierarchy.ts

/**
 * Token Scope: Figma의 3-Layer 모델 구현
 */
export type TokenScope = 'primitive' | 'semantic' | 'component';

/**
 * Primitive Token: 원시값 (절대값)
 * - color.blue.500 → #3b82f6
 * - spacing.4 → 16px
 */
export interface PrimitiveToken {
  scope: 'primitive';
  value: TokenValue;  // 실제 값
}

/**
 * Semantic Token: 의미 기반 (Primitive 참조)
 * - color.interactive.primary → {ref: 'color.blue.500'}
 * - spacing.component.padding → {ref: 'spacing.4'}
 */
export interface SemanticToken {
  scope: 'semantic';
  value: TokenReference;
  fallback?: TokenValue;
}

/**
 * Component Token: 컴포넌트별 (Semantic 참조)
 * - Button.primary.background → {ref: 'color.interactive.primary'}
 * - Input.error.border → {ref: 'color.status.error'}
 */
export interface ComponentToken {
  scope: 'component';
  value: TokenReference;
  component_type: string;
  property: string;
}

/**
 * Token Reference: 다른 토큰 참조
 */
export interface TokenReference {
  ref: string;  // 참조할 토큰 ID
}

/**
 * Enhanced Design Token
 */
export interface EnhancedToken extends DesignToken {
  scope: TokenScope;
  references?: TokenReference[];  // 이 토큰을 참조하는 토큰들
  used_by?: ComponentUsage[];     // 어느 컴포넌트가 사용 중인지
}

export interface ComponentUsage {
  component_type: string;
  property: string;
  element_ids: string[];
}
```

### 2.2 Multi-Mode System (Light/Dark/Custom)

```typescript
// src/types/theme/multiMode.ts

/**
 * Token Mode: 테마 모드별 값 오버라이드
 */
export type TokenMode = 'light' | 'dark' | 'high-contrast' | string;

/**
 * Mode-specific Token Values
 */
export interface ModeValues {
  light: TokenValue;
  dark: TokenValue;
  'high-contrast'?: TokenValue;
  [customMode: string]: TokenValue | undefined;
}

/**
 * Multi-Mode Token
 */
export interface MultiModeToken extends EnhancedToken {
  modes: ModeValues;
  default_mode: TokenMode;
}

/**
 * Token Collection: 관련 토큰 그룹
 */
export interface TokenCollection {
  id: string;
  name: string;
  description?: string;
  tokens: string[];  // token IDs
  modes: TokenMode[];
  default_mode: TokenMode;
}

/**
 * Theme Configuration
 */
export interface ThemeConfig {
  id: string;
  name: string;
  collections: TokenCollection[];
  active_mode: TokenMode;
  supports_system_preference: boolean;  // prefers-color-scheme 지원
}
```

### 2.3 Token Resolution Engine

```typescript
// src/builder/panels/styles/utils/tokenResolver.ts

/**
 * Token Resolution Cache
 */
interface ResolvedTokenCache {
  token: EnhancedToken;
  resolved_value: TokenValue;
  mode: TokenMode;
  timestamp: number;
  dependencies: string[];  // 의존하는 토큰 ID 목록
}

/**
 * Token Resolver: 참조 체인을 따라 최종값 해석
 */
export class TokenResolver {
  private cache: Map<string, ResolvedTokenCache> = new Map();
  private maxDepth = 10;  // 순환 참조 방지

  /**
   * 토큰 해석: 참조 체인을 따라 최종값 반환
   */
  resolve(tokenId: string, mode: TokenMode = 'light'): TokenValue {
    const cacheKey = `${tokenId}:${mode}`;
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isStale(cached)) {
      return cached.resolved_value;
    }

    const resolved = this.resolveInternal(tokenId, mode, 0, []);
    this.cache.set(cacheKey, {
      token: this.getToken(tokenId),
      resolved_value: resolved.value,
      mode,
      timestamp: Date.now(),
      dependencies: resolved.dependencies,
    });

    return resolved.value;
  }

  /**
   * 내부 해석 (재귀)
   */
  private resolveInternal(
    tokenId: string,
    mode: TokenMode,
    depth: number,
    visited: string[]
  ): { value: TokenValue; dependencies: string[] } {
    // 순환 참조 감지
    if (visited.includes(tokenId)) {
      throw new Error(`Circular reference detected: ${visited.join(' → ')} → ${tokenId}`);
    }
    if (depth > this.maxDepth) {
      throw new Error(`Max reference depth exceeded for token: ${tokenId}`);
    }

    const token = this.getToken(tokenId);
    const dependencies: string[] = [];

    // Mode-specific value 확인
    if (isMultiModeToken(token) && token.modes[mode]) {
      const modeValue = token.modes[mode];
      if (isTokenReference(modeValue)) {
        dependencies.push(modeValue.ref);
        const resolved = this.resolveInternal(
          modeValue.ref,
          mode,
          depth + 1,
          [...visited, tokenId]
        );
        return { value: resolved.value, dependencies: [...dependencies, ...resolved.dependencies] };
      }
      return { value: modeValue, dependencies };
    }

    // 일반 값 또는 참조
    if (isTokenReference(token.value)) {
      dependencies.push(token.value.ref);
      const resolved = this.resolveInternal(
        token.value.ref,
        mode,
        depth + 1,
        [...visited, tokenId]
      );
      return { value: resolved.value, dependencies: [...dependencies, ...resolved.dependencies] };
    }

    return { value: token.value, dependencies };
  }

  /**
   * 토큰 변경 시 의존 캐시 무효화
   */
  invalidate(tokenId: string): void {
    // 이 토큰을 참조하는 모든 캐시 무효화
    for (const [key, cached] of this.cache.entries()) {
      if (cached.dependencies.includes(tokenId) || key.startsWith(`${tokenId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const tokenResolver = new TokenResolver();
```

---

## 3. Style Layer (스타일 관리 시스템)

### 3.1 Sectional Style Hooks

```typescript
// src/builder/panels/styles/hooks/index.ts

/**
 * 섹션별 분리된 스타일 훅
 * - 각 섹션이 필요한 속성만 계산
 * - 독립적인 메모이제이션
 */

// Transform Section (4개 속성)
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

// Layout Section (16개 속성)
export interface LayoutStyleValues {
  display: string;
  flexDirection: string;
  flexWrap: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

export function useLayoutValues(element: SelectedElement | null): LayoutStyleValues | null {
  return useMemo(() => {
    if (!element) return null;
    return {
      display: getStyleValue(element, 'display', 'block'),
      flexDirection: getStyleValue(element, 'flexDirection', 'row'),
      flexWrap: getStyleValue(element, 'flexWrap', 'nowrap'),
      alignItems: getStyleValue(element, 'alignItems', ''),
      justifyContent: getStyleValue(element, 'justifyContent', ''),
      gap: getStyleValue(element, 'gap', '0px'),
      padding: getStyleValue(element, 'padding', '0px'),
      paddingTop: getStyleValue(element, 'paddingTop', ''),
      paddingRight: getStyleValue(element, 'paddingRight', ''),
      paddingBottom: getStyleValue(element, 'paddingBottom', ''),
      paddingLeft: getStyleValue(element, 'paddingLeft', ''),
      margin: getStyleValue(element, 'margin', '0px'),
      marginTop: getStyleValue(element, 'marginTop', ''),
      marginRight: getStyleValue(element, 'marginRight', ''),
      marginBottom: getStyleValue(element, 'marginBottom', ''),
      marginLeft: getStyleValue(element, 'marginLeft', ''),
    };
  }, [element?.id, element?.style]);
}

// Appearance Section (5개 속성)
export interface AppearanceStyleValues {
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  borderStyle: string;
  opacity: string;
  boxShadow: string;
}

export function useAppearanceValues(element: SelectedElement | null): AppearanceStyleValues | null {
  return useMemo(() => {
    if (!element) return null;
    return {
      backgroundColor: getStyleValue(element, 'backgroundColor', '#FFFFFF'),
      borderColor: getStyleValue(element, 'borderColor', '#000000'),
      borderWidth: getStyleValue(element, 'borderWidth', '0px'),
      borderRadius: getStyleValue(element, 'borderRadius', '0px'),
      borderStyle: getStyleValue(element, 'borderStyle', 'solid'),
      opacity: getStyleValue(element, 'opacity', '1'),
      boxShadow: getStyleValue(element, 'boxShadow', 'none'),
    };
  }, [element?.id, element?.style?.backgroundColor, element?.style?.borderColor,
      element?.style?.borderWidth, element?.style?.borderRadius, element?.style?.borderStyle,
      element?.style?.opacity, element?.style?.boxShadow]);
}

// Typography Section (11개 속성)
export interface TypographyStyleValues {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;
  verticalAlign: string;
}

export function useTypographyValues(element: SelectedElement | null): TypographyStyleValues | null {
  return useMemo(() => {
    if (!element) return null;
    return {
      fontFamily: getStyleValue(element, 'fontFamily', 'Pretendard'),
      fontSize: getStyleValue(element, 'fontSize', '16px'),
      fontWeight: getStyleValue(element, 'fontWeight', 'normal'),
      fontStyle: getStyleValue(element, 'fontStyle', 'normal'),
      lineHeight: getStyleValue(element, 'lineHeight', 'normal'),
      letterSpacing: getStyleValue(element, 'letterSpacing', 'normal'),
      color: getStyleValue(element, 'color', '#000000'),
      textAlign: getStyleValue(element, 'textAlign', 'left'),
      textDecoration: getStyleValue(element, 'textDecoration', 'none'),
      textTransform: getStyleValue(element, 'textTransform', 'none'),
      verticalAlign: getStyleValue(element, 'verticalAlign', 'baseline'),
    };
  }, [element?.id, element?.style?.fontFamily, element?.style?.fontSize,
      element?.style?.fontWeight, element?.style?.fontStyle, element?.style?.lineHeight,
      element?.style?.letterSpacing, element?.style?.color, element?.style?.textAlign,
      element?.style?.textDecoration, element?.style?.textTransform, element?.style?.verticalAlign]);
}
```

### 3.2 Enhanced Style Actions

```typescript
// src/builder/panels/styles/hooks/useStyleActions.ts

export interface StyleActionsReturn {
  // 기본 업데이트
  updateStyle: (property: keyof CSSProperties, value: string) => void;
  updateStyles: (styles: Partial<CSSProperties>) => void;
  resetStyles: (properties: (keyof CSSProperties)[]) => void;

  // 토큰 연동
  applyToken: (property: keyof CSSProperties, tokenId: string) => void;
  detachToken: (property: keyof CSSProperties) => void;

  // Flex 핸들러
  handleFlexDirection: (value: string) => void;
  handleFlexAlignment: (position: string, flexDirection: string) => void;
  handleJustifyContentSpacing: (value: string) => void;
  handleFlexWrap: (value: string) => void;

  // 클립보드
  copyStyles: (styles: CSSProperties) => Promise<void>;
  pasteStyles: () => Promise<void>;

  // 배치 처리
  batchUpdate: (updates: StyleUpdate[]) => void;
}

export interface StyleUpdate {
  property: keyof CSSProperties;
  value: string;
  tokenId?: string;  // 토큰 연결 시
}

export function useStyleActions(): StyleActionsReturn {
  const tokenResolver = useTokenResolver();

  const updateStyle = useCallback((property: keyof CSSProperties, value: string) => {
    useStore.getState().updateSelectedStyle(property, value);
  }, []);

  const applyToken = useCallback((property: keyof CSSProperties, tokenId: string) => {
    const resolvedValue = tokenResolver.resolve(tokenId);
    const cssValue = tokenValueToCSS(resolvedValue);

    // 스타일 업데이트 + 토큰 바인딩 저장
    useStore.getState().updateSelectedStyleWithToken(property, cssValue, tokenId);
  }, [tokenResolver]);

  const batchUpdate = useCallback((updates: StyleUpdate[]) => {
    const styleUpdates: Partial<CSSProperties> = {};
    const tokenBindings: Record<string, string> = {};

    for (const update of updates) {
      if (update.tokenId) {
        const resolvedValue = tokenResolver.resolve(update.tokenId);
        styleUpdates[update.property] = tokenValueToCSS(resolvedValue);
        tokenBindings[update.property] = update.tokenId;
      } else {
        styleUpdates[update.property] = update.value;
      }
    }

    useStore.getState().batchUpdateStyles(styleUpdates, tokenBindings);
  }, [tokenResolver]);

  // ... 나머지 핸들러들
}
```

### 3.3 Style Source Tracking (Enhanced)

```typescript
// src/builder/panels/styles/hooks/useStyleSource.ts

/**
 * Enhanced Style Source: 토큰 참조 추적 포함
 */
export interface EnhancedStyleSource {
  type: 'token' | 'inline' | 'computed' | 'inherited' | 'default';
  location: string;
  tokenId?: string;
  tokenName?: string;
  tokenScope?: TokenScope;
  overridden_by?: string;  // 이 값을 오버라이드한 출처
}

/**
 * Cascade Info: 스타일 상속 체인
 */
export interface CascadeInfo {
  winner: EnhancedStyleSource;
  chain: EnhancedStyleSource[];
}

export function getEnhancedStyleSource(
  element: SelectedElement | null,
  property: keyof CSSProperties
): CascadeInfo {
  const chain: EnhancedStyleSource[] = [];

  if (!element) {
    return {
      winner: { type: 'default', location: 'component-default' },
      chain: [{ type: 'default', location: 'component-default' }],
    };
  }

  // 1. Token binding 확인
  const tokenBinding = element.tokenBindings?.[property];
  if (tokenBinding) {
    const token = getToken(tokenBinding);
    chain.push({
      type: 'token',
      location: token?.name || tokenBinding,
      tokenId: tokenBinding,
      tokenName: token?.name,
      tokenScope: token?.scope,
    });
  }

  // 2. Inline style 확인
  if (element.style?.[property] !== undefined) {
    const inlineSource: EnhancedStyleSource = {
      type: 'inline',
      location: 'user-set',
    };
    if (tokenBinding) {
      inlineSource.overridden_by = 'token';
    }
    chain.push(inlineSource);
  }

  // 3. Computed style 확인
  if (element.computedStyle?.[property] !== undefined) {
    chain.push({
      type: 'computed',
      location: element.className || 'css-class',
    });
  }

  // 4. Inherited 확인 (부모 요소)
  if (element.inheritedStyles?.[property] !== undefined) {
    chain.push({
      type: 'inherited',
      location: element.parentId || 'parent',
    });
  }

  // 5. Default
  chain.push({
    type: 'default',
    location: 'component-default',
  });

  return {
    winner: chain[0],
    chain,
  };
}
```

---

## 4. Canvas Layer (렌더링 시스템)

### 4.1 Cached Style Converter

```typescript
// src/builder/workspace/canvas/sprites/styleConverter.ts

/**
 * Style Conversion Cache
 * - 동일한 스타일 객체에 대해 변환 결과 캐싱
 * - LRU 캐시로 메모리 관리
 */
class StyleConversionCache {
  private cache: Map<string, { result: ConvertedStyle; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttl = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(style: CSSStyle): ConvertedStyle | null {
    const key = this.getKey(style);
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  set(style: CSSStyle, result: ConvertedStyle): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const key = this.getKey(style);
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  private getKey(style: CSSStyle): string {
    return JSON.stringify(style);
  }

  clear(): void {
    this.cache.clear();
  }
}

const conversionCache = new StyleConversionCache();

/**
 * Cached Style Conversion
 */
export function convertStyleCached(style: CSSStyle | undefined): ConvertedStyle {
  if (!style) {
    return {
      transform: { x: 0, y: 0, width: 100, height: 100 },
      fill: { color: 0xffffff, alpha: 1 },
      stroke: null,
      text: DEFAULT_TEXT_STYLE,
      borderRadius: 0,
    };
  }

  const cached = conversionCache.get(style);
  if (cached) return cached;

  const result = convertStyleInternal(style);
  conversionCache.set(style, result);
  return result;
}

/**
 * Token-aware Style Conversion
 */
export function convertStyleWithTokens(
  style: CSSStyle | undefined,
  tokenBindings: Record<string, string> | undefined,
  mode: TokenMode = 'light'
): ConvertedStyle {
  if (!style) return convertStyleCached(undefined);

  // 토큰 바인딩이 있으면 토큰 값으로 대체
  if (tokenBindings && Object.keys(tokenBindings).length > 0) {
    const resolvedStyle = { ...style };

    for (const [property, tokenId] of Object.entries(tokenBindings)) {
      const resolvedValue = tokenResolver.resolve(tokenId, mode);
      resolvedStyle[property as keyof CSSStyle] = tokenValueToCSS(resolvedValue);
    }

    return convertStyleInternal(resolvedStyle);
  }

  return convertStyleCached(style);
}
```

### 4.2 Optimized Sprite Components

```typescript
// src/builder/workspace/canvas/sprites/TextSprite.tsx

export const TextSprite = memo(function TextSprite({ element, onClick, onDoubleClick }: TextSpriteProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const tokenBindings = element.tokenBindings;
  const mode = useThemeMode();

  // Token-aware style conversion with caching
  const converted = useMemo(
    () => convertStyleWithTokens(style, tokenBindings, mode),
    [style, tokenBindings, mode]
  );

  const { transform, text: textStyle, borderRadius, fill } = converted;

  // Text transform application
  const content = element.content || '';
  const displayText = useMemo(
    () => applyTextTransform(content, style?.textTransform),
    [content, style?.textTransform]
  );

  // PixiJS text style object (cached)
  const pixiTextStyle = useMemo(
    () => new TextStyle(textStyle),
    [textStyle]
  );

  // ... 렌더링 로직
}, (prev, next) => {
  // Deep comparison for style changes
  return (
    prev.element.id === next.element.id &&
    prev.element.props?.style === next.element.props?.style &&
    prev.element.tokenBindings === next.element.tokenBindings &&
    prev.element.content === next.element.content
  );
});
```

---

## 5. Export Layer (CSS 출력 시스템)

### 5.1 Atomic CSS Generator

```typescript
// src/builder/export/atomicCssGenerator.ts

/**
 * Atomic CSS Rule
 */
export interface AtomicRule {
  className: string;
  declarations: string;
  hash: string;
  usageCount: number;
}

/**
 * Atomic CSS Generator
 * - 각 CSS 속성을 개별 클래스로 변환
 * - 중복 제거 및 재사용
 */
export class AtomicCssGenerator {
  private rules: Map<string, AtomicRule> = new Map();
  private hashToClass: Map<string, string> = new Map();
  private classCounter = 0;

  /**
   * 스타일 객체를 Atomic classes로 변환
   */
  generate(style: CSSProperties): string[] {
    const classes: string[] = [];

    for (const [property, value] of Object.entries(style)) {
      if (value === undefined || value === null) continue;

      const declaration = `${kebabCase(property)}:${value}`;
      const hash = this.hash(declaration);

      if (this.hashToClass.has(hash)) {
        // 기존 클래스 재사용
        const existingClass = this.hashToClass.get(hash)!;
        this.rules.get(existingClass)!.usageCount++;
        classes.push(existingClass);
      } else {
        // 새 클래스 생성
        const className = this.generateClassName(property, value);
        const rule: AtomicRule = {
          className,
          declarations: declaration,
          hash,
          usageCount: 1,
        };
        this.rules.set(className, rule);
        this.hashToClass.set(hash, className);
        classes.push(className);
      }
    }

    return classes;
  }

  /**
   * 최종 CSS 문자열 생성
   */
  compile(): string {
    const sortedRules = Array.from(this.rules.values())
      .sort((a, b) => b.usageCount - a.usageCount);  // 사용 빈도순 정렬

    return sortedRules
      .map(rule => `.${rule.className}{${rule.declarations}}`)
      .join('\n');
  }

  /**
   * 클래스명 생성 전략
   */
  private generateClassName(property: string, value: string): string {
    // 짧은 약어 사용
    const propertyAbbr = PROPERTY_ABBREVIATIONS[property] || property.slice(0, 3);
    const valueHash = this.hash(value).slice(0, 4);
    return `${propertyAbbr}-${valueHash}`;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

const PROPERTY_ABBREVIATIONS: Record<string, string> = {
  width: 'w',
  height: 'h',
  backgroundColor: 'bg',
  borderRadius: 'br',
  fontSize: 'fs',
  fontWeight: 'fw',
  color: 'c',
  padding: 'p',
  paddingTop: 'pt',
  paddingRight: 'pr',
  paddingBottom: 'pb',
  paddingLeft: 'pl',
  margin: 'm',
  marginTop: 'mt',
  marginRight: 'mr',
  marginBottom: 'mb',
  marginLeft: 'ml',
  display: 'd',
  flexDirection: 'fd',
  alignItems: 'ai',
  justifyContent: 'jc',
  gap: 'g',
};
```

### 5.2 CSS Variable Generator

```typescript
// src/builder/export/cssVariableGenerator.ts

/**
 * Design Token → CSS Variable 변환
 */
export function generateCSSVariables(
  tokens: EnhancedToken[],
  mode: TokenMode = 'light'
): string {
  const lines: string[] = [':root {'];

  for (const token of tokens) {
    const varName = tokenToCSSVarName(token.name);
    const value = isMultiModeToken(token)
      ? tokenValueToCSS(token.modes[mode])
      : tokenValueToCSS(token.value);

    lines.push(`  ${varName}: ${value};`);
  }

  lines.push('}');

  // Dark mode
  const darkModeTokens = tokens.filter(t => isMultiModeToken(t) && t.modes.dark);
  if (darkModeTokens.length > 0) {
    lines.push('');
    lines.push('@media (prefers-color-scheme: dark) {');
    lines.push('  :root {');
    for (const token of darkModeTokens) {
      const varName = tokenToCSSVarName(token.name);
      const value = tokenValueToCSS((token as MultiModeToken).modes.dark);
      lines.push(`    ${varName}: ${value};`);
    }
    lines.push('  }');
    lines.push('}');
  }

  return lines.join('\n');
}

/**
 * Token name → CSS variable name
 * "color.brand.primary" → "--color-brand-primary"
 */
function tokenToCSSVarName(name: string): string {
  return `--${name.replace(/\./g, '-')}`;
}

/**
 * Token value → CSS value
 */
function tokenValueToCSS(value: TokenValue): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `${value}px`;

  if (isColorValueHSL(value)) {
    return `hsla(${value.h}, ${value.s}%, ${value.l}%, ${value.a})`;
  }
  if (isColorValueRGB(value)) {
    return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a})`;
  }
  if (isTypographyValue(value)) {
    return `${value.fontWeight} ${value.fontSize}/${value.lineHeight} ${value.fontFamily}`;
  }
  if (isShadowValue(value)) {
    return `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread} ${value.color}`;
  }
  if (isBorderValue(value)) {
    return `${value.width} ${value.style} ${value.color}`;
  }
  if (isMotionValue(value)) {
    return `${value.duration} ${value.easing}${value.delay ? ` ${value.delay}` : ''}`;
  }

  return String(value);
}
```

---

## 6. Store Architecture

### 6.1 Unified Style Store

```typescript
// src/stores/styleStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface StyleState {
  // Token System
  tokens: Map<string, EnhancedToken>;
  collections: Map<string, TokenCollection>;
  activeMode: TokenMode;

  // Element Styles
  elementStyles: Map<string, CSSProperties>;
  elementTokenBindings: Map<string, Record<string, string>>;

  // Computed Cache
  resolvedTokenCache: Map<string, TokenValue>;
  convertedStyleCache: Map<string, ConvertedStyle>;

  // Actions
  setToken: (token: EnhancedToken) => void;
  deleteToken: (tokenId: string) => void;
  setActiveMode: (mode: TokenMode) => void;

  updateElementStyle: (elementId: string, property: keyof CSSProperties, value: string) => void;
  updateElementStyles: (elementId: string, styles: Partial<CSSProperties>) => void;
  bindTokenToElement: (elementId: string, property: keyof CSSProperties, tokenId: string) => void;
  unbindTokenFromElement: (elementId: string, property: keyof CSSProperties) => void;

  // Cache Management
  invalidateTokenCache: (tokenId: string) => void;
  invalidateStyleCache: (elementId: string) => void;
  clearAllCaches: () => void;
}

export const useStyleStore = create<StyleState>()(
  subscribeWithSelector((set, get) => ({
    tokens: new Map(),
    collections: new Map(),
    activeMode: 'light',
    elementStyles: new Map(),
    elementTokenBindings: new Map(),
    resolvedTokenCache: new Map(),
    convertedStyleCache: new Map(),

    setToken: (token) => {
      set((state) => {
        const newTokens = new Map(state.tokens);
        newTokens.set(token.id, token);
        return { tokens: newTokens };
      });
      // 이 토큰에 의존하는 캐시 무효화
      get().invalidateTokenCache(token.id);
    },

    setActiveMode: (mode) => {
      set({ activeMode: mode });
      // 모든 토큰 캐시 무효화
      get().clearAllCaches();
    },

    bindTokenToElement: (elementId, property, tokenId) => {
      set((state) => {
        const bindings = new Map(state.elementTokenBindings);
        const elementBindings = { ...(bindings.get(elementId) || {}), [property]: tokenId };
        bindings.set(elementId, elementBindings);
        return { elementTokenBindings: bindings };
      });
      // 요소 스타일 캐시 무효화
      get().invalidateStyleCache(elementId);
    },

    invalidateTokenCache: (tokenId) => {
      set((state) => {
        const newCache = new Map(state.resolvedTokenCache);
        // 이 토큰을 참조하는 모든 캐시 엔트리 삭제
        for (const [key] of newCache) {
          if (key.includes(tokenId)) {
            newCache.delete(key);
          }
        }
        return { resolvedTokenCache: newCache };
      });
    },

    // ... 나머지 액션들
  }))
);
```

### 6.2 Optimized Selectors

```typescript
// src/stores/styleSelectors.ts

import { useStyleStore } from './styleStore';
import { shallow } from 'zustand/shallow';

/**
 * 개별 토큰 선택자
 */
export const useToken = (tokenId: string) =>
  useStyleStore((state) => state.tokens.get(tokenId));

/**
 * 카테고리별 토큰 선택자
 */
export const useTokensByCategory = (category: string) =>
  useStyleStore(
    (state) => Array.from(state.tokens.values()).filter(t => t.name.startsWith(category)),
    shallow
  );

/**
 * 요소 스타일 선택자
 */
export const useElementStyle = (elementId: string) =>
  useStyleStore((state) => state.elementStyles.get(elementId));

/**
 * 요소 토큰 바인딩 선택자
 */
export const useElementTokenBindings = (elementId: string) =>
  useStyleStore((state) => state.elementTokenBindings.get(elementId));

/**
 * 현재 모드 선택자
 */
export const useActiveMode = () =>
  useStyleStore((state) => state.activeMode);

/**
 * 해석된 토큰 값 선택자 (캐시 활용)
 */
export const useResolvedToken = (tokenId: string) => {
  const token = useToken(tokenId);
  const mode = useActiveMode();
  const cached = useStyleStore((state) =>
    state.resolvedTokenCache.get(`${tokenId}:${mode}`)
  );

  if (cached) return cached;
  if (!token) return null;

  // 캐시 미스 시 해석
  const resolved = tokenResolver.resolve(tokenId, mode);
  useStyleStore.getState().resolvedTokenCache.set(`${tokenId}:${mode}`, resolved);
  return resolved;
};
```

---

## 7. 성능 최적화 전략

### 7.1 메모리 관리

```typescript
// src/utils/cacheManager.ts

/**
 * 전역 캐시 매니저
 * - 메모리 사용량 모니터링
 * - LRU 기반 자동 정리
 * - 주기적 GC
 */
export class CacheManager {
  private caches: Map<string, CacheInstance> = new Map();
  private memoryLimit: number;
  private gcInterval: number;

  constructor(memoryLimit = 50 * 1024 * 1024, gcInterval = 60000) {
    this.memoryLimit = memoryLimit;
    this.gcInterval = gcInterval;
    this.startGC();
  }

  register(name: string, cache: CacheInstance): void {
    this.caches.set(name, cache);
  }

  private startGC(): void {
    setInterval(() => {
      const totalSize = this.getTotalSize();
      if (totalSize > this.memoryLimit) {
        this.evict(totalSize - this.memoryLimit);
      }
    }, this.gcInterval);
  }

  private getTotalSize(): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      total += cache.getSize();
    }
    return total;
  }

  private evict(bytesToFree: number): void {
    let freed = 0;
    for (const cache of this.caches.values()) {
      if (freed >= bytesToFree) break;
      freed += cache.evictOldest(bytesToFree - freed);
    }
  }
}

export const cacheManager = new CacheManager();
```

### 7.2 렌더링 최적화

```typescript
// src/builder/workspace/canvas/utils/renderOptimizer.ts

/**
 * 배치 렌더링 스케줄러
 * - 여러 스타일 변경을 하나의 렌더 사이클로 배치
 * - requestAnimationFrame 활용
 */
export class RenderScheduler {
  private pendingUpdates: Map<string, ConvertedStyle> = new Map();
  private rafId: number | null = null;

  scheduleUpdate(elementId: string, style: ConvertedStyle): void {
    this.pendingUpdates.set(elementId, style);

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    const updates = new Map(this.pendingUpdates);
    this.pendingUpdates.clear();
    this.rafId = null;

    // 배치 렌더링
    for (const [elementId, style] of updates) {
      applyStyleToSprite(elementId, style);
    }
  }
}

export const renderScheduler = new RenderScheduler();
```

---

## 8. 데이터 흐름 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐                                                            │
│   │   Token     │──────────┐                                                 │
│   │   Panel     │          │                                                 │
│   └─────────────┘          │                                                 │
│         │                  ▼                                                 │
│         │           ┌─────────────┐    ┌─────────────┐                       │
│         │           │   Token     │───▶│   Token     │                       │
│         │           │   Store     │    │   Resolver  │                       │
│         │           └─────────────┘    └─────────────┘                       │
│         │                  │                  │                              │
│         │                  │                  ▼                              │
│         │                  │           ┌─────────────┐                       │
│         │                  │           │   Resolved  │                       │
│         │                  │           │   Cache     │                       │
│         │                  │           └─────────────┘                       │
│         │                  │                  │                              │
│   ┌─────▼─────┐            │                  │                              │
│   │   Style   │────────────┼──────────────────┤                              │
│   │   Panel   │            │                  │                              │
│   └───────────┘            │                  │                              │
│         │                  ▼                  ▼                              │
│         │           ┌─────────────┐    ┌─────────────┐                       │
│         └──────────▶│   Builder   │───▶│   Style     │                       │
│                     │   Store     │    │   Converter │                       │
│                     └─────────────┘    └─────────────┘                       │
│                            │                  │                              │
│                            │                  ▼                              │
│                            │           ┌─────────────┐                       │
│                            │           │   Convert   │                       │
│                            │           │   Cache     │                       │
│                            │           └─────────────┘                       │
│                            │                  │                              │
│                            ▼                  ▼                              │
│                     ┌─────────────┐    ┌─────────────┐                       │
│                     │   Element   │───▶│   PixiJS    │                       │
│                     │   Sprites   │    │   Renderer  │                       │
│                     └─────────────┘    └─────────────┘                       │
│                            │                  │                              │
│                            ▼                  ▼                              │
│                     ┌─────────────────────────────────┐                      │
│                     │         WebGL Canvas            │                      │
│                     └─────────────────────────────────┘                      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. 파일 구조

```
src/
├── types/
│   └── theme/
│       ├── index.ts                    # 기존 (확장)
│       ├── tokenHierarchy.ts           # 신규: 3-Layer 토큰
│       └── multiMode.ts                # 신규: Multi-Mode
│
├── stores/
│   ├── styleStore.ts                   # 신규: 통합 스타일 스토어
│   └── styleSelectors.ts               # 신규: 최적화된 선택자
│
├── builder/
│   └── panels/
│       └── styles/
│           ├── hooks/
│           │   ├── useTransformValues.ts   # 신규
│           │   ├── useLayoutValues.ts      # 신규
│           │   ├── useAppearanceValues.ts  # 신규
│           │   ├── useTypographyValues.ts  # 신규
│           │   ├── useStyleActions.ts      # 수정: 토큰 연동
│           │   ├── useStyleSource.ts       # 수정: Enhanced
│           │   └── useStyleValues.ts       # @deprecated
│           │
│           └── utils/
│               ├── tokenResolver.ts        # 신규
│               └── styleValueTypes.ts      # 신규
│
├── builder/
│   └── workspace/
│       └── canvas/
│           └── sprites/
│               ├── styleConverter.ts       # 수정: 캐싱 추가
│               └── TextSprite.tsx          # 수정: 토큰 연동
│
├── builder/
│   └── export/
│       ├── atomicCssGenerator.ts           # 신규
│       └── cssVariableGenerator.ts         # 신규
│
└── utils/
    ├── cacheManager.ts                     # 신규
    └── renderOptimizer.ts                  # 신규
```

---

## 10. 구현 우선순위

### Phase 1: 기반 구축 (1-2주)
1. ✅ `styleValueTypes.ts` - 섹션별 타입 정의
2. ✅ `useTransformValues.ts` - Transform 훅
3. ✅ `useLayoutValues.ts` - Layout 훅
4. ✅ `useAppearanceValues.ts` - Appearance 훅
5. ✅ `useTypographyValues.ts` - Typography 훅
6. ✅ Section 컴포넌트 마이그레이션
7. ✅ `useStyleValues.ts` @deprecated

### Phase 2: 토큰 시스템 (2-3주)
1. `tokenHierarchy.ts` - 3-Layer 타입
2. `multiMode.ts` - Multi-Mode 타입
3. `tokenResolver.ts` - 해석 엔진
4. `styleStore.ts` - 통합 스토어
5. `useStyleActions.ts` - 토큰 바인딩

### Phase 3: 캐싱 최적화 (1-2주)
1. `styleConverter.ts` - 캐싱 추가
2. `cacheManager.ts` - 메모리 관리
3. `renderOptimizer.ts` - 배치 렌더링
4. 성능 측정 및 튜닝

### Phase 4: 내보내기 (1-2주)
1. `atomicCssGenerator.ts` - Atomic CSS
2. `cssVariableGenerator.ts` - CSS 변수
3. 빌드 시스템 통합

---

## 11. 예상 성능 지표

| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| 스타일 재계산 (속성 수) | 28개 | 4-11개 | 75% |
| Section 리렌더링 | 4개 | 1개 | 75% |
| 토큰 해석 시간 | N/A | <1ms (캐시) | - |
| CSS 변환 시간 | ~5ms | <1ms (캐시) | 80% |
| 메모리 사용량 | 무제한 | <50MB | 관리됨 |
| CSS 번들 크기 | 인라인 | Atomic | 50-70% |

---

## 12. 결론

이 완성형 스타일 시스템은:

1. **Token Layer**: Figma 수준의 3-Layer 토큰 + Multi-Mode
2. **Style Layer**: 섹션별 분할 + 향상된 액션 + 출처 추적
3. **Canvas Layer**: 캐시된 변환 + 토큰 연동
4. **Export Layer**: Atomic CSS + CSS 변수 생성

모든 계층에서 **캐싱**, **메모이제이션**, **배치 처리**를 적용하여
엔터프라이즈급 성능을 제공합니다.
