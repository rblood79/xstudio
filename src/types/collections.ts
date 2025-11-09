/**
 * Collection Data Binding Type Definitions
 *
 * 컬렉션 데이터 바인딩 타입 정의
 * Phase 2: Inspector Data/Styles React Stately 전환에서 사용
 */

/**
 * 데이터 바인딩 소스 타입
 */
export type DataBindingSource = 'static' | 'api' | 'supabase';

/**
 * 데이터 바인딩 타입
 */
export type DataBindingType = 'collection' | 'single' | 'computed';

/**
 * 정적 데이터 설정
 */
export interface StaticConfig {
  /** 정적 데이터 배열 */
  data: unknown[];
}

/**
 * API 데이터 설정
 */
export interface APIConfig {
  /** 베이스 URL (MOCK_DATA 또는 실제 API URL) */
  baseUrl: string;

  /** API 엔드포인트 */
  endpoint: string;

  /** HTTP 메서드 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** 요청 헤더 (JSON 문자열) */
  headers?: string;

  /** 요청 본문 (JSON 문자열) */
  body?: string;

  /** 쿼리 파라미터 (JSON 문자열) */
  params?: string;

  /** 데이터 매핑 설정 */
  dataMapping?: DataMapping;

  /** 폴링 간격 (ms, 옵션) */
  pollInterval?: number;

  /** 캐시 사용 여부 */
  useCache?: boolean;

  /** 캐시 만료 시간 (ms) */
  cacheExpiry?: number;
}

/**
 * Supabase 데이터 설정
 */
export interface SupabaseConfig {
  /** 테이블 이름 */
  table: string;

  /** 선택할 컬럼 목록 */
  columns?: string[];

  /** 필터 조건 (Supabase 쿼리 문법) */
  filter?: string;

  /** 정렬 설정 */
  orderBy?: {
    column: string;
    ascending: boolean;
  };

  /** 페이지네이션 설정 */
  pagination?: {
    page: number;
    pageSize: number;
  };

  /** 실시간 구독 여부 */
  realtime?: boolean;
}

/**
 * 데이터 매핑 설정
 * API 응답 데이터를 컴포넌트에서 사용할 형식으로 변환
 */
export interface DataMapping {
  /** 결과 데이터 경로 (예: "data.items") */
  resultPath?: string;

  /** ID 필드명 (기본값: "id") */
  idField?: string;

  /** 라벨 필드명 (기본값: "name") */
  labelField?: string;

  /** 추가 필드 매핑 */
  fieldMapping?: Record<string, string>;

  /** 데이터 변환 함수 (JavaScript 코드 문자열) */
  transform?: string;
}

/**
 * 컬렉션 데이터 바인딩
 */
export interface CollectionDataBinding {
  /** 바인딩 타입 */
  type: 'collection';

  /** 데이터 소스 */
  source: DataBindingSource;

  /** 소스별 설정 */
  config: StaticConfig | APIConfig | SupabaseConfig;
}

/**
 * 단일 데이터 바인딩
 */
export interface SingleDataBinding {
  /** 바인딩 타입 */
  type: 'single';

  /** 데이터 소스 */
  source: DataBindingSource;

  /** 소스별 설정 */
  config: StaticConfig | APIConfig | SupabaseConfig;
}

/**
 * 계산된 데이터 바인딩
 */
export interface ComputedDataBinding {
  /** 바인딩 타입 */
  type: 'computed';

  /** 계산 함수 (JavaScript 코드 문자열) */
  expression: string;

  /** 의존하는 데이터 바인딩 ID 목록 */
  dependencies?: string[];
}

/**
 * 데이터 바인딩 유니온 타입
 */
export type DataBinding = CollectionDataBinding | SingleDataBinding | ComputedDataBinding;

/**
 * 컬럼 매핑 설정
 * Collection 컴포넌트에서 데이터 필드를 표시 형식으로 매핑
 */
export interface ColumnMapping {
  /** 컬럼 ID */
  id: string;

  /** 데이터 필드명 */
  fieldKey: string;

  /** 표시 라벨 */
  label?: string;

  /** 필드 타입 */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'image';

  /** 라벨 표시 여부 */
  showLabel?: boolean;

  /** 정렬 가능 여부 */
  sortable?: boolean;

  /** 필터 가능 여부 */
  filterable?: boolean;

  /** 포맷 함수 (JavaScript 코드 문자열) */
  format?: string;

  /** 너비 (px 또는 %) */
  width?: string;
}

/**
 * Mock Data API 엔드포인트
 */
export type MockDataEndpoint =
  // Geography
  | '/countries'
  | '/cities'
  | '/timezones'
  // E-commerce
  | '/categories'
  | '/products'
  // Status/Priority
  | '/status'
  | '/priorities'
  | '/tags'
  // Internationalization
  | '/languages'
  | '/currencies'
  // Tree Structures
  | '/component-tree'
  | '/engine-summary'
  | '/engines'
  | '/components'
  // Users/Organizations
  | '/users'
  | '/departments'
  | '/projects'
  | '/roles'
  | '/permissions';

/**
 * 데이터 로딩 상태
 */
export interface DataLoadingState {
  /** 로딩 중 여부 */
  loading: boolean;

  /** 에러 */
  error: Error | null;

  /** 데이터 */
  data: unknown[];

  /** 재로드 함수 */
  reload?: () => void;
}

/**
 * 타입 가드: CollectionDataBinding 확인
 */
export function isCollectionDataBinding(
  binding: DataBinding | undefined
): binding is CollectionDataBinding {
  return binding?.type === 'collection';
}

/**
 * 타입 가드: SingleDataBinding 확인
 */
export function isSingleDataBinding(
  binding: DataBinding | undefined
): binding is SingleDataBinding {
  return binding?.type === 'single';
}

/**
 * 타입 가드: ComputedDataBinding 확인
 */
export function isComputedDataBinding(
  binding: DataBinding | undefined
): binding is ComputedDataBinding {
  return binding?.type === 'computed';
}

/**
 * 타입 가드: APIConfig 확인
 */
export function isAPIConfig(config: unknown): config is APIConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'baseUrl' in config &&
    'endpoint' in config
  );
}

/**
 * 타입 가드: SupabaseConfig 확인
 */
export function isSupabaseConfig(config: unknown): config is SupabaseConfig {
  return typeof config === 'object' && config !== null && 'table' in config;
}

/**
 * 타입 가드: StaticConfig 확인
 */
export function isStaticConfig(config: unknown): config is StaticConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'data' in config &&
    Array.isArray((config as StaticConfig).data)
  );
}
