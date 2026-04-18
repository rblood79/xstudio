/**
 * ListBox Items SSOT — Stored/Runtime 인터페이스 분리 (ADR-076 P1)
 *
 * specs 패키지가 단일 소스. shared/builder/preview 모두 여기서 import.
 * 패키지 의존 방향: shared → specs (단방향)
 *
 * ADR-073 select-items.ts / combobox-items.ts 와 1:1 정합.
 * ListBox 는 onAction 연동 미사용 (정적 모드 = 선택만, 템플릿 모드 = Field 자식 렌더) →
 * onActionId/onAction 필드는 포함하지 않음. 향후 필요 시 Select/ComboBox 선례로 확장 가능.
 *
 * @packageDocumentation
 */

/** Store 직렬화 모델 — JSON 직렬화 가능 */
export interface StoredListBoxItem {
  id: string;
  label: string;
  value?: string;
  /** 검색 가능한 텍스트 (RAC `textValue`) */
  textValue?: string;
  isDisabled?: boolean;
  /** 항목 부가 설명 (Text slot="description" 대응) */
  description?: string;
  /** 링크 항목용 (RAC `<ListBoxItem href>`) */
  href?: string;
}

/** Runtime 모델 — RAC `<ListBox items>{...}` 호출 직전 SelectionRenderers 에서 변환 */
export interface RuntimeListBoxItem extends StoredListBoxItem {
  /** items 배열 내 위치 (0-based). selectedIndex legacy 변환에 사용 */
  index: number;
}

/**
 * Stored → Runtime 변환
 * @param stored 저장 모델
 * @param index items 배열 내 위치
 */
export function toRuntimeListBoxItem(
  stored: StoredListBoxItem,
  index: number,
): RuntimeListBoxItem {
  return { ...stored, index };
}
