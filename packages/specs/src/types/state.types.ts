/**
 * State Types
 *
 * 컴포넌트 상태 및 상태별 스타일 정의
 *
 * @packageDocumentation
 */

import type { ShadowTokenRef } from './token.types';

/**
 * 상태별 스타일 정의
 *
 * [역할 분리]
 * - VariantSpec: variant별 "색상" 정의 (background, text, border)
 * - StateStyles: 상태별 "효과" 정의 (transform, shadow, opacity 등)
 *
 * 두 가지가 합성되어 최종 스타일이 결정됩니다.
 */
export interface StateStyles {
  /** hover 상태 효과 (VariantSpec.backgroundHover와 합성) */
  hover?: StateEffect;

  /** pressed 상태 효과 (VariantSpec.backgroundPressed와 합성) */
  pressed?: StateEffect;

  /** focused 상태 효과 */
  focused?: StateEffect;

  /** disabled 상태 효과 */
  disabled?: StateEffect;

  /** focus-visible 상태 효과 (키보드 포커스) */
  focusVisible?: StateEffect;
}

/**
 * 상태 효과 (색상 제외 - 색상은 VariantSpec에서 정의)
 */
export interface StateEffect {
  /** 변형 */
  transform?: string;

  /** 그림자 (CSS box-shadow 형식 또는 토큰 참조 {shadow.md}) */
  boxShadow?: string | ShadowTokenRef;

  /** 투명도 (0-1) */
  opacity?: number;

  /** 스케일 (1 = 100%) */
  scale?: number;

  /** 아웃라인 (focus ring) */
  outline?: string;
  outlineOffset?: string;

  /** 커서 */
  cursor?: string;

  /** 트랜지션 (기본값 사용 시 생략) */
  transition?: string;

  /** 포인터 이벤트 */
  pointerEvents?: 'none' | 'auto';
}
