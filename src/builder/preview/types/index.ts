import React from "react";
import { ElementProps } from "../../../types/supabase";
import { DataBinding } from "../../../types/unified";
import { EventEngine } from "../../../utils/eventEngine";

/**
 * Preview에서 사용하는 Element 타입
 */
export interface PreviewElement {
  id: string;
  customId?: string; // custom_id from database (e.g., button_1, table_1)
  tag: string;
  props: ElementProps;
  text?: string;
  parent_id?: string | null;
  page_id: string;
  order_num?: number;
  dataBinding?: DataBinding;
  deleted?: boolean;
}

/**
 * 렌더링 컨텍스트 - 모든 렌더러에 전달되는 공통 데이터
 */
export interface RenderContext {
  elements: PreviewElement[];
  updateElementProps: (id: string, props: Record<string, unknown>) => void;
  setElements: (elements: PreviewElement[]) => void;
  eventEngine: EventEngine;
  projectId?: string;
  renderElement: (el: PreviewElement, key?: string) => React.ReactNode;
}

/**
 * 컴포넌트 렌더러 인터페이스
 */
export interface ComponentRenderer {
  canRender(tag: string): boolean;
  render(element: PreviewElement, context: RenderContext): React.ReactNode;
}

/**
 * 이벤트 핸들러 타입
 */
export type EventHandlerMap = Record<string, (e: Event) => void>;

/**
 * postMessage 타입들
 */
export interface PreviewMessage {
  type: string;
  [key: string]: unknown;
}

export interface UpdateElementsMessage extends PreviewMessage {
  type: "UPDATE_ELEMENTS";
  elements: PreviewElement[];
}

export interface UpdateElementPropsMessage extends PreviewMessage {
  type: "UPDATE_ELEMENT_PROPS";
  elementId: string;
  props: Record<string, unknown>;
  merge?: boolean;
}

export interface DeleteElementsMessage extends PreviewMessage {
  type: "DELETE_ELEMENTS";
  elementIds: string[];
}

export interface DeleteElementMessage extends PreviewMessage {
  type: "DELETE_ELEMENT";
  elementId: string;
}

export interface ThemeVarsMessage extends PreviewMessage {
  type: "THEME_VARS";
  vars: Array<{ cssVar: string; value: string }>;
}

export interface UpdateThemeTokensMessage extends PreviewMessage {
  type: "UPDATE_THEME_TOKENS";
  styles: Record<string, string>;
}

export interface AddColumnElementsMessage extends PreviewMessage {
  type: "ADD_COLUMN_ELEMENTS";
  payload: {
    tableId: string;
    tableHeaderId: string;
    columns: Array<{
      id: string;
      tag: string;
      page_id: string;
      parent_id: string;
      order_num: number;
      props: Record<string, unknown>;
    }>;
  };
}

export type MessageType =
  | UpdateElementsMessage
  | UpdateElementPropsMessage
  | DeleteElementsMessage
  | DeleteElementMessage
  | ThemeVarsMessage
  | UpdateThemeTokensMessage
  | AddColumnElementsMessage;
