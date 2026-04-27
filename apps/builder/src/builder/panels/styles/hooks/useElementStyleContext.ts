import { useStore } from "../../../stores";

export interface ElementStyleContext {
  style: Record<string, unknown> | undefined;
  type: string | undefined;
  size: string | undefined;
  fills: unknown[] | undefined;
  props: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Primitive Zustand selectors for an element's style/type/size.
 * Shared by section-value hooks (Appearance / Typography / Layout) to avoid
 * copy-pasting three useStore calls per hook.
 */
export function useElementStyleContext(id: string | null): ElementStyleContext {
  const element = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id);
  });
  const props = useStore((s) => {
    if (!id) return undefined;
    return s.elementsMap.get(id)?.props as
      | Readonly<Record<string, unknown>>
      | undefined;
  });
  const type = useStore((s) => (id ? s.elementsMap.get(id)?.type : undefined));
  const style = props?.style as Record<string, unknown> | undefined;
  const size = props?.size as string | undefined;
  const fills = element?.fills as unknown[] | undefined;
  return { style, type, size, fills, props };
}
