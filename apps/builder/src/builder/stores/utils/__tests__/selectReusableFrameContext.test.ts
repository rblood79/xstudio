/**
 * ADR-911 P3-γ — selectReusableFrame 의 frame editing indicator 갱신 통합 테스트
 *
 * 본 테스트는 `selectReusableFrame(frameId)` 호출이 실제 `useLayoutsStore` 의
 * `selectedReusableFrameId` 필드를 정확히 갱신하는지 (mock 없이) 검증한다.
 *
 * P3-γ 결정 (옵션 B): frame editing indicator 는 `selectedReusableFrameId` 가 SSOT.
 * `editingContextId` 는 element-id-typed 이므로 frameId 직접 대입 시 click target
 * 분해 (resolveClickTarget) 실패 → 자동 exit 회귀 위험 → 별도 필드 유지.
 *
 * 캔버스 read path 통합은 P3-δ Skia render 에서 진행 (dead read 회피).
 */

import { describe, it, expect, beforeEach } from "vitest";

import { useLayoutsStore } from "@/builder/stores/layouts";
import { selectReusableFrame } from "../frameActions";

describe("ADR-911 P3-γ selectReusableFrame → selectedReusableFrameId 갱신", () => {
  beforeEach(() => {
    useLayoutsStore.setState({
      selectedReusableFrameId: null,
      currentLayoutId: null,
    });
  });

  it("frameId 전달 시 selectedReusableFrameId 가 frameId 로 갱신", () => {
    selectReusableFrame("frame-A");

    expect(useLayoutsStore.getState().selectedReusableFrameId).toBe("frame-A");
  });

  it("null 전달 시 selectedReusableFrameId 가 해제", () => {
    useLayoutsStore.setState({
      selectedReusableFrameId: "frame-existing",
      currentLayoutId: "frame-existing",
    });

    selectReusableFrame(null);

    expect(useLayoutsStore.getState().selectedReusableFrameId).toBeNull();
  });

  it("연속 호출 시 마지막 frameId 가 유지 (toggle 시나리오)", () => {
    selectReusableFrame("frame-A");
    selectReusableFrame("frame-B");
    selectReusableFrame("frame-C");

    expect(useLayoutsStore.getState().selectedReusableFrameId).toBe("frame-C");
  });

  it("currentLayoutId backward-compat alias 도 동시 갱신 (P3-B 정책)", () => {
    selectReusableFrame("frame-X");

    expect(useLayoutsStore.getState().currentLayoutId).toBe("frame-X");
  });
});
