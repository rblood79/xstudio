import { useState, useEffect, useMemo } from 'react';
import { FolderTree, Workflow, Plus } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';
//import { elementsApi } from '../../../../services/api';
import { ElementUtils } from '../../../../utils/elementUtils';
import { generateCustomId } from '../../../utils/idGeneration';

export function TreeItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const { addElement, elements: storeElements } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

    // Get customId from element in store
    const element = storeElements.find((el) => el.id === elementId);
    const customId = element?.customId || '';

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
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

    // 페이지 ID 가져오기
    useEffect(() => {
        const { currentPageId } = useStore.getState();
        if (currentPageId) {
            setLocalPageId(currentPageId);
        }
    }, []);

    // TreeItem의 자식 TreeItem들을 찾기
    const childTreeItems = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'TreeItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 새 하위 TreeItem 추가 함수
    const addNewChildTreeItem = async () => {
        try {
            if (!localPageId) {
                alert('페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                return;
            }

            const newTreeItemIndex = childTreeItems.length || 0;
            const newTreeItemElement = {
                id: ElementUtils.generateId(),
                customId: generateCustomId('TreeItem', storeElements),
                page_id: localPageId,
                tag: 'TreeItem',
                props: {
                    title: `Child Item ${newTreeItemIndex + 1}`,
                    value: `Child Item ${newTreeItemIndex + 1}`,
                    children: ``, // children 속성 추가
                    isDisabled: false,
                },
                parent_id: elementId,
                order_num: newTreeItemIndex,
            };

            const data = await ElementUtils.createElement(newTreeItemElement);
            addElement(data);

            console.log('새 하위 TreeItem이 추가됨:', data);
        } catch (err) {
            console.error('Add Child TreeItem error:', err);
            alert('하위 TreeItem 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <PropertyCustomId
                    label="ID"
                    value={customId}
                    elementId={elementId}
                    onChange={updateCustomId}
                    placeholder="treeitem_1"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value)}
                    icon={FolderTree}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value)}
                    icon={Workflow}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Child TreeItems</legend>

                <div className='tree-item-overview'>
                    <p className='tree-item-overview-text'>
                        Child tree items: {childTreeItems.length || 0}
                    </p>
                    <p className='tree-item-overview-help'>
                        💡 Select individual child tree items from layer tree to edit their properties
                    </p>
                </div>

                <div className='tree-item-actions'>
                    <button
                        className='control-button add'
                        onClick={addNewChildTreeItem}
                        disabled={!localPageId}
                    >
                        <Plus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Child TreeItem
                    </button>
                </div>
            </fieldset>
        </div>
    );
}