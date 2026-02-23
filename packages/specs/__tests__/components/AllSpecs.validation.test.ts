import { describe, it, expect } from 'vitest';
import { isValidTokenRef } from '../../src/types/token.types';
import type { ComponentSpec } from '../../src/types';

// Phase 1
import { ButtonSpec } from '../../src/components/Button.spec';
import { BadgeSpec } from '../../src/components/Badge.spec';
import { CardSpec } from '../../src/components/Card.spec';
import { DialogSpec } from '../../src/components/Dialog.spec';
import { LinkSpec } from '../../src/components/Link.spec';
import { PopoverSpec } from '../../src/components/Popover.spec';
import { SectionSpec } from '../../src/components/Section.spec';
import { SeparatorSpec } from '../../src/components/Separator.spec';
import { ToggleButtonSpec } from '../../src/components/ToggleButton.spec';
import { ToggleButtonGroupSpec } from '../../src/components/ToggleButtonGroup.spec';
import { TooltipSpec } from '../../src/components/Tooltip.spec';

// Phase 2: Form
import { TextFieldSpec } from '../../src/components/TextField.spec';
import { TextAreaSpec } from '../../src/components/TextArea.spec';
import { NumberFieldSpec } from '../../src/components/NumberField.spec';
import { SearchFieldSpec } from '../../src/components/SearchField.spec';
import { CheckboxSpec } from '../../src/components/Checkbox.spec';
import { CheckboxGroupSpec } from '../../src/components/CheckboxGroup.spec';
import { RadioSpec } from '../../src/components/Radio.spec';
import { SwitchSpec } from '../../src/components/Switch.spec';
import { FormSpec } from '../../src/components/Form.spec';
import { SelectSpec } from '../../src/components/Select.spec';
import { ComboBoxSpec } from '../../src/components/ComboBox.spec';
import { ListBoxSpec } from '../../src/components/ListBox.spec';
import { SliderSpec } from '../../src/components/Slider.spec';
import { MeterSpec } from '../../src/components/Meter.spec';
import { ProgressBarSpec } from '../../src/components/ProgressBar.spec';

// Phase 3: Composite
import { TableSpec } from '../../src/components/Table.spec';
import { TreeSpec } from '../../src/components/Tree.spec';
import { TabsSpec } from '../../src/components/Tabs.spec';
import { MenuSpec } from '../../src/components/Menu.spec';
import { BreadcrumbsSpec } from '../../src/components/Breadcrumbs.spec';
import { PaginationSpec } from '../../src/components/Pagination.spec';
import { TagGroupSpec } from '../../src/components/TagGroup.spec';
import { GridListSpec } from '../../src/components/GridList.spec';
import { DisclosureSpec } from '../../src/components/Disclosure.spec';
import { DisclosureGroupSpec } from '../../src/components/DisclosureGroup.spec';
import { ToolbarSpec } from '../../src/components/Toolbar.spec';
import { ToastSpec } from '../../src/components/Toast.spec';
import { PanelSpec } from '../../src/components/Panel.spec';
import { GroupSpec } from '../../src/components/Group.spec';
import { SlotSpec } from '../../src/components/Slot.spec';
import { SkeletonSpec } from '../../src/components/Skeleton.spec';
import { DropZoneSpec } from '../../src/components/DropZone.spec';
import { FileTriggerSpec } from '../../src/components/FileTrigger.spec';
import { ScrollBoxSpec } from '../../src/components/ScrollBox.spec';
import { MaskedFrameSpec } from '../../src/components/MaskedFrame.spec';

// Phase 4: Special
import { DatePickerSpec } from '../../src/components/DatePicker.spec';
import { DateRangePickerSpec } from '../../src/components/DateRangePicker.spec';
import { DateFieldSpec } from '../../src/components/DateField.spec';
import { TimeFieldSpec } from '../../src/components/TimeField.spec';
import { CalendarSpec } from '../../src/components/Calendar.spec';
import { ColorPickerSpec } from '../../src/components/ColorPicker.spec';
import { ColorFieldSpec } from '../../src/components/ColorField.spec';
import { ColorSliderSpec } from '../../src/components/ColorSlider.spec';
import { ColorAreaSpec } from '../../src/components/ColorArea.spec';
import { ColorWheelSpec } from '../../src/components/ColorWheel.spec';
import { ColorSwatchSpec } from '../../src/components/ColorSwatch.spec';
import { ColorSwatchPickerSpec } from '../../src/components/ColorSwatchPicker.spec';
import { ListSpec } from '../../src/components/List.spec';
import { InputSpec } from '../../src/components/Input.spec';
import { SwitcherSpec } from '../../src/components/Switcher.spec';

type SpecEntry = [string, ComponentSpec<Record<string, unknown>>];
const cast = (s: ComponentSpec<unknown>) => s as ComponentSpec<Record<string, unknown>>;

const allSpecs: SpecEntry[] = [
  // Phase 1
  ['Button', cast(ButtonSpec)],
  ['Badge', cast(BadgeSpec)],
  ['Card', cast(CardSpec)],
  ['Dialog', cast(DialogSpec)],
  ['Link', cast(LinkSpec)],
  ['Popover', cast(PopoverSpec)],
  ['Section', cast(SectionSpec)],
  ['Separator', cast(SeparatorSpec)],
  ['ToggleButton', cast(ToggleButtonSpec)],
  ['ToggleButtonGroup', cast(ToggleButtonGroupSpec)],
  ['Tooltip', cast(TooltipSpec)],
  // Phase 2: Form
  ['TextField', cast(TextFieldSpec)],
  ['TextArea', cast(TextAreaSpec)],
  ['NumberField', cast(NumberFieldSpec)],
  ['SearchField', cast(SearchFieldSpec)],
  ['Checkbox', cast(CheckboxSpec)],
  ['CheckboxGroup', cast(CheckboxGroupSpec)],
  ['Radio', cast(RadioSpec)],
  ['Switch', cast(SwitchSpec)],
  ['Form', cast(FormSpec)],
  ['Select', cast(SelectSpec)],
  ['ComboBox', cast(ComboBoxSpec)],
  ['ListBox', cast(ListBoxSpec)],
  ['Slider', cast(SliderSpec)],
  ['Meter', cast(MeterSpec)],
  ['ProgressBar', cast(ProgressBarSpec)],
  // Phase 3: Composite
  ['Table', cast(TableSpec)],
  ['Tree', cast(TreeSpec)],
  ['Tabs', cast(TabsSpec)],
  ['Menu', cast(MenuSpec)],
  ['Breadcrumbs', cast(BreadcrumbsSpec)],
  ['Pagination', cast(PaginationSpec)],
  ['TagGroup', cast(TagGroupSpec)],
  ['GridList', cast(GridListSpec)],
  ['Disclosure', cast(DisclosureSpec)],
  ['DisclosureGroup', cast(DisclosureGroupSpec)],
  ['Toolbar', cast(ToolbarSpec)],
  ['Toast', cast(ToastSpec)],
  ['Panel', cast(PanelSpec)],
  ['Group', cast(GroupSpec)],
  ['Slot', cast(SlotSpec)],
  ['Skeleton', cast(SkeletonSpec)],
  ['DropZone', cast(DropZoneSpec)],
  ['FileTrigger', cast(FileTriggerSpec)],
  ['ScrollBox', cast(ScrollBoxSpec)],
  ['MaskedFrame', cast(MaskedFrameSpec)],
  // Phase 4: Special
  ['DatePicker', cast(DatePickerSpec)],
  ['DateRangePicker', cast(DateRangePickerSpec)],
  ['DateField', cast(DateFieldSpec)],
  ['TimeField', cast(TimeFieldSpec)],
  ['Calendar', cast(CalendarSpec)],
  ['ColorPicker', cast(ColorPickerSpec)],
  ['ColorField', cast(ColorFieldSpec)],
  ['ColorSlider', cast(ColorSliderSpec)],
  ['ColorArea', cast(ColorAreaSpec)],
  ['ColorWheel', cast(ColorWheelSpec)],
  ['ColorSwatch', cast(ColorSwatchSpec)],
  ['ColorSwatchPicker', cast(ColorSwatchPickerSpec)],
  ['List', cast(ListSpec)],
  ['Input', cast(InputSpec)],
  ['Switcher', cast(SwitcherSpec)],
];

describe.each(allSpecs)('%s Spec 공통 검증', (name, spec) => {
  it('name 필드 비어있지 않음', () => {
    expect(spec.name).toBeTruthy();
    expect(spec.name.length).toBeGreaterThan(0);
  });

  it('element 필드 존재', () => {
    expect(spec.element).toBeDefined();
  });

  it('defaultVariant이 variants에 존재', () => {
    expect(spec.variants[spec.defaultVariant]).toBeDefined();
  });

  it('defaultSize가 sizes에 존재', () => {
    expect(spec.sizes[spec.defaultSize]).toBeDefined();
  });

  it('variants에 최소 1개 이상', () => {
    expect(Object.keys(spec.variants).length).toBeGreaterThanOrEqual(1);
  });

  it('sizes에 최소 1개 이상', () => {
    expect(Object.keys(spec.sizes).length).toBeGreaterThanOrEqual(1);
  });

  it('모든 variant의 필수 토큰 참조 유효', () => {
    Object.entries(spec.variants).forEach(([variantName, variant]) => {
      expect(isValidTokenRef(variant.background)).toBe(true);
      expect(isValidTokenRef(variant.backgroundHover)).toBe(true);
      expect(isValidTokenRef(variant.backgroundPressed)).toBe(true);
      expect(isValidTokenRef(variant.text)).toBe(true);
      if (variant.border) {
        expect(isValidTokenRef(variant.border)).toBe(true);
      }
    });
  });

  it('모든 size의 토큰 참조 유효', () => {
    Object.entries(spec.sizes).forEach(([sizeName, size]) => {
      expect(isValidTokenRef(size.fontSize)).toBe(true);
      expect(isValidTokenRef(size.borderRadius)).toBe(true);
    });
  });

  it('render.shapes가 함수', () => {
    expect(typeof spec.render.shapes).toBe('function');
  });

  it('render.shapes가 Shape[] 반환', () => {
    const defaultVariant = spec.variants[spec.defaultVariant];
    const defaultSize = spec.sizes[spec.defaultSize];
    const shapes = spec.render.shapes({}, defaultVariant, defaultSize, 'default');
    expect(Array.isArray(shapes)).toBe(true);
  });

  it('반환된 shapes의 type이 유효', () => {
    const defaultVariant = spec.variants[spec.defaultVariant];
    const defaultSize = spec.sizes[spec.defaultSize];
    const shapes = spec.render.shapes({}, defaultVariant, defaultSize, 'default');
    const validTypes = ['rect', 'roundRect', 'circle', 'text', 'shadow', 'border', 'container', 'gradient', 'image', 'line'];
    for (const shape of shapes) {
      expect(validTypes).toContain(shape.type);
    }
  });
});
