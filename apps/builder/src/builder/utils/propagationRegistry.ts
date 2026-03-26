/**
 * ADR-048: Propagation Registry
 *
 * Spec의 propagation 규칙을 정방향/역방향 인덱스로 관리한다.
 * lazy 초기화 — 첫 호출 시 1회만 빌드.
 * 모든 키는 소문자로 정규화.
 */
import type { ComponentSpec, PropagationRule } from "@xstudio/specs";
import {
  // Phase 1: DatePicker
  DatePickerSpec,
  DateRangePickerSpec,
  // Phase 2: 기존 delegation 컴포넌트
  SelectSpec,
  ComboBoxSpec,
  SearchFieldSpec,
  CheckboxGroupSpec,
  RadioGroupSpec,
  TagGroupSpec,
  CheckboxSpec,
  RadioSpec,
  SwitchSpec,
  TextFieldSpec,
  TextAreaSpec,
  NumberFieldSpec,
  DateFieldSpec,
  TimeFieldSpec,
  ColorFieldSpec,
  SliderSpec,
  ProgressBarSpec,
  MeterSpec,
} from "@xstudio/specs";

// ─── Lazy Index ─────────────────────────────────────────────────────────────

/** 정방향: parentTag(소문자) → PropagationRule[] */
let forwardIndex: Map<string, PropagationRule[]> | null = null;

/** 역방향: childTag(소문자) → Set<parentTag(소문자)> — 직접 자식 규칙만 */
let reverseIndex: Map<string, Set<string>> | null = null;

/** 등록된 모든 spec (registerPropagationSpec으로 추가) */
const specEntries: Array<[string, ComponentSpec<Record<string, unknown>>]> = [];

// ─── Registration ───────────────────────────────────────────────────────────

/**
 * Propagation 규칙이 있는 Spec을 등록한다.
 * 앱 초기화 시 또는 Spec 정의 시점에 호출.
 * 등록 후 인덱스가 이미 빌드된 상태면 재빌드를 예약한다.
 */
export function registerPropagationSpec<P = Record<string, unknown>>(
  tag: string,
  spec: ComponentSpec<P>,
): void {
  if (!spec.propagation) return;
  specEntries.push([tag, spec as ComponentSpec<Record<string, unknown>>]);
  // 이미 빌드된 인덱스가 있으면 무효화하여 다음 조회 시 재빌드
  if (forwardIndex) {
    forwardIndex = null;
    reverseIndex = null;
  }
}

// ─── Index Build ────────────────────────────────────────────────────────────

function ensureBuilt(): void {
  if (forwardIndex) return;

  forwardIndex = new Map();
  reverseIndex = new Map();

  for (const [tag, spec] of specEntries) {
    if (!spec.propagation) continue;
    const key = tag.toLowerCase();
    forwardIndex.set(key, spec.propagation.rules);

    for (const rule of spec.propagation.rules) {
      // 역방향 인덱스: childPath가 단일 문자열인 규칙만 포함
      // 중첩 경로(배열)는 Inspector의 buildPropagationUpdates에서만 해석
      if (typeof rule.childPath === "string") {
        const childKey = rule.childPath.toLowerCase();
        let parents = reverseIndex.get(childKey);
        if (!parents) {
          parents = new Set();
          reverseIndex.set(childKey, parents);
        }
        parents.add(key);
      }
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** 정방향: parentTag → PropagationRule[] */
export function getPropagationRules(
  parentTag: string,
): PropagationRule[] | undefined {
  ensureBuilt();
  return forwardIndex!.get(parentTag.toLowerCase());
}

/** 역방향: childTag → Set<parentTag> (ElementSprite 역탐색용) */
export function getParentTagsForChild(
  childTag: string,
): Set<string> | undefined {
  ensureBuilt();
  return reverseIndex!.get(childTag.toLowerCase());
}

/** 테스트용: 인덱스 초기화 */
export function _resetPropagationRegistry(): void {
  forwardIndex = null;
  reverseIndex = null;
  specEntries.length = 0;
}

// ─── Auto-register specs with propagation rules ────────────────────────────
registerPropagationSpec("DatePicker", DatePickerSpec);
registerPropagationSpec("DateRangePicker", DateRangePickerSpec);
registerPropagationSpec("Select", SelectSpec);
registerPropagationSpec("ComboBox", ComboBoxSpec);
registerPropagationSpec("SearchField", SearchFieldSpec);
registerPropagationSpec("CheckboxGroup", CheckboxGroupSpec);
registerPropagationSpec("RadioGroup", RadioGroupSpec);
registerPropagationSpec("TagGroup", TagGroupSpec);
registerPropagationSpec("Checkbox", CheckboxSpec);
registerPropagationSpec("Radio", RadioSpec);
registerPropagationSpec("Switch", SwitchSpec);
registerPropagationSpec("TextField", TextFieldSpec);
registerPropagationSpec("TextArea", TextAreaSpec);
registerPropagationSpec("NumberField", NumberFieldSpec);
registerPropagationSpec("DateField", DateFieldSpec);
registerPropagationSpec("TimeField", TimeFieldSpec);
registerPropagationSpec("ColorField", ColorFieldSpec);
registerPropagationSpec("Slider", SliderSpec);
registerPropagationSpec("ProgressBar", ProgressBarSpec);
registerPropagationSpec("Meter", MeterSpec);
