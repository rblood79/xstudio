import { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
  Type,
  Tag,
  Ratio,
  SquarePlus,
  Trash,
  CheckSquare,
  PointerOff,
  FileText,
  AlertTriangle,
  PenOff,
  Layout,
  FormInput,
} from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { supabase } from "../../../../env/supabase.client";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import type { Element } from "../../../../types/core/store.types";
import { LABEL_POSITION_OPTIONS } from "./editorUtils";

const EMPTY_CHILDREN: Element[] = [];

interface SelectedCheckboxState {
  parentId: string;
  checkboxIndex: number;
}

export const CheckboxGroupEditor = memo(function CheckboxGroupEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const [selectedCheckbox, setSelectedCheckbox] =
    useState<SelectedCheckboxState | null>(null);
  // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
  const addElement = useStore((state) => state.addElement);
  const currentPageId = useStore((state) => state.currentPageId);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const removeElement = useStore((state) => state.removeElement);
  // ADR-040: childrenMap O(1) 조회
  const rawChildren =
    useStore((state) => state.childrenMap.get(elementId)) ?? EMPTY_CHILDREN;

  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  useEffect(() => {
    // 체크박스 선택 상태 초기화

    setSelectedCheckbox(null);
  }, [elementId]);

  const { buildChildUpdates } = useSyncChildProp(elementId);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  const handleLabelPositionChange = useCallback(
    (value: string) => {
      onUpdate({ labelPosition: value });
    },
    [onUpdate],
  );

  const handleLabelChange = (value: string) => {
    const updatedProps = { label: value };
    const childUpdates = buildChildUpdates([
      { childTag: "Label", propKey: "children", value },
    ]);
    useStore
      .getState()
      .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
  };

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  // 실제 Checkbox 자식 요소들을 찾기 (useMemo로 최적화)
  const checkboxChildren = useMemo(() => {
    return rawChildren
      .filter((child) => child.tag === "Checkbox")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [rawChildren]);

  // 선택된 체크박스가 있고, 현재 CheckboxGroup 컴포넌트의 체크박스인 경우 개별 체크박스 편집 UI 표시
  if (selectedCheckbox && selectedCheckbox.parentId === elementId) {
    const currentCheckbox = checkboxChildren[selectedCheckbox.checkboxIndex];
    if (!currentCheckbox) return null;

    return (
      <>
        <div className="properties-aria">
          {/* 체크박스 라벨 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(
              (currentCheckbox.props as Record<string, unknown>).children || "",
            )}
            onChange={(value) => {
              // 실제 Checkbox 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentCheckbox.props,
                children: value,
              };
              updateElementProps(currentCheckbox.id, updatedProps);
            }}
            icon={Tag}
          />

          {/* 체크박스 값 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(
              (currentCheckbox.props as Record<string, unknown>).value || "",
            )}
            onChange={(value) => {
              // 실제 Checkbox 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentCheckbox.props,
                value: value,
              };
              updateElementProps(currentCheckbox.id, updatedProps);
            }}
            icon={Type}
          />

          {/* 체크박스 선택 상태 편집 */}
          <PropertySwitch
            label={PROPERTY_LABELS.SELECTED}
            isSelected={Boolean(
              (currentCheckbox.props as Record<string, unknown>).isSelected,
            )}
            onChange={(checked) => {
              // 실제 Checkbox 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentCheckbox.props,
                isSelected: checked,
              };
              updateElementProps(currentCheckbox.id, updatedProps);
            }}
            icon={CheckSquare}
          />

          {/* 체크박스 비활성화 상태 편집 */}
          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentCheckbox.props as Record<string, unknown>).isDisabled,
            )}
            onChange={(checked) => {
              // 실제 Checkbox 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentCheckbox.props,
                isDisabled: checked,
              };
              updateElementProps(currentCheckbox.id, updatedProps);
            }}
            icon={PointerOff}
          />

          {/* 체크박스 불확실 상태 편집 */}
          <PropertySwitch
            label={PROPERTY_LABELS.INDETERMINATE}
            isSelected={Boolean(
              (currentCheckbox.props as Record<string, unknown>)
                .isIndeterminate,
            )}
            onChange={(checked) => {
              // 실제 Checkbox 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentCheckbox.props,
                isIndeterminate: checked,
              };
              updateElementProps(currentCheckbox.id, updatedProps);
            }}
            icon={CheckSquare}
          />

          {/* 체크박스 삭제 버튼 */}
          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={async () => {
                try {
                  // 실제 Checkbox 컴포넌트를 데이터베이스에서 삭제
                  const { error } = await supabase
                    .from("elements")
                    .delete()
                    .eq("id", currentCheckbox.id);

                  if (error) {
                    console.error("Checkbox 삭제 에러:", error);
                    return;
                  }

                  // 스토어에서도 제거
                  await removeElement(currentCheckbox.id);
                  setSelectedCheckbox(null);
                } catch (error) {
                  console.error("Checkbox 삭제 중 오류:", error);
                }
              }}
            >
              <Trash
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              {PROPERTY_LABELS.DELETE_THIS_CHECKBOX}
            </button>
          </div>
        </div>

        {/* 체크박스 편집 모드 종료 버튼 */}
        <div className="tab-actions">
          <button
            className="control-button secondary"
            onClick={() => setSelectedCheckbox(null)}
          >
            {PROPERTY_LABELS.BACK_TO_CHECKBOX_GROUP_SETTINGS}
          </button>
        </div>
      </>
    );
  }

  // CheckboxGroup 컴포넌트 전체 설정 UI
  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="checkboxgroup_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={handleLabelChange}
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value)}
          icon={FileText}
        />

        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || "")}
          onChange={(value) => updateProp("errorMessage", value)}
          icon={AlertTriangle}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySwitch
          label="Emphasized"
          isSelected={Boolean(currentProps.isEmphasized)}
          onChange={(checked) => updateProp("isEmphasized", checked)}
          icon={Layout}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || "vertical")}
          onChange={(value) => updateProp("orientation", value)}
          options={[
            {
              value: "horizontal",
              label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL,
            },
            { value: "vertical", label: PROPERTY_LABELS.ORIENTATION_VERTICAL },
          ]}
          icon={Ratio}
        />

        <PropertySelect
          label={PROPERTY_LABELS.LABEL_POSITION}
          value={String(currentProps.labelPosition || "top")}
          options={LABEL_POSITION_OPTIONS}
          onChange={handleLabelPositionChange}
          icon={Layout}
        />
      </PropertySection>

      {/* State Section */}
      <PropertySection title="State">
        <PropertySelect
          label={PROPERTY_LABELS.REQUIRED}
          value={String(currentProps.necessityIndicator || "")}
          onChange={(value) => {
            if (value === "") {
              onUpdate({ isRequired: false, necessityIndicator: undefined });
            } else {
              onUpdate({ isRequired: true, necessityIndicator: value });
            }
          }}
          options={[
            { value: "", label: "None" },
            { value: "icon", label: "Icon (*)" },
            { value: "label", label: "Label (required/optional)" },
          ]}
          icon={CheckSquare}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.INVALID}
          isSelected={Boolean(currentProps.isInvalid)}
          onChange={(checked) => updateProp("isInvalid", checked)}
          icon={AlertTriangle}
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

        <PropertySwitch
          label={PROPERTY_LABELS.READONLY}
          isSelected={Boolean(currentProps.isReadOnly)}
          onChange={(checked) => updateProp("isReadOnly", checked)}
          icon={PenOff}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="checkbox-group-name"
        />
      </PropertySection>

      <PropertySection title={PROPERTY_LABELS.CHECKBOX_MANAGEMENT}>
        {/* 체크박스 개수 표시 */}
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total checkboxes: {checkboxChildren.length || 0}
          </p>
          <p className="section-overview-help">
            💡 Select individual checkboxes from list to edit label, value, and
            state
          </p>
        </div>

        {/* 체크박스 목록 */}
        {checkboxChildren.length > 0 && (
          <div className="tabs-list">
            {checkboxChildren.map((checkbox, index) => (
              <div key={checkbox.id} className="tab-list-item">
                <span className="tab-title">
                  {String(
                    (checkbox.props as Record<string, unknown>).children,
                  ) || `Option ${index + 1}`}
                  {Boolean(
                    (checkbox.props as Record<string, unknown>).isSelected,
                  ) && " ✓"}
                </span>
                <button
                  className="tab-edit-button"
                  onClick={() =>
                    setSelectedCheckbox({
                      parentId: elementId,
                      checkboxIndex: index,
                    })
                  }
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 새 체크박스 추가 */}
        <div className="tab-actions">
          <button
            className="control-button add"
            onClick={async () => {
              try {
                // 새로운 Checkbox 요소를 Supabase에 직접 삽입
                const newCheckbox = {
                  id: ElementUtils.generateId(),
                  page_id: currentPageId || "1",
                  tag: "Checkbox",
                  props: {
                    children: `Option ${(checkboxChildren.length || 0) + 1}`,
                    value: `option${(checkboxChildren.length || 0) + 1}`,
                    isSelected: false,
                    isDisabled: false,
                    isIndeterminate: false,
                    style: {},
                    className: "",
                  },
                  parent_id: elementId,
                  order_num: (checkboxChildren.length || 0) + 1,
                };

                const { data, error } = await supabase
                  .from("elements")
                  .upsert(newCheckbox, {
                    onConflict: "id",
                  })
                  .select()
                  .single();

                if (error) {
                  console.error("Checkbox 추가 에러:", error);
                  return;
                }

                if (data) {
                  // 스토어에 새 요소 추가
                  addElement(data);
                  console.log("새 Checkbox 추가됨:", data);
                }
              } catch (error) {
                console.error("Checkbox 추가 중 오류:", error);
              }
            }}
          >
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
            {PROPERTY_LABELS.ADD_CHECKBOX}
          </button>
        </div>
      </PropertySection>
    </>
  );
});
