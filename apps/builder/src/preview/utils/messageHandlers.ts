import { PreviewElement, MessageType } from "../types";
import { extractComputedStyleAsync } from "./computedStyleExtractor";

/**
 * postMessage 처리 유틸리티
 */

/**
 * UPDATE_ELEMENTS 메시지 처리
 * ⭐ Layout/Slot System: pageInfo도 함께 처리 (초기 로드 시 Layout 렌더링용)
 */
export const handleUpdateElements = (
  data: MessageType,
  setElements: (elements: PreviewElement[]) => void,
  setPageInfo?: (pageId: string | null, layoutId: string | null) => void
) => {
  if (data.type === "UPDATE_ELEMENTS") {
    const elements = data.elements || [];
    // ⭐ Layout/Slot System: pageInfo 추출
    const pageInfo = (data as { pageInfo?: { pageId: string | null; layoutId: string | null } }).pageInfo;

    // ⭐ Layout/Slot System: pageInfo가 있으면 먼저 설정 (렌더링 전에 설정되어야 함)
    if (pageInfo && setPageInfo) {
      setPageInfo(pageInfo.pageId, pageInfo.layoutId);
    }

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
    } catch {
      // ACK send failed silently
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
    const allVars = data.vars as { isDark?: boolean; cssVar: string; value: string }[];
    const lightVars = allVars.filter((v) => !v.isDark);
    // Dark 모드 토큰 (isDark가 true인 것들)
    const darkVars = allVars.filter((v) => v.isDark);

    let cssText = "";

    // Light 모드 CSS 생성
    if (lightVars.length > 0) {
      cssText +=
        ":root {\n" +
        lightVars
          .map((v) => `  ${v.cssVar}: ${v.value};`)
          .join("\n") +
        "\n}\n";
    }

    // Dark 모드 CSS 생성
    if (darkVars.length > 0) {
      cssText +=
        '\n[data-theme="dark"] {\n' +
        darkVars
          .map((v) => `  ${v.cssVar}: ${v.value};`)
          .join("\n") +
        "\n}\n";
    }

    styleEl.textContent = cssText;
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
 * SET_EDIT_MODE 메시지 처리
 * Layout 모드 vs Page 모드 전환
 */
export const handleSetEditMode = (
  data: MessageType,
  setEditMode?: (mode: "page" | "layout") => void
) => {
  if (data.type === "SET_EDIT_MODE" && data.mode) {
    const mode = data.mode as "page" | "layout";

    // body에 data attribute 설정
    if (mode === "layout") {
      document.body.setAttribute("data-edit-mode", "layout");
      document.body.classList.add("preview-layout-mode");
    } else {
      document.body.setAttribute("data-edit-mode", "page");
      document.body.classList.remove("preview-layout-mode");
    }

    // 콜백이 있으면 호출
    if (setEditMode) {
      setEditMode(mode);
    }
  }
};

/**
 * UPDATE_PAGE_INFO 메시지 처리
 * Layout/Slot System: Page 정보 업데이트
 */
export const handleUpdatePageInfo = (
  data: MessageType,
  setPageInfo?: (pageId: string | null, layoutId: string | null) => void
) => {
  if (data.type === "UPDATE_PAGE_INFO") {
    const { pageId, layoutId } = data as { type: string; pageId: string | null; layoutId: string | null };

    // 콜백이 있으면 호출
    if (setPageInfo) {
      setPageInfo(pageId, layoutId);
    }
  }
};

/**
 * UPDATE_LAYOUTS 메시지 처리
 * Nested Routes & Slug System: Layout 목록 업데이트
 */
export const handleUpdateLayouts = (
  data: MessageType,
  setLayouts?: (layouts: Array<{ id: string; name: string; slug?: string | null }>) => void
) => {
  if (data.type === "UPDATE_LAYOUTS") {
    const { layouts } = data as { type: string; layouts: Array<{ id: string; name: string; slug?: string | null }> };

    // 콜백이 있으면 호출
    if (setLayouts) {
      setLayouts(layouts);
    }
  }
};

/**
 * REQUEST_ELEMENT_SELECTION 메시지 처리
 * Builder가 요청한 요소를 선택하고 rect 정보와 함께 응답
 *
 * ⭐ Layout/Slot System: Page body가 DOM에 없을 때 Layout body로 대체
 */
export const handleRequestElementSelection = (
  data: { type: string; elementId?: string },
  elements: PreviewElement[]
) => {
  if (data.type === "REQUEST_ELEMENT_SELECTION" && data.elementId) {
    const elementId = data.elementId;

    // DOM에서 요소 먼저 찾기 (타이밍 이슈 방지 - React state 업데이트 전에도 작동)
    let elementWithId = document.querySelector(`[data-element-id="${elementId}"]`);
    let actualElementId = elementId;

    // ⭐ Layout/Slot System: DOM에서 못 찾으면 Page body → Layout body 대체 시도
    if (!elementWithId) {
      const requestedElement = elements.find((el) => el.id === elementId);

      // 요청된 요소가 Page의 body인 경우
      if (requestedElement?.tag === 'body' && requestedElement?.page_id) {
        // Layout body 찾기 (layout_id가 있는 body)
        const layoutBody = elements.find((el) =>
          el.tag === 'body' && el.layout_id && !el.page_id
        );

        if (layoutBody) {
          elementWithId = document.querySelector(`[data-element-id="${layoutBody.id}"]`);
          if (elementWithId) {
            actualElementId = layoutBody.id;
          }
        }
      }

      // 여전히 못 찾으면 종료
      if (!elementWithId) {
        return;
      }
    }

    // elements 배열에서 찾기 (props 정보 필요) - 실제 DOM의 element ID 사용
    const element = elements.find((el) => el.id === actualElementId);

    // 🚀 Phase 6.2 최적화: Rect 정보만 동기로 수집 (빠름)
    const rect = elementWithId.getBoundingClientRect();

    // 🚀 즉시 응답: rect + props (computedStyle 제외)
    window.parent.postMessage(
      {
        type: "ELEMENT_SELECTED",
        elementId: elementId,
        payload: {
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          props: element?.props || {},
          tag: element?.tag || elementWithId.tagName.toLowerCase(),
          style: element?.props?.style || {},
          // computedStyle은 아래에서 비동기로 전송
        },
      },
      window.location.origin
    );

    // 🚀 Phase 6.2 최적화: computedStyle은 requestIdleCallback으로 지연 추출
    extractComputedStyleAsync(
      elementWithId as HTMLElement,
      (computedStyle) => {
        // 별도 메시지로 computedStyle 전송 (payload 형식 유지)
        window.parent.postMessage(
          {
            type: "ELEMENT_COMPUTED_STYLE",
            elementId: elementId,
            payload: { computedStyle },
          },
          window.location.origin
        );
      },
      { timeout: 100 }
    );
  }
};

/**
 * 모든 메시지 타입 처리
 * ⭐ Layout/Slot System: setPageInfo 콜백 추가
 * ⭐ Nested Routes: setLayouts 콜백 추가
 */
export const handleMessage = (
  event: MessageEvent,
  elements: PreviewElement[],
  setElements: (elements: PreviewElement[]) => void,
  updateElementProps: (id: string, props: Record<string, unknown>) => void,
  setPageInfo?: (pageId: string | null, layoutId: string | null) => void,
  setLayouts?: (layouts: Array<{ id: string; name: string; slug?: string | null }>) => void
) => {
  // Origin 체크 (보안)
  if (event.origin !== window.location.origin) {
    // 개발 환경에서는 계속 진행
    if (import.meta.env.PROD) return;
  }

  const data = event.data as MessageType;
  if (!data || typeof data !== "object" || !data.type) {
    return;
  }

  // 각 메시지 타입별 처리
  // ⭐ Layout/Slot System: setPageInfo 전달 (초기 로드 시 Layout 렌더링용)
  handleUpdateElements(data, setElements, setPageInfo);
  handleUpdateElementProps(data, elements, updateElementProps);
  handleDeleteElements(data, elements, setElements);
  handleDeleteElement(data, elements, setElements);
  handleThemeVars(data);
  handleUpdateThemeTokens(data);
  handleSetDarkMode(data);
  handleSetEditMode(data);
  handleRequestElementSelection(data, elements);
  // ⭐ Nested Routes & Slug System: Layout 목록 업데이트
  handleUpdateLayouts(data, setLayouts);
};
