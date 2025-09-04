import { useState, useEffect, useMemo } from 'react';
import { AppWindow, Layout, Type, Trash, Plus } from 'lucide-react';
import { PropertyInput, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedTabState {
    parentId: string;
    tabIndex: number;
}

// 상수 정의
const TAB_VARIANTS = [
    { id: 'default', label: 'Default' },
    { id: 'bordered', label: 'Bordered' },
    { id: 'underlined', label: 'Underlined' },
    { id: 'pill', label: 'Pill' }
] as const;

const TAB_APPEARANCES = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'solid', label: 'Solid' },
    { id: 'bordered', label: 'Bordered' }
] as const;

const ORIENTATIONS = [
    { id: 'horizontal', label: 'Horizontal' },
    { id: 'vertical', label: 'Vertical' }
] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 커스텀 훅: 페이지 ID 관리
function usePageId() {
    const { currentPageId: storePageId, setCurrentPageId } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

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
    }, [storePageId, setCurrentPageId]);

    const fetchCurrentPageId = async (projectId: string) => {
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
    };

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
    const { addElement, removeElement, elements: storeElements } = useStore();
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

// 유틸리티 함수들 - 타입 수정
async function deleteTab(
    tabIndex: number,
    tabChildren: any[], // Element 타입 대신 any 사용 (타입 충돌 해결)
    currentProps: any, // ElementProps 타입 대신 any 사용
    elementId: string,
    onUpdate: (props: any) => void, // ElementProps 타입 대신 any 사용
    addElement: (element: any) => void, // Element 타입 대신 any 사용
    removeElement: (id: string) => void
) {
    const currentTab = tabChildren[tabIndex];
    if (!currentTab) return;

    // 1. Tab 요소 삭제
    await supabase.from('elements').delete().eq('id', currentTab.id);
    removeElement(currentTab.id);

    // 2. 해당 Tab과 연결된 Panel 요소 찾기 및 삭제
    const { data: panelElements } = await supabase
        .from('elements')
        .select('*')
        .eq('parent_id', elementId)
        .eq('props->tabIndex', tabIndex);

    if (panelElements && panelElements.length > 0) {
        const panelToDelete = panelElements[0];
        await supabase.from('elements').delete().eq('id', panelToDelete.id);
        removeElement(panelToDelete.id);
    }

    // 3. 남은 Tab들의 order_num 업데이트
    const remainingTabs = tabChildren.filter((_, index) => index !== tabIndex);
    for (let i = 0; i < remainingTabs.length; i++) {
        const tab = remainingTabs[i];
        const updatedProps = { ...tab.props, order_num: i + 1 };
        const { updateElementProps } = useStore.getState();
        updateElementProps(tab.id, updatedProps);
    }

    // 4. 남은 Panel들의 tabIndex 업데이트
    await updateRemainingPanelIndices(elementId, tabIndex, remainingTabs.length, addElement, removeElement);

    // 5. Tabs props 업데이트 (defaultSelectedKey만, children 제거)
    const updatedProps = {
        ...currentProps,
        defaultSelectedKey: remainingTabs.length > 0 ? remainingTabs[0].id : undefined
    };

    const { error: tabsUpdateError } = await supabase
        .from('elements')
        .update({ props: updatedProps })
        .eq('id', elementId);

    if (tabsUpdateError) {
        throw new Error('Tabs update failed');
    }

    onUpdate(updatedProps);
}

async function updateRemainingPanelIndices(
    elementId: string,
    deletedIndex: number,
    totalTabs: number,
    addElement: (element: any) => void, // Element 타입 대신 any 사용
    removeElement: (id: string) => void
) {
    for (let i = deletedIndex; i < totalTabs; i++) {
        const { data: panelsToUpdate } = await supabase
            .from('elements')
            .select('*')
            .eq('parent_id', elementId)
            .eq('props->tabIndex', i + 1);

        if (panelsToUpdate && panelsToUpdate.length > 0) {
            const panelToUpdate = panelsToUpdate[0];
            const updatedProps = {
                ...panelToUpdate.props,
                tabIndex: i
            };

            await supabase
                .from('elements')
                .update({ props: updatedProps })
                .eq('id', panelToUpdate.id);

            // 스토어 업데이트
            const storeElement = useStore.getState().elements.find(el => el.id === panelToUpdate.id);
            if (storeElement) {
                const updatedElement = { ...storeElement, props: updatedProps };
                removeElement(panelToUpdate.id);
                addElement(updatedElement);
            }
        }
    }
}

async function createNewTab(
    tabChildren: any[], // Element 타입 대신 any 사용
    currentProps: any, // ElementProps 타입 대신 any 사용
    elementId: string,
    pageId: string,
    onUpdate: (props: any) => void, // ElementProps 타입 대신 any 사용
    addElement: (element: any) => void // Element 타입 대신 any 사용
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
