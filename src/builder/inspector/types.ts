/**
 * Inspector에서 관리하는 선택된 요소
 */
export interface SelectedElement {
  id: string;
  type: string;

  // PropertiesSection - tv() variants + 컴포넌트 고유 속성
  properties: {
    variant?: string;
    size?: string;
    [key: string]: unknown;
  };

  // StyleSection - 의미 클래스 + CSS 변수
  semanticClasses?: string[];
  cssVariables?: Record<string, string>;

  // DataSection - 데이터 바인딩
  dataBinding?: DataBinding;

  // EventSection - 이벤트 핸들러
  events?: EventHandler[];
}

/**
 * 데이터 바인딩 타입
 */
export type DataBindingType = "collection" | "value";

/**
 * 데이터 바인딩
 */
export type DataBinding = CollectionBinding | ValueBinding;

/**
 * Collection 바인딩 (Table, ListBox, GridList 등)
 */
export interface CollectionBinding {
  type: "collection";
  source: "static" | "supabase" | "state" | "api";
  config:
    | SupabaseCollectionConfig
    | StateCollectionConfig
    | StaticCollectionConfig
    | APICollectionConfig;
}

/**
 * Value 바인딩 (TextField, Select 등)
 */
export interface ValueBinding {
  type: "value";
  source: "static" | "state" | "computed" | "supabase" | "api";
  config:
    | StaticValueConfig
    | StateValueConfig
    | ComputedValueConfig
    | SupabaseValueConfig
    | APIValueConfig;
}

/**
 * Supabase Collection 설정
 */
export interface SupabaseCollectionConfig {
  table: string;
  columns: string[];
  filters?: FilterCondition[];
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  offset?: number;
}

/**
 * Supabase Value 설정
 */
export interface SupabaseValueConfig {
  table: string;
  column: string;
  filter?: FilterCondition;
}

/**
 * API Collection 설정
 */
export interface APICollectionConfig {
  baseUrl: string;
  customUrl?: string; // CUSTOM 선택 시 사용
  endpoint: string;
  method?: "GET" | "POST";
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  columns?: string[]; // 선택된 컬럼 목록 (사용자가 선택한 것)
  availableColumns?: string[]; // Load로 가져온 전체 컬럼 목록
  dataMapping: {
    resultPath: string; // 응답에서 데이터 배열 경로 (예: "data.items")
    idKey?: string; // ID 필드 이름 (기본값: "id")
    totalKey?: string; // 전체 개수 필드 경로
  };
}

/**
 * API Value 설정
 */
export interface APIValueConfig {
  baseUrl: string;
  endpoint: string;
  method?: "GET" | "POST";
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  dataMapping: {
    resultPath: string; // 응답에서 값 경로
  };
}

/**
 * 필터 조건
 */
export interface FilterCondition {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in";
  value: unknown;
}

/**
 * State Collection 설정
 */
export interface StateCollectionConfig {
  storePath: string;
  selector?: string;
}

/**
 * State Value 설정
 */
export interface StateValueConfig {
  storePath: string;
  transform?: string;
}

/**
 * Static Collection 설정
 */
export interface StaticCollectionConfig {
  data: unknown[];
  columnMapping?: {
    [columnName: string]: {
      key: string; // 데이터 객체의 키
      label?: string; // 표시할 라벨
      type?: "string" | "number" | "boolean" | "date";
      sortable?: boolean;
      width?: number;
      align?: "left" | "center" | "right";
    };
  };
}

/**
 * Static Value 설정
 */
export interface StaticValueConfig {
  value: string | number | boolean;
}

/**
 * Computed Value 설정
 */
export interface ComputedValueConfig {
  expression: string;
  dependencies: string[];
}

/**
 * 이벤트 핸들러
 */
export interface EventHandler {
  id: string;
  event: string;
  actions: EventAction[];
}

/**
 * 이벤트 액션
 */
export interface EventAction {
  type:
    | "navigate"
    | "setState"
    | "apiCall"
    | "showModal"
    | "showToast"
    | "validateForm"
    | "custom";
  config:
    | NavigateConfig
    | SetStateConfig
    | APICallConfig
    | ShowModalConfig
    | ShowToastConfig
    | ValidateFormConfig
    | CustomConfig;
}

/**
 * Navigate 액션 설정
 */
export interface NavigateConfig {
  path: string;
  openInNewTab?: boolean;
  replace?: boolean;
}

/**
 * SetState 액션 설정
 */
export interface SetStateConfig {
  storePath: string;
  value: unknown;
}

/**
 * API Call 액션 설정
 */
export interface APICallConfig {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  onSuccess?: EventAction;
  onError?: EventAction;
}

/**
 * Show Modal 액션 설정
 */
export interface ShowModalConfig {
  modalId: string;
  props?: Record<string, unknown>;
}

/**
 * Show Toast 액션 설정
 */
export interface ShowToastConfig {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

/**
 * Validate Form 액션 설정
 */
export interface ValidateFormConfig {
  formId: string;
  onValid?: EventAction;
  onInvalid?: EventAction;
}

/**
 * Custom 액션 설정
 */
export interface CustomConfig {
  code: string;
}

/**
 * 컴포넌트 에디터 Props (기존 PropertyEditorProps와 호환)
 */
export interface ComponentEditorProps {
  elementId: string;
  currentProps: Record<string, unknown>;
  onUpdate: (updatedProps: Record<string, unknown>) => void;
}

/**
 * 의미 클래스
 */
export interface SemanticClass {
  value: string;
  label: string;
  category: string;
  description?: string;
}

/**
 * 의미 클래스 카테고리
 */
export interface SemanticClassCategory {
  id: string;
  label: string;
  icon?: string;
  classes: SemanticClass[];
}
