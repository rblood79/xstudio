import { describe, it, expect } from "vitest";
import { generateCSS } from "../CSSGenerator";
import * as specs from "../../components";

/**
 * ADR-059 Phase 4-infra byte diff 0 회귀 Gate.
 * 모든 ComponentSpec 의 generated CSS 를 snapshot 으로 고정.
 * 인프라 변경 후 snapshot diff 0 이어야 회귀 없음.
 */
describe("CSSGenerator snapshot baseline", () => {
  const allSpecs = (Object.values(specs) as unknown[]).filter(
    (v): v is { name: string; skipCSSGeneration?: boolean } =>
      typeof v === "object" &&
      v !== null &&
      "name" in v &&
      typeof (v as { name: unknown }).name === "string",
  );

  for (const spec of allSpecs) {
    if (spec.skipCSSGeneration) continue;
    it(`${spec.name}`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const css = generateCSS(spec as any);
      expect(css).toMatchSnapshot();
    });
  }
});
