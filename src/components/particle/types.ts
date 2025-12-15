import type {
  ReactNode,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";

// ==================== Effect Types ====================
export type EffectType = "sand" | "curl" | "matrix" | "code" | "portal";

// ==================== Content Types ====================
export type MorphContent =
  | { type: "text"; value: string }
  | { type: "svg"; value: string };

// ==================== Vortex State ====================
export interface VortexState {
  active: boolean;
  x: number;
  y: number;
  strength: number; // 0~1, 누른 시간에 따라 증가
  radius: number; // 현재 반경
  height: number; // 현재 높이
}

// ==================== Context Value ====================
export interface ParticleBackgroundContextValue {
  targetMorphRef: MutableRefObject<number>;
  contentRef: MutableRefObject<MorphContent>;
  setHoverContent: (content: MorphContent | null) => void;
  contentVersion: number;
  vortexRef: MutableRefObject<VortexState>;
  effectType: EffectType;
  setEffectType: Dispatch<SetStateAction<EffectType>>;
}

// ==================== Color Types ====================
export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorPalette {
  primary: ColorRGB;
  secondary: ColorRGB;
  dust: ColorRGB;
}

export interface ThemeColors {
  dark: ColorPalette;
  light: ColorPalette;
}

// ==================== Config Types ====================
export interface DriftConfig {
  // 기본 부유/바람
  primarySpeed: number;
  primaryDirection: number;
  // 층별 움직임
  lowLayerEffect: number;
  midLayerEffect: number;
  highLayerEffect: number;
  // 물결/파동
  waveSpeed: number;
  waveScale: number;
  // 군집/클러스터
  clusterStrength: number;
  clusterScale: number;
}

export interface VortexConfig {
  // 성장
  growthRate: number;
  maxRadius: number;
  minRadius: number;
  maxHeight: number;
  // 회전
  rotationSpeed: number;
  spiralTightness: number;
  // 흡입력
  suctionStrength: number;
  liftForce: number;
  // 밀도
  coreDensity: number;
  edgeDensity: number;
  // 기울기
  tiltAmount: number;
  tiltDirection: number;
}

export interface FormConfig {
  turbulence: number;
  gustStrength: number;
  gustFrequency: number;
  convergenceForce: number;
  layerCount: number;
}

// ==================== Theme Preset ====================
export interface ParticleThemePreset {
  name: string;
  colors: ThemeColors;
  drift: DriftConfig;
  vortex: VortexConfig;
  form: FormConfig;
  // 파티클 설정
  particleBaseSize: number;
  particleSizeVariance: number;
  layerSizeReduction: number;
  // 블렌딩
  blending: "additive" | "normal";
  // 알파
  baseAlpha: { low: number; high: number };
  // Shader-specific 세부 조정
  shaderTweaks?: {
    vortexFadeMultiplier?: number;
    formIntensityMultiplier?: number;
    aliveBreathScale?: number;
    vibrationScale?: number;
  };
}

// ==================== Provider Props ====================
export interface ParticleBackgroundProviderProps {
  children: ReactNode;
  initialContent?: MorphContent;
  leaveDelayMs?: number;
}
