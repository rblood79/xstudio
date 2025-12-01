/**
 * Data Component Renderers
 *
 * Dataset 등 데이터 관리 컴포넌트 렌더러
 * Dataset은 비시각적 컴포넌트로, UI를 렌더링하지 않고
 * 데이터를 로드하여 다른 컴포넌트가 참조할 수 있도록 합니다.
 */

import { useEffect, useRef } from 'react';
import type { PreviewElement, RenderContext } from '../types';
import { useRuntimeStore } from '../store';
import type { DataBinding } from '../../types/builder/unified.types';

/**
 * 데이터 로드 함수 (Dataset Store의 로직 재사용)
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

  throw new Error(`Unknown data source: ${dataBinding.source}`);
}

/**
 * Dataset 컴포넌트 (비시각적)
 *
 * 데이터를 로드하고 Runtime Store에 저장합니다.
 * 다른 컴포넌트는 datasetId를 통해 이 데이터를 참조할 수 있습니다.
 */
function DatasetComponent({ element }: { element: PreviewElement }) {
  const setDataState = useRuntimeStore((s) => s.setDataState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const props = element.props as {
    id?: string;
    name?: string;
    autoLoad?: boolean;
    refreshInterval?: number;
  };

  const datasetId = props.id || element.id;
  const autoLoad = props.autoLoad !== false;
  const refreshInterval = props.refreshInterval;
  const dataBinding = element.dataBinding as DataBinding | undefined;

  // 데이터 로드
  useEffect(() => {
    if (!dataBinding || !autoLoad) {
      return;
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 로딩 상태 설정
    setDataState(datasetId, {
      loading: true,
      data: null,
      error: null,
    });

    console.log(`📊 [Canvas] Dataset loading: ${datasetId}`);

    fetchDatasetData(dataBinding, abortController.signal)
      .then((data) => {
        if (!abortController.signal.aborted) {
          setDataState(datasetId, {
            loading: false,
            data,
            error: null,
          });
          console.log(`✅ [Canvas] Dataset loaded: ${datasetId} (${data.length} items)`);
        }
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setDataState(datasetId, {
            loading: false,
            data: null,
            error: errorMessage,
          });
          console.error(`❌ [Canvas] Dataset error: ${datasetId}`, errorMessage);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [datasetId, dataBinding, autoLoad, setDataState]);

  // 자동 새로고침
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !dataBinding || !autoLoad) {
      return;
    }

    console.log(`⏱️ [Canvas] Dataset auto-refresh: ${datasetId} every ${refreshInterval}ms`);

    const intervalId = setInterval(() => {
      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      fetchDatasetData(dataBinding, abortController.signal)
        .then((data) => {
          if (!abortController.signal.aborted) {
            setDataState(datasetId, {
              loading: false,
              data,
              error: null,
            });
          }
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setDataState(datasetId, {
              loading: false,
              data: null,
              error: errorMessage,
            });
          }
        });
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [datasetId, dataBinding, autoLoad, refreshInterval, setDataState]);

  // 비시각적 컴포넌트 - UI 렌더링 없음
  return null;
}

/**
 * Dataset 렌더러
 */
export function renderDataset(
  element: PreviewElement,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: RenderContext
): React.ReactNode {
  return <DatasetComponent key={element.id} element={element} />;
}
