/**
 * Message Handler - postMessage 수신 처리
 *
 * Builder로부터 전달받는 메시지를 처리합니다.
 * Preview Runtime은 이 핸들러를 통해서만 데이터를 수신합니다.
 */

import type { PreviewStoreState, PreviewElement, PreviewPage, PreviewLayout, ThemeVar, DataSource, RuntimeDataTable, RuntimeApiEndpoint, RuntimeVariable } from '../store/types';

// ============================================
// Helper: Get Target Origin for postMessage
// ============================================

/**
 * postMessage의 targetOrigin을 반환합니다.
 * srcdoc iframe에서는 window.location.origin이 'null'이 되므로 '*' 사용
 */
function getTargetOrigin(): string {
  const origin = window.location.origin;
  // srcdoc iframe에서 origin은 'null' 문자열 또는 null
  if (!origin || origin === 'null') {
    return '*';
  }
  return origin;
}

// ============================================
// Message Types (Builder → Preview)
// ============================================

export interface UpdateElementsMessage {
  type: 'UPDATE_ELEMENTS';
  elements: PreviewElement[];
  // ⭐ Layout/Slot System: pageInfo도 함께 전송 (초기 로드 시 Layout 렌더링용)
  pageInfo?: {
    pageId: string | null;
    layoutId: string | null;
  };
}

export interface UpdateElementPropsMessage {
  type: 'UPDATE_ELEMENT_PROPS';
  elementId: string;
  props: Record<string, unknown>;
}

export interface DeleteElementMessage {
  type: 'DELETE_ELEMENT';
  elementId: string;
}

export interface DeleteElementsMessage {
  type: 'DELETE_ELEMENTS';
  elementIds: string[];
}

export interface ThemeVarsMessage {
  type: 'THEME_VARS';
  vars: ThemeVar[];
}

export interface SetDarkModeMessage {
  type: 'SET_DARK_MODE';
  isDark: boolean;
}

export interface UpdatePageInfoMessage {
  type: 'UPDATE_PAGE_INFO';
  pageId: string | null;
  layoutId: string | null;
}

export interface UpdatePagesMessage {
  type: 'UPDATE_PAGES';
  pages: PreviewPage[];
}

export interface UpdateDataSourcesMessage {
  type: 'UPDATE_DATA_SOURCES';
  dataSources: DataSource[];
}

export interface UpdateDataTablesMessage {
  type: 'UPDATE_DATA_TABLES';
  dataTables: RuntimeDataTable[];
}

export interface UpdateApiEndpointsMessage {
  type: 'UPDATE_API_ENDPOINTS';
  apiEndpoints: RuntimeApiEndpoint[];
}

export interface UpdateVariablesMessage {
  type: 'UPDATE_VARIABLES';
  variables: RuntimeVariable[];
}

export interface UpdateLayoutsMessage {
  type: 'UPDATE_LAYOUTS';
  layouts: PreviewLayout[];
}

export interface UpdateAuthContextMessage {
  type: 'UPDATE_AUTH_CONTEXT';
  token: string | null;
}

export interface RequestElementSelectionMessage {
  type: 'REQUEST_ELEMENT_SELECTION';
  elementId: string;
}

export type BuilderToPreviewMessage =
  | UpdateElementsMessage
  | UpdateElementPropsMessage
  | DeleteElementMessage
  | DeleteElementsMessage
  | ThemeVarsMessage
  | SetDarkModeMessage
  | UpdatePageInfoMessage
  | UpdatePagesMessage
  | UpdateLayoutsMessage
  | UpdateDataSourcesMessage
  | UpdateDataTablesMessage
  | UpdateApiEndpointsMessage
  | UpdateVariablesMessage
  | UpdateAuthContextMessage
  | RequestElementSelectionMessage;

// ============================================
// Message Handler Class
// ============================================

type StoreActions = Pick<
  PreviewStoreState,
  | 'setElements'
  | 'updateElementProps'
  | 'setThemeVars'
  | 'setDarkMode'
  | 'setCurrentPageId'
  | 'setCurrentLayoutId'
  | 'setPages'
  | 'setLayouts'
  | 'setDataSources'
  | 'setDataTables'
  | 'setApiEndpoints'
  | 'setVariables'
  | 'setAuthToken'
  | 'setReady'
>;

export class MessageHandler {
  private store: StoreActions;
  private onElementSelected?: (elementId: string) => void;

  constructor(
    store: StoreActions,
    options?: {
      onElementSelected?: (elementId: string) => void;
    }
  ) {
    this.store = store;
    this.onElementSelected = options?.onElementSelected;
  }

  /**
   * 메시지 이벤트 처리
   */
  handle(event: MessageEvent): void {
    // Origin 검증 (production에서만)
    if (import.meta.env.PROD) {
      if (event.origin !== window.location.origin) {
        console.warn('[Preview] Message from untrusted origin:', event.origin);
        return;
      }
    }

    const data = event.data as BuilderToPreviewMessage;
    if (!data || typeof data !== 'object' || !data.type) {
      return;
    }

    switch (data.type) {
      case 'UPDATE_ELEMENTS':
        this.handleUpdateElements(data);
        break;

      case 'UPDATE_ELEMENT_PROPS':
        this.handleUpdateElementProps(data);
        break;

      case 'DELETE_ELEMENT':
        this.handleDeleteElement(data);
        break;

      case 'DELETE_ELEMENTS':
        this.handleDeleteElements(data);
        break;

      case 'THEME_VARS':
        this.handleThemeVars(data);
        break;

      case 'SET_DARK_MODE':
        this.handleSetDarkMode(data);
        break;

      case 'UPDATE_PAGE_INFO':
        this.handleUpdatePageInfo(data);
        break;

      case 'UPDATE_PAGES':
        this.handleUpdatePages(data);
        break;

      case 'UPDATE_LAYOUTS':
        this.handleUpdateLayouts(data);
        break;

      case 'UPDATE_DATA_SOURCES':
        this.handleUpdateDataSources(data);
        break;

      case 'UPDATE_DATA_TABLES':
        this.handleUpdateDataTables(data);
        break;

      case 'UPDATE_API_ENDPOINTS':
        this.handleUpdateApiEndpoints(data);
        break;

      case 'UPDATE_VARIABLES':
        this.handleUpdateVariables(data);
        break;

      case 'UPDATE_AUTH_CONTEXT':
        this.handleUpdateAuthContext(data);
        break;

      case 'REQUEST_ELEMENT_SELECTION':
        this.handleRequestElementSelection(data);
        break;

      default:
        // 알 수 없는 메시지 타입은 무시
        break;
    }
  }

  // ============================================
  // Individual Message Handlers
  // ============================================

  private handleUpdateElements(data: UpdateElementsMessage): void {
    const elements = data.elements || [];

    this.store.setElements(elements);

    // ⭐ Layout/Slot System: pageInfo가 함께 전송된 경우 처리 (초기 로드 시)
    if (data.pageInfo) {
      this.store.setCurrentPageId(data.pageInfo.pageId);
      this.store.setCurrentLayoutId(data.pageInfo.layoutId);
    }

    // ACK 전송
    this.sendToBuilder({ type: 'ELEMENTS_UPDATED_ACK' });
  }

  private handleUpdateElementProps(data: UpdateElementPropsMessage): void {
    const { elementId, props } = data;
    if (elementId && props) {
      this.store.updateElementProps(elementId, props);
    }
  }

  private handleDeleteElement(data: DeleteElementMessage): void {
    // setElements를 통해 필터링하여 삭제
    // 실제 구현에서는 store에 deleteElement 메서드 추가 필요
    void data.elementId;
  }

  private handleDeleteElements(data: DeleteElementsMessage): void {
    void data.elementIds;
  }

  private handleThemeVars(data: ThemeVarsMessage): void {
    const vars = data.vars || [];
    this.store.setThemeVars(vars);
  }

  private handleSetDarkMode(data: SetDarkModeMessage): void {
    this.store.setDarkMode(data.isDark);
  }

  private handleUpdatePageInfo(data: UpdatePageInfoMessage): void {
    this.store.setCurrentPageId(data.pageId);
    this.store.setCurrentLayoutId(data.layoutId);
  }

  private handleUpdatePages(data: UpdatePagesMessage): void {
    const pages = data.pages || [];
    this.store.setPages(pages);
  }

  private handleUpdateLayouts(data: UpdateLayoutsMessage): void {
    const layouts = data.layouts || [];
    this.store.setLayouts(layouts);
  }

  private handleUpdateDataSources(data: UpdateDataSourcesMessage): void {
    const dataSources = data.dataSources || [];
    this.store.setDataSources(dataSources);
  }

  private handleUpdateDataTables(data: UpdateDataTablesMessage): void {
    const dataTables = data.dataTables || [];
    console.log('📦 [Canvas] UPDATE_DATA_TABLES 수신:', dataTables.length, '개');
    console.log('📦 [Canvas] 수신된 테이블:', dataTables.map(dt => ({
      name: dt.name,
      mockDataCount: dt.mockData?.length || 0,
      runtimeDataCount: dt.runtimeData?.length || 0,
      useMockData: dt.useMockData,
    })));
    this.store.setDataTables(dataTables);
  }

  private handleUpdateApiEndpoints(data: UpdateApiEndpointsMessage): void {
    const apiEndpoints = data.apiEndpoints || [];
    this.store.setApiEndpoints(apiEndpoints);
  }

  private handleUpdateVariables(data: UpdateVariablesMessage): void {
    const variables = data.variables || [];
    this.store.setVariables(variables);
  }

  private handleUpdateAuthContext(data: UpdateAuthContextMessage): void {
    this.store.setAuthToken(data.token);
  }

  private handleRequestElementSelection(data: RequestElementSelectionMessage): void {
    if (this.onElementSelected) {
      this.onElementSelected(data.elementId);
    }
  }

  // ============================================
  // Send to Builder
  // ============================================

  private sendToBuilder(message: Record<string, unknown>): void {
    try {
      window.parent.postMessage(message, getTargetOrigin());
    } catch (error) {
      console.error('[Preview] Failed to send message to builder:', error);
    }
  }
}

// ============================================
// Message Sender (Preview → Builder)
// ============================================

export const messageSender = {
  /**
   * Preview 준비 완료 알림
   */
  sendReady(): void {
    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
  },

  /**
   * 요소 선택 알림
   */
  sendElementSelected(
    elementId: string,
    rect: { top: number; left: number; width: number; height: number },
    options?: { isMultiSelect?: boolean; props?: Record<string, unknown>; style?: Record<string, unknown> }
  ): void {
    window.parent.postMessage(
      {
        type: 'ELEMENT_SELECTED',
        elementId,
        isMultiSelect: options?.isMultiSelect || false,
        payload: {
          rect,
          props: options?.props,
          style: options?.style,
        },
      },
      getTargetOrigin()
    );
  },

  /**
   * Computed Style 전송
   */
  sendComputedStyle(elementId: string, computedStyle: Record<string, string>): void {
    window.parent.postMessage(
      {
        type: 'ELEMENT_COMPUTED_STYLE',
        elementId,
        payload: { computedStyle },
      },
      getTargetOrigin()
    );
  },

  /**
   * Lasso 선택 결과 전송
   */
  sendDragSelected(elementIds: string[]): void {
    window.parent.postMessage(
      {
        type: 'ELEMENTS_DRAG_SELECTED',
        elementIds,
      },
      getTargetOrigin()
    );
  },

  /**
   * 상태 변경 알림 (디버깅용)
   */
  sendStateChanged(path: string, value: unknown): void {
    window.parent.postMessage(
      {
        type: 'STATE_CHANGED',
        path,
        value,
      },
      getTargetOrigin()
    );
  },
};
