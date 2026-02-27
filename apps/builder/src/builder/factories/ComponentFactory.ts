import { Element } from "../../types/core/store.types";
import {
  ComponentCreationResult,
  ComponentCreationContext,
  ComponentCreator,
  ComponentDefinition,
} from "./types";
import {
  createElementsFromDefinition,
  addElementsToStore,
} from "./utils/elementCreation";
import { saveElementsInBackground } from "./utils/dbPersistence";
import { ElementUtils } from "../../utils/element/elementUtils";
import { useDataStore } from "../stores/data";
import type { DataField } from "../../types/builder/data.types";

// 컴포넌트 정의 임포트
import {
  createTextFieldDefinition,
  createTextAreaDefinition,
  createFormDefinition,
  createToastDefinition,
  createToolbarDefinition,
  createNumberFieldDefinition,
  createSearchFieldDefinition,
  createSliderDefinition,
} from "./definitions/FormComponents";
import {
  createSelectDefinition,
  createComboBoxDefinition,
  createListBoxDefinition,
  createGridListDefinition,
  createListDefinition,
} from "./definitions/SelectionComponents";
import {
  createGroupDefinition,
  createToggleButtonGroupDefinition,
  createSwitcherDefinition,
  createCheckboxGroupDefinition,
  createRadioGroupDefinition,
  createCheckboxDefinition,
  createRadioDefinition,
  createSwitchDefinition,
  createTagGroupDefinition,
  createBreadcrumbsDefinition,
} from "./definitions/GroupComponents";
import {
  createCardDefinition,
  createTabsDefinition,
  createTreeDefinition,
} from "./definitions/LayoutComponents";
import {
  createDialogDefinition,
  createPopoverDefinition,
  createTooltipDefinition,
} from "./definitions/OverlayComponents";
import {
  createMenuDefinition,
  createPaginationDefinition,
  createDisclosureDefinition,
  createDisclosureGroupDefinition,
} from "./definitions/NavigationComponents";
import {
  createTable,
  createColumnGroup,
} from "./definitions/TableComponents";
import {
  createDataTableDefinition,
  createSlotDefinition,
} from "./definitions/DataComponents";
import {
  createDatePickerDefinition,
  createDateRangePickerDefinition,
  createCalendarDefinition,
  createColorPickerDefinition,
  createDateFieldDefinition,
  createTimeFieldDefinition,
  createColorFieldDefinition,
  createColorSwatchPickerDefinition,
} from "./definitions/DateColorComponents";

/**
 * 통합 컴포넌트 팩토리
 * - 모든 복합 컴포넌트 생성을 관리
 * - 공통 로직 추출로 중복 코드 제거
 */
export class ComponentFactory {
  /**
   * 컴포넌트 생성자 맵
   */
  private static creators: Record<string, ComponentCreator> = {
    TextField: ComponentFactory.createTextField,
    TextArea: ComponentFactory.createTextArea,
    // ⭐ Form Components
    Form: ComponentFactory.createForm,
    Toast: ComponentFactory.createToast,
    Toolbar: ComponentFactory.createToolbar,
    NumberField: ComponentFactory.createNumberField,
    SearchField: ComponentFactory.createSearchField,
    Group: ComponentFactory.createGroup,
    ToggleButtonGroup: ComponentFactory.createToggleButtonGroup,
    Switcher: ComponentFactory.createSwitcher,
    CheckboxGroup: ComponentFactory.createCheckboxGroup,
    RadioGroup: ComponentFactory.createRadioGroup,
    Checkbox: ComponentFactory.createCheckbox,
    Radio: ComponentFactory.createRadio,
    Switch: ComponentFactory.createSwitch,
    Select: ComponentFactory.createSelect,
    ComboBox: ComponentFactory.createComboBox,
    Slider: ComponentFactory.createSlider,
    Card: ComponentFactory.createCard,
    Tabs: ComponentFactory.createTabs,
    Tree: ComponentFactory.createTree,
    TagGroup: ComponentFactory.createTagGroup,
    Breadcrumbs: ComponentFactory.createBreadcrumbs,
    ListBox: ComponentFactory.createListBox,
    GridList: ComponentFactory.createGridList,
    List: ComponentFactory.createList,
    Table: ComponentFactory.createTable,
    // ⭐ Navigation Components
    Menu: ComponentFactory.createMenu,
    Pagination: ComponentFactory.createPagination,
    Disclosure: ComponentFactory.createDisclosure,
    DisclosureGroup: ComponentFactory.createDisclosureGroup,
    // ⭐ Overlay Components
    Dialog: ComponentFactory.createDialog,
    Popover: ComponentFactory.createPopover,
    Tooltip: ComponentFactory.createTooltip,
    // ⭐ Data Components
    DataTable: ComponentFactory.createDataTable,
    Slot: ComponentFactory.createSlot,
    // ⭐ Date & Color Components
    DatePicker: ComponentFactory.createDatePicker,
    DateRangePicker: ComponentFactory.createDateRangePicker,
    Calendar: ComponentFactory.createCalendar,
    ColorPicker: ComponentFactory.createColorPicker,
    DateField: ComponentFactory.createDateField,
    TimeField: ComponentFactory.createTimeField,
    ColorField: ComponentFactory.createColorField,
    ColorSwatchPicker: ComponentFactory.createColorSwatchPicker,
  };

  /**
   * 복합 컴포넌트 생성 (메인 메서드)
   * @param layoutId - Layout 모드에서 요소 생성 시 사용 (page_id 대신 layout_id 설정)
   */
  static async createComplexComponent(
    tag: string,
    parentElement: Element | null,
    pageId: string,
    elements: Element[],
    layoutId?: string | null
  ): Promise<ComponentCreationResult> {
    const creator = this.creators[tag];
    if (!creator) {
      throw new Error(`No creator found for component type: ${tag}`);
    }

    const context: ComponentCreationContext = {
      parentElement,
      pageId,
      elements,
      layoutId, // ⭐ Layout/Slot System
    };

    return await creator.call(this, context);
  }

  /**
   * 공통 컴포넌트 생성 로직
   * ⭐ Layout/Slot System: layoutId 우선, 없으면 pageId 사용
   */
  private static async createComponent(
    definitionCreator: (context: ComponentCreationContext) => ComponentDefinition,
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    const { parentElement, pageId, elements, layoutId } = context;
    let parentId = parentElement?.id || null;

    // parent_id가 없으면 body 요소를 parent로 설정
    // ⭐ Layout/Slot System: layoutId 우선, 없으면 pageId 사용
    if (!parentId) {
      parentId = ElementUtils.findBodyByContext(elements, pageId || null, layoutId || null);
      // body element를 찾아서 context 업데이트
      const bodyElement = elements.find(el => el.id === parentId);
      if (bodyElement) {
        context = { ...context, parentElement: bodyElement };
      }
    }

    // 1. 컴포넌트 정의 생성
    const definition = definitionCreator(context);

    // 2. Element 데이터 생성
    const { parent, children } = createElementsFromDefinition(definition);

    // 3. 스토어에 추가 (즉시 UI 업데이트)
    addElementsToStore(parent, children);

    // 4. DB에 저장 (백그라운드)
    // ⭐ Layout/Slot System: layoutId 전달
    saveElementsInBackground(parent, children, parentId, pageId, layoutId);

    return {
      parent,
      children,
      allElements: [parent, ...children],
    };
  }

  // ==================== 각 컴포넌트 생성 메서드 ====================

  private static async createTextField(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTextFieldDefinition, context);
  }

  private static async createTextArea(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTextAreaDefinition, context);
  }

  // ==================== Form Components ====================

  private static async createForm(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createFormDefinition, context);
  }

  private static async createToast(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createToastDefinition, context);
  }

  private static async createToolbar(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createToolbarDefinition, context);
  }

  private static async createNumberField(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createNumberFieldDefinition, context);
  }

  private static async createSearchField(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createSearchFieldDefinition, context);
  }

  private static async createGroup(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createGroupDefinition, context);
  }

  private static async createToggleButtonGroup(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createToggleButtonGroupDefinition, context);
  }

  private static async createSwitcher(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createSwitcherDefinition, context);
  }

  private static async createCheckboxGroup(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createCheckboxGroupDefinition, context);
  }

  private static async createRadioGroup(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createRadioGroupDefinition, context);
  }

  private static async createCheckbox(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createCheckboxDefinition, context);
  }

  private static async createRadio(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createRadioDefinition, context);
  }

  private static async createSwitch(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createSwitchDefinition, context);
  }

  private static async createSelect(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createSelectDefinition, context);
  }

  private static async createComboBox(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createComboBoxDefinition, context);
  }

  private static async createSlider(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createSliderDefinition, context);
  }

  private static async createCard(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createCardDefinition, context);
  }

  private static async createTabs(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTabsDefinition, context);
  }

  private static async createTree(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTreeDefinition, context);
  }

  private static async createTagGroup(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTagGroupDefinition, context);
  }

  private static async createBreadcrumbs(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createBreadcrumbsDefinition, context);
  }

  /**
   * ListBox 컴포넌트 생성 (DataTable 자동 생성 포함)
   *
   * ListBox 추가 시 dataset 패널에 DataTable을 자동 등록하고
   * ListBox의 dataBinding을 자동 설정하여 child item에 데이터가 연결됨
   */
  private static async createListBox(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    // 1. DataTable 자동 생성
    const dataTableName = await this.createAutoDataTable();

    // 2. ListBox 생성 (dataTableName 전달)
    const definitionCreator = (ctx: ComponentCreationContext): ComponentDefinition =>
      createListBoxDefinition(ctx, dataTableName);

    return this.createComponent(definitionCreator, context);
  }

  /**
   * ListBox용 DataTable 자동 생성
   * 기본 샘플 데이터와 스키마를 포함한 DataTable을 data store에 등록
   */
  private static async createAutoDataTable(): Promise<string> {
    const dataStore = useDataStore.getState();
    const projectId = dataStore.currentProjectId || 'local';

    // 고유 이름 생성 (기존 DataTable과 충돌 방지)
    const existingNames = new Set(
      Array.from(dataStore.dataTables.keys())
    );
    let tableName = 'ListBoxData';
    let counter = 1;
    while (existingNames.has(tableName)) {
      tableName = `ListBoxData_${counter++}`;
    }

    // 기본 스키마 + 샘플 데이터 생성
    const schema: DataField[] = [
      { key: 'id', type: 'number', label: 'ID' },
      { key: 'label', type: 'string', label: 'Label' },
      { key: 'value', type: 'string', label: 'Value' },
      { key: 'description', type: 'string', label: 'Description' },
    ];

    const mockData = [
      { id: 1, label: 'Item 1', value: 'item1', description: 'First item' },
      { id: 2, label: 'Item 2', value: 'item2', description: 'Second item' },
      { id: 3, label: 'Item 3', value: 'item3', description: 'Third item' },
      { id: 4, label: 'Item 4', value: 'item4', description: 'Fourth item' },
      { id: 5, label: 'Item 5', value: 'item5', description: 'Fifth item' },
    ];

    try {
      await dataStore.createDataTable({
        name: tableName,
        project_id: projectId,
        schema,
        mockData,
        useMockData: true,
      });
      console.log(`✅ [ListBox] DataTable "${tableName}" 자동 생성 완료`);
    } catch (error) {
      console.warn(`⚠️ [ListBox] DataTable 자동 생성 실패:`, error);
    }

    return tableName;
  }

  private static async createGridList(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createGridListDefinition, context);
  }

  private static async createList(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createListDefinition, context);
  }

  // ==================== Navigation Components ====================

  private static async createMenu(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createMenuDefinition, context);
  }

  private static async createPagination(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createPaginationDefinition, context);
  }

  private static async createDisclosure(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDisclosureDefinition, context);
  }

  private static async createDisclosureGroup(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDisclosureGroupDefinition, context);
  }

  // ==================== Overlay Components ====================

  private static async createDialog(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDialogDefinition, context);
  }

  private static async createPopover(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createPopoverDefinition, context);
  }

  private static async createTooltip(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTooltipDefinition, context);
  }

  // ==================== Data Components ====================

  /**
   * DataTable 컴포넌트 (비시각적, 데이터 관리용)
   */
  private static async createDataTable(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDataTableDefinition, context);
  }

  /**
   * Slot 컴포넌트 (Layout 전용, Page 콘텐츠 삽입 위치)
   */
  private static async createSlot(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createSlotDefinition, context);
  }

  // ==================== Date & Color Components ====================

  private static async createDatePicker(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDatePickerDefinition, context);
  }

  private static async createDateRangePicker(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDateRangePickerDefinition, context);
  }

  private static async createCalendar(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createCalendarDefinition, context);
  }

  private static async createColorPicker(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createColorPickerDefinition, context);
  }

  private static async createDateField(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createDateFieldDefinition, context);
  }

  private static async createTimeField(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createTimeFieldDefinition, context);
  }

  private static async createColorField(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createColorFieldDefinition, context);
  }

  private static async createColorSwatchPicker(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createColorSwatchPickerDefinition, context);
  }

  // ==================== Table Components ====================

  /**
   * Table 컴포넌트 (특수 처리)
   */
  private static async createTable(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return await createTable(context);
  }

  /**
   * ColumnGroup 생성 (공개 메서드)
   */
  static async createColumnGroup(
    parentElement: Element | null,
    pageId: string,
    elements: Element[] = []
  ): Promise<ComponentCreationResult> {
    const context: ComponentCreationContext = {
      parentElement,
      pageId,
      elements,
    };
    return await createColumnGroup(context);
  }
}
