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
      // React Aria: onPress, onClick, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onPress", "onClick", "onMouseEnter", "onMouseLeave", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      // React Aria: onChange, onPress, onClick, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onChange", "onPress", "onClick", "onMouseEnter", "onMouseLeave", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      dataBindingType: "collection",
      // React Aria: onChange, onFocus, onBlur
      supportedEvents: ["onChange", "onFocus", "onBlur"],
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
      // React Aria: onAction, onSelectionChange, onClose, onOpenChange
      supportedEvents: ["onAction", "onSelectionChange", "onOpenChange", "onFocus", "onBlur"],
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
      // React Aria: onFocus, onBlur
      supportedEvents: ["onFocus", "onBlur"],
    },
  },
  {
    type: "Link",
    label: "Link",
    category: "Actions",
    icon: "🔗",
    inspector: {
      hasCustomEditor: true,
      editorName: "LinkEditor",
      dataBindingType: null,
      // React Aria: onPress, onClick, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onPress", "onClick", "onMouseEnter", "onMouseLeave", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      // React Aria: onChange, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp
      supportedEvents: ["onChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      // React Aria: onChange, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp
      supportedEvents: ["onChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      // React Aria: onChange, onSubmit, onClear, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp
      supportedEvents: ["onChange", "onSubmit", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      // React Aria: onChange, onPress, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave"],
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
      dataBindingType: "collection",
      // React Aria: onChange, onFocus, onBlur, onFocusChange
      supportedEvents: ["onChange", "onFocus", "onBlur"],
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
      // React Aria: onPress, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onFocus", "onBlur", "onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave"],
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
      dataBindingType: "collection",
      // React Aria: onChange, onFocus, onBlur, onFocusChange
      supportedEvents: ["onChange", "onFocus", "onBlur"],
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
      // React Aria: onSelectionChange, onOpenChange, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp
      supportedEvents: ["onSelectionChange", "onOpenChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      dataBindingType: "collection",
      // React Aria: onSelectionChange, onInputChange, onOpenChange, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp
      supportedEvents: ["onSelectionChange", "onOpenChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp"],
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
      // React Aria: onChange, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave"],
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
      // React Aria: onChange, onChangeEnd, onFocus, onBlur, onFocusChange, onKeyDown, onKeyUp, onHoverStart, onHoverEnd
      supportedEvents: ["onChange", "onFocus", "onBlur", "onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave"],
    },
  },
  {
    type: "TailSwatch",
    label: "Color Picker",
    category: "Inputs",
    icon: "🎨",
    inspector: {
      hasCustomEditor: true,
      editorName: "TailSwatchEditor",
      dataBindingType: "value",
      // Custom component: onChange, onFocus, onBlur
      supportedEvents: ["onChange", "onFocus", "onBlur"],
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
      // React Aria: onRowAction, onSelectionChange, onSortChange, onFocus, onBlur
      supportedEvents: ["onSelectionChange", "onAction", "onFocus", "onBlur"],
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
      // React Aria: onSelectionChange, onAction, onFocus, onBlur, onFocusChange
      supportedEvents: ["onSelectionChange", "onAction", "onFocus", "onBlur"],
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
      // React Aria: onSelectionChange, onAction, onFocus, onBlur
      supportedEvents: ["onSelectionChange", "onAction", "onFocus", "onBlur"],
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
      // React Aria: onSelectionChange, onExpandedChange, onFocus, onBlur
      supportedEvents: ["onSelectionChange", "onFocus", "onBlur"],
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
      // React Aria: onRemove, onSelectionChange, onFocus, onBlur
      supportedEvents: ["onSelectionChange", "onFocus", "onBlur"],
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
      // React Aria: onOpenChange (tooltip trigger)
      supportedEvents: ["onOpenChange", "onMouseEnter", "onMouseLeave"],
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
  {
    type: "Badge",
    label: "Badge",
    category: "Feedback",
    icon: "🏷️",
    inspector: {
      hasCustomEditor: true,
      editorName: "BadgeEditor",
      dataBindingType: null,
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
      // Custom container - supports basic mouse events
      supportedEvents: ["onClick", "onMouseEnter", "onMouseLeave", "onFocus", "onBlur"],
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
      // Custom container - supports basic mouse events
      supportedEvents: ["onClick", "onMouseEnter", "onMouseLeave", "onFocus", "onBlur"],
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
      // React Aria: onSelectionChange
      supportedEvents: ["onSelectionChange", "onFocus", "onBlur"],
    },
  },
  {
    type: "Breadcrumbs",
    label: "Breadcrumbs",
    category: "Layout",
    icon: "🗂️",
    inspector: {
      hasCustomEditor: true,
      editorName: "BreadcrumbsEditor",
      dataBindingType: null,
      // React Aria: onAction, onFocus, onBlur
      supportedEvents: ["onAction", "onFocus", "onBlur"],
    },
  },
  {
    type: "Separator",
    label: "Separator",
    category: "Layout",
    icon: "➖",
    inspector: {
      hasCustomEditor: true,
      editorName: "SeparatorEditor",
      dataBindingType: null,
      // Static element - no events
      supportedEvents: [],
    },
  },
  {
    type: "Group",
    label: "Group",
    category: "Layout",
    icon: "📦",
    inspector: {
      hasCustomEditor: true,
      editorName: "GroupEditor",
      dataBindingType: null,
      // React Aria: onFocus, onBlur (for keyboard navigation)
      supportedEvents: ["onFocus", "onBlur"],
    },
  },
  {
    type: "body",
    label: "Body",
    category: "Layout",
    icon: "📄",
    inspector: {
      hasCustomEditor: true,
      // ⭐ Phase 6: editorName은 registry.ts에서 context 기반으로 결정
      // - Page body → PageBodyEditor
      // - Layout body → LayoutBodyEditor
      editorName: null,
      dataBindingType: null,
      supportedEvents: [],
    },
  },
  {
    type: "Slot",
    label: "Slot",
    category: "Layout",
    icon: "🔲",
    inspector: {
      hasCustomEditor: true,
      editorName: "SlotEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },

  // Overlays
  {
    type: "Dialog",
    label: "Dialog",
    category: "Overlays",
    icon: "💬",
    inspector: {
      hasCustomEditor: true,
      editorName: "DialogEditor",
      dataBindingType: null,
      // React Aria: onOpenChange, onFocus, onBlur
      supportedEvents: ["onOpenChange", "onFocus", "onBlur"],
    },
  },
  {
    type: "Modal",
    label: "Modal",
    category: "Overlays",
    icon: "🪟",
    inspector: {
      hasCustomEditor: true,
      editorName: "ModalEditor",
      dataBindingType: null,
      // React Aria: onOpenChange
      supportedEvents: ["onOpenChange"],
    },
  },
  {
    type: "Popover",
    label: "Popover",
    category: "Overlays",
    icon: "💭",
    inspector: {
      hasCustomEditor: true,
      editorName: "PopoverEditor",
      dataBindingType: null,
      // React Aria: onOpenChange
      supportedEvents: ["onOpenChange"],
    },
  },

  // Date & Time
  {
    type: "Calendar",
    label: "Calendar",
    category: "Date & Time",
    icon: "📅",
    inspector: {
      hasCustomEditor: true,
      editorName: "CalendarEditor",
      dataBindingType: "value",
      // React Aria: onChange, onFocusChange, onFocus, onBlur
      supportedEvents: ["onChange", "onFocus", "onBlur"],
    },
  },
  {
    type: "DatePicker",
    label: "Date Picker",
    category: "Date & Time",
    icon: "📅",
    inspector: {
      hasCustomEditor: true,
      editorName: "DatePickerEditor",
      dataBindingType: "value",
      // React Aria: onChange, onOpenChange, onFocus, onBlur
      supportedEvents: ["onChange", "onOpenChange", "onFocus", "onBlur"],
    },
  },
  {
    type: "DateRangePicker",
    label: "Date Range Picker",
    category: "Date & Time",
    icon: "📅",
    inspector: {
      hasCustomEditor: true,
      editorName: "DateRangePickerEditor",
      dataBindingType: "value",
      // React Aria: onChange, onOpenChange, onFocus, onBlur
      supportedEvents: ["onChange", "onOpenChange", "onFocus", "onBlur"],
    },
  },
  {
    type: "TimeField",
    label: "Time Field",
    category: "Date & Time",
    icon: "🕐",
    inspector: {
      hasCustomEditor: true,
      editorName: "TimeFieldEditor",
      dataBindingType: "value",
      // React Aria: onChange, onFocus, onBlur, onFocusChange
      supportedEvents: ["onChange", "onFocus", "onBlur"],
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
      // React Aria: onAction, onHoverStart, onHoverEnd, onPress
      supportedEvents: ["onAction", "onMouseEnter", "onMouseLeave"],
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
      // React Aria: onHoverStart, onHoverEnd
      supportedEvents: ["onMouseEnter", "onMouseLeave"],
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
      // React Aria: onHoverStart, onHoverEnd
      supportedEvents: ["onMouseEnter", "onMouseLeave"],
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
      // React Aria: onAction, onHoverStart, onHoverEnd, onPress
      supportedEvents: ["onAction", "onMouseEnter", "onMouseLeave"],
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
      // React Aria: onAction, onHoverStart, onHoverEnd, onPress
      supportedEvents: ["onAction", "onMouseEnter", "onMouseLeave"],
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
      // React Aria: onAction, onHoverStart, onHoverEnd
      supportedEvents: ["onAction", "onMouseEnter", "onMouseLeave"],
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
      // React Aria: onHoverStart, onHoverEnd
      supportedEvents: ["onMouseEnter", "onMouseLeave"],
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
      // React Aria: onHoverStart, onHoverEnd, onPress
      supportedEvents: ["onMouseEnter", "onMouseLeave"],
    },
  },
  {
    type: "Breadcrumb",
    label: "Breadcrumb",
    category: "Items",
    icon: "•",
    inspector: {
      hasCustomEditor: true,
      editorName: "BreadcrumbEditor",
      dataBindingType: null,
      // React Aria: onPress, onHoverStart, onHoverEnd
      supportedEvents: ["onClick", "onMouseEnter", "onMouseLeave"],
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
      // React Aria: onAction, onHoverStart, onHoverEnd, onPress
      supportedEvents: ["onAction", "onMouseEnter", "onMouseLeave"],
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
  {
    type: "Field",
    label: "Field",
    category: "Data Display",
    icon: "",
    inspector: {
      hasCustomEditor: true,
      editorName: "FieldEditor",
      dataBindingType: null,
      supportedEvents: [],
    },
  },

  // Data Management
  {
    type: "DataTable",
    label: "DataTable",
    category: "Data",
    icon: "📊",
    inspector: {
      hasCustomEditor: true,
      editorName: "DataTableEditor",
      dataBindingType: "collection",
      supportedEvents: ["onLoad", "onError", "onRefresh"],
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
