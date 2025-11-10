import React from "react";
import { ElementEvent } from "./events";

// 공통 기본 속성
export interface BaseElementProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  "data-element-id"?: string;
  events?: ElementEvent[];
}

// Button 컴포넌트 타입
export interface ButtonElementProps extends BaseElementProps {
  //tag: 'Button';
  children?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isDisabled?: boolean;
  onPress?: () => void;
}

// Link 컴포넌트 타입
export interface LinkElementProps extends BaseElementProps {
  //tag: 'Link';
  children?: React.ReactNode;
  href?: string;
  variant?: "default" | "primary" | "secondary" | "surface" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isDisabled?: boolean;
  isExternal?: boolean;
  showExternalIcon?: boolean;
  target?: string;
  rel?: string;
}

// TextField 컴포넌트 타입
export interface TextFieldElementProps extends BaseElementProps {
  //tag: 'TextField';
  label?: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  type?: "text" | "email" | "password" | "search" | "tel" | "url";
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  onChange?: (value: string) => void;
}

// Checkbox 컴포넌트 타입
export interface CheckboxElementProps extends BaseElementProps {
  //tag: 'Checkbox';
  children?: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
}

// Radio 컴포넌트 타입
export interface RadioElementProps extends BaseElementProps {
  //tag: 'Radio';
  children?: React.ReactNode;
  value?: string;
  isDisabled?: boolean;
  onChange?: (value: string) => void;
}

// ToggleButton 컴포넌트 타입
export interface ToggleButtonElementProps extends BaseElementProps {
  //tag: 'ToggleButton';
  children?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "sm" | "md" | "lg";
  isSelected?: boolean;
  defaultSelected?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
}

// ToggleButtonGroup 컴포넌트 타입
export interface ToggleButtonGroupElementProps extends BaseElementProps {
  //tag: 'ToggleButtonGroup';
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  selectionMode?: "single" | "multiple";
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    title: string;
    isSelected?: boolean;
  }>;
}

// CheckboxGroup 컴포넌트 타입
export interface CheckboxGroupElementProps extends BaseElementProps {
  //tag: 'CheckboxGroup';
  label?: string;
  orientation?: "horizontal" | "vertical";
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    label: string;
    isSelected?: boolean;
  }>;
}

// RadioGroup 컴포넌트 타입
export interface RadioGroupElementProps extends BaseElementProps {
  //tag: 'RadioGroup';
  label?: string;
  orientation?: "horizontal" | "vertical";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
}

// Select 컴포넌트 타입
export interface SelectElementProps extends BaseElementProps {
  //tag: 'Select';
  label?: string;
  placeholder?: string;
  selectedKey?: string;
  defaultSelectedKey?: string;
  isDisabled?: boolean;
  onChange?: (selectedKey: string) => void;
  children?: Array<{
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
  }>;
}

// ComboBox 컴포넌트 타입
export interface ComboBoxElementProps extends BaseElementProps {
  //tag: 'ComboBox';
  label?: string;
  placeholder?: string;
  inputValue?: string;
  defaultInputValue?: string;
  selectedKey?: string;
  defaultSelectedKey?: string;
  allowsCustomValue?: boolean;
  isDisabled?: boolean;
  onChange?: (inputValue: string, selectedKey?: string) => void;
  children?: Array<{
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
  }>;
}

// Slider 컴포넌트 타입
export interface SliderElementProps extends BaseElementProps {
  //tag: 'Slider';
  label?: string;
  value?: number[];
  defaultValue?: number[];
  minValue?: number;
  maxValue?: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  onChange?: (value: number[]) => void;
}

// Tabs 컴포넌트 타입
export interface TabsElementProps extends BaseElementProps {
  //tag: 'Tabs';
  defaultSelectedKey?: string;
  selectedKey?: string;
  orientation?: "horizontal" | "vertical";
  onChange?: (selectedKey: string) => void;
  children?: Array<{
    id: string;
    title: string;
    tabId: string;
  }>;
}

// Tab 컴포넌트 타입
export interface TabElementProps extends BaseElementProps {
  //tag: 'Tab';
  title?: string;
  tabId?: string;
  isDisabled?: boolean;
}

// Panel 컴포넌트 타입
export interface PanelElementProps extends BaseElementProps {
  //tag: 'Panel';
  title?: string;
  variant?: "default" | "tab" | "sidebar" | "card" | "modal";
}

// Tree 컴포넌트 타입
export interface TreeElementProps extends BaseElementProps {
  //tag: 'Tree';
  "aria-label"?: string;
  selectionMode?: "single" | "multiple" | "none";
  selectionBehavior?: "replace" | "toggle";
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    title: string;
    type: "folder" | "file";
    parent_id: string | null;
    originalIndex: number;
    children?: Array<{
      id: string;
      title: string;
      type: "folder" | "file";
    }>;
  }>;
}

// TreeItem 컴포넌트 타입
export interface TreeItemElementProps extends BaseElementProps {
  //tag: 'TreeItem';
  title?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

// Calendar 컴포넌트 타입
export interface CalendarElementProps extends BaseElementProps {
  //tag: 'Calendar';
  "aria-label"?: string;
  isDisabled?: boolean;
  visibleDuration?: number;
  value?: Date | string | null; // DateValue 타입 (런타임에서 처리)
  defaultValue?: Date | string | null; // DateValue 타입 (런타임에서 처리)
  onChange?: (value: Date | string | null) => void; // DateValue 타입 (런타임에서 처리)
  pageBehavior?: "visible" | "single";
  minValue?: Date;
  maxValue?: Date;
}

// DatePicker 컴포넌트 타입
export interface DatePickerElementProps extends BaseElementProps {
  //tag: 'DatePicker';
  label?: string;
  placeholder?: string;
  value?: Date;
  defaultValue?: Date;
  minValue?: Date;
  maxValue?: Date;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  granularity?: "day" | "hour" | "minute" | "second";
  firstDayOfWeek?: number;
  onChange?: (value: Date) => void;
}

// DateRangePicker 컴포넌트 타입
export interface DateRangePickerElementProps extends BaseElementProps {
  //tag: 'DateRangePicker';
  label?: string;
  placeholder?: string;
  value?: { start: Date; end: Date };
  defaultValue?: { start: Date; end: Date };
  minValue?: Date;
  maxValue?: Date;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  granularity?: "day" | "hour" | "minute" | "second";
  firstDayOfWeek?: number;
  onChange?: (value: { start: Date; end: Date }) => void;
}

// Switch 컴포넌트 타입
export interface SwitchElementProps extends BaseElementProps {
  //tag: 'Switch';
  children?: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
}

// Table 컴포넌트 타입
export interface TableElementProps extends BaseElementProps {
  //tag: 'Table';
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  // 높이 관련 속성들
  height?: number; // 테이블 높이 (기본값: 400)
  heightMode?: "auto" | "fixed" | "viewport" | "full"; // 높이 모드
  heightUnit?: "px" | "vh" | "rem" | "em"; // 높이 단위
  viewportHeight?: number; // 뷰포트 높이 비율 (%)
  // 데이터 매핑 관련 속성들
  dataMapping?: { resultPath?: string; idKey?: string; totalKey?: string }; // API 응답 데이터 매핑 정보
}

// Card 컴포넌트 타입
export interface CardElementProps extends BaseElementProps {
  //tag: 'Card';
  title?: string;
  description?: string;
  variant?: "default" | "outlined" | "elevated";
  size?: "small" | "medium" | "large";
  isQuiet?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isFocused?: boolean;
  children?: React.ReactNode;
}

// TagGroup 컴포넌트 타입
export interface TagGroupElementProps extends BaseElementProps {
  //tag: 'TagGroup';
  label?: string;
  allowsRemoving?: boolean;
  selectionMode?: "single" | "multiple" | "none";
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  children?: Array<{
    id: string;
    children: string;
    isDisabled?: boolean;
  }>;
}

// Tag 컴포넌트 타입
export interface TagElementProps extends BaseElementProps {
  //tag: 'Tag';
  children?: string;
  isDisabled?: boolean;
  onRemove?: () => void;
}

// ListBox 컴포넌트 타입
export interface ListBoxElementProps extends BaseElementProps {
  //tag: 'ListBox';
  orientation?: "horizontal" | "vertical";
  selectionMode?: "single" | "multiple" | "none";
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
  }>;
}

// ListBoxItem 컴포넌트 타입
export interface ListBoxItemElementProps extends BaseElementProps {
  //tag: 'ListBoxItem';
  label?: string;
  value?: string;
  isDisabled?: boolean;
  isSelected?: boolean;
}

// GridList 컴포넌트 타입
export interface GridListElementProps extends BaseElementProps {
  //tag: 'GridList';
  selectionMode?: "single" | "multiple" | "none";
  isDisabled?: boolean;
  children?: Array<{
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
  }>;
}

// GridListItem 컴포넌트 타입
export interface GridListItemElementProps extends BaseElementProps {
  //tag: 'GridListItem';
  label?: string;
  value?: string;
  isDisabled?: boolean;
  isSelected?: boolean;
}

// Text 컴포넌트 타입
export interface TextElementProps extends BaseElementProps {
  //tag: 'Text';
  children?: string;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

// HTML 기본 요소 타입들
export interface DivElementProps extends BaseElementProps {
  //tag: 'Div';
  children?: React.ReactNode;
}

export interface SectionElementProps extends BaseElementProps {
  //tag: 'section';
  children?: React.ReactNode;
}

export interface NavElementProps extends BaseElementProps {
  //tag: 'Nav';
  children?: React.ReactNode;
}

// 유니온 타입으로 모든 컴포넌트 props 정의
export type ComponentElementProps =
  | ButtonElementProps
  | LinkElementProps
  | TextFieldElementProps
  | CheckboxElementProps
  | RadioElementProps
  | ToggleButtonElementProps
  | ToggleButtonGroupElementProps
  | CheckboxGroupElementProps
  | RadioGroupElementProps
  | SelectElementProps
  | ComboBoxElementProps
  | SliderElementProps
  | TabsElementProps
  | TabElementProps
  | PanelElementProps
  | TreeElementProps
  | TreeItemElementProps
  | CalendarElementProps
  | DatePickerElementProps
  | DateRangePickerElementProps
  | SwitchElementProps
  | TableElementProps
  | CardElementProps
  | TagGroupElementProps
  | TagElementProps
  | ListBoxElementProps
  | ListBoxItemElementProps
  | GridListElementProps
  | GridListItemElementProps
  | TextElementProps
  | DivElementProps
  | SectionElementProps
  | NavElementProps;

// 타입 가드 함수들

// 컴포넌트별 기본 props 생성 함수들
export function createDefaultButtonProps(): ButtonElementProps {
  const props = {
    //tag: 'Button',
    children: "Button",
    variant: "default",
    size: "sm",
    isDisabled: false,
  };
  console.log('🔍 createDefaultButtonProps called:', props);
  return props;
}

export function createDefaultLinkProps(): LinkElementProps {
  return {
    children: "Link",
    href: "#",
    variant: "default",
    size: "md",
    isDisabled: false,
    isExternal: false,
    showExternalIcon: true,
  };
}

export function createDefaultTextFieldProps(): TextFieldElementProps {
  return {
    label: "Text Field",
    placeholder: "Enter text...",
    value: "",
    type: "text",
    isRequired: false,
    isDisabled: false,
    isReadOnly: false,
  };
}

export function createDefaultToggleButtonGroupProps(): ToggleButtonGroupElementProps {
  return {
    orientation: "horizontal",
    selectionMode: "single",
    value: [],
    children: [
      { id: "1", title: "Option 1" },
      { id: "2", title: "Option 2" },
    ],
  };
}

// 기타 기본 props 생성 함수들...
export function createDefaultCheckboxGroupProps(): CheckboxGroupElementProps {
  return {
    label: "Checkbox Group",
    orientation: "vertical",
    value: [],
    children: [
      { id: "1", label: "Option 1" },
      { id: "2", label: "Option 2" },
    ],
  };
}

export function createDefaultRadioGroupProps(): RadioGroupElementProps {
  return {
    label: "Radio Group",
    orientation: "vertical",
    value: "",
    children: [
      { id: "1", label: "Option 1", value: "option1" },
      { id: "2", label: "Option 2", value: "option2" },
    ],
  };
}

export function createDefaultSelectProps(): SelectElementProps {
  return {
    label: "Select",
    placeholder: "Choose an option...",
    children: [
      { id: "1", label: "Option 1", value: "option1" },
      { id: "2", label: "Option 2", value: "option2" },
    ],
  };
}

export function createDefaultComboBoxProps(): ComboBoxElementProps {
  return {
    label: "Combo Box",
    placeholder: "Type or select...",
    inputValue: "",
    allowsCustomValue: true,
    children: [
      { id: "1", label: "Option 1", value: "option1" },
      { id: "2", label: "Option 2", value: "option2" },
    ],
  };
}

export function createDefaultTabsProps(): TabsElementProps {
  return {
    defaultSelectedKey: "tab1",
    orientation: "horizontal",
    children: [
      { id: "1", title: "Tab 1", tabId: "tab1" },
      { id: "2", title: "Tab 2", tabId: "tab2" },
    ],
  };
}

export function createDefaultTreeProps(): TreeElementProps {
  return {
    "aria-label": "Tree",
    selectionMode: "single",
    selectionBehavior: "replace",
    children: [
      {
        id: "1",
        title: "Folder 1",
        type: "folder",
        parent_id: null,
        originalIndex: 0,
        children: [
          { id: "1-1", title: "File 1-1", type: "file" },
          { id: "1-2", title: "File 1-2", type: "file" },
        ],
      },
    ],
  };
}

export function createDefaultTagGroupProps(): TagGroupElementProps {
  return {
    label: "Tag Group",
    allowsRemoving: false,
    selectionMode: "multiple",
    value: [],
    children: [
      { id: "1", children: "Tag 1" },
      { id: "2", children: "Tag 2" },
    ],
  };
}

export function createDefaultListBoxProps(): ListBoxElementProps {
  return {
    orientation: "vertical",
    selectionMode: "single",
    children: [
      { id: "1", label: "Item 1", value: "item1" },
      { id: "2", label: "Item 2", value: "item2" },
    ],
  };
}

export function createDefaultGridListProps(): GridListElementProps {
  return {
    selectionMode: "none",
    children: [
      { id: "1", label: "Item 1", value: "item1" },
      { id: "2", label: "Item 2", value: "item2" },
    ],
  };
}
