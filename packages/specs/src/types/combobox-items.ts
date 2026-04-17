/**
 * ComboBox Items SSOT — Stored/Runtime 인터페이스 분리 (ADR-073 P1)
 *
 * specs 패키지가 단일 소스. shared/builder/preview 모두 여기서 import.
 * 패키지 의존 방향: shared → specs (단방향)
 *
 * @packageDocumentation
 */

/** Store 직렬화 모델 — JSON 직렬화 가능 (onAction은 id 참조) */
export interface StoredComboBoxItem {
  id: string;
  label: string;
  value?: string;
  /** 검색 가능한 텍스트 (RAC `textValue`) */
  textValue?: string;
  isDisabled?: boolean;
  icon?: string;
  description?: string;
  /** EVENT_REGISTRY (ADR-055) 참조 id — JSON 직렬화 가능 */
  onActionId?: string;
}

/** Runtime 모델 — RAC `<ComboBox items>{...}` 호출 직전 SelectionRenderers에서 변환 */
export interface RuntimeComboBoxItem extends Omit<StoredComboBoxItem, "onActionId"> {
  /** SelectionRenderers에서 onActionId → 함수 변환 */
  onAction?: () => void;
}

/**
 * Stored → Runtime 변환
 * @param stored 저장 모델
 * @param resolveActionId event-id → 실제 핸들러 변환 함수
 */
export function toRuntimeComboBoxItem(
  stored: StoredComboBoxItem,
  resolveActionId: (id: string) => (() => void) | undefined,
): RuntimeComboBoxItem {
  const { onActionId, ...rest } = stored;
  const onAction = onActionId ? resolveActionId(onActionId) : undefined;
  return { ...rest, onAction };
}
