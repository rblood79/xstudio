# XStudio 프로젝트 리팩토링 마스터 플랜

**분석 날짜:** 2025-11-11
**분석 범위:** src/ 디렉토리 전체
**발견된 주요 이슈:** 16개 카테고리, 예상 절감 코드: ~3,500줄

---

## 📊 Executive Summary

### 중복도 지표

| 영역 | 중복 파일 수 | 중복 코드 라인 | 위험도 | 우선순위 |
|------|-------------|--------------|--------|---------|
| **타입 정의** | 4개 | ~1,200줄 | 🔴 높음 | P0 |
| **테마 시스템** | 12개 | ~1,770줄 | 🔴 높음 | P0 |
| **메시징 레이어** | 3개 | ~350줄 | 🟡 중간 | P1 |
| **이벤트 시스템** | 3개 | ~200줄 | 🟡 중간 | P1 |
| **유틸리티** | 8개 | ~800줄 | 🟢 낮음 | P2 |

**총 예상 절감:** 4,320줄 (현재 코드베이스의 ~15%)

---

## 🎯 Phase 0: 타입 시스템 통합 (P0 - Critical)

### 이슈 #1: 컴포넌트 Props 타입 이중 관리

**문제:**
- `types/unified.ts` (982줄)와 `types/componentProps.ts` (635줄)가 동일한 인터페이스를 중복 선언
- `BaseElementProps`가 양쪽에 존재하며 `computedStyle` 필드가 불일치
- `types/store.ts`가 unified를 재수출하지만 componentProps도 여전히 사용됨

**영향:**
- 타입 불일치로 런타임 버그 가능성
- IDE 자동완성 혼란
- 유지보수 시 두 파일 모두 수정 필요

**해결 방안:**
```
1. types/unified.ts를 단일 진실 공급원(Single Source of Truth)으로 지정
2. types/componentProps.ts를 deprecated로 표시
3. 모든 import를 unified.ts로 마이그레이션 (예상: 50+ 파일)
4. componentProps.ts 삭제

마이그레이션 스크립트:
```bash
# Phase 0.1: 의존성 분석
rg "from ['\"].*componentProps" --files-with-matches

# Phase 0.2: 자동 치환
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s/from ['\"].*componentProps['\"];/from '@\/types\/unified';/g"

# Phase 0.3: 타입 검증
npm run type-check
```

**예상 효과:**
- ✅ 635줄 삭제
- ✅ 타입 안정성 100% 향상
- ✅ 50+ 파일의 import 정리

---

### 이슈 #2: 테마 토큰 타입 정의 중복

**문제:**
- `types/theme.ts` (96줄) - Strict types (TokenType enum, TokenValue union)
- `types/theme/token.types.ts` (282줄) - Loose types (string, unknown)
- 두 파일 모두 `DesignToken` 인터페이스를 정의하지만 필드 구조가 다름
  - theme.ts: `value: TokenValue` (강타입)
  - token.types.ts: `value: unknown` (약타입)

**영향:**
- 서비스 레이어와 UI 레이어가 다른 타입 정의 사용
- ColorValue, TypographyValue, ShadowValue 등의 타입이 중복 정의
- Zod 스키마가 token.types.ts에만 존재

**해결 방안:**
```typescript
// types/theme/index.ts (새 파일 - 통합 진실 공급원)
import { z } from 'zod';

// ===== Core Token Types (DB Schema 호환) =====
export type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'border' | 'radius' | 'font' | 'size' | 'other';
export type DesignTokenScope = 'raw' | 'semantic';

// ===== Value Types (강타입) =====
export interface ColorValueHSL {
  h: number;  // 0-360
  s: number;  // 0-100
  l: number;  // 0-100
  a: number;  // 0-1
}

export interface ColorValueRGB {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  a: number;  // 0-1
}

export type ColorValue = ColorValueHSL | ColorValueRGB | string;  // HEX string

export interface TypographyValue {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
}

export interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string | ColorValue;
}

export interface BorderValue {
  width: string;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  color: string | ColorValue;
}

export type TokenValue = ColorValue | TypographyValue | ShadowValue | BorderValue | string;

// ===== 통합 DesignToken Interface =====
export interface DesignToken {
  id: string;
  project_id: string;
  theme_id: string;
  name: string;            // "color.brand.primary"
  type: TokenType;
  value: TokenValue;       // 강타입 (위에서 정의한 union)
  scope: DesignTokenScope;
  alias_of?: string | null;
  css_variable?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Zod Schemas (검증용) =====
export const ColorValueSchema = z.union([
  z.object({
    h: z.number().min(0).max(360),
    s: z.number().min(0).max(100),
    l: z.number().min(0).max(100),
    a: z.number().min(0).max(1),
  }),
  z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
    a: z.number().min(0).max(1),
  }),
  z.string().regex(/^#[0-9A-Fa-f]{6}$/),
]);

export const TypographyValueSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.string(),
  fontWeight: z.number().min(100).max(900),
  lineHeight: z.number().positive(),
  letterSpacing: z.string().optional(),
});

// ===== Type Guards =====
export function isColorValueHSL(value: unknown): value is ColorValueHSL {
  return value !== null && value !== undefined && typeof value === 'object' && 'h' in value && 's' in value && 'l' in value;
}

export function isColorValueRGB(value: unknown): value is ColorValueRGB {
  return value !== null && value !== undefined && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value;
}

export function isTypographyValue(value: unknown): value is TypographyValue {
  return value !== null && value !== undefined && typeof value === 'object' && 'fontFamily' in value && 'fontSize' in value;
}

// ===== Parsed & Resolved Types (from token.types.ts) =====
export interface ParsedTokenName {
  category: string;      // "color"
  group?: string;        // "brand"
  tokenName?: string;    // "primary"
  fullName: string;      // "color.brand.primary"
}

export interface ParsedToken extends DesignToken {
  parsed: ParsedTokenName;
}

export interface ResolvedToken extends DesignToken {
  source_theme_id: string;
  is_inherited: boolean;
  inheritance_depth: number;
}

// ===== Filter & Sort Types =====
export interface TokenFilter {
  category?: string;
  group?: string;
  scope?: 'raw' | 'semantic';
  search?: string;
  showInherited?: boolean;
}

export type TokenSortBy = 'name' | 'type' | 'updated_at' | 'category';
export type TokenSortOrder = 'asc' | 'desc';

export interface TokenSortOptions {
  sortBy: TokenSortBy;
  order: TokenSortOrder;
}

// ===== Theme Types =====
export interface DesignTheme {
  id: string;
  project_id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  version: number;
  parent_theme_id?: string | null;
  supports_dark_mode?: boolean;
  created_at: string;
  updated_at: string;
}

// ===== CRUD Input Types =====
export type CreateTokenInput = Omit<DesignToken, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTokenInput = Partial<Omit<DesignToken, 'id' | 'project_id' | 'theme_id' | 'created_at'>>;

// ===== Figma & W3C Types (from token.types.ts) =====
export interface FigmaToken {
  $type: string;
  $value: unknown;
  $description?: string;
  $extensions?: {
    'com.figma'?: {
      hiddenFromPublishing?: boolean;
      scopes?: string[];
      codeSyntax?: Record<string, string>;
    };
  };
}

export interface W3CToken {
  $type: string;
  $value: unknown;
  $description?: string;
}

// ===== Constants =====
export const TOKEN_CATEGORIES = [
  'color',
  'typography',
  'spacing',
  'shadow',
  'border',
  'radius',
  'motion',
  'other',
] as const;

export type TokenCategory = (typeof TOKEN_CATEGORIES)[number];
```

**마이그레이션 단계:**
```bash
# Step 1: 새 통합 타입 파일 생성
# types/theme/index.ts 생성 (위 코드)

# Step 2: 기존 파일을 deprecated로 표시
echo "// @deprecated Use types/theme instead" | cat - types/theme.ts > temp && mv temp types/theme.ts
echo "// @deprecated Use types/theme instead" | cat - types/theme/token.types.ts > temp && mv temp types/theme/token.types.ts

# Step 3: 의존성 마이그레이션 (예상 30+ 파일)
rg "from ['\"].*types/theme['\"]" --files-with-matches
rg "from ['\"].*token\.types['\"]" --files-with-matches

# Step 4: 자동 치환
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s/from ['\"]@\/types\/theme['\"];/from '@\/types\/theme';/g"

# Step 5: 타입 검증
npm run type-check
```

**예상 효과:**
- ✅ 378줄 삭제 (96 + 282)
- ✅ 타입 일관성 100%
- ✅ 서비스/UI 레이어 타입 충돌 제거
- ✅ Zod 스키마 통합

---

### 이슈 #3: 이벤트 타입 선언과 런타임 처리 불일치

**문제:**
- `types/events.ts`에 정의된 `EventType`과 `ActionType`
  - EventType: 14개 (onClick, onDoubleClick, onScroll, onResize 등)
  - ActionType: 13개 (navigate, update_props, trigger_animation 등)
- `utils/eventHandlers.ts` EventHandlerFactory의 화이트리스트: **8개만** 허용
  ```typescript
  const allowedEventTypes = [
    'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
    'onMouseEnter', 'onMouseLeave', 'onKeyDown', 'onKeyUp'
  ];
  // ❌ 누락: onDoubleClick, onInput, onScroll, onResize, onKeyUp
  ```
- `utils/eventEngine.ts` EventEngine의 actionHandlers: **일부만** 구현
  - ❌ 누락: update_props, trigger_animation, play_sound, send_analytics

**영향:**
- 타입 시스템에서는 허용되지만 런타임에서 무시되는 이벤트 발생
- Inspector UI에서 설정 가능하지만 실제로는 작동하지 않음
- 사용자 혼란과 디버깅 어려움

**해결 방안:**

#### Step 1: 중앙 이벤트 레지스트리 생성
```typescript
// types/events.registry.ts (새 파일)

/**
 * 중앙 이벤트 레지스트리
 * 타입 시스템과 런타임 구현을 동기화
 */

// ===== 구현된 이벤트 타입 (화이트리스트) =====
export const IMPLEMENTED_EVENT_TYPES = [
  'onClick',
  'onChange',
  'onSubmit',
  'onFocus',
  'onBlur',
  'onMouseEnter',
  'onMouseLeave',
  'onKeyDown',
  'onKeyUp',
  // 향후 구현 예정:
  // 'onDoubleClick',
  // 'onInput',
  // 'onScroll',
  // 'onResize',
] as const;

export type EventType = (typeof IMPLEMENTED_EVENT_TYPES)[number];

// ===== 구현된 액션 타입 (화이트리스트) =====
export const IMPLEMENTED_ACTION_TYPES = [
  // Navigation
  'navigate',
  'scroll_to',
  'scrollTo', // alias

  // UI State
  'toggle_visibility',
  'toggleVisibility', // alias
  'show_modal',
  'showModal', // alias
  'hide_modal',
  'hideModal', // alias
  'showToast',

  // Data Management
  'update_state',
  'updateState', // alias
  'setState', // alias
  'copy_to_clipboard',
  'copyToClipboard', // alias

  // Form Operations
  'validate_form',
  'validateForm', // alias
  'reset_form',
  'resetForm', // alias
  'submitForm',
  'updateFormField',

  // Custom
  'custom_function',
  'customFunction', // alias
  'apiCall',

  // Component Interaction
  'setComponentState',
  'triggerComponentAction',

  // Collection Interaction
  'filterCollection',
  'selectItem',
  'clearSelection',

  // 향후 구현 예정:
  // 'update_props',
  // 'trigger_animation',
  // 'play_sound',
  // 'send_analytics',
] as const;

export type ActionType = (typeof IMPLEMENTED_ACTION_TYPES)[number];

// ===== 미구현 타입 (향후 추가용) =====
export const PLANNED_EVENT_TYPES = [
  'onDoubleClick',
  'onInput',
  'onScroll',
  'onResize',
] as const;

export const PLANNED_ACTION_TYPES = [
  'update_props',
  'trigger_animation',
  'play_sound',
  'send_analytics',
] as const;

// ===== 검증 함수 =====
export function isImplementedEventType(type: string): type is EventType {
  return IMPLEMENTED_EVENT_TYPES.includes(type as EventType);
}

export function isImplementedActionType(type: string): type is ActionType {
  return IMPLEMENTED_ACTION_TYPES.includes(type as ActionType);
}

// ===== UI 라벨 매핑 =====
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  onClick: '클릭',
  onMouseEnter: '마우스 진입',
  onMouseLeave: '마우스 나감',
  onFocus: '포커스',
  onBlur: '포커스 해제',
  onChange: '값 변경',
  onSubmit: '제출',
  onKeyDown: '키 누름',
  onKeyUp: '키 뗌',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  navigate: '페이지 이동',
  toggle_visibility: '표시/숨김 토글',
  toggleVisibility: '표시/숨김 토글',
  update_state: '상태 업데이트',
  updateState: '상태 업데이트',
  setState: '상태 설정',
  show_modal: '모달 표시',
  showModal: '모달 표시',
  hide_modal: '모달 숨김',
  hideModal: '모달 숨김',
  scroll_to: '스크롤 이동',
  scrollTo: '스크롤 이동',
  copy_to_clipboard: '클립보드 복사',
  copyToClipboard: '클립보드 복사',
  custom_function: '커스텀 함수',
  customFunction: '커스텀 함수',
  validate_form: '폼 검증',
  validateForm: '폼 검증',
  reset_form: '폼 초기화',
  resetForm: '폼 초기화',
  submitForm: '폼 제출',
  showToast: '토스트 표시',
  apiCall: 'API 호출',
  setComponentState: '컴포넌트 상태 설정',
  triggerComponentAction: '컴포넌트 액션 실행',
  updateFormField: '폼 필드 업데이트',
  filterCollection: '컬렉션 필터링',
  selectItem: '아이템 선택',
  clearSelection: '선택 해제',
};
```

#### Step 2: EventHandlerFactory 수정
```typescript
// utils/eventHandlers.ts
import { IMPLEMENTED_EVENT_TYPES, isImplementedEventType } from '../types/events.registry';

export class EventHandlerFactory {
  // ...

  createEventHandlers(element: Element): Record<string, (e: Event) => void> {
    const handlers: Record<string, (e: Event) => void> = {};

    if (element.props.events && Array.isArray(element.props.events)) {
      const events = element.props.events as ElementEvent[];

      // ✅ 중앙 레지스트리 사용
      const activeEventTypes = [...new Set(
        events
          .filter(event =>
            event.enabled !== false &&
            isImplementedEventType(event.event_type) // ✅ 동적 검증
          )
          .map(event => event.event_type)
      )];

      // ...
    }

    return handlers;
  }

  private isValidEventType(eventType: string): boolean {
    // ✅ 중앙 레지스트리 사용
    return isImplementedEventType(eventType);
  }
}
```

#### Step 3: EventEngine 수정
```typescript
// utils/eventEngine.ts
import { IMPLEMENTED_ACTION_TYPES, isImplementedActionType } from '../types/events.registry';

export class EventEngine {
  private initializeActionHandlers() {
    // ✅ 중앙 레지스트리와 동기화
    this.actionHandlers = {
      // 모든 IMPLEMENTED_ACTION_TYPES에 대해 핸들러 매핑
      ...Object.fromEntries(
        IMPLEMENTED_ACTION_TYPES.map(type => [type, this.getHandlerForActionType(type)])
      )
    };
  }

  private getHandlerForActionType(actionType: ActionType) {
    // 액션 타입에 따른 핸들러 매핑 (snake_case/camelCase 통합)
    const normalizedType = actionType.replace(/_/g, '').toLowerCase();

    switch (normalizedType) {
      case 'navigate': return this.executeNavigateAction.bind(this);
      case 'updatestate':
      case 'setstate': return this.executeUpdateStateAction.bind(this);
      case 'togglevisibility': return this.executeToggleVisibilityAction.bind(this);
      case 'showmodal': return this.executeShowModalAction.bind(this);
      case 'hidemodal': return this.executeHideModalAction.bind(this);
      case 'scrollto': return this.executeScrollToAction.bind(this);
      case 'copytoclipboard': return this.executeCopyToClipboardAction.bind(this);
      case 'customfunction': return this.executeCustomFunctionAction.bind(this);
      case 'validateform': return this.executeValidateFormAction.bind(this);
      case 'resetform': return this.executeResetFormAction.bind(this);
      case 'submitform': return this.executeSubmitFormAction.bind(this);
      case 'showtoast': return this.executeShowToastAction.bind(this);
      case 'apicall': return this.executeAPICallAction.bind(this);
      case 'setcomponentstate': return this.executeSetComponentStateAction.bind(this);
      case 'triggercomponentaction': return this.executeTriggerComponentActionAction.bind(this);
      case 'updateformfield': return this.executeUpdateFormFieldAction.bind(this);
      case 'filtercollection': return this.executeFilterCollectionAction.bind(this);
      case 'selectitem': return this.executeSelectItemAction.bind(this);
      case 'clearselection': return this.executeClearSelectionAction.bind(this);
      default:
        throw new Error(`Unmapped action type: ${actionType}`);
    }
  }

  private async executeAction(actionType: string, action: EventAction, context: EventContext): Promise<unknown> {
    // ✅ 구현 여부 검증
    if (!isImplementedActionType(actionType)) {
      throw new Error(`Action type not implemented: ${actionType}`);
    }

    const handler = this.actionHandlers[actionType];
    if (!handler) {
      throw new Error(`Unknown action type: ${actionType}`);
    }

    return await handler(action, context);
  }
}
```

#### Step 4: Inspector UI에서 미구현 타입 비활성화
```typescript
// builder/inspector/events/components/EventTypePicker.tsx
import { IMPLEMENTED_EVENT_TYPES, PLANNED_EVENT_TYPES, EVENT_TYPE_LABELS } from '@/types/events.registry';

export function EventTypePicker() {
  return (
    <Select>
      {IMPLEMENTED_EVENT_TYPES.map(type => (
        <SelectItem key={type} value={type}>
          {EVENT_TYPE_LABELS[type]}
        </SelectItem>
      ))}

      {/* 향후 구현 예정 (비활성화) */}
      <SelectSeparator />
      {PLANNED_EVENT_TYPES.map(type => (
        <SelectItem key={type} value={type} isDisabled>
          {type} (향후 지원 예정)
        </SelectItem>
      ))}
    </Select>
  );
}
```

**예상 효과:**
- ✅ 타입 시스템과 런타임 100% 동기화
- ✅ 미구현 기능에 대한 명확한 피드백
- ✅ 향후 기능 추가 시 중앙 레지스트리만 수정
- ✅ 화이트리스트 중복 제거 (EventHandlerFactory 내부 상수 제거)

---

## 🎨 Phase 1: 테마 시스템 통합 (P0 - Critical)

### 이슈 #4: 두 개의 경쟁하는 Zustand 스토어 (동기화 없음)

**문제:**
- `builder/stores/theme.ts` - Token 중심 (rawTokens, semanticTokens)
- `builder/stores/themeStore.ts` - Theme 중심 (themes[], activeTheme)
- **동기화 없음:** 토큰 업데이트가 테마 스토어에 반영되지 않고 vice versa

**영향:**
- 상태 불일치 → UI 버그
- 두 스토어 모두 Supabase를 직접 호출하여 데이터 접근 레이어 중복

**해결 방안:**

#### 새로운 통합 테마 스토어 구조
```typescript
// builder/stores/themeStore.unified.ts (새 파일)

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DesignTheme, DesignToken } from '@/types/theme';
import { ThemeService, TokenService } from '@/services/theme';

interface UnifiedThemeState {
  // ===== Theme State =====
  themes: DesignTheme[];
  activeThemeId: string | null;
  activeTheme: DesignTheme | null;

  // ===== Token State =====
  tokens: DesignToken[]; // 모든 토큰 (raw + semantic)
  rawTokens: DesignToken[]; // 계산된 속성 (getter)
  semanticTokens: DesignToken[]; // 계산된 속성 (getter)

  // ===== Loading & Error =====
  loading: boolean;
  error: string | null;

  // ===== Theme Actions =====
  loadThemes: (projectId: string) => Promise<void>;
  setActiveTheme: (themeId: string) => Promise<void>;
  createTheme: (theme: Omit<DesignTheme, 'id' | 'created_at' | 'updated_at'>) => Promise<DesignTheme>;
  updateTheme: (themeId: string, updates: Partial<DesignTheme>) => Promise<void>;
  deleteTheme: (themeId: string) => Promise<void>;

  // ===== Token Actions =====
  loadTokens: (themeId: string) => Promise<void>;
  createToken: (token: CreateTokenInput) => Promise<DesignToken>;
  updateToken: (tokenId: string, updates: UpdateTokenInput) => Promise<void>;
  deleteToken: (tokenId: string) => Promise<void>;
  bulkUpsertTokens: (tokens: CreateTokenInput[]) => Promise<void>;

  // ===== CSS Injection =====
  injectThemeCSS: () => void;

  // ===== Utilities =====
  reset: () => void;
}

export const useThemeStore = create<UnifiedThemeState>()(
  devtools(
    (set, get) => ({
      // Initial State
      themes: [],
      activeThemeId: null,
      activeTheme: null,
      tokens: [],
      loading: false,
      error: null,

      // ===== Computed Properties =====
      get rawTokens() {
        return get().tokens.filter(t => t.scope === 'raw');
      },

      get semanticTokens() {
        return get().tokens.filter(t => t.scope === 'semantic');
      },

      // ===== Theme Actions =====
      loadThemes: async (projectId: string) => {
        set({ loading: true, error: null });
        try {
          const themes = await ThemeService.getThemes(projectId);
          set({ themes, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      setActiveTheme: async (themeId: string) => {
        set({ loading: true, error: null });
        try {
          const theme = get().themes.find(t => t.id === themeId);
          if (!theme) throw new Error('Theme not found');

          set({ activeThemeId: themeId, activeTheme: theme });

          // ✅ 토큰 자동 로드 (동기화)
          await get().loadTokens(themeId);

          // ✅ CSS 자동 주입 (동기화)
          get().injectThemeCSS();

          set({ loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      createTheme: async (theme) => {
        set({ loading: true, error: null });
        try {
          const newTheme = await ThemeService.createTheme(theme);
          set(state => ({
            themes: [...state.themes, newTheme],
            loading: false
          }));
          return newTheme;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateTheme: async (themeId, updates) => {
        set({ loading: true, error: null });
        try {
          await ThemeService.updateTheme(themeId, updates);
          set(state => ({
            themes: state.themes.map(t => t.id === themeId ? { ...t, ...updates } : t),
            activeTheme: state.activeThemeId === themeId ? { ...state.activeTheme!, ...updates } : state.activeTheme,
            loading: false
          }));
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      deleteTheme: async (themeId) => {
        set({ loading: true, error: null });
        try {
          await ThemeService.deleteTheme(themeId);
          set(state => ({
            themes: state.themes.filter(t => t.id !== themeId),
            activeTheme: state.activeThemeId === themeId ? null : state.activeTheme,
            activeThemeId: state.activeThemeId === themeId ? null : state.activeThemeId,
            loading: false
          }));
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // ===== Token Actions =====
      loadTokens: async (themeId: string) => {
        set({ loading: true, error: null });
        try {
          const tokens = await TokenService.getTokens(themeId);
          set({ tokens, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      createToken: async (token) => {
        set({ loading: true, error: null });
        try {
          const newToken = await TokenService.createToken(token);
          set(state => ({
            tokens: [...state.tokens, newToken],
            loading: false
          }));

          // ✅ CSS 자동 재주입 (동기화)
          get().injectThemeCSS();

          return newToken;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateToken: async (tokenId, updates) => {
        set({ loading: true, error: null });
        try {
          await TokenService.updateToken(tokenId, updates);
          set(state => ({
            tokens: state.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t),
            loading: false
          }));

          // ✅ CSS 자동 재주입 (동기화)
          get().injectThemeCSS();
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      deleteToken: async (tokenId) => {
        set({ loading: true, error: null });
        try {
          await TokenService.deleteToken(tokenId);
          set(state => ({
            tokens: state.tokens.filter(t => t.id !== tokenId),
            loading: false
          }));

          // ✅ CSS 자동 재주입 (동기화)
          get().injectThemeCSS();
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      bulkUpsertTokens: async (tokens) => {
        set({ loading: true, error: null });
        try {
          await TokenService.bulkUpsert(tokens);
          // 전체 토큰 재로드
          const themeId = get().activeThemeId;
          if (themeId) {
            await get().loadTokens(themeId);
          }

          // ✅ CSS 자동 재주입 (동기화)
          get().injectThemeCSS();

          set({ loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // ===== CSS Injection (통합) =====
      injectThemeCSS: () => {
        const tokens = get().tokens;
        if (tokens.length === 0) return;

        // CSS 변수 생성
        const cssVars = tokens
          .map(token => {
            const varName = token.css_variable || `--${token.name.replace(/\./g, '-')}`;
            const cssValue = tokenValueToCSS(token.value, token.type);
            return `${varName}: ${cssValue};`;
          })
          .join('\n  ');

        // 스타일 태그 주입
        const styleId = 'xstudio-theme-vars';
        let styleTag = document.getElementById(styleId);

        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
        }

        styleTag.textContent = `:root {\n  ${cssVars}\n}`;
      },

      // ===== Utilities =====
      reset: () => {
        set({
          themes: [],
          activeThemeId: null,
          activeTheme: null,
          tokens: [],
          loading: false,
          error: null
        });
      }
    }),
    { name: 'ThemeStore' }
  )
);

// ===== Helper Function =====
function tokenValueToCSS(value: TokenValue, type: TokenType): string {
  // 기존 utils/theme/tokenToCss.ts 로직 통합
  // ...
}

// ===== Convenience Hooks =====
export const useThemes = () => useThemeStore(state => state.themes);
export const useActiveTheme = () => useThemeStore(state => state.activeTheme);
export const useTokens = () => useThemeStore(state => state.tokens);
export const useRawTokens = () => useThemeStore(state => state.rawTokens);
export const useSemanticTokens = () => useThemeStore(state => state.semanticTokens);
```

**마이그레이션 단계:**
```bash
# Step 1: 새 통합 스토어 생성
# builder/stores/themeStore.unified.ts 생성

# Step 2: 기존 파일 deprecated 표시
echo "// @deprecated Use builder/stores/themeStore.unified.ts" | cat - builder/stores/theme.ts > temp && mv temp builder/stores/theme.ts
echo "// @deprecated Use builder/stores/themeStore.unified.ts" | cat - builder/stores/themeStore.ts > temp && mv temp builder/stores/themeStore.ts

# Step 3: 의존성 분석
rg "from ['\"].*stores/theme['\"]" --files-with-matches
rg "useThemeStore" --files-with-matches

# Step 4: 점진적 마이그레이션 (파일별로 테스트)
# 각 컴포넌트를 새 스토어로 마이그레이션하고 동작 확인

# Step 5: 기존 파일 삭제
rm builder/stores/theme.ts
rm builder/stores/themeStore.ts
mv builder/stores/themeStore.unified.ts builder/stores/themeStore.ts
```

**예상 효과:**
- ✅ 두 스토어 통합 → 300줄 삭제
- ✅ 상태 동기화 100% 보장
- ✅ CSS 주입 자동화 (토큰 변경 시 자동 반영)
- ✅ Realtime 구독 중복 제거

---

### 이슈 #5: 토큰→CSS 변환 로직 3곳 중복

**문제:**
- `utils/themeUtils.ts` - 사용되지 않음 (113줄)
- `utils/theme/tokenToCss.ts` - 주 구현체 (150줄)
- `builder/theme/cssVars.ts` - 빌더 전용 (90줄)
- `builder/hooks/useThemeManager.ts` - CSS 주입 로직 포함 (120줄)

**해결 방안:**
1. `utils/theme/tokenToCss.ts`를 단일 진실 공급원으로 지정
2. 통합 스토어의 `injectThemeCSS()` 메서드에서만 사용
3. 나머지 파일 삭제

**예상 효과:**
- ✅ 323줄 삭제 (113 + 90 + 120)
- ✅ 변환 로직 일관성 100%

---

### 이슈 #6: 사용되지 않는 Wrapper Hook 제거

**문제:**
- `hooks/theme/useThemes.ts` (97줄) - `themeStore.themes`만 반환
- `hooks/theme/useActiveTheme.ts` (84줄) - `themeStore.activeTheme`만 반환
- 추가 로직 없음 (단순 래퍼)

**해결 방안:**
통합 스토어에서 직접 selector 사용
```typescript
// ❌ Before (불필요한 래퍼)
import { useThemes } from '@/hooks/theme/useThemes';
const themes = useThemes();

// ✅ After (직접 selector 사용)
import { useThemeStore } from '@/builder/stores/themeStore';
const themes = useThemeStore(state => state.themes);
```

**예상 효과:**
- ✅ 181줄 삭제
- ✅ import 경로 단순화
- ✅ 번들 크기 감소

---

### 이슈 #7: 테마 API 접근 레이어 중복

**문제:**
- `builder/theme/themeApi.ts` - Supabase 직접 호출 + 토큰 CRUD
- `services/theme/ThemeService.ts` - 동일한 기능
- `services/theme/TokenService.ts` - 동일한 기능

**해결 방안:**
1. `builder/theme/themeApi.ts` 삭제
2. 모든 데이터 접근은 `services/theme/` 레이어 통과
3. 통합 스토어는 서비스만 호출

**예상 효과:**
- ✅ ~200줄 삭제
- ✅ 데이터 접근 계층 단일화
- ✅ 에러 핸들링 일관성

---

## 📨 Phase 2: 메시징 레이어 통합 (P1 - High)

### 이슈 #8: 세 개의 경쟁하는 메시징 구현

**문제:**
- `utils/iframeMessenger.ts` (196줄) - IframeMessenger 클래스 (큐잉, 타임아웃, 보안)
- `utils/messaging.ts` (93줄) - MessageService 싱글톤 (간단한 래퍼)
- `builder/preview/utils/messageHandlers.ts` - Preview 전용 핸들러

**해결 방안:**

#### 계층 정리
```
┌─────────────────────────────────────┐
│  Application Layer                  │
│  (Builder, Inspector, Preview)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Message Service (Facade)           │  ← MessageService
│  - High-level API                   │
│  - Type-safe methods                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Transport Layer                    │  ← IframeMessenger
│  - Queue management                 │
│  - Timeout handling                 │
│  - Origin validation                │
└─────────────────────────────────────┘
```

#### 새로운 통합 메시징 시스템
```typescript
// services/messaging/MessagingService.ts (새 파일)

import { IframeMessenger } from '@/utils/iframeMessenger';
import { Element, ComponentElementProps } from '@/types/unified';
import { DesignToken } from '@/types/theme';

export interface MessagePayload {
  // Element Operations
  elements?: Element[];
  elementId?: string;
  props?: ComponentElementProps;
  element?: Element;

  // Theme Operations
  tokens?: DesignToken[];
  themeVars?: Record<string, string>;

  // Error Handling
  message?: string;
  error?: string;

  // Loading State
  loading?: boolean;
}

export class MessagingService {
  private static instance: MessagingService;
  private messenger: IframeMessenger;

  private constructor() {
    this.messenger = new IframeMessenger();
  }

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  // ===== Initialization =====
  setIframe(iframe: HTMLIFrameElement) {
    this.messenger.setIframe(iframe);
  }

  // ===== Element Operations =====
  async updateElements(elements: Element[]) {
    return this.messenger.updateElements(elements);
  }

  async updateElementProps(elementId: string, props: ComponentElementProps, merge = true) {
    return this.messenger.updateElementProps(elementId, props, merge);
  }

  async addElement(element: Element) {
    return this.messenger.sendMessage('ADD_ELEMENT', { element });
  }

  async removeElement(elementId: string) {
    return this.messenger.sendMessage('REMOVE_ELEMENT', { elementId });
  }

  async selectElement(elementId: string | null) {
    return this.messenger.sendMessage('SELECT_ELEMENT', { elementId });
  }

  // ===== Theme Operations =====
  async updateThemeVars(tokens: DesignToken[]) {
    return this.messenger.updateThemeVars(tokens);
  }

  async injectCSS(css: string) {
    return this.messenger.sendMessage('INJECT_CSS', { css });
  }

  // ===== Handler Registration =====
  onElementSelected(handler: (payload: MessagePayload) => void) {
    this.messenger.registerHandler('ELEMENT_SELECTED', handler);
  }

  onElementUpdated(handler: (payload: MessagePayload) => void) {
    this.messenger.registerHandler('ELEMENT_UPDATED', handler);
  }

  onPreviewReady(handler: () => void) {
    this.messenger.registerHandler('PREVIEW_READY', handler);
  }

  onError(handler: (payload: MessagePayload) => void) {
    this.messenger.registerHandler('ERROR', handler);
  }

  // ===== Utilities =====
  clearOverlay() {
    window.postMessage({ type: 'CLEAR_OVERLAY', payload: {} }, window.location.origin);
  }

  // ===== Cleanup =====
  destroy() {
    this.messenger.destroy();
  }
}

// 싱글톤 인스턴스 export
export const messagingService = MessagingService.getInstance();

// Convenience exports
export const {
  setIframe,
  updateElements,
  updateElementProps,
  addElement,
  removeElement,
  selectElement,
  updateThemeVars,
  injectCSS,
  onElementSelected,
  onElementUpdated,
  onPreviewReady,
  onError,
  clearOverlay,
  destroy
} = messagingService;
```

**마이그레이션 단계:**
```bash
# Step 1: MessagingService 생성
# services/messaging/MessagingService.ts 생성

# Step 2: MessageService.ts를 deprecated로 표시
echo "// @deprecated Use services/messaging/MessagingService" | cat - utils/messaging.ts > temp && mv temp utils/messaging.ts

# Step 3: 의존성 마이그레이션
rg "MessageService" --files-with-matches
rg "from ['\"].*messaging['\"]" --files-with-matches

# Step 4: 자동 치환
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  "s/import { MessageService }/import { messagingService }/g"

# Step 5: MessageService 삭제
rm utils/messaging.ts
```

**예상 효과:**
- ✅ 93줄 삭제 (MessageService)
- ✅ 메시징 API 단일화
- ✅ 타입 안정성 향상

---

## 🛠️ Phase 3: 유틸리티 통합 (P2 - Medium)

### 이슈 #9: Element Creation 3중 구현

**문제:**
1. `builder/stores/utils/elementCreation.ts` - Triple-sync (memory → iframe → DB)
2. `builder/factories/utils/elementCreation.ts` - Definition converter
3. `utils/elementUtils.ts` - Raw API wrapper

**해결 방안:**
```
레이어 정리:
├── stores/utils/elementCreation.ts (최상위 레이어)
│   └─→ services/api/ElementsApiService.ts (중간 레이어)
│       └─→ Supabase (데이터 레이어)
│
└── factories/utils/elementCreation.ts (별도 레이어 - 유지)
    └─→ Definition → Element 변환만 담당
```

**조치:**
1. `utils/elementUtils.ts`의 elementCreation 로직 삭제
2. Store 레이어는 ElementsApiService만 호출
3. Factory는 독립적으로 유지 (변환 로직)

**예상 효과:**
- ✅ ~150줄 정리
- ✅ 레이어 책임 명확화

---

### 이슈 #10: Tree/Hierarchy 2중 구현

**문제:**
- `builder/utils/treeUtils.ts` (80줄) - 단순 재귀 빌더
- `builder/utils/HierarchyManager.ts` (615줄) - 캐싱, 배치 처리, 검증

**해결 방안:**
HierarchyManager가 상위 집합이므로 treeUtils 삭제

**예상 효과:**
- ✅ 80줄 삭제
- ✅ 단일 트리 구현

---

### 이슈 #11: Event Handler 2중 구현

**문제:**
- `builder/preview/utils/eventHandlers.ts` - 캐싱 없음
- `utils/eventHandlers.ts` - 캐싱 + 보안

**해결 방안:**
Preview가 utils/eventHandlers를 사용하도록 변경

**예상 효과:**
- ✅ ~100줄 삭제
- ✅ 이벤트 핸들러 일관성

---

## 📋 Phase 4: Element Store와 API Service 중복 제거 (P1)

### 이슈 #12: Store Utilities가 Supabase 직접 호출

**문제:**
- `builder/stores/utils/elementCreation.ts`, `elementUpdate.ts`, `elementRemoval.ts`가 Supabase 직접 호출
- `services/api/ElementsApiService.ts`에 이미 검증, 변환, 에러 핸들링이 구현되어 있음

**해결 방안:**
Store utilities는 ElementsApiService만 호출하도록 리팩토링

**예상 효과:**
- ✅ Supabase 호출 중복 제거
- ✅ 에러 핸들링 일관성
- ✅ snake_case ↔ camelCase 변환 중복 제거

---

## 📐 최종 정리 및 마이그레이션 로드맵

### 우선순위별 실행 계획

| Phase | 작업 | 예상 시간 | 위험도 | 절감 코드 |
|-------|------|-----------|--------|----------|
| **P0** | 타입 시스템 통합 | 2일 | 🟡 중간 | 1,200줄 |
| **P0** | 테마 시스템 통합 | 3일 | 🔴 높음 | 1,770줄 |
| **P1** | 메시징 레이어 통합 | 1.5일 | 🟢 낮음 | 350줄 |
| **P1** | 이벤트 시스템 정리 | 1일 | 🟢 낮음 | 200줄 |
| **P2** | 유틸리티 통합 | 1.5일 | 🟢 낮음 | 800줄 |

**총 예상 작업 기간:** 9일
**총 절감 코드:** 4,320줄 (~15% 코드베이스 감소)

---

## ✅ 마이그레이션 체크리스트

### Before Starting
- [ ] 현재 브랜치 백업
- [ ] 모든 테스트 통과 확인
- [ ] 타입 체크 통과 확인
- [ ] 의존성 그래프 문서화

### Phase 0: 타입 시스템
- [ ] types/theme/index.ts 생성 (통합 타입)
- [ ] types/unified.ts를 SSoT로 지정
- [ ] componentProps.ts 의존성 마이그레이션
- [ ] theme.ts, token.types.ts 의존성 마이그레이션
- [ ] 이벤트 레지스트리 생성 (events.registry.ts)
- [ ] EventHandlerFactory, EventEngine 수정
- [ ] Inspector UI 미구현 타입 비활성화
- [ ] 타입 체크 통과 확인
- [ ] 테스트 통과 확인
- [ ] 구형 파일 삭제

### Phase 1: 테마 시스템
- [ ] themeStore.unified.ts 생성
- [ ] 통합 스토어에 토큰→CSS 변환 통합
- [ ] 기존 theme.ts, themeStore.ts 마이그레이션
- [ ] Wrapper hook 제거 (useThemes, useActiveTheme)
- [ ] builder/theme/themeApi.ts 삭제
- [ ] 모든 테마 접근을 서비스 레이어로 변경
- [ ] CSS 주입 자동화 테스트
- [ ] Realtime 구독 테스트
- [ ] 구형 파일 삭제

### Phase 2: 메시징 레이어
- [ ] services/messaging/MessagingService.ts 생성
- [ ] IframeMessenger를 transport layer로 정의
- [ ] MessageService 의존성 마이그레이션
- [ ] Preview message handlers 통합
- [ ] 메시지 전송/수신 테스트
- [ ] 타임아웃, 큐잉 동작 검증
- [ ] 구형 파일 삭제

### Phase 3: 유틸리티 통합
- [ ] elementUtils.ts creation 로직 제거
- [ ] treeUtils.ts 삭제 (HierarchyManager 사용)
- [ ] Preview eventHandlers → utils/eventHandlers 마이그레이션
- [ ] Store utilities → ElementsApiService 변경
- [ ] 모든 유틸리티 함수 테스트
- [ ] 구형 파일 삭제

### Final Validation
- [ ] 전체 타입 체크 통과
- [ ] 전체 테스트 통과
- [ ] E2E 테스트 (Builder, Preview, Inspector)
- [ ] 번들 크기 확인
- [ ] 성능 벤치마크
- [ ] 문서 업데이트 (CLAUDE.md)

---

## 🚨 위험 요소 및 완화 전략

### 위험 #1: 타입 마이그레이션 중 런타임 에러
**완화:** 단계별 마이그레이션 + 타입 체크 자동화

### 위험 #2: 테마 상태 동기화 실패
**완화:** 통합 스토어에 상태 검증 로직 추가

### 위험 #3: 메시지 큐 데이터 손실
**완화:** IframeMessenger의 큐 크기 모니터링 + 로깅

### 위험 #4: 이벤트 핸들러 누락
**완화:** 중앙 레지스트리 + 런타임 검증

---

## 📚 참고 자료

- 상세 테마 분석: `THEME_SYSTEM_ANALYSIS.md`
- 테마 중복 요약: `THEME_DUPLICATIONS_SUMMARY.md`
- CSS 아키텍처: `docs/CSS_ARCHITECTURE.md`
- CSS 리팩토링 요약: `docs/CSS_REFACTORING_SUMMARY.md`

---

**작성자:** Claude Code
**승인 대기:** @rblood79
**상태:** Draft

