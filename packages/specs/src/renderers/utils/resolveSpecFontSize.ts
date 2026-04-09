/**
 * Spec render.shapes에서 반복되는 fontSize 해석 3단계를 통합.
 * 53개 spec 파일의 공통 패턴: rawFs → resolveToken → number fallback
 */
import type { TokenRef } from "../../types";
import { resolveToken } from "./tokenResolver";

/**
 * size.fontSize 또는 props.style?.fontSize를 숫자 px 값으로 해석한다.
 * @param raw - size.fontSize 또는 props.style?.fontSize
 * @param fallback - 해석 실패 시 기본값 (spec별로 12, 14, 16 중 하나)
 */
export function resolveSpecFontSize(
  raw: string | number | TokenRef | undefined,
  fallback = 14,
): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.startsWith("{")) {
    const resolved = resolveToken(raw as TokenRef);
    if (typeof resolved === "number") return resolved;
  }
  return fallback;
}
