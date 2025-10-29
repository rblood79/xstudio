import { Element, ComponentElementProps } from "../../../types/store";
import { ElementUtils } from "../../../utils/elementUtils";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentCreationContext, ComponentCreationResult } from "../types";
import {
  createDefaultTableProps,
  createDefaultTableHeaderProps,
  createDefaultColumnGroupProps,
} from "../../../types/unified";
import { addElementsToStore } from "../utils/elementCreation";
import { saveElementsToDb } from "../utils/dbPersistence";
import { generateCustomId } from "../../utils/idGeneration";

/**
 * Table 컴포넌트 생성 (특수 처리 필요)
 */
export async function createTable(
  context: ComponentCreationContext
): Promise<ComponentCreationResult> {
  const { parentElement, pageId, elements } = context;
  let parentId = parentElement?.id || null;

  // parent_id가 없으면 body 요소를 parent로 설정
  if (!parentId) {
    parentId = ElementUtils.findBodyElement(elements, pageId);
  }

  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const defaultProps = createDefaultTableProps();

  // 부모 요소 생성
  const parent: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("Table", elements),
    tag: "Table",
    props: defaultProps as ComponentElementProps,
    page_id: pageId,
    parent_id: parentId,
    order_num: orderNum,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // TableHeader 생성
  const tableHeader: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("TableHeader", [...elements, parent]),
    tag: "TableHeader",
    props: createDefaultTableHeaderProps() as ComponentElementProps,
    parent_id: parent.id,
    page_id: pageId,
    order_num: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const children: Element[] = [tableHeader];

  // 스토어에 추가
  addElementsToStore(parent, children);

  // DB에 저장
  await saveElementsToDb(parent, children, parentId, pageId);

  return {
    parent,
    children,
    allElements: [parent, ...children],
  };
}

/**
 * ColumnGroup 컴포넌트 생성
 */
export async function createColumnGroup(
  context: ComponentCreationContext
): Promise<ComponentCreationResult> {
  const { parentElement, pageId, elements } = context;

  // 기존 Column Group들의 order_num 중 최대값 찾기
  const existingColumnGroups = elements.filter(
    (el) => el.parent_id === parentElement?.id && el.tag === "ColumnGroup"
  );
  const maxOrderNum =
    existingColumnGroups.length > 0
      ? Math.max(...existingColumnGroups.map((group) => group.order_num || 0))
      : -1;

  const parent: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("ColumnGroup", elements),
    tag: "ColumnGroup",
    props: createDefaultColumnGroupProps(),
    parent_id: parentElement?.id || null,
    page_id: pageId,
    order_num: maxOrderNum + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const children: Element[] = [];

  return {
    parent,
    children,
    allElements: [parent, ...children],
  };
}
