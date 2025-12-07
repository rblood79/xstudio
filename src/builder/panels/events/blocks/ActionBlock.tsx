/**
 * ActionBlock - 개별 액션 블록
 *
 * THEN/ELSE 블록 내에서 사용되는 개별 액션 아이템
 * 드래그 앤 드롭 정렬, 편집, 삭제 지원
 */

import { Button } from 'react-aria-components';
import {
  GripVertical,
  Trash,
  ChevronDown,
  ChevronRight,
  Navigation,
  RefreshCw,
  Bell,
  Eye,
  Send,
  Code,
  Database,
  MousePointer,
  ClipboardCopy,
  ArrowDown,
} from 'lucide-react';
import type { BlockEventAction } from '../../../events/types/eventBlockTypes';
import type { ActionType } from '../../../events/types/eventTypes';
import { ACTION_TYPE_LABELS } from '../../../events/types/eventTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';

interface ActionBlockProps {
  /** 액션 데이터 */
  action: BlockEventAction;

  /** 액션 순번 (1부터 시작) */
  index: number;

  /** 액션 클릭 핸들러 (편집 모드 진입) */
  onClick?: () => void;

  /** 액션 삭제 핸들러 */
  onRemove?: () => void;

  /** 확장 상태 */
  isExpanded?: boolean;

  /** 확장 토글 핸들러 */
  onToggleExpand?: () => void;

  /** 드래그 핸들 참조 (dnd-kit 등 연동용) */
  dragHandleProps?: Record<string, unknown>;
}

/**
 * 액션 타입별 아이콘 매핑
 */
const ACTION_ICONS: Record<ActionType, React.ComponentType<{ size?: number; className?: string }>> = {
  navigate: Navigation,
  scrollTo: ArrowDown,
  setState: Database,
  updateState: RefreshCw,
  apiCall: Send,
  showModal: Eye,
  hideModal: Eye,
  showToast: Bell,
  toggleVisibility: Eye,
  validateForm: Send,
  resetForm: RefreshCw,
  submitForm: Send,
  setComponentState: Database,
  triggerComponentAction: MousePointer,
  updateFormField: Database,
  filterCollection: Database,
  selectItem: MousePointer,
  clearSelection: MousePointer,
  copyToClipboard: ClipboardCopy,
  customFunction: Code,
};

/**
 * 액션 설정에서 요약 텍스트 생성
 */
function getActionSummary(action: BlockEventAction): string {
  const config = action.config as Record<string, unknown>;

  switch (action.type) {
    case 'navigate':
      return config.path as string || '';
    case 'apiCall':
      return `${config.method || 'GET'} ${config.endpoint || ''}`;
    case 'showToast':
      return config.message as string || '';
    case 'setState':
    case 'updateState':
      return config.storePath as string || '';
    case 'showModal':
    case 'hideModal':
      return config.modalId as string || '';
    case 'toggleVisibility':
      return config.elementId as string || '';
    case 'customFunction':
      return config.code ? '(custom code)' : '';
    default:
      return '';
  }
}

/**
 * 개별 액션 블록 컴포넌트
 *
 * @example
 * <ActionBlock
 *   action={{ id: '1', type: 'navigate', config: { path: '/home' } }}
 *   index={1}
 *   onClick={() => setSelectedAction(action)}
 *   onRemove={() => removeAction(action.id)}
 * />
 */
export function ActionBlock({
  action,
  index,
  onClick,
  onRemove,
  isExpanded = false,
  onToggleExpand,
  dragHandleProps = {},
}: ActionBlockProps) {
  const IconComponent = ACTION_ICONS[action.type] || Code;
  const label = ACTION_TYPE_LABELS[action.type] || action.type;
  const summary = getActionSummary(action);

  return (
    <div
      className={`action-item ${action.enabled === false ? 'disabled' : ''}`}
      role="listitem"
      aria-label={`Action ${index}: ${label}`}
      data-action-id={action.id}
    >
      {/* Drag Handle */}
      <div className="action-drag-handle" {...dragHandleProps}>
        <GripVertical
          size={14}
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
        />
      </div>

      {/* Action Number */}
      <span className="action-number">{index}</span>

      {/* Action Icon */}
      <IconComponent size={14} className="action-icon" />

      {/* Action Info (clickable) */}
      <button
        type="button"
        className="action-info-button"
        onClick={onClick}
        aria-label={`Edit ${label}`}
      >
        <span className="action-type">{label}</span>
        {summary && <span className="action-summary">{summary}</span>}
      </button>

      {/* Action Controls */}
      <div className="action-controls">
        {/* Expand/Collapse Toggle */}
        {onToggleExpand && (
          <Button
            className="iconButton"
            onPress={onToggleExpand}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown size={14} color={iconProps.color} strokeWidth={iconProps.stroke} />
            ) : (
              <ChevronRight size={14} color={iconProps.color} strokeWidth={iconProps.stroke} />
            )}
          </Button>
        )}

        {/* Delete Button */}
        {onRemove && (
          <Button
            className="iconButton"
            onPress={onRemove}
            aria-label="Delete action"
          >
            <Trash
              size={14}
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        )}
      </div>
    </div>
  );
}
