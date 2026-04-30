import type { CanvasKit } from "canvaskit-wasm";
import type { EditingSemanticsRole } from "../../../utils/editingSemantics";

export const OVERLAY_BLUE_R = 0x3b / 255;
export const OVERLAY_BLUE_G = 0x82 / 255;
export const OVERLAY_BLUE_B = 0xf6 / 255;
export const OVERLAY_BLUE_RGB: readonly [number, number, number] = [
  OVERLAY_BLUE_R,
  OVERLAY_BLUE_G,
  OVERLAY_BLUE_B,
];

const ORIGIN_R = 0xd4 / 255;
const ORIGIN_G = 0x80 / 255;
const ORIGIN_B = 0xff / 255;

const INSTANCE_R = 0x95 / 255;
const INSTANCE_G = 0x80 / 255;
const INSTANCE_B = 0xf6 / 255;

export function getSemanticOverlayColor(
  ck: CanvasKit,
  role: EditingSemanticsRole | null,
  alpha: number,
): Float32Array {
  if (role === "origin") {
    return ck.Color4f(ORIGIN_R, ORIGIN_G, ORIGIN_B, alpha);
  }

  if (role === "instance") {
    return ck.Color4f(INSTANCE_R, INSTANCE_G, INSTANCE_B, alpha);
  }

  return ck.Color4f(OVERLAY_BLUE_R, OVERLAY_BLUE_G, OVERLAY_BLUE_B, alpha);
}
