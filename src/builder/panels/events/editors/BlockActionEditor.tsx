/**
 * BlockActionEditor - 블록 기반 액션 에디터 어댑터
 *
 * 기존 21개 ActionEditor를 재사용하면서
 * BlockEventAction 타입에 맞게 어댑팅
 */

import { useState } from 'react';
import { Button, Switch } from 'react-aria-components';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import type { BlockEventAction } from '../types/eventBlockTypes';
import type { EventAction } from '../types/eventTypes';
import { ActionEditor } from '../actions/ActionEditor';
import { ActionTypePicker } from '../pickers/ActionTypePicker';
import { iconProps, iconEditProps } from '../../../../utils/ui/uiConstants';

interface BlockActionEditorProps {
  /** 편집 중인 액션 */
  action: BlockEventAction;

  /** 액션 업데이트 핸들러 */
  onChange: (action: BlockEventAction) => void;

  /** 에디터 닫기 핸들러 */
  onClose?: () => void;

  /** 액션 삭제 핸들러 */
  onRemove?: () => void;

  /** 타이틀 표시 여부 */
  showTitle?: boolean;
}

/**
 * BlockEventAction을 EventAction으로 변환
 * Note: 타입 어서션 사용 - BlockEventAction.type (registry)과 EventAction.type (eventTypes) 간 호환
 */
function toEventAction(blockAction: BlockEventAction): EventAction {
  return {
    type: blockAction.type as EventAction['type'],
    config: blockAction.config,
    delay: blockAction.delay,
    condition: blockAction.condition,
  };
}

/**
 * EventAction을 BlockEventAction으로 변환
 */
function toBlockEventAction(
  eventAction: EventAction,
  original: BlockEventAction
): BlockEventAction {
  return {
    ...original,
    type: eventAction.type,
    config: eventAction.config,
    delay: eventAction.delay,
    condition: eventAction.condition,
  };
}

/**
 * 블록 기반 액션 에디터
 *
 * 기존 ActionEditor 컴포넌트를 래핑하여
 * BlockEventAction 인터페이스에 맞게 어댑팅합니다.
 *
 * @example
 * <BlockActionEditor
 *   action={selectedAction}
 *   onChange={(updated) => updateAction(updated)}
 *   onClose={() => setSelectedAction(null)}
 *   onRemove={() => removeAction(selectedAction.id)}
 * />
 */
export function BlockActionEditor({
  action,
  onChange,
  onClose,
  onRemove,
  showTitle = true,
}: BlockActionEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 기존 EventAction 형식으로 변환
  const eventAction = toEventAction(action);

  // EventAction 변경을 BlockEventAction으로 변환하여 전파
  const handleEventActionChange = (updated: EventAction) => {
    onChange(toBlockEventAction(updated, action));
  };

  // 액션 활성화 토글
  const handleEnabledChange = (enabled: boolean) => {
    onChange({ ...action, enabled });
  };

  return (
    <div className="block-action-editor" data-action-id={action.id}>
      {/* Header */}
      {showTitle && (
        <div className="block-action-editor-header">
          <span className="block-action-editor-title">Edit Action</span>

          {/* Enable Toggle */}
          <div className="block-action-enabled-toggle">
            <Switch
              isSelected={action.enabled !== false}
              onChange={handleEnabledChange}
              aria-label="Enable action"
            >
              <span className="switch-label">Enabled</span>
            </Switch>
          </div>

          <div className="block-action-editor-spacer" />

          {/* Remove Button */}
          {onRemove && (
            <Button
              className="iconButton"
              onPress={onRemove}
              aria-label="Remove action"
            >
              <X size={iconProps.size} color={iconProps.color} strokeWidth={iconProps.strokeWidth} />
            </Button>
          )}

          {/* Close Button */}
          {onClose && (
            <Button
              className="iconButton"
              onPress={onClose}
              aria-label="Close editor"
            >
              <X size={iconProps.size} color={iconProps.color} strokeWidth={iconProps.strokeWidth} />
            </Button>
          )}
        </div>
      )}

      {/* Action Type Selector (inline mode) */}
      <div className="block-action-type-row">
        <span className="block-action-type-label">Type</span>
        <ActionTypePicker
          selectedType={action.type}
          onSelect={(type) => {
            // 타입 변경 시 기본 config로 초기화
            const defaultConfig = getDefaultConfigForType(type);
            onChange({ ...action, type, config: defaultConfig });
          }}
          inline
          placeholder="Select action type..."
        />
      </div>

      {/* Action Config (기존 ActionEditor 재사용) */}
      <div className="block-action-config">
        <ActionEditor
          action={eventAction}
          onChange={handleEventActionChange}
        />
      </div>

      {/* Advanced Settings Toggle */}
      <Button
        className="block-action-advanced-toggle"
        onPress={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? (
          <ChevronDown size={iconEditProps.size} color={iconProps.color} />
        ) : (
          <ChevronRight size={iconEditProps.size} color={iconProps.color} />
        )}
        <span>Advanced Settings</span>
      </Button>

      {/* Advanced Settings (delay, condition) */}
      {showAdvanced && (
        <div className="block-action-advanced">
          {/* Delay and Condition are handled by ActionEditor's advanced section */}
        </div>
      )}
    </div>
  );
}

/**
 * 액션 타입별 기본 config 반환
 */
function getDefaultConfigForType(type: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    navigate: { path: '/' },
    scrollTo: { elementId: '', position: 'top', smooth: true },
    setState: { storePath: '', value: '' },
    updateState: { storePath: '', value: '', merge: false },
    apiCall: { endpoint: '', method: 'GET' },
    showModal: { modalId: '' },
    hideModal: { modalId: '' },
    showToast: { message: '', variant: 'info', duration: 3000 },
    toggleVisibility: { elementId: '', show: undefined },
    validateForm: { formId: '' },
    resetForm: { formId: '' },
    submitForm: { formId: '' },
    setComponentState: { targetId: '', statePath: '', value: '', source: 'static' },
    triggerComponentAction: { targetId: '', action: '' },
    updateFormField: { fieldName: '', value: '', source: 'static' },
    filterCollection: { targetId: '', filterMode: 'text', query: '' },
    selectItem: { targetId: '', itemId: '', behavior: 'replace', source: 'static' },
    clearSelection: { targetId: '' },
    copyToClipboard: { text: '', source: 'static' },
    customFunction: { code: '', params: {} },
    // DataTable Actions (Phase 3)
    loadDataTable: { dataTableName: '', forceRefresh: false },
    syncComponent: { sourceId: '', targetId: '', syncMode: 'replace' },
    saveToDataTable: { dataTableName: '', source: 'response', saveMode: 'replace' },
  };

  return defaults[type] || {};
}
