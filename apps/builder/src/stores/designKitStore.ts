/**
 * G.4 Design Kit Store
 *
 * Kit 목록/상태 관리 Zustand 스토어.
 * 실제 변수/토큰/컴포넌트 적용은 kitLoader.ts 유틸리티로 위임.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import { create } from 'zustand';
import type {
  DesignKit,
  DesignKitMeta,
  DesignKitState,
  KitApplyOptions,
  KitLoadResult,
} from '../types/builder/designKit.types';
import { validateKitJSON, validateKitObject } from '../utils/designKit/kitValidator';
import { applyDesignKit } from '../utils/designKit/kitLoader';
import type { KitLoaderThemeAccess, KitLoaderElementAccess } from '../utils/designKit/kitLoader';
import { exportProjectAsKit } from '../utils/designKit/kitExporter';
import { useUnifiedThemeStore } from './themeStore';
import type { Element } from '../types/builder/unified.types';

// ============================================
// Store Actions Interface
// ============================================

interface DesignKitActions {
  /** 내장 킷 목록 로드 */
  loadAvailableKits: () => void;
  /** JSON 문자열에서 Kit 파싱 */
  loadKitFromJSON: (jsonString: string) => DesignKit | null;
  /** 파싱된 Kit을 프로젝트에 적용 */
  applyKit: (
    kit: DesignKit,
    projectId: string,
    elementsStore: { elements: Element[]; addElement: (el: Element) => Promise<void> },
    options?: Partial<KitApplyOptions>,
  ) => Promise<KitLoadResult>;
  /** 현재 프로젝트를 Kit JSON으로 내보내기 */
  exportCurrentAsKit: (
    meta: Partial<DesignKitMeta>,
    elements: Element[],
    childrenMap: Map<string, Element[]>,
  ) => DesignKit;
  /** 적용된 Kit 제거 */
  removeAppliedKit: (kitId: string) => void;
  /** 에러 클리어 */
  clearError: () => void;
  /** 로드된 Kit 클리어 */
  clearLoadedKit: () => void;
  /** 전체 리셋 */
  reset: () => void;
}

type DesignKitStore = DesignKitState & DesignKitActions;

// ============================================
// Initial State
// ============================================

const initialState: DesignKitState = {
  availableKits: [],
  loadedKit: null,
  appliedKitIds: [],
  status: 'idle',
  error: null,
  lastResult: null,
};

// ============================================
// Store Implementation
// ============================================

export const useDesignKitStore = create<DesignKitStore>((set, get) => ({
  ...initialState,

  loadAvailableKits: () => {
    // 초기 버전: 내장 킷 없음, 사용자 import만 지원
    // 추후 Supabase에서 킷 목록 로드 가능
    set({ availableKits: [] });
  },

  loadKitFromJSON: (jsonString) => {
    set({ status: 'loading', error: null });

    const result = validateKitJSON(jsonString);
    if (!result.success || !result.data) {
      set({ status: 'error', error: result.error });
      return null;
    }

    set({
      status: 'idle',
      loadedKit: result.data,
      error: null,
    });

    // availableKits에 meta 추가 (중복 방지)
    const { availableKits } = get();
    if (!availableKits.some((k) => k.id === result.data!.meta.id)) {
      set({ availableKits: [...availableKits, result.data.meta] });
    }

    return result.data;
  },

  applyKit: async (kit, projectId, elementsStore, options) => {
    set({ status: 'applying', error: null });

    const themeState = useUnifiedThemeStore.getState();

    // 스토어 접근 인터페이스 구성
    const themeAccess: KitLoaderThemeAccess = {
      designVariables: themeState.designVariables,
      tokens: themeState.tokens,
      themes: themeState.themes,
      createTheme: async (name, parentThemeId?, status?, projId?) => {
        return await themeState.createTheme(name, parentThemeId, status, projId);
      },
      bulkUpsertTokens: async (tokens) => {
        await themeState.bulkUpsertTokens(tokens);
      },
      setDesignVariables: (variables) => {
        useUnifiedThemeStore.setState({ designVariables: variables });
      },
    };

    const elementAccess: KitLoaderElementAccess = {
      elements: elementsStore.elements,
      addElement: elementsStore.addElement,
    };

    const result = await applyDesignKit(kit, projectId, themeAccess, elementAccess, options);

    if (result.success) {
      const { appliedKitIds } = get();
      set({
        status: 'idle',
        lastResult: result,
        appliedKitIds: [...appliedKitIds, kit.meta.id],
      });
    } else {
      set({
        status: 'error',
        error: result.error,
        lastResult: result,
      });
    }

    return result;
  },

  exportCurrentAsKit: (meta, elements, childrenMap) => {
    const themeState = useUnifiedThemeStore.getState();

    return exportProjectAsKit(meta, {
      designVariables: themeState.designVariables,
      themes: themeState.themes,
      tokens: themeState.tokens,
      elements,
      childrenMap,
    });
  },

  removeAppliedKit: (kitId) => {
    const { appliedKitIds } = get();
    set({ appliedKitIds: appliedKitIds.filter((id) => id !== kitId) });
  },

  clearError: () => set({ error: null }),
  clearLoadedKit: () => set({ loadedKit: null }),
  reset: () => set(initialState),
}));
