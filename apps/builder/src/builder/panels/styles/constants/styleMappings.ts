/**
 * styleMappings - 스타일 값 매핑
 *
 * UI 버튼 ID와 CSS 값 간의 변환 매핑
 */

/**
 * Vertical alignment 버튼 ID → alignItems 매핑
 */
export const VERTICAL_ALIGNMENT_TO_ALIGN_ITEMS: Record<string, string> = {
  'align-vertical-start': 'flex-start',
  'align-vertical-center': 'center',
  'align-vertical-end': 'flex-end',
};

/**
 * alignItems → Vertical alignment 버튼 ID 매핑 (역방향)
 */
export const ALIGN_ITEMS_TO_VERTICAL_ALIGNMENT: Record<string, string> = {
  'flex-start': 'align-vertical-start',
  'center': 'align-vertical-center',
  'flex-end': 'align-vertical-end',
};

/**
 * Horizontal alignment 버튼 ID → justifyContent 매핑
 */
export const HORIZONTAL_ALIGNMENT_TO_JUSTIFY_CONTENT: Record<string, string> = {
  'align-horizontal-start': 'flex-start',
  'align-horizontal-center': 'center',
  'align-horizontal-end': 'flex-end',
};

/**
 * justifyContent → Horizontal alignment 버튼 ID 매핑 (역방향)
 */
export const JUSTIFY_CONTENT_TO_HORIZONTAL_ALIGNMENT: Record<string, string> = {
  'flex-start': 'align-horizontal-start',
  'center': 'align-horizontal-center',
  'flex-end': 'align-horizontal-end',
};

/**
 * 3x3 grid 버튼 ID → justifyContent + alignItems 조합 매핑
 */
export const FLEX_ALIGNMENT_POSITION_MAP: Record<
  string,
  { horizontal: string; vertical: string }
> = {
  leftTop: { horizontal: 'flex-start', vertical: 'flex-start' },
  centerTop: { horizontal: 'center', vertical: 'flex-start' },
  rightTop: { horizontal: 'flex-end', vertical: 'flex-start' },
  leftCenter: { horizontal: 'flex-start', vertical: 'center' },
  centerCenter: { horizontal: 'center', vertical: 'center' },
  rightCenter: { horizontal: 'flex-end', vertical: 'center' },
  leftBottom: { horizontal: 'flex-start', vertical: 'flex-end' },
  centerBottom: { horizontal: 'center', vertical: 'flex-end' },
  rightBottom: { horizontal: 'flex-end', vertical: 'flex-end' },
};

/**
 * justifyContent + alignItems 조합 → 3x3 grid 버튼 ID 매핑 (역방향)
 */
export function getCombinationKey(horizontal: string, vertical: string): string | null {
  const combinationMap: Record<string, string> = {
    'flex-start:flex-start': 'leftTop',
    'center:flex-start': 'centerTop',
    'flex-end:flex-start': 'rightTop',
    'flex-start:center': 'leftCenter',
    'center:center': 'centerCenter',
    'flex-end:center': 'rightCenter',
    'flex-start:flex-end': 'leftBottom',
    'center:flex-end': 'centerBottom',
    'flex-end:flex-end': 'rightBottom',
  };

  const key = `${horizontal}:${vertical}`;
  return combinationMap[key] || null;
}

/**
 * Spacing 값 목록 (space-around, space-between, space-evenly)
 */
export const SPACING_VALUES = ['space-around', 'space-between', 'space-evenly'] as const;

/**
 * Valid alignment values (flex-start, center, flex-end)
 */
export const VALID_ALIGNMENT_VALUES = ['flex-start', 'center', 'flex-end'] as const;
