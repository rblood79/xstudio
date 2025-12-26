/**
 * 액션 헬퍼 유틸리티
 */

import { ACTION_METADATA } from "../data/actionMetadata";
import type { ActionType, ActionConfig } from "../types/eventTypes";

/**
 * 액션 타입에 따라 기본 config 생성
 */
export function createDefaultActionConfig(actionType: ActionType): ActionConfig {
  const metadata = ACTION_METADATA[actionType];
  const config: Record<string, unknown> = {};

  // configFields에서 defaultValue나 placeholder를 사용하여 기본값 설정
  metadata.configFields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      config[field.name] = field.defaultValue;
    } else if (field.required) {
      // required 필드는 빈 문자열 또는 기본값 설정
      if (field.type === "text" || field.type === "textarea") {
        config[field.name] = field.placeholder || "";
      } else if (field.type === "number") {
        config[field.name] = 0;
      } else if (field.type === "boolean") {
        config[field.name] = false;
      } else if (field.type === "select" && field.options && field.options.length > 0) {
        config[field.name] = field.options[0].value;
      }
    }
  });

  return config as ActionConfig;
}

/**
 * 액션 타입별 기본 config (명시적 정의)
 * createDefaultActionConfig의 fallback으로 사용
 */
export const DEFAULT_ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  navigate: {
    path: "/",
    openInNewTab: false,
    replace: false
  },
  scrollTo: {
    elementId: "",
    position: "top",
    smooth: true
  },
  setState: {
    storePath: "",
    value: "",
    merge: false
  },
  updateState: {
    storePath: "",
    value: ""
  },
  apiCall: {
    method: "GET",
    endpoint: "",
    headers: {},
    body: undefined
  },
  showModal: {
    modalId: "",
    backdrop: true,
    closable: true
  },
  hideModal: {
    modalId: undefined
  },
  showToast: {
    message: "",
    type: "info",
    duration: 3000
  },
  toggleVisibility: {
    elementId: "",
    show: undefined
  },
  validateForm: {
    formId: ""
  },
  resetForm: {
    formId: ""
  },
  submitForm: {
    formId: ""
  },
  updateFormField: {
    fieldName: "",
    value: ""
  },
  setComponentState: {
    targetId: "",
    statePath: "",
    value: ""
  },
  triggerComponentAction: {
    targetId: "",
    action: ""
  },
  filterCollection: {
    targetId: "",
    filterMode: "text"
  },
  selectItem: {
    targetId: "",
    behavior: "replace"
  },
  clearSelection: {
    targetId: ""
  },
  copyToClipboard: {
    text: "",
    source: "static"
  },
  customFunction: {
    code: ""
  },
  // Data Panel Integration
  loadDataTable: {
    dataTableName: "",
    forceRefresh: false
  },
  syncComponent: {
    sourceId: "",
    targetId: "",
    syncMode: "replace"
  },
  saveToDataTable: {
    dataTableName: "",
    source: "response",
    saveMode: "replace"
  },
  // Variable
  setVariable: {
    variableName: "",
    value: "",
    persist: false
  }
};

/**
 * 액션 ID 생성
 */
export function generateActionId(actionType: ActionType): string {
  return `action-${actionType}-${Date.now()}`;
}
