/**
 * Component Spec Types
 *
 * 컴포넌트 스펙 정의 - Single Source of Truth
 * React와 PIXI 모두에서 동일한 시각적 결과를 보장
 *
 * @packageDocumentation
 */

import type { Shape } from './shape.types';
import type { TokenRef } from './token.types';
import type { StateStyles } from './state.types';

/**
 * 컴포넌트 상태
 * - default: 기본 상태
 * - hover: 마우스 오버
 * - pressed: 클릭/터치 중
 * - focused: 포커스 (마우스/터치)
 * - focusVisible: 키보드 포커스 (접근성)
 * - disabled: 비활성화
 */
export type ComponentState = 'default' | 'hover' | 'pressed' | 'focused' | 'focusVisible' | 'disabled';

/**
 * 컴포넌트 스펙 - 단일 소스
 */
export interface ComponentSpec<Props = Record<string, unknown>> {
  /** 컴포넌트 이름 */
  name: string;

  /** 컴포넌트 설명 */
  description?: string;

  /** 기본 HTML 태그 (React용) */
  element: keyof HTMLElementTagNameMap | 'fragment';

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
    type: 'modal' | 'popover' | 'tooltip' | 'drawer' | 'toast';

    /** 백드롭 표시 여부 */
    hasBackdrop?: boolean;

    /** 백드롭 클릭 시 닫기 */
    closeOnBackdropClick?: boolean;

    /** ESC 키로 닫기 */
    closeOnEscape?: boolean;

    /** 포커스 트랩 사용 */
    trapFocus?: boolean;

    /** PIXI에서의 렌더링 레이어 (z-index 개념) */
    pixiLayer?: 'content' | 'overlay' | 'modal' | 'toast';
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

  /** 렌더링 정의 */
  render: RenderSpec<Props>;
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
}

/**
 * Size 스펙
 */
export interface SizeSpec {
  /** 높이 (px) */
  height: number;

  /** 가로 패딩 (px) */
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

  /** 컴포넌트별 추가 속성 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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
  shapes: (props: Props, variant: VariantSpec, size: SizeSpec, state: ComponentState) => Shape[];

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
