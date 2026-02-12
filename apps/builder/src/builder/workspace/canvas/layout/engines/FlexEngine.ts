/**
 * Flexbox 레이아웃 엔진
 *
 * @pixi/layout(Yoga 기반)이 Flexbox를 완벽히 지원하므로,
 * 이 엔진은 "위임 마커" 역할만 수행합니다.
 *
 * ## 위임 동작 방식
 *
 * BuilderCanvas에서 엔진 선택 시:
 * 1. selectEngine('flex') → FlexEngine 반환
 * 2. FlexEngine.shouldDelegate === true 확인
 * 3. 커스텀 calculate() 호출 대신 @pixi/layout의 layout prop 사용
 *
 * 이 방식의 장점:
 * - 기존 @pixi/layout 동작 유지 (검증된 Yoga 엔진)
 * - 하이브리드 아키텍처 인터페이스 통일
 * - 향후 필요 시 Yoga API 직접 호출로 전환 가능
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 */

import type { LayoutEngine, ComputedLayout } from './LayoutEngine';

/**
 * Flexbox 레이아웃 엔진 (Yoga 위임)
 */
export class FlexEngine implements LayoutEngine {
  readonly displayTypes = ['flex', 'inline-flex'];

  /**
   * @pixi/layout에 위임해야 함을 표시
   *
   * BuilderCanvas에서 이 플래그를 확인하여
   * calculate() 대신 기존 layout prop 방식 사용
   */
  readonly shouldDelegate = true;

  calculate(): ComputedLayout[] {
    // 이 메서드는 호출되지 않음 (shouldDelegate === true)
    // 만약 호출된다면 경고 로그 출력 (개발 모드에서만)
    if (import.meta.env.DEV) {
      console.warn(
        '[FlexEngine] calculate() called directly. ' +
          'Use @pixi/layout instead (shouldDelegate === true)'
      );
    }
    return [];
  }
}

/**
 * 엔진이 @pixi/layout에 위임해야 하는지 확인
 */
export function shouldDelegateToPixiLayout(engine: LayoutEngine): boolean {
  return 'shouldDelegate' in engine && (engine as FlexEngine).shouldDelegate;
}
