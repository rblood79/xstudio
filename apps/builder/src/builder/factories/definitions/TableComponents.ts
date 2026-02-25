import { Element, ComponentElementProps } from "../../../types/core/store.types";
import { ElementUtils } from "../../../utils/element/elementUtils";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentCreationContext, ComponentCreationResult } from "../types";
import {
  createDefaultTableProps,
  createDefaultTableHeaderProps,
  createDefaultTableBodyProps,
  createDefaultColumnGroupProps,
} from "../../../types/builder/unified.types";
import { addElementsToStore } from "../utils/elementCreation";
import { saveElementsToDb } from "../utils/dbPersistence";
import { generateCustomId } from "../../utils/idGeneration";

/**
 * Table 컴포넌트 생성 (특수 처리 필요)
 */
export async function createTable(
  context: ComponentCreationContext
): Promise<ComponentCreationResult> {
  const { parentElement, pageId, elements, layoutId } = context;
  let parentId = parentElement?.id || null;

  // parent_id가 없으면 body 요소를 parent로 설정
  if (!parentId) {
    parentId = ElementUtils.findBodyElement(elements, pageId);
  }

  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const defaultProps = createDefaultTableProps();

  // ⭐ Layout/Slot System: layoutId가 있으면 layout_id 사용, 없으면 page_id 사용
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  // 부모 요소 생성
  const parent: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("Table", elements),
    tag: "Table",
    props: defaultProps as ComponentElementProps,
    ...ownerFields,
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
    ...ownerFields,
    order_num: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // TableBody 생성
  const tableBody: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("TableBody", [...elements, parent, tableHeader]),
    tag: "TableBody",
    props: createDefaultTableBodyProps() as ComponentElementProps,
    parent_id: parent.id,
    ...ownerFields,
    order_num: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const children: Element[] = [tableHeader, tableBody];

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
  const { parentElement, pageId, elements, layoutId } = context;

  // 기존 Column Group들의 order_num 중 최대값 찾기
  const existingColumnGroups = elements.filter(
    (el) => el.parent_id === parentElement?.id && el.tag === "ColumnGroup"
  );
  const maxOrderNum =
    existingColumnGroups.length > 0
      ? Math.max(...existingColumnGroups.map((group) => group.order_num || 0))
      : -1;

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  const parent: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("ColumnGroup", elements),
    tag: "ColumnGroup",
    props: createDefaultColumnGroupProps(),
    parent_id: parentElement?.id || null,
    ...ownerFields,
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
