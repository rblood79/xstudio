import { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  FileText,
  PointerOff,
  AlertTriangle,
  CheckSquare,
  PenOff,
  CheckCheck,
  Binary,
  Ratio,
  Layout,
  Ruler,
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
import { ElementUtils } from "../../../../utils/element/elementUtils";

interface SelectedRadioState {
  parentId: string;
  radioIndex: number;
}

export const RadioGroupEditor = memo(
  function RadioGroupEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const [selectedRadio, setSelectedRadio] =
      useState<SelectedRadioState | null>(null);
    // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
    const addElement = useStore((state) => state.addElement);
    const currentPageId = useStore((state) => state.currentPageId);
    const updateElementProps = useStore((state) => state.updateElementProps);
    const setElements = useStore((state) => state.setElements);
    const storeElements = useStore((state) => state.elements);

    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      return element?.customId || "";
    }, [elementId]);

    useEffect(() => {
      // 라디오 선택 상태 초기화

      setSelectedRadio(null);
    }, [elementId]);

    // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
    const handleLabelChange = useCallback(
      (value: string) => {
        onUpdate({ label: value });
      },
      [onUpdate],
    );

    const handleDescriptionChange = useCallback(
      (value: string) => {
        onUpdate({ description: value });
      },
      [onUpdate],
    );

    const handleErrorMessageChange = useCallback(
      (value: string) => {
        onUpdate({ errorMessage: value });
      },
      [onUpdate],
    );

    const handleIsEmphasizedChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isEmphasized: checked });
      },
      [onUpdate],
    );

    const handleSizeChange = useCallback(
      (value: string) => {
        onUpdate({ size: value });
      },
      [onUpdate],
    );

    const handleOrientationChange = useCallback(
      (value: string) => {
        onUpdate({ orientation: value });
      },
      [onUpdate],
    );

    const handleValueChange = useCallback(
      (value: string) => {
        onUpdate({ value: value });
      },
      [onUpdate],
    );

    const handleDefaultValueChange = useCallback(
      (value: string) => {
        onUpdate({ defaultValue: value });
      },
      [onUpdate],
    );

    const handleIsRequiredChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isRequired: checked });
      },
      [onUpdate],
    );

    const handleIsInvalidChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isInvalid: checked });
      },
      [onUpdate],
    );

    const handleIsDisabledChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isDisabled: checked });
      },
      [onUpdate],
    );

    const handleIsReadOnlyChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isReadOnly: checked });
      },
      [onUpdate],
    );

    const handleNameChange = useCallback(
      (value: string) => {
        onUpdate({ name: value || undefined });
      },
      [onUpdate],
    );

    const updateCustomId = useCallback(
      (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
          updateElement(elementId, { customId: newCustomId });
        }
      },
      [elementId],
    );

    // ⭐ 최적화: Radio 자식 요소들을 먼저 계산 (콜백들이 이것을 사용하므로)
    const radioChildren = useMemo(() => {
      return storeElements
        .filter(
          (child) => child.parent_id === elementId && child.tag === "Radio",
        )
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // ⭐ 최적화: 라디오 편집 핸들러들
    const handleRadioChildrenChange = useCallback(
      (radioId: string, value: string) => {
        const radio = radioChildren.find((r) => r.id === radioId);
        if (!radio) return;
        const updatedProps = {
          ...radio.props,
          children: value,
        };
        updateElementProps(radioId, updatedProps);
      },
      [radioChildren, updateElementProps],
    );

    const handleRadioValueChange = useCallback(
      (radioId: string, value: string) => {
        const radio = radioChildren.find((r) => r.id === radioId);
        if (!radio) return;
        const updatedProps = {
          ...radio.props,
          value: value,
        };
        updateElementProps(radioId, updatedProps);
      },
      [radioChildren, updateElementProps],
    );

    const handleRadioDisabledChange = useCallback(
      (radioId: string, checked: boolean) => {
        const radio = radioChildren.find((r) => r.id === radioId);
        if (!radio) return;
        const updatedProps = {
          ...radio.props,
          isDisabled: checked,
        };
        updateElementProps(radioId, updatedProps);
      },
      [radioChildren, updateElementProps],
    );

    const handleDeleteRadio = useCallback(
      async (radioId: string) => {
        try {
          const { error } = await supabase
            .from("elements")
            .delete()
            .eq("id", radioId);

          if (error) {
            console.error("Radio 삭제 에러:", error);
            return;
          }

          const updatedElements = storeElements.filter(
            (el) => el.id !== radioId,
          );
          setElements(updatedElements);
          setSelectedRadio(null);
        } catch (error) {
          console.error("Radio 삭제 중 오류:", error);
        }
      },
      [storeElements, setElements],
    );

    // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
    const basicSection = useMemo(
      () => (
        <PropertySection title="Basic">
          <PropertyCustomId
            label="ID"
            value={customId}
            elementId={elementId}
            onChange={updateCustomId}
            placeholder="radiogroup_1"
          />
        </PropertySection>
      ),
      [customId, elementId, updateCustomId],
    );

    const contentSection = useMemo(
      () => (
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
            onChange={handleDescriptionChange}
            icon={FileText}
          />

          <PropertyInput
            label={PROPERTY_LABELS.ERROR_MESSAGE}
            value={String(currentProps.errorMessage || "")}
            onChange={handleErrorMessageChange}
            icon={AlertTriangle}
          />
        </PropertySection>
      ),
      [
        currentProps.label,
        currentProps.description,
        currentProps.errorMessage,
        handleLabelChange,
        handleDescriptionChange,
        handleErrorMessageChange,
      ],
    );

    const designSection = useMemo(
      () => (
        <PropertySection title="Design">
          <PropertySwitch
            label="Emphasized"
            isSelected={Boolean(currentProps.isEmphasized)}
            onChange={handleIsEmphasizedChange}
            icon={Layout}
          />

          <PropertySizeToggle
            label={PROPERTY_LABELS.SIZE}
            value={String(currentProps.size || "md")}
            onChange={handleSizeChange}
          />

          <PropertySelect
            label={PROPERTY_LABELS.ORIENTATION}
            value={String(currentProps.orientation || "vertical")}
            options={[
              {
                value: "vertical",
                label: PROPERTY_LABELS.ORIENTATION_VERTICAL,
              },
              {
                value: "horizontal",
                label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL,
              },
            ]}
            onChange={handleOrientationChange}
            icon={Ratio}
          />
        </PropertySection>
      ),
      [
        currentProps.isEmphasized,
        currentProps.size,
        currentProps.orientation,
        handleIsEmphasizedChange,
        handleSizeChange,
        handleOrientationChange,
      ],
    );

    const stateSection = useMemo(
      () => (
        <PropertySection title="State">
          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.value || "")}
            onChange={handleValueChange}
            icon={Binary}
          />

          <PropertyInput
            label={PROPERTY_LABELS.DEFAULT_VALUE}
            value={String(currentProps.defaultValue || "")}
            onChange={handleDefaultValueChange}
            icon={CheckCheck}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.REQUIRED}
            isSelected={Boolean(currentProps.isRequired)}
            onChange={handleIsRequiredChange}
            icon={CheckSquare}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.INVALID}
            isSelected={Boolean(currentProps.isInvalid)}
            onChange={handleIsInvalidChange}
            icon={AlertTriangle}
          />
        </PropertySection>
      ),
      [
        currentProps.value,
        currentProps.defaultValue,
        currentProps.isRequired,
        currentProps.isInvalid,
        handleValueChange,
        handleDefaultValueChange,
        handleIsRequiredChange,
        handleIsInvalidChange,
      ],
    );

    const behaviorSection = useMemo(
      () => (
        <PropertySection title="Behavior">
          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(currentProps.isDisabled)}
            onChange={handleIsDisabledChange}
            icon={PointerOff}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.READONLY}
            isSelected={Boolean(currentProps.isReadOnly)}
            onChange={handleIsReadOnlyChange}
            icon={PenOff}
          />
        </PropertySection>
      ),
      [
        currentProps.isDisabled,
        currentProps.isReadOnly,
        handleIsDisabledChange,
        handleIsReadOnlyChange,
      ],
    );

    const formIntegrationSection = useMemo(
      () => (
        <PropertySection title="Form Integration">
          <PropertyInput
            label={PROPERTY_LABELS.NAME}
            value={String(currentProps.name || "")}
            onChange={handleNameChange}
            icon={FormInput}
            placeholder="radio-group-name"
          />
        </PropertySection>
      ),
      [currentProps.name, handleNameChange],
    );

    const handleAddRadio = useCallback(async () => {
      try {
        const newRadio = {
          id: ElementUtils.generateId(),
          page_id: currentPageId || "1",
          tag: "Radio",
          props: {
            children: `Option ${(radioChildren.length || 0) + 1}`,
            value: `option${(radioChildren.length || 0) + 1}`,
            isDisabled: false,
            style: {},
            className: "",
          },
          parent_id: elementId,
          order_num: (radioChildren.length || 0) + 1,
        };

        const { data, error } = await supabase
          .from("elements")
          .upsert(newRadio, {
            onConflict: "id",
          })
          .select()
          .single();

        if (error) {
          console.error("Radio 추가 에러:", error);
          return;
        }

        if (data) {
          addElement(data);
          console.log("새 Radio 추가됨:", data);
        }
      } catch (error) {
        console.error("Radio 추가 중 오류:", error);
      }
    }, [currentPageId, radioChildren.length, elementId, addElement]);

    const radioManagementSection = useMemo(
      () => (
        <PropertySection title={PROPERTY_LABELS.RADIO_MANAGEMENT}>
          <div className="tab-overview">
            <p className="tab-overview-text">
              Total radio options: {radioChildren.length || 0}
            </p>
            <p className="section-overview-help">
              💡 Select individual radio options from list to edit label, value,
              and state
            </p>
          </div>

          {radioChildren.length > 0 && (
            <div className="tabs-list">
              {radioChildren.map((radio, index) => (
                <div key={radio.id} className="tab-list-item">
                  <span className="tab-title">
                    {String(
                      (radio.props as Record<string, unknown>).children,
                    ) || `Option ${index + 1}`}
                    {currentProps.value ===
                      (radio.props as Record<string, unknown>).value && " ✓"}
                  </span>
                  <button
                    className="tab-edit-button"
                    onClick={() =>
                      setSelectedRadio({
                        parentId: elementId,
                        radioIndex: index,
                      })
                    }
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="tab-actions">
            <button className="control-button add" onClick={handleAddRadio}>
              <SquarePlus
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              {PROPERTY_LABELS.ADD_RADIO}
            </button>
          </div>
        </PropertySection>
      ),
      [radioChildren, currentProps.value, elementId, handleAddRadio],
    );

    // 선택된 라디오 버튼이 있고, 현재 RadioGroup 컴포넌트의 라디오인 경우 개별 라디오 편집 UI 표시
    if (selectedRadio && selectedRadio.parentId === elementId) {
      const currentRadio = radioChildren[selectedRadio.radioIndex];
      if (!currentRadio) return null;

      return (
        <>
          <div className="properties-aria">
            <PropertyInput
              label={PROPERTY_LABELS.LABEL}
              value={String(
                (currentRadio.props as Record<string, unknown>).children || "",
              )}
              onChange={(value) =>
                handleRadioChildrenChange(currentRadio.id, value)
              }
              icon={Tag}
            />

            <PropertyInput
              label={PROPERTY_LABELS.VALUE}
              value={String(
                (currentRadio.props as Record<string, unknown>).value || "",
              )}
              onChange={(value) =>
                handleRadioValueChange(currentRadio.id, value)
              }
              icon={Binary}
            />

            <PropertySwitch
              label={PROPERTY_LABELS.DISABLED}
              isSelected={Boolean(
                (currentRadio.props as Record<string, unknown>).isDisabled,
              )}
              onChange={(checked) =>
                handleRadioDisabledChange(currentRadio.id, checked)
              }
              icon={PointerOff}
            />

            <div className="tab-actions">
              <button
                className="control-button delete"
                onClick={() => handleDeleteRadio(currentRadio.id)}
              >
                <Trash
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
                {PROPERTY_LABELS.DELETE_THIS_RADIO}
              </button>
            </div>
          </div>

          <div className="tab-actions">
            <button
              className="control-button secondary"
              onClick={() => setSelectedRadio(null)}
            >
              {PROPERTY_LABELS.BACK_TO_RADIO_GROUP_SETTINGS}
            </button>
          </div>
        </>
      );
    }

    // RadioGroup 컴포넌트 전체 설정 UI
    return (
      <>
        {basicSection}
        {contentSection}
        {designSection}
        {stateSection}
        {behaviorSection}
        {formIntegrationSection}
        {radioManagementSection}
      </>
    );
  },
  (prevProps, nextProps) => {
    // ⭐ 기본 비교: id와 properties만 비교
    return (
      prevProps.elementId === nextProps.elementId &&
      JSON.stringify(prevProps.currentProps) ===
        JSON.stringify(nextProps.currentProps)
    );
  },
);
