/**
 * Data Store Actions - Factory Pattern
 *
 * DataTable, ApiEndpoint, Variable, Transformer의
 * CRUD 및 실행 액션을 독립적인 팩토리 함수로 분리
 *
 * ✅ IndexedDB 사용 (Supabase 대신)
 *
 * @see docs/features/DATA_PANEL_SYSTEM.md
 */

import type { StateCreator } from "zustand";
import { getDB } from "../../../lib/db";
import type {
  DataTable,
  DataTableCreate,
  DataTableUpdate,
  ApiEndpoint,
  ApiEndpointCreate,
  ApiEndpointUpdate,
  Variable,
  VariableCreate,
  VariableUpdate,
  Transformer,
  TransformerCreate,
  TransformerUpdate,
  DataStoreState,
  DataStoreActions,
  TransformContext,
} from "../../../types/builder/data.types";

// Type aliases for set/get
type DataStore = DataStoreState & DataStoreActions;
type SetState = Parameters<StateCreator<DataStore>>[0];
type GetState = Parameters<StateCreator<DataStore>>[1];

// ============================================
// DataTable Actions
// ============================================

/**
 * 프로젝트의 모든 DataTable을 가져오는 액션
 */
export const createFetchDataTablesAction =
  (set: SetState) =>
  async (projectId: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const data = await (db as unknown as {
        data_tables: { getByProject: (projectId: string) => Promise<DataTable[]> }
      }).data_tables?.getByProject(projectId) || [];

      const dataTablesMap = new Map<string, DataTable>();
      (data || []).forEach((dt) => {
        dataTablesMap.set(dt.name, dt);
      });

      set((state) => ({
        dataTables: dataTablesMap,
        isLoading: false,
        errors: new Map(state.errors),
      }));
    } catch (error) {
      console.error("❌ DataTable 목록 조회 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("fetchDataTables", error as Error);
        return { errors: newErrors, isLoading: false };
      });
    }
  };

/**
 * 새 DataTable을 생성하는 액션
 */
export const createCreateDataTableAction =
  (set: SetState, get: GetState) =>
  async (data: DataTableCreate): Promise<DataTable> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const newDataTable: DataTable = {
        id: crypto.randomUUID(),
        name: data.name,
        project_id: data.project_id,
        schema: data.schema || [],
        mockData: data.mockData || [],
        useMockData: data.useMockData ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (db as unknown as {
        data_tables: { insert: (dt: DataTable) => Promise<DataTable> }
      }).data_tables?.insert(newDataTable);

      // 메모리 상태 업데이트
      const { dataTables } = get();
      const newMap = new Map(dataTables);
      newMap.set(newDataTable.name, newDataTable);

      set({ dataTables: newMap, isLoading: false });

      return newDataTable;
    } catch (error) {
      console.error("❌ DataTable 생성 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("createDataTable", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * DataTable을 업데이트하는 액션
 */
export const createUpdateDataTableAction =
  (set: SetState, get: GetState) =>
  async (id: string, updates: DataTableUpdate): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        data_tables: { update: (id: string, updates: DataTableUpdate) => Promise<DataTable> }
      }).data_tables?.update(id, updates);

      // 메모리 상태 업데이트
      const { dataTables } = get();
      const newMap = new Map(dataTables);

      // ID로 DataTable 찾기
      let foundKey: string | undefined;
      dataTables.forEach((dt, key) => {
        if (dt.id === id) foundKey = key;
      });

      if (foundKey) {
        const existing = newMap.get(foundKey)!;
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };

        // 이름이 변경된 경우 키도 업데이트
        if (updates.name && updates.name !== foundKey) {
          newMap.delete(foundKey);
          newMap.set(updates.name, updated);
        } else {
          newMap.set(foundKey, updated);
        }
      }

      set({ dataTables: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ DataTable 업데이트 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("updateDataTable", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * DataTable을 삭제하는 액션
 */
export const createDeleteDataTableAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        data_tables: { delete: (id: string) => Promise<void> }
      }).data_tables?.delete(id);

      // 메모리 상태 업데이트
      const { dataTables } = get();
      const newMap = new Map(dataTables);

      // ID로 DataTable 찾아서 삭제
      dataTables.forEach((dt, key) => {
        if (dt.id === id) newMap.delete(key);
      });

      set({ dataTables: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ DataTable 삭제 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("deleteDataTable", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * DataTable의 데이터를 가져오는 액션 (Mock 또는 Runtime)
 */
export const createGetDataTableDataAction =
  (get: GetState) =>
  (name: string): Record<string, unknown>[] => {
    const { dataTables } = get();
    const dataTable = dataTables.get(name);

    if (!dataTable) {
      console.warn(`⚠️ DataTable "${name}" not found`);
      return [];
    }

    // useMockData가 true면 mockData 반환, 아니면 runtimeData 반환
    if (dataTable.useMockData) {
      return dataTable.mockData || [];
    }

    return dataTable.runtimeData || [];
  };

/**
 * DataTable의 런타임 데이터를 설정하는 액션
 */
export const createSetRuntimeDataAction =
  (set: SetState, get: GetState) =>
  (name: string, data: Record<string, unknown>[]): void => {
    const { dataTables } = get();
    const dataTable = dataTables.get(name);

    if (!dataTable) {
      console.warn(`⚠️ DataTable "${name}" not found`);
      return;
    }

    const newMap = new Map(dataTables);
    newMap.set(name, { ...dataTable, runtimeData: data });

    set({ dataTables: newMap });
  };

// ============================================
// ApiEndpoint Actions
// ============================================

/**
 * 프로젝트의 모든 ApiEndpoint을 가져오는 액션
 */
export const createFetchApiEndpointsAction =
  (set: SetState) =>
  async (projectId: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const data = await (db as unknown as {
        api_endpoints: { getByProject: (projectId: string) => Promise<ApiEndpoint[]> }
      }).api_endpoints?.getByProject(projectId) || [];

      const apiEndpointsMap = new Map<string, ApiEndpoint>();
      (data || []).forEach((ep) => {
        apiEndpointsMap.set(ep.name, ep);
      });

      set((state) => ({
        apiEndpoints: apiEndpointsMap,
        isLoading: false,
        errors: new Map(state.errors),
      }));
    } catch (error) {
      console.error("❌ ApiEndpoint 목록 조회 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("fetchApiEndpoints", error as Error);
        return { errors: newErrors, isLoading: false };
      });
    }
  };

/**
 * 새 ApiEndpoint을 생성하는 액션
 */
export const createCreateApiEndpointAction =
  (set: SetState, get: GetState) =>
  async (data: ApiEndpointCreate): Promise<ApiEndpoint> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const newApiEndpoint: ApiEndpoint = {
        id: crypto.randomUUID(),
        name: data.name,
        project_id: data.project_id,
        method: data.method,
        baseUrl: data.baseUrl,
        path: data.path,
        headers: data.headers || [],
        queryParams: data.queryParams || [],
        bodyType: data.bodyType || "none",
        bodyTemplate: data.bodyTemplate,
        responseMapping: data.responseMapping || { dataPath: "data" },
        targetDataTable: data.targetDataTable,
        executionMode: data.executionMode || "client",
        serverConfig: data.serverConfig,
        timeout: data.timeout || 30000,
        retryCount: data.retryCount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (db as unknown as {
        api_endpoints: { insert: (ep: ApiEndpoint) => Promise<ApiEndpoint> }
      }).api_endpoints?.insert(newApiEndpoint);

      // 메모리 상태 업데이트
      const { apiEndpoints } = get();
      const newMap = new Map(apiEndpoints);
      newMap.set(newApiEndpoint.name, newApiEndpoint);

      set({ apiEndpoints: newMap, isLoading: false });

      return newApiEndpoint;
    } catch (error) {
      console.error("❌ ApiEndpoint 생성 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("createApiEndpoint", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * ApiEndpoint을 업데이트하는 액션
 */
export const createUpdateApiEndpointAction =
  (set: SetState, get: GetState) =>
  async (id: string, updates: ApiEndpointUpdate): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        api_endpoints: { update: (id: string, updates: ApiEndpointUpdate) => Promise<ApiEndpoint> }
      }).api_endpoints?.update(id, updates);

      // 메모리 상태 업데이트
      const { apiEndpoints } = get();
      const newMap = new Map(apiEndpoints);

      // ID로 ApiEndpoint 찾기
      let foundKey: string | undefined;
      apiEndpoints.forEach((ep, key) => {
        if (ep.id === id) foundKey = key;
      });

      if (foundKey) {
        const existing = newMap.get(foundKey)!;
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };

        // 이름이 변경된 경우 키도 업데이트
        if (updates.name && updates.name !== foundKey) {
          newMap.delete(foundKey);
          newMap.set(updates.name, updated);
        } else {
          newMap.set(foundKey, updated);
        }
      }

      set({ apiEndpoints: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ ApiEndpoint 업데이트 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("updateApiEndpoint", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * ApiEndpoint을 삭제하는 액션
 */
export const createDeleteApiEndpointAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        api_endpoints: { delete: (id: string) => Promise<void> }
      }).api_endpoints?.delete(id);

      // 메모리 상태 업데이트
      const { apiEndpoints } = get();
      const newMap = new Map(apiEndpoints);

      // ID로 ApiEndpoint 찾아서 삭제
      apiEndpoints.forEach((ep, key) => {
        if (ep.id === id) newMap.delete(key);
      });

      set({ apiEndpoints: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ ApiEndpoint 삭제 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("deleteApiEndpoint", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * ApiEndpoint을 실행하는 액션
 */
export const createExecuteApiEndpointAction =
  (set: SetState, get: GetState) =>
  async (id: string, params?: Record<string, unknown>): Promise<unknown> => {
    const { apiEndpoints, loadingApis } = get();

    // ID로 ApiEndpoint 찾기
    let endpoint: ApiEndpoint | undefined;
    apiEndpoints.forEach((ep) => {
      if (ep.id === id) endpoint = ep;
    });

    if (!endpoint) {
      throw new Error(`ApiEndpoint not found: ${id}`);
    }

    // 로딩 상태 설정
    const newLoadingApis = new Set(loadingApis);
    newLoadingApis.add(id);
    set({ loadingApis: newLoadingApis });

    try {
      // URL 구성
      let url = `${endpoint.baseUrl}${endpoint.path}`;

      // Path 변수 치환 (예: /users/{{userId}})
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url = url.replace(`{{${key}}}`, String(value));
        });
      }

      // Query Parameters 추가
      if (endpoint.queryParams.length > 0) {
        const searchParams = new URLSearchParams();
        endpoint.queryParams.forEach((qp) => {
          if (qp.key) {
            let value = qp.value;
            // 변수 치환
            if (params) {
              Object.entries(params).forEach(([key, val]) => {
                value = value.replace(`{{${key}}}`, String(val));
              });
            }
            searchParams.append(qp.key, value);
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Headers 구성
      const headers: Record<string, string> = {};
      endpoint.headers.forEach((h) => {
        if (h.enabled && h.key) {
          let value = h.value;
          // 변수 치환
          if (params) {
            Object.entries(params).forEach(([key, val]) => {
              value = value.replace(`{{${key}}}`, String(val));
            });
          }
          headers[h.key] = value;
        }
      });

      // Body 구성
      let body: string | undefined;
      if (endpoint.bodyType !== "none" && endpoint.bodyTemplate) {
        body = endpoint.bodyTemplate;
        // 변수 치환
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            body = body!.replace(`{{${key}}}`, JSON.stringify(value));
          });
        }
      }

      // 개발 환경에서 외부 API 호출 시 프록시 사용 (CORS 우회)
      let fetchUrl = url;
      const isExternalUrl = url.startsWith("http://") || url.startsWith("https://");
      const isDevelopment = import.meta.env.DEV;

      if (isExternalUrl && isDevelopment) {
        fetchUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      }

      // Timeout 설정 (AbortController 사용)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout || 30000);

      // Fetch 요청
      const response = await fetch(fetchUrl, {
        method: endpoint.method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Response Mapping 적용
      let mappedData = result;
      if (endpoint.responseMapping.dataPath) {
        const paths = endpoint.responseMapping.dataPath.split(".");
        mappedData = paths.reduce((obj, path) => obj?.[path], result);
      }

      // Target DataTable에 데이터 설정
      if (endpoint.targetDataTable && mappedData) {
        const { dataTables } = get();
        const targetTable = dataTables.get(endpoint.targetDataTable);
        if (targetTable) {
          const newDataTables = new Map(dataTables);
          newDataTables.set(endpoint.targetDataTable, {
            ...targetTable,
            runtimeData: Array.isArray(mappedData) ? mappedData : [mappedData],
          });
          set({ dataTables: newDataTables });
        }
      }

      return mappedData;
    } catch (error) {
      console.error(`❌ ApiEndpoint "${endpoint?.name}" 실행 실패:`, error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set(`executeApi_${id}`, error as Error);
        return { errors: newErrors };
      });
      throw error;
    } finally {
      // 로딩 상태 해제
      const currentLoadingApis = get().loadingApis;
      const updatedLoadingApis = new Set(currentLoadingApis);
      updatedLoadingApis.delete(id);
      set({ loadingApis: updatedLoadingApis });
    }
  };

// ============================================
// Variable Actions
// ============================================

/**
 * 프로젝트의 모든 Variable을 가져오는 액션
 */
export const createFetchVariablesAction =
  (set: SetState) =>
  async (projectId: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const data = await (db as unknown as {
        variables: { getByProject: (projectId: string) => Promise<Variable[]> }
      }).variables?.getByProject(projectId) || [];

      const variablesMap = new Map<string, Variable>();
      (data || []).forEach((v) => {
        variablesMap.set(v.name, v);
      });

      set((state) => ({
        variables: variablesMap,
        isLoading: false,
        errors: new Map(state.errors),
      }));
    } catch (error) {
      console.error("❌ Variable 목록 조회 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("fetchVariables", error as Error);
        return { errors: newErrors, isLoading: false };
      });
    }
  };

/**
 * 새 Variable을 생성하는 액션
 */
export const createCreateVariableAction =
  (set: SetState, get: GetState) =>
  async (data: VariableCreate): Promise<Variable> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const newVariable: Variable = {
        id: crypto.randomUUID(),
        name: data.name,
        project_id: data.project_id,
        type: data.type,
        defaultValue: data.defaultValue,
        persist: data.persist ?? false,
        scope: data.scope || "global",
        page_id: data.page_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (db as unknown as {
        variables: { insert: (v: Variable) => Promise<Variable> }
      }).variables?.insert(newVariable);

      // 메모리 상태 업데이트
      const { variables } = get();
      const newMap = new Map(variables);
      newMap.set(newVariable.name, newVariable);

      set({ variables: newMap, isLoading: false });

      return newVariable;
    } catch (error) {
      console.error("❌ Variable 생성 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("createVariable", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * Variable을 업데이트하는 액션
 */
export const createUpdateVariableAction =
  (set: SetState, get: GetState) =>
  async (id: string, updates: VariableUpdate): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        variables: { update: (id: string, updates: VariableUpdate) => Promise<Variable> }
      }).variables?.update(id, updates);

      // 메모리 상태 업데이트
      const { variables } = get();
      const newMap = new Map(variables);

      // ID로 Variable 찾기
      let foundKey: string | undefined;
      variables.forEach((v, key) => {
        if (v.id === id) foundKey = key;
      });

      if (foundKey) {
        const existing = newMap.get(foundKey)!;
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };

        // 이름이 변경된 경우 키도 업데이트
        if (updates.name && updates.name !== foundKey) {
          newMap.delete(foundKey);
          newMap.set(updates.name, updated);
        } else {
          newMap.set(foundKey, updated);
        }
      }

      set({ variables: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ Variable 업데이트 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("updateVariable", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * Variable을 삭제하는 액션
 */
export const createDeleteVariableAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        variables: { delete: (id: string) => Promise<void> }
      }).variables?.delete(id);

      // 메모리 상태 업데이트
      const { variables } = get();
      const newMap = new Map(variables);

      // ID로 Variable 찾아서 삭제
      variables.forEach((v, key) => {
        if (v.id === id) newMap.delete(key);
      });

      set({ variables: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ Variable 삭제 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("deleteVariable", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * Variable 값을 가져오는 액션
 */
export const createGetVariableValueAction =
  (get: GetState) =>
  (name: string): unknown => {
    const { variables } = get();
    const variable = variables.get(name);

    if (!variable) {
      console.warn(`⚠️ Variable "${name}" not found`);
      return undefined;
    }

    return variable.defaultValue;
  };

/**
 * Variable 값을 설정하는 액션
 */
export const createSetVariableValueAction =
  (set: SetState, get: GetState) =>
  (name: string, value: unknown): void => {
    const { variables } = get();
    const variable = variables.get(name);

    if (!variable) {
      console.warn(`⚠️ Variable "${name}" not found`);
      return;
    }

    const newMap = new Map(variables);
    newMap.set(name, { ...variable, defaultValue: value });

    set({ variables: newMap });
  };

// ============================================
// Transformer Actions
// ============================================

/**
 * 프로젝트의 모든 Transformer을 가져오는 액션
 */
export const createFetchTransformersAction =
  (set: SetState) =>
  async (projectId: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const data = await (db as unknown as {
        transformers: { getByProject: (projectId: string) => Promise<Transformer[]> }
      }).transformers?.getByProject(projectId) || [];

      const transformersMap = new Map<string, Transformer>();
      (data || []).forEach((t) => {
        transformersMap.set(t.name, t);
      });

      set((state) => ({
        transformers: transformersMap,
        isLoading: false,
        errors: new Map(state.errors),
      }));
    } catch (error) {
      console.error("❌ Transformer 목록 조회 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("fetchTransformers", error as Error);
        return { errors: newErrors, isLoading: false };
      });
    }
  };

/**
 * 새 Transformer을 생성하는 액션
 */
export const createCreateTransformerAction =
  (set: SetState, get: GetState) =>
  async (data: TransformerCreate): Promise<Transformer> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      const newTransformer: Transformer = {
        id: crypto.randomUUID(),
        name: data.name,
        project_id: data.project_id,
        level: data.level,
        responseMapping: data.responseMapping,
        jsTransformer: data.jsTransformer,
        customFunction: data.customFunction,
        inputDataTable: data.inputDataTable,
        outputDataTable: data.outputDataTable,
        enabled: data.enabled ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (db as unknown as {
        transformers: { insert: (t: Transformer) => Promise<Transformer> }
      }).transformers?.insert(newTransformer);

      // 메모리 상태 업데이트
      const { transformers } = get();
      const newMap = new Map(transformers);
      newMap.set(newTransformer.name, newTransformer);

      set({ transformers: newMap, isLoading: false });

      return newTransformer;
    } catch (error) {
      console.error("❌ Transformer 생성 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("createTransformer", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * Transformer을 업데이트하는 액션
 */
export const createUpdateTransformerAction =
  (set: SetState, get: GetState) =>
  async (id: string, updates: TransformerUpdate): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        transformers: { update: (id: string, updates: TransformerUpdate) => Promise<Transformer> }
      }).transformers?.update(id, updates);

      // 메모리 상태 업데이트
      const { transformers } = get();
      const newMap = new Map(transformers);

      // ID로 Transformer 찾기
      let foundKey: string | undefined;
      transformers.forEach((t, key) => {
        if (t.id === id) foundKey = key;
      });

      if (foundKey) {
        const existing = newMap.get(foundKey)!;
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };

        // 이름이 변경된 경우 키도 업데이트
        if (updates.name && updates.name !== foundKey) {
          newMap.delete(foundKey);
          newMap.set(updates.name, updated);
        } else {
          newMap.set(foundKey, updated);
        }
      }

      set({ transformers: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ Transformer 업데이트 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("updateTransformer", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * Transformer을 삭제하는 액션
 */
export const createDeleteTransformerAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    set({ isLoading: true });

    try {
      const db = await getDB();
      await (db as unknown as {
        transformers: { delete: (id: string) => Promise<void> }
      }).transformers?.delete(id);

      // 메모리 상태 업데이트
      const { transformers } = get();
      const newMap = new Map(transformers);

      // ID로 Transformer 찾아서 삭제
      transformers.forEach((t, key) => {
        if (t.id === id) newMap.delete(key);
      });

      set({ transformers: newMap, isLoading: false });
    } catch (error) {
      console.error("❌ Transformer 삭제 실패:", error);
      set((state) => {
        const newErrors = new Map(state.errors);
        newErrors.set("deleteTransformer", error as Error);
        return { errors: newErrors, isLoading: false };
      });
      throw error;
    }
  };

/**
 * Transformer을 실행하는 액션
 */
export const createExecuteTransformerAction =
  (get: GetState) =>
  async (id: string, inputData: unknown[]): Promise<unknown[]> => {
    const { transformers, dataTables, variables } = get();

    // ID로 Transformer 찾기
    let transformer: Transformer | undefined;
    transformers.forEach((t) => {
      if (t.id === id) transformer = t;
    });

    if (!transformer) {
      throw new Error(`Transformer not found: ${id}`);
    }

    if (!transformer.enabled) {
      console.warn(`⚠️ Transformer "${transformer.name}" is disabled`);
      return inputData;
    }

    try {
      // Transform Context 구성
      const context: TransformContext = {
        dataTables: Object.fromEntries(
          Array.from(dataTables.entries()).map(([k, v]) => [
            k,
            v.useMockData ? v.mockData : (v.runtimeData || []),
          ])
        ),
        variables: Object.fromEntries(
          Array.from(variables.entries()).map(([k, v]) => [k, v.defaultValue])
        ),
        api: {
          fetch: async (url, options) => {
            const response = await fetch(url, options);
            return response.json();
          },
        },
        utils: {
          formatDate: (date, format) => {
            // 간단한 날짜 포맷팅 (실제로는 dayjs 등 사용)
            const d = new Date(date);
            return format
              .replace("YYYY", d.getFullYear().toString())
              .replace("MM", (d.getMonth() + 1).toString().padStart(2, "0"))
              .replace("DD", d.getDate().toString().padStart(2, "0"));
          },
          formatCurrency: (amount, currency) => {
            return new Intl.NumberFormat("ko-KR", {
              style: "currency",
              currency,
            }).format(amount);
          },
        },
      };

      let result: unknown[] = inputData;

      // Level에 따라 변환 실행
      switch (transformer.level) {
        case "level1_mapping":
          // Level 1: Response Mapping (노코드)
          if (transformer.responseMapping) {
            const { dataPath, fieldMappings } = transformer.responseMapping;

            // dataPath 적용
            if (dataPath && typeof inputData === "object") {
              const paths = dataPath.split(".");
              result = paths.reduce((obj: unknown, path) => {
                if (obj && typeof obj === "object" && path in obj) {
                  return (obj as Record<string, unknown>)[path];
                }
                return obj;
              }, inputData) as unknown[];
            }

            // fieldMappings 적용
            if (fieldMappings && Array.isArray(result)) {
              result = result.map((item) => {
                const mappedItem: Record<string, unknown> = {};
                fieldMappings.forEach((mapping) => {
                  let value = (item as Record<string, unknown>)[mapping.sourceKey];

                  // Transform 적용
                  if (mapping.transform && value !== undefined) {
                    switch (mapping.transform) {
                      case "uppercase":
                        value = String(value).toUpperCase();
                        break;
                      case "lowercase":
                        value = String(value).toLowerCase();
                        break;
                      case "trim":
                        value = String(value).trim();
                        break;
                      case "number":
                        value = Number(value);
                        break;
                      case "boolean":
                        value = Boolean(value);
                        break;
                      case "date":
                        value = new Date(String(value)).toISOString();
                        break;
                    }
                  }

                  mappedItem[mapping.targetKey] = value;
                });
                return mappedItem;
              });
            }
          }
          break;

        case "level2_transformer":
          // Level 2: JS Transformer (로우코드)
          if (transformer.jsTransformer?.code) {
            const fn = new Function("data", "context", transformer.jsTransformer.code);
            result = fn(inputData, context);
          }
          break;

        case "level3_custom":
          // Level 3: Custom Function (풀코드)
          // 이 레벨은 실제로는 서버에서 실행하거나 웹워커에서 실행해야 함
          console.warn("Level 3 Custom Function은 아직 지원되지 않습니다.");
          break;
      }

      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error(`❌ Transformer "${transformer?.name}" 실행 실패:`, error);
      throw error;
    }
  };

// ============================================
// Utility Actions
// ============================================

/**
 * 모든 에러 초기화
 */
export const createClearErrorsAction = (set: SetState) => (): void => {
  set({ errors: new Map() });
};

/**
 * 스토어 초기화
 */
export const createResetAction = (set: SetState) => (): void => {
  set({
    dataTables: new Map(),
    apiEndpoints: new Map(),
    variables: new Map(),
    transformers: new Map(),
    loadingApis: new Set(),
    errors: new Map(),
    isLoading: false,
  });
};
