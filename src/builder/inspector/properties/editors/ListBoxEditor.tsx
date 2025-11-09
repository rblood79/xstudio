import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  AlertTriangle,
  List,
  SquareX,
  Focus,
  Binary,
  FileText,
  Type,
  Hash,
  FormInput,
  CheckSquare,
} from "lucide-react";
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId } from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/labels";
import { supabase } from "../../../../env/supabase.client";
import { useStore } from "../../../stores";
import { ElementUtils } from "../../../../utils/elementUtils";

interface SelectedItemState {
  parentId: string;
  itemIndex: number;
}

export function ListBoxEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(
    null
  );
  const { addElement, currentPageId, updateElementProps, setElements } =
    useStore();

  // 스토어에서 elements를 직접 구독하여 실시간 업데이트
  const storeElements = useStore((state) => state.elements);

  // Get customId from element in store
  const element = storeElements.find((el) => el.id === elementId);
  const customId = element?.customId || '';

  useEffect(() => {
    // 아이템 선택 상태 초기화
    setSelectedItem(null);
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  // 실제 ListBoxItem 자식 요소들을 찾기 (useMemo로 최적화)
  const listBoxChildren = useMemo(() => {
    return storeElements
      .filter(
        (child) => child.parent_id === elementId && child.tag === "ListBoxItem"
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [storeElements, elementId]);

  // 선택된 아이템이 있고, 현재 ListBox 컴포넌트의 아이템인 경우 개별 아이템 편집 UI 표시
  if (selectedItem && selectedItem.parentId === elementId) {
    const currentItem = listBoxChildren[selectedItem.itemIndex];
    if (!currentItem) return null;

    return (
      <div className="component-props">
        <fieldset className="properties-aria">
          {/* 아이템 라벨 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(
              (currentItem.props as Record<string, unknown>).label || ""
            )}
            onChange={(value) => {
              // 실제 ListBoxItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                label: value,
              };
              updateElementProps(currentItem.id, updatedProps);
            }}
            icon={Tag}
          />

          {/* 아이템 값 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(
              (currentItem.props as Record<string, unknown>).value || ""
            )}
            onChange={(value) => {
              // 실제 ListBoxItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                value: value,
              };
              updateElementProps(currentItem.id, updatedProps);
            }}
            icon={Binary}
          />

          {/* 아이템 비활성화 상태 편집 */}
          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentItem.props as Record<string, unknown>).isDisabled
            )}
            onChange={(checked) => {
              // 실제 ListBoxItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                isDisabled: checked,
              };
              updateElementProps(currentItem.id, updatedProps);
            }}
            icon={PointerOff}
          />

          {/* 아이템 삭제 버튼 */}
          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={async () => {
                try {
                  // 실제 ListBoxItem 컴포넌트를 데이터베이스에서 삭제
                  const { error } = await supabase
                    .from("elements")
                    .delete()
                    .eq("id", currentItem.id);

                  if (error) {
                    console.error("ListBoxItem 삭제 에러:", error);
                    return;
                  }

                  // 스토어에서도 제거
                  const updatedElements = storeElements.filter(
                    (el) => el.id !== currentItem.id
                  );
                  setElements(updatedElements);
                  setSelectedItem(null);
                } catch (error) {
                  console.error("ListBoxItem 삭제 중 오류:", error);
                }
              }}
            >
              <Trash
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
              Delete This Item
            </button>
          </div>
        </fieldset>

        {/* 아이템 편집 모드 종료 버튼 */}
        <div className="tab-actions">
          <button
            className="control-button secondary"
            onClick={() => setSelectedItem(null)}
          >
            Back to ListBox Settings
          </button>
        </div>
      </div>
    );
  }

  // ListBox 컴포넌트 전체 설정 UI
  return (
    <div className="component-props">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        onChange={updateCustomId}
        placeholder="listbox_1"
      />

      {/* Content Section */}
      <fieldset className="properties-group">
        <legend>Content</legend>

        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value || undefined)}
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value || undefined)}
          icon={FileText}
        />

        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || "")}
          onChange={(value) => updateProp("errorMessage", value || undefined)}
          icon={AlertTriangle}
        />
      </fieldset>

      {/* State Section */}
      <fieldset className="properties-group">
        <legend>State</legend>

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
          icon={List}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
          isSelected={Boolean(currentProps.disallowEmptySelection)}
          onChange={(checked) => updateProp("disallowEmptySelection", checked)}
          icon={SquareX}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.REQUIRED}
          isSelected={Boolean(currentProps.isRequired)}
          onChange={(checked) => updateProp("isRequired", checked)}
          icon={CheckSquare}
        />
      </fieldset>

      {/* Behavior Section */}
      <fieldset className="properties-group">
        <legend>Behavior</legend>

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
      </fieldset>

      {/* Form Integration Section */}
      <fieldset className="properties-group">
        <legend>Form Integration</legend>

        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="listbox-name"
        />

        <PropertySelect
          label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
          value={String(currentProps.validationBehavior || "native")}
          onChange={(value) => updateProp("validationBehavior", value)}
          options={[
            { value: "native", label: "Native" },
            { value: "aria", label: "ARIA" },
          ]}
        />
      </fieldset>

      {/* Accessibility Section */}
      <fieldset className="properties-group">
        <legend>Accessibility</legend>

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value || undefined)}
          icon={Type}
          placeholder="ListBox label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={(value) => updateProp("aria-labelledby", value || undefined)}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps["aria-describedby"] || "")}
          onChange={(value) => updateProp("aria-describedby", value || undefined)}
          icon={Hash}
          placeholder="description-element-id"
        />
      </fieldset>

      {/* Item Management Section */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">{PROPERTY_LABELS.ITEM_MANAGEMENT}</legend>

        <div className="tab-overview">
          <p className="tab-overview-text">
            Total items: {listBoxChildren.length || 0}
          </p>
          <p className="tab-overview-help">
            💡 Select individual items from list to edit label, value, and state
          </p>
        </div>

        {listBoxChildren.length > 0 && (
          <div className="react-aria-ListBox">
            {listBoxChildren.map((item, index) => (
              <div key={item.id} className="react-aria-ListBoxItem">
                <span className="tab-title">
                  {String(
                    (item.props as Record<string, unknown>).label ||
                    `Item ${index + 1}`
                  )}
                </span>
                <button
                  className="tab-edit-button"
                  onClick={() =>
                    setSelectedItem({ parentId: elementId, itemIndex: index })
                  }
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="tab-actions">
          <button
            className="control-button add"
            onClick={async () => {
              try {
                console.log(" ListBoxEditor - elementId:", elementId);
                console.log(
                  "🔍 ListBoxEditor - storeElements:",
                  storeElements.map((el) => ({ id: el.id, tag: el.tag }))
                );

                const newItem = {
                  id: ElementUtils.generateId(),
                  page_id: currentPageId || "1",
                  tag: "ListBoxItem",
                  props: {
                    label: `Item ${(listBoxChildren.length || 0) + 1}`,
                    value: `item${(listBoxChildren.length || 0) + 1}`,
                    isDisabled: false,
                    style: {},
                    className: "",
                  },
                  parent_id: elementId,
                  order_num: (listBoxChildren.length || 0) + 1,
                };

                const data =
                  await ElementUtils.createChildElementWithParentCheck(
                    newItem,
                    currentPageId || "1",
                    elementId
                  );

                addElement(data);
                console.log("새 ListBoxItem 추가됨:", data);
              } catch (error) {
                console.error("ListBoxItem 추가 중 오류:", error);
              }
            }}
          >
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
            Add Item
          </button>
        </div>
      </fieldset>
    </div>
  );
}
