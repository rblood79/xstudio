import { useMemo, useState, useEffect } from 'react';
import { ListTree, FolderTree, Workflow, Plus } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';
import { elementsApi } from '../../../../services/api';
import { iconProps } from '../../../../utils/uiConstants'; // 추가

// 상수 정의
const SELECTION_MODES: Array<{ id: string; label: string }> = [
    { id: 'none', label: 'None' },
    { id: 'single', label: 'Single' },
    { id: 'multiple', label: 'Multiple' }
];

const SELECTION_BEHAVIORS: Array<{ id: string; label: string }> = [
    { id: 'replace', label: 'Replace' },
    { id: 'toggle', label: 'Toggle' }
];

export function TreeEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const { addElement } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
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

            const newTreeItemIndex = treeItemChildren.length || 0;
            const newTreeItemElement = {
                id: crypto.randomUUID(),
                page_id: localPageId,
                tag: 'TreeItem',
                props: {
                    title: `Item ${newTreeItemIndex + 1}`,
                    textValue: `Item ${newTreeItemIndex + 1}`,
                    children: `Item ${newTreeItemIndex + 1}`,
                    isDisabled: false,
                    style: {},
                    className: '',
                },
                parent_id: elementId,
                order_num: newTreeItemIndex,
            };

            const data = await elementsApi.createElement(newTreeItemElement);
            addElement(data);

            console.log('새 TreeItem이 추가됨:', data);
        } catch (err) {
            console.error('Add TreeItem error:', err);
            alert('TreeItem 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value)}
                    icon={ListTree}
                />

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

                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.SELECTED_KEY}
                    value={Array.isArray(currentProps.expandedKeys) ? currentProps.expandedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('expandedKeys', keys);
                    }}
                    placeholder="item1, item2, item3"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.SELECTED_KEY}
                    value={Array.isArray(currentProps.selectedKeys) ? currentProps.selectedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('selectedKeys', keys);
                    }}
                    placeholder="item1, item2"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
                    value={Array.isArray(currentProps.defaultExpandedKeys) ? currentProps.defaultExpandedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('defaultExpandedKeys', keys);
                    }}
                    placeholder="item1, item2"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
                    value={Array.isArray(currentProps.defaultSelectedKeys) ? currentProps.defaultSelectedKeys.join(', ') : ''}
                    onChange={(value) => {
                        const keys = value ? value.split(',').map(k => k.trim()).filter(Boolean) : [];
                        updateProp('defaultSelectedKeys', keys);
                    }}
                    placeholder="item1"
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tree Items</legend>

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
                        <Plus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add TreeItem
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
