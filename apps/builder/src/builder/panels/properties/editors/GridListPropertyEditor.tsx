import { createElement, memo } from "react";
import { GenericPropertyEditor } from "../generic";
import { getPropertyEditorSpec } from "../specRegistry";
import type { ComponentEditorProps } from "../../../inspector/types";

/**
 * ADR-099 Phase 4 — GridList items-manager 프로퍼티 에디터.
 *
 * `registry.ts.getCustomPreEditor("GridList")` pre-generic hook 이 진입점으로 선택.
 *
 * GridList 는 `children-manager` 타입 필드를 사용하므로 spec-first 경로에서도
 * `ChildItemManager` 로 올바르게 처리된다. 본 에디터는 spec-first bypass
 * 회피 목적으로 명시 진입점을 제공하며, GridListSpec 전체를 GenericPropertyEditor 에
 * 그대로 주입한다.
 */
const GridListPropertyEditor = memo(function GridListPropertyEditor(
  props: ComponentEditorProps,
) {
  const spec = getPropertyEditorSpec("GridList");
  if (!spec) return null;

  return createElement(GenericPropertyEditor, {
    ...props,
    spec,
  });
});

export default GridListPropertyEditor;
