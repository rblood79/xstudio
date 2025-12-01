/**
 * Dataset Type Definitions
 *
 * Dataset 컴포넌트를 위한 타입 정의
 * 중앙 집중식 데이터 관리 및 여러 컴포넌트 간 데이터 공유를 지원
 *
 * @see docs/PLANNED_FEATURES.md - Dataset Component Architecture
 */

import type { DataBinding } from './builder/unified.types';

/**
 * Dataset 상태
 */
export type DatasetStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Dataset Transform 설정
 */
export interface DatasetTransform {
  /** 정렬 설정 */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  /** 필터 설정 */
  filter?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
    value: unknown;
  }[];

  /** 필드 매핑 (renaming) */
  map?: Record<string, string>;

  /** 선택할 필드들 (projection) */
  select?: string[];

  /** 제한할 아이템 수 */
  limit?: number;

  /** 건너뛸 아이템 수 */
  offset?: number;
}

/**
 * Dataset 설정
 */
export interface DatasetConfig {
  /** Dataset 고유 ID */
  id: string;

  /** Dataset 표시 이름 */
  name: string;

  /** 데이터 바인딩 설정 (API, Static, Supabase) */
  dataBinding: DataBinding;

  /** 설명 (옵션) */
  description?: string;

  /** 자동 새로고침 간격 (ms, 옵션) */
  refreshInterval?: number;

  /** 캐시 사용 여부 (기본: true) */
  useCache?: boolean;

  /** 캐시 만료 시간 (ms, 기본: 5분) */
  cacheTTL?: number;

  /** 데이터 변환 설정 (Phase 6 Advanced) */
  transform?: DatasetTransform;

  /** localStorage에 캐시 영속화 (Phase 6 Advanced) */
  persistCache?: boolean;
}

/**
 * Dataset 런타임 상태
 */
export interface DatasetState {
  /** Dataset ID */
  id: string;

  /** 현재 상태 */
  status: DatasetStatus;

  /** 로드된 데이터 */
  data: Record<string, unknown>[];

  /** 에러 메시지 (있는 경우) */
  error: string | null;

  /** 마지막 로드 시간 */
  lastLoadedAt: number | null;

  /** 데이터를 사용 중인 컴포넌트 ID 목록 */
  consumers: string[];
}

/**
 * Dataset Store 상태
 */
export interface DatasetStoreState {
  /** 모든 Dataset 설정 (id -> config) */
  datasets: Map<string, DatasetConfig>;

  /** 모든 Dataset 런타임 상태 (id -> state) */
  datasetStates: Map<string, DatasetState>;
}

/**
 * Dataset Store 액션
 */
export interface DatasetStoreActions {
  /** Dataset 등록 */
  registerDataset: (config: DatasetConfig) => void;

  /** Dataset 제거 */
  unregisterDataset: (datasetId: string) => void;

  /** Dataset 데이터 로드 */
  loadDataset: (datasetId: string) => Promise<void>;

  /** Dataset 데이터 새로고침 */
  refreshDataset: (datasetId: string) => Promise<void>;

  /** 모든 Dataset 새로고침 */
  refreshAllDatasets: () => Promise<void>;

  /** Dataset에 소비자 등록 */
  addConsumer: (datasetId: string, consumerId: string) => void;

  /** Dataset에서 소비자 제거 */
  removeConsumer: (datasetId: string, consumerId: string) => void;

  /** Dataset 데이터 가져오기 */
  getDatasetData: (datasetId: string) => Record<string, unknown>[];

  /** Dataset 상태 가져오기 */
  getDatasetState: (datasetId: string) => DatasetState | undefined;

  /** Dataset 설정 업데이트 */
  updateDatasetConfig: (datasetId: string, updates: Partial<DatasetConfig>) => void;

  /** 모든 Dataset 초기화 */
  clearAllDatasets: () => void;
}

/**
 * Dataset Store 전체 타입
 */
export type DatasetStore = DatasetStoreState & DatasetStoreActions;

/**
 * Dataset 컴포넌트 Props
 */
export interface DatasetProps {
  /** Dataset 고유 ID (필수) */
  id: string;

  /** Dataset 표시 이름 (옵션) */
  name?: string;

  /** 데이터 바인딩 설정 */
  dataBinding?: DataBinding;

  /** 설명 (옵션) */
  description?: string;

  /** 자동 새로고침 간격 (ms, 옵션) */
  refreshInterval?: number;

  /** 초기 로드 시 자동 로드 여부 (기본: true) */
  autoLoad?: boolean;
}

/**
 * Dataset을 사용하는 컴포넌트의 공통 Props
 */
export interface DatasetConsumerProps {
  /** 참조할 Dataset ID (dataBinding과 상호 배타적) */
  datasetId?: string;

  /** 직접 데이터 바인딩 (datasetId와 상호 배타적) */
  dataBinding?: DataBinding;
}

/**
 * useDataset 훅 반환 타입
 */
export interface UseDatasetResult {
  /** 로드된 데이터 */
  data: Record<string, unknown>[];

  /** 로딩 상태 */
  loading: boolean;

  /** 에러 메시지 */
  error: string | null;

  /** 데이터 새로고침 */
  refresh: () => Promise<void>;

  /** Dataset 상태 */
  status: DatasetStatus;
}

/**
 * 타입 가드: DatasetConfig 확인
 */
export function isDatasetConfig(config: unknown): config is DatasetConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'id' in config &&
    'name' in config &&
    'dataBinding' in config
  );
}
