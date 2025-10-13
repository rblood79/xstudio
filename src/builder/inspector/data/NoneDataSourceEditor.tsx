import { useState } from "react";
import { Button } from "../../components/list";
import { useStore } from "../../stores/elements";
import { elementsApi } from "../../../services";
import type { Element } from "../../../types/store";

interface NoneDataSourceEditorProps {
  elementId: string;
  onApply?: () => Promise<void>;
}

/**
 * "선택 안 함" 데이터 소스 에디터
 * Apply 버튼을 클릭하면 모든 Column Elements를 제거하고 테이블을 초기 상태로 되돌립니다.
 */
export function NoneDataSourceEditor({ elementId, onApply }: NoneDataSourceEditorProps) {
  console.log("📋 NoneDataSourceEditor 렌더링됨", { elementId, hasOnApply: !!onApply });

  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    // 최신 elements 가져오기 (Store의 getState() 사용)
    const elements = useStore.getState().elements;

    console.log("🚀 NoneDataSourceEditor handleApply 시작", {
      elementId,
      hasOnApply: !!onApply,
      elementsCount: elements.length,
    });

    setIsApplying(true);

    try {
      // 1. TableHeader 찾기
      const tableHeader = elements.find(
        (el: Element) => el.tag === "TableHeader" && el.parent_id === elementId
      );

      if (!tableHeader) {
        console.warn("⚠️ TableHeader를 찾을 수 없습니다.");
        setIsApplying(false);
        return;
      }

      // 2. 모든 Column Elements 찾기
      const columns = elements.filter(
        (el: Element) => el.tag === "Column" && el.parent_id === tableHeader.id
      );

      if (columns.length > 0) {
        // 3. DB에서 모든 Column Elements 삭제
        const columnIds = columns.map((col: Element) => col.id);
        console.log(`🗑️ ${columns.length}개의 Column Elements 삭제 중...`, columnIds);

        await elementsApi.deleteMultipleElements(columnIds);

        console.log("✅ 모든 Column Elements가 삭제되었습니다.");
      }

      // 4. onApply callback 호출 (DataSourceSelector에서 처리)
      if (onApply) {
        await onApply();
      }

      console.log("✅ 테이블이 초기 상태로 되돌아갔습니다.");
    } catch (error) {
      console.error("❌ Column 삭제 실패:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="component-props">
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">데이터 소스 없음</legend>

        <div className="none-editor-info">
          <p className="info-text">
            데이터 소스가 선택되지 않았습니다.
          </p>
          <p className="warning-text">
            ⚠️ Apply 버튼을 클릭하면 모든 컬럼이 제거되고 테이블이 초기 상태로 되돌아갑니다.
          </p>
        </div>

        <div className="button-group">
          <Button
            size="xs"
            onClick={handleApply}
            isDisabled={isApplying}
            children={isApplying ? "적용 중..." : "Apply"}
          />
        </div>
      </fieldset>
    </div>
  );
}
