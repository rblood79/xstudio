/**
 * G.3 AI Visual Feedback Store
 *
 * AI 작업 중/완료 시 캔버스 레벨 시각 피드백 상태 관리.
 * 독립 Zustand 스토어로, elements 스토어와 분리하여 리렌더 영향 제거.
 * 렌더 루프에서 getState() 직접 읽기 (React 구독 없음).
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.3
 */

import { create } from 'zustand';
import type {
  GeneratingEffectState,
  FlashAnimationState,
  FlashConfig,
} from '../workspace/canvas/skia/types';

// ============================================
// Constants
// ============================================

const DEFAULT_BLUR_SIGMA = 4;
const DEFAULT_PARTICLE_COUNT = 6;
const FLASH_DEFAULT_DURATION = 500;   // ms
const FLASH_LONG_DURATION = 2000;     // ms

/** 기본 파티클 색상 (파란색) */
const DEFAULT_PARTICLE_COLOR = Float32Array.of(96 / 255, 125 / 255, 255 / 255, 1.0);

/** 기본 Flash 설정 */
const DEFAULT_FLASH_CONFIG: FlashConfig = {
  color: [96 / 255, 125 / 255, 255 / 255],
  strokeWidth: 2,
  longHold: false,
  scanLine: true,
};

// ============================================
// Store Interface
// ============================================

export interface AIVisualFeedbackState {
  /** 현재 generating 상태인 노드들 */
  generatingNodes: Map<string, GeneratingEffectState>;
  /** 현재 flash 애니메이션 중인 노드들 */
  flashAnimations: Map<string, FlashAnimationState>;
  /** AI 작업 전체가 진행 중인지 */
  isAIOperationActive: boolean;

  /** AI 작업 시작 시 placeholder 노드 등록 */
  startGenerating: (elementIds: string[]) => void;
  /** AI 작업 완료 시 generating 제거 + flash 추가 */
  completeGenerating: (
    completedElementIds: string[],
    flashConfig?: Partial<FlashConfig>,
  ) => void;
  /** AI 작업 실패/취소 시 generating 제거 (flash 없음) */
  cancelGenerating: () => void;
  /** 단일 노드에 flash 추가 */
  addFlashForNode: (elementId: string, config?: Partial<FlashConfig>) => void;
  /** 만료된 flash 애니메이션 정리 (렌더 루프에서 호출) */
  cleanupExpiredFlashes: (currentTime: number) => void;
}

// ============================================
// Store Implementation
// ============================================

export const useAIVisualFeedbackStore = create<AIVisualFeedbackState>((set, get) => ({
  generatingNodes: new Map(),
  flashAnimations: new Map(),
  isAIOperationActive: false,

  startGenerating: (elementIds) => {
    const now = performance.now();
    const newMap = new Map(get().generatingNodes);

    for (const id of elementIds) {
      newMap.set(id, {
        elementId: id,
        startTime: now,
        blurSigma: DEFAULT_BLUR_SIGMA,
        particleColor: DEFAULT_PARTICLE_COLOR,
        particleCount: DEFAULT_PARTICLE_COUNT,
      });
    }

    set({ generatingNodes: newMap, isAIOperationActive: true });
  },

  completeGenerating: (completedElementIds, flashConfig) => {
    const now = performance.now();
    const mergedConfig: FlashConfig = { ...DEFAULT_FLASH_CONFIG, ...flashConfig };

    // generating 제거
    const newGenerating = new Map(get().generatingNodes);
    for (const id of completedElementIds) {
      newGenerating.delete(id);
    }

    // flash 추가
    const newFlashes = new Map(get().flashAnimations);
    for (const id of completedElementIds) {
      newFlashes.set(id, {
        elementId: id,
        startTime: now,
        duration: mergedConfig.longHold ? FLASH_LONG_DURATION : FLASH_DEFAULT_DURATION,
        config: mergedConfig,
      });
    }

    set({
      generatingNodes: newGenerating,
      flashAnimations: newFlashes,
      isAIOperationActive: newGenerating.size > 0,
    });
  },

  cancelGenerating: () => {
    set({
      generatingNodes: new Map(),
      isAIOperationActive: false,
    });
  },

  addFlashForNode: (elementId, config) => {
    const now = performance.now();
    const mergedConfig: FlashConfig = { ...DEFAULT_FLASH_CONFIG, ...config };

    const newFlashes = new Map(get().flashAnimations);
    newFlashes.set(elementId, {
      elementId,
      startTime: now,
      duration: mergedConfig.longHold ? FLASH_LONG_DURATION : FLASH_DEFAULT_DURATION,
      config: mergedConfig,
    });

    set({ flashAnimations: newFlashes });
  },

  cleanupExpiredFlashes: (currentTime) => {
    const { flashAnimations } = get();
    let changed = false;
    const newFlashes = new Map(flashAnimations);

    for (const [id, state] of flashAnimations) {
      if (currentTime - state.startTime >= state.duration) {
        newFlashes.delete(id);
        changed = true;
      }
    }

    if (changed) {
      set({ flashAnimations: newFlashes });
    }
  },
}));
