import { useState, useEffect } from 'react';
import { AppWindow, Layout, Type, Trash, Plus } from 'lucide-react';
import { PropertyInput, PropertySelect } from '../components';
import { PropertyEditorProps, TabItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

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

interface SelectedTabState {
    parentId: string;
    tabIndex: number;
}

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

// 공통 함수: 탭 업데이트
function updateTabProperty(
    tabs: TabItem[],
    tabIndex: number,
    property: keyof TabItem,
    value: unknown,
    onUpdate: (props: any) => void,
    currentProps: any
) {
    const updatedTabs = [...tabs];
    updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        [property]: value
    };

    const updatedProps = {
        ...currentProps,
        children: updatedTabs
    };
    onUpdate(updatedProps);
}

export function TabsEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedTab, setSelectedTab] = useState<SelectedTabState | null>(null);
    const { addElement, removeElement } = useStore();
    const { localPageId, storePageId, validatePageId } = usePageId();

    useEffect(() => {
        setSelectedTab(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const tabs = Array.isArray(currentProps.children) ? currentProps.children as TabItem[] : [];

    // 선택된 탭 편집 UI
    if (selectedTab && selectedTab.parentId === elementId) {
        const currentTab = tabs[selectedTab.tabIndex];
        if (!currentTab) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Tab Properties</legend>

                    <PropertyInput
                        label="Tab Title"
                        value={currentTab.title || ''}
                        onChange={(value) => updateTabProperty(tabs, selectedTab.tabIndex, 'title', value, onUpdate, currentProps)}
                        icon={Type}
                    />

                    <PropertySelect
                        label="Variant"
                        value={currentTab.variant || 'default'}
                        onChange={(value) => updateTabProperty(tabs, selectedTab.tabIndex, 'variant', value, onUpdate, currentProps)}
                        options={TAB_VARIANTS}
                        icon={Layout}
                    />

                    <PropertySelect
                        label="Appearance"
                        value={currentTab.appearance || 'light'}
                        onChange={(value) => updateTabProperty(tabs, selectedTab.tabIndex, 'appearance', value, onUpdate, currentProps)}
                        options={TAB_APPEARANCES}
                        icon={AppWindow}
                    />

                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    await deleteTab(selectedTab.tabIndex, tabs, currentProps, elementId, onUpdate, addElement, removeElement);
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

            await createNewTab(tabs, currentProps, elementId, pageIdToUse, onUpdate, addElement);
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
                    options={tabs.map(tab => ({
                        id: tab.id,
                        label: tab.title
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
                        Total tabs: {tabs.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual tabs from tree to edit title, variant, and appearance
                    </p>
                </div>

                {tabs.length > 0 && (
                    <div className='tabs-list'>
                        {tabs.map((tab, index) => (
                            <div key={tab.id} className='tab-list-item'>
                                <span className='tab-title'>{tab.title || `Tab ${index + 1}`}</span>
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
    tabs: TabItem[],
    currentProps: any,
    elementId: string,
    onUpdate: (props: any) => void,
    addElement: (element: any) => void,
    removeElement: (id: string) => void
) {
    // 1. 삭제할 탭의 패널 ID 찾기
    const { data: panelElements } = await supabase
        .from('elements')
        .select('*')
        .eq('parent_id', elementId)
        .eq('props->tabIndex', tabIndex);

    // 2. 패널 요소 삭제
    if (panelElements && panelElements.length > 0) {
        const panelToDelete = panelElements[0];
        await supabase.from('elements').delete().eq('id', panelToDelete.id);
        removeElement(panelToDelete.id);
    }

    // 3. 탭 배열에서 제거
    const updatedTabs = [...tabs];
    updatedTabs.splice(tabIndex, 1);

    // 4. 남은 탭들의 패널 인덱스 업데이트
    await updateRemainingPanelIndices(elementId, tabIndex, updatedTabs.length, addElement, removeElement);

    // 5. Tabs props 업데이트
    const updatedProps = {
        ...currentProps,
        children: updatedTabs,
        defaultSelectedKey: updatedTabs.length > 0 ? updatedTabs[0].id : undefined
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
    tabs: TabItem[],
    currentProps: any,
    elementId: string,
    pageId: string,
    onUpdate: (props: any) => void,
    addElement: (element: any) => void
) {
    const newTabId = `tab${Date.now()}`;
    const newTabIndex = tabs.length || 0;
    const newTab = {
        id: newTabId,
        title: `Tab ${newTabIndex + 1}`,
        variant: 'default',
        appearance: 'light'
    };

    const newPanelElement = {
        id: crypto.randomUUID(),
        page_id: pageId,
        tag: 'Panel',
        props: {
            variant: 'tab',
            title: newTab.title,
            tabIndex: newTabIndex,
            style: {},
            className: '',
        },
        parent_id: elementId,
        order_num: newTabIndex + 1,
    };

    const { data: panelData, error: panelError } = await supabase
        .from('elements')
        .insert([newPanelElement])
        .select()
        .single();

    if (panelError) {
        throw new Error('Panel creation failed');
    }

    const updatedProps = {
        ...currentProps,
        children: [...tabs, newTab],
        defaultSelectedKey: tabs.length === 0 ? newTabId : currentProps.defaultSelectedKey
    };

    const { error: updateError } = await supabase
        .from('elements')
        .update({ props: updatedProps })
        .eq('id', elementId);

    if (updateError) {
        await supabase.from('elements').delete().eq('id', newPanelElement.id);
        throw new Error('Tabs update failed');
    }

    onUpdate(updatedProps);
    if (panelData) {
        addElement(panelData);
    }
}
