/**
 * ParticleBackground - Sand 테마 파티클 효과
 *
 * 모래바람처럼 흩날리는 파티클 효과입니다.
 * Provider와 Hook을 re-export하여 기존 API 호환성을 유지합니다.
 */

/* eslint-disable react-refresh/only-export-components */
import {
  ParticleBackgroundProvider,
  useParticleBackground,
  ParticleCanvas,
  sandPreset,
} from "./particle";
import type { MorphContent } from "./particle";

// ==================== Re-exports for backward compatibility ====================
export { ParticleBackgroundProvider, useParticleBackground };
export type { MorphContent };

// ==================== Main Component ====================
export function ParticleBackground() {
  return (
    <ParticleCanvas
      preset={sandPreset}
      afterImageDamp={0.65}    // 잔상 (0.0 ~ 1.0, 높을수록 오래 지속)
      bloomStrength={0.4}      // 발광 강도 (0.0 ~ 2.0)
      bloomRadius={0.6}        // 발광 퍼짐
      bloomThreshold={0.6}     // 발광 임계값 (0.0 ~ 1.0, 낮을수록 더 많은 영역이 발광)
    />
  );
}
