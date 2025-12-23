/**
 * PixiJS Setup
 *
 * @pixi/react와 @pixi/layout 컴포넌트 카탈로그를 정의합니다.
 *
 * 컴포넌트 등록 전략:
 * 1. 모듈 로드 시점에 extend() 호출 - 렌더링 전 등록 보장
 * 2. 컴포넌트 내에서 useExtend() 훅 - 추가 안전장치
 *
 * @example
 * // 컴포넌트 파일에서
 * import { useExtend } from '@pixi/react';
 * import { PIXI_COMPONENTS } from './pixiSetup';
 *
 * function MyComponent() {
 *   useExtend(PIXI_COMPONENTS); // 추가 안전장치 (이미 등록됨)
 *   return <pixiContainer>...</pixiContainer>;
 * }
 *
 * @since 2025-12-12
 * @updated 2025-12-13 P4: useExtend 훅 도입
 * @updated 2025-12-17 모듈 로드 시점 extend() 추가 + 클래스 이름 등록
 */

import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
  Text as PixiText,
  AbstractRenderer,
  TextureSource,
} from 'pixi.js';
import {
  LayoutContainer,
  LayoutText,
} from '@pixi/layout/components';
import { FancyButton } from '@pixi/ui';
import { extend } from '@pixi/react';

// ============================================
// 🚀 Phase 5: PixiJS 전역 성능 설정
// ============================================

/**
 * PixiJS 전역 설정 최적화
 *
 * - ROUND_PIXELS: 서브픽셀 렌더링 방지 (선명한 렌더링)
 * - GC_MAX_IDLE: 텍스처 가비지 컬렉션 주기
 * - RESOLUTION: 기본 해상도 설정
 */
function initPixiSettings() {
  // 서브픽셀 렌더링 방지 (선명한 렌더링, 성능 개선)
  // PixiJS 8.x에서는 Application 옵션으로 설정 (roundPixels: true)

  // 텍스처 가비지 컬렉션 최적화
  // 60초 동안 사용되지 않은 텍스처 자동 해제
  TextureSource.defaultOptions.autoGarbageCollect = true;

  // 기본 해상도 설정 (devicePixelRatio 기반)
  AbstractRenderer.defaultOptions.resolution = Math.min(window.devicePixelRatio || 1, 2);

  // 기본 antialias 설정 (고사양 기기만)
  AbstractRenderer.defaultOptions.antialias = !isLowEndDevice();

  // 기본 powerPreference 설정
  AbstractRenderer.defaultOptions.powerPreference = 'high-performance';
}

// 🚀 Phase 6.2: 저사양 감지 결과 캐싱
let cachedIsLowEnd: boolean | null = null;

/**
 * 저사양 기기 감지 (캐싱 적용)
 *
 * 최초 호출 시 한 번만 계산하고 이후 캐싱된 결과 반환.
 * userAgent 정규식/하드웨어 체크 반복 실행 방지.
 *
 * - hardwareConcurrency < 4 (듀얼코어 이하)
 * - deviceMemory < 4GB (Chrome만 지원)
 * - 모바일 기기
 */
export function isLowEndDevice(): boolean {
  // 캐싱된 결과가 있으면 즉시 반환
  if (cachedIsLowEnd !== null) {
    return cachedIsLowEnd;
  }

  // hardwareConcurrency 체크 (논리 코어 수)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    cachedIsLowEnd = true;
    return true;
  }

  // deviceMemory 체크 (Chrome 전용 API)
  if ('deviceMemory' in navigator && (navigator as { deviceMemory?: number }).deviceMemory! < 4) {
    cachedIsLowEnd = true;
    return true;
  }

  // 모바일 기기 체크
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  if (isMobile) {
    cachedIsLowEnd = true;
    return true;
  }

  cachedIsLowEnd = false;
  return false;
}

/**
 * 동적 해상도 계산
 *
 * @param isInteracting - 사용자 인터랙션 중 여부 (드래그, 줌 등)
 * @returns 최적화된 해상도
 */
export function getDynamicResolution(isInteracting: boolean): number {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isLowEnd = isLowEndDevice();

  if (isInteracting) {
    // 인터랙션 중: 해상도 낮춤 (60fps 유지)
    return isLowEnd ? 1 : Math.min(devicePixelRatio, 1.5);
  }

  // 유휴 상태: 고해상도
  return isLowEnd ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2);
}

// 모듈 로드 시점에 전역 설정 적용
initPixiSettings();

/**
 * PixiJS 컴포넌트 카탈로그
 *
 * useExtend() 훅과 함께 사용합니다.
 * NOTE: TextStyle은 DisplayObject가 아니므로 제외 (직접 import하여 사용)
 * NOTE: LayoutGraphics, LayoutSprite는 미사용으로 제거됨
 *
 * @pixi/react 공식 권장 패턴:
 * - pixi 접두사 사용으로 DOM/다른 라이브러리와 충돌 방지
 * - JSX: <pixiContainer>, <pixiGraphics>, <pixiText>, <pixiSprite>
 */
export const PIXI_COMPONENTS = {
  // 기본 PixiJS 컴포넌트 (pixi 접두사로 DOM 충돌 방지)
  pixiContainer: PixiContainer,
  pixiGraphics: PixiGraphics,
  pixiSprite: PixiSprite,
  pixiText: PixiText,
  // 클래스 이름으로도 등록 (@pixi/react 내부 lookup 지원)
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  // @pixi/layout 컴포넌트
  LayoutContainer,
  LayoutText,
  // @pixi/ui 컴포넌트
  FancyButton,
};

// 모듈 로드 시점에 즉시 등록 (컴포넌트 렌더링 전에 보장)
extend(PIXI_COMPONENTS);

// Re-export for convenience
export { extend, useExtend } from '@pixi/react';
