import { Element } from "../../../types/store";
import { ElementUtils } from "../../../utils/elementUtils";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { updateElementId } from "./elementCreation";

/**
 * 부모 및 자식 요소들을 DB에 저장
 */
export async function saveElementsToDb(
  parent: Element,
  children: Element[],
  parentId: string | null,
  pageId: string
): Promise<void> {
  try {
    // 부모 먼저 저장
    const parentToSave = {
      ...parent,
      order_num: HierarchyManager.calculateNextOrderNum(
        parentId,
        await ElementUtils.getElementsByPageId(pageId)
      ),
    };

    const savedParent = await ElementUtils.createElement(parentToSave);

    // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
    updateElementId(parent.id, savedParent.id);

    // 자식들 순차 저장 (부모 ID 업데이트)
    for (let i = 0; i < children.length; i++) {
      const childToSave = {
        ...children[i],
        parent_id: savedParent.id,
      };
      const savedChild = await ElementUtils.createElement(childToSave);

      // 스토어에서 자식 요소 ID 업데이트
      updateElementId(children[i].id, savedChild.id);
    }
  } catch (error) {
    console.error("Background save failed:", error);
  }
}

/**
 * 백그라운드에서 DB 저장 (setTimeout 사용)
 */
export function saveElementsInBackground(
  parent: Element,
  children: Element[],
  parentId: string | null,
  pageId: string
): void {
  setTimeout(async () => {
    await saveElementsToDb(parent, children, parentId, pageId);
  }, 0);
}
