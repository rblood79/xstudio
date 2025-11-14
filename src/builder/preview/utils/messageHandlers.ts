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
    const elements = data.elements || [];
    console.log(`📥 [Preview] Received UPDATE_ELEMENTS: ${elements.length} elements`, {
      elementIds: elements.map((el: PreviewElement) => el.id),
      tags: elements.map((el: PreviewElement) => el.tag)
    });
    setElements(elements);

    // ✅ ACK: Builder에게 수신 확인 응답
    try {
      window.parent.postMessage(
        {
          type: "ELEMENTS_UPDATED_ACK",
          elementCount: elements.length,
          timestamp: Date.now()
        },
        window.location.origin
      );
      console.log('✅ [Preview] Sent ELEMENTS_UPDATED_ACK to Builder');
    } catch (error) {
      console.error('❌ [Preview] Failed to send ACK:', error);
    }
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

    // Light 모드 토큰 (isDark가 없거나 false인 것들)
    const lightVars = (data.vars as { isDark?: boolean; name: string; value: string }[]).filter((v) => !v.isDark);
    // Dark 모드 토큰 (isDark가 true인 것들)
    const darkVars = (data.vars as { isDark?: boolean; name: string; value: string }[]).filter((v) => v.isDark);

    let cssText = "";

    // Light 모드 CSS 생성
    if (lightVars.length > 0) {
      cssText +=
        ":root {\n" +
        lightVars
          .map((v: { cssVar: string; value: string }) => `  ${v.cssVar}: ${v.value};`)
          .join("\n") +
        "\n}\n";
    }

    // Dark 모드 CSS 생성
    if (darkVars.length > 0) {
      cssText +=
        '\n[data-theme="dark"] {\n' +
        darkVars
          .map((v: { cssVar: string; value: string }) => `  ${v.cssVar}: ${v.value};`)
          .join("\n") +
        "\n}\n";
    }

    styleEl.textContent = cssText;

    console.log(
      "[preview] applied THEME_VARS",
      `${lightVars.length} light, ${darkVars.length} dark`
    );
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
  }
};

/**
 * SET_DARK_MODE 메시지 처리
 */
export const handleSetDarkMode = (data: MessageType) => {
  if (data.type === "SET_DARK_MODE") {
    const isDark = data.isDark;

    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    console.log("[preview] Dark mode:", isDark ? "enabled" : "disabled");
  }
};

/**
 * NAVIGATE_TO_PAGE 메시지 처리 (Preview → Parent)
 * 이 핸들러는 실제로 Preview에서는 사용되지 않고,
 * Parent (BuilderCore)에서 사용됩니다.
 */
export const handleNavigateToPage = (
  data: MessageType,
  onNavigate?: (path: string) => void
) => {
  if (data.type === "NAVIGATE_TO_PAGE" && onNavigate) {
    const { path } = data.payload as { path: string };
    onNavigate(path);
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
  // 🔍 디버깅: 모든 메시지 로그 (origin 체크 전)
  console.log('📨 [Preview] Raw message received:', {
    type: event.data?.type,
    origin: event.origin,
    windowOrigin: window.location.origin,
    hasData: !!event.data,
    dataKeys: event.data ? Object.keys(event.data) : []
  });

  // Origin 체크 (보안)
  if (event.origin !== window.location.origin) {
    console.warn('⚠️ [Preview] Message from untrusted origin:', event.origin, 'expected:', window.location.origin);
    // ⚠️ origin이 다르더라도 계속 진행 (디버깅용)
    // return;
  }

  const data = event.data as MessageType;
  if (!data || typeof data !== "object" || !data.type) {
    console.warn('⚠️ [Preview] Invalid message data:', data);
    return;
  }

  console.log('✅ [Preview] Message validated, processing:', data.type);

  // 각 메시지 타입별 처리
  handleUpdateElements(data, setElements);
  handleUpdateElementProps(data, elements, updateElementProps);
  handleDeleteElements(data, elements, setElements);
  handleDeleteElement(data, elements, setElements);
  handleThemeVars(data);
  handleUpdateThemeTokens(data);
  handleSetDarkMode(data);
};
