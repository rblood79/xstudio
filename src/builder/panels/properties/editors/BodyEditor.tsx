import { memo, useCallback, useMemo } from "react";
/**
 * BodyEditor - Body 컴포넌트 속성 편집기
 *
 * Body는 페이지의 루트 컨테이너로 모든 요소의 부모 역할을 합니다.
 * 각 페이지마다 하나의 body 요소가 자동 생성됩니다.
 *
 * ⭐ Layout/Slot System: PageLayoutSelector를 통해 Page에 Layout 적용 가능
 */

import { Type, Layout, Hash } from "lucide-react";
import { PropertyCustomId, PropertyInput, PropertySection } from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { PageLayoutSelector } from "./PageLayoutSelector";

export const BodyEditor = memo(function BodyEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // ⭐ 최적화: customId와 pageId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const { customId, pageId } = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return {
      customId: element?.customId || "",
      pageId: element?.page_id || null,
    };
  }, [elementId]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleClassNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, className: value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-label": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelledbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
  }, [currentProps, onUpdate]);

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="body"
        />
      </PropertySection>
    ),
    [customId, elementId]
  );

  const layoutSection = useMemo(
    () => (
      <PropertySection title="Layout">
        <PropertyInput
          label="Class Name"
          value={String(currentProps.className || "")}
          onChange={handleClassNameChange}
          placeholder="page-container"
          icon={Layout}
        />
      </PropertySection>
    ),
    [currentProps.className, handleClassNameChange]
  );

  // ⭐ 최적화: 복잡한 표현식을 별도 변수로 추출
  const ariaLabel = useMemo(() => currentProps["aria-label"] as string | undefined, [currentProps]);
  const ariaLabelledby = useMemo(() => currentProps["aria-labelledby"] as string | undefined, [currentProps]);

  const accessibilitySection = useMemo(
    () => (
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(ariaLabel || "")}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="Main page content"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(ariaLabelledby || "")}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="ID of labeling element"
        />
      </PropertySection>
    ),
    [
      ariaLabel,
      ariaLabelledby,
      handleAriaLabelChange,
      handleAriaLabelledbyChange,
    ]
  );

  // ⭐ Layout/Slot System: Page에 Layout 선택하는 섹션
  const pageLayoutSection = useMemo(() => {
    if (!pageId) return null;
    return <PageLayoutSelector pageId={pageId} />;
  }, [pageId]);

  return (
    <>
      {basicSection}
      {pageLayoutSection}
      {layoutSection}
      {accessibilitySection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});
