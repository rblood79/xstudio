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
import { memo, useMemo, useContext } from 'react';
import type { Element } from '../../../../types/core/store.types';
// 🚀 Phase 7: registry 등록은 LayoutContainer에서 처리
// import { registerElement, unregisterElement } from '../elementRegistry';
import { useSkiaNode } from '../skia/useSkiaNode';
import { LayoutComputedSizeContext } from '../layoutContext';
import { convertStyle, cssColorToHex, parseCSSSize, type CSSStyle } from './styleConverter';
import { isFillV2Enabled } from '../../../../utils/featureFlags';
import { fillsToSkiaFillStyle } from '../../../panels/styles/utils/fillToSkia';
import type { FillStyle } from '../skia/types';
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
import { useShallow } from 'zustand/react/shallow';
import { useResolvedElement } from './useResolvedElement';
import { isFlexContainer, isGridContainer } from '../layout';
import { measureWrappedTextHeight } from '../utils/textMeasure';

// ============================================
// Constants
// ============================================

/**
 * UI 컴포넌트 size별 기본 borderRadius (ButtonSpec radius 토큰 기준)
 * xs/sm → radius.sm(4), md → radius.md(6), lg/xl → radius.lg(8)
 * @see packages/specs/src/primitives/radius.ts
 * @see packages/specs/src/components/Button.spec.ts sizes
 */
const UI_COMPONENT_DEFAULT_BORDER_RADIUS: Record<string, number> = {
  xs: 4,  // radius.sm
  sm: 4,  // radius.sm
  md: 6,  // radius.md
  lg: 8,  // radius.lg
  xl: 8,  // radius.lg
};

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
  /** 🚀 Phase 10: Container 타입 컴포넌트의 children 요소들 */
  childElements?: Element[];
  /** 🚀 Phase 10: children 요소 렌더링 함수 */
  renderChildElement?: (element: Element) => React.ReactNode;
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
  childElements,
  renderChildElement,
}: ElementSpriteProps) {
  useExtend(PIXI_COMPONENTS);

  // 🚀 Phase 7: registry 등록은 LayoutContainer에서 처리
  // layout이 적용된 Container를 등록해야 SelectionBox 위치가 일치함
  const elementId = element.id;

  // 🚀 성능 최적화: 각 ElementSprite가 자신의 선택 상태만 구독
  // 기존: ElementsLayer가 selectedElementIds 구독 → 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 여부만 구독 → 변경된 요소만 리렌더 O(2)
  // selector가 boolean을 반환하므로 값이 변경될 때만 리렌더 트리거
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

  // 🚀 ToggleButtonGroup 내 ToggleButton의 위치 정보 (borderRadius 계산용)
  // CSS에서는 그룹 내 첫/끝 버튼만 외곽 모서리에 borderRadius 적용
  // useShallow로 shallow comparison 적용하여 무한 루프 방지
  const toggleGroupPosition = useStore(
    useShallow((state) => {
      if (element.tag !== 'ToggleButton' || !element.parent_id) return null;
      const parent = state.elementsMap.get(element.parent_id);
      if (!parent || parent.tag !== 'ToggleButtonGroup') return null;

      const siblings = (state.childrenMap.get(parent.id) || [])
        .slice()
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      const index = siblings.findIndex(s => s.id === element.id);
      if (index === -1) return null;

      const orientation = ((parent.props as Record<string, unknown>)?.orientation as string) || 'horizontal';
      return {
        orientation,
        isFirst: index === 0,
        isLast: index === siblings.length - 1,
        isOnly: siblings.length === 1,
      };
    })
  );

  // layoutPosition이 있으면 style을 오버라이드한 새 element 생성
  // G.1/G.2: Instance resolution + Variable resolution
  const resolvedElement = useResolvedElement(element);

  // 🚀 LayoutContainer의 Yoga 계산된 pixel 크기 수신
  // 퍼센트 기반 width/height를 실제 pixel 값으로 해석하는 데 사용
  const computedContainerSize = useContext(LayoutComputedSizeContext);

  const effectiveElement = useMemo(() => {
    if (layoutPosition) {
      const currentStyle = (resolvedElement.props?.style || {}) as Record<string, unknown>;
      return {
        ...resolvedElement,
        props: {
          ...resolvedElement.props,
          style: {
            ...currentStyle,
            left: layoutPosition.x,
            top: layoutPosition.y,
            width: layoutPosition.width,
            height: layoutPosition.height,
          },
        },
      };
    }

    // 🚀 퍼센트 기반 width/height를 Yoga 계산 결과로 해석
    // LayoutContainer가 Yoga를 통해 계산한 실제 pixel 크기를 사용하여
    // '100%' 같은 퍼센트 값을 실제 pixel 값으로 변환
    // (parseCSSSize는 parentSize 없이는 %를 해석할 수 없음)
    if (computedContainerSize) {
      const currentStyle = (resolvedElement.props?.style || {}) as Record<string, unknown>;
      const w = currentStyle.width;
      const h = currentStyle.height;
      const hasPercentWidth = typeof w === 'string' && w.endsWith('%');
      const hasPercentHeight = typeof h === 'string' && h.endsWith('%');

      if (hasPercentWidth || hasPercentHeight) {
        return {
          ...resolvedElement,
          props: {
            ...resolvedElement.props,
            style: {
              ...currentStyle,
              ...(hasPercentWidth ? { width: (parseFloat(w as string) / 100) * computedContainerSize.width } : {}),
              ...(hasPercentHeight ? { height: (parseFloat(h as string) / 100) * computedContainerSize.height } : {}),
            },
          },
        };
      }
    }

    return resolvedElement;
  }, [resolvedElement, layoutPosition, computedContainerSize]);

  const spriteType = getSpriteType(effectiveElement);

  // CheckboxGroup의 자식 Checkbox인지 확인
  const isCheckboxInGroup = spriteType === 'checkboxItem' && parentElement?.tag === 'CheckboxGroup';

  // 🚀 Tabs 자식 요소 처리:
  // - Tab 요소는 PixiTabs에서 직접 렌더링하므로 여기서 skip
  // - Panel(TabPanel) 요소도 PixiTabs에서 렌더링하므로 skip
  // - Panel의 자손 요소들은 ElementsLayer에서 렌더링됨 (layoutPosition 사용)
  const isTabsChild = parentElement?.tag === 'Tabs';
  const isTabElement = element.tag === 'Tab';
  const isPanelInTabs = element.tag === 'Panel' && isTabsChild;

  // Tab 요소는 PixiTabs에서 렌더링하므로 skip
  if (isTabElement && isTabsChild) {
    return null;
  }

  // Panel(TabPanel) 요소도 PixiTabs에서 렌더링하므로 skip
  if (isPanelInTabs) {
    return null;
  }

  // 🚀 Breadcrumbs 자식 요소 처리:
  // - Breadcrumb 요소는 PixiBreadcrumbs에서 직접 렌더링하므로 skip
  const isBreadcrumbsChild = parentElement?.tag === 'Breadcrumbs';
  const isBreadcrumbElement = element.tag === 'Breadcrumb';

  if (isBreadcrumbElement && isBreadcrumbsChild) {
    return null;
  }

  // 🚀 Panel의 자손 요소들은 ElementsLayer에서 layoutPosition과 함께 렌더링됨
  // selectionBox와 렌더링 위치가 일치하도록 함

  // 🚀 Phase 1: 스프라이트 콘텐츠를 변수에 저장하여 pixiContainer로 감싸기
  const content = (() => {
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
          childElements={childElements}
          renderChildElement={renderChildElement}
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
          childElements={childElements}
          renderChildElement={renderChildElement}
        />
      );

    case 'panel':
      return (
        <PixiPanel
          element={effectiveElement}
          isSelected={isSelected}
          onClick={onClick}
          childElements={childElements}
          renderChildElement={renderChildElement}
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
      if (childElements && childElements.length > 0 && renderChildElement) {
        return (
          <>
            <pixiContainer layout={{ position: 'absolute' as const, left: 0, top: 0 }}>
              <BoxSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />
            </pixiContainer>
            {childElements.map((childEl) => renderChildElement(childEl))}
          </>
        );
      }
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
      if (childElements && childElements.length > 0 && renderChildElement) {
        return (
          <>
            <pixiContainer layout={{ position: 'absolute' as const, left: 0, top: 0 }}>
              <BoxSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />
            </pixiContainer>
            {childElements.map((childEl) => renderChildElement(childEl))}
          </>
        );
      }
      return <BoxSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />;
    }
  })();

  // Phase 5: Skia 렌더 데이터 등록 (모든 요소 타입 공통)
  // React useLayoutEffect는 자식→부모 순서로 실행되므로,
  // 개별 Sprite(BoxSprite 등)의 useSkiaNode가 먼저 실행되고
  // 이 부모(ElementSprite)의 useSkiaNode가 마지막에 실행되어 레지스트리를 덮어쓴다.
  // 따라서 gradient fill 등 고급 fill 데이터는 이 레벨에서도 포함해야 한다.
  // UI 컴포넌트(FancyButton 등)는 이 등록이 유일한 Skia 데이터 소스이다.

  // 🚀 Style 변경 감지를 위해 useMemo 외부에서 참조 추출
  // effectiveElement 참조가 같아도 style/props가 다르면 skiaNodeData 재계산
  const elementStyle = effectiveElement.props?.style;
  const elementProps = effectiveElement.props;

  // 🚀 Yoga 계산된 크기를 skiaNodeData에 반영
  // convertStyle의 폴백(100)이 아닌 실제 Yoga 레이아웃 결과를 사용
  const computedW = computedContainerSize?.width;
  const computedH = computedContainerSize?.height;

  const skiaNodeData = useMemo(() => {
    const style = elementStyle as CSSStyle | undefined;

    // UI 컴포넌트는 자체 색상 시스템(variant 등)을 사용하므로
    // CSS style에 backgroundColor가 없어도 가시적으로 렌더링해야 한다.
    // 일반 컨테이너(box, flex, grid)는 backgroundColor 없으면 투명 처리 (CSS 기본 동작)
    const isUIComponent = spriteType !== 'box' && spriteType !== 'text'
      && spriteType !== 'image' && spriteType !== 'flex' && spriteType !== 'grid';

    // style이 없는 일반 요소는 투명 컨테이너이므로 Skia 등록 불필요
    // UI 컴포넌트는 style 없이도 variant 기반 렌더링 필요
    if (!style && !isUIComponent) return null;

    const { transform, fill, stroke, borderRadius: convertedBorderRadius } = convertStyle(style);
    const br = typeof convertedBorderRadius === 'number'
      ? convertedBorderRadius
      : convertedBorderRadius?.[0] ?? 0;

    // 🚀 Yoga 계산 크기 우선 사용 (convertStyle 폴백 100 대신)
    // Card/Panel 등 auto-height 컴포넌트에서 Skia box 크기가 실제 콘텐츠와 일치하도록 보장
    const finalWidth = (computedW != null && computedW > 0) ? computedW : transform.width;
    const finalHeight = (computedH != null && computedH > 0) ? computedH : transform.height;

    // backgroundColor 유무 확인 (style이 undefined일 수 있으므로 optional chaining)
    const hasBgColor = style?.backgroundColor !== undefined && style?.backgroundColor !== null && style?.backgroundColor !== '';

    // UI 컴포넌트 variant별 배경/테두리 색상 매핑 (Light 모드, ButtonSpec 토큰 기반)
    // variant별 배경 색상
    const VARIANT_BG_COLORS: Record<string, number> = {
      default: 0xece6f0,   // surface-container-high
      primary: 0x6750a4,   // primary
      secondary: 0x625b71, // secondary
      tertiary: 0x7d5260,  // tertiary
      error: 0xb3261e,     // error
      surface: 0xe6e0e9,   // surface-container-highest
      outline: 0xfef7ff,   // surface (투명 — bgAlpha=0)
      ghost: 0xfef7ff,     // surface (투명 — bgAlpha=0)
    };
    // outline/ghost variant는 배경이 투명
    const VARIANT_BG_ALPHA: Record<string, number> = {
      outline: 0,
      ghost: 0,
    };
    // variant별 테두리 색상 (ghost는 테두리 없음)
    const VARIANT_BORDER_COLORS: Record<string, number> = {
      default: 0xcac4d0,   // outline-variant
      primary: 0x6750a4,   // primary
      secondary: 0x625b71, // secondary
      tertiary: 0x7d5260,  // tertiary
      error: 0xb3261e,     // error
      surface: 0xcac4d0,   // outline-variant
      outline: 0x79747e,   // outline
    };

    const props = effectiveElement.props as Record<string, unknown> | undefined;
    const variant = isUIComponent ? String(props?.variant || 'default') : '';

    let r: number, g: number, b: number;
    let effectiveAlpha: number;

    if (isUIComponent && !hasBgColor) {
      // variant 기반 배경 색상 적용
      const bgColor = VARIANT_BG_COLORS[variant] ?? 0xece6f0;
      r = ((bgColor >> 16) & 0xff) / 255;
      g = ((bgColor >> 8) & 0xff) / 255;
      b = (bgColor & 0xff) / 255;
      effectiveAlpha = VARIANT_BG_ALPHA[variant] ?? 1;
    } else {
      r = ((fill.color >> 16) & 0xff) / 255;
      g = ((fill.color >> 8) & 0xff) / 255;
      b = (fill.color & 0xff) / 255;
      effectiveAlpha = hasBgColor ? fill.alpha : (isUIComponent ? fill.alpha : 0);
    }

    // UI 컴포넌트 기본 borderRadius: CSS에서 지정하지 않았으면 Spec size별 토큰 값 적용
    // xs/sm=4px(radius.sm), md=6px(radius.md), lg/xl=8px(radius.lg)
    // 명시적으로 0을 설정한 경우(style.borderRadius가 존재)와 미설정(undefined)을 구분
    const hasBorderRadiusSet = style?.borderRadius !== undefined && style?.borderRadius !== null && style?.borderRadius !== '';
    const size = isUIComponent ? String(props?.size || 'md') : '';
    const defaultBorderRadius = UI_COMPONENT_DEFAULT_BORDER_RADIUS[size] ?? 6;
    let effectiveBorderRadius: number | [number, number, number, number] = hasBorderRadiusSet ? br : (isUIComponent && !hasBgColor ? defaultBorderRadius : 0);

    // 🚀 ToggleButtonGroup 내 ToggleButton: 위치에 따른 borderRadius 배열 적용
    // CSS 규칙: 첫 버튼=외곽 모서리만, 중간=없음, 끝 버튼=외곽 모서리만
    if (toggleGroupPosition && typeof effectiveBorderRadius === 'number') {
      const { orientation, isFirst, isLast, isOnly } = toggleGroupPosition;
      const r = effectiveBorderRadius;

      if (!isOnly) {
        if (orientation === 'horizontal') {
          if (isFirst) {
            effectiveBorderRadius = [r, 0, 0, r]; // 왼쪽만
          } else if (isLast) {
            effectiveBorderRadius = [0, r, r, 0]; // 오른쪽만
          } else {
            effectiveBorderRadius = [0, 0, 0, 0]; // 중간: 없음
          }
        } else {
          // vertical
          if (isFirst) {
            effectiveBorderRadius = [r, r, 0, 0]; // 위쪽만
          } else if (isLast) {
            effectiveBorderRadius = [0, 0, r, r]; // 아래쪽만
          } else {
            effectiveBorderRadius = [0, 0, 0, 0]; // 중간: 없음
          }
        }
      }
    }

    const boxData: {
      fillColor: Float32Array;
      fill?: FillStyle;
      borderRadius: number | [number, number, number, number];
      strokeColor?: Float32Array;
      strokeWidth?: number;
    } = {
      fillColor: Float32Array.of(r, g, b, effectiveAlpha),
      borderRadius: effectiveBorderRadius,
    };

    // Fill V2: gradient/image fill 지원 (BoxSprite의 useSkiaNode과 동일 데이터 보장)
    const fills = effectiveElement.fills;
    if (isFillV2Enabled() && fills && fills.length > 0) {
      const fillV2Style = fillsToSkiaFillStyle(fills, finalWidth, finalHeight);
      if (fillV2Style && fillV2Style.type !== 'color') {
        boxData.fill = fillV2Style;
      }
    }

    // stroke (border) 데이터 포함
    if (stroke) {
      const sr = ((stroke.color >> 16) & 0xff) / 255;
      const sg = ((stroke.color >> 8) & 0xff) / 255;
      const sb = (stroke.color & 0xff) / 255;
      boxData.strokeColor = Float32Array.of(sr, sg, sb, stroke.alpha);
      boxData.strokeWidth = stroke.width;
    } else if (isUIComponent && !hasBgColor) {
      // variant 기반 테두리 색상 적용
      const borderColor = VARIANT_BORDER_COLORS[variant];
      if (borderColor !== undefined) {
        const sr = ((borderColor >> 16) & 0xff) / 255;
        const sg = ((borderColor >> 8) & 0xff) / 255;
        const sb = (borderColor & 0xff) / 255;
        boxData.strokeColor = Float32Array.of(sr, sg, sb, 1);
        boxData.strokeWidth = 1;
      }
      // ghost: 테두리 없음 (VARIANT_BORDER_COLORS에 미정의)
    }

    // UI 컴포넌트: props.children/text/label에서 텍스트를 추출하여
    // Skia text children으로 추가한다.
    // skia 모드에서 PixiJS 캔버스가 숨겨지므로 텍스트를 Skia로 렌더링해야 한다.
    let textChildren: Array<{
      type: 'text';
      x: number;
      y: number;
      width: number;
      height: number;
      visible: boolean;
      text: {
        content: string;
        fontFamilies: string[];
        fontSize: number;
        fontWeight?: number;
        color: Float32Array;
        letterSpacing?: number;
        lineHeight?: number;
        align?: 'left' | 'center' | 'right';
        paddingLeft: number;
        paddingTop: number;
        maxWidth: number;
        autoCenter?: boolean;
      };
    }> | undefined;

    // Card 콘텐츠 기반 최소 높이 (Yoga가 계산하지 못한 경우의 폴백)
    let cardCalculatedHeight: number | undefined;

    if (isUIComponent) {
      const tag = effectiveElement.tag;

      // 텍스트 색상 공통 상수
      const VARIANT_TEXT_COLORS: Record<string, number> = {
        default: 0x1d1b20,
        primary: 0xffffff,
        secondary: 0xffffff,
        surface: 0x1d1b20,
        outline: 0x6750a4,
        ghost: 0x6750a4,
        tertiary: 0xffffff,
        error: 0xffffff,
      };

      // Card 컴포넌트: title/heading, subheading, description 다중 텍스트
      if (tag === 'Card') {
        const cardTitle = String(props?.heading || props?.title || '');
        const cardSubheading = String(props?.subheading || '');
        const cardDescription = String(props?.description || props?.children || '');

        if (cardTitle || cardSubheading || cardDescription) {
          const defaultTextColor = VARIANT_TEXT_COLORS[variant] ?? 0x1d1b20;
          const textColorHex = style?.color
            ? cssColorToHex(style.color, defaultTextColor)
            : defaultTextColor;
          const tcR = ((textColorHex >> 16) & 0xff) / 255;
          const tcG = ((textColorHex >> 8) & 0xff) / 255;
          const tcB = (textColorHex & 0xff) / 255;
          const textColor = Float32Array.of(tcR, tcG, tcB, 1);

          // Card padding (style.padding 우선, 없으면 size preset 사용)
          const cardSize = String(props?.size || 'md');
          const CARD_PADDING: Record<string, number> = { sm: 8, md: 12, lg: 16 };
          const sizePresetPadding = CARD_PADDING[cardSize] ?? 12;
          // style.padding이 설정되면 해당 값 사용
          const padding = style?.padding !== undefined
            ? (typeof style.padding === 'number' ? style.padding : parseInt(String(style.padding), 10) || 0)
            : sizePresetPadding;
          const fontFamilies = ['Pretendard', 'Inter', 'system-ui', 'sans-serif'];
          const maxWidth = finalWidth - padding * 2;

          const nodes: typeof textChildren = [];
          let currentY = padding;

          const fontFamilyStr = fontFamilies[0] ?? 'sans-serif';

          // Title (heading || title)
          if (cardTitle) {
            const titleFontSize = 16;
            const titleHeight = measureWrappedTextHeight(
              cardTitle, titleFontSize, 600, fontFamilyStr, maxWidth,
            );
            nodes.push({
              type: 'text' as const,
              x: 0, y: 0,
              width: finalWidth,
              height: finalHeight,
              visible: true,
              text: {
                content: cardTitle,
                fontFamilies,
                fontSize: titleFontSize,
                fontWeight: 600,
                color: textColor,
                align: 'left' as const,
                paddingLeft: padding,
                paddingTop: currentY,
                maxWidth,
                autoCenter: false,
              },
            });
            currentY += titleHeight;
          }

          // Subheading
          if (cardSubheading) {
            if (cardTitle) currentY += 2; // header gap (PixiCard headerLayout.gap)
            const subFontSize = 14;
            const subHeight = measureWrappedTextHeight(
              cardSubheading, subFontSize, 400, fontFamilyStr, maxWidth,
            );
            nodes.push({
              type: 'text' as const,
              x: 0, y: 0,
              width: finalWidth,
              height: finalHeight,
              visible: true,
              text: {
                content: cardSubheading,
                fontFamilies,
                fontSize: subFontSize,
                color: textColor,
                align: 'left' as const,
                paddingLeft: padding,
                paddingTop: currentY,
                maxWidth,
                autoCenter: false,
              },
            });
            currentY += subHeight;
          }

          // header → content gap (PixiCard headerLayout.marginBottom = 8)
          if (cardTitle || cardSubheading) {
            currentY += 8;
          }

          // Description (description || children)
          if (cardDescription) {
            const descFontSize = 14;
            const descHeight = measureWrappedTextHeight(
              cardDescription, descFontSize, 400, fontFamilyStr, maxWidth,
            );
            nodes.push({
              type: 'text' as const,
              x: 0, y: 0,
              width: finalWidth,
              height: finalHeight,
              visible: true,
              text: {
                content: cardDescription,
                fontFamilies,
                fontSize: descFontSize,
                color: textColor,
                align: 'left' as const,
                paddingLeft: padding,
                paddingTop: currentY,
                maxWidth,
                autoCenter: false,
              },
            });
            currentY += descHeight;
          }

          // 콘텐츠 기반 높이 = 모든 텍스트 위치 + 하단 패딩
          cardCalculatedHeight = currentY + padding;
          textChildren = nodes;
        }
      } else {
        // 기존 단일 텍스트 추출 (Button, Badge, Input 등)
        // 텍스트 추출 우선순위: children > text > label > value > placeholder > count
        const textContent = String(
          props?.children
          || props?.text
          || props?.label
          || props?.value
          || props?.placeholder
          || props?.count
          || ''
        );
        if (textContent) {
          const defaultTextColor = VARIANT_TEXT_COLORS[variant] ?? 0x1d1b20;

          // placeholder 텍스트는 연한 색상 사용
          const isPlaceholder = !props?.children && !props?.text && !props?.label
            && !props?.value && !!props?.placeholder;
          const placeholderColor = 0x9ca3af; // Tailwind gray-400
          const baseTextColor = isPlaceholder ? placeholderColor : defaultTextColor;
          const textColorHex = style?.color
            ? cssColorToHex(style.color, baseTextColor)
            : baseTextColor;
          const tcR = ((textColorHex >> 16) & 0xff) / 255;
          const tcG = ((textColorHex >> 8) & 0xff) / 255;
          const tcB = (textColorHex & 0xff) / 255;

          // 폰트 크기: style.fontSize > size 프리셋
          // size별 기본 fontSize: xs=12, sm=14, md=16, lg=18, xl=20
          const size = String(props?.size || 'sm');
          const SIZE_FONT: Record<string, number> = {
            xs: 12, sm: 14, md: 16, lg: 18, xl: 20,
          };
          const defaultFontSize = SIZE_FONT[size] ?? 14;
          const fontSize = style?.fontSize !== undefined
            ? parseCSSSize(style.fontSize, undefined, defaultFontSize)
            : defaultFontSize;

          // 컴포넌트 타입별 정렬: Button/Badge = center, Input/Checkbox 등 = left
          const CENTER_ALIGN_TAGS = new Set([
            'Button', 'SubmitButton', 'FancyButton',
            'Badge', 'Tag', 'Chip',
            'ToggleButton',
          ]);
          const textAlign = CENTER_ALIGN_TAGS.has(tag) ? 'center' as const : 'left' as const;

          // Input 계열은 좌측 패딩 적용
          const INPUT_TAGS = new Set([
            'Input', 'TextField', 'TextInput', 'SearchField',
            'TextArea', 'Textarea', 'NumberField', 'ComboBox',
            'Select', 'Dropdown', 'DateField', 'TimeField', 'ColorField',
          ]);
          const paddingLeft = INPUT_TAGS.has(tag) ? 8 : 0;

          // 수직 중앙 정렬: paddingTop 근사 계산
          const lineHeight = fontSize * 1.2;
          const paddingTop = Math.max(0, (finalHeight - lineHeight) / 2);

          textChildren = [{
            type: 'text' as const,
            x: 0,
            y: 0,
            width: finalWidth,
            height: finalHeight,
            visible: true,
            text: {
              content: textContent,
              fontFamilies: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
              fontSize,
              color: Float32Array.of(tcR, tcG, tcB, 1),
              align: textAlign,
              paddingLeft,
              paddingTop,
              maxWidth: finalWidth - paddingLeft * 2,
            },
          }];
        }
      }
    }

    // 🚀 Card 등 auto-height UI 컴포넌트: 콘텐츠 기반 최소 높이
    // Yoga가 텍스트 bounds를 아직 반영하지 못한 경우(minHeight 폴백),
    // SkiaOverlay에서 contentMinHeight를 최소값으로 적용하여
    // yogaH가 콘텐츠보다 작은 경우를 보정
    const contentMinHeight = cardCalculatedHeight;

    return {
      type: 'box' as const,
      x: transform.x,
      y: transform.y,
      width: finalWidth,
      height: finalHeight,
      visible: true,
      box: boxData,
      children: textChildren,
      contentMinHeight,
    };
  }, [effectiveElement, spriteType, elementStyle, elementProps, computedW, computedH, toggleGroupPosition]);

  useSkiaNode(elementId, skiaNodeData);

  return content;
});

export default ElementSprite;
