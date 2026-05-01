import type { FrameNode } from "@composition/shared";
import type { Element, Page } from "@/types/builder/unified.types";
import {
  getElementLayoutId,
  getLegacyLayoutId,
  hasLegacyLayoutId,
  withLegacyLayoutId,
} from "./legacyElementFields";

export function getNullablePageFrameBindingId(
  page: Page | undefined | null,
): string | null {
  return getLegacyLayoutId(page);
}

export function getPageFrameBindingId(page: Page | undefined | null): string {
  return getNullablePageFrameBindingId(page) ?? "";
}

export function withPageFrameBinding<T extends object>(
  page: T,
  frameId: string | null,
): T {
  return withLegacyLayoutId(page, frameId);
}

export function getReusableFrameMirrorId(frame: FrameNode): string {
  const metadata = frame.metadata as { layoutId?: unknown } | undefined;
  const rawId =
    typeof metadata?.layoutId === "string" && metadata.layoutId.length > 0
      ? metadata.layoutId
      : frame.id;
  return rawId.startsWith("layout-") ? rawId.slice("layout-".length) : rawId;
}

export function getFrameElementMirrorId(element: Element): string | null {
  return getElementLayoutId(element);
}

export function hasFrameElementMirrorId(value: unknown): boolean {
  return hasLegacyLayoutId(value);
}

export function withFrameElementMirrorId<T extends object>(
  element: T,
  frameId: string | null,
): T {
  return withLegacyLayoutId(element, frameId);
}
