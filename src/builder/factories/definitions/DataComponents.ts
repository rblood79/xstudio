/**
 * Data Components Factory Definitions
 *
 * Dataset 등 데이터 관리 컴포넌트 팩토리 정의
 *
 * @see docs/PLANNED_FEATURES.md - Dataset Component Architecture
 */

import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Dataset 컴포넌트 정의
 *
 * Dataset은 비시각적 컴포넌트로, 데이터를 중앙에서 관리하고
 * 여러 Collection 컴포넌트가 공유할 수 있도록 합니다.
 *
 * Layer Tree에는 표시되지만 Preview에서는 렌더링되지 않습니다.
 */
export function createDatasetDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  // 고유 Dataset ID 생성 (사용자가 나중에 변경 가능)
  const datasetId = `dataset-${Date.now()}`;

  return {
    tag: "Dataset",
    parent: {
      tag: "Dataset",
      props: {
        id: datasetId,
        name: "New Dataset",
        autoLoad: true,
        // 기본 dataBinding 설정 (사용자가 Inspector에서 변경)
        dataBinding: {
          type: "collection",
          source: "api",
          config: {
            baseUrl: "MOCK_DATA",
            endpoint: "/users",
            dataMapping: {
              resultPath: "data",
              idField: "id",
              labelField: "name",
            },
          },
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    // Dataset은 자식 요소가 없음
    children: [],
  };
}

/**
 * Slot 컴포넌트 정의
 *
 * Slot은 Layout 내에서 Page 콘텐츠가 삽입될 위치를 나타냅니다.
 * Layout Body에서만 생성 가능합니다.
 */
export function createSlotDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // Slot은 Layout에서만 사용 가능
  if (!layoutId) {
    console.warn("⚠️ Slot can only be created in Layout mode");
  }

  // ⭐ Layout/Slot System - Slot은 항상 layout_id 사용
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Slot",
    parent: {
      tag: "Slot",
      props: {
        name: "content",
        required: false,
        description: "Main content area",
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    // Slot은 자식 요소가 없음 (Page에서 채워짐)
    children: [],
  };
}
