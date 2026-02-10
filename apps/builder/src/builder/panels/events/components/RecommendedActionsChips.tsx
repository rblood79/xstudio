/**
 * RecommendedActionsChips - 추천 액션 칩 컴포넌트
 *
 * THEN/ELSE 블록 내부에 표시되는 추천 액션 칩
 * 컨텍스트(이벤트 타입, 컴포넌트 타입, 기존 액션)를 기반으로
 * 적절한 다음 액션을 추천
 */

import { useMemo } from 'react';
import {
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
  Table,
  Save,
  Variable,
} from 'lucide-react';
import { getRecommendedActions } from '../data/actionMetadata';
import type { BlockEventAction } from '../types/eventBlockTypes';
import type { ActionType } from '../types/eventTypes';
import { ACTION_TYPE_LABELS } from '../types/eventTypes';

// ============================================================================
// Props
// ============================================================================

interface RecommendedActionsChipsProps {
  /** 현재 이벤트 타입 (onClick, onSubmit 등) */
  eventType: string;
  /** 대상 컴포넌트 타입 (Button, TextField 등) */
  componentType: string;
  /** 이미 추가된 액션 목록 */
  existingActions: BlockEventAction[];
  /** 액션 추가 핸들러 */
  onAddAction: (actionType: ActionType) => void;
}

// ============================================================================
// 아이콘 매핑
// ============================================================================

/**
 * 액션 타입별 칩 아이콘 매핑
 * ActionBlock의 ACTION_ICONS와 동일한 구조
 */
const ACTION_CHIP_ICONS: Partial<
  Record<ActionType, React.ComponentType<{ size?: number }>>
> = {
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
  copyToClipboard: ClipboardCopy,
  customFunction: Code,
  loadDataTable: Table,
  syncComponent: RefreshCw,
  saveToDataTable: Save,
  setVariable: Variable,
};

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * 추천 액션 칩 컴포넌트
 *
 * 현재 컨텍스트를 분석하여 최대 3개의 추천 액션 칩을 표시합니다.
 * 이미 추가된 액션은 추천에서 제외됩니다.
 *
 * @example
 * <RecommendedActionsChips
 *   eventType="onClick"
 *   componentType="Button"
 *   existingActions={thenActions}
 *   onAddAction={(type) => addAction(type)}
 * />
 */
export function RecommendedActionsChips({
  eventType,
  componentType,
  existingActions,
  onAddAction,
}: RecommendedActionsChipsProps) {
  const chips = useMemo(() => {
    // 이벤트/컴포넌트 타입 기반 추천
    const contextRecommendations = getRecommendedActions({
      eventType,
      componentType,
    });

    // 마지막 기존 액션 기반 추천 (있는 경우)
    let chainRecommendations: ActionType[] = [];
    if (existingActions.length > 0) {
      const lastAction = existingActions[existingActions.length - 1];
      chainRecommendations = getRecommendedActions({
        previousAction: lastAction.type,
      });
    }

    // 중복 제거하여 병합
    const merged = [...contextRecommendations];
    for (const action of chainRecommendations) {
      if (!merged.includes(action)) {
        merged.push(action);
      }
    }

    // 이미 존재하는 액션 타입 제외
    const existingTypes = new Set(existingActions.map((a) => a.type));
    const filtered = merged.filter((type) => !existingTypes.has(type));

    // 최대 3개로 제한
    return filtered.slice(0, 3);
  }, [eventType, componentType, existingActions]);

  // 추천할 액션이 없으면 렌더링하지 않음
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="recommended-actions-chips">
      {chips.map((actionType) => {
        const Icon = ACTION_CHIP_ICONS[actionType] || Code;
        const label = ACTION_TYPE_LABELS[actionType] || actionType;
        return (
          <button
            key={actionType}
            type="button"
            className="recommended-action-chip"
            onClick={() => onAddAction(actionType)}
            aria-label={`Add ${label} action`}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default RecommendedActionsChips;
