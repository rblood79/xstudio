// Types
export type {
  EffectType,
  MorphContent,
  VortexState,
  ParticleBackgroundContextValue,
  ColorRGB,
  ColorPalette,
  ThemeColors,
  DriftConfig,
  VortexConfig,
  FormConfig,
  ParticleThemePreset,
} from "./types";

// Constants
export {
  PARTICLE_COUNT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PIXEL_SAMPLE_STEP,
  POINT_SCALE,
  SVG_SCALE,
  BASE_FONT_SIZE,
  MORPH_IN_SPEED,
  MORPH_OUT_SPEED,
  TRANSITION_SPEED,
  VORTEX_FADE_SPEED,
  DEFAULT_LEAVE_DELAY_MS,
  DEFAULT_INITIAL_CONTENT,
} from "./constants";

// Presets
export { smokePreset, sandPreset, particlePresets } from "./presets";
export type { ParticlePresetName } from "./presets";

// Canvas utilities
export {
  getSharedCanvas,
  drawSvgToCanvas,
  drawTextToCanvas,
  generatePointsFromContent,
} from "./canvasUtils";

// Shaders
export { PARTICLE_VERTEX_SHADER, PARTICLE_FRAGMENT_SHADER } from "./shaders";

// Context & Hook
export {
  ParticleBackgroundProvider,
  useParticleBackground,
} from "./ParticleContext";

// Components
export { ParticleCanvas } from "./ParticleCanvas";
export { SmokeCanvas } from "./SmokeCanvas";
export { CurlNoiseCanvas } from "./CurlNoiseCanvas";
export { MatrixRainCanvas } from "./MatrixRainCanvas";
export { CodeParticleCanvas } from "./CodeParticleCanvas";
export { PortalCanvas } from "./PortalCanvas";
