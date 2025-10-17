import { PreviewElement, MessageType } from "../types";

/**
 * postMessage 처리 유틸리티
 */

/**
 * UPDATE_ELEMENTS 메시지 처리
 */
export const handleUpdateElements = (
  data: MessageType,
  setElements: (elements: PreviewElement[]) => void
) => {
  if (data.type === "UPDATE_ELEMENTS") {
    setElements(data.elements || []);
  }
};

/**
 * UPDATE_ELEMENT_PROPS 메시지 처리
 */
export const handleUpdateElementProps = (
  data: MessageType,
  elements: PreviewElement[],
  updateElementProps: (id: string, props: Record<string, unknown>) => void
) => {
  if (data.type === "UPDATE_ELEMENT_PROPS") {
    const { elementId, props, merge = true } = data;

    if (merge) {
      const element = elements.find((el) => el.id === elementId);
      if (element) {
        updateElementProps(elementId, {
          ...element.props,
          ...props,
        });
      } else {
        updateElementProps(elementId, props);
      }
    } else {
      updateElementProps(elementId, props);
    }
  }
};

/**
 * DELETE_ELEMENTS 메시지 처리
 */
export const handleDeleteElements = (
  data: MessageType,
  elements: PreviewElement[],
  setElements: (elements: PreviewElement[]) => void
) => {
  if (data.type === "DELETE_ELEMENTS" && Array.isArray(data.elementIds)) {
    const updatedElements = elements.filter(
      (element) => !data.elementIds.includes(element.id)
    );
    setElements(updatedElements);
  }
};

/**
 * DELETE_ELEMENT 메시지 처리
 */
export const handleDeleteElement = (
  data: MessageType,
  elements: PreviewElement[],
  setElements: (elements: PreviewElement[]) => void
) => {
  if (data.type === "DELETE_ELEMENT" && data.elementId) {
    const updatedElements = elements.filter(
      (element) => element.id !== data.elementId
    );
    setElements(updatedElements);
  }
};

/**
 * THEME_VARS 메시지 처리
 */
export const handleThemeVars = (data: MessageType) => {
  if (data.type === "THEME_VARS" && Array.isArray(data.vars)) {
    let styleEl = document.getElementById(
      "design-theme-vars"
    ) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "design-theme-vars";
      document.head.appendChild(styleEl);
    }

    styleEl.textContent =
      ":root {\n" +
      data.vars
        .map(
          (v: { cssVar: string; value: string }) =>
            `  ${v.cssVar}: ${v.value};`
        )
        .join("\n") +
      "\n}";

    console.log("[preview] applied THEME_VARS", data.vars.length);
  }
};

/**
 * UPDATE_THEME_TOKENS 메시지 처리 (하위 호환)
 */
export const handleUpdateThemeTokens = (data: MessageType) => {
  if (data.type === "UPDATE_THEME_TOKENS" && data.styles) {
    let styleEl = document.getElementById(
      "design-theme-vars"
    ) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "design-theme-vars";
      document.head.appendChild(styleEl);
    }

    styleEl.textContent =
      ":root {\n" +
      Object.entries(data.styles)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join("\n") +
      "\n}";

    console.log(
      "[preview] applied UPDATE_THEME_TOKENS",
      Object.keys(data.styles).length
    );
  }
};

/**
 * 모든 메시지 타입 처리
 */
export const handleMessage = (
  event: MessageEvent,
  elements: PreviewElement[],
  setElements: (elements: PreviewElement[]) => void,
  updateElementProps: (id: string, props: Record<string, unknown>) => void
) => {
  const data = event.data as MessageType;
  if (!data || typeof data !== "object" || !data.type) return;

  // 각 메시지 타입별 처리
  handleUpdateElements(data, setElements);
  handleUpdateElementProps(data, elements, updateElementProps);
  handleDeleteElements(data, elements, setElements);
  handleDeleteElement(data, elements, setElements);
  handleThemeVars(data);
  handleUpdateThemeTokens(data);
};
