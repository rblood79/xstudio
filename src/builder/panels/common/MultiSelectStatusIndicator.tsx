/**
 * MultiSelectStatusIndicator - 다중 선택 상태 표시 컴포넌트
 *
 * 다중 요소 선택 시 선택된 요소 개수와 빠른 작업 버튼을 표시
 * Phase 2: Multi-Element Editing - Status Indicator
 */

import { Button } from "../../components";
import {
  Copy,
  Trash2,
  X,
  ClipboardPaste,
  Group as GroupIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import type { AlignmentType } from "../../stores/utils/elementAlignment";
import type { DistributionType } from "../../stores/utils/elementDistribution";

export interface MultiSelectStatusIndicatorProps {
  /** 선택된 요소 개수 */
  count: number;
  /** Copy All 핸들러 */
  onCopyAll?: () => void;
  /** Paste All 핸들러 */
  onPasteAll?: () => void;
  /** Delete All 핸들러 */
  onDeleteAll?: () => void;
  /** Clear Selection 핸들러 */
  onClearSelection?: () => void;
  /** Group Selection 핸들러 (Phase 4) */
  onGroupSelection?: () => void;
  /** Alignment 핸들러 (Phase 5.1) */
  onAlign?: (type: AlignmentType) => void;
  /** Distribution 핸들러 (Phase 5.2) */
  onDistribute?: (type: DistributionType) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 다중 선택 상태 표시 컴포넌트
 *
 * @example
 * ```tsx
 * <MultiSelectStatusIndicator
 *   count={5}
 *   onCopyAll={handleCopyAll}
 *   onDeleteAll={handleDeleteAll}
 *   onClearSelection={handleClearSelection}
 * />
 * ```
 */
export function MultiSelectStatusIndicator({
  count,
  onCopyAll,
  onPasteAll,
  onDeleteAll,
  onClearSelection,
  onGroupSelection,
  onAlign,
  onDistribute,
  className = "",
}: MultiSelectStatusIndicatorProps) {
  return (
    <div className={`multi-select-status ${className}`.trim()}>
      <div className="status-header">
        <div className="status-count">
          <span className="count-number">{count}</span>
          <span className="count-label">개 요소 선택됨</span>
        </div>
      </div>

      <div className="status-actions">
        <Button
          variant="ghost"
          size="sm"
          onPress={onCopyAll}
          aria-label="Copy all selected elements"
          isDisabled={count === 0}
        >
          <Copy
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.stroke}
          />
          <span>모두 복사</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onPasteAll}
          aria-label="Paste copied elements"
        >
          <ClipboardPaste
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.stroke}
          />
          <span>붙여넣기</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onGroupSelection}
          aria-label="Group selected elements"
          isDisabled={count < 2}
        >
          <GroupIcon
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.stroke}
          />
          <span>그룹화</span>
        </Button>

        {/* Phase 5: Alignment buttons */}
        {onAlign && (
          <>
            <div className="action-divider" />
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onAlign("left")}
              aria-label="Align left"
              isDisabled={count < 2}
            >
              <AlignLeft
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onPress={() => onAlign("center")}
              aria-label="Align horizontal center"
              isDisabled={count < 2}
            >
              <AlignCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onPress={() => onAlign("right")}
              aria-label="Align right"
              isDisabled={count < 2}
            >
              <AlignRight
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onPress={() => onAlign("top")}
              aria-label="Align top"
              isDisabled={count < 2}
            >
              <AlignVerticalJustifyStart
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onPress={() => onAlign("middle")}
              aria-label="Align vertical middle"
              isDisabled={count < 2}
            >
              <AlignVerticalJustifyCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onPress={() => onAlign("bottom")}
              aria-label="Align bottom"
              isDisabled={count < 2}
            >
              <AlignVerticalJustifyEnd
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </>
        )}

        {/* Phase 5.2: Distribution buttons */}
        {onDistribute && (
          <>
            <div className="action-divider" />
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onDistribute("horizontal")}
              aria-label="Distribute horizontally"
              isDisabled={count < 3}
            >
              <AlignHorizontalDistributeCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onPress={() => onDistribute("vertical")}
              aria-label="Distribute vertically"
              isDisabled={count < 3}
            >
              <AlignVerticalDistributeCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onPress={onDeleteAll}
          aria-label="Delete all selected elements"
          isDisabled={count === 0}
        >
          <Trash2
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.stroke}
          />
          <span>모두 삭제</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onClearSelection}
          aria-label="Clear selection"
          isDisabled={count === 0}
        >
          <X
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.stroke}
          />
          <span>선택 해제</span>
        </Button>
      </div>

      <div className="status-info">
        <p className="info-text">
          다중 선택 모드입니다. 첫 번째 요소의 속성이 Inspector에 표시됩니다.
        </p>
        <p className="info-hint">
          💡 공통 속성을 일괄 편집하려면 아래 배치 편집기를 사용하세요.
        </p>
      </div>
    </div>
  );
}
