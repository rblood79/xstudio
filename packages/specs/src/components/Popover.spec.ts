/**
 * Popover Component Spec
 *
 * Material Design 3 기반 팝오버 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * Popover Props
 */
export interface PopoverProps {
  variant?: 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  placement?: 'top' | 'right' | 'bottom' | 'left';
  showArrow?: boolean;
}

/**
 * Popover Component Spec
 *
 * height: 0 = auto
 * overlay: popover (포털, 포커스 트랩, 백드롭 클릭 닫기)
 */
export const PopoverSpec: ComponentSpec<PopoverProps> = {
  name: 'Popover',
  description: 'Material Design 3 기반 팝오버 컴포넌트',
  element: 'div',

  defaultVariant: 'surface',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'popover',
    hasBackdrop: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    trapFocus: true,
    pixiLayer: 'overlay',
  },

  variants: {
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 20,
      paddingY: 20,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 16,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [
        // Shadow
        {
          type: 'shadow' as const,
          target: 'bg',
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.15)',
          alpha: 0.15,
        },
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: resolveStateColors(variant, state).background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border ?? '{color.outline-variant}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
      ];
      if (hasChildren) return shapes;

      // 콘텐츠 컨테이너 (standalone 전용)
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: 'column',
          gap: size.gap,
          padding: size.paddingY,
        },
      });

      // Phase F: Arrow indicator (placement 기반 V자 2-line 화살표)
      // showArrow가 명시적으로 true일 때만 렌더링
      if (props.showArrow === true) {
        const arrowSize = 8;
        const bgFill = resolveStateColors(variant, state).background;
        const placement = props.placement ?? 'bottom';

        // placement에 따라 중심 기준 arrow 좌표 계산 (컨테이너 중앙 기준)
        // 컨테이너 너비/높이를 모르므로 고정 중심점 사용 (런타임에서 오버라이드 가능)
        const cx = 80; // 고정 중심 X (대부분 popover 기준)
        const cy = 80; // 고정 중심 Y

        if (placement === 'bottom') {
          // popover가 아래에 위치 → arrow는 위쪽 (y=0 근처)
          shapes.push(
            { type: 'line' as const, x1: cx - arrowSize, y1: 0, x2: cx, y2: -arrowSize, stroke: bgFill, strokeWidth: 2 },
            { type: 'line' as const, x1: cx + arrowSize, y1: 0, x2: cx, y2: -arrowSize, stroke: bgFill, strokeWidth: 2 },
          );
        } else if (placement === 'top') {
          // popover가 위에 위치 → arrow는 아래쪽
          shapes.push(
            { type: 'line' as const, x1: cx - arrowSize, y1: cy, x2: cx, y2: cy + arrowSize, stroke: bgFill, strokeWidth: 2 },
            { type: 'line' as const, x1: cx + arrowSize, y1: cy, x2: cx, y2: cy + arrowSize, stroke: bgFill, strokeWidth: 2 },
          );
        } else if (placement === 'right') {
          // popover가 오른쪽에 위치 → arrow는 왼쪽
          shapes.push(
            { type: 'line' as const, x1: 0, y1: cy - arrowSize, x2: -arrowSize, y2: cy, stroke: bgFill, strokeWidth: 2 },
            { type: 'line' as const, x1: 0, y1: cy + arrowSize, x2: -arrowSize, y2: cy, stroke: bgFill, strokeWidth: 2 },
          );
        } else {
          // placement === 'left': popover가 왼쪽에 위치 → arrow는 오른쪽
          shapes.push(
            { type: 'line' as const, x1: cx, y1: cy - arrowSize, x2: cx + arrowSize, y2: cy, stroke: bgFill, strokeWidth: 2 },
            { type: 'line' as const, x1: cx, y1: cy + arrowSize, x2: cx + arrowSize, y2: cy, stroke: bgFill, strokeWidth: 2 },
          );
        }
      }

      return shapes;
    },

    react: (props) => ({
      'data-placement': props.placement || 'bottom',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
