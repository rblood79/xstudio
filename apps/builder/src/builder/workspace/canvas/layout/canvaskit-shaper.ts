/**
 * CanvasKit Shaper 초기화 및 layout-flow 연결
 *
 * builder 앱에서 CanvasKit이 초기화되고 폰트가 로드된 후,
 * 이 모듈을 호출하여 layout-flow의 TextShaper를 CanvasKit 기반으로 설정한다.
 *
 * == 사용 흐름 ==
 * 1. initCanvasKit() → CanvasKit WASM 로드
 * 2. skiaFontManager.loadFont() → 폰트 로드
 * 3. initCanvasKitShaper() → layout-flow에 TextShaper 주입
 * 4. 이후 layout-flow의 텍스트 레이아웃 함수들이 CanvasKit API를 사용
 *
 * @see docs/ENGINE.md §4 (전략 D), §7 Phase 2
 * @see packages/layout-flow/src/adapters/canvaskit-shaper.ts (구현)
 */

import { getCanvasKit, isCanvasKitInitialized } from '../skia/initCanvasKit';
import { skiaFontManager } from '../skia/fontManager';

import {
  createCanvasKitShaper,
  setTextShaper,
} from '@xstudio/layout-flow';
import type { CanvasKitMinimal } from '@xstudio/layout-flow';

/**
 * CanvasKit shaper의 초기화 상태.
 */
let shaperInitialized = false;

/**
 * layout-flow의 TextShaper를 CanvasKit 기반으로 초기화한다.
 *
 * 호출 전 필수 조건:
 * - CanvasKit WASM이 로드되어야 함 (isCanvasKitInitialized() === true)
 * - 최소 1개 이상의 폰트가 skiaFontManager에 로드되어야 함
 *
 * @returns 초기화 성공 여부
 */
export function initCanvasKitShaper(): boolean {
  if (shaperInitialized) return true;

  if (!isCanvasKitInitialized()) {
    console.warn('[CanvasKitShaper] CanvasKit이 아직 초기화되지 않았습니다.');
    return false;
  }

  const families = skiaFontManager.getFamilies();
  if (families.length === 0) {
    console.warn('[CanvasKitShaper] 로드된 폰트가 없습니다.');
    return false;
  }

  const ck = getCanvasKit() as unknown as CanvasKitMinimal;
  const fontMgr = skiaFontManager.getFontMgr();

  const shaper = createCanvasKitShaper(ck, fontMgr);

  // skiaFontManager에 등록된 폰트들을 shaper에도 등록
  // canvaskit-wasm의 Typeface는 CKTypeface({ delete(): void })를 구조적으로 만족하므로
  // unknown을 경유한 캐스팅으로 연결한다.
  for (const family of families) {
    const typeface = skiaFontManager.getTypeface(family);
    if (typeface) {
      shaper.registerFace(
        typeface as unknown as { delete(): void },
        family,
        [family],
      );
    }
  }

  setTextShaper(shaper);

  shaperInitialized = true;
  console.info(
    `[CanvasKitShaper] 초기화 완료 (fonts: ${families.join(', ')})`,
  );

  return true;
}

/**
 * shaper가 초기화되었는지 확인한다.
 */
export function isShaperInitialized(): boolean {
  return shaperInitialized;
}
