import { createElement, memo } from "react";
import { GenericPropertyEditor } from "../generic";
import { getPropertyEditorSpec } from "../specRegistry";
import type { ComponentEditorProps } from "../../../inspector/types";

/**
 * ADR-097 P3 — TagGroup items SSOT 프로퍼티 에디터.
 *
 * `registry.ts.getCustomPreEditor("TagGroup")` pre-generic hook 이 진입점으로 선택.
 *
 * ADR-076 ListBoxPropertyEditor 와 달리 **템플릿 모드 분기 없음**:
 *   - Tag.children: string 만 (Field 자식 불가) — ADR-097 Hard Constraint #3
 *   - 항상 정적 items[] 편집 모드
 *
 * 구현 제약 (ADR-076 Decision 계승):
 *   - `registry.ts:155` spec-first 경로가 `metadata.editorName` 을 bypass →
 *     `metadata.editorName` 단독 연결만으로는 로드 안 됨
 *   이에 따라 `registry.ts` `getCustomPreEditor` pre-hook 으로 명시 진입.
 *
 * 현재 본체는 TagGroupSpec 전체 (Tag Management items-manager 섹션 포함) 를 그대로
 * `GenericPropertyEditor` 에 주입. 향후 Tag 전용 섹션 동적 분기 (allowsCustomValue 편집
 * 플로우 등) 확장 여지를 남긴다 (ListBox 와 같은 subtree 관찰이 필요해지면 useStore
 * 훅 추가).
 */
const TagGroupPropertyEditor = memo(function TagGroupPropertyEditor(
  props: ComponentEditorProps,
) {
  const spec = getPropertyEditorSpec("TagGroup");
  if (!spec) return null;

  return createElement(GenericPropertyEditor, {
    ...props,
    spec,
  });
});

export default TagGroupPropertyEditor;
