/**
 * Preview Store - 독립 Zustand 스토어
 *
 * Builder와 완전히 분리된 상태 관리.
 * postMessage를 통해서만 데이터를 수신합니다.
 */

import { create } from 'zustand';
import type { PreviewStoreState, PreviewElement, PreviewPage, ThemeVar, DataSource, DataState } from './types';

export const createPreviewStore = () => create<PreviewStoreState>((set, get) => ({
  // ============================================
  // Elements
  // ============================================
  elements: [],
  setElements: (elements: PreviewElement[]) => set({ elements }),
  updateElementProps: (id: string, props: Record<string, unknown>) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, props: { ...el.props, ...props } } : el
      ),
    }));
  },

  // ============================================
  // Pages
  // ============================================
  pages: [],
  setPages: (pages: PreviewPage[]) => set({ pages }),
  currentPageId: null,
  setCurrentPageId: (pageId: string | null) => set({ currentPageId: pageId }),
  currentPath: '/',
  setCurrentPath: (path: string) => set({ currentPath: path }),

  // ============================================
  // Layout
  // ============================================
  currentLayoutId: null,
  setCurrentLayoutId: (layoutId: string | null) => set({ currentLayoutId: layoutId }),

  // ============================================
  // Theme
  // ============================================
  themeVars: [],
  setThemeVars: (vars: ThemeVar[]) => {
    set({ themeVars: vars });
    // CSS 변수 적용
    applyThemeVars(vars, get().isDarkMode);
  },
  isDarkMode: false,
  setDarkMode: (isDark: boolean) => {
    set({ isDarkMode: isDark });
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // 테마 변수 재적용
    applyThemeVars(get().themeVars, isDark);
  },

  // ============================================
  // Data Sources
  // ============================================
  dataSources: [],
  setDataSources: (sources: DataSource[]) => set({ dataSources: sources }),
  dataStates: new Map(),
  setDataState: (sourceId: string, state: DataState) => {
    set((prev) => {
      const newDataStates = new Map(prev.dataStates);
      newDataStates.set(sourceId, state);
      return { dataStates: newDataStates };
    });
  },

  // ============================================
  // Auth Context
  // ============================================
  authToken: null,
  setAuthToken: (token: string | null) => set({ authToken: token }),

  // ============================================
  // State Hierarchy
  // ============================================
  appState: {},
  pageStates: new Map(),
  componentStates: new Map(),

  setState: (path: string, value: unknown) => {
    const [scope, ...rest] = path.split('.');
    const key = rest.join('.');

    switch (scope) {
      case 'app':
        set((s) => ({ appState: { ...s.appState, [key]: value } }));
        break;

      case 'page': {
        const pageId = get().currentPageId;
        if (pageId) {
          set((s) => {
            const pageStates = new Map(s.pageStates);
            const pageState = pageStates.get(pageId) || {};
            pageStates.set(pageId, { ...pageState, [key]: value });
            return { pageStates };
          });
        }
        break;
      }

      case 'component': {
        // elementId.propKey 형식
        const dotIndex = key.indexOf('.');
        if (dotIndex > 0) {
          const elementId = key.slice(0, dotIndex);
          const propKey = key.slice(dotIndex + 1);
          set((s) => {
            const componentStates = new Map(s.componentStates);
            const componentState = componentStates.get(elementId) || {};
            componentStates.set(elementId, { ...componentState, [propKey]: value });
            return { componentStates };
          });
        }
        break;
      }

      default:
        // scope가 없으면 appState로 처리
        set((s) => ({ appState: { ...s.appState, [path]: value } }));
    }
  },

  getState: (path: string) => {
    const [scope, ...rest] = path.split('.');
    const key = rest.join('.');
    const state = get();

    switch (scope) {
      case 'app':
        return getNestedValue(state.appState, key);

      case 'page':
        return getNestedValue(state.pageStates.get(state.currentPageId || '') || {}, key);

      case 'component': {
        const dotIndex = key.indexOf('.');
        if (dotIndex > 0) {
          const elementId = key.slice(0, dotIndex);
          const propKey = key.slice(dotIndex + 1);
          return getNestedValue(state.componentStates.get(elementId) || {}, propKey);
        }
        return undefined;
      }

      default:
        // scope가 없으면 appState에서 찾기
        return getNestedValue(state.appState, path);
    }
  },

  // ============================================
  // Ready State
  // ============================================
  isReady: false,
  setReady: (ready: boolean) => set({ isReady: ready }),
}));

// ============================================
// Helper Functions
// ============================================

/**
 * 중첩된 객체에서 값 가져오기
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return obj;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Theme 변수를 CSS 변수로 적용
 */
function applyThemeVars(vars: ThemeVar[], isDarkMode: boolean): void {
  const root = document.documentElement;

  // 기존 커스텀 스타일 제거
  const existingStyle = document.getElementById('preview-theme-vars');
  if (existingStyle) {
    existingStyle.remove();
  }

  // 새 스타일 생성
  const lightVars = vars.filter((v) => !v.isDark);
  const darkVars = vars.filter((v) => v.isDark);

  let cssText = ':root {\n';
  lightVars.forEach((v) => {
    cssText += `  ${v.name}: ${v.value};\n`;
  });
  cssText += '}\n';

  if (darkVars.length > 0) {
    cssText += '[data-theme="dark"] {\n';
    darkVars.forEach((v) => {
      cssText += `  ${v.name}: ${v.value};\n`;
    });
    cssText += '}\n';
  }

  const styleEl = document.createElement('style');
  styleEl.id = 'preview-theme-vars';
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);

  // 현재 테마 적용
  root.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
}

// ============================================
// Store Instance & Hooks
// ============================================

// 싱글톤 스토어 인스턴스
let storeInstance: ReturnType<typeof createPreviewStore> | null = null;

export function getPreviewStore() {
  if (!storeInstance) {
    storeInstance = createPreviewStore();
  }
  return storeInstance;
}

export function usePreviewStore<T>(selector: (state: PreviewStoreState) => T): T {
  const store = getPreviewStore();
  return store(selector);
}

// 전체 상태 접근 (non-React 환경용)
export function getPreviewStoreState() {
  return getPreviewStore().getState();
}
