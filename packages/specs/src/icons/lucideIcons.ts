/**
 * Lucide 아이콘 SVG 경로 레지스트리
 *
 * Lucide 아이콘 라이브러리의 SVG 경로 데이터를 저장.
 * 원본 viewBox: 0 0 24 24, strokeWidth: 2, stroke-linecap: round, stroke-linejoin: round
 *
 * CanvasKit에서 Path.MakeFromSVGString()으로 렌더링.
 * 컴포넌트 spec에서 사용하는 주요 아이콘만 포함.
 *
 * @see https://lucide.dev/icons
 */

/** Lucide 아이콘 데이터: SVG path `d` 속성 배열 (24x24 viewBox 기준) */
export interface LucideIconData {
  /** SVG path d 속성 배열 (다중 경로 지원) */
  paths: string[];
  /** circle 요소 (cx, cy, r) — search 등 아이콘용 */
  circles?: Array<{ cx: number; cy: number; r: number }>;
}

/**
 * 주요 Lucide 아이콘 레지스트리
 *
 * lucide-react v0.562.0 기준 SVG 경로 데이터
 */
export const LUCIDE_ICONS: Record<string, LucideIconData> = {
  // ─── Navigation ───
  'chevron-down': { paths: ['m6 9 6 6 6-6'] },
  'chevron-up': { paths: ['m18 15-6-6-6 6'] },
  'chevron-right': { paths: ['m9 18 6-6-6-6'] },
  'chevron-left': { paths: ['m15 18-6-6 6-6'] },

  // ─── Actions ───
  'check': { paths: ['M20 6 9 17l-5-5'] },
  'x': { paths: ['M18 6 6 18', 'm6 6 12 12'] },
  'plus': { paths: ['M5 12h14', 'M12 5v14'] },
  'minus': { paths: ['M5 12h14'] },

  // ─── UI ───
  'search': {
    paths: ['m21 21-4.34-4.34'],
    circles: [{ cx: 11, cy: 11, r: 8 }],
  },
  'eye': {
    paths: [
      'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
    ],
    circles: [{ cx: 12, cy: 12, r: 3 }],
  },
  'eye-off': {
    paths: [
      'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49',
      'M14.084 14.158a3 3 0 0 1-4.242-4.242',
      'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143',
      'M2 2l20 20',
    ],
  },

  // ─── Form ───
  'circle': { paths: [], circles: [{ cx: 12, cy: 12, r: 10 }] },
  'info': {
    paths: ['M12 16v-4', 'M12 8h.01'],
    circles: [{ cx: 12, cy: 12, r: 10 }],
  },
  'alert-circle': {
    paths: ['M12 8v4', 'M12 16h.01'],
    circles: [{ cx: 12, cy: 12, r: 10 }],
  },
};

/**
 * 아이콘 경로 데이터 조회
 *
 * @param name - 아이콘 이름 (예: 'chevron-down')
 * @param family - 아이콘 라이브러리 (기본: 'lucide')
 * @returns 아이콘 데이터 또는 null
 */
export function getIconData(
  name: string,
  family: string = 'lucide',
): LucideIconData | null {
  if (family !== 'lucide') return null;
  return LUCIDE_ICONS[name] ?? null;
}
