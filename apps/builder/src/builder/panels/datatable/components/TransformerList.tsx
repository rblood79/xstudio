/**
 * TransformerList - Transformer 목록 컴포넌트
 *
 * 3단계 변환 시스템 CRUD 및 목록 표시
 */

import { useState } from "react";
import { Workflow, Plus, Trash2, Edit2, Play } from "lucide-react";
import { useDataStore, useTransformers } from "../../../stores/data";
import { SectionHeader } from "../../../components";
import type { TransformLevel } from "../../../../types/builder/data.types";
import { iconProps, iconEditProps } from "../../../../utils/ui/uiConstants";

interface TransformerListProps {
  projectId: string;
}

const LEVEL_LABELS: Record<TransformLevel, string> = {
  level1_mapping: "Mapping",
  level2_transformer: "JS",
  level3_custom: "Custom",
};

const LEVEL_CLASSES: Record<TransformLevel, string> = {
  level1_mapping: "level1",
  level2_transformer: "level2",
  level3_custom: "level3",
};

export function TransformerList({ projectId }: TransformerListProps) {
  const transformers = useTransformers();
  const createTransformer = useDataStore((state) => state.createTransformer);
  const deleteTransformer = useDataStore((state) => state.deleteTransformer);
  const executeTransformer = useDataStore((state) => state.executeTransformer);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = prompt("Transformer 이름을 입력하세요:");
    if (!name) return;

    try {
      await createTransformer({
        name,
        project_id: projectId,
        level: "level1_mapping",
        enabled: true,
      });
    } catch (error) {
      console.error("Transformer 생성 실패:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteTransformer(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error("Transformer 삭제 실패:", error);
    }
  };

  const handleExecute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Test execution with sample data
      const result = await executeTransformer(id, [{ test: "data" }]);
      console.log("Transformer 실행 결과:", result);
      alert("Transformer 실행 성공! 콘솔을 확인하세요.");
    } catch (error) {
      console.error("Transformer 실행 실패:", error);
      alert(`Transformer 실행 실패: ${(error as Error).message}`);
    }
  };

  return (
    <div className="section">
      <SectionHeader
        title="Transformer List"
        actions={
          <span className="datatable-list-count">{transformers.length}개</span>
        }
      />
      <div className="section-content">
        {transformers.length === 0 ? (
          <div className="datatable-empty">
            <Workflow size={32} className="datatable-empty-icon" />
            <p className="datatable-empty-text">
              Transformer가 없습니다.
              <br />
              새 Transformer를 추가하세요.
            </p>
          </div>
        ) : (
          <div className="datatable-list">
            {transformers.map((transformer) => (
              <div
                key={transformer.id}
                className={`datatable-item ${selectedId === transformer.id ? "selected" : ""}`}
                onClick={() => setSelectedId(transformer.id)}
              >
                <div className="datatable-item-icon">
                  <Workflow {...iconProps} />
                </div>
                <div className="datatable-item-info">
                  <div className="datatable-item-name">{transformer.name}</div>
                  <div className="datatable-item-meta">
                    {transformer.inputDataTable && `${transformer.inputDataTable} → `}
                    {transformer.outputDataTable || "output"}
                    {!transformer.enabled && " · 비활성"}
                  </div>
                </div>
                <span className={`level-badge ${LEVEL_CLASSES[transformer.level]}`}>
                  {LEVEL_LABELS[transformer.level]}
                </span>
                <div className="datatable-item-actions">
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => handleExecute(transformer.id, e)}
                    disabled={!transformer.enabled}
                    title="실행"
                  >
                    <Play {...iconEditProps} />
                  </button>
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Open editor modal
                    }}
                    title="편집"
                  >
                    <Edit2 {...iconEditProps} />
                  </button>
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => handleDelete(transformer.id, e)}
                    title="삭제"
                  >
                    <Trash2 {...iconEditProps} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="datatable-add-btn"
          onClick={handleCreate}
        >
          <Plus {...iconProps} />
          <span>Transformer 추가</span>
        </button>
      </div>
    </div>
  );
}
