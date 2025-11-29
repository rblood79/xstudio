/**
 * useDataSource Hook - Canvas Runtime에서 데이터 소스 접근
 *
 * Builder의 DataStore에서 전달된 데이터를 Canvas에서 사용하기 위한 훅
 * DataTable, ApiEndpoint 실행, Variable 접근을 통합 제공
 *
 * @example
 * // DataTable 사용
 * const { data, loading, error, refetch } = useDataSource('users');
 *
 * // API Endpoint 사용
 * const { data, loading, error, execute } = useDataSource('fetchUsers', {
 *   autoFetch: true,
 *   params: { page: 1 }
 * });
 *
 * // Variable 사용
 * const { value, setValue } = useVariable('currentUserId');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRuntimeStore } from '../store';

// ============================================
// Types
// ============================================

export interface DataSourceOptions {
  /** 자동 fetch 여부 (기본: true) */
  autoFetch?: boolean;
  /** API 호출 시 전달할 파라미터 */
  params?: Record<string, unknown>;
  /** 캐시 TTL (ms) */
  cacheTTL?: number;
  /** 의존성 배열 - 변경 시 자동 refetch */
  deps?: unknown[];
}

export interface DataSourceResult<T = unknown> {
  /** 데이터 */
  data: T | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 */
  error: string | null;
  /** 수동 fetch/refetch */
  refetch: (params?: Record<string, unknown>) => Promise<void>;
  /** API 실행 (POST 등) */
  execute: (params?: Record<string, unknown>) => Promise<T | null>;
}

export interface VariableResult<T = unknown> {
  /** 변수 값 */
  value: T | undefined;
  /** 변수 값 설정 */
  setValue: (value: T) => void;
  /** 변수 존재 여부 */
  exists: boolean;
}

// ============================================
// Cache System
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const dataCache = new Map<string, CacheEntry<unknown>>();

function getCachedData<T>(key: string): T | null {
  const entry = dataCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    dataCache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedData<T>(key: string, data: T, ttl: number): void {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// ============================================
// useDataSource Hook
// ============================================

/**
 * 데이터 소스 훅 - DataTable 또는 API Endpoint에서 데이터 가져오기
 *
 * @param sourceName - DataTable 이름 또는 ApiEndpoint 이름
 * @param options - 옵션 (autoFetch, params, cacheTTL, deps)
 */
export function useDataSource<T = unknown>(
  sourceName: string,
  options: DataSourceOptions = {}
): DataSourceResult<T> {
  const { autoFetch = true, params, cacheTTL = 0, deps = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runtime Store에서 데이터 소스 찾기
  const dataSources = useRuntimeStore((s) => s.dataSources);
  const dataStates = useRuntimeStore((s) => s.dataStates);
  const setDataState = useRuntimeStore((s) => s.setDataState);
  const routeParams = useRuntimeStore((s) => s.routeParams);
  const appState = useRuntimeStore((s) => s.appState);

  // 마운트 상태 추적
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // DataSource 찾기
  const dataSource = dataSources.find((ds) => ds.name === sourceName);

  // 파라미터에 변수 치환 적용
  const resolveParams = useCallback(
    (inputParams?: Record<string, unknown>): Record<string, unknown> => {
      const resolved: Record<string, unknown> = { ...inputParams };

      // {{route.xxx}} 패턴 치환
      for (const [key, value] of Object.entries(resolved)) {
        if (typeof value === 'string') {
          resolved[key] = value.replace(/\{\{route\.(\w+)\}\}/g, (_, paramName) => {
            return routeParams[paramName] || '';
          });
          // {{app.xxx}} 패턴 치환
          resolved[key] = (resolved[key] as string).replace(
            /\{\{app\.(\w+)\}\}/g,
            (_, stateName) => {
              return String(appState[stateName] || '');
            }
          );
        }
      }

      return resolved;
    },
    [routeParams, appState]
  );

  // Fetch 함수
  const fetchData = useCallback(
    async (fetchParams?: Record<string, unknown>): Promise<void> => {
      if (!dataSource) {
        setError(`Data source '${sourceName}' not found`);
        return;
      }

      // 캐시 확인
      const cacheKey = `${sourceName}:${JSON.stringify(fetchParams || params)}`;
      if (cacheTTL > 0) {
        const cached = getCachedData<T>(cacheKey);
        if (cached !== null) {
          setData(cached);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        let result: unknown = null;

        // DataSource 타입에 따른 처리
        switch (dataSource.type) {
          case 'static':
            // 정적 데이터
            result = dataSource.data;
            break;

          case 'rest': {
            // REST API 호출
            const resolvedParams = resolveParams(fetchParams || params);
            let url = dataSource.url || '';

            // URL 파라미터 치환
            url = url.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
              return String(resolvedParams[paramName] || '');
            });

            // Query params 추가
            if (
              dataSource.method === 'GET' &&
              Object.keys(resolvedParams).length > 0
            ) {
              const queryString = new URLSearchParams(
                resolvedParams as Record<string, string>
              ).toString();
              url += (url.includes('?') ? '&' : '?') + queryString;
            }

            const response = await fetch(url, {
              method: dataSource.method || 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...dataSource.headers,
              },
              body:
                dataSource.method !== 'GET' && dataSource.body
                  ? dataSource.body
                  : undefined,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            result = await response.json();

            // Transform 적용
            if (dataSource.transform) {
              try {
                // 안전한 함수 실행 (eval 대신 Function 생성자)
                const transformFn = new Function(
                  'data',
                  'context',
                  `return ${dataSource.transform}`
                );
                result = transformFn(result, { params: resolvedParams, routeParams });
              } catch (transformError) {
                console.error('Transform error:', transformError);
              }
            }
            break;
          }

          case 'supabase':
            // Supabase 쿼리 (향후 구현)
            console.warn('Supabase data source not yet implemented');
            break;

          case 'graphql':
            // GraphQL 쿼리 (향후 구현)
            console.warn('GraphQL data source not yet implemented');
            break;
        }

        if (isMounted.current) {
          setData(result as T);

          // 캐시 저장
          if (cacheTTL > 0) {
            setCachedData(cacheKey, result, cacheTTL);
          }

          // Runtime Store 상태 업데이트
          setDataState(sourceName, {
            loading: false,
            error: null,
            data: result,
          });
        }
      } catch (err) {
        if (isMounted.current) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setDataState(sourceName, {
            loading: false,
            error: errorMessage,
            data: null,
          });
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [
      dataSource,
      sourceName,
      params,
      cacheTTL,
      resolveParams,
      setDataState,
      routeParams,
    ]
  );

  // Execute 함수 (POST 등 mutation용)
  const execute = useCallback(
    async (execParams?: Record<string, unknown>): Promise<T | null> => {
      await fetchData(execParams);
      return data;
    },
    [fetchData, data]
  );

  // 자동 fetch
  useEffect(() => {
    if (autoFetch && dataSource) {
      // onLoad 타입이거나 autoFetch 설정이 없으면 자동 fetch
      if (dataSource.autoFetch !== 'manual') {
        fetchData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, sourceName, ...deps]);

  // DataStates에서 기존 상태 복원
  useEffect(() => {
    const existingState = dataStates.get(sourceName);
    if (existingState) {
      setData(existingState.data as T);
      setLoading(existingState.loading);
      setError(existingState.error);
    }
  }, [sourceName, dataStates]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    execute,
  };
}

// ============================================
// useVariable Hook
// ============================================

/**
 * Variable 훅 - 전역/페이지/컴포넌트 변수 접근
 *
 * @param variableName - 변수 이름 (app.xxx, page.xxx, component.xxx.yyy)
 */
export function useVariable<T = unknown>(variableName: string): VariableResult<T> {
  const getState = useRuntimeStore((s) => s.getState);
  const setState = useRuntimeStore((s) => s.setState);
  const appState = useRuntimeStore((s) => s.appState);
  const pageStates = useRuntimeStore((s) => s.pageStates);
  const componentStates = useRuntimeStore((s) => s.componentStates);
  const currentPageId = useRuntimeStore((s) => s.currentPageId);

  // 변수 값 가져오기
  const value = getState(variableName) as T | undefined;

  // 변수 존재 여부 확인
  const exists = (() => {
    const [scope, ...rest] = variableName.split('.');
    const key = rest.join('.');

    switch (scope) {
      case 'app':
        return key in appState;
      case 'page':
        return currentPageId
          ? key in (pageStates.get(currentPageId) || {})
          : false;
      case 'component': {
        const dotIndex = key.indexOf('.');
        if (dotIndex > 0) {
          const elementId = key.slice(0, dotIndex);
          const propKey = key.slice(dotIndex + 1);
          const componentState = componentStates.get(elementId);
          return componentState ? propKey in componentState : false;
        }
        return false;
      }
      default:
        return variableName in appState;
    }
  })();

  // 변수 값 설정 함수
  const setValue = useCallback(
    (newValue: T) => {
      setState(variableName, newValue);
    },
    [setState, variableName]
  );

  return {
    value,
    setValue,
    exists,
  };
}

// ============================================
// useRouteParams Hook
// ============================================

/**
 * Route Parameters 훅 - 동적 라우트 파라미터 접근
 *
 * @example
 * // URL: /products/:productId
 * const { productId } = useRouteParams();
 */
export function useRouteParams(): Record<string, string> {
  return useRuntimeStore((s) => s.routeParams);
}

// ============================================
// useDataBinding Hook
// ============================================

export interface DataBindingConfig {
  /** 바인딩 소스 (dataTable, api, variable, route) */
  source: 'dataTable' | 'api' | 'variable' | 'route';
  /** 소스 이름 또는 경로 */
  name: string;
  /** 데이터 경로 (예: "items[0].name") */
  path?: string;
  /** 기본값 */
  defaultValue?: unknown;
}

/**
 * 데이터 바인딩 훅 - 컴포넌트 속성과 데이터 소스 연결
 *
 * @param config - 바인딩 설정
 */
export function useDataBinding<T = unknown>(
  config: DataBindingConfig
): T | undefined {
  const { source, name, path, defaultValue } = config;

  // 각 소스 타입별 훅 사용
  const dataSourceResult = useDataSource(
    source === 'dataTable' || source === 'api' ? name : '',
    { autoFetch: source === 'dataTable' || source === 'api' }
  );
  const variableResult = useVariable(source === 'variable' ? name : '');
  const routeParams = useRouteParams();

  // 소스별 데이터 추출
  let rawData: unknown;

  switch (source) {
    case 'dataTable':
    case 'api':
      rawData = dataSourceResult.data;
      break;
    case 'variable':
      rawData = variableResult.value;
      break;
    case 'route':
      rawData = routeParams[name];
      break;
  }

  // path가 있으면 경로로 접근
  if (path && rawData !== null && rawData !== undefined) {
    const pathParts = path.split(/[.\[\]]+/).filter(Boolean);
    let current: unknown = rawData;

    for (const part of pathParts) {
      if (current === null || current === undefined) break;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }

    rawData = current;
  }

  return (rawData ?? defaultValue) as T | undefined;
}

// ============================================
// Exports
// ============================================

export default useDataSource;
