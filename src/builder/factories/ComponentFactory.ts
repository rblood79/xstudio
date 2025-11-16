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

// 컴포넌트 정의 임포트
import { createTextFieldDefinition } from "./definitions/FormComponents";
import {
  createSelectDefinition,
  createComboBoxDefinition,
  createListBoxDefinition,
  createGridListDefinition,
} from "./definitions/SelectionComponents";
import {
  createGroupDefinition,
  createToggleButtonGroupDefinition,
  createCheckboxGroupDefinition,
  createRadioGroupDefinition,
  createTagGroupDefinition,
  createBreadcrumbsDefinition,
} from "./definitions/GroupComponents";
import {
  createTabsDefinition,
  createTreeDefinition,
} from "./definitions/LayoutComponents";
import {
  createTable,
  createColumnGroup,
} from "./definitions/TableComponents";

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
    Group: ComponentFactory.createGroup,
    ToggleButtonGroup: ComponentFactory.createToggleButtonGroup,
    CheckboxGroup: ComponentFactory.createCheckboxGroup,
    RadioGroup: ComponentFactory.createRadioGroup,
    Select: ComponentFactory.createSelect,
    ComboBox: ComponentFactory.createComboBox,
    Tabs: ComponentFactory.createTabs,
    Tree: ComponentFactory.createTree,
    TagGroup: ComponentFactory.createTagGroup,
    Breadcrumbs: ComponentFactory.createBreadcrumbs,
    ListBox: ComponentFactory.createListBox,
    GridList: ComponentFactory.createGridList,
    Table: ComponentFactory.createTable,
  };

  /**
   * 복합 컴포넌트 생성 (메인 메서드)
   */
  static async createComplexComponent(
    tag: string,
    parentElement: Element | null,
    pageId: string,
    elements: Element[]
  ): Promise<ComponentCreationResult> {
    const creator = this.creators[tag];
    if (!creator) {
      throw new Error(`No creator found for component type: ${tag}`);
    }

    const context: ComponentCreationContext = {
      parentElement,
      pageId,
      elements,
    };

    return await creator.call(this, context);
  }

  /**
   * 공통 컴포넌트 생성 로직
   */
  private static async createComponent(
    definitionCreator: (context: ComponentCreationContext) => ComponentDefinition,
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    const { parentElement, pageId, elements } = context;
    let parentId = parentElement?.id || null;

    // parent_id가 없으면 body 요소를 parent로 설정
    if (!parentId) {
      parentId = ElementUtils.findBodyElement(elements, pageId);
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
    saveElementsInBackground(parent, children, parentId, pageId);

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

  private static async createListBox(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createListBoxDefinition, context);
  }

  private static async createGridList(
    context: ComponentCreationContext
  ): Promise<ComponentCreationResult> {
    return this.createComponent(createGridListDefinition, context);
  }

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
