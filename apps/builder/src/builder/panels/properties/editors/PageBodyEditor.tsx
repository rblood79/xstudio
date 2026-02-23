/**
 * PageBodyEditor - Page body 요소 전용 에디터
 *
 * Page body의 핵심 기능: Layout 선택
 * - PageLayoutSelector를 통해 Layout 템플릿 적용
 * - className, aria 속성 편집
 *
 * ⭐ Phase 6: BodyEditor에서 분리됨
 * - Page body: PageBodyEditor (Layout 선택)
 * - Layout body: LayoutBodyEditor (프리셋 + Slot 생성)
 */

import { memo, useCallback, useMemo } from "react";
import { Layout } from "lucide-react";
import { PropertyCustomId, PropertyInput, PropertySection } from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";
import { PageLayoutSelector } from "./PageLayoutSelector";
import { PageParentSelector } from "./PageParentSelector";

export const PageBodyEditor = memo(
  function PageBodyEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      return element?.customId || "";
    }, [elementId]);

    // ⭐ Phase 6 Fix: pageId는 요소의 page_id가 아닌 현재 편집 중인 페이지 ID 사용
    // Page 모드에서 Layout body가 선택되어도 현재 페이지의 Layout을 선택할 수 있어야 함
    const currentPageId = useStore((state) => state.currentPageId);

    // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
    const handleClassNameChange = useCallback(
      (value: string) => {
        onUpdate({ ...currentProps, className: value || undefined });
      },
      [currentProps, onUpdate]
    );

    return (
      <>
        {/* Basic Section */}
        <PropertySection title="Basic">
          <PropertyCustomId
            label="ID"
            value={customId}
            elementId={elementId}
            placeholder="body"
          />
        </PropertySection>

        {/* ⭐ Page 전용: Layout 선택 */}
        {currentPageId && <PageLayoutSelector pageId={currentPageId} />}

        {/* ⭐ Nested Routes & Slug System: Parent Page 선택 */}
        {currentPageId && <PageParentSelector pageId={currentPageId} />}

        {/* Layout Section */}
        <PropertySection title="Layout">
          <PropertyInput
            label="Class Name"
            value={String(currentProps.className || "")}
            onChange={handleClassNameChange}
            placeholder="page-container"
            icon={Layout}
          />
        </PropertySection>
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.elementId === nextProps.elementId &&
      JSON.stringify(prevProps.currentProps) ===
        JSON.stringify(nextProps.currentProps)
    );
  }
);

export default PageBodyEditor;
