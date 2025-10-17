import { useCallback } from "react";
import { PreviewElement, RenderContext } from "../types";
import { rendererMap } from "../renderers";

/**
 * Element 렌더링 Hook
 */
export const useElementRenderer = (context: RenderContext) => {
  const renderElement = useCallback(
    (element: PreviewElement): React.ReactNode => {
      // body 태그는 div로 렌더링
      const effectiveTag = element.tag === "body" ? "div" : element.tag;

      // 렌더러 맵에서 해당 태그의 렌더러 찾기
      const renderer = rendererMap[effectiveTag];

      if (renderer) {
        return renderer(element, { ...context, renderElement });
      }

      // 렌더러가 없으면 HTML 요소 또는 알 수 없는 컴포넌트로 처리
      return null; // TODO: HTML 요소 렌더링 로직 추가 예정
    },
    [context]
  );

  return { renderElement };
};
