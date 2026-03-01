/**
 * 액션 메타데이터
 */

import {
  ExternalLink,
  ArrowDown,
  Database,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Bell,
  CheckCircle,
  Send,
  ClipboardCopy,
  Code,
  Wrench,
  Play,
  FileText,
  Search,
  Check,
  X,
  Table,
  Save,
  Variable,
} from 'lucide-react';
import type { ActionType, ActionMetadata } from "../types";

/**
 * 액션 메타데이터 정의
 */
export const ACTION_METADATA: Record<ActionType, ActionMetadata> = {
  navigate: {
    label: "페이지 이동",
    description: "다른 페이지로 이동합니다",
    icon: ExternalLink,
    category: "navigation",
    configFields: [
      {
        name: "path",
        label: "Path",
        type: "text",
        required: true,
        placeholder: "/dashboard"
      },
      {
        name: "openInNewTab",
        label: "Open in new tab",
        type: "boolean",
        defaultValue: false
      },
      {
        name: "replace",
        label: "Replace history",
        type: "boolean",
        defaultValue: false
      }
    ]
  },

  scrollTo: {
    label: "스크롤 이동",
    description: "특정 요소로 스크롤합니다",
    icon: ArrowDown,
    category: "navigation",
    configFields: [
      {
        name: "elementId",
        label: "Element ID",
        type: "text",
        required: false,
        placeholder: "element-id"
      },
      {
        name: "position",
        label: "Position",
        type: "select",
        options: [
          { value: "top", label: "Top" },
          { value: "center", label: "Center" },
          { value: "bottom", label: "Bottom" }
        ],
        defaultValue: "top"
      },
      {
        name: "smooth",
        label: "Smooth scroll",
        type: "boolean",
        defaultValue: true
      }
    ]
  },

  setState: {
    label: "상태 설정",
    description: "애플리케이션 상태를 설정합니다",
    icon: Database,
    category: "state",
    configFields: [
      {
        name: "storePath",
        label: "Store Path",
        type: "text",
        required: true,
        placeholder: "user.name"
      },
      {
        name: "value",
        label: "Value",
        type: "text",
        required: true,
        placeholder: "John Doe"
      },
      {
        name: "merge",
        label: "Merge with existing",
        type: "boolean",
        defaultValue: false
      }
    ]
  },

  updateState: {
    label: "상태 업데이트",
    description: "애플리케이션 상태를 업데이트합니다",
    icon: RefreshCw,
    category: "state",
    configFields: [
      {
        name: "storePath",
        label: "Store Path",
        type: "text",
        required: true,
        placeholder: "cart.items"
      },
      {
        name: "value",
        label: "Value",
        type: "text",
        required: true,
        placeholder: "{{response.data}}"
      }
    ]
  },

  apiCall: {
    label: "API 호출",
    description: "API 엔드포인트를 호출합니다",
    icon: Globe,
    category: "api",
    configFields: [
      {
        name: "method",
        label: "Method",
        type: "select",
        required: true,
        options: [
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
          { value: "PUT", label: "PUT" },
          { value: "DELETE", label: "DELETE" },
          { value: "PATCH", label: "PATCH" }
        ],
        defaultValue: "GET"
      },
      {
        name: "endpoint",
        label: "Endpoint",
        type: "text",
        required: true,
        placeholder: "/api/users"
      }
    ]
  },

  showModal: {
    label: "모달 표시",
    description: "모달 다이얼로그를 표시합니다",
    icon: Eye,
    category: "ui",
    configFields: [
      {
        name: "modalId",
        label: "Modal ID",
        type: "text",
        required: true,
        placeholder: "confirm-dialog"
      },
      {
        name: "backdrop",
        label: "Show backdrop",
        type: "boolean",
        defaultValue: true
      },
      {
        name: "closable",
        label: "Closable",
        type: "boolean",
        defaultValue: true
      }
    ]
  },

  hideModal: {
    label: "모달 숨김",
    description: "모달 다이얼로그를 숨깁니다",
    icon: EyeOff,
    category: "ui",
    configFields: [
      {
        name: "modalId",
        label: "Modal ID",
        type: "text",
        required: false,
        placeholder: "confirm-dialog (empty = all)"
      }
    ]
  },

  showToast: {
    label: "토스트 표시",
    description: "토스트 메시지를 표시합니다",
    icon: Bell,
    category: "ui",
    configFields: [
      {
        name: "message",
        label: "Message",
        type: "text",
        required: true,
        placeholder: "Successfully saved!"
      },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "success", label: "✓ Success" },
          { value: "error", label: "✗ Error" },
          { value: "warning", label: "⚠ Warning" },
          { value: "info", label: "ℹ Info" }
        ],
        defaultValue: "info"
      },
      {
        name: "duration",
        label: "Duration (ms)",
        type: "number",
        defaultValue: 3000
      }
    ]
  },

  toggleVisibility: {
    label: "표시/숨김 토글",
    description: "요소의 표시 상태를 토글합니다",
    icon: Eye,
    category: "ui",
    configFields: [
      {
        name: "elementId",
        label: "Element ID",
        type: "text",
        required: true,
        placeholder: "sidebar"
      },
      {
        name: "show",
        label: "Show (empty = toggle)",
        type: "select",
        options: [
          { value: "", label: "Toggle" },
          { value: "true", label: "Show" },
          { value: "false", label: "Hide" }
        ]
      }
    ]
  },

  validateForm: {
    label: "폼 검증",
    description: "폼의 유효성을 검증합니다",
    icon: CheckCircle,
    category: "form",
    configFields: [
      {
        name: "formId",
        label: "Form ID",
        type: "text",
        required: true,
        placeholder: "signup-form"
      }
    ]
  },

  resetForm: {
    label: "폼 리셋",
    description: "폼을 초기 상태로 리셋합니다",
    icon: RefreshCw,
    category: "form",
    configFields: [
      {
        name: "formId",
        label: "Form ID",
        type: "text",
        required: true,
        placeholder: "signup-form"
      }
    ]
  },

  submitForm: {
    label: "폼 제출",
    description: "폼을 제출합니다",
    icon: Send,
    category: "form",
    configFields: [
      {
        name: "formId",
        label: "Form ID",
        type: "text",
        required: true,
        placeholder: "signup-form"
      }
    ]
  },

  copyToClipboard: {
    label: "클립보드 복사",
    description: "텍스트를 클립보드에 복사합니다",
    icon: ClipboardCopy,
    category: "utility",
    configFields: [
      {
        name: "text",
        label: "Text",
        type: "text",
        required: true,
        placeholder: "Text to copy"
      },
      {
        name: "source",
        label: "Source",
        type: "select",
        options: [
          { value: "static", label: "Static text" },
          { value: "element", label: "Element content" },
          { value: "state", label: "From state" }
        ],
        defaultValue: "static"
      }
    ]
  },

  customFunction: {
    label: "커스텀 함수",
    description: "커스텀 JavaScript 코드를 실행합니다",
    icon: Code,
    category: "utility",
    configFields: [
      {
        name: "code",
        label: "Code",
        type: "textarea",
        required: true,
        placeholder: "console.log('Hello');"
      }
    ]
  },

  setComponentState: {
    label: "컴포넌트 상태 설정",
    description: "다른 컴포넌트의 상태를 변경합니다",
    icon: Wrench,
    category: "ui",
    configFields: [
      {
        name: "targetId",
        label: "Target Component",
        type: "text",
        required: true,
        placeholder: "component-id"
      },
      {
        name: "statePath",
        label: "State Path",
        type: "text",
        required: true,
        placeholder: "selectedKeys, isOpen, value"
      }
    ]
  },

  triggerComponentAction: {
    label: "컴포넌트 액션 실행",
    description: "다른 컴포넌트의 메서드를 호출합니다",
    icon: Play,
    category: "ui",
    configFields: [
      {
        name: "targetId",
        label: "Target Component",
        type: "text",
        required: true,
        placeholder: "component-id"
      },
      {
        name: "action",
        label: "Action",
        type: "text",
        required: true,
        placeholder: "select, clear, focus"
      }
    ]
  },

  updateFormField: {
    label: "폼 필드 업데이트",
    description: "폼 필드의 값을 업데이트합니다",
    icon: FileText,
    category: "form",
    configFields: [
      {
        name: "fieldName",
        label: "Field Name",
        type: "text",
        required: true,
        placeholder: "email, password"
      }
    ]
  },

  filterCollection: {
    label: "컬렉션 필터링",
    description: "컬렉션 컴포넌트의 아이템을 필터링합니다",
    icon: Search,
    category: "ui",
    configFields: [
      {
        name: "targetId",
        label: "Target Collection",
        type: "text",
        required: true,
        placeholder: "listbox-id"
      },
      {
        name: "filterMode",
        label: "Filter Mode",
        type: "select",
        required: true,
        options: [
          { value: "text", label: "Text Search" },
          { value: "function", label: "Custom Function" },
          { value: "field", label: "Field Match" }
        ],
        defaultValue: "text"
      }
    ]
  },

  selectItem: {
    label: "아이템 선택",
    description: "컬렉션에서 특정 아이템을 선택합니다",
    icon: Check,
    category: "ui",
    configFields: [
      {
        name: "targetId",
        label: "Target Collection",
        type: "text",
        required: true,
        placeholder: "listbox-id"
      },
      {
        name: "behavior",
        label: "Selection Behavior",
        type: "select",
        required: true,
        options: [
          { value: "replace", label: "Replace" },
          { value: "add", label: "Add" },
          { value: "toggle", label: "Toggle" }
        ],
        defaultValue: "replace"
      }
    ]
  },

  clearSelection: {
    label: "선택 해제",
    description: "컬렉션의 모든 선택을 해제합니다",
    icon: X,
    category: "ui",
    configFields: [
      {
        name: "targetId",
        label: "Target Collection",
        type: "text",
        required: true,
        placeholder: "listbox-id"
      }
    ]
  },

  // Data Panel Integration
  loadDataTable: {
    label: "DataTable 로드",
    description: "DataTable 데이터를 로드합니다",
    icon: Table,
    category: "api",
    configFields: [
      {
        name: "dataTableName",
        label: "DataTable Name",
        type: "text",
        required: true,
        placeholder: "users"
      },
      {
        name: "forceRefresh",
        label: "Force Refresh",
        type: "boolean",
        defaultValue: false
      }
    ]
  },

  syncComponent: {
    label: "컴포넌트 동기화",
    description: "컴포넌트 간 데이터를 동기화합니다",
    icon: RefreshCw,
    category: "ui",
    configFields: [
      {
        name: "sourceId",
        label: "Source Component",
        type: "text",
        required: true,
        placeholder: "source-component-id"
      },
      {
        name: "targetId",
        label: "Target Component",
        type: "text",
        required: true,
        placeholder: "target-component-id"
      },
      {
        name: "syncMode",
        label: "Sync Mode",
        type: "select",
        options: [
          { value: "replace", label: "Replace" },
          { value: "merge", label: "Merge" },
          { value: "append", label: "Append" }
        ],
        defaultValue: "replace"
      }
    ]
  },

  saveToDataTable: {
    label: "DataTable 저장",
    description: "데이터를 DataTable에 저장합니다",
    icon: Save,
    category: "api",
    configFields: [
      {
        name: "dataTableName",
        label: "DataTable Name",
        type: "text",
        required: true,
        placeholder: "users"
      },
      {
        name: "source",
        label: "Data Source",
        type: "select",
        options: [
          { value: "response", label: "API Response" },
          { value: "variable", label: "Variable" },
          { value: "static", label: "Static" }
        ],
        defaultValue: "response"
      },
      {
        name: "saveMode",
        label: "Save Mode",
        type: "select",
        options: [
          { value: "replace", label: "Replace" },
          { value: "merge", label: "Merge" },
          { value: "append", label: "Append" },
          { value: "upsert", label: "Upsert" }
        ],
        defaultValue: "replace"
      }
    ]
  },

  // Variable
  setVariable: {
    label: "변수 설정",
    description: "변수 값을 설정합니다",
    icon: Variable,
    category: "state",
    configFields: [
      {
        name: "variableName",
        label: "Variable Name",
        type: "text",
        required: true,
        placeholder: "myVariable"
      },
      {
        name: "value",
        label: "Value",
        type: "text",
        required: true,
        placeholder: "value"
      },
      {
        name: "persist",
        label: "Persist to Storage",
        type: "boolean",
        defaultValue: false
      }
    ]
  }
};

/**
 * 카테고리별 액션 그룹
 */
export const ACTION_CATEGORIES = {
  navigation: ["navigate", "scrollTo"],
  state: ["setState", "updateState"],
  api: ["apiCall"],
  ui: [
    "showModal",
    "hideModal",
    "showToast",
    "toggleVisibility",
    "setComponentState",
    "triggerComponentAction",
    "filterCollection",
    "selectItem",
    "clearSelection"
  ],
  form: ["validateForm", "resetForm", "submitForm", "updateFormField"],
  utility: ["copyToClipboard", "customFunction"]
} as const;

/**
 * 액션 메타데이터 가져오기
 */
export function getActionMetadata(actionType: ActionType): ActionMetadata {
  return ACTION_METADATA[actionType];
}

/**
 * 카테고리별 액션 가져오기
 */
export function getActionsByCategory(category: string): ActionType[] {
  const actions = ACTION_CATEGORIES[category as keyof typeof ACTION_CATEGORIES];
  return actions ? [...actions] as ActionType[] : [];
}

/**
 * 컨텍스트 기반 추천 액션
 */
export function getRecommendedActions(context: {
  previousAction?: ActionType;
  eventType?: string;
  componentType?: string;
}): ActionType[] {
  const { previousAction, eventType, componentType } = context;

  // 이전 액션 기반 추천
  if (previousAction === "apiCall") {
    return ["setState", "showToast", "navigate"];
  }
  if (previousAction === "validateForm") {
    return ["apiCall", "showToast", "submitForm"];
  }
  if (previousAction === "setState") {
    return ["showToast", "navigate"];
  }

  // 이벤트 타입 기반 추천
  if (eventType === "onSubmit") {
    return ["validateForm", "apiCall", "showToast"];
  }
  if (eventType === "onChange") {
    return ["setState", "apiCall"];
  }
  if (eventType === "onClick" || eventType === "onPress") {
    return ["navigate", "showModal", "apiCall"];
  }

  // 컴포넌트 타입 기반 추천
  if (componentType === "Button") {
    return ["navigate", "showModal", "apiCall", "setState"];
  }
  if (componentType === "TextField") {
    return ["setState", "apiCall", "validateForm"];
  }

  // 기본 추천
  return ["navigate", "setState", "apiCall", "showToast"];
}
