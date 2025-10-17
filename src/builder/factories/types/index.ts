import { Element } from "../../../types/store";

/**
 * 컴포넌트 생성 결과 타입
 */
export interface ComponentCreationResult {
  parent: Element;
  children: Element[];
  allElements: Element[];
}

/**
 * 컴포넌트 생성 컨텍스트
 */
export interface ComponentCreationContext {
  parentElement: Element | null;
  pageId: string;
  elements: Element[];
}

/**
 * 컴포넌트 정의 타입
 */
export interface ComponentDefinition {
  tag: string;
  parent: Omit<Element, "id" | "created_at" | "updated_at">;
  children: Array<Omit<Element, "id" | "created_at" | "updated_at" | "parent_id">>;
}

/**
 * 컴포넌트 생성자 함수 타입
 */
export type ComponentCreator = (
  context: ComponentCreationContext
) => Promise<ComponentCreationResult>;
