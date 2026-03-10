import { useMemo, useState, useEffect, memo } from "react";
import { FolderTree, Workflow, Plus, Tag, FileText, PointerOff, Focus, SquareX, Database } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId, PropertySection, PropertyDataBinding, type DataBindingValue } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { getDB } from '../../../../lib/db';
import { iconProps } from '../../../../utils/ui/uiConstants'; // 추가
import { ElementUtils } from '../../../../utils/element/elementUtils';
import { generateCustomId } from '../../../utils/idGeneration';

// 상수 정의
const SELECTION_MODES: Array<{ value: string; label: string }> = [
    { value: 'none', label: PROPERTY_LABELS.NONE },
    { value: 'single', label: PROPERTY_LABELS.SINGLE },
    { value: 'multiple', label: PROPERTY_LABELS.MULTIPLE }
];

const SELECTION_BEHAVIORS: Array<{ value: string; label: string }> = [
    { value: 'replace', label: PROPERTY_LABELS.REPLACE },
    { value: 'toggle', label: PROPERTY_LABELS.TOGGLE }
];

export const TreeEditor = memo(function TreeEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
    const addElement = useStore((state) => state.addElement);
    const [localPageId, setLocalPageId] = useState<string>('');

    // Get customId from element in store
      // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const handleDataBindingChange = (binding: DataBindingValue | null) => {
        const updatedProps = {
            dataBinding: binding || undefined
        };
        onUpdate(updatedProps);
    };

    // Tree의 실제 TreeItem 자식 요소들을 찾기
    const treeItemChildren = useMemo(() => {
        const { elements } = useStore.getState();
        return elements
            .filter((child) => child.parent_id === elementId && child.tag === 'TreeItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [elementId]);

    // 페이지 ID 가져오기
    useEffect(() => {
        const { currentPageId } = useStore.getState();
        if (currentPageId) {
            setLocalPageId(currentPageId);
        }
    }, []);

    // 새 TreeItem 추가 함수
    const addNewTreeItem = async () => {
        try {
            if (!localPageId) {
                alert('페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                return;
            }

            const { elements } = useStore.getState();
            const newTreeItemIndex = treeItemChildren.length || 0;
            const newTreeItemElement = {
                id: ElementUtils.generateId(),
                customId: generateCustomId('TreeItem', elements),
                page_id: localPageId,
                tag: 'TreeItem',
                props: {
                    title: `Item ${newTreeItemIndex + 1}`,
                    value: `Item ${newTreeItemIndex + 1}`,
                    children: `Item ${newTreeItemIndex + 1}`,
                    isDisabled: false,
                    style: {},
                    className: '',
                },
                parent_id: elementId,
                order_num: newTreeItemIndex,
            };

            const db = await getDB();
            const insertedTreeItem = await db.elements.insert(newTreeItemElement);
            addElement(insertedTreeItem);

            console.log('✅ [IndexedDB] 새 TreeItem이 추가됨:', insertedTreeItem);
        } catch (err) {
            console.error('Add TreeItem error:', err);
            alert('TreeItem 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                placeholder="tree_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value || undefined)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value || undefined)}
                    icon={FileText}
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

            {/* State Section */}
            <PropertySection title="State">

                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_MODE}
                    value={String(currentProps.selectionMode || 'single')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={SELECTION_MODES}
                    icon={FolderTree}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_BEHAVIOR}
                    value={String(currentProps.selectionBehavior || 'replace')}
                    onChange={(value) => updateProp('selectionBehavior', value)}
                    options={SELECTION_BEHAVIORS}
                    icon={Workflow}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    isSelected={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={SquareX}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.EXPANDED_KEYS}
                    value={Array.isArray(currentProps.expandedKeys) ? currentProps.expandedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('expandedKeys', keys);
                    }}
                    placeholder="item1, item2, item3"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.SELECTED_KEYS}
                    value={Array.isArray(currentProps.selectedKeys) ? currentProps.selectedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('selectedKeys', keys);
                    }}
                    placeholder="item1, item2"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_EXPANDED_KEYS}
                    value={Array.isArray(currentProps.defaultExpandedKeys) ? currentProps.defaultExpandedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('defaultExpandedKeys', keys);
                    }}
                    placeholder="item1, item2"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEYS}
                    value={Array.isArray(currentProps.defaultSelectedKeys) ? currentProps.defaultSelectedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('defaultSelectedKeys', keys);
                    }}
                    placeholder="item1"
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />
            </PropertySection>

            {/* Tree Items Section */}
            <PropertySection title={PROPERTY_LABELS.TREE_ITEMS}>

                <div className='tree-overview'>
                    <p className='tree-overview-text'>
                        Total tree items: {treeItemChildren.length || 0}
                    </p>
                    <p className='tree-overview-help'>
                        💡 Select individual tree items from layer tree to edit their properties
                    </p>
                </div>

                <div className='tree-actions'>
                    <button
                        className='control-button add'
                        onClick={addNewTreeItem}
                        disabled={!localPageId}
                    >
                        <Plus color={iconProps.color} strokeWidth={iconProps.strokeWidth} size={iconProps.size} />
                        Add TreeItem
                    </button>
                </div>
            </PropertySection>
        </>
    );
});
