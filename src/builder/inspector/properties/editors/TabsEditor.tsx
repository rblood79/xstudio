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
    const [selectedTab, setSelectedTab] = useState<SelectedTabState | null>(null);
    const { addElement, removeElement, elements: storeElements, selectedTab: storeSelectedTab } = useStore();
    const { localPageId, storePageId, validatePageId } = usePageId();

    useEffect(() => {
        // 스토어에서 선택된 Tab 정보가 있으면 로컬 상태와 동기화
        if (storeSelectedTab && storeSelectedTab.parentId === elementId) {
            setSelectedTab(storeSelectedTab);
        } else {
            setSelectedTab(null);
        }
    }, [elementId, storeSelectedTab]);

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

    // 선택된 탭 편집 UI
    if (selectedTab && selectedTab.parentId === elementId) {
        const currentTab = tabChildren[selectedTab.tabIndex];
        if (!currentTab) {
            console.warn('선택된 Tab을 찾을 수 없습니다:', selectedTab, tabChildren);
            return null;
        }

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Tab Properties</legend>

                    <PropertyInput
                        label="Tab Title"
                        value={String(currentTab.props.title || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentTab.props,
                                title: value
                            };
                            // 실제 Tab 컴포넌트의 props 업데이트
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentTab.id, updatedProps);
                        }}
                        icon={Type}
                    />

                    <PropertySelect
                        label="Variant"
                        value={currentTab.props.variant || 'default'}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentTab.props,
                                variant: value as 'default' | 'bordered' | 'underlined' | 'pill'
                            };
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentTab.id, updatedProps);
                        }}
                        options={TAB_VARIANTS}
                        icon={Layout}
                    />

                    <PropertySelect
                        label="Appearance"
                        value={currentTab.props.appearance || 'light'}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentTab.props,
                                appearance: value as 'light' | 'dark' | 'solid' | 'bordered'
                            };
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentTab.id, updatedProps);
                        }}
                        options={TAB_APPEARANCES}
                        icon={AppWindow}
                    />

                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    await deleteTab(selectedTab.tabIndex, tabChildren, currentProps, elementId, onUpdate, addElement, removeElement);
                                    setSelectedTab(null);
                                } catch (err) {
                                    console.error('Delete tab error:', err);
                                    alert('탭 삭제 중 오류가 발생했습니다.');
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Tab
                        </button>
                    </div>
                </fieldset>

                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedTab(null)}
                    >
                        Back to Tabs Settings
                    </button>
                </div>
            </div>
        );
    }

    // 새 탭 추가
    const addNewTab = async () => {
        try {
            const pageIdToUse = localPageId || storePageId;
            if (!pageIdToUse) {
                alert('페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
                return;
            }

            const isValidPage = await validatePageId(pageIdToUse);
            if (!isValidPage) {
                alert('유효하지 않은 페이지입니다. 페이지를 새로고침해주세요.');
                return;
            }

            await createNewTab(tabChildren, currentProps, elementId, pageIdToUse, onUpdate, addElement);
        } catch (err) {
            console.error('Add tab error:', err);
            alert('탭 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tab Settings</legend>

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
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tab Management</legend>

                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total tabs: {tabChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual tabs from tree to edit title, variant, and appearance
                    </p>
                </div>

                {tabChildren.length > 0 && (
                    <div className='tabs-list'>
                        {tabChildren.map((tab, index) => (
                            <div key={tab.id} className='tab-list-item'>
                                <span className='tab-title'>{tab.props.title || `Tab ${index + 1}`}</span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedTab({ parentId: elementId, tabIndex: index })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

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
async function deleteTab(
    tabIndex: number,
    tabChildren: any[],
    currentProps: any,
    elementId: string,
    onUpdate: (props: any) => void,
    addElement: (element: any) => void,
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
    addElement: (element: any) => void,
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
    tabChildren: any[],
    currentProps: any,
    elementId: string,
    pageId: string,
    onUpdate: (props: any) => void,
    addElement: (element: any) => void
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
