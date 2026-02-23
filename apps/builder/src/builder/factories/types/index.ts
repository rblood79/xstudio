import { Element } from "../../../types/core/store.types";

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
  // ⭐ Layout/Slot System: Layout 모드에서 요소 생성 시 사용
  layoutId?: string | null;
}

/**
 * 자식 요소 정의 (재귀적 중첩 지원)
 */
export type ChildDefinition = Omit<Element, "id" | "created_at" | "updated_at" | "parent_id"> & {
  children?: ChildDefinition[];
};

/**
 * 컴포넌트 정의 타입
 */
export interface ComponentDefinition {
  tag: string;
  parent: Omit<Element, "id" | "created_at" | "updated_at">;
  children: ChildDefinition[];
}

/**
 * 컴포넌트 생성자 함수 타입
 */
export type ComponentCreator = (
  context: ComponentCreationContext
) => Promise<ComponentCreationResult>;
