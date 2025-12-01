/**
 * Dataset Store
 *
 * 중앙 집중식 데이터 관리를 위한 Zustand 스토어
 * 여러 컴포넌트가 동일한 데이터 소스를 공유할 수 있도록 지원
 *
 * @see docs/PLANNED_FEATURES.md - Dataset Component Architecture
 */

import { create } from 'zustand';
import type {
  DatasetStore,
  DatasetConfig,
  DatasetState,
  DatasetStatus,
  DatasetTransform,
} from '../../types/dataset.types';
import type { DataBinding } from '../../types/builder/unified.types';

/**
 * 초기 Dataset 상태 생성
 */
const createInitialDatasetState = (id: string): DatasetState => ({
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
  transform?: DatasetTransform
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
const getCacheKey = (datasetId: string) => `xstudio_dataset_cache_${datasetId}`;

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
function loadCachedData(datasetId: string, cacheTTL: number): Record<string, unknown>[] | null {
  try {
    const cacheKey = getCacheKey(datasetId);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached) as CachedData;
    const now = Date.now();

    // TTL 체크
    if (now - timestamp > cacheTTL) {
      // 캐시 만료
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Dataset cache expired: ${datasetId}`);
      return null;
    }

    console.log(`📦 Dataset cache restored from localStorage: ${datasetId}`);
    return data;
  } catch (error) {
    console.warn(`⚠️ Failed to load cached data for ${datasetId}:`, error);
    return null;
  }
}

/**
 * localStorage에 캐시 데이터 저장
 */
function saveCachedData(datasetId: string, data: Record<string, unknown>[]): void {
  try {
    const cacheKey = getCacheKey(datasetId);
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`💾 Dataset cache saved to localStorage: ${datasetId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to save cache for ${datasetId}:`, error);
  }
}

/**
 * localStorage에서 캐시 데이터 삭제
 */
function clearCachedData(datasetId: string): void {
  try {
    const cacheKey = getCacheKey(datasetId);
    localStorage.removeItem(cacheKey);
    console.log(`🗑️ Dataset cache cleared: ${datasetId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to clear cache for ${datasetId}:`, error);
  }
}

/**
 * 데이터 로드 함수
 * useCollectionData의 로직을 재사용
 */
async function fetchDatasetData(
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
 * Dataset Store
 */
export const useDatasetStore = create<DatasetStore>((set, get) => ({
  // 상태
  datasets: new Map<string, DatasetConfig>(),
  datasetStates: new Map<string, DatasetState>(),

  // Dataset 등록
  registerDataset: (config: DatasetConfig) => {
    set((state) => {
      const newDatasets = new Map(state.datasets);
      const newDatasetStates = new Map(state.datasetStates);

      newDatasets.set(config.id, config);

      // 기존 상태가 없으면 초기 상태 생성
      if (!newDatasetStates.has(config.id)) {
        newDatasetStates.set(config.id, createInitialDatasetState(config.id));
      }

      console.log(`📊 Dataset registered: ${config.id} (${config.name})`);

      return {
        datasets: newDatasets,
        datasetStates: newDatasetStates,
      };
    });
  },

  // Dataset 제거
  unregisterDataset: (datasetId: string) => {
    const { datasets } = get();
    const config = datasets.get(datasetId);

    // ⭐ localStorage 캐시 정리 (Phase 6 Advanced)
    if (config?.persistCache) {
      clearCachedData(datasetId);
    }

    set((state) => {
      const newDatasets = new Map(state.datasets);
      const newDatasetStates = new Map(state.datasetStates);

      newDatasets.delete(datasetId);
      newDatasetStates.delete(datasetId);

      console.log(`🗑️ Dataset unregistered: ${datasetId}`);

      return {
        datasets: newDatasets,
        datasetStates: newDatasetStates,
      };
    });
  },

  // Dataset 데이터 로드
  loadDataset: async (datasetId: string) => {
    const { datasets, datasetStates } = get();
    const config = datasets.get(datasetId);

    if (!config) {
      console.warn(`⚠️ Dataset not found: ${datasetId}`);
      return;
    }

    const currentState = datasetStates.get(datasetId);

    const cacheTTL = config.cacheTTL || 5 * 60 * 1000; // 기본 5분

    // 메모리 캐시 체크
    if (
      config.useCache !== false &&
      currentState?.status === 'success' &&
      currentState.lastLoadedAt
    ) {
      const now = Date.now();

      if (now - currentState.lastLoadedAt < cacheTTL) {
        console.log(`📦 Dataset memory cache hit: ${datasetId}`);
        return;
      }
    }

    // ⭐ localStorage 캐시 체크 (Phase 6 Advanced)
    if (config.persistCache && config.useCache !== false) {
      const cachedData = loadCachedData(datasetId, cacheTTL);

      if (cachedData) {
        // 캐시된 데이터로 즉시 상태 업데이트
        set((state) => {
          const newDatasetStates = new Map(state.datasetStates);
          const existingState = newDatasetStates.get(datasetId) || createInitialDatasetState(datasetId);

          newDatasetStates.set(datasetId, {
            ...existingState,
            status: 'success' as DatasetStatus,
            data: cachedData,
            error: null,
            lastLoadedAt: Date.now(),
          });

          return { datasetStates: newDatasetStates };
        });

        console.log(`📦 Dataset localStorage cache hit: ${datasetId}`);
        return;
      }
    }

    // 로딩 상태로 변경
    set((state) => {
      const newDatasetStates = new Map(state.datasetStates);
      const existingState = newDatasetStates.get(datasetId) || createInitialDatasetState(datasetId);

      newDatasetStates.set(datasetId, {
        ...existingState,
        status: 'loading' as DatasetStatus,
        error: null,
      });

      return { datasetStates: newDatasetStates };
    });

    try {
      console.log(`🔄 Dataset loading: ${datasetId}`);
      const rawData = await fetchDatasetData(config.dataBinding);

      // ⭐ Transform 적용 (Phase 6 Advanced)
      const data = applyTransform(rawData, config.transform);

      // ⭐ localStorage 캐시 저장 (Phase 6 Advanced)
      if (config.persistCache) {
        saveCachedData(datasetId, data);
      }

      set((state) => {
        const newDatasetStates = new Map(state.datasetStates);
        const existingState = newDatasetStates.get(datasetId) || createInitialDatasetState(datasetId);

        newDatasetStates.set(datasetId, {
          ...existingState,
          status: 'success' as DatasetStatus,
          data,
          error: null,
          lastLoadedAt: Date.now(),
        });

        console.log(`✅ Dataset loaded: ${datasetId} (raw: ${rawData.length}, transformed: ${data.length} items)`);

        return { datasetStates: newDatasetStates };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      set((state) => {
        const newDatasetStates = new Map(state.datasetStates);
        const existingState = newDatasetStates.get(datasetId) || createInitialDatasetState(datasetId);

        newDatasetStates.set(datasetId, {
          ...existingState,
          status: 'error' as DatasetStatus,
          error: errorMessage,
        });

        console.error(`❌ Dataset load error: ${datasetId}`, errorMessage);

        return { datasetStates: newDatasetStates };
      });
    }
  },

  // Dataset 데이터 새로고침 (캐시 무시)
  refreshDataset: async (datasetId: string) => {
    const { datasets } = get();
    const config = datasets.get(datasetId);

    if (!config) {
      console.warn(`⚠️ Dataset not found: ${datasetId}`);
      return;
    }

    // 캐시 무효화
    set((state) => {
      const newDatasetStates = new Map(state.datasetStates);
      const existingState = newDatasetStates.get(datasetId);

      if (existingState) {
        newDatasetStates.set(datasetId, {
          ...existingState,
          lastLoadedAt: null, // 캐시 무효화
        });
      }

      return { datasetStates: newDatasetStates };
    });

    // 다시 로드
    await get().loadDataset(datasetId);
  },

  // 모든 Dataset 새로고침
  refreshAllDatasets: async () => {
    const { datasets, refreshDataset } = get();
    const datasetIds = Array.from(datasets.keys());

    console.log(`🔄 Refreshing all datasets (${datasetIds.length})`);

    await Promise.all(datasetIds.map((id) => refreshDataset(id)));

    console.log(`✅ All datasets refreshed`);
  },

  // Dataset에 소비자 등록
  addConsumer: (datasetId: string, consumerId: string) => {
    set((state) => {
      const newDatasetStates = new Map(state.datasetStates);
      const existingState = newDatasetStates.get(datasetId);

      if (existingState && !existingState.consumers.includes(consumerId)) {
        newDatasetStates.set(datasetId, {
          ...existingState,
          consumers: [...existingState.consumers, consumerId],
        });

        console.log(`👥 Consumer added to ${datasetId}: ${consumerId}`);
      }

      return { datasetStates: newDatasetStates };
    });
  },

  // Dataset에서 소비자 제거
  removeConsumer: (datasetId: string, consumerId: string) => {
    set((state) => {
      const newDatasetStates = new Map(state.datasetStates);
      const existingState = newDatasetStates.get(datasetId);

      if (existingState) {
        newDatasetStates.set(datasetId, {
          ...existingState,
          consumers: existingState.consumers.filter((id) => id !== consumerId),
        });

        console.log(`👤 Consumer removed from ${datasetId}: ${consumerId}`);
      }

      return { datasetStates: newDatasetStates };
    });
  },

  // Dataset 데이터 가져오기
  getDatasetData: (datasetId: string) => {
    const { datasetStates } = get();
    const state = datasetStates.get(datasetId);
    return state?.data || [];
  },

  // Dataset 상태 가져오기
  getDatasetState: (datasetId: string) => {
    const { datasetStates } = get();
    return datasetStates.get(datasetId);
  },

  // Dataset 설정 업데이트
  updateDatasetConfig: (datasetId: string, updates: Partial<DatasetConfig>) => {
    set((state) => {
      const newDatasets = new Map(state.datasets);
      const existingConfig = newDatasets.get(datasetId);

      if (existingConfig) {
        newDatasets.set(datasetId, {
          ...existingConfig,
          ...updates,
        });

        console.log(`📝 Dataset config updated: ${datasetId}`);
      }

      return { datasets: newDatasets };
    });
  },

  // 모든 Dataset 초기화
  clearAllDatasets: () => {
    const { datasets } = get();

    // ⭐ 모든 localStorage 캐시 정리 (Phase 6 Advanced)
    datasets.forEach((config, datasetId) => {
      if (config.persistCache) {
        clearCachedData(datasetId);
      }
    });

    set({
      datasets: new Map(),
      datasetStates: new Map(),
    });

    console.log(`🧹 All datasets cleared`);
  },
}));

/**
 * Dataset 선택자 훅들
 */
export const useDataset = (datasetId: string) => {
  return useDatasetStore((state) => ({
    config: state.datasets.get(datasetId),
    state: state.datasetStates.get(datasetId),
    data: state.datasetStates.get(datasetId)?.data || [],
    loading: state.datasetStates.get(datasetId)?.status === 'loading',
    error: state.datasetStates.get(datasetId)?.error || null,
    status: state.datasetStates.get(datasetId)?.status || 'idle',
  }));
};

export const useDatasetActions = () => {
  return useDatasetStore((state) => ({
    registerDataset: state.registerDataset,
    unregisterDataset: state.unregisterDataset,
    loadDataset: state.loadDataset,
    refreshDataset: state.refreshDataset,
    refreshAllDatasets: state.refreshAllDatasets,
    addConsumer: state.addConsumer,
    removeConsumer: state.removeConsumer,
    updateDatasetConfig: state.updateDatasetConfig,
    clearAllDatasets: state.clearAllDatasets,
  }));
};

export const useAllDatasets = () => {
  return useDatasetStore((state) => ({
    datasets: Array.from(state.datasets.values()),
    datasetStates: state.datasetStates,
  }));
};
