/**
 * 컴포넌트 메타데이터
 * Inspector 자동화를 위한 설정 정보
 */

export interface ComponentMeta {
  type: string;
  label: string;
  category: string;
  icon?: string;

  inspector: {
    // PropertiesSection - 전용 에디터 설정
    hasCustomEditor: boolean;
    editorName?: string;

    // DataSection - 데이터 바인딩 타입
    dataBindingType: "collection" | "value" | null;

    // EventSection - 지원 이벤트 목록
    supportedEvents: string[];
  };
}

/**
 * 컴포넌트 메타데이터 레지스트리
 */
export const componentMetadata: ComponentMeta[] = [
  // Actions
  {
    type: "Button",
    label: "Button",
    category: "Actions",
    icon: "🔘",
    inspector: {
      hasCustomEditor: true,
      editorName: "ButtonEditor",
      dataBindingType: null,
      supportedEvents: ["onPress", "onClick"],
    },
  },
  {
    type: "ToggleButton",
    label: "Toggle Button",
    category: "Actions",
    icon: "🔘",
    inspector: {
      hasCustomEditor: true,
      editorName: "ToggleButtonEditor",
      dataBindingType: null,
      supportedEvents: ["onChange", "onPress"],
    },
  },
  {
    type: "ToggleButtonGroup",
    label: "Toggle Button Group",
    category: "Actions",
    icon: "🔘",
    inspector: {
      hasCustomEditor: true,
      editorName: "ToggleButtonGroupEditor",
      dataBindingType: null,
      supportedEvents: ["onChange"],
    },
  },
  {
    type: "Menu",
    label: "Menu",
    category: "Actions",
    icon: "📋",
    inspector: {
      hasCustomEditor: true,
      editorName: "MenuEditor",
      dataBindingType: "collection",
      supportedEvents: ["onAction", "onOpenChange"],
    },
  },
  {
    type: "Toolbar",
    label: "Toolbar",
    category: "Actions",
    icon: "🛠️",
    inspector: {
      hasCustomEditor: true,
      editorName: "ToolbarEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },

  // Inputs
  {
    type: "TextField",
    label: "Text Field",
    category: "Inputs",
    icon: "📝",
    inspector: {
      hasCustomEditor: true,
      editorName: "TextFieldEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange", "onBlur", "onFocus", "onKeyDown"],
    },
  },
  {
    type: "NumberField",
    label: "Number Field",
    category: "Inputs",
    icon: "#️⃣",
    inspector: {
      hasCustomEditor: true,
      editorName: "NumberFieldEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange", "onBlur", "onFocus"],
    },
  },
  {
    type: "SearchField",
    label: "Search Field",
    category: "Inputs",
    icon: "🔍",
    inspector: {
      hasCustomEditor: true,
      editorName: "SearchFieldEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange", "onSubmit", "onClear"],
    },
  },
  {
    type: "Checkbox",
    label: "Checkbox",
    category: "Inputs",
    icon: "☑️",
    inspector: {
      hasCustomEditor: true,
      editorName: "CheckboxEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange"],
    },
  },
  {
    type: "CheckboxGroup",
    label: "Checkbox Group",
    category: "Inputs",
    icon: "☑️",
    inspector: {
      hasCustomEditor: true,
      editorName: "CheckboxGroupEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange"],
    },
  },
  {
    type: "Radio",
    label: "Radio",
    category: "Inputs",
    icon: "🔘",
    inspector: {
      hasCustomEditor: true,
      editorName: "RadioEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange"],
    },
  },
  {
    type: "RadioGroup",
    label: "Radio Group",
    category: "Inputs",
    icon: "🔘",
    inspector: {
      hasCustomEditor: true,
      editorName: "RadioGroupEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange"],
    },
  },
  {
    type: "Select",
    label: "Select",
    category: "Inputs",
    icon: "🔽",
    inspector: {
      hasCustomEditor: true,
      editorName: "SelectEditor",
      dataBindingType: "collection",
      supportedEvents: ["onSelectionChange", "onOpenChange"],
    },
  },
  {
    type: "ComboBox",
    label: "Combo Box",
    category: "Inputs",
    icon: "🔽",
    inspector: {
      hasCustomEditor: true,
      editorName: "ComboBoxEditor",
      dataBindingType: "value",
      supportedEvents: ["onSelectionChange", "onInputChange"],
    },
  },
  {
    type: "Switch",
    label: "Switch",
    category: "Inputs",
    icon: "🎚️",
    inspector: {
      hasCustomEditor: true,
      editorName: "SwitchEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange"],
    },
  },
  {
    type: "Slider",
    label: "Slider",
    category: "Inputs",
    icon: "🎚️",
    inspector: {
      hasCustomEditor: true,
      editorName: "SliderEditor",
      dataBindingType: "value",
      supportedEvents: ["onChange", "onChangeEnd"],
    },
  },

  // Data Display
  {
    type: "Table",
    label: "Table",
    category: "Data Display",
    icon: "📊",
    inspector: {
      hasCustomEditor: true,
      editorName: "TableEditor",
      dataBindingType: "collection",
      supportedEvents: ["onRowAction", "onSelectionChange", "onSortChange"],
    },
  },
  {
    type: "ListBox",
    label: "List Box",
    category: "Data Display",
    icon: "📋",
    inspector: {
      hasCustomEditor: true,
      editorName: "ListBoxEditor",
      dataBindingType: "collection",
      supportedEvents: ["onSelectionChange", "onAction"],
    },
  },
  {
    type: "GridList",
    label: "Grid List",
    category: "Data Display",
    icon: "🎛️",
    inspector: {
      hasCustomEditor: true,
      editorName: "GridListEditor",
      dataBindingType: "collection",
      supportedEvents: ["onSelectionChange", "onAction"],
    },
  },
  {
    type: "Tree",
    label: "Tree",
    category: "Data Display",
    icon: "🌳",
    inspector: {
      hasCustomEditor: true,
      editorName: "TreeEditor",
      dataBindingType: "collection",
      supportedEvents: ["onSelectionChange", "onExpandedChange"],
    },
  },
  {
    type: "TagGroup",
    label: "Tag Group",
    category: "Data Display",
    icon: "🏷️",
    inspector: {
      hasCustomEditor: true,
      editorName: "TagGroupEditor",
      dataBindingType: "collection",
      supportedEvents: ["onRemove"],
    },
  },

  // Feedback
  {
    type: "Tooltip",
    label: "Tooltip",
    category: "Feedback",
    icon: "💬",
    inspector: {
      hasCustomEditor: true,
      editorName: "TooltipEditor",
      dataBindingType: null,
      supportedEvents: ["onOpenChange"],
    },
  },
  {
    type: "ProgressBar",
    label: "Progress Bar",
    category: "Feedback",
    icon: "📊",
    inspector: {
      hasCustomEditor: true,
      editorName: "ProgressBarEditor",
      dataBindingType: "value",
      supportedEvents: [],
    },
  },
  {
    type: "Meter",
    label: "Meter",
    category: "Feedback",
    icon: "📏",
    inspector: {
      hasCustomEditor: true,
      editorName: "MeterEditor",
      dataBindingType: "value",
      supportedEvents: [],
    },
  },

  // Layout
  {
    type: "Panel",
    label: "Panel",
    category: "Layout",
    icon: "📦",
    inspector: {
      hasCustomEditor: true,
      editorName: "PanelEditor",
      dataBindingType: null,
      supportedEvents: ["onPress"],
    },
  },
  {
    type: "Card",
    label: "Card",
    category: "Layout",
    icon: "🃏",
    inspector: {
      hasCustomEditor: true,
      editorName: "CardEditor",
      dataBindingType: null,
      supportedEvents: ["onPress"],
    },
  },
  {
    type: "Tabs",
    label: "Tabs",
    category: "Layout",
    icon: "📑",
    inspector: {
      hasCustomEditor: true,
      editorName: "TabsEditor",
      dataBindingType: null,
      supportedEvents: ["onSelectionChange"],
    },
  },

  // Date & Time
  {
    type: "Calendar",
    label: "Calendar",
    category: "Date & Time",
    icon: "📅",
    inspector: {
      hasCustomEditor: false,
      dataBindingType: "value",
      supportedEvents: ["onChange", "onFocusChange"],
    },
  },
  {
    type: "DatePicker",
    label: "Date Picker",
    category: "Date & Time",
    icon: "📅",
    inspector: {
      hasCustomEditor: false,
      dataBindingType: "value",
      supportedEvents: ["onChange", "onOpenChange"],
    },
  },
  {
    type: "DateRangePicker",
    label: "Date Range Picker",
    category: "Date & Time",
    icon: "📅",
    inspector: {
      hasCustomEditor: false,
      dataBindingType: "value",
      supportedEvents: ["onChange", "onOpenChange"],
    },
  },

  // Item Components (Collection children)
  {
    type: "MenuItem",
    label: "Menu Item",
    category: "Items",
    icon: "•",
    inspector: {
      hasCustomEditor: true,
      editorName: "MenuItemEditor",
      dataBindingType: null,
      supportedEvents: ["onAction"],
    },
  },
  {
    type: "SelectItem",
    label: "Select Item",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "SelectItemEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "ComboBoxItem",
    label: "ComboBox Item",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "ComboBoxItemEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "ListBoxItem",
    label: "ListBox Item",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "ListBoxItemEditor",
      dataBindingType: null,
      supportedEvents: ["onAction"],
    },
  },
  {
    type: "GridListItem",
    label: "GridList Item",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "GridListItemEditor",
      dataBindingType: null,
      supportedEvents: ["onAction"],
    },
  },
  {
    type: "TreeItem",
    label: "Tree Item",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "TreeItemEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "Tag",
    label: "Tag",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "TagEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "Tab",
    label: "Tab",
    category: "Items",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "TabEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },

  // Table Components
  {
    type: "TableHeader",
    label: "Table Header",
    category: "Table Parts",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "TableHeaderEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "TableBody",
    label: "Table Body",
    category: "Table Parts",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "TableBodyEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "Column",
    label: "Column",
    category: "Table Parts",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "ColumnEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "ColumnGroup",
    label: "Column Group",
    category: "Table Parts",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "ColumnGroupEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "Row",
    label: "Row",
    category: "Table Parts",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "RowEditor",
      dataBindingType: null,
      supportedEvents: ["onAction"],
    },
  },
  {
    type: "Cell",
    label: "Cell",
    category: "Table Parts",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "CellEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },
];

/**
 * 컴포넌트 메타데이터 조회
 */
export function getComponentMeta(type: string): ComponentMeta | undefined {
  return componentMetadata.find((c) => c.type === type);
}

/**
 * 카테고리별 컴포넌트 목록
 */
export function getComponentsByCategory(category: string): ComponentMeta[] {
  return componentMetadata.filter((c) => c.category === category);
}

/**
 * 모든 카테고리 목록
 */
export function getAllCategories(): string[] {
  const categories = new Set(componentMetadata.map((c) => c.category));
  return Array.from(categories);
}
