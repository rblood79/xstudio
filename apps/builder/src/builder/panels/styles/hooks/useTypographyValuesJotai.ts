/**
 * useTypographyValuesJotai - Typography 섹션 전용 Jotai 스타일 값 훅
 *
 * Phase 3: Fine-grained Reactivity
 * - Jotai atom 기반으로 Typography 섹션 값 구독
 * - 11개 속성만 구독하여 불필요한 리렌더링 최소화
 *
 * W5-3: preset 인식 로직 추가
 * - selectedElementAtom 구독으로 fontSize 출처(preset vs inline) 감지
 * - typographyValuesAtom이 selectedElementAtom에서 파생되므로 추가 리렌더링 없음
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { useAtomValue } from "jotai";
import { typographyValuesAtom, selectedElementAtom } from "../atoms/styleAtoms";

export interface TypographyStyleValues {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;
  verticalAlign: string;
  // ADR-008: 텍스트 래핑 속성
  whiteSpace: string;
  wordBreak: string;
  overflowWrap: string;
  textOverflow: string;
  overflow: string;
  /** ADR-008: 조합 테이블 기반 파생 프리셋 */
  textBehaviorPreset: string;
  /**
   * fontSize가 inline style / computedStyle이 아닌 size prop preset에서 파생된 값인지 여부.
   * true이면 StylePanel에서 "preset" 뱃지 표시 가능.
   */
  isFontSizeFromPreset?: boolean;
}

/**
 * ADR-008: 텍스트 래핑 속성 조합 → 프리셋 이름 파생
 */
function deriveTextBehaviorPreset(
  ws: string,
  wb: string,
  ow: string,
  to: string,
  of: string,
): string {
  if (ws === "nowrap" && to === "ellipsis" && of === "hidden")
    return "truncate";
  if (ws === "nowrap") return "nowrap";
  if (ws === "pre-wrap") return "preserve";
  if (wb === "break-all") return "break-all";
  if (wb === "keep-all") return "keep-all";
  if (ow === "break-word") return "break-words";
  // ADR-051: "normal" 프리셋 제거 — 기본값이 break-word이므로 ow='normal'은 명시적 custom 설정
  return "custom";
}

/**
 * Typography 섹션 전용 Jotai 스타일 값 훅
 *
 * isFontSizeFromPreset 감지 규칙:
 * - inline style에 fontSize가 없고
 * - computedStyle에 fontSize가 없고
 * - properties.size가 존재하면 → preset에서 온 값으로 판단
 */
export function useTypographyValuesJotai(): TypographyStyleValues | null {
  const values = useAtomValue(typographyValuesAtom);
  const element = useAtomValue(selectedElementAtom);

  if (!values) return null;

  const hasInlineFontSize =
    element?.style?.fontSize !== undefined && element?.style?.fontSize !== null;
  const hasComputedFontSize =
    element?.computedStyle?.fontSize !== undefined &&
    element?.computedStyle?.fontSize !== null;
  const isFontSizeFromPreset =
    !hasInlineFontSize && !hasComputedFontSize && !!element?.properties?.size;

  return {
    ...values,
    isFontSizeFromPreset,
    textBehaviorPreset: deriveTextBehaviorPreset(
      values.whiteSpace,
      values.wordBreak,
      values.overflowWrap,
      values.textOverflow,
      values.overflow,
    ),
  };
}

export default useTypographyValuesJotai;
