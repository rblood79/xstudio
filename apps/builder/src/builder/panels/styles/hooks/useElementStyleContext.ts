import { useStore } from "../../../stores";

export interface ElementStyleContext {
  style: Record<string, unknown> | undefined;
  type: string | undefined;
  size: string | undefined;
}

/**
 * Primitive Zustand selectors for an element's style/type/size.
 * Shared by section-value hooks (Appearance / Typography / Layout) to avoid
 * copy-pasting three useStore calls per hook.
 */
export function useElementStyleContext(id: string | null): ElementStyleContext {
  const style = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id)?.props?.style as
      | Record<string, unknown>
      | undefined;
  });
  const type = useStore((s) => (id ? s.elementsMap.get(id)?.tag : undefined));
  const size = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id)?.props?.size as string | undefined;
  });
  return { style, type, size };
}
