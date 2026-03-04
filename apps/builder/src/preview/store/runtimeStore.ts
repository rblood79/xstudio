/**
 * Runtime Store - 독립 Zustand 스토어
 *
 * Builder와 완전히 분리된 상태 관리.
 * postMessage를 통해서만 데이터를 수신합니다.
 */

import { create } from "zustand";
import type {
  RuntimeStoreState,
  RuntimeElement,
  RuntimePage,
  RuntimeLayout,
  ThemeVar,
  DataSource,
  DataState,
  RuntimeDataTable,
  RuntimeApiEndpoint,
  RuntimeVariable,
} from "./types";

function hasShallowPatchChanges(
  prev: Record<string, unknown>,
  patch: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(patch)) {
    if (prev[key] !== patch[key]) return true;
  }
  return false;
}

export const createRuntimeStore = () =>
  create<RuntimeStoreState>((set, get) => ({
    // ============================================
    // Elements
    // ============================================
    elements: [],
    setElements: (elements: RuntimeElement[]) => set({ elements }),
    updateElementProps: (id: string, props: Record<string, unknown>) => {
      const patch = props ?? {};
      if (Object.keys(patch).length === 0) return;

      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index < 0) return state;

        const current = state.elements[index];
        const currentProps = (current.props ?? {}) as Record<string, unknown>;
        if (!hasShallowPatchChanges(currentProps, patch)) return state;

        const nextElement: RuntimeElement = {
          ...current,
          props: { ...currentProps, ...patch },
        };

        const nextElements = state.elements.slice();
        nextElements[index] = nextElement;

        return { elements: nextElements };
      });
    },

    // 🚀 Phase 4: Delta Update Actions
    /**
     * 단일 요소 추가 (Delta)
     */
    addElement: (element: RuntimeElement) => {
      set((state) => ({
        elements: [...state.elements, element],
      }));
    },

    /**
     * 다수 요소 추가 (Delta batch)
     */
    addElements: (newElements: RuntimeElement[]) => {
      set((state) => ({
        elements: [...state.elements, ...newElements],
      }));
    },

    /**
     * 단일 요소 삭제 (Delta)
     */
    removeElement: (elementId: string) => {
      set((state) => ({
        elements: state.elements.filter((el) => el.id !== elementId),
      }));
    },

    /**
     * 다수 요소 삭제 (Delta batch)
     */
    removeElements: (elementIds: string[]) => {
      const idSet = new Set(elementIds);
      set((state) => ({
        elements: state.elements.filter((el) => !idSet.has(el.id)),
      }));
    },

    /**
     * 요소 부분 업데이트 (Delta - props, parentId, orderNum)
     */
    updateElement: (elementId: string, updates: Partial<RuntimeElement>) => {
      set((state) => ({
        elements: state.elements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el,
        ),
      }));
    },

    /**
     * 요소 배열 반환 (messageHandler에서 사용)
     */
    getElements: () => get().elements,

    // ============================================
    // Pages
    // ============================================
    pages: [],
    setPages: (pages: RuntimePage[]) => set({ pages }),
    currentPageId: null,
    setCurrentPageId: (pageId: string | null) => set({ currentPageId: pageId }),
    currentPath: "/",
    setCurrentPath: (path: string) => set({ currentPath: path }),

    // ============================================
    // Route Parameters (동적 라우트 파라미터)
    // ============================================
    routeParams: {},
    setRouteParams: (params: Record<string, string>) =>
      set({ routeParams: params }),

    // ============================================
    // Layouts (Nested Routes & Slug System)
    // ============================================
    layouts: [],
    setLayouts: (layouts: RuntimeLayout[]) => set({ layouts }),
    currentLayoutId: null,
    setCurrentLayoutId: (layoutId: string | null) =>
      set({ currentLayoutId: layoutId }),

    // ============================================
    // Theme
    // ============================================
    themeVars: [],
    setThemeVars: (vars: ThemeVar[]) => {
      // 기존 vars에 새 vars를 병합 (name+isDark 기준 덮어쓰기)
      const existing = get().themeVars;
      const merged = [...existing];
      for (const newVar of vars) {
        const idx = merged.findIndex(
          (v) => v.name === newVar.name && v.isDark === newVar.isDark,
        );
        if (idx >= 0) {
          merged[idx] = newVar;
        } else {
          merged.push(newVar);
        }
      }
      set({ themeVars: merged });
      // CSS 변수 적용
      applyThemeVars(merged, get().isDarkMode);
    },
    isDarkMode: false,
    setDarkMode: (isDark: boolean) => {
      set({ isDarkMode: isDark });
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
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
    // DataTables (PropertyDataBinding용)
    // ============================================
    dataTables: [],
    setDataTables: (tables: RuntimeDataTable[]) => set({ dataTables: tables }),

    // ============================================
    // ApiEndpoints (PropertyDataBinding용)
    // ============================================
    apiEndpoints: [],
    setApiEndpoints: (endpoints: RuntimeApiEndpoint[]) =>
      set({ apiEndpoints: endpoints }),

    // ============================================
    // Variables (PropertyDataBinding용)
    // ============================================
    variables: [],
    setVariables: (variables: RuntimeVariable[]) => {
      set({ variables });
      // Variables의 defaultValue를 appState/pageStates에 초기화
      const currentAppState = get().appState;
      const newAppState = { ...currentAppState };

      variables.forEach((variable) => {
        if (
          variable.scope === "global" &&
          variable.defaultValue !== undefined
        ) {
          // 이미 값이 설정되어 있지 않은 경우에만 기본값 설정
          if (!(variable.name in newAppState)) {
            newAppState[variable.name] = variable.defaultValue;
          }
        }
      });

      set({ appState: newAppState });
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
      const [scope, ...rest] = path.split(".");
      const key = rest.join(".");

      switch (scope) {
        case "app":
          set((s) => ({ appState: { ...s.appState, [key]: value } }));
          break;

        case "page": {
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

        case "component": {
          // elementId.propKey 형식
          const dotIndex = key.indexOf(".");
          if (dotIndex > 0) {
            const elementId = key.slice(0, dotIndex);
            const propKey = key.slice(dotIndex + 1);
            set((s) => {
              const componentStates = new Map(s.componentStates);
              const componentState = componentStates.get(elementId) || {};
              componentStates.set(elementId, {
                ...componentState,
                [propKey]: value,
              });
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
      const [scope, ...rest] = path.split(".");
      const key = rest.join(".");
      const state = get();

      switch (scope) {
        case "app":
          return getNestedValue(state.appState, key);

        case "page":
          return getNestedValue(
            state.pageStates.get(state.currentPageId || "") || {},
            key,
          );

        case "component": {
          const dotIndex = key.indexOf(".");
          if (dotIndex > 0) {
            const elementId = key.slice(0, dotIndex);
            const propKey = key.slice(dotIndex + 1);
            return getNestedValue(
              state.componentStates.get(elementId) || {},
              propKey,
            );
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

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
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
  const existingStyle = document.getElementById("runtime-theme-vars");
  if (existingStyle) {
    existingStyle.remove();
  }

  // 새 스타일 생성
  const lightVars = vars.filter((v) => !v.isDark);
  const darkVars = vars.filter((v) => v.isDark);

  let cssText = ":root {\n";
  lightVars.forEach((v) => {
    cssText += `  ${v.name}: ${v.value};\n`;
  });
  cssText += "}\n";

  if (darkVars.length > 0) {
    cssText += '[data-theme="dark"] {\n';
    darkVars.forEach((v) => {
      cssText += `  ${v.name}: ${v.value};\n`;
    });
    cssText += "}\n";
  }

  const styleEl = document.createElement("style");
  styleEl.id = "runtime-theme-vars";
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);

  // 현재 테마 적용
  root.setAttribute("data-theme", isDarkMode ? "dark" : "light");
}

// ============================================
// Store Instance & Hooks
// ============================================

// 싱글톤 스토어 인스턴스
let storeInstance: ReturnType<typeof createRuntimeStore> | null = null;

export function getRuntimeStore() {
  if (!storeInstance) {
    storeInstance = createRuntimeStore();
  }
  return storeInstance;
}

export function useRuntimeStore<T>(
  selector: (state: RuntimeStoreState) => T,
): T {
  const store = getRuntimeStore();
  return store(selector);
}

// 전체 상태 접근 (non-React 환경용)
export function getRuntimeStoreState() {
  return getRuntimeStore().getState();
}
