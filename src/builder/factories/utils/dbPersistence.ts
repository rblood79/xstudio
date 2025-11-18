import { Element } from "../../../types/core/store.types";
import { elementsApi } from "../../../services/api/ElementsApiService";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { updateElementId } from "./elementCreation";
import { supabase } from "../../../env/supabase.client";

/**
 * 참조 무결성 검증: page_id와 parent_id가 DB에 존재하는지 확인
 */
async function validateReferences(
  pageId: string,
  parentId: string | null
): Promise<boolean> {
  try {
    // 1. Page 존재 여부 확인
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('id')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      console.warn(`[dbPersistence] Page ${pageId} not found in DB - skipping save`);
      return false;
    }

    // 2. Parent 존재 여부 확인 (parentId가 있는 경우만)
    if (parentId) {
      const { data: parentElement, error: parentError } = await supabase
        .from('elements')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentElement) {
        console.warn(`[dbPersistence] Parent element ${parentId} not found in DB - skipping save`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[dbPersistence] Reference validation failed:', error);
    return false;
  }
}

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
    // ⭐ 참조 무결성 검증 (외래 키 위반 방지)
    const isValid = await validateReferences(pageId, parentId);
    if (!isValid) {
      console.warn('[dbPersistence] References not found in DB - aborting save');
      return;
    }

    // 부모 먼저 저장
    const parentToSave = {
      ...parent,
      parent_id: parentId,
      order_num: HierarchyManager.calculateNextOrderNum(
        parentId,
        await elementsApi.getElementsByPageId(pageId)
      ),
    };

    const savedParent = await elementsApi.createElement(parentToSave);

    // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
    updateElementId(parent.id, savedParent.id);

    // 자식들 순차 저장 (부모 ID 업데이트)
    for (let i = 0; i < children.length; i++) {
      const childToSave = {
        ...children[i],
        parent_id: savedParent.id,
      };
      const savedChild = await elementsApi.createElement(childToSave);

      // 스토어에서 자식 요소 ID 업데이트
      updateElementId(children[i].id, savedChild.id);
    }

    console.log(`[dbPersistence] Successfully saved parent ${savedParent.id} and ${children.length} children`);
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
