import { elementsApi } from "../../../../services";
import { useStore } from "../../../stores/elements";
import type { Element } from "../../../../types/unified";

/**
 * Table의 모든 Column Elements를 삭제합니다.
 * @param tableId - Table Element ID
 * @param elements - 모든 Element 배열
 * @returns 삭제된 컬럼 수
 */
export async function deleteTableColumns(
  tableId: string,
  elements: Element[]
): Promise<number> {
  try {
    // 1. TableHeader 찾기
    const tableHeader = elements.find(
      (el) => el.tag === "TableHeader" && el.parent_id === tableId
    );

    if (!tableHeader) {
      console.warn("⚠️ TableHeader를 찾을 수 없습니다.");
      return 0;
    }

    // 2. 모든 Column Elements 찾기
    const columns = elements.filter(
      (el) => el.tag === "Column" && el.parent_id === tableHeader.id
    );

    if (columns.length === 0) {
      console.log("ℹ️ 삭제할 컬럼이 없습니다.");
      return 0;
    }

    // 3. DB에서 모든 Column Elements 삭제
    const columnIds = columns.map((col) => col.id);
    console.log(`🗑️ ${columns.length}개의 Column Elements 삭제 중...`, columnIds);

    await elementsApi.deleteMultipleElements(columnIds);

    // 4. Store에서도 삭제 (리얼타임 업데이트로 자동으로 될 수도 있지만 명시적으로 호출)
    // Note: Store에 직접 deleteElement 메서드가 없으므로 
    // elementsApi.deleteMultipleElements가 리얼타임으로 Store를 업데이트할 것으로 예상

    console.log(`✅ ${columns.length}개의 Column Elements가 삭제되었습니다.`);
    return columns.length;
  } catch (error) {
    console.error("❌ Column 삭제 실패:", error);
    throw error;
  }
}

/**
 * Hook 없이 사용할 수 있는 버전
 * Store에서 elements를 가져와서 deleteTableColumns 호출
 */
export async function deleteTableColumnsFromStore(tableId: string): Promise<number> {
  const elements = useStore.getState().elements;
  return deleteTableColumns(tableId, elements);
}
