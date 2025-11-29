/**
 * Canvas Runtime Store Types
 *
 * Canvas Runtime은 Builder와 완전히 독립된 상태를 관리합니다.
 * postMessage를 통해서만 데이터를 수신합니다.
 */

import type { CSSProperties } from 'react';

// Element 타입 (Runtime에서 사용하는 최소 타입)
export interface RuntimeElement {
  id: string;
  tag: string;
  props: Record<string, unknown> & {
    style?: CSSProperties;
    className?: string;
    children?: string;
  };
  parent_id: string | null;
  page_id: string | null;
  layout_id?: string | null;
  order_num: number;
  customId?: string;
  dataBinding?: Record<string, unknown>;
}

// Page 타입
export interface RuntimePage {
  id: string;
  title: string;
  slug: string;
  order_num: number;
  layout_id?: string | null;
  parent_id?: string | null;  // Nested Routes 지원
}

// Layout 타입 (Nested Routes & Slug System)
export interface RuntimeLayout {
  id: string;
  name: string;
  slug?: string | null;
}

// Theme Variable 타입
export interface ThemeVar {
  name: string;
  value: string;
  isDark?: boolean;
}

// Data Source 타입
export interface DataSource {
  id: string;
  name: string;
  type: 'rest' | 'supabase' | 'static' | 'graphql';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  table?: string;
  filters?: Array<{ field: string; op: string; value: unknown }>;
  realtime?: boolean;
  data?: unknown;
  transform?: string;
  autoFetch?: 'onLoad' | 'manual';
  cacheTTL?: number;
}

// Data State (loading, error, data)
export interface DataState<T = unknown> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

// 상태 계층
export interface StateHierarchy {
  // App State (전역)
  appState: Record<string, unknown>;
  // Page State (페이지별)
  pageStates: Map<string, Record<string, unknown>>;
  // Component State (컴포넌트별)
  componentStates: Map<string, Record<string, unknown>>;
}

// Runtime Store State
export interface RuntimeStoreState extends StateHierarchy {
  // Elements
  elements: RuntimeElement[];
  setElements: (elements: RuntimeElement[]) => void;
  updateElementProps: (id: string, props: Record<string, unknown>) => void;

  // Pages
  pages: RuntimePage[];
  setPages: (pages: RuntimePage[]) => void;
  currentPageId: string | null;
  setCurrentPageId: (pageId: string | null) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;

  // Layouts (Nested Routes & Slug System)
  layouts: RuntimeLayout[];
  setLayouts: (layouts: RuntimeLayout[]) => void;
  currentLayoutId: string | null;
  setCurrentLayoutId: (layoutId: string | null) => void;

  // Theme
  themeVars: ThemeVar[];
  setThemeVars: (vars: ThemeVar[]) => void;
  isDarkMode: boolean;
  setDarkMode: (isDark: boolean) => void;

  // Data Sources
  dataSources: DataSource[];
  setDataSources: (sources: DataSource[]) => void;
  dataStates: Map<string, DataState>;
  setDataState: (sourceId: string, state: DataState) => void;

  // Auth Context
  authToken: string | null;
  setAuthToken: (token: string | null) => void;

  // State Management
  setState: (path: string, value: unknown) => void;
  getState: (path: string) => unknown;

  // Ready State
  isReady: boolean;
  setReady: (ready: boolean) => void;
}

// Legacy type aliases for backward compatibility
export type PreviewElement = RuntimeElement;
export type PreviewPage = RuntimePage;
export type PreviewLayout = RuntimeLayout;
export type PreviewStoreState = RuntimeStoreState;
