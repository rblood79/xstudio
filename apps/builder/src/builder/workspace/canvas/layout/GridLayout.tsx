/**
 * Grid Layout
 *
 * 🚀 Phase 11 B2.3: CSS Grid 레이아웃 (커스텀 구현)
 *
 * @pixi/layout이 CSS Grid를 지원하지 않으므로,
 * CSS Grid 속성을 파싱하여 수동으로 위치/크기를 계산합니다.
 *
 * @since 2025-12-11 Phase 11 B2.3
 */

import { memo, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { CSSStyle } from '../sprites/styleConverter';
import type { GridLayoutProps } from './GridLayout.utils';

/**
 * GridLayout 컨테이너
 *
 * CSS Grid 속성을 파싱하여 자식 요소의 위치를 계산합니다.
 */
export const GridLayout = memo(function GridLayout({ element, children }: GridLayoutProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;

  const position = useMemo(() => {
    const left = typeof style?.left === 'number'
      ? style.left
      : typeof style?.left === 'string'
        ? parseFloat(style.left)
        : 0;
    const top = typeof style?.top === 'number'
      ? style.top
      : typeof style?.top === 'string'
        ? parseFloat(style.top)
        : 0;
    return { x: left, y: top };
  }, [style?.left, style?.top]);

  return (
    <pixiContainer x={position.x} y={position.y}>
      {children}
    </pixiContainer>
  );
});

export default GridLayout;

