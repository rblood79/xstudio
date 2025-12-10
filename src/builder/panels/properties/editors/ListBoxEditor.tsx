import { useEffect, memo, useCallback, useMemo } from "react";
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
  Database,
  Wand2,
  Zap,
  Ruler,
  Rows,
  Search,
  Filter,
} from "lucide-react";
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection, PropertyDataBinding, type DataBindingValue } from '../../common';
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useDataTables } from "../../../stores/data";
import { useCollectionItemManager } from "../../../hooks/useCollectionItemManager";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import { generateCustomId } from "../../../utils/idGeneration";
import { getDB } from "../../../../lib/db";
import type { Element } from "../../../../types/core/store.types";

export const ListBoxEditor = memo(function ListBoxEditor({
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
    childTag: 'ListBoxItem',
    defaultItemProps: (index) => ({
      label: `Item ${index + 1}`,
      value: `item${index + 1}`,
    }),
  });

  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || '';
  }, [elementId]);

  // ⭐ 최적화: 개별 selector로 분리 (CLAUDE.md Anti-pattern 방지)
  const addElement = useStore((state) => state.addElement);
  const removeElement = useStore((state) => state.removeElement);
  const currentPageId = useStore((state) => state.currentPageId);

  // ⭐ 최적화: DataBinding에서 필요한 테이블 이름만 추출
  const dataBindingTableName = useMemo(() => {
    const dataBinding = currentProps.dataBinding as DataBindingValue | undefined;
    if (!dataBinding || dataBinding.source !== 'dataTable' || !dataBinding.name) {
      return null;
    }
    return dataBinding.name;
  }, [currentProps.dataBinding]);

  // ⭐ 최적화: 필요한 테이블만 구독 (전체 dataTables 구독 방지)
  const dataTables = useDataTables();
  const selectedTable = useMemo(() => {
    if (!dataBindingTableName) return null;
    return dataTables.find(dt => dt.name === dataBindingTableName) || null;
  }, [dataTables, dataBindingTableName]);

  // ⭐ 최적화: schema만 추출 (테이블 객체 전체가 아닌)
  const selectedSchema = selectedTable?.schema || null;

  // ⭐ 최적화: 자식 요소 조회 (getState로 구독 없이 조회)
  const getChildElements = useCallback(() => {
    return useStore.getState().elements.filter(el => el.parent_id === elementId);
  }, [elementId]);

  // 첫 번째 ListBoxItem (템플릿용) 찾기 - 렌더링 시점에 조회
  const templateItem = useMemo(() => {
    const childElements = getChildElements();
    return childElements.find((el) => el.tag === 'ListBoxItem');
  }, [getChildElements, children]); // children 변경 시 재계산

  // ⭐ 최적화: Field 자식들 조회 (getState로 구독 없이 조회)
  const existingFields = useMemo(() => {
    if (!templateItem?.id) return [];
    return useStore.getState().elements
      .filter((el) => el.parent_id === templateItem.id && el.tag === 'Field')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [templateItem?.id, children]); // children 변경 시 재계산

  // Field 타입 추론 함수
  const inferFieldType = useCallback((key: string, schemaType: string): string => {
    // key 이름 기반 추론
    const keyLower = key.toLowerCase();
    if (keyLower.includes('email')) return 'email';
    if (keyLower.includes('url') || keyLower.includes('link') || keyLower.includes('website')) return 'url';
    if (keyLower.includes('avatar') || keyLower.includes('image') || keyLower.includes('photo') || keyLower.includes('picture')) return 'image';
    if (keyLower.includes('date') || keyLower.includes('created') || keyLower.includes('updated') || keyLower.includes('time')) return 'date';

    // schema type 기반
    if (schemaType === 'boolean') return 'boolean';
    if (schemaType === 'number') return 'number';
    if (schemaType === 'date' || schemaType === 'datetime') return 'date';
    if (schemaType === 'email') return 'email';
    if (schemaType === 'url') return 'url';
    if (schemaType === 'image') return 'image';

    return 'string';
  }, []);

  // Auto-Generate Fields 핸들러
  const handleAutoGenerateFields = useCallback(async () => {
    if (!selectedSchema || selectedSchema.length === 0) {
      alert('DataTable을 먼저 선택해주세요.');
      return;
    }

    const pageIdToUse = currentPageId;
    if (!pageIdToUse) {
      alert('페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    let targetItemId = templateItem?.id;

    // 템플릿 아이템이 없으면 새로 생성
    if (!targetItemId) {
      const { elements } = useStore.getState();
      const maxOrderNum = Math.max(0, ...children.map((el) => el.order_num || 0));

      const newItem: Element = {
        id: ElementUtils.generateId(),
        customId: generateCustomId('ListBoxItem', elements),
        page_id: pageIdToUse,
        tag: 'ListBoxItem',
        props: {
          style: {},
          className: '',
        },
        parent_id: elementId,
        order_num: maxOrderNum + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const db = await getDB();
        const inserted = await db.elements.insert(newItem);
        addElement(inserted);
        targetItemId = inserted.id;
        console.log('✅ [IndexedDB] ListBoxItem created for auto-generate');
      } catch (err) {
        console.error('❌ [IndexedDB] Failed to create ListBoxItem:', err);
        alert('ListBoxItem 생성 중 오류가 발생했습니다.');
        return;
      }
    }

    // 기존 Field 삭제 확인
    if (existingFields.length > 0) {
      const confirm = window.confirm(
        `기존 ${existingFields.length}개의 Field가 있습니다. 새로 생성하면 기존 Field는 유지됩니다.\n계속하시겠습니까?`
      );
      if (!confirm) return;
    }

    // Schema 기반 Field 생성
    const { elements } = useStore.getState();
    const db = await getDB();
    let orderNum = existingFields.length > 0
      ? Math.max(...existingFields.map(f => f.order_num || 0)) + 1
      : 1;

    for (const field of selectedSchema) {
      const fieldType = inferFieldType(field.key, field.type);

      const newField: Element = {
        id: ElementUtils.generateId(),
        customId: generateCustomId('Field', elements),
        page_id: pageIdToUse,
        tag: 'Field',
        props: {
          key: field.key,
          label: field.label || field.key,
          type: fieldType,
          showLabel: true,
          visible: true,
          style: {},
          className: '',
        },
        parent_id: targetItemId,
        order_num: orderNum++,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const inserted = await db.elements.insert(newField);
        addElement(inserted);
      } catch (err) {
        console.error(`❌ [IndexedDB] Failed to create Field for ${field.key}:`, err);
      }
    }

    console.log(`✅ [Auto-Generate] ${selectedSchema.length}개의 Field가 생성되었습니다.`);
    alert(`${selectedSchema.length}개의 Field가 자동 생성되었습니다!`);
  }, [selectedSchema, currentPageId, templateItem, existingFields, children, elementId, addElement, inferFieldType]);

  useEffect(() => {
    // 아이템 선택 상태 초기화
    deselectItem();
  }, [elementId, deselectItem]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, label: value || undefined });
  }, [currentProps, onUpdate]);

  const handleDescriptionChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, description: value || undefined });
  }, [currentProps, onUpdate]);

  const handleErrorMessageChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, errorMessage: value || undefined });
  }, [currentProps, onUpdate]);

  const handleSelectionModeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, selectionMode: value });
  }, [currentProps, onUpdate]);

  const handleDisallowEmptySelectionChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, disallowEmptySelection: checked });
  }, [currentProps, onUpdate]);

  const handleIsRequiredChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isRequired: checked });
  }, [currentProps, onUpdate]);

  const handleIsDisabledChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isDisabled: checked });
  }, [currentProps, onUpdate]);

  const handleAutoFocusChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, autoFocus: checked });
  }, [currentProps, onUpdate]);

  const handleNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, name: value || undefined });
  }, [currentProps, onUpdate]);

  const handleValidationBehaviorChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, validationBehavior: value });
  }, [currentProps, onUpdate]);

  const handleAriaLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-label": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelledbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaDescribedbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-describedby": value || undefined });
  }, [currentProps, onUpdate]);

  const handleDataBindingChange = useCallback(async (binding: DataBindingValue | null) => {
    // 이전 DataTable과 새 DataTable 비교
    const prevBinding = currentProps.dataBinding as DataBindingValue | undefined;
    const prevTableName = prevBinding?.source === 'dataTable' ? prevBinding.name : null;
    const newTableName = binding?.source === 'dataTable' ? binding.name : null;

    // DataTable이 변경되었고 기존 Field가 있으면 삭제 확인
    if (prevTableName && newTableName && prevTableName !== newTableName && existingFields.length > 0) {
      const shouldReset = window.confirm(
        `DataTable이 "${prevTableName}"에서 "${newTableName}"으로 변경되었습니다.\n` +
        `기존 ${existingFields.length}개의 Field를 삭제하시겠습니까?\n\n` +
        `[확인]: Field 삭제 후 새 DataTable 적용\n` +
        `[취소]: Field 유지하고 DataTable만 변경`
      );

      if (shouldReset) {
        // 기존 Field들 삭제
        for (const field of existingFields) {
          await removeElement(field.id);
        }
        console.log(`🗑️ [DataBinding] ${existingFields.length}개의 Field가 삭제되었습니다.`);
      }
    }

    // dataBinding 업데이트
    onUpdate({ ...currentProps, dataBinding: binding || undefined });
  }, [currentProps, onUpdate, existingFields, removeElement]);

  // 가상화 관련 핸들러
  const handleEnableVirtualizationChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, enableVirtualization: checked });
  }, [currentProps, onUpdate]);

  const handleVirtualHeightChange = useCallback((value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdate({ ...currentProps, height: numValue });
    }
  }, [currentProps, onUpdate]);

  const handleOverscanChange = useCallback((value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate({ ...currentProps, overscan: numValue });
    }
  }, [currentProps, onUpdate]);

  // 필터링 관련 핸들러 (React Aria 1.13.0)
  const handleFilterTextChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, filterText: value || undefined });
  }, [currentProps, onUpdate]);

  const handleFilterFieldsChange = useCallback((value: string) => {
    // 콤마로 구분된 필드 목록을 배열로 변환
    const fields = value
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);
    onUpdate({ ...currentProps, filterFields: fields.length > 0 ? fields : undefined });
  }, [currentProps, onUpdate]);

  const updateCustomId = useCallback((newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  }, [elementId]);

  // ⭐ 최적화: 아이템 편집 핸들러들
  const handleItemLabelChange = useCallback((itemId: string, value: string) => {
    const currentItem = children.find(item => item.id === itemId);
    if (!currentItem) return;
    const updatedProps = {
      ...currentItem.props,
      label: value,
    };
    updateItem(itemId, updatedProps);
  }, [children, updateItem]);

  const handleItemValueChange = useCallback((itemId: string, value: string) => {
    const currentItem = children.find(item => item.id === itemId);
    if (!currentItem) return;
    const updatedProps = {
      ...currentItem.props,
      value: value,
    };
    updateItem(itemId, updatedProps);
  }, [children, updateItem]);

  const handleItemDisabledChange = useCallback((itemId: string, checked: boolean) => {
    const currentItem = children.find(item => item.id === itemId);
    if (!currentItem) return;
    const updatedProps = {
      ...currentItem.props,
      isDisabled: checked,
    };
    updateItem(itemId, updatedProps);
  }, [children, updateItem]);

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="listbox_1"
        />
      </PropertySection>
    ),
    [customId, elementId, updateCustomId]
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
    ]
  );

  const stateSection = useMemo(
    () => (
      <PropertySection title="State">
        <PropertySelect
          label={PROPERTY_LABELS.SELECTION_MODE}
          value={String(currentProps.selectionMode || "single")}
          onChange={handleSelectionModeChange}
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
          onChange={handleDisallowEmptySelectionChange}
          icon={SquareX}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.REQUIRED}
          isSelected={Boolean(currentProps.isRequired)}
          onChange={handleIsRequiredChange}
          icon={CheckSquare}
        />
      </PropertySection>
    ),
    [
      currentProps.selectionMode,
      currentProps.disallowEmptySelection,
      currentProps.isRequired,
      handleSelectionModeChange,
      handleDisallowEmptySelectionChange,
      handleIsRequiredChange,
    ]
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
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={handleAutoFocusChange}
          icon={Focus}
        />
      </PropertySection>
    ),
    [
      currentProps.isDisabled,
      currentProps.autoFocus,
      handleIsDisabledChange,
      handleAutoFocusChange,
    ]
  );

  const performanceSection = useMemo(
    () => (
      <PropertySection title="Performance">
        <PropertySwitch
          label="가상화 활성화"
          isSelected={Boolean(currentProps.enableVirtualization)}
          onChange={handleEnableVirtualizationChange}
          icon={Zap}
        />

        {currentProps.enableVirtualization && (
          <>
            <PropertyInput
              label="컨테이너 높이 (px)"
              value={String(currentProps.height || 300)}
              onChange={handleVirtualHeightChange}
              icon={Ruler}
              placeholder="300"
            />

            <PropertyInput
              label="Overscan (추가 렌더)"
              value={String(currentProps.overscan || 5)}
              onChange={handleOverscanChange}
              icon={Rows}
              placeholder="5"
            />

            <p className="section-overview-help">
              💡 가상화 활성화 시 10,000+ 아이템도 원활하게 처리됩니다
            </p>
          </>
        )}
      </PropertySection>
    ),
    [
      currentProps.enableVirtualization,
      currentProps.height,
      currentProps.overscan,
      handleEnableVirtualizationChange,
      handleVirtualHeightChange,
      handleOverscanChange,
    ]
  );

  // 필터링 섹션 (React Aria 1.13.0)
  const filteringSection = useMemo(
    () => (
      <PropertySection title="Filtering" icon={Filter}>
        <PropertyInput
          label="필터 텍스트"
          value={String(currentProps.filterText || "")}
          onChange={handleFilterTextChange}
          icon={Search}
          placeholder="검색어 입력..."
        />

        <PropertyInput
          label="필터 대상 필드"
          value={Array.isArray(currentProps.filterFields)
            ? currentProps.filterFields.join(', ')
            : ''}
          onChange={handleFilterFieldsChange}
          icon={Filter}
          placeholder="label, name, title"
        />

        <p className="section-overview-help">
          💡 필터 대상 필드가 비어있으면 기본값 (label, name, title) 사용
        </p>
      </PropertySection>
    ),
    [
      currentProps.filterText,
      currentProps.filterFields,
      handleFilterTextChange,
      handleFilterFieldsChange,
    ]
  );

  const formIntegrationSection = useMemo(
    () => (
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={handleNameChange}
          icon={FormInput}
          placeholder="listbox-name"
        />

        <PropertySelect
          label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
          value={String(currentProps.validationBehavior || "native")}
          onChange={handleValidationBehaviorChange}
          options={[
            { value: "native", label: "Native" },
            { value: "aria", label: "ARIA" },
          ]}
        />
      </PropertySection>
    ),
    [
      currentProps.name,
      currentProps.validationBehavior,
      handleNameChange,
      handleValidationBehaviorChange,
    ]
  );

  const dataBindingSection = useMemo(
    () => (
      <PropertySection title="Data Binding" icon={Database}>
        <PropertyDataBinding
          label="데이터 소스"
          value={currentProps.dataBinding as DataBindingValue | undefined}
          onChange={handleDataBindingChange}
        />

        {/* Schema 정보 표시 및 Auto-Generate 버튼 */}
        {selectedSchema && selectedSchema.length > 0 && (
          <div className="auto-generate-section">
            <div className="schema-info">
              <p className="tab-overview-text">
                📋 {selectedSchema.length}개의 컬럼이 감지되었습니다
              </p>
              <div className="schema-columns">
                {selectedSchema.slice(0, 5).map((field) => (
                  <span key={field.key} className="schema-column-tag">
                    {field.label || field.key} ({field.type})
                  </span>
                ))}
                {selectedSchema.length > 5 && (
                  <span className="schema-column-more">
                    +{selectedSchema.length - 5}개 더
                  </span>
                )}
              </div>
            </div>

            <div className="tab-actions">
              <button
                className="control-button add"
                onClick={handleAutoGenerateFields}
              >
                <Wand2
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
                Field 자동 생성
              </button>
            </div>

            {existingFields.length > 0 && (
              <p className="section-overview-help">
                ✅ 현재 {existingFields.length}개의 Field가 있습니다
              </p>
            )}
          </div>
        )}
      </PropertySection>
    ),
    [currentProps.dataBinding, handleDataBindingChange, selectedSchema, existingFields, handleAutoGenerateFields]
  );

  const accessibilitySection = useMemo(
    () => (
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="ListBox label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps["aria-describedby"] || "")}
          onChange={handleAriaDescribedbyChange}
          icon={Hash}
          placeholder="description-element-id"
        />
      </PropertySection>
    ),
    [
      currentProps,
      handleAriaLabelChange,
      handleAriaLabelledbyChange,
      handleAriaDescribedbyChange,
    ]
  );

  const itemManagementSection = useMemo(
    () => (
      <PropertySection title={PROPERTY_LABELS.ITEM_MANAGEMENT}>
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total items: {children.length || 0}
          </p>
          <p className="section-overview-help">
            💡 Select individual items from list to edit label, value, and state
          </p>
        </div>

        {children.length > 0 && (
          <div className="react-aria-ListBox">
            {children.map((item, index) => (
              <div key={item.id} className="react-aria-ListBoxItem">
                <span className="tab-title">
                  {String(
                    (item.props as Record<string, unknown>).label ||
                    `Item ${index + 1}`
                  )}
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
          <button
            className="control-button add"
            onClick={addItem}
          >
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
            Add Item
          </button>
        </div>
      </PropertySection>
    ),
    [children, selectItem, addItem]
  );

  // 선택된 아이템이 있는 경우 개별 아이템 편집 UI 표시
  if (selectedItemIndex !== null) {
    const currentItem = children[selectedItemIndex];
    if (!currentItem) return null;

    return (
      <>
        <div className="properties-aria">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(
              (currentItem.props as Record<string, unknown>).label || ""
            )}
            onChange={(value) => handleItemLabelChange(currentItem.id, value)}
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(
              (currentItem.props as Record<string, unknown>).value || ""
            )}
            onChange={(value) => handleItemValueChange(currentItem.id, value)}
            icon={Binary}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentItem.props as Record<string, unknown>).isDisabled
            )}
            onChange={(checked) => handleItemDisabledChange(currentItem.id, checked)}
            icon={PointerOff}
          />

          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={() => deleteItem(currentItem.id)}
            >
              <Trash
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
              Delete This Item
            </button>
          </div>
        </div>

        <div className="tab-actions">
          <button
            className="control-button secondary"
            onClick={deselectItem}
          >
            Back to ListBox Settings
          </button>
        </div>
      </>
    );
  }

  // ListBox 컴포넌트 전체 설정 UI
  return (
    <>
      {basicSection}
      {contentSection}
      {dataBindingSection}
      {performanceSection}
      {filteringSection}
      {stateSection}
      {behaviorSection}
      {formIntegrationSection}
      {accessibilitySection}
      {itemManagementSection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});
