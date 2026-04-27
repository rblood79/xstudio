/**
 * FrameList — reusable frame 목록 컴포넌트.
 *
 * ADR-911 Phase 2 PR-D: FramesTab.tsx 의 `sidebar_layouts` 영역 (frame 목록 + Add 버튼) 추출.
 *
 * 본 컴포넌트는 프레젠테이션 전용 — 데이터 source (legacy/canonical) 결정과
 * frame CRUD 로직은 부모 (FramesTab) 책임. props 로 데이터/핸들러 주입받아
 * UI 만 렌더한다.
 *
 * functional 동등 — 추출 전후 동작 차이 없음 (PR-Followup-A 의 5 baseline 시나리오 + PR-C 의 8/8 시나리오 회귀 0).
 */

import { CirclePlus, Box, Trash } from "lucide-react";
import { iconProps } from "../../../../utils/ui/uiConstants";

export interface FrameListItem {
  id: string;
  name: string;
}

export interface FrameListProps {
  /** 표시할 frame 목록 (legacy 또는 canonical projection 결과) */
  frames: ReadonlyArray<FrameListItem>;
  /** 현재 선택된 frame id (active 표시용) */
  selectedFrameId: string | null;
  /** Frame 항목 클릭 핸들러 */
  onSelect: (frameId: string) => void;
  /** Delete 버튼 클릭 핸들러 (stopPropagation 은 컴포넌트 내부에서 처리) */
  onDelete: (frameId: string) => void;
  /** Add Frame 버튼 클릭 핸들러 */
  onAdd: () => void;
}

export function FrameList({
  frames,
  selectedFrameId,
  onSelect,
  onDelete,
  onAdd,
}: FrameListProps) {
  return (
    <div className="sidebar_layouts">
      <div className="panel-header">
        <h3 className="panel-title">Frames</h3>
        <div className="header-actions">
          <button className="iconButton" aria-label="Add Frame" onClick={onAdd}>
            <CirclePlus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </button>
        </div>
      </div>

      <div className="elements">
        {frames.length === 0 ? (
          <p className="no_element">No frames available</p>
        ) : (
          frames.map((frame) => (
            <div
              key={frame.id}
              className="element"
              onClick={() => onSelect(frame.id)}
            >
              <div
                className={`elementItem ${
                  selectedFrameId === frame.id ? "active" : ""
                }`}
              >
                <div
                  className="elementItemIndent"
                  style={{ width: "0px" }}
                ></div>
                <div className="elementItemIcon">
                  <Box
                    color={iconProps.color}
                    strokeWidth={iconProps.strokeWidth}
                    size={iconProps.size}
                    style={{ padding: "2px" }}
                  />
                </div>
                <div className="elementItemLabel">{frame.name}</div>
                <div className="elementItemActions">
                  <button
                    className="iconButton"
                    aria-label={`Delete ${frame.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(frame.id);
                    }}
                  >
                    <Trash
                      color={iconProps.color}
                      strokeWidth={iconProps.strokeWidth}
                      size={iconProps.size}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
