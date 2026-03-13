import { useEffect, memo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  AlertTriangle,
  Grid,
  MoveHorizontal,
  FileText,
  Menu,
  SquareX,
  Focus,
  Square,
  Binary,
  FormInput,
  CheckSquare,
  Database,
  Search,
} from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertyDataBinding,
  type DataBindingValue,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useCollectionItemManager } from "@/builder/hooks";

export const GridListEditor = memo(function GridListEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Collection Item 관리 훅
  const {
    children,
    selectedItemIndex,
    selectItem,
    deselectItem,
    addItem,
    deleteItem,
    updateItem,
  } = useCollectionItemManager({
    elementId,
    childTag: "GridListItem",
    defaultItemProps: (index) => ({
      label: `Item ${index + 1}`,
      value: `item${index + 1}`,
      description: "",
      textValue: `item${index + 1}`,
    }),
  });

  // Get customId from element in store
  // ADR-040: elementsMap O(1) 조회
  const element = useStore((state) => state.elementsMap.get(elementId));
  const customId = element?.customId || "";

  useEffect(() => {
    // 아이템 선택 상태 초기화
    deselectItem();
  }, [elementId, deselectItem]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
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

  const handleDataBindingChange = (binding: DataBindingValue | null) => {
    const updatedProps = {
      dataBinding: binding || undefined,
    };
    onUpdate(updatedProps);
  };

  // 선택된 아이템이 있는 경우 개별 아이템 편집 UI 표시
  if (selectedItemIndex !== null) {
    const currentItem = children[selectedItemIndex];
    if (!currentItem) return null;

    return (
      <>
        <PropertySection title={PROPERTY_LABELS.ITEM_PROPERTIES}>
          {/* 아이템 라벨 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(
              (currentItem.props as Record<string, unknown>).label || "",
            )}
            onChange={(value) => {
              // 실제 GridListItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                label: value,
              };
              updateItem(currentItem.id, updatedProps);
            }}
            icon={Tag}
          />

          {/* 아이템 값 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(
              (currentItem.props as Record<string, unknown>).value || "",
            )}
            onChange={(value) => {
              // 실제 GridListItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                value: value,
              };
              updateItem(currentItem.id, updatedProps);
            }}
            icon={Binary}
          />

          {/* 아이템 설명 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.DESCRIPTION}
            value={String(
              (currentItem.props as Record<string, unknown>).description || "",
            )}
            onChange={(value) => {
              // 실제 GridListItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                description: value,
              };
              updateItem(currentItem.id, updatedProps);
            }}
            icon={FileText}
          />

          {/* 아이템 텍스트 값 편집 */}
          <PropertyInput
            label={PROPERTY_LABELS.TEXT_VALUE}
            value={String(
              (currentItem.props as Record<string, unknown>).textValue || "",
            )}
            onChange={(value) => {
              // 실제 GridListItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                textValue: value,
              };
              updateItem(currentItem.id, updatedProps);
            }}
            icon={Binary}
          />

          {/* 아이템 비활성화 상태 편집 */}
          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentItem.props as Record<string, unknown>).isDisabled,
            )}
            onChange={(checked) => {
              // 실제 GridListItem 컴포넌트의 props 업데이트
              const updatedProps = {
                ...currentItem.props,
                isDisabled: checked,
              };
              updateItem(currentItem.id, updatedProps);
            }}
            icon={PointerOff}
          />

          {/* 아이템 삭제 버튼 */}
          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={() => deleteItem(currentItem.id)}
            >
              <Trash
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              {PROPERTY_LABELS.DELETE_THIS_ITEM}
            </button>
          </div>
        </PropertySection>

        {/* 아이템 편집 모드 종료 버튼 */}
        <div className="tab-actions">
          <button className="control-button secondary" onClick={deselectItem}>
            {PROPERTY_LABELS.BACK_TO_GRID_LIST_SETTINGS}
          </button>
        </div>
      </>
    );
  }

  // GridList 컴포넌트 전체 설정 UI
  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="gridlist_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
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
      </PropertySection>

      {/* Data Binding Section */}
      <PropertySection title="Data Binding" icon={Database}>
        <PropertyDataBinding
          label="데이터 소스"
          value={currentProps.dataBinding as DataBindingValue | undefined}
          onChange={handleDataBindingChange}
        />
      </PropertySection>

      {/* Filtering Section */}
      <PropertySection title="Filtering">
        <PropertyInput
          label="Filter Text"
          value={String(currentProps.filterText || "")}
          onChange={(value) => updateProp("filterText", value || undefined)}
          placeholder="Search..."
          icon={Search}
        />

        <PropertyInput
          label="Filter Fields"
          value={String(
            ((currentProps.filterFields as string[]) || []).join(", "),
          )}
          onChange={(value) => {
            const fields = value
              .split(",")
              .map((f: string) => f.trim())
              .filter(Boolean);
            updateProp("filterFields", fields.length > 0 ? fields : undefined);
          }}
          placeholder="label, name, title"
          icon={FileText}
        />
        <p className="property-help">
          💡 쉼표로 구분하여 검색할 필드 지정 (기본: label, name, title)
        </p>
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
          icon={Grid}
        />

        <PropertySelect
          label={PROPERTY_LABELS.SELECTION_BEHAVIOR}
          value={String(currentProps.selectionBehavior || "toggle")}
          onChange={(value) => updateProp("selectionBehavior", value)}
          options={[
            {
              value: "toggle",
              label: PROPERTY_LABELS.SELECTION_BEHAVIOR_TOGGLE,
            },
            {
              value: "replace",
              label: PROPERTY_LABELS.SELECTION_BEHAVIOR_REPLACE,
            },
          ]}
          icon={Menu}
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

        <PropertySwitch
          label={PROPERTY_LABELS.ALLOWS_DRAGGING}
          isSelected={Boolean(currentProps.allowsDragging)}
          onChange={(checked) => updateProp("allowsDragging", checked)}
          icon={MoveHorizontal}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.RENDER_EMPTY_STATE}
          isSelected={Boolean(currentProps.renderEmptyState)}
          onChange={(checked) => updateProp("renderEmptyState", checked)}
          icon={Square}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="gridlist-name"
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
      </PropertySection>

      {/* Item Management Section */}
      <PropertySection title={PROPERTY_LABELS.ITEM_MANAGEMENT}>
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total items: {children.length || 0}
          </p>
          <p className="section-overview-help">
            💡 Select individual items from list to edit label, value,
            description, and state
          </p>
        </div>

        {children.length > 0 && (
          <div className="tabs-list">
            {children.map((item, index) => (
              <div key={item.id} className="tab-list-item">
                <span className="tab-title">
                  {String((item.props as Record<string, unknown>).label) ||
                    `Item ${index + 1}`}
                </span>
                <button
                  className="tab-edit-button"
                  onClick={() => selectItem(index)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="tab-actions">
          <button className="control-button add" onClick={addItem}>
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
            {PROPERTY_LABELS.ADD_ITEM}
          </button>
        </div>
      </PropertySection>
    </>
  );
});
