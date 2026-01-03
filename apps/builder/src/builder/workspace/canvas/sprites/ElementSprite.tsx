/**
 * Element Sprite
 *
 * 🚀 Phase 10 B1.2: Element 타입별 스프라이트 디스패처
 * 🚀 Phase 11 B2.5: Layout 컨테이너 및 UI 컴포넌트 확장
 *
 * Element의 tag와 style에 따라 적절한 Sprite 컴포넌트로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-11 Phase 11 B2.5 - Layout/UI 확장
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useMemo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import { BoxSprite } from './BoxSprite';
import { TextSprite } from './TextSprite';
import { ImageSprite } from './ImageSprite';
import {
  PixiButton,
  PixiFancyButton,
  PixiCheckbox,
  PixiCheckboxGroup,
  PixiCheckboxItem,
  PixiRadio,
  PixiRadioItem,
  PixiSlider,
  PixiInput,
  PixiSelect,
  PixiProgressBar,
  PixiSwitcher,
  PixiScrollBox,
  PixiList,
  PixiMaskedFrame,
  // Phase 1 WebGL Migration Components
  PixiToggleButton,
  PixiToggleButtonGroup,
  PixiListBox,
  PixiBadge,
  PixiMeter,
  // Phase 2 WebGL Migration Components
  PixiSeparator,
  PixiLink,
  PixiBreadcrumbs,
  PixiCard,
  PixiMenu,
  PixiTabs,
  // Phase 3 WebGL Migration Components
  PixiNumberField,
  PixiSearchField,
  PixiComboBox,
  // Phase 4 WebGL Migration Components
  PixiGridList,
  PixiTagGroup,
  PixiTree,
  PixiTable,
  // Phase 5 WebGL Migration Components
  PixiDisclosure,
  PixiDisclosureGroup,
  PixiTooltip,
  PixiPopover,
  PixiDialog,
  // Phase 6 WebGL Migration Components
  PixiColorSwatch,
  PixiColorSlider,
  PixiTimeField,
  PixiDateField,
  PixiColorArea,
  PixiCalendar,
  PixiColorWheel,
  PixiDatePicker,
  PixiColorPicker,
  PixiDateRangePicker,
  // Phase 7 WebGL Migration Components
  PixiTextField,
  PixiSwitch,
  PixiTextArea,
  PixiForm,
  PixiToolbar,
  PixiFileTrigger,
  PixiDropZone,
  PixiSkeleton,
  // Phase 8 WebGL Migration Components
  PixiToast,
  PixiPagination,
  PixiColorField,
  PixiColorSwatchPicker,
  PixiGroup,
  PixiSlot,
  PixiPanel,
} from '../ui';
import { useStore } from '../../../stores';
import { isFlexContainer, isGridContainer } from '../layout';

// ============================================
// Types
// ============================================

export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Modifier keys for multi-select */
export interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

export interface ElementSpriteProps {
  element: Element;
  /** @deprecated 더 이상 사용하지 않음. 각 ElementSprite가 자체적으로 선택 상태를 구독합니다. */
  isSelected?: boolean;
  /** 레이아웃 계산된 위치 (있으면 style보다 우선) */
  layoutPosition?: LayoutPosition;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onDoubleClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

// ============================================
// Tag to Sprite Mapping
// ============================================

/**
 * 텍스트 관련 태그들
 */
const TEXT_TAGS = new Set([
  'Text',
  'Heading',
  'Label',
  'Paragraph',
  'Link',
  'Strong',
  'Em',
  'Code',
  'Pre',
  'Blockquote',
  'ListItem',
]);

/**
 * 이미지 관련 태그들
 */
const IMAGE_TAGS = new Set(['Image', 'Avatar', 'Logo', 'Icon', 'Thumbnail']);

/**
 * UI 컴포넌트 태그들 (Phase 11 B2.4)
 */
const UI_BUTTON_TAGS = new Set(['Button', 'SubmitButton']);
const UI_FANCYBUTTON_TAGS = new Set(['FancyButton']);
const UI_CHECKBOX_GROUP_TAGS = new Set(['CheckboxGroup']);  // CheckboxGroup 컨테이너
const UI_CHECKBOX_ITEM_TAGS = new Set(['Checkbox', 'CheckBox', 'Switch', 'Toggle']);  // Checkbox 개별 아이템
const UI_RADIO_GROUP_TAGS = new Set(['RadioGroup']);  // RadioGroup 컨테이너
const UI_RADIO_ITEM_TAGS = new Set(['Radio']);  // Radio 개별 아이템 (투명 hit area만)

/**
 * UI 컴포넌트 태그들 (Phase 6)
 */
const UI_SLIDER_TAGS = new Set(['Slider', 'RangeSlider']);
const UI_INPUT_TAGS = new Set(['Input', 'TextField', 'TextInput', 'SearchField']);
const UI_SELECT_TAGS = new Set(['Select', 'Dropdown', 'ComboBox']);
const UI_PROGRESS_TAGS = new Set(['ProgressBar', 'Progress', 'LoadingBar']);
const UI_SWITCHER_TAGS = new Set(['Switcher', 'SegmentedControl', 'TabBar']);
const UI_SCROLLBOX_TAGS = new Set(['ScrollBox', 'ScrollContainer', 'ScrollView']);
const UI_LIST_TAGS = new Set(['List', 'ItemList', 'VirtualList']);
const UI_MASKEDFRAME_TAGS = new Set(['MaskedFrame', 'ClippedImage', 'MaskedImage', 'AvatarImage']);

/**
 * Phase 1 WebGL Migration 컴포넌트 태그들
 */
const UI_TOGGLEBUTTON_TAGS = new Set(['ToggleButton']);
const UI_TOGGLEBUTTONGROUP_TAGS = new Set(['ToggleButtonGroup']);
const UI_LISTBOX_TAGS = new Set(['ListBox']);
const UI_BADGE_TAGS = new Set(['Badge', 'Tag', 'Chip']);
const UI_METER_TAGS = new Set(['Meter', 'Gauge']);

/**
 * Phase 2 WebGL Migration 컴포넌트 태그들
 */
const UI_SEPARATOR_TAGS = new Set(['Separator', 'Divider', 'Hr']);
const UI_LINK_TAGS = new Set(['Link', 'Anchor', 'A']);
const UI_BREADCRUMBS_TAGS = new Set(['Breadcrumbs']);
const UI_CARD_TAGS = new Set(['Card', 'Box']);
const UI_PANEL_TAGS = new Set(['Panel']);
const UI_MENU_TAGS = new Set(['Menu', 'ContextMenu', 'DropdownMenu']);
const UI_TABS_TAGS = new Set(['Tabs', 'TabList']);

/**
 * Phase 3 WebGL Migration 컴포넌트 태그들
 */
const UI_NUMBERFIELD_TAGS = new Set(['NumberField']);
const UI_SEARCHFIELD_TAGS = new Set(['SearchField']);
const UI_COMBOBOX_TAGS = new Set(['ComboBox']);

/**
 * Phase 4 WebGL Migration 컴포넌트 태그들
 */
const UI_GRIDLIST_TAGS = new Set(['GridList']);
const UI_TAGGROUP_TAGS = new Set(['TagGroup', 'TagList']);
const UI_TREE_TAGS = new Set(['Tree', 'TreeView']);
const UI_TABLE_TAGS = new Set(['Table', 'DataTable', 'DataGrid']);

/**
 * Phase 5 WebGL Migration 컴포넌트 태그들
 */
const UI_DISCLOSURE_TAGS = new Set(['Disclosure']);
const UI_DISCLOSUREGROUP_TAGS = new Set(['DisclosureGroup', 'Accordion']);
const UI_TOOLTIP_TAGS = new Set(['Tooltip']);
const UI_POPOVER_TAGS = new Set(['Popover']);
const UI_DIALOG_TAGS = new Set(['Dialog', 'Modal', 'AlertDialog']);

/**
 * Phase 6 WebGL Migration 컴포넌트 태그들 - Date/Color Components
 */
const UI_COLORSWATCH_TAGS = new Set(['ColorSwatch']);
const UI_COLORSLIDER_TAGS = new Set(['ColorSlider']);
const UI_TIMEFIELD_TAGS = new Set(['TimeField']);
const UI_DATEFIELD_TAGS = new Set(['DateField']);
const UI_COLORAREA_TAGS = new Set(['ColorArea']);
const UI_CALENDAR_TAGS = new Set(['Calendar', 'RangeCalendar']);
const UI_COLORWHEEL_TAGS = new Set(['ColorWheel']);
const UI_DATEPICKER_TAGS = new Set(['DatePicker']);
const UI_COLORPICKER_TAGS = new Set(['ColorPicker']);
const UI_DATERANGEPICKER_TAGS = new Set(['DateRangePicker']);

/**
 * Phase 7 WebGL Migration 컴포넌트 태그들 - Form & Utility Components
 */
const UI_TEXTFIELD_TAGS = new Set(['TextField', 'TextInput']);
const UI_SWITCH_TAGS = new Set(['Switch']);
const UI_TEXTAREA_TAGS = new Set(['TextArea', 'Textarea']);
const UI_FORM_TAGS = new Set(['Form']);
const UI_TOOLBAR_TAGS = new Set(['Toolbar']);
const UI_FILETRIGGER_TAGS = new Set(['FileTrigger', 'FileUpload', 'FileInput']);
const UI_DROPZONE_TAGS = new Set(['DropZone', 'FileDropZone']);
const UI_SKELETON_TAGS = new Set(['Skeleton', 'SkeletonLoader']);

/**
 * Phase 8 WebGL Migration 컴포넌트 태그들 - Notification & Color Utility Components
 */
const UI_TOAST_TAGS = new Set(['Toast']);
const UI_PAGINATION_TAGS = new Set(['Pagination']);
const UI_COLORFIELD_TAGS = new Set(['ColorField']);
const UI_COLORSWATCHPICKER_TAGS = new Set(['ColorSwatchPicker']);
const UI_GROUP_TAGS = new Set(['Group']);
const UI_SLOT_TAGS = new Set(['Slot']);

// Note: TEXT_TAGS, IMAGE_TAGS, UI_*_TAGS에 포함되지 않은 모든 태그는 BoxSprite로 렌더링됨

// ============================================
// Sprite Type Detection
// ============================================

type SpriteType = 'box' | 'text' | 'image' | 'button' | 'fancyButton' | 'checkboxGroup' | 'checkboxItem' | 'radioGroup' | 'radioItem' | 'slider' | 'input' | 'select' | 'progressBar' | 'switcher' | 'scrollBox' | 'list' | 'maskedFrame' | 'flex' | 'grid' | 'toggleButton' | 'toggleButtonGroup' | 'listBox' | 'badge' | 'meter' | 'separator' | 'link' | 'breadcrumbs' | 'card' | 'panel' | 'menu' | 'tabs' | 'numberField' | 'searchField' | 'comboBox' | 'gridList' | 'tagGroup' | 'tree' | 'table' | 'disclosure' | 'disclosureGroup' | 'tooltip' | 'popover' | 'dialog' | 'colorSwatch' | 'colorSlider' | 'timeField' | 'dateField' | 'colorArea' | 'calendar' | 'colorWheel' | 'datePicker' | 'colorPicker' | 'dateRangePicker' | 'textField' | 'switch' | 'textArea' | 'form' | 'toolbar' | 'fileTrigger' | 'dropZone' | 'skeleton' | 'toast' | 'pagination' | 'colorField' | 'colorSwatchPicker' | 'group' | 'slot';

function getSpriteType(element: Element): SpriteType {
  const tag = element.tag;

  // UI 컴포넌트 우선 체크 (Phase 11 B2.4 + Phase 6)
  if (UI_BUTTON_TAGS.has(tag)) return 'button';
  if (UI_FANCYBUTTON_TAGS.has(tag)) return 'fancyButton';
  if (UI_CHECKBOX_GROUP_TAGS.has(tag)) return 'checkboxGroup';
  if (UI_CHECKBOX_ITEM_TAGS.has(tag)) return 'checkboxItem';
  if (UI_RADIO_GROUP_TAGS.has(tag)) return 'radioGroup';
  if (UI_RADIO_ITEM_TAGS.has(tag)) return 'radioItem';
  if (UI_SLIDER_TAGS.has(tag)) return 'slider';
  if (UI_INPUT_TAGS.has(tag)) return 'input';
  if (UI_SELECT_TAGS.has(tag)) return 'select';
  if (UI_PROGRESS_TAGS.has(tag)) return 'progressBar';
  if (UI_SWITCHER_TAGS.has(tag)) return 'switcher';
  if (UI_SCROLLBOX_TAGS.has(tag)) return 'scrollBox';
  if (UI_LIST_TAGS.has(tag)) return 'list';
  if (UI_MASKEDFRAME_TAGS.has(tag)) return 'maskedFrame';

  // Phase 1 WebGL Migration 컴포넌트
  if (UI_TOGGLEBUTTON_TAGS.has(tag)) return 'toggleButton';
  if (UI_TOGGLEBUTTONGROUP_TAGS.has(tag)) return 'toggleButtonGroup';
  if (UI_LISTBOX_TAGS.has(tag)) return 'listBox';
  if (UI_BADGE_TAGS.has(tag)) return 'badge';
  if (UI_METER_TAGS.has(tag)) return 'meter';

  // Phase 2 WebGL Migration 컴포넌트
  if (UI_SEPARATOR_TAGS.has(tag)) return 'separator';
  if (UI_LINK_TAGS.has(tag)) return 'link';
  if (UI_BREADCRUMBS_TAGS.has(tag)) return 'breadcrumbs';
  if (UI_CARD_TAGS.has(tag)) return 'card';
  if (UI_PANEL_TAGS.has(tag)) return 'panel';
  if (UI_MENU_TAGS.has(tag)) return 'menu';
  if (UI_TABS_TAGS.has(tag)) return 'tabs';

  // Phase 3 WebGL Migration 컴포넌트
  if (UI_NUMBERFIELD_TAGS.has(tag)) return 'numberField';
  if (UI_SEARCHFIELD_TAGS.has(tag)) return 'searchField';
  if (UI_COMBOBOX_TAGS.has(tag)) return 'comboBox';

  // Phase 4 WebGL Migration 컴포넌트
  if (UI_GRIDLIST_TAGS.has(tag)) return 'gridList';
  if (UI_TAGGROUP_TAGS.has(tag)) return 'tagGroup';
  if (UI_TREE_TAGS.has(tag)) return 'tree';
  if (UI_TABLE_TAGS.has(tag)) return 'table';

  // Phase 5 WebGL Migration 컴포넌트
  if (UI_DISCLOSURE_TAGS.has(tag)) return 'disclosure';
  if (UI_DISCLOSUREGROUP_TAGS.has(tag)) return 'disclosureGroup';
  if (UI_TOOLTIP_TAGS.has(tag)) return 'tooltip';
  if (UI_POPOVER_TAGS.has(tag)) return 'popover';
  if (UI_DIALOG_TAGS.has(tag)) return 'dialog';

  // Phase 6 WebGL Migration 컴포넌트 - Date/Color Components
  if (UI_COLORSWATCH_TAGS.has(tag)) return 'colorSwatch';
  if (UI_COLORSLIDER_TAGS.has(tag)) return 'colorSlider';
  if (UI_TIMEFIELD_TAGS.has(tag)) return 'timeField';
  if (UI_DATEFIELD_TAGS.has(tag)) return 'dateField';
  if (UI_COLORAREA_TAGS.has(tag)) return 'colorArea';
  if (UI_CALENDAR_TAGS.has(tag)) return 'calendar';
  if (UI_COLORWHEEL_TAGS.has(tag)) return 'colorWheel';
  if (UI_DATEPICKER_TAGS.has(tag)) return 'datePicker';
  if (UI_COLORPICKER_TAGS.has(tag)) return 'colorPicker';
  if (UI_DATERANGEPICKER_TAGS.has(tag)) return 'dateRangePicker';

  // Phase 7 WebGL Migration 컴포넌트 - Form & Utility Components
  if (UI_TEXTFIELD_TAGS.has(tag)) return 'textField';
  if (UI_SWITCH_TAGS.has(tag)) return 'switch';
  if (UI_TEXTAREA_TAGS.has(tag)) return 'textArea';
  if (UI_FORM_TAGS.has(tag)) return 'form';
  if (UI_TOOLBAR_TAGS.has(tag)) return 'toolbar';
  if (UI_FILETRIGGER_TAGS.has(tag)) return 'fileTrigger';
  if (UI_DROPZONE_TAGS.has(tag)) return 'dropZone';
  if (UI_SKELETON_TAGS.has(tag)) return 'skeleton';

  // Phase 8 WebGL Migration 컴포넌트 - Notification & Color Utility Components
  if (UI_TOAST_TAGS.has(tag)) return 'toast';
  if (UI_PAGINATION_TAGS.has(tag)) return 'pagination';
  if (UI_COLORFIELD_TAGS.has(tag)) return 'colorField';
  if (UI_COLORSWATCHPICKER_TAGS.has(tag)) return 'colorSwatchPicker';
  if (UI_GROUP_TAGS.has(tag)) return 'group';
  if (UI_SLOT_TAGS.has(tag)) return 'slot';

  // 레이아웃 컨테이너 체크 (Phase 11 B2.5)
  // display: flex/grid인 경우에도 현재는 BoxSprite로 렌더링
  // (레이아웃 계산은 별도로 처리)
  if (isFlexContainer(element)) return 'flex';
  if (isGridContainer(element)) return 'grid';

  // 기본 타입
  if (TEXT_TAGS.has(tag)) return 'text';
  if (IMAGE_TAGS.has(tag)) return 'image';

  return 'box';
}

// ============================================
// Component
// ============================================

/**
 * ElementSprite
 *
 * Element의 tag와 style에 따라 적절한 Sprite를 렌더링합니다.
 *
 * @example
 * <ElementSprite
 *   element={element}
 *   isSelected={selectedIds.includes(element.id)}
 *   onClick={handleElementClick}
 * />
 */
export const ElementSprite = memo(function ElementSprite({
  element,
  isSelected: isSelectedProp, // @deprecated - fallback용으로만 사용
  layoutPosition,
  onClick,
  onDoubleClick,
  onChange,
}: ElementSpriteProps) {
  useExtend(PIXI_COMPONENTS);

  // 🚀 성능 최적화: 각 ElementSprite가 자신의 선택 상태만 구독
  // 기존: ElementsLayer가 selectedElementIds 구독 → 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 여부만 구독 → 변경된 요소만 리렌더 O(2)
  // selector가 boolean을 반환하므로 값이 변경될 때만 리렌더 트리거
  const elementId = element.id;
  // 🚀 O(1) 최적화: Set.has() 사용 (includes() 대신)
  const isSelected = useStore((state) =>
    state.selectedElementIdsSet.has(elementId)
  ) ?? isSelectedProp ?? false;

  // 부모 요소 확인 (CheckboxGroup 자식 여부 판단용)
  // 🚀 최적화: elements 배열 대신 elementsMap 사용 (O(1) 조회)
  // elements 배열 전체 구독 → 다른 요소 변경 시에도 리렌더링 발생
  // elementsMap.get() → 해당 부모 요소만 조회, 불필요한 리렌더링 방지
  const parentElement = useStore((state) => {
    if (!element.parent_id) return null;
    return state.elementsMap.get(element.parent_id) ?? null;
  });

  // layoutPosition이 있으면 style을 오버라이드한 새 element 생성
  const effectiveElement = useMemo(() => {
    if (!layoutPosition) return element;

    const currentStyle = (element.props?.style || {}) as Record<string, unknown>;
    return {
      ...element,
      props: {
        ...element.props,
        style: {
          ...currentStyle,
          left: layoutPosition.x,
          top: layoutPosition.y,
          width: layoutPosition.width,
          height: layoutPosition.height,
        },
      },
    };
  }, [element, layoutPosition]);

  const spriteType = getSpriteType(effectiveElement);

  // CheckboxGroup의 자식 Checkbox인지 확인
  const isCheckboxInGroup = spriteType === 'checkboxItem' && parentElement?.tag === 'CheckboxGroup';

  switch (spriteType) {
    // UI 컴포넌트 (Phase 11 B2.4)
    // P5: PixiButton 활성화 (pixiContainer 래퍼로 이벤트 처리)
    case 'button':
      return (
        <PixiButton
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'fancyButton':
      return (
        <PixiFancyButton
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'checkboxGroup':
      return (
        <PixiCheckboxGroup
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, values) => onChange(id, values) : undefined}
        />
      );

    case 'checkboxItem':
      // CheckboxGroup의 자식이면 투명 hit area만 렌더링
      if (isCheckboxInGroup) {
        return (
          <PixiCheckboxItem
            element={effectiveElement}
            isSelected={isSelected}
            onClick={onClick}
          />
        );
      }
      // 독립 Checkbox는 전체 렌더링
      return (
        <PixiCheckbox
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, checked) => onChange(id, checked) : undefined}
        />
      );

    case 'radioGroup':
      return (
        <PixiRadio
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'radioItem':
      return (
        <PixiRadioItem
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // Phase 6: @pixi/ui 컴포넌트
    case 'slider':
      return (
        <PixiSlider
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'input':
      return (
        <PixiInput
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'select':
      return (
        <PixiSelect
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'progressBar':
      return (
        <PixiProgressBar
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'switcher':
      return (
        <PixiSwitcher
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'scrollBox':
      return (
        <PixiScrollBox
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'list':
      return (
        <PixiList
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'maskedFrame':
      return (
        <PixiMaskedFrame
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // Phase 1 WebGL Migration 컴포넌트
    case 'toggleButton':
      return (
        <PixiToggleButton
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'toggleButtonGroup':
      return (
        <PixiToggleButtonGroup
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, keys) => onChange(id, keys) : undefined}
        />
      );

    case 'listBox':
      return (
        <PixiListBox
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, keys) => onChange(id, keys) : undefined}
        />
      );

    case 'badge':
      return (
        <PixiBadge
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'meter':
      return (
        <PixiMeter
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // Phase 2 WebGL Migration 컴포넌트
    case 'separator':
      return (
        <PixiSeparator
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'link':
      return (
        <PixiLink
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'breadcrumbs':
      return (
        <PixiBreadcrumbs
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'card':
      return (
        <PixiCard
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'panel':
      return (
        <PixiPanel
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'menu':
      return (
        <PixiMenu
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'tabs':
      return (
        <PixiTabs
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // Phase 3 WebGL Migration 컴포넌트
    case 'numberField':
      return (
        <PixiNumberField
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'searchField':
      return (
        <PixiSearchField
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'comboBox':
      return (
        <PixiComboBox
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    // Phase 4 WebGL Migration 컴포넌트
    case 'gridList':
      return (
        <PixiGridList
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'tagGroup':
      return (
        <PixiTagGroup
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'tree':
      return (
        <PixiTree
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'table':
      return (
        <PixiTable
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    // Phase 5 WebGL Migration 컴포넌트
    case 'disclosure':
      return (
        <PixiDisclosure
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'disclosureGroup':
      return (
        <PixiDisclosureGroup
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'tooltip':
      return (
        <PixiTooltip
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'popover':
      return (
        <PixiPopover
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'dialog':
      return (
        <PixiDialog
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    // Phase 6 WebGL Migration 컴포넌트 - Date/Color Components
    case 'colorSwatch':
      return (
        <PixiColorSwatch
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'colorSlider':
      return (
        <PixiColorSlider
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'timeField':
      return (
        <PixiTimeField
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'dateField':
      return (
        <PixiDateField
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'colorArea':
      return (
        <PixiColorArea
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'calendar':
      return (
        <PixiCalendar
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'colorWheel':
      return (
        <PixiColorWheel
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'datePicker':
      return (
        <PixiDatePicker
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'colorPicker':
      return (
        <PixiColorPicker
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'dateRangePicker':
      return (
        <PixiDateRangePicker
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // Phase 7 WebGL Migration 컴포넌트 - Form & Utility Components
    case 'textField':
      return (
        <PixiTextField
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'switch':
      return (
        <PixiSwitch
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'textArea':
      return (
        <PixiTextArea
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'form':
      return (
        <PixiForm
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'toolbar':
      return (
        <PixiToolbar
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'fileTrigger':
      return (
        <PixiFileTrigger
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'dropZone':
      return (
        <PixiDropZone
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'skeleton':
      return (
        <PixiSkeleton
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // Phase 8 WebGL Migration 컴포넌트 - Notification & Color Utility Components
    case 'toast':
      return (
        <PixiToast
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'pagination':
      return (
        <PixiPagination
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    case 'colorField':
      return (
        <PixiColorField
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'colorSwatchPicker':
      return (
        <PixiColorSwatchPicker
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'group':
      return (
        <PixiGroup
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'slot':
      return (
        <PixiSlot
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    // 레이아웃 컨테이너 (Phase 11 B2.5)
    // Flex/Grid 컨테이너도 BoxSprite로 렌더링 (배경/테두리 표시)
    // 실제 레이아웃 계산은 BuilderCanvas에서 @pixi/layout으로 처리
    case 'flex':
    case 'grid':
      return <BoxSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />;

    // 기본 타입
    case 'text':
      return (
        <TextSprite
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      );

    case 'image':
      return <ImageSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />;

    case 'box':
    default:
      return <BoxSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />;
  }
});

export default ElementSprite;
