import { useState, useMemo } from 'react';
import { SquarePlus, PointerOff, Tag, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { elementsApi } from '../../../../services/api';
import { ElementUtils } from '../../../../utils/element/elementUtils';
import { generateCustomId } from '../../../utils/idGeneration';

interface SelectedBreadcrumbState {
    parentId: string;
    breadcrumbIndex: number;
}

export function BreadcrumbsEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedBreadcrumb, setSelectedBreadcrumb] = useState<SelectedBreadcrumbState | null>(null);
    const { addElement, elements, currentPageId } = useStore();

    // Get customId from element in store
    const element = elements.find((el) => el.id === elementId);
    const customId = element?.customId || '';

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    // Breadcrumbs의 자식 Breadcrumb 요소들 찾기
    const breadcrumbChildren = useMemo(() => {
        return elements
            .filter((child) => child.parent_id === elementId && child.tag === 'Breadcrumb')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [elements, elementId]);

    // 개별 Breadcrumb 편집 모드
    if (selectedBreadcrumb && selectedBreadcrumb.parentId === elementId) {
        const currentBreadcrumb = breadcrumbChildren[selectedBreadcrumb.breadcrumbIndex];
        if (!currentBreadcrumb) return null;

        const breadcrumbProps = currentBreadcrumb.props as Record<string, unknown>;

        return (
        <>
                <div className="properties-aria">
                    <PropertyInput
                        label={PROPERTY_LABELS.TEXT}
                        value={String(breadcrumbProps.children || '')}
                        onChange={(value) => {
                            const updateElementProps = useStore.getState().updateElementProps;
                            updateElementProps(currentBreadcrumb.id, {
                                ...breadcrumbProps,
                                children: value
                            });
                        }}
                        icon={Tag}
                    />

                    <PropertyInput
                        label="Href"
                        value={String(breadcrumbProps.href || '')}
                        onChange={(value) => {
                            const updateElementProps = useStore.getState().updateElementProps;
                            updateElementProps(currentBreadcrumb.id, {
                                ...breadcrumbProps,
                                href: value
                            });
                        }}
                        placeholder="/"
                    />
                </div>

                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedBreadcrumb(null)}
                    >
                        Back to Breadcrumbs Settings
                    </button>
                </div>
            </>
        );
    }

    // Breadcrumbs 전체 설정 모드
    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="breadcrumbs_1"
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
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Breadcrumb navigation for screen readers"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                    placeholder="label-element-id"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                    placeholder="description-element-id"
                />
            </PropertySection>

            <PropertySection title="Breadcrumb Management">

                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total breadcrumbs: {breadcrumbChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Click on individual breadcrumbs to edit text and href
                    </p>
                </div>

                {breadcrumbChildren.length > 0 && (
                    <div className='tabs-list'>
                        {breadcrumbChildren.map((breadcrumb, index) => {
                            const breadcrumbProps = breadcrumb.props as Record<string, unknown>;
                            return (
                                <div key={breadcrumb.id} className='tab-list-item'>
                                    <span className='tab-title'>
                                        {String(breadcrumbProps.children) || `Breadcrumb ${index + 1}`}
                                    </span>
                                    <button
                                        className='tab-edit-button'
                                        onClick={() => setSelectedBreadcrumb({ parentId: elementId, breadcrumbIndex: index })}
                                    >
                                        Edit
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={async () => {
                            try {
                                const pageId = currentPageId || element?.page_id;
                                if (!pageId) {
                                    console.error('페이지 ID를 찾을 수 없습니다');
                                    return;
                                }

                                const newBreadcrumbIndex = breadcrumbChildren.length || 0;
                                const maxOrderNum = breadcrumbChildren.length > 0
                                    ? Math.max(...breadcrumbChildren.map(b => b.order_num || 0))
                                    : 0;

                                const newBreadcrumb = {
                                    id: ElementUtils.generateId(),
                                    customId: generateCustomId('Breadcrumb', elements),
                                    page_id: pageId,
                                    tag: 'Breadcrumb',
                                    props: {
                                        children: `Breadcrumb ${newBreadcrumbIndex + 1}`,
                                        href: '/',
                                    },
                                    parent_id: elementId,
                                    order_num: maxOrderNum + 1,
                                };

                                const data = await elementsApi.createElement(newBreadcrumb);
                                addElement(data);
                                console.log('새 Breadcrumb 추가됨:', data);
                            } catch (error) {
                                console.error('Breadcrumb 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Breadcrumb
                    </button>
                </div>
            </PropertySection>
        </>
    );
}
