import { useState, useEffect, useMemo } from 'react';
import { FolderTree, Workflow, Plus } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';
import { elementsApi } from '../../../../services/api';

export function TreeItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const { addElement, elements: storeElements } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
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
                id: crypto.randomUUID(),
                page_id: localPageId,
                tag: 'TreeItem',
                props: {
                    title: `Child Item ${newTreeItemIndex + 1}`,
                    value: `Child Item ${newTreeItemIndex + 1}`,
                    isDisabled: false,
                },
                parent_id: elementId,
                order_num: newTreeItemIndex,
            };

            const data = await elementsApi.createElement(newTreeItemElement);
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
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value)}
                    icon={FolderTree}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('textValue', value)}
                    icon={Workflow}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISABLED}
                    checked={Boolean(currentProps.isDisabled)}
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