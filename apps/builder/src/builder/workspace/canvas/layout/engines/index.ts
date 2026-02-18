/**
 * Layout Engine 디스패처
 *
 * display 속성에 따라 적절한 레이아웃 엔진을 선택합니다.
 *
 * Phase 9 엔진 구성:
 * - flex/inline-flex  → TaffyFlexEngine (Taffy WASM)
 * - grid/inline-grid  → TaffyGridEngine (Taffy WASM)
 * - block/inline 등   → DropflowBlockEngine (기본)
 *
 * WASM 미로드 시 DropflowBlockEngine으로 폴백.
 *
 * Phase 10 CSS Blockification:
 * - flex/grid container의 직계 자식에 대해 CSS Display Level 3 blockification 규칙 적용
 * - inline → block, inline-block → block, inline-flex → flex, inline-grid → grid
 * - 자식의 외부 display(부모 엔진의 배치 방식)는 변경하지 않음
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 * @updated 2026-02-17 Phase 9A - 레거시 엔진(BlockEngine, FlexEngine, GridEngine) 삭제
 * @updated 2026-02-19 Phase 10 - CSS Blockification 규칙 추가
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { resolveStyle, ROOT_COMPUTED_STYLE } from './cssResolver';
import { DropflowBlockEngine } from './DropflowBlockEngine';
import { TaffyFlexEngine } from './TaffyFlexEngine';
import { TaffyGridEngine } from './TaffyGridEngine';
import { isRustWasmReady } from '../../wasm-bindings/rustWasm';

// Re-export types
export type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
export type { Margin, BoxModel, VerticalAlign, LineBoxItem, LineBox } from './types';

// Re-export utilities
export {
  parseMargin,
  parsePadding,
  parseBorder,
  parseBoxModel,
  parseSize,
  calculateContentWidth,
  calculateContentHeight,
  resetWarnedTokens,
  // 🚀 Phase 6: vertical-align, line-height
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
  // 🚀 §6 P1: 버튼 size config 단일 소스
  getButtonSizeConfig,
  // 🚀 §6 P1: intrinsic size 주입 (엔진 공유)
  enrichWithIntrinsicSize,
  INLINE_BLOCK_TAGS,
} from './utils';

// 싱글톤 엔진 인스턴스
const dropflowBlockEngine = new DropflowBlockEngine();
const taffyFlexEngine = new TaffyFlexEngine();
const taffyGridEngine = new TaffyGridEngine();

/**
 * 요소가 새로운 BFC(Block Formatting Context)를 생성하는지 확인
 *
 * BFC 생성 조건: flow-root, flex, grid, inline-block, overflow 등
 */
export function createsBFC(element: Element): boolean {
  return dropflowBlockEngine.createsBFC(element);
}

/**
 * display 속성에 따라 적절한 레이아웃 엔진 선택
 *
 * - 'flex' | 'inline-flex'  → TaffyFlexEngine
 * - 'grid' | 'inline-grid'  → TaffyGridEngine
 * - 'block' | 그 외          → DropflowBlockEngine
 *
 * WASM 미로드 시 DropflowBlockEngine으로 안전하게 폴백.
 */
export function selectEngine(display: string | undefined): LayoutEngine {
  const wasmReady = isRustWasmReady();

  switch (display) {
    case 'flex':
    case 'inline-flex':
      return wasmReady ? taffyFlexEngine : dropflowBlockEngine;

    case 'grid':
    case 'inline-grid':
      return wasmReady ? taffyGridEngine : dropflowBlockEngine;

    case 'block':
    case 'inline-block':
    case 'flow-root':
    case 'inline':
      return dropflowBlockEngine;

    case undefined:
      return dropflowBlockEngine;

    default:
      return dropflowBlockEngine;
  }
}

/**
 * CSS Display Level 3 Blockification 규칙
 *
 * flex/grid container의 직계 자식은 "outer display type"이 block으로
 * 강제됩니다. 즉, inline 관련 display 값이 block 동등값으로 변환됩니다.
 *
 * 이 함수는 자식의 내부 display(inner display type)를 반환합니다.
 * 자식을 flex item / grid item으로 배치하는 부모 엔진의 동작은 바뀌지 않으며,
 * 자식 자신의 내부 레이아웃(자신의 자식들을 어떻게 배치할지)에만 적용됩니다.
 *
 * CSS Display Level 3 §2.7 Blockification:
 * - 'inline'        → 'block'
 * - 'inline-block'  → 'block'
 * - 'inline-flex'   → 'flex'
 * - 'inline-grid'   → 'grid'
 * - 그 외           → 변경 없음
 *
 * @param display - 자식 요소의 display 값
 * @returns blockified display 값
 */
export function blockifyDisplay(display: string | undefined): string | undefined {
  switch (display) {
    case 'inline':
      return 'block';
    case 'inline-block':
      return 'block';
    case 'inline-flex':
      return 'flex';
    case 'inline-grid':
      return 'grid';
    default:
      return display;
  }
}

/**
 * 부모 display가 flex 또는 grid인지 확인
 *
 * blockification을 적용할 부모 컨텍스트를 판별합니다.
 */
function isFlexOrGridContainer(display: string | undefined): boolean {
  return (
    display === 'flex' ||
    display === 'inline-flex' ||
    display === 'grid' ||
    display === 'inline-grid'
  );
}

/**
 * 요소의 자식들에 대한 레이아웃 계산
 *
 * Phase 10: 부모가 flex/grid container인 경우, 자식 각각의 display를
 * CSS Blockification 규칙에 따라 변환하여 자식의 내부 레이아웃 엔진을
 * 선택합니다. 자식의 외부 배치(부모 엔진이 결정)는 변경되지 않습니다.
 */
export function calculateChildrenLayout(
  parent: Element,
  children: Element[],
  availableWidth: number,
  availableHeight: number,
  context?: LayoutContext
): ComputedLayout[] {
  const style = parent.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  const engine = selectEngine(display);

  // ── CSS 상속 context 보강 ──────────────────────────────────────────────
  // 현재 부모 요소의 computed style을 계산하여 자식 엔진에 전달합니다.
  // 자식 엔진은 이 값을 기반으로 각 자식의 computed style을 계산합니다.
  // context가 이미 parentComputedStyle을 가지고 있으면 그것을 상속 체인에 활용합니다.
  const rawStyle = parent.props?.style as Record<string, unknown> | undefined;
  const parentComputedStyle = resolveStyle(
    rawStyle,
    context?.parentComputedStyle ?? ROOT_COMPUTED_STYLE,
  );
  const enrichedContext: LayoutContext = {
    ...(context ?? { bfcId: 'root' }),
    parentComputedStyle,
  };

  // Phase 10: flex/grid container의 직계 자식에 blockification 적용
  // 자식의 내부 display(자신의 자식들을 어떻게 배치할지)를 변환합니다.
  if (isFlexOrGridContainer(display)) {
    const blockifiedChildren = children.map((child) => {
      const childStyle = child.props?.style as Record<string, unknown> | undefined;
      const childDisplay = childStyle?.display as string | undefined;
      const blockified = blockifyDisplay(childDisplay);

      if (blockified === childDisplay) {
        return child;
      }

      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...(childStyle ?? {}),
            display: blockified,
          },
        },
      } as Element;
    });

    return engine.calculate(parent, blockifiedChildren, availableWidth, availableHeight, enrichedContext);
  }

  return engine.calculate(parent, children, availableWidth, availableHeight, enrichedContext);
}
