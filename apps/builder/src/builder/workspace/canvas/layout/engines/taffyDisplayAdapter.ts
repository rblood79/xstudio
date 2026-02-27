/**
 * CSS display 값 → Taffy 내부 표현 변환 레이어
 *
 * Presentation 레이어(style panel, CSS export, Preview)는 원본 CSS display 값을
 * 그대로 유지하고, Taffy 엔진 레이어에서만 이 모듈을 통해 내부 변환을 적용한다.
 *
 * 변환 원칙:
 * - inline-block 자식 자체 → block 리프 (크기 고정)
 * - inline-block 자식을 가진 부모 → flex row wrap (inline flow 시뮬레이션)
 * - block / flow-root → block
 * - inline → block (Taffy는 inline 개념 없음)
 * - flex / inline-flex → flex
 * - grid / inline-grid → grid
 * - none → none
 * - 미인식 값 → DEV 경고 후 block 폴백
 *
 * @see ADR-005 (docs/adr/005-taffy-display-adapter.md)
 * @since 2026-02-28
 */

// ============================================
// 타입 정의
// ============================================

/**
 * Taffy 엔진에 전달하는 display 설정
 *
 * taffyDisplay는 Taffy가 이해하는 display 모드이며,
 * 나머지 필드는 부모-자식 관계에 따라 주입되는 암묵적 flex 속성이다.
 */
export interface TaffyDisplayConfig {
  /** Taffy 내부 display 모드 */
  taffyDisplay: 'flex' | 'block' | 'grid' | 'none';
  /** flex 방향 (taffyDisplay === 'flex'일 때 유효) */
  flexDirection?: 'row' | 'column';
  /** flex 줄바꿈 (taffyDisplay === 'flex'일 때 유효) */
  flexWrap?: 'nowrap' | 'wrap';
  /** 교차축 정렬 (taffyDisplay === 'flex'일 때 유효) */
  alignItems?: 'baseline' | 'stretch' | 'center';
  /** flex 확장 비율 (inline-block 리프 고정 크기용) */
  flexGrow?: number;
  /** flex 축소 비율 (inline-block 리프 고정 크기용) */
  flexShrink?: number;
}

// ============================================
// 내부 상수
// ============================================

/** block 폴백 결과 (미인식 display 값 및 inline → block) */
const BLOCK_FALLBACK: TaffyDisplayConfig = { taffyDisplay: 'block' };

/** inline-block 자식을 가진 부모가 사용하는 flex row wrap 설정 */
const INLINE_BLOCK_PARENT_CONFIG: TaffyDisplayConfig = {
  taffyDisplay: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'baseline',
};

/** inline-block 자신이 사용하는 크기 고정 block 리프 설정 */
const INLINE_BLOCK_LEAF_CONFIG: TaffyDisplayConfig = {
  taffyDisplay: 'block',
  flexGrow: 0,
  flexShrink: 0,
};

// ============================================
// 유틸리티
// ============================================

/**
 * 자식 display 목록에 inline-block이 하나라도 포함되어 있는지 판별
 *
 * @param childDisplays - 자식 요소들의 CSS display 값 배열
 * @returns inline-block 자식 존재 여부
 */
function hasInlineBlockChild(childDisplays: string[]): boolean {
  for (let i = 0; i < childDisplays.length; i++) {
    if (childDisplays[i] === 'inline-block') return true;
  }
  return false;
}

// ============================================
// 메인 변환 함수
// ============================================

/**
 * CSS display 값을 Taffy 엔진 내부 표현으로 변환한다.
 *
 * 변환은 **부모-자식 쌍** 단위로 이루어진다:
 * - 요소 자신의 display와, 자식들의 display 목록을 함께 받아
 *   Taffy가 이해할 수 있는 설정 객체를 반환한다.
 *
 * childDisplays가 비어 있거나 inline-block을 포함하지 않으면
 * display 자체의 1:1 변환 규칙을 적용한다.
 *
 * @param display - 요소의 CSS display 값 (e.g. 'block', 'flex', 'inline-block')
 * @param childDisplays - 직계 자식 요소들의 CSS display 값 배열
 * @returns Taffy 엔진에 전달할 TaffyDisplayConfig
 *
 * @example
 * // inline-block 자신 → block 리프
 * toTaffyDisplay('inline-block', [])
 * // { taffyDisplay: 'block', flexGrow: 0, flexShrink: 0 }
 *
 * @example
 * // block 부모 + inline-block 자식 → flex row wrap
 * toTaffyDisplay('block', ['inline-block', 'inline-block'])
 * // { taffyDisplay: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }
 *
 * @example
 * // flex 컨테이너
 * toTaffyDisplay('flex', ['block', 'block'])
 * // { taffyDisplay: 'flex' }
 */
export function toTaffyDisplay(
  display: string,
  childDisplays: string[],
): TaffyDisplayConfig {
  const normalized = display.trim().toLowerCase();

  // 규칙 1: inline-block 자신 → 크기 고정 block 리프
  // (부모가 flex row wrap으로 전환된 컨테이너 안에 들어감)
  if (normalized === 'inline-block') {
    return INLINE_BLOCK_LEAF_CONFIG;
  }

  // 규칙 2: block 부모 + inline-block 자식 → flex row wrap으로 inline flow 시뮬레이션
  // (Taffy는 native inline layout을 지원하지 않으므로 flex로 근사)
  if (normalized === 'block' && hasInlineBlockChild(childDisplays)) {
    return INLINE_BLOCK_PARENT_CONFIG;
  }

  // 규칙 3: block / flow-root → block
  if (normalized === 'block' || normalized === 'flow-root') {
    return BLOCK_FALLBACK;
  }

  // 규칙 4: inline → block (Taffy는 inline 모드 없음)
  if (normalized === 'inline') {
    return BLOCK_FALLBACK;
  }

  // 규칙 5: flex / inline-flex → flex
  if (normalized === 'flex' || normalized === 'inline-flex') {
    return { taffyDisplay: 'flex' };
  }

  // 규칙 6: grid / inline-grid → grid
  if (normalized === 'grid' || normalized === 'inline-grid') {
    return { taffyDisplay: 'grid' };
  }

  // 규칙 7: none → none
  if (normalized === 'none') {
    return { taffyDisplay: 'none' };
  }

  // 규칙 8: 미인식 값 → DEV 경고 + block 폴백
  if (import.meta.env.DEV) {
    console.warn(
      `[taffyDisplayAdapter] Unrecognized CSS display value: "${display}". Falling back to 'block'.`,
    );
  }
  return BLOCK_FALLBACK;
}
