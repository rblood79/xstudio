/**
 * Component Spec Types
 *
 * 컴포넌트 스펙 정의 - Single Source of Truth
 * React와 PIXI 모두에서 동일한 시각적 결과를 보장
 *
 * @packageDocumentation
 */

import type { Shape } from "./shape.types";
import type { TokenRef } from "./token.types";
import type { StateStyles } from "./state.types";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * 컴포넌트 상태
 * - default: 기본 상태
 * - hover: 마우스 오버
 * - pressed: 클릭/터치 중
 * - focused: 포커스 (마우스/터치)
 * - focusVisible: 키보드 포커스 (접근성)
 * - disabled: 비활성화
 */
export type ComponentState =
  | "default"
  | "hover"
  | "pressed"
  | "focused"
  | "focusVisible"
  | "disabled";

/**
 * ADR-036: CSS 생성 시 Archetype 템플릿 선택에 사용
 */
export type ArchetypeId =
  | "simple" // Badge, Tag, Separator, Skeleton, ColorSwatch, Icon
  | "button" // Button, ToggleButton, Link
  | "input-base" // Input (TextField, ColorField 등 내부)
  | "toggle-indicator" // Switch, Checkbox, Radio
  | "progress" // ProgressBar, ProgressCircle, Meter
  | "slider" // Slider (+ Track/Thumb)
  | "tabs-indicator" // Tab (+ SelectionIndicator)
  | "collection" // ListBox/Item, Menu/Item
  | "overlay" // Popover, Dialog, Toast
  | "calendar" // Calendar/Cell
  | "alert"; // InlineAlert

/**
 * 컴포넌트 스펙 - 단일 소스
 */
export interface ComponentSpec<Props = Record<string, unknown>> {
  /** 컴포넌트 이름 */
  name: string;

  /** 컴포넌트 설명 */
  description?: string;

  /** ADR-036: CSS 생성 시 Archetype 템플릿 선택 */
  archetype?: ArchetypeId;

  /**
   * CSS 자동 생성 건너뛰기
   *
   * Container/Composite 컴포넌트는 구조 레이아웃을 수동 CSS가 담당하고,
   * Spec은 Skia 렌더링(render.shapes)용으로만 사용된다.
   * true 시 CSSGenerator가 이 Spec의 CSS 파일을 생성하지 않음.
   */
  skipCSSGeneration?: boolean;

  /** 기본 HTML 태그 (React용) */
  element: keyof HTMLElementTagNameMap | "fragment";

  /**
   * 포털/오버레이 설정 (Dialog, Tooltip, Popover 등)
   * React에서는 createPortal, PIXI에서는 별도 레이어로 처리
   */
  overlay?: {
    /** 포털 사용 여부 */
    usePortal: boolean;

    /** 포털 컨테이너 (기본: document.body) */
    portalContainer?: string;

    /** 오버레이 타입 */
    type: "modal" | "popover" | "tooltip" | "drawer" | "toast";

    /** 백드롭 표시 여부 */
    hasBackdrop?: boolean;

    /** 백드롭 클릭 시 닫기 */
    closeOnBackdropClick?: boolean;

    /** ESC 키로 닫기 */
    closeOnEscape?: boolean;

    /** 포커스 트랩 사용 */
    trapFocus?: boolean;

    /** PIXI에서의 렌더링 레이어 (z-index 개념) */
    pixiLayer?: "content" | "overlay" | "modal" | "toast";
  };

  /** Variant 정의 */
  variants: Record<string, VariantSpec>;

  /** Size 정의 */
  sizes: Record<string, SizeSpec>;

  /** 기본 variant */
  defaultVariant: string;

  /** 기본 size */
  defaultSize: string;

  /** 상태별 스타일 (hover, pressed, disabled 등) */
  states: StateStyles;

  /** ADR-036 Phase 3a: Tier 2 Composite CSS 생성용 메타데이터 */
  composition?: CompositionSpec;

  /** ADR-041: Property Editor 자동 생성용 schema */
  properties?: PropertySchema;

  /** ADR-048: S2 Context 에뮬레이션 — 부모→자식 props 전파 규칙 */
  propagation?: PropagationSpec;

  /** 렌더링 정의 */
  render: RenderSpec<Props>;
}

// ─── ADR-041: PropertySchema 타입 ───────────────────────────────────────────

/** S2 기준 표준 섹션 타이틀 (도메인 고유 섹션은 자유 문자열) */
export const SECTION_TITLES = {
  CONTENT: "Content",
  APPEARANCE: "Appearance",
  STATE: "State",
  LOCALE: "Locale",
} as const;

export interface PropertySchema {
  sections: SectionDef[];
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
  visibleWhen?: VisibilityCondition;
}

export interface BaseFieldDef {
  key: string;
  label?: string;
  icon?: LucideIcon;
  /** props에 값이 없을 때 에디터에 표시할 기본값 */
  defaultValue?: unknown;
  visibleWhen?: VisibilityCondition;
  emptyToUndefined?: boolean;
  updatePath?: [string, ...string[]];
  derivedUpdateFn?: DerivedUpdateFn;
}

export type VisibilityCondition = {
  key?: string;
  equals?: string | number | boolean;
  notEquals?: string | number | boolean;
  oneOf?: Array<string | number | boolean>;
  truthy?: boolean;
  parentTag?: string;
  parentTagNot?: string;
};

export interface VariantField extends Omit<BaseFieldDef, "key"> {
  type: "variant";
  key?: string;
}

export interface SizeField extends Omit<BaseFieldDef, "key"> {
  type: "size";
  key?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface BooleanField extends BaseFieldDef {
  type: "boolean";
}

export interface EnumField extends BaseFieldDef {
  type: "enum";
  options: Array<{ value: string; label: string }>;
  valueTransform?: "number";
}

export interface StringField extends BaseFieldDef {
  type: "string";
  placeholder?: string;
  multiline?: boolean;
}

/** string-array — 쉼표 구분 문자열 ↔ string[] 변환 (예: filterFields) */
export interface StringArrayField extends BaseFieldDef {
  type: "string-array";
  placeholder?: string;
  /** 구분자. 기본값: "," */
  separator?: string;
}

export interface NumberField extends BaseFieldDef {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface IconField extends BaseFieldDef {
  type: "icon";
  clearKeys?: string[];
}

export interface CustomFieldComponentProps {
  elementId: string;
  currentProps: Record<string, unknown>;
  value: unknown;
  onUpdate: (updates: Record<string, unknown>) => void;
}

export interface CustomField extends BaseFieldDef {
  type: "custom";
  component: ComponentType<CustomFieldComponentProps>;
}

export interface ChildrenManagerField extends BaseFieldDef {
  type: "children-manager";
  /** 자식 Element의 태그명 (e.g. "Checkbox", "Radio", "ToggleButton") */
  childTag: string;
  /** 새 자식 추가 시 기본 props */
  defaultChildProps?: Record<string, unknown>;
  /** 자식 목록에서 레이블로 표시할 prop 키 (e.g. "children") */
  labelProp?: string;
  /** 중첩 자식 허용 여부 (Tree 등) */
  allowNested?: boolean;
}

export type DerivedUpdateFn = (
  value: unknown,
  currentProps: Record<string, unknown>,
) => Record<string, unknown>;

export type FieldDef =
  | VariantField
  | SizeField
  | BooleanField
  | EnumField
  | StringField
  | StringArrayField
  | NumberField
  | IconField
  | CustomField
  | ChildrenManagerField;

// ─── ADR-036: Tier 2 Composite CSS 타입 ─────────────────────────────────────

/**
 * Composite 컴포넌트의 CSS 생성 메타데이터
 * 모든 Composite는 동일 패턴: Container(layout) + Primitive[] + --var override
 */
export interface CompositionSpec {
  /** container layout 규칙 */
  layout: "flex-column" | "flex-row" | "grid" | "inline-flex";

  /** gap (optional) */
  gap?: string;

  /** CSS Variable Delegation — size별 자식 변수 override */
  delegation: DelegationSpec[];
}

/**
 * 자식 Primitive에 대한 CSS 변수 위임
 */
export interface DelegationSpec {
  /** 자식 CSS 선택자 (예: '.react-aria-Button', '.react-aria-Input') */
  childSelector: string;

  /** size → { CSS변수명 → 값 } 매핑 */
  variables: Record<string, Record<string, string>>;
}

// ─── ADR-048: S2 Context 기반 선언적 Props Propagation ──────────────────────

/** S2 Context 에뮬레이션: 선언적 부모→자식 props 전파 규칙 */
export interface PropagationRule {
  /** 부모 prop 키 (e.g., "size", "variant", "locale") */
  parentProp: string;

  /** 대상 자식 태그 경로. 문자열 = 직접 자식, 배열 = 중첩 경로 */
  childPath: string | string[];

  /** 자식에 설정할 prop 키 (기본: parentProp과 동일) */
  childProp?: string;

  /** 부모 값 → 자식 값 변환 (e.g., size "md" → fontSize 14) */
  transform?: (
    parentValue: unknown,
    parentProps: Record<string, unknown>,
  ) => unknown;

  /** true: style 객체 내 속성으로 설정 */
  asStyle?: boolean;

  /** true: 자식 자체 값을 무시하고 항상 덮어쓰기 (기본 미설정 = 자식 값 우선) */
  override?: boolean;
}

/** 부모→자식 props 전파 규칙 집합 */
export interface PropagationSpec {
  rules: PropagationRule[];
}

/**
 * Variant 스펙
 *
 * [상태 스타일 우선순위 규칙]
 * VariantSpec의 색상은 "variant별 색상 토큰"을 정의합니다.
 * states의 스타일은 "공통 상태 효과"(transform, shadow, opacity 등)를 정의합니다.
 *
 * 우선순위: VariantSpec 색상 > states 효과 (합성)
 * - hover 시: VariantSpec.backgroundHover + states.hover 효과
 * - pressed 시: VariantSpec.backgroundPressed + states.pressed 효과
 */
export interface VariantSpec {
  /** 배경색 (토큰 참조) - default 상태 */
  background: TokenRef;

  /** 배경색 hover - hover 상태의 색상 (states.hover와 합성됨) */
  backgroundHover: TokenRef;

  /** 배경색 pressed - pressed 상태의 색상 (states.pressed와 합성됨) */
  backgroundPressed: TokenRef;

  /** 텍스트 색상 */
  text: TokenRef;

  /** 텍스트 색상 hover (optional, 미지정 시 text 사용) */
  textHover?: TokenRef;

  /** 테두리 색상 (optional) */
  border?: TokenRef;

  /** 테두리 색상 hover (optional) */
  borderHover?: TokenRef;

  /** 배경 투명도 (optional, 0-1) */
  backgroundAlpha?: number;

  // ─── ADR-036 Phase 2b: fillStyle 확장 ───

  /** outline fillStyle — 배경색 (optional, 기본: transparent) */
  outlineBackground?: TokenRef;

  /** outline fillStyle — 텍스트 색상 (optional) */
  outlineText?: TokenRef;

  /** outline fillStyle — 테두리 색상 (optional) */
  outlineBorder?: TokenRef;

  /** subtle fillStyle — 배경색 (optional) */
  subtleBackground?: TokenRef;

  /** subtle fillStyle — 텍스트 색상 (optional) */
  subtleText?: TokenRef;
}

/**
 * Size 스펙
 *
 * ADR-036: SizeSpec은 Skia+CSS 공통 속성만 포함한다.
 * Archetype 전용 치수(trackWidth, thumbSize 등)는 ComponentSpec.dimensions에 별도 정의.
 */
export interface SizeSpec {
  /** 높이 (px) */
  height: number;

  /** 가로 패딩 (px) — 대칭 패딩 */
  paddingX: number;

  /** 세로 패딩 (px) */
  paddingY: number;

  /** 폰트 크기 (토큰 참조) */
  fontSize: TokenRef;

  /** 둥근 모서리 (토큰 참조) */
  borderRadius: TokenRef;

  /** 아이콘 크기 (optional) */
  iconSize?: number;

  /** 간격 (optional) */
  gap?: number;

  /** CSS line-height + Skia strutStyle (optional) — TokenRef 또는 resolved px number */
  lineHeight?: TokenRef | number;

  /** CSS font-weight + Skia TextStyle.fontWeight (optional) */
  fontWeight?: number;

  /** CSS letter-spacing + Skia TextStyle.letterSpacing (optional) */
  letterSpacing?: number;

  /** CSS border-width + Skia BorderShape.borderWidth (optional) */
  borderWidth?: number;

  /** 최소 너비 (optional, px) */
  minWidth?: number;

  /** 최소 높이 (optional, px) */
  minHeight?: number;

  /** 비대칭 좌측 패딩 — paddingX 대신 사용 (optional, px) */
  paddingLeft?: number;

  /** 비대칭 우측 패딩 — paddingX 대신 사용 (optional, px) */
  paddingRight?: number;

  /** 아이콘-텍스트 간격 — gap과 구분 (optional, px) */
  iconGap?: number;

  /** 아이콘 전용 패딩 — icon-only 모드 (optional, px) */
  iconOnlyPadding?: number;

  // --- 컴포넌트별 확장 속성 (ADR-036: [key: string]: any 제거 후 명시적 선언) ---

  /** 너비 (optional, px) — Avatar, Image, ContextualHelp, ProgressCircle 등 */
  width?: number;

  /** 도트 크기 (optional, px) — StatusLight */
  dotSize?: number;

  /** 헤딩 폰트 크기 (optional) — IllustratedMessage, InlineAlert */
  headingFontSize?: TokenRef | number;

  /** 헤딩 폰트 굵기 (optional, px) — InlineAlert */
  headingFontWeight?: number;

  /** 설명 폰트 크기 (optional, px) — InlineAlert */
  descFontSize?: number;

  /** 설명 폰트 굵기 (optional, px) — InlineAlert */
  descFontWeight?: number;

  /** 액센트 바 너비 (optional, px) — InlineAlert */
  accentWidth?: number;

  /** 스트로크 너비 (optional, px) — ProgressCircle 등 원형/호 도형 */
  strokeWidth?: number;
}

/**
 * 렌더링 스펙
 */
export interface RenderSpec<Props> {
  /**
   * 공통 도형 정의
   * React와 PIXI 모두에서 사용하는 도형 구조
   *
   * @param props - 컴포넌트 props
   * @param variant - 현재 variant 스펙
   * @param size - 현재 size 스펙
   * @param state - 현재 상태 (default, hover, pressed, focused, focusVisible, disabled)
   * @returns 렌더링할 도형 배열
   */
  shapes: (
    props: Props,
    variant: VariantSpec,
    size: SizeSpec,
    state: ComponentState,
  ) => Shape[];

  /**
   * React 특화 속성
   * className, data-* 속성 등
   */
  react?: (props: Props) => Record<string, unknown>;

  /**
   * PIXI 특화 속성
   * hitArea, eventMode 등
   */
  pixi?: (props: Props) => Record<string, unknown>;
}
