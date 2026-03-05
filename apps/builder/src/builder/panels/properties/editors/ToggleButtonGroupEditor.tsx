import { useState, useEffect, useMemo, memo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  AlertTriangle,
  ToggleLeft,
  Focus,
  Binary,
  FileText,
  Target,
  Layout,
  FormInput,
  CheckSquare,
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
import { useStore } from "../../../stores";
import { getDB } from "../../../../lib/db";
import { ElementUtils } from "../../../../utils/element/elementUtils";

interface SelectedButtonState {
  parentId: string;
  buttonIndex: number;
}

export const ToggleButtonGroupEditor = memo(function ToggleButtonGroupEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const [selectedButton, setSelectedButton] =
    useState<SelectedButtonState | null>(null);
  // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
  const addElement = useStore((state) => state.addElement);
  const currentPageId = useStore((state) => state.currentPageId);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const setElements = useStore((state) => state.setElements);
  // 스토어에서 elements를 직접 구독하여 실시간 업데이트
  const storeElements = useStore((state) => state.elements);

  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  useEffect(() => {
    // 버튼 선택 상태 초기화
    setSelectedButton(null);
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };

    onUpdate(updatedProps);
  };

  // 실제 ToggleButton 자식 요소들을 찾기 (useMemo로 최적화)
  const toggleButtonChildren = useMemo(() => {
    return storeElements
      .filter(
        (child) =>
          child.parent_id === elementId && child.tag === "ToggleButton",
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [storeElements, elementId]);

  // 선택된 토글 버튼이 있고, 현재 ToggleButtonGroup 컴포넌트의 버튼인 경우 개별 버튼 편집 UI 표시
  if (selectedButton && selectedButton.parentId === elementId) {
    const currentButton = toggleButtonChildren[selectedButton.buttonIndex];
    if (!currentButton) return null;

    return (
      <>
        <div className="properties-aria">
          {/* 버튼 텍스트 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.CHILDREN}
            value={String(
              (currentButton.props as Record<string, unknown>).children || "",
            )}
            onChange={(value) => {
              // 실제 ToggleButton 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentButton.props,
                children: value,
              };
              updateElementProps(currentButton.id, updatedProps);
            }}
            icon={Tag}
          />

          {/* 버튼 비활성화 상태 편집 */}
          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentButton.props as Record<string, unknown>).isDisabled,
            )}
            onChange={(isSelected: boolean) => {
              const updatedProps = {
                ...currentButton.props,
                isDisabled: isSelected,
              } as Record<string, unknown>;
              updateElementProps(currentButton.id, updatedProps);
            }}
            icon={PointerOff}
          />

          {/* 버튼 삭제 버튼 */}
          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={async () => {
                try {
                  // IndexedDB에서 ToggleButton 삭제
                  const db = await getDB();
                  await db.elements.delete(currentButton.id);

                  // 스토어에서도 제거
                  const updatedElements = storeElements.filter(
                    (el) => el.id !== currentButton.id,
                  );
                  setElements(updatedElements);
                  setSelectedButton(null);
                } catch (error) {
                  console.error("ToggleButton 삭제 중 오류:", error);
                }
              }}
            >
              <Trash
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              Delete This Button
            </button>
          </div>
        </div>

        {/* 버튼 편집 모드 종료 버튼 */}
        <div className="tab-actions">
          <button
            className="control-button secondary"
            onClick={() => setSelectedButton(null)}
          >
            Back to ToggleButtonGroup Settings
          </button>
        </div>
      </>
    );
  }

  // ToggleButtonGroup 컴포넌트 전체 설정 UI
  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="togglebuttongroup_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value)}
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

        <PropertySwitch
          label={PROPERTY_LABELS.IS_QUIET}
          isSelected={Boolean(currentProps.isQuiet)}
          onChange={(checked) => updateProp("isQuiet", checked)}
          icon={Layout}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || "horizontal")}
          onChange={(value) => {
            // orientation 변경 시 style.flexDirection도 함께 업데이트
            const flexDirection = value === "vertical" ? "column" : "row";
            const currentStyle =
              (currentProps.style as Record<string, unknown>) || {};
            const updatedProps = {
              ...currentProps,
              orientation: value,
              style: {
                ...currentStyle,
                display: "flex",
                flexDirection,
              },
            };
            onUpdate(updatedProps);
          }}
          options={[
            {
              value: "horizontal",
              label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL,
            },
            { value: "vertical", label: PROPERTY_LABELS.ORIENTATION_VERTICAL },
          ]}
          icon={ToggleLeft}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.INDICATOR}
          isSelected={currentProps.indicator === true}
          onChange={(checked) => {
            updateProp("indicator", checked);
          }}
          icon={Target}
        />
      </PropertySection>

      {/* State Section */}
      <PropertySection title="State">
        <PropertySelect
          label={PROPERTY_LABELS.SELECTION_MODE}
          value={String(currentProps.selectionMode || "single")}
          onChange={(value) => updateProp("selectionMode", value)}
          options={[
            { value: "single", label: PROPERTY_LABELS.SELECTION_MODE_SINGLE },
            {
              value: "multiple",
              label: PROPERTY_LABELS.SELECTION_MODE_MULTIPLE,
            },
          ]}
          icon={Binary}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.REQUIRED}
          isSelected={Boolean(currentProps.isRequired)}
          onChange={(checked) => updateProp("isRequired", checked)}
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
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={(checked) => updateProp("autoFocus", checked)}
          icon={Focus}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="togglebutton-group-name"
        />
      </PropertySection>

      <PropertySection title={PROPERTY_LABELS.BUTTON_MANAGEMENT}>
        {/* 버튼 개수 표시 */}
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total buttons: {toggleButtonChildren.length || 0}
          </p>
          <p className="section-overview-help">
            💡 Select individual buttons from list to edit text and state
          </p>
        </div>

        {/* 버튼 목록 */}
        {toggleButtonChildren.length > 0 && (
          <div className="tabs-list">
            {toggleButtonChildren.map((button, index) => (
              <div key={button.id} className="tab-list-item">
                <span className="tab-title">
                  {String(
                    (button.props as Record<string, unknown>).children ||
                      `Button ${index + 1}`,
                  )}
                </span>
                <button
                  className="tab-edit-button"
                  onClick={() =>
                    setSelectedButton({
                      parentId: elementId,
                      buttonIndex: index,
                    })
                  }
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 새 토글 버튼 추가 */}
        <div className="tab-actions">
          <button
            className="control-button add"
            onClick={async () => {
              try {
                // 새로운 ToggleButton 요소를 Supabase에 직접 삽입
                const newToggleButton = {
                  id: ElementUtils.generateId(),
                  page_id: currentPageId || "1",
                  tag: "ToggleButton",
                  props: {
                    isSelected: false,
                    defaultSelected: false,
                    children: `Toggle ${(toggleButtonChildren.length || 0) + 1}`,
                    style: {},
                    className: "",
                  },
                  parent_id: elementId,
                  order_num: (toggleButtonChildren.length || 0) + 1,
                };

                // IndexedDB에 저장
                const db = await getDB();
                const insertedButton =
                  await db.elements.insert(newToggleButton);

                // 스토어에 새 요소 추가
                addElement(insertedButton);
                console.log(
                  "✅ [IndexedDB] 새 ToggleButton 추가됨:",
                  insertedButton,
                );
              } catch (error) {
                console.error("ToggleButton 추가 중 오류:", error);
              }
            }}
          >
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
            {PROPERTY_LABELS.ADD_TOGGLE_BUTTON}
          </button>
        </div>
      </PropertySection>
    </>
  );
});
