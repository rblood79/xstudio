/**
 * Complex Component Tags
 *
 * Factory가 자식 Element를 생성하는 컴포넌트 태그.
 * 이 태그들은 자식 유무와 관계없이 항상 _hasChildren=true로 처리되어
 * 자식 삭제 시에도 standalone spec 렌더링으로 돌아가지 않음.
 *
 * 사용처:
 * - useElementCreator.ts: Factory 경로 분기
 * - ElementSprite.tsx: _hasChildren prop 주입
 */
export const COMPLEX_COMPONENT_TAGS = new Set([
  // Form Input
  'TextField', 'TextArea', 'NumberField', 'SearchField',
  'DateField', 'TimeField', 'ColorField',
  // Selection
  'Select', 'ComboBox', 'ListBox', 'GridList', 'List',
  // Control
  'Checkbox', 'Radio', 'Switch', 'Slider',
  'ToggleButtonGroup', 'Switcher',
  // Group
  'CheckboxGroup', 'RadioGroup',
  // Layout
  'Card',
  // Navigation
  'Menu', 'Disclosure', 'DisclosureGroup', 'Pagination',
  // Overlay
  'Dialog', 'Popover', 'Tooltip',
  // Feedback
  'Form', 'Toast', 'Toolbar',
  // Date & Color
  'DatePicker', 'DateRangePicker', 'Calendar', 'ColorPicker',
  'ColorSwatchPicker',
  // CHILD_COMPOSITION_EXCLUDE_TAGS 태그 (synthetic prop 메커니즘 사용)
  // ElementSprite에서 EXCLUDE 가드에 의해 _hasChildren 주입 차단되므로 안전.
  // useElementCreator의 Factory 경로 분기용.
  'Tabs', 'Tree', 'TagGroup', 'Table',
]);
