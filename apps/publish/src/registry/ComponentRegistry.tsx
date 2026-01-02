/**
 * Component Registry
 *
 * 🚀 Phase 10 B2.3: Publish App 컴포넌트 레지스트리
 *
 * Element tag를 실제 React 컴포넌트로 매핑합니다.
 * @xstudio/shared의 컴포넌트를 사용하여 Builder Preview와 동일한 렌더링을 보장합니다.
 *
 * @since 2025-12-11 Phase 10 B2.3
 * @updated 2025-01-02 shared 컴포넌트 통합
 */

import type { ComponentType } from 'react';

// @xstudio/shared 컴포넌트 import
import {
  Button,
  TextField,
  NumberField,
  SearchField,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Switch,
  Slider,
  Select,
  ComboBox,
  Form,
  ToggleButton,
  ToggleButtonGroup,
  DateField,
  TimeField,
  DatePicker,
  DateRangePicker,
  Calendar,
  RangeCalendar,
  ListBox,
  GridList,
  MenuButton,
  TagGroup,
  Tree,
  Table,
  Tabs,
  Link,
  Breadcrumbs,
  Pagination,
  Separator,
  Toolbar,
  Panel,
  Card,
  Disclosure,
  DisclosureGroup,
  Badge,
  ProgressBar,
  Meter,
  Skeleton,
  Dialog,
  Modal,
  Popover,
  Tooltip,
} from '@xstudio/shared/components';

// ============================================
// Component Registry Types
// ============================================

export interface ComponentRegistryEntry {
  component: ComponentType<Record<string, unknown>>;
  displayName: string;
  category: 'layout' | 'input' | 'display' | 'navigation' | 'collection';
}

export type ComponentRegistry = Map<string, ComponentRegistryEntry>;

// ============================================
// Registry Instance
// ============================================

const registry: ComponentRegistry = new Map();

// ============================================
// Registry API
// ============================================

/**
 * 컴포넌트 등록
 */
export function registerComponent(
  tag: string,
  entry: ComponentRegistryEntry
): void {
  registry.set(tag, entry);
}

/**
 * 컴포넌트 가져오기
 */
export function getComponent(tag: string): ComponentRegistryEntry | undefined {
  return registry.get(tag);
}

/**
 * 컴포넌트 존재 확인
 */
export function hasComponent(tag: string): boolean {
  return registry.has(tag);
}

/**
 * 모든 컴포넌트 가져오기
 */
export function getAllComponents(): ComponentRegistry {
  return registry;
}

/**
 * 카테고리별 컴포넌트 가져오기
 */
export function getComponentsByCategory(
  category: ComponentRegistryEntry['category']
): Map<string, ComponentRegistryEntry> {
  const filtered = new Map<string, ComponentRegistryEntry>();

  registry.forEach((entry, tag) => {
    if (entry.category === category) {
      filtered.set(tag, entry);
    }
  });

  return filtered;
}

// ============================================
// Default Components Registration
// ============================================

/**
 * 기본 HTML 요소들 등록
 */
export function registerDefaultComponents(): void {
  // Layout Components (body 포함)
  const layoutTags = ['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'body'];
  layoutTags.forEach((tag) => {
    registerComponent(tag, {
      component: createHtmlElement(tag === 'body' ? 'div' : tag), // body는 div로 렌더링
      displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
      category: 'layout',
    });
  });

  // Display Components
  const displayTags = ['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'a'];
  displayTags.forEach((tag) => {
    registerComponent(tag, {
      component: createHtmlElement(tag),
      displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
      category: 'display',
    });
  });

  // Input Components
  const inputTags = ['input', 'textarea', 'button', 'select', 'form'];
  inputTags.forEach((tag) => {
    registerComponent(tag, {
      component: createHtmlElement(tag),
      displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
      category: 'input',
    });
  });

  // Text 컴포넌트 (span으로 렌더링)
  registerComponent('Text', {
    component: createHtmlElement('span'),
    displayName: 'Text',
    category: 'display',
  });
}

/**
 * HTML 요소 컴포넌트 팩토리
 */
function createHtmlElement(tag: string): ComponentType<Record<string, unknown>> {
  const HtmlElement = (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Tag = tag as any;
    return <Tag {...rest}>{children}</Tag>;
  };
  HtmlElement.displayName = `Html${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
  return HtmlElement;
}

// Auto-register default components
registerDefaultComponents();

/**
 * @xstudio/shared 컴포넌트 등록
 * Builder Preview와 동일한 React Aria 컴포넌트 사용
 */
export function registerSharedComponents(): void {
  // Form Components
  registerComponent('Button', {
    component: Button as ComponentType<Record<string, unknown>>,
    displayName: 'Button',
    category: 'input',
  });
  registerComponent('TextField', {
    component: TextField as ComponentType<Record<string, unknown>>,
    displayName: 'TextField',
    category: 'input',
  });
  registerComponent('NumberField', {
    component: NumberField as ComponentType<Record<string, unknown>>,
    displayName: 'NumberField',
    category: 'input',
  });
  registerComponent('SearchField', {
    component: SearchField as ComponentType<Record<string, unknown>>,
    displayName: 'SearchField',
    category: 'input',
  });
  registerComponent('Checkbox', {
    component: Checkbox as ComponentType<Record<string, unknown>>,
    displayName: 'Checkbox',
    category: 'input',
  });
  registerComponent('CheckboxGroup', {
    component: CheckboxGroup as ComponentType<Record<string, unknown>>,
    displayName: 'CheckboxGroup',
    category: 'input',
  });
  registerComponent('Radio', {
    component: Radio as ComponentType<Record<string, unknown>>,
    displayName: 'Radio',
    category: 'input',
  });
  registerComponent('RadioGroup', {
    component: RadioGroup as ComponentType<Record<string, unknown>>,
    displayName: 'RadioGroup',
    category: 'input',
  });
  registerComponent('Switch', {
    component: Switch as ComponentType<Record<string, unknown>>,
    displayName: 'Switch',
    category: 'input',
  });
  registerComponent('Slider', {
    component: Slider as ComponentType<Record<string, unknown>>,
    displayName: 'Slider',
    category: 'input',
  });
  registerComponent('Select', {
    component: Select as ComponentType<Record<string, unknown>>,
    displayName: 'Select',
    category: 'input',
  });
  registerComponent('ComboBox', {
    component: ComboBox as ComponentType<Record<string, unknown>>,
    displayName: 'ComboBox',
    category: 'input',
  });
  registerComponent('Form', {
    component: Form as ComponentType<Record<string, unknown>>,
    displayName: 'Form',
    category: 'input',
  });
  registerComponent('ToggleButton', {
    component: ToggleButton as ComponentType<Record<string, unknown>>,
    displayName: 'ToggleButton',
    category: 'input',
  });
  registerComponent('ToggleButtonGroup', {
    component: ToggleButtonGroup as ComponentType<Record<string, unknown>>,
    displayName: 'ToggleButtonGroup',
    category: 'input',
  });

  // Date/Time Components
  registerComponent('DateField', {
    component: DateField as ComponentType<Record<string, unknown>>,
    displayName: 'DateField',
    category: 'input',
  });
  registerComponent('TimeField', {
    component: TimeField as ComponentType<Record<string, unknown>>,
    displayName: 'TimeField',
    category: 'input',
  });
  registerComponent('DatePicker', {
    component: DatePicker as ComponentType<Record<string, unknown>>,
    displayName: 'DatePicker',
    category: 'input',
  });
  registerComponent('DateRangePicker', {
    component: DateRangePicker as ComponentType<Record<string, unknown>>,
    displayName: 'DateRangePicker',
    category: 'input',
  });
  registerComponent('Calendar', {
    component: Calendar as ComponentType<Record<string, unknown>>,
    displayName: 'Calendar',
    category: 'input',
  });
  registerComponent('RangeCalendar', {
    component: RangeCalendar as ComponentType<Record<string, unknown>>,
    displayName: 'RangeCalendar',
    category: 'input',
  });

  // Collection Components
  registerComponent('ListBox', {
    component: ListBox as ComponentType<Record<string, unknown>>,
    displayName: 'ListBox',
    category: 'collection',
  });
  registerComponent('GridList', {
    component: GridList as ComponentType<Record<string, unknown>>,
    displayName: 'GridList',
    category: 'collection',
  });
  registerComponent('MenuButton', {
    component: MenuButton as ComponentType<Record<string, unknown>>,
    displayName: 'MenuButton',
    category: 'collection',
  });
  registerComponent('TagGroup', {
    component: TagGroup as ComponentType<Record<string, unknown>>,
    displayName: 'TagGroup',
    category: 'collection',
  });
  registerComponent('Tree', {
    component: Tree as ComponentType<Record<string, unknown>>,
    displayName: 'Tree',
    category: 'collection',
  });
  registerComponent('Table', {
    component: Table as ComponentType<Record<string, unknown>>,
    displayName: 'Table',
    category: 'collection',
  });
  registerComponent('Tabs', {
    component: Tabs as ComponentType<Record<string, unknown>>,
    displayName: 'Tabs',
    category: 'collection',
  });

  // Navigation Components
  registerComponent('Link', {
    component: Link as ComponentType<Record<string, unknown>>,
    displayName: 'Link',
    category: 'navigation',
  });
  registerComponent('Breadcrumbs', {
    component: Breadcrumbs as ComponentType<Record<string, unknown>>,
    displayName: 'Breadcrumbs',
    category: 'navigation',
  });
  registerComponent('Pagination', {
    component: Pagination as ComponentType<Record<string, unknown>>,
    displayName: 'Pagination',
    category: 'navigation',
  });

  // Layout Components
  registerComponent('Separator', {
    component: Separator as ComponentType<Record<string, unknown>>,
    displayName: 'Separator',
    category: 'layout',
  });
  registerComponent('Toolbar', {
    component: Toolbar as ComponentType<Record<string, unknown>>,
    displayName: 'Toolbar',
    category: 'layout',
  });
  registerComponent('Panel', {
    component: Panel as ComponentType<Record<string, unknown>>,
    displayName: 'Panel',
    category: 'layout',
  });
  registerComponent('Card', {
    component: Card as ComponentType<Record<string, unknown>>,
    displayName: 'Card',
    category: 'layout',
  });
  registerComponent('Disclosure', {
    component: Disclosure as ComponentType<Record<string, unknown>>,
    displayName: 'Disclosure',
    category: 'layout',
  });
  registerComponent('DisclosureGroup', {
    component: DisclosureGroup as ComponentType<Record<string, unknown>>,
    displayName: 'DisclosureGroup',
    category: 'layout',
  });

  // Feedback Components
  registerComponent('Badge', {
    component: Badge as ComponentType<Record<string, unknown>>,
    displayName: 'Badge',
    category: 'display',
  });
  registerComponent('ProgressBar', {
    component: ProgressBar as ComponentType<Record<string, unknown>>,
    displayName: 'ProgressBar',
    category: 'display',
  });
  registerComponent('Meter', {
    component: Meter as ComponentType<Record<string, unknown>>,
    displayName: 'Meter',
    category: 'display',
  });
  registerComponent('Skeleton', {
    component: Skeleton as ComponentType<Record<string, unknown>>,
    displayName: 'Skeleton',
    category: 'display',
  });

  // Overlay Components
  registerComponent('Dialog', {
    component: Dialog as ComponentType<Record<string, unknown>>,
    displayName: 'Dialog',
    category: 'display',
  });
  registerComponent('Modal', {
    component: Modal as ComponentType<Record<string, unknown>>,
    displayName: 'Modal',
    category: 'display',
  });
  registerComponent('Popover', {
    component: Popover as ComponentType<Record<string, unknown>>,
    displayName: 'Popover',
    category: 'display',
  });
  registerComponent('Tooltip', {
    component: Tooltip as ComponentType<Record<string, unknown>>,
    displayName: 'Tooltip',
    category: 'display',
  });
}

// Auto-register shared components
registerSharedComponents();

export default registry;
