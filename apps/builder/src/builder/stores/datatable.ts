/**
 * DataTable Store
 *
 * 중앙 집중식 데이터 관리를 위한 Zustand 스토어
 * 여러 컴포넌트가 동일한 데이터 소스를 공유할 수 있도록 지원
 *
 * @see docs/PLANNED_FEATURES.md - DataTable Component Architecture
 */

import { create } from 'zustand';
import type {
  DataTableStore,
  DataTableConfig,
  DataTableState,
  DataTableStatus,
  DataTableTransform,
} from '../../types/datatable.types';
import type { DataBinding } from '../../types/builder/unified.types';

/**
 * 초기 DataTable 상태 생성
 */
const createInitialDataTableState = (id: string): DataTableState => ({
  id,
  status: 'idle',
  data: [],
  error: null,
  lastLoadedAt: null,
  consumers: [],
});

/**
 * Transform 적용 함수
 * 데이터를 transform 설정에 따라 변환
 */
function applyTransform(
  data: Record<string, unknown>[],
  transform?: DataTableTransform
): Record<string, unknown>[] {
  if (!transform) return data;

  let result = [...data];

  // 1. Filter 적용
  if (transform.filter && transform.filter.length > 0) {
    result = result.filter((item) => {
      return transform.filter!.every((f) => {
        const value = item[f.field];
        const targetValue = f.value;

        switch (f.operator) {
          case 'eq':
            return value === targetValue;
          case 'ne':
            return value !== targetValue;
          case 'gt':
            return typeof value === 'number' && typeof targetValue === 'number' && value > targetValue;
          case 'gte':
            return typeof value === 'number' && typeof targetValue === 'number' && value >= targetValue;
          case 'lt':
            return typeof value === 'number' && typeof targetValue === 'number' && value < targetValue;
          case 'lte':
            return typeof value === 'number' && typeof targetValue === 'number' && value <= targetValue;
          case 'contains':
            return typeof value === 'string' && typeof targetValue === 'string' && value.includes(targetValue);
          case 'startsWith':
            return typeof value === 'string' && typeof targetValue === 'string' && value.startsWith(targetValue);
          case 'endsWith':
            return typeof value === 'string' && typeof targetValue === 'string' && value.endsWith(targetValue);
          default:
            return true;
        }
      });
    });
  }

  // 2. Sort 적용
  if (transform.sort) {
    const { field, direction } = transform.sort;
    result.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  // 3. Offset 적용
  if (transform.offset && transform.offset > 0) {
    result = result.slice(transform.offset);
  }

  // 4. Limit 적용
  if (transform.limit && transform.limit > 0) {
    result = result.slice(0, transform.limit);
  }

  // 5. Select 적용 (projection)
  if (transform.select && transform.select.length > 0) {
    result = result.map((item) => {
      const projected: Record<string, unknown> = {};
      transform.select!.forEach((field) => {
        if (field in item) {
          projected[field] = item[field];
        }
      });
      return projected;
    });
  }

  // 6. Map 적용 (field renaming)
  if (transform.map && Object.keys(transform.map).length > 0) {
    result = result.map((item) => {
      const mapped: Record<string, unknown> = { ...item };
      Object.entries(transform.map!).forEach(([oldKey, newKey]) => {
        if (oldKey in mapped) {
          mapped[newKey] = mapped[oldKey];
          delete mapped[oldKey];
        }
      });
      return mapped;
    });
  }

  return result;
}

/**
 * localStorage 캐시 키 생성
 */
const getCacheKey = (dataTableId: string) => `xstudio_datatable_cache_${dataTableId}`;

/**
 * 캐시 데이터 구조
 */
interface CachedData {
  data: Record<string, unknown>[];
  timestamp: number;
}

/**
 * localStorage에서 캐시 데이터 로드
 */
function loadCachedData(dataTableId: string, cacheTTL: number): Record<string, unknown>[] | null {
  try {
    const cacheKey = getCacheKey(dataTableId);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached) as CachedData;
    const now = Date.now();

    // TTL 체크
    if (now - timestamp > cacheTTL) {
      // 캐시 만료
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ DataTable cache expired: ${dataTableId}`);
      return null;
    }

    console.log(`📦 DataTable cache restored from localStorage: ${dataTableId}`);
    return data;
  } catch (error) {
    console.warn(`⚠️ Failed to load cached data for ${dataTableId}:`, error);
    return null;
  }
}

/**
 * localStorage에 캐시 데이터 저장
 */
function saveCachedData(dataTableId: string, data: Record<string, unknown>[]): void {
  try {
    const cacheKey = getCacheKey(dataTableId);
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`💾 DataTable cache saved to localStorage: ${dataTableId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to save cache for ${dataTableId}:`, error);
  }
}

/**
 * localStorage에서 캐시 데이터 삭제
 */
function clearCachedData(dataTableId: string): void {
  try {
    const cacheKey = getCacheKey(dataTableId);
    localStorage.removeItem(cacheKey);
    console.log(`🗑️ DataTable cache cleared: ${dataTableId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to clear cache for ${dataTableId}:`, error);
  }
}

/**
 * 데이터 로드 함수
 * useCollectionData의 로직을 재사용
 */
async function fetchDataTableData(
  dataBinding: DataBinding,
  signal?: AbortSignal
): Promise<Record<string, unknown>[]> {
  if (!dataBinding || dataBinding.type !== 'collection') {
    return [];
  }

  // Static Collection 처리
  if (dataBinding.source === 'static') {
    const staticConfig = dataBinding.config as { data?: unknown[] };
    const staticData = staticConfig.data;

    if (staticData && Array.isArray(staticData)) {
      return staticData as Record<string, unknown>[];
    }
    throw new Error('Static data is not an array or is missing');
  }

  // API Collection 처리
  if (dataBinding.source === 'api') {
    const config = dataBinding.config as {
      baseUrl?: string;
      customUrl?: string;
      endpoint?: string;
      method?: string;
      headers?: Record<string, string>;
      params?: Record<string, unknown>;
      dataMapping?: {
        resultPath?: string;
        idKey?: string;
        totalKey?: string;
      };
    };

    if (!config.baseUrl || !config.endpoint) {
      throw new Error('API configuration is incomplete');
    }

    // MOCK_DATA 특별 처리
    if (config.baseUrl === 'MOCK_DATA') {
      const { apiConfig } = await import('../../services/api');
      const mockFetch = apiConfig.MOCK_DATA;

      if (mockFetch) {
        const responseData = await mockFetch(
          config.endpoint || '/data',
          config.params
        );

        const resultData = config.dataMapping?.resultPath
          ? (responseData as Record<string, unknown>)[config.dataMapping.resultPath]
          : responseData;

        return Array.isArray(resultData)
          ? (resultData as Record<string, unknown>[])
          : [];
      }
      throw new Error('Mock API function not found');
    }

    // 실제 REST API 호출
    const response = await fetch(
      `${config.baseUrl}${config.customUrl || config.endpoint}`,
      {
        method: config.method || 'GET',
        headers: {
          ...config.headers,
          'Content-Type': 'application/json',
        },
        body: config.method !== 'GET' ? JSON.stringify(config.params) : undefined,
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    const resultData = config.dataMapping?.resultPath
      ? responseData[config.dataMapping.resultPath]
      : responseData;

    return Array.isArray(resultData)
      ? (resultData as Record<string, unknown>[])
      : [];
  }

  // Supabase (향후 구현)
  if (dataBinding.source === 'supabase') {
    throw new Error('Supabase data binding not yet implemented');
  }

  throw new Error(`Unknown data source: ${dataBinding.source}`);
}

/**
 * DataTable Store
 */
export const useDataTableStore = create<DataTableStore>((set, get) => ({
  // 상태
  dataTables: new Map<string, DataTableConfig>(),
  dataTableStates: new Map<string, DataTableState>(),

  // DataTable 등록
  registerDataTable: (config: DataTableConfig) => {
    set((state) => {
      const newDataTables = new Map(state.dataTables);
      const newDataTableStates = new Map(state.dataTableStates);

      newDataTables.set(config.id, config);

      // 기존 상태가 없으면 초기 상태 생성
      if (!newDataTableStates.has(config.id)) {
        newDataTableStates.set(config.id, createInitialDataTableState(config.id));
      }

      console.log(`📊 DataTable registered: ${config.id} (${config.name})`);

      return {
        dataTables: newDataTables,
        dataTableStates: newDataTableStates,
      };
    });
  },

  // DataTable 제거
  unregisterDataTable: (dataTableId: string) => {
    const { dataTables } = get();
    const config = dataTables.get(dataTableId);

    // localStorage 캐시 정리 (Phase 6 Advanced)
    if (config?.persistCache) {
      clearCachedData(dataTableId);
    }

    set((state) => {
      const newDataTables = new Map(state.dataTables);
      const newDataTableStates = new Map(state.dataTableStates);

      newDataTables.delete(dataTableId);
      newDataTableStates.delete(dataTableId);

      console.log(`🗑️ DataTable unregistered: ${dataTableId}`);

      return {
        dataTables: newDataTables,
        dataTableStates: newDataTableStates,
      };
    });
  },

  // DataTable 데이터 로드
  loadDataTable: async (dataTableId: string) => {
    const { dataTables, dataTableStates } = get();
    const config = dataTables.get(dataTableId);

    if (!config) {
      console.warn(`⚠️ DataTable not found: ${dataTableId}`);
      return;
    }

    const currentState = dataTableStates.get(dataTableId);

    const cacheTTL = config.cacheTTL || 5 * 60 * 1000; // 기본 5분

    // 메모리 캐시 체크
    if (
      config.useCache !== false &&
      currentState?.status === 'success' &&
      currentState.lastLoadedAt
    ) {
      const now = Date.now();

      if (now - currentState.lastLoadedAt < cacheTTL) {
        console.log(`📦 DataTable memory cache hit: ${dataTableId}`);
        return;
      }
    }

    // localStorage 캐시 체크 (Phase 6 Advanced)
    if (config.persistCache && config.useCache !== false) {
      const cachedData = loadCachedData(dataTableId, cacheTTL);

      if (cachedData) {
        // 캐시된 데이터로 즉시 상태 업데이트
        set((state) => {
          const newDataTableStates = new Map(state.dataTableStates);
          const existingState = newDataTableStates.get(dataTableId) || createInitialDataTableState(dataTableId);

          newDataTableStates.set(dataTableId, {
            ...existingState,
            status: 'success' as DataTableStatus,
            data: cachedData,
            error: null,
            lastLoadedAt: Date.now(),
          });

          return { dataTableStates: newDataTableStates };
        });

        console.log(`📦 DataTable localStorage cache hit: ${dataTableId}`);
        return;
      }
    }

    // 로딩 상태로 변경
    set((state) => {
      const newDataTableStates = new Map(state.dataTableStates);
      const existingState = newDataTableStates.get(dataTableId) || createInitialDataTableState(dataTableId);

      newDataTableStates.set(dataTableId, {
        ...existingState,
        status: 'loading' as DataTableStatus,
        error: null,
      });

      return { dataTableStates: newDataTableStates };
    });

    try {
      console.log(`🔄 DataTable loading: ${dataTableId}`);
      const rawData = await fetchDataTableData(config.dataBinding);

      // Transform 적용 (Phase 6 Advanced)
      const data = applyTransform(rawData, config.transform);

      // localStorage 캐시 저장 (Phase 6 Advanced)
      if (config.persistCache) {
        saveCachedData(dataTableId, data);
      }

      set((state) => {
        const newDataTableStates = new Map(state.dataTableStates);
        const existingState = newDataTableStates.get(dataTableId) || createInitialDataTableState(dataTableId);

        newDataTableStates.set(dataTableId, {
          ...existingState,
          status: 'success' as DataTableStatus,
          data,
          error: null,
          lastLoadedAt: Date.now(),
        });

        console.log(`✅ DataTable loaded: ${dataTableId} (raw: ${rawData.length}, transformed: ${data.length} items)`);

        return { dataTableStates: newDataTableStates };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      set((state) => {
        const newDataTableStates = new Map(state.dataTableStates);
        const existingState = newDataTableStates.get(dataTableId) || createInitialDataTableState(dataTableId);

        newDataTableStates.set(dataTableId, {
          ...existingState,
          status: 'error' as DataTableStatus,
          error: errorMessage,
        });

        console.error(`❌ DataTable load error: ${dataTableId}`, errorMessage);

        return { dataTableStates: newDataTableStates };
      });
    }
  },

  // DataTable 데이터 새로고침 (캐시 무시)
  refreshDataTable: async (dataTableId: string) => {
    const { dataTables } = get();
    const config = dataTables.get(dataTableId);

    if (!config) {
      console.warn(`⚠️ DataTable not found: ${dataTableId}`);
      return;
    }

    // 캐시 무효화
    set((state) => {
      const newDataTableStates = new Map(state.dataTableStates);
      const existingState = newDataTableStates.get(dataTableId);

      if (existingState) {
        newDataTableStates.set(dataTableId, {
          ...existingState,
          lastLoadedAt: null, // 캐시 무효화
        });
      }

      return { dataTableStates: newDataTableStates };
    });

    // 다시 로드
    await get().loadDataTable(dataTableId);
  },

  // 모든 DataTable 새로고침
  refreshAllDataTables: async () => {
    const { dataTables, refreshDataTable } = get();
    const dataTableIds = Array.from(dataTables.keys());

    console.log(`🔄 Refreshing all dataTables (${dataTableIds.length})`);

    await Promise.all(dataTableIds.map((id) => refreshDataTable(id)));

    console.log(`✅ All dataTables refreshed`);
  },

  // DataTable에 소비자 등록
  addConsumer: (dataTableId: string, consumerId: string) => {
    set((state) => {
      const newDataTableStates = new Map(state.dataTableStates);
      const existingState = newDataTableStates.get(dataTableId);

      if (existingState && !existingState.consumers.includes(consumerId)) {
        newDataTableStates.set(dataTableId, {
          ...existingState,
          consumers: [...existingState.consumers, consumerId],
        });

        console.log(`👥 Consumer added to ${dataTableId}: ${consumerId}`);
      }

      return { dataTableStates: newDataTableStates };
    });
  },

  // DataTable에서 소비자 제거
  removeConsumer: (dataTableId: string, consumerId: string) => {
    set((state) => {
      const newDataTableStates = new Map(state.dataTableStates);
      const existingState = newDataTableStates.get(dataTableId);

      if (existingState) {
        newDataTableStates.set(dataTableId, {
          ...existingState,
          consumers: existingState.consumers.filter((id) => id !== consumerId),
        });

        console.log(`👤 Consumer removed from ${dataTableId}: ${consumerId}`);
      }

      return { dataTableStates: newDataTableStates };
    });
  },

  // DataTable 데이터 가져오기
  getDataTableData: (dataTableId: string) => {
    const { dataTableStates } = get();
    const state = dataTableStates.get(dataTableId);
    return state?.data || [];
  },

  // DataTable 상태 가져오기
  getDataTableState: (dataTableId: string) => {
    const { dataTableStates } = get();
    return dataTableStates.get(dataTableId);
  },

  // DataTable 설정 업데이트
  updateDataTableConfig: (dataTableId: string, updates: Partial<DataTableConfig>) => {
    set((state) => {
      const newDataTables = new Map(state.dataTables);
      const existingConfig = newDataTables.get(dataTableId);

      if (existingConfig) {
        newDataTables.set(dataTableId, {
          ...existingConfig,
          ...updates,
        });

        console.log(`📝 DataTable config updated: ${dataTableId}`);
      }

      return { dataTables: newDataTables };
    });
  },

  // 모든 DataTable 초기화
  clearAllDataTables: () => {
    const { dataTables } = get();

    // 모든 localStorage 캐시 정리 (Phase 6 Advanced)
    dataTables.forEach((config, dataTableId) => {
      if (config.persistCache) {
        clearCachedData(dataTableId);
      }
    });

    set({
      dataTables: new Map(),
      dataTableStates: new Map(),
    });

    console.log(`🧹 All dataTables cleared`);
  },
}));

/**
 * DataTable 선택자 훅들
 */
export const useDataTable = (dataTableId: string) => {
  return useDataTableStore((state) => ({
    config: state.dataTables.get(dataTableId),
    state: state.dataTableStates.get(dataTableId),
    data: state.dataTableStates.get(dataTableId)?.data || [],
    loading: state.dataTableStates.get(dataTableId)?.status === 'loading',
    error: state.dataTableStates.get(dataTableId)?.error || null,
    status: state.dataTableStates.get(dataTableId)?.status || 'idle',
  }));
};

export const useDataTableActions = () => {
  return useDataTableStore((state) => ({
    registerDataTable: state.registerDataTable,
    unregisterDataTable: state.unregisterDataTable,
    loadDataTable: state.loadDataTable,
    refreshDataTable: state.refreshDataTable,
    refreshAllDataTables: state.refreshAllDataTables,
    addConsumer: state.addConsumer,
    removeConsumer: state.removeConsumer,
    updateDataTableConfig: state.updateDataTableConfig,
    clearAllDataTables: state.clearAllDataTables,
  }));
};

export const useAllDataTables = () => {
  return useDataTableStore((state) => ({
    dataTables: Array.from(state.dataTables.values()),
    dataTableStates: state.dataTableStates,
  }));
};
