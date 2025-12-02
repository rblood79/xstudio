import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  MorphContent,
  VortexState,
  ParticleBackgroundContextValue,
} from "./types";
import { DEFAULT_LEAVE_DELAY_MS, DEFAULT_INITIAL_CONTENT } from "./constants";
import type { ParticleThemePreset } from "./types";

// ==================== Context ====================
const ParticleBackgroundContext =
  createContext<ParticleBackgroundContextValue | null>(null);

// ==================== Provider Props ====================
interface ParticleBackgroundProviderProps {
  children: ReactNode;
  initialContent?: MorphContent;
  leaveDelayMs?: number;
  preset?: ParticleThemePreset;
}

// ==================== Provider ====================
export function ParticleBackgroundProvider({
  children,
  initialContent = DEFAULT_INITIAL_CONTENT,
  leaveDelayMs = DEFAULT_LEAVE_DELAY_MS,
  preset,
}: ParticleBackgroundProviderProps) {
  const targetMorphRef = useRef(0);
  const contentRef = useRef<MorphContent>(initialContent);
  const [contentVersion, setContentVersion] = useState(0);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minRadius = preset?.vortex.minRadius ?? 15;

  const vortexRef = useRef<VortexState>({
    active: false,
    x: 0,
    y: 0,
    strength: 0,
    radius: minRadius,
    height: 0,
  });

  // leave 중인지 추적 (형태 간 직접 전환 감지용)
  const isLeavingRef = useRef(false);

  const setHoverContent = useCallback(
    (content: MorphContent | null) => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }

      if (content) {
        // leave 중이거나 이미 morph된 상태 → 형태 간 직접 전환
        // targetMorphRef를 1로 유지하여 morph out 없이 바로 새 형태로
        isLeavingRef.current = false;
        contentRef.current = content;
        targetMorphRef.current = 1; // 항상 1로 (형태 유지)

        setContentVersion((v) => v + 1);
      } else {
        // leave 시작 - 잠시 대기 후 morph out
        isLeavingRef.current = true;

        leaveTimeoutRef.current = setTimeout(() => {
          // 여전히 leaving 상태면 (새 hover가 안 들어왔으면) morph out
          if (isLeavingRef.current) {
            targetMorphRef.current = 0;
            isLeavingRef.current = false;
          }
          leaveTimeoutRef.current = null;
        }, leaveDelayMs);
      }
    },
    [leaveDelayMs]
  );

  return (
    <ParticleBackgroundContext.Provider
      value={{
        targetMorphRef,
        contentRef,
        setHoverContent,
        contentVersion,
        vortexRef,
      }}
    >
      {children}
    </ParticleBackgroundContext.Provider>
  );
}

// ==================== Hook ====================
export function useParticleBackground() {
  const context = useContext(ParticleBackgroundContext);
  if (!context) {
    throw new Error(
      "useParticleBackground must be used within ParticleBackgroundProvider"
    );
  }
  return context;
}
