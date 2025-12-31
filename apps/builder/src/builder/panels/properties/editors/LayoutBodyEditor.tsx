/**
 * LayoutBodyEditor - Layout body 요소 전용 에디터
 *
 * Layout body의 핵심 기능: 프리셋을 통한 Slot 생성
 * - LayoutPresetSelector를 통해 레이아웃 프리셋 적용
 * - Slot 자동 생성 및 containerStyle 적용
 * - className, aria 속성 편집
 *
 * ⭐ Phase 6: BodyEditor에서 분리됨
 * - Page body: PageBodyEditor (Layout 선택)
 * - Layout body: LayoutBodyEditor (프리셋 + Slot 생성)
 */

import { memo, useCallback, useMemo } from "react";
import { Type, Layout, Hash } from "lucide-react";
import { PropertyCustomId, PropertyInput, PropertySection } from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { LayoutPresetSelector } from "./LayoutPresetSelector";
import { LayoutSlugEditor } from "./LayoutSlugEditor";

export const LayoutBodyEditor = memo(
  function LayoutBodyEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    // ⭐ 최적화: customId와 layoutId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const { customId, layoutId } = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      return {
        customId: element?.customId || "",
        layoutId: element?.layout_id || null,
      };
    }, [elementId]);

    // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
    const handleClassNameChange = useCallback(
      (value: string) => {
        onUpdate({ ...currentProps, className: value || undefined });
      },
      [currentProps, onUpdate]
    );

    const handleAriaLabelChange = useCallback(
      (value: string) => {
        onUpdate({ ...currentProps, "aria-label": value || undefined });
      },
      [currentProps, onUpdate]
    );

    const handleAriaLabelledbyChange = useCallback(
      (value: string) => {
        onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
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
            placeholder="layout-body"
          />
        </PropertySection>

        {/* ⭐ Layout 전용: 프리셋 선택기 (Slot 자동 생성) */}
        {layoutId && (
          <PropertySection title="Layout Preset">
            <LayoutPresetSelector layoutId={layoutId} bodyElementId={elementId} />
          </PropertySection>
        )}

        {/* ⭐ Nested Routes & Slug System: Layout slug 편집 */}
        {layoutId && <LayoutSlugEditor layoutId={layoutId} />}

        {/* Layout Section */}
        <PropertySection title="Layout">
          <PropertyInput
            label="Class Name"
            value={String(currentProps.className || "")}
            onChange={handleClassNameChange}
            placeholder="layout-container"
            icon={Layout}
          />
        </PropertySection>

        {/* Accessibility Section */}
        <PropertySection title="Accessibility">
          <PropertyInput
            label={PROPERTY_LABELS.ARIA_LABEL}
            value={String(currentProps["aria-label"] || "")}
            onChange={handleAriaLabelChange}
            icon={Type}
            placeholder="Layout content area"
          />
          <PropertyInput
            label={PROPERTY_LABELS.ARIA_LABELLEDBY}
            value={String(currentProps["aria-labelledby"] || "")}
            onChange={handleAriaLabelledbyChange}
            icon={Hash}
            placeholder="ID of labeling element"
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

export default LayoutBodyEditor;
