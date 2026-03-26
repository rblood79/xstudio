import type { ComponentSpec } from "@xstudio/specs";
import {
  BadgeSpec,
  ColorFieldSpec,
  DialogSpec,
  FormSpec,
  LinkSpec,
  MeterSpec,
  PopoverSpec,
  ProgressBarSpec,
  SeparatorSpec,
  StatusLightSpec,
  ToastSpec,
  TooltipSpec,
} from "@xstudio/specs";

/**
 * ADR-041 1차 자동 생성 대상용 Property Editor spec registry.
 *
 * 아직 전체 TAG → Spec registry를 대체하지는 않는다.
 * 1차 전환 대상 12개만 명시적으로 관리해 GenericPropertyEditor 도입의 시작점으로 사용한다.
 */
export const PROPERTY_EDITOR_SPEC_MAP: Record<
  string,
  ComponentSpec<Record<string, unknown>>
> = {
  Badge: BadgeSpec as ComponentSpec<Record<string, unknown>>,
  ColorField: ColorFieldSpec as ComponentSpec<Record<string, unknown>>,
  Dialog: DialogSpec as ComponentSpec<Record<string, unknown>>,
  Form: FormSpec as ComponentSpec<Record<string, unknown>>,
  Link: LinkSpec as ComponentSpec<Record<string, unknown>>,
  Meter: MeterSpec as ComponentSpec<Record<string, unknown>>,
  Popover: PopoverSpec as ComponentSpec<Record<string, unknown>>,
  ProgressBar: ProgressBarSpec as ComponentSpec<Record<string, unknown>>,
  Separator: SeparatorSpec as ComponentSpec<Record<string, unknown>>,
  StatusLight: StatusLightSpec as ComponentSpec<Record<string, unknown>>,
  Toast: ToastSpec as ComponentSpec<Record<string, unknown>>,
  Tooltip: TooltipSpec as ComponentSpec<Record<string, unknown>>,
};

export function getPropertyEditorSpec(
  tag: string,
): ComponentSpec<Record<string, unknown>> | null {
  return PROPERTY_EDITOR_SPEC_MAP[tag] ?? null;
}
