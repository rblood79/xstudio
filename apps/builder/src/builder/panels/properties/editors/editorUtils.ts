/**
 * Property Editor 공유 유틸리티
 *
 * 여러 에디터에서 반복되는 로직을 중앙화하여 중복 제거
 */

import { PROPERTY_LABELS } from "../../../../utils/ui/labels";

/** Necessity Indicator 선택 옵션 (Required select용) */
export const NECESSITY_INDICATOR_OPTIONS = [
  { value: "", label: "None" },
  { value: "icon", label: "Icon (*)" },
  { value: "label", label: "Label (required/optional)" },
] as const;

/** Label Position 선택 옵션 */
export const LABEL_POSITION_OPTIONS = [
  { value: "top", label: PROPERTY_LABELS.LABEL_POSITION_TOP },
  { value: "side", label: PROPERTY_LABELS.LABEL_POSITION_SIDE },
] as const;

/**
 * Required + NecessityIndicator 통합 업데이트 생성
 * None → isRequired: false + necessityIndicator 제거
 * icon/label → isRequired: true + necessityIndicator 설정
 */
export function buildRequiredUpdate(value: string): Record<string, unknown> {
  if (value === "") {
    return { isRequired: false, necessityIndicator: undefined };
  }
  return { isRequired: true, necessityIndicator: value };
}
