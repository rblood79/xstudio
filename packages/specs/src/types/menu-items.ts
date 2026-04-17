/**
 * Menu Items SSOT — Stored/Runtime 인터페이스 분리
 *
 * specs 패키지가 단일 소스. shared/builder/preview 모두 여기서 import.
 * 패키지 의존 방향: shared → specs (단방향)
 *
 * @packageDocumentation
 */

/** Store 직렬화 모델 — JSON 직렬화 가능 (onAction은 id 참조) */
export interface StoredMenuItem {
  id: string;
  label: string;
  isDisabled?: boolean;
  icon?: string;
  shortcut?: string;
  description?: string;
  /** EVENT_REGISTRY (ADR-055) 참조 id — JSON 직렬화 가능 */
  onActionId?: string;
  value?: string;
  textValue?: string;
  href?: string;
  /** 서브메뉴 (재귀) */
  children?: StoredMenuItem[];
}

/** Runtime 모델 — RAC `<Menu items>{...}` 호출 직전 CollectionRenderers에서 변환 */
export interface RuntimeMenuItem extends Omit<
  StoredMenuItem,
  "onActionId" | "children"
> {
  /** CollectionRenderers에서 onActionId → 함수 변환 */
  onAction?: () => void;
  children?: RuntimeMenuItem[];
}
