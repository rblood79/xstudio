/**
 * ParticleBackground - Curl Noise Flow Field 효과
 *
 * 유체처럼 자연스럽게 흐르는 파티클 효과입니다.
 * Provider와 Hook을 re-export하여 기존 API 호환성을 유지합니다.
 */

/* eslint-disable react-refresh/only-export-components */
import {
  ParticleBackgroundProvider,
  useParticleBackground,
  CurlNoiseCanvas,
} from "./particle";
import type { MorphContent } from "./particle";

// ==================== Re-exports for backward compatibility ====================
export { ParticleBackgroundProvider, useParticleBackground };
export type { MorphContent };

// ==================== Main Component ====================
export function ParticleBackground() {
  return <CurlNoiseCanvas />;
}
