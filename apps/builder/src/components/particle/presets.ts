import type { ParticleThemePreset } from "./types";

// ==================== 연기 테마 (Smoke) ====================
export const smokePreset: ParticleThemePreset = {
  name: "smoke",
  colors: {
    dark: {
      primary: { r: 0.8, g: 0.8, b: 0.85 },
      secondary: { r: 0.4, g: 0.4, b: 0.45 },
      dust: { r: 0.2, g: 0.2, b: 0.25 },
    },
    light: {
      primary: { r: 0.6, g: 0.6, b: 0.65 },
      secondary: { r: 0.3, g: 0.3, b: 0.35 },
      dust: { r: 0.1, g: 0.1, b: 0.15 },
    },
  },
  drift: {
    primarySpeed: 0.8, // 천천히 위로 상승
    primaryDirection: 1.0,
    lowLayerEffect: 1.2, // 하층: 가벼운 소용돌이
    midLayerEffect: 1.5, // 중간층: 부드러운 부유
    highLayerEffect: 0.9, // 상층: 확산
    waveSpeed: 0.3,
    waveScale: 0.02,
    clusterStrength: 1.2,
    clusterScale: 0.01,
  },
  vortex: {
    growthRate: 0.12,
    maxRadius: 150.0,
    minRadius: 15.0,
    maxHeight: 300.0,
    rotationSpeed: 2.2,
    spiralTightness: 0.025,
    suctionStrength: 10.0,
    liftForce: 12.0,
    coreDensity: 0.8,
    edgeDensity: 0.2,
    tiltAmount: 0.12,
    tiltDirection: 1.0,
  },
  form: {
    turbulence: 3.5,
    gustStrength: 8.0,
    gustFrequency: 0.5,
    convergenceForce: 0.7,
    layerCount: 6,
  },
  particleBaseSize: 220,
  particleSizeVariance: 60,
  layerSizeReduction: 0.4,
  blending: "normal",
  baseAlpha: { low: 0.6, high: 0.3 },
  shaderTweaks: {
    vortexFadeMultiplier: 135,
    formIntensityMultiplier: 3.5,
    aliveBreathScale: 2.0,
    vibrationScale: 0.6,
  },
};

// ==================== 사막 모래 테마 (Sand) ====================
export const sandPreset: ParticleThemePreset = {
  name: "sand",
  colors: {
    dark: {
      primary: { r: 0.92, g: 0.78, b: 0.52 },
      secondary: { r: 0.75, g: 0.58, b: 0.35 },
      dust: { r: 0.85, g: 0.72, b: 0.48 },
    },
    light: {
      primary: { r: 0.35, g: 0.25, b: 0.12 },
      secondary: { r: 0.28, g: 0.18, b: 0.08 },
      dust: { r: 0.42, g: 0.32, b: 0.18 },
    },
  },
  drift: {
    primarySpeed: 1.2, // 지속적인 수평 바람
    primaryDirection: -1.0,
    lowLayerEffect: 2.5, // 바닥 근처 굵은 알갱이 튀어오름
    midLayerEffect: 1.8, // 중간층 떠다님
    highLayerEffect: 0.8, // 상층 미세먼지 부유
    waveSpeed: 0.4,
    waveScale: 0.015,
    clusterStrength: 1.5,
    clusterScale: 0.008,
  },
  vortex: {
    growthRate: 0.15,
    maxRadius: 180.0,
    minRadius: 20.0,
    maxHeight: 250.0,
    rotationSpeed: 3.0,
    spiralTightness: 0.03,
    suctionStrength: 15.0,
    liftForce: 8.0,
    coreDensity: 1.0,
    edgeDensity: 0.3,
    tiltAmount: 0.15,
    tiltDirection: 1.0,
  },
  form: {
    turbulence: 4.0,
    gustStrength: 12.0,
    gustFrequency: 0.6,
    convergenceForce: 0.85,
    layerCount: 5,
  },
  particleBaseSize: 250,
  particleSizeVariance: 80,
  layerSizeReduction: 0.5,
  blending: "additive",
  baseAlpha: { low: 0.7, high: 0.4 },
  shaderTweaks: {
    vortexFadeMultiplier: 160,
    formIntensityMultiplier: 4.0,
    aliveBreathScale: 2.5,
    vibrationScale: 0.7,
  },
};

// ==================== 프리셋 레지스트리 ====================
export const particlePresets = {
  smoke: smokePreset,
  sand: sandPreset,
} as const;

export type ParticlePresetName = keyof typeof particlePresets;
