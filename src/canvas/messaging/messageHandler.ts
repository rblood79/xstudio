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

// ============================================
// 🚀 Phase 4: Delta Update Messages
// ============================================

/**
 * 단일 요소 추가
 * - 전체 배열 대신 추가된 요소만 전송
 */
export interface DeltaElementAddedMessage {
  type: 'DELTA_ELEMENT_ADDED';
  element: PreviewElement;
  childElements?: PreviewElement[];
}

/**
 * 단일 요소 업데이트 (props/style 변경)
 * - 변경된 props만 전송 (전체 요소 대신)
 */
export interface DeltaElementUpdatedMessage {
  type: 'DELTA_ELEMENT_UPDATED';
  elementId: string;
  /** 변경된 props만 (기존 props와 merge) */
  propsChanges: Record<string, unknown>;
  /** parent_id 변경 (선택적) */
  parentId?: string | null;
  /** order_num 변경 (선택적) */
  orderNum?: number;
}

/**
 * 단일 요소 삭제
 */
export interface DeltaElementRemovedMessage {
  type: 'DELTA_ELEMENT_REMOVED';
  elementId: string;
  /** 자식 요소들도 함께 삭제 */
  childElementIds?: string[];
}

/**
 * 배치 업데이트 (여러 요소 동시 변경)
 * - 다중 선택 편집, 정렬 등에 사용
 */
export interface DeltaBatchUpdateMessage {
  type: 'DELTA_BATCH_UPDATE';
  updates: Array<{
    elementId: string;
    propsChanges?: Record<string, unknown>;
    parentId?: string | null;
    orderNum?: number;
  }>;
}

/**
 * Delta 메시지 통합 타입
 */
export type DeltaMessage =
  | DeltaElementAddedMessage
  | DeltaElementUpdatedMessage
  | DeltaElementRemovedMessage
  | DeltaBatchUpdateMessage;

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
  | RequestElementSelectionMessage
  // 🚀 Phase 4: Delta Messages
  | DeltaElementAddedMessage
  | DeltaElementUpdatedMessage
  | DeltaElementRemovedMessage
  | DeltaBatchUpdateMessage;

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
> & {
  // 🚀 Phase 4: Delta-specific actions (optional, fallback to setElements if not available)
  addElement?: (element: PreviewElement) => void;
  addElements?: (elements: PreviewElement[]) => void;
  removeElement?: (elementId: string) => void;
  removeElements?: (elementIds: string[]) => void;
  updateElement?: (elementId: string, updates: Partial<PreviewElement>) => void;
  getElements?: () => PreviewElement[];
};

export class MessageHandler {
  private store: StoreActions;
  private onElementSelected?: (elementId: string) => void;
  private onVariablesUpdated?: (variables: RuntimeVariable[]) => void;

  constructor(
    store: StoreActions,
    options?: {
      onElementSelected?: (elementId: string) => void;
      onVariablesUpdated?: (variables: RuntimeVariable[]) => void;
    }
  ) {
    this.store = store;
    this.onElementSelected = options?.onElementSelected;
    this.onVariablesUpdated = options?.onVariablesUpdated;
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

      // 🚀 Phase 4: Delta Update Handlers
      case 'DELTA_ELEMENT_ADDED':
        this.handleDeltaElementAdded(data);
        break;

      case 'DELTA_ELEMENT_UPDATED':
        this.handleDeltaElementUpdated(data);
        break;

      case 'DELTA_ELEMENT_REMOVED':
        this.handleDeltaElementRemoved(data);
        break;

      case 'DELTA_BATCH_UPDATE':
        this.handleDeltaBatchUpdate(data);
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
    console.log('📦 [Canvas] UPDATE_VARIABLES 수신:', variables.length, '개');
    console.log('📦 [Canvas] 수신된 변수:', variables);
    this.store.setVariables(variables);
    // EventEngine에 variables 동기화
    if (this.onVariablesUpdated) {
      this.onVariablesUpdated(variables);
    }
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
  // 🚀 Phase 4: Delta Update Handlers
  // ============================================

  /**
   * 요소 추가 Delta 처리
   * - 전체 배열 교체 대신 단일 요소만 추가
   * - O(n) → O(1) 성능 개선
   */
  private handleDeltaElementAdded(data: DeltaElementAddedMessage): void {
    const { element, childElements } = data;

    if (this.store.addElement && this.store.addElements) {
      // 🚀 최적화된 경로: 단일 요소 추가
      this.store.addElement(element);
      if (childElements && childElements.length > 0) {
        this.store.addElements(childElements);
      }
    } else {
      // Fallback: setElements 사용 (기존 방식)
      if (this.store.getElements) {
        const currentElements = this.store.getElements();
        const newElements = [...currentElements, element, ...(childElements || [])];
        this.store.setElements(newElements);
      }
    }

    // ACK 전송
    this.sendToBuilder({
      type: 'DELTA_ACK',
      operation: 'ELEMENT_ADDED',
      elementId: element.id,
    });

    console.log(`🚀 [Preview] Delta: Element added (${element.tag})`);
  }

  /**
   * 요소 업데이트 Delta 처리
   * - props 변경만 적용 (전체 교체 아님)
   */
  private handleDeltaElementUpdated(data: DeltaElementUpdatedMessage): void {
    const { elementId, propsChanges, parentId, orderNum } = data;

    if (this.store.updateElement) {
      // 🚀 최적화된 경로: 부분 업데이트
      const updates: Partial<PreviewElement> = {};

      if (propsChanges && Object.keys(propsChanges).length > 0) {
        updates.props = propsChanges as PreviewElement['props'];
      }
      if (parentId !== undefined) {
        updates.parent_id = parentId;
      }
      if (orderNum !== undefined) {
        updates.order_num = orderNum;
      }

      this.store.updateElement(elementId, updates);
    } else {
      // Fallback: updateElementProps 사용
      if (propsChanges) {
        this.store.updateElementProps(elementId, propsChanges);
      }
    }

    // ACK 전송
    this.sendToBuilder({
      type: 'DELTA_ACK',
      operation: 'ELEMENT_UPDATED',
      elementId,
    });

    console.log(`🚀 [Preview] Delta: Element updated (${elementId})`);
  }

  /**
   * 요소 삭제 Delta 처리
   */
  private handleDeltaElementRemoved(data: DeltaElementRemovedMessage): void {
    const { elementId, childElementIds } = data;

    if (this.store.removeElement && this.store.removeElements) {
      // 🚀 최적화된 경로
      this.store.removeElement(elementId);
      if (childElementIds && childElementIds.length > 0) {
        this.store.removeElements(childElementIds);
      }
    } else if (this.store.getElements) {
      // Fallback: 필터링
      const currentElements = this.store.getElements();
      const idsToRemove = new Set([elementId, ...(childElementIds || [])]);
      const filteredElements = currentElements.filter(el => !idsToRemove.has(el.id));
      this.store.setElements(filteredElements);
    }

    // ACK 전송
    this.sendToBuilder({
      type: 'DELTA_ACK',
      operation: 'ELEMENT_REMOVED',
      elementId,
    });

    console.log(`🚀 [Preview] Delta: Element removed (${elementId})`);
  }

  /**
   * 배치 업데이트 Delta 처리
   * - 여러 요소를 한 번에 업데이트
   */
  private handleDeltaBatchUpdate(data: DeltaBatchUpdateMessage): void {
    const { updates } = data;

    if (this.store.updateElement) {
      // 🚀 최적화된 경로: 개별 업데이트
      for (const update of updates) {
        const elementUpdates: Partial<PreviewElement> = {};

        if (update.propsChanges) {
          elementUpdates.props = update.propsChanges as PreviewElement['props'];
        }
        if (update.parentId !== undefined) {
          elementUpdates.parent_id = update.parentId;
        }
        if (update.orderNum !== undefined) {
          elementUpdates.order_num = update.orderNum;
        }

        this.store.updateElement(update.elementId, elementUpdates);
      }
    } else {
      // Fallback: updateElementProps 사용
      for (const update of updates) {
        if (update.propsChanges) {
          this.store.updateElementProps(update.elementId, update.propsChanges);
        }
      }
    }

    // ACK 전송
    this.sendToBuilder({
      type: 'DELTA_ACK',
      operation: 'BATCH_UPDATE',
      count: updates.length,
    });

    console.log(`🚀 [Preview] Delta: Batch update (${updates.length} elements)`);
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
