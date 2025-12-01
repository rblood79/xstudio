/**
 * Data Store - Zustand Store for Data Panel System
 *
 * DataTable, ApiEndpoint, Variable, Transformer 관리
 * Factory Pattern으로 액션을 분리하여 코드 재사용성 향상
 *
 * @see docs/features/DATA_PANEL_SYSTEM.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";
import type {
  DataTable,
  ApiEndpoint,
  Variable,
  Transformer,
  DataStoreState,
  DataStoreActions,
} from "../../types/builder/data.types";
import {
  // DataTable Actions
  createFetchDataTablesAction,
  createCreateDataTableAction,
  createUpdateDataTableAction,
  createDeleteDataTableAction,
  createGetDataTableDataAction,
  createSetRuntimeDataAction,
  // ApiEndpoint Actions
  createFetchApiEndpointsAction,
  createCreateApiEndpointAction,
  createUpdateApiEndpointAction,
  createDeleteApiEndpointAction,
  createExecuteApiEndpointAction,
  // Variable Actions
  createFetchVariablesAction,
  createCreateVariableAction,
  createUpdateVariableAction,
  createDeleteVariableAction,
  createGetVariableValueAction,
  createSetVariableValueAction,
  // Transformer Actions
  createFetchTransformersAction,
  createCreateTransformerAction,
  createUpdateTransformerAction,
  createDeleteTransformerAction,
  createExecuteTransformerAction,
  // Utility Actions
  createClearErrorsAction,
  createResetAction,
} from "./utils/dataActions";

// ============================================
// Store Type
// ============================================

type DataStore = DataStoreState & DataStoreActions;

// ============================================
// Store Slice Creator
// ============================================

export const createDataSlice: StateCreator<DataStore> = (set, get) => {
  // Factory 함수로 액션 생성

  // DataTable Actions
  const fetchDataTables = createFetchDataTablesAction(set);
  const createDataTable = createCreateDataTableAction(set, get);
  const updateDataTable = createUpdateDataTableAction(set, get);
  const deleteDataTable = createDeleteDataTableAction(set, get);
  const getDataTableData = createGetDataTableDataAction(get);
  const setRuntimeData = createSetRuntimeDataAction(set, get);

  // ApiEndpoint Actions
  const fetchApiEndpoints = createFetchApiEndpointsAction(set);
  const createApiEndpoint = createCreateApiEndpointAction(set, get);
  const updateApiEndpoint = createUpdateApiEndpointAction(set, get);
  const deleteApiEndpoint = createDeleteApiEndpointAction(set, get);
  const executeApiEndpoint = createExecuteApiEndpointAction(set, get);

  // Variable Actions
  const fetchVariables = createFetchVariablesAction(set);
  const createVariable = createCreateVariableAction(set, get);
  const updateVariable = createUpdateVariableAction(set, get);
  const deleteVariable = createDeleteVariableAction(set, get);
  const getVariableValue = createGetVariableValueAction(get);
  const setVariableValue = createSetVariableValueAction(set, get);

  // Transformer Actions
  const fetchTransformers = createFetchTransformersAction(set);
  const createTransformer = createCreateTransformerAction(set, get);
  const updateTransformer = createUpdateTransformerAction(set, get);
  const deleteTransformer = createDeleteTransformerAction(set, get);
  const executeTransformer = createExecuteTransformerAction(get);

  // Utility Actions
  const clearErrors = createClearErrorsAction(set);
  const reset = createResetAction(set);

  return {
    // ============================================
    // State
    // ============================================
    dataTables: new Map<string, DataTable>(),
    apiEndpoints: new Map<string, ApiEndpoint>(),
    variables: new Map<string, Variable>(),
    transformers: new Map<string, Transformer>(),
    loadingApis: new Set<string>(),
    errors: new Map<string, Error>(),
    isLoading: false,

    // ============================================
    // Actions
    // ============================================

    // DataTable CRUD
    fetchDataTables,
    createDataTable,
    updateDataTable,
    deleteDataTable,
    getDataTableData,
    setRuntimeData,

    // ApiEndpoint CRUD
    fetchApiEndpoints,
    createApiEndpoint,
    updateApiEndpoint,
    deleteApiEndpoint,
    executeApiEndpoint,

    // Variable CRUD
    fetchVariables,
    createVariable,
    updateVariable,
    deleteVariable,
    getVariableValue,
    setVariableValue,

    // Transformer CRUD
    fetchTransformers,
    createTransformer,
    updateTransformer,
    deleteTransformer,
    executeTransformer,

    // Utilities
    clearErrors,
    reset,
  };
};

// ============================================
// Store Instance
// ============================================

export const useDataStore = create<DataStore>()(
  persist(createDataSlice, {
    name: "xstudio-data",
    // Variables의 persist 설정된 값만 저장 (나머지는 IndexedDB에서 로드)
    partialize: (state) => {
      // persist: true인 Variable 값들만 저장
      const persistedVariables: Record<string, unknown> = {};
      state.variables.forEach((v, key) => {
        if (v.persist) {
          persistedVariables[key] = v.defaultValue;
        }
      });
      return { persistedVariables };
    },
    // Map/Set은 직렬화가 안 되므로 변환
    storage: {
      getItem: (name) => {
        const str = localStorage.getItem(name);
        if (!str) return null;
        return JSON.parse(str);
      },
      setItem: (name, value) => {
        localStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: (name) => {
        localStorage.removeItem(name);
      },
    },
  })
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

/**
 * 모든 DataTable 목록 가져오기
 */
export const useDataTables = (): DataTable[] => {
  const dataTables = useDataStore((state) => state.dataTables);
  return Array.from(dataTables.values());
};

/**
 * 특정 DataTable 가져오기
 */
export const useDataTable = (name: string): DataTable | undefined => {
  const dataTables = useDataStore((state) => state.dataTables);
  return dataTables.get(name);
};

/**
 * 모든 ApiEndpoint 목록 가져오기
 */
export const useApiEndpoints = (): ApiEndpoint[] => {
  const apiEndpoints = useDataStore((state) => state.apiEndpoints);
  return Array.from(apiEndpoints.values());
};

/**
 * 특정 ApiEndpoint 가져오기
 */
export const useApiEndpoint = (name: string): ApiEndpoint | undefined => {
  const apiEndpoints = useDataStore((state) => state.apiEndpoints);
  return apiEndpoints.get(name);
};

/**
 * 모든 Variable 목록 가져오기
 */
export const useVariables = (): Variable[] => {
  const variables = useDataStore((state) => state.variables);
  return Array.from(variables.values());
};

/**
 * 특정 Variable 가져오기
 */
export const useVariable = (name: string): Variable | undefined => {
  const variables = useDataStore((state) => state.variables);
  return variables.get(name);
};

/**
 * 모든 Transformer 목록 가져오기
 */
export const useTransformers = (): Transformer[] => {
  const transformers = useDataStore((state) => state.transformers);
  return Array.from(transformers.values());
};

/**
 * 특정 Transformer 가져오기
 */
export const useTransformer = (name: string): Transformer | undefined => {
  const transformers = useDataStore((state) => state.transformers);
  return transformers.get(name);
};

/**
 * API 로딩 상태 확인
 */
export const useIsApiLoading = (apiId: string): boolean => {
  const loadingApis = useDataStore((state) => state.loadingApis);
  return loadingApis.has(apiId);
};

/**
 * 전체 로딩 상태 가져오기
 */
export const useDataLoading = (): boolean => {
  return useDataStore((state) => state.isLoading);
};

/**
 * 에러 상태 가져오기
 */
export const useDataErrors = (): Map<string, Error> => {
  return useDataStore((state) => state.errors);
};

/**
 * 특정 에러 가져오기
 */
export const useDataError = (key: string): Error | undefined => {
  const errors = useDataStore((state) => state.errors);
  return errors.get(key);
};
