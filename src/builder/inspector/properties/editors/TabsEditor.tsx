import { useMemo, useState, useEffect, useCallback } from 'react';
import { AppWindow, Layout, Plus } from 'lucide-react';
import { PropertyInput, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';
import type { Element } from '../../../stores/elements';

// 상수 정의
const ORIENTATIONS: Array<{ id: string; label: string }> = [
    { id: 'horizontal', label: 'Horizontal' },
    { id: 'vertical', label: 'Vertical' }
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 커스텀 훅: 페이지 ID 관리
function usePageId() {
    const { currentPageId: storePageId, setCurrentPageId } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

    const fetchCurrentPageId = useCallback(async (projectId: string) => {
        try {
            const { data: pages, error } = await supabase
                .from('pages')
                .select('id, name')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching pages:', error);
                return;
            }

            if (pages && pages.length > 0) {
                const pageId = pages[0].id;
                setLocalPageId(pageId);
                setCurrentPageId(pageId);
            }
        } catch (err) {
            console.error('Failed to fetch current page ID:', err);
        }
    }, [setCurrentPageId]);

    useEffect(() => {
        if (storePageId) {
            setLocalPageId(storePageId);
            return;
        }

        const pathParts = window.location.pathname.split('/');
        const urlPageId = pathParts[pathParts.length - 1];

        if (urlPageId && UUID_REGEX.test(urlPageId)) {
            setLocalPageId(urlPageId);
            setCurrentPageId(urlPageId);
        } else {
            const projectId = pathParts[pathParts.length - 2];
            if (projectId) {
                fetchCurrentPageId(projectId);
            }
        }
    }, [storePageId, setCurrentPageId, fetchCurrentPageId]);

    const validatePageId = async (pageId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('id')
                .eq('id', pageId)
                .single();

            return !error && !!data;
        } catch (err) {
            console.error('Page validation failed:', err);
            return false;
        }
    };

    return { localPageId, storePageId, validatePageId };
}

export function TabsEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const { addElement, elements: storeElements } = useStore();
    const { localPageId, storePageId } = usePageId();

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 실제 Tab 자식 요소들을 찾기 (useMemo로 최적화)
    const tabChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'Tab')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 새 탭 추가 함수 정의
    const addNewTab = async () => {
        try {
            const pageIdToUse = localPageId || storePageId;
            if (!pageIdToUse) {
                alert('페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                return;
            }

            await createNewTab(tabChildren, currentProps, elementId, pageIdToUse, onUpdate, addElement);
        } catch (err) {
            console.error('Add tab error:', err);
            alert('탭 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    // Tabs 컴포넌트 자체의 속성 편집 UI만 표시
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tabs Component Properties</legend>

                <PropertySelect
                    label="Default Tab"
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value)}
                    options={tabChildren.map(tab => ({
                        id: tab.id,
                        label: tab.props.title || 'Untitled Tab'
                    }))}
                    icon={AppWindow}
                />

                <PropertySelect
                    label="Orientation"
                    value={String(currentProps.orientation || 'horizontal')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={ORIENTATIONS}
                    icon={Layout}
                />

                <PropertyInput
                    label="Default Selected Key"
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value)}
                    icon={AppWindow}
                />

                <PropertyInput
                    label="Selected Key"
                    value={String(currentProps.selectedKey || '')}
                    onChange={(value) => updateProp('selectedKey', value)}
                    icon={AppWindow}
                />

                <PropertyInput
                    label="Disabled"
                    value={String(currentProps.isDisabled || false)}
                    onChange={(value) => updateProp('isDisabled', value === 'true')}
                    icon={AppWindow}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tab Management</legend>

                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total tabs: {tabChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual tabs from layer tree to edit their properties
                    </p>
                </div>

                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={addNewTab}
                        disabled={!localPageId && !storePageId}
                    >
                        <Plus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add New Tab
                    </button>
                </div>
            </fieldset>
        </div>
    );
}

// 유틸리티 함수들
async function createNewTab(
    tabChildren: Array<{ id: string; props: Record<string, unknown>; order_num?: number }>,
    currentProps: Record<string, unknown>,
    elementId: string,
    pageId: string,
    onUpdate: (props: Record<string, unknown>) => void,
    addElement: (element: Element) => void
) {
    const newTabIndex = tabChildren.length || 0;

    // 새로운 Tab 요소 생성
    const newTabElement = {
        id: crypto.randomUUID(),
        page_id: pageId,
        tag: 'Tab',
        props: {
            title: `Tab ${newTabIndex + 1}`,
            variant: 'default',
            appearance: 'light',
            style: {},
            className: '',
        },
        parent_id: elementId,
        order_num: newTabIndex + 1,
    };

    // 새로운 Panel 요소 생성
    const newPanelElement = {
        id: crypto.randomUUID(),
        page_id: pageId,
        tag: 'Panel',
        props: {
            variant: 'tab',
            title: newTabElement.props.title,
            tabIndex: newTabIndex,
            style: {},
            className: '',
        },
        parent_id: elementId,
        order_num: newTabIndex + 1,
    };

    try {
        // Tab과 Panel을 함께 삽입
        const { data, error } = await supabase
            .from('elements')
            .insert([newTabElement, newPanelElement])
            .select();

        if (error) {
            throw new Error('Tab and Panel creation failed');
        }

        // Tabs props 업데이트 (defaultSelectedKey만, children 제거)
        const updatedProps = {
            ...currentProps,
            defaultSelectedKey: tabChildren.length === 0 ? newTabElement.id : currentProps.defaultSelectedKey
        };

        const { error: updateError } = await supabase
            .from('elements')
            .update({ props: updatedProps })
            .eq('id', elementId);

        if (updateError) {
            // Tabs 업데이트 실패 시 생성된 요소들 삭제
            await supabase.from('elements').delete().eq('id', newTabElement.id);
            await supabase.from('elements').delete().eq('id', newPanelElement.id);
            throw new Error('Tabs update failed');
        }

        // 성공 시 상태 업데이트
        onUpdate(updatedProps);

        // 스토어에 새 요소들 추가 - 각각 개별적으로 추가
        if (data && data.length >= 2) {
            // Tab 요소 추가
            addElement(data[0]);
            // Panel 요소 추가
            addElement(data[1]);

            console.log('새 Tab과 Panel이 스토어에 추가됨:', {
                tab: data[0],
                panel: data[1]
            });
        }

    } catch (err) {
        console.error('createNewTab error:', err);
        throw err;
    }
}
