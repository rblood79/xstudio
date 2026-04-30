import { createElement, type ReactNode } from "react";

export type NecessityIndicator = "icon" | "label";

/**
 * Necessity indicator suffix 텍스트 반환 (WebGL 3경로 공유 유틸)
 * Preview/Taffy/Skia 모두 이 함수를 사용하여 동일한 텍스트를 생성
 */
export function getNecessityIndicatorSuffix(
  necessityIndicator?: string,
  isRequired?: boolean,
): string {
  if (!necessityIndicator) return "";
  if (necessityIndicator === "icon") return isRequired ? " *" : "";
  if (necessityIndicator === "label")
    return isRequired ? " (required)" : " (optional)";
  return "";
}

/**
 * Label 뒤에 필수/선택 표시를 렌더링하는 유틸리티 컴포넌트 (Preview 전용)
 * - icon: * (asterisk)
 * - label: "(required)" or "(optional)"
 */
export function renderNecessityIndicator(
  necessityIndicator?: NecessityIndicator,
  isRequired?: boolean,
): ReactNode {
  if (!necessityIndicator) return null;

  if (necessityIndicator === "icon") {
    if (!isRequired) return null;
    return createElement(
      "span",
      {
        className: "necessity-indicator icon",
        "aria-hidden": true,
      },
      "*",
    );
  }

  const text = isRequired ? "(required)" : "(optional)";
  return createElement(
    "span",
    {
      className: "necessity-indicator label",
      "aria-hidden": isRequired ? "true" : undefined,
    },
    text,
  );
}
