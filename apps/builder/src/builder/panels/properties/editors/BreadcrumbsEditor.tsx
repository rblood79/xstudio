import { useState, useMemo, memo } from "react";
import { SquarePlus, PointerOff, Tag } from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { getDB } from "../../../../lib/db";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import { generateCustomId } from "../../../utils/idGeneration";

interface SelectedBreadcrumbState {
  parentId: string;
  breadcrumbIndex: number;
}

export const BreadcrumbsEditor = memo(function BreadcrumbsEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const [selectedBreadcrumb, setSelectedBreadcrumb] =
    useState<SelectedBreadcrumbState | null>(null);
  // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
  const addElement = useStore((state) => state.addElement);
  // ADR-040: elementsMap/childrenMap O(1) 조회
  const element = useStore((state) => state.elementsMap.get(elementId));
  const rawChildren = useStore(
    (state) => state.childrenMap.get(elementId) ?? [],
  );
  const currentPageId = useStore((state) => state.currentPageId);

  // Get customId from element in store
  const customId = element?.customId || "";

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  // Breadcrumbs의 자식 Breadcrumb 요소들 찾기
  const breadcrumbChildren = useMemo(() => {
    return rawChildren
      .filter((child) => child.tag === "Breadcrumb")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [rawChildren]);

  // 개별 Breadcrumb 편집 모드
  if (selectedBreadcrumb && selectedBreadcrumb.parentId === elementId) {
    const currentBreadcrumb =
      breadcrumbChildren[selectedBreadcrumb.breadcrumbIndex];
    if (!currentBreadcrumb) return null;

    const breadcrumbProps = currentBreadcrumb.props as Record<string, unknown>;

    return (
      <>
        <div className="properties-aria">
          <PropertyInput
            label={PROPERTY_LABELS.TEXT}
            value={String(breadcrumbProps.children || "")}
            onChange={(value) => {
              const updateElementProps = useStore.getState().updateElementProps;
              updateElementProps(currentBreadcrumb.id, {
                ...breadcrumbProps,
                children: value,
              });
            }}
            icon={Tag}
          />

          <PropertyInput
            label="Href"
            value={String(breadcrumbProps.href || "")}
            onChange={(value) => {
              const updateElementProps = useStore.getState().updateElementProps;
              updateElementProps(currentBreadcrumb.id, {
                ...breadcrumbProps,
                href: value,
              });
            }}
            placeholder="/"
          />
        </div>

        <div className="tab-actions">
          <button
            className="control-button secondary"
            onClick={() => setSelectedBreadcrumb(null)}
          >
            Back to Breadcrumbs Settings
          </button>
        </div>
      </>
    );
  }

  // Breadcrumbs 전체 설정 모드
  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="breadcrumbs_1"
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />
      </PropertySection>

      <PropertySection title="Breadcrumb Management">
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total breadcrumbs: {breadcrumbChildren.length || 0}
          </p>
          <p className="section-overview-help">
            💡 Click on individual breadcrumbs to edit text and href
          </p>
        </div>

        {breadcrumbChildren.length > 0 && (
          <div className="tabs-list">
            {breadcrumbChildren.map((breadcrumb, index) => {
              const breadcrumbProps = breadcrumb.props as Record<
                string,
                unknown
              >;
              return (
                <div key={breadcrumb.id} className="tab-list-item">
                  <span className="tab-title">
                    {String(breadcrumbProps.children) ||
                      `Breadcrumb ${index + 1}`}
                  </span>
                  <button
                    className="tab-edit-button"
                    onClick={() =>
                      setSelectedBreadcrumb({
                        parentId: elementId,
                        breadcrumbIndex: index,
                      })
                    }
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="tab-actions">
          <button
            className="control-button add"
            onClick={async () => {
              try {
                const pageId = currentPageId || element?.page_id;
                if (!pageId) {
                  console.error("페이지 ID를 찾을 수 없습니다");
                  return;
                }

                const newBreadcrumbIndex = breadcrumbChildren.length || 0;
                const maxOrderNum =
                  breadcrumbChildren.length > 0
                    ? Math.max(
                        ...breadcrumbChildren.map((b) => b.order_num || 0),
                      )
                    : 0;

                const newBreadcrumb = {
                  id: ElementUtils.generateId(),
                  customId: generateCustomId(
                    "Breadcrumb",
                    useStore.getState().elements,
                  ),
                  page_id: pageId,
                  tag: "Breadcrumb",
                  props: {
                    children: `Breadcrumb ${newBreadcrumbIndex + 1}`,
                    href: "/",
                  },
                  parent_id: elementId,
                  order_num: maxOrderNum + 1,
                };

                const db = await getDB();
                const insertedBreadcrumb =
                  await db.elements.insert(newBreadcrumb);
                addElement(insertedBreadcrumb);
                console.log(
                  "✅ [IndexedDB] 새 Breadcrumb 추가됨:",
                  insertedBreadcrumb,
                );
              } catch (error) {
                console.error("Breadcrumb 추가 중 오류:", error);
              }
            }}
          >
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
            Add Breadcrumb
          </button>
        </div>
      </PropertySection>
    </>
  );
});
