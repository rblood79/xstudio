import { useState, useEffect } from 'react';
import { AppWindow, Layout, Type, Trash, Plus } from 'lucide-react';
import { PropertyInput, PropertySelect } from '../components';
import { PropertyEditorProps, TabItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedTabState {
    parentId: string;
    tabIndex: number;
}

export function TabsEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedTab, setSelectedTab] = useState<SelectedTabState | null>(null);
    const { addElement, currentPageId: storePageId, setCurrentPageId } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

    useEffect(() => {
        // 1. 스토어에서 페이지 ID 가져오기 (우선순위 1)
        if (storePageId) {
            console.log('Using page ID from store:', storePageId);
            setLocalPageId(storePageId);
            return;
        }

        // 2. URL에서 페이지 ID 추출 (우선순위 2)
        const pathParts = window.location.pathname.split('/');
        const urlPageId = pathParts[pathParts.length - 1];

        // UUID 형식인지 확인
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (urlPageId && uuidRegex.test(urlPageId)) {
            console.log('Using page ID from URL:', urlPageId);
            setLocalPageId(urlPageId);
            // 스토어에도 설정
            setCurrentPageId(urlPageId);
        } else {
            console.warn('Invalid page ID from URL:', urlPageId);
            // 3. 프로젝트 ID로 현재 페이지 조회 (우선순위 3)
            const projectId = pathParts[pathParts.length - 2];
            if (projectId) {
                fetchCurrentPageId(projectId);
            }
        }

        // 탭 선택 상태 초기화
        setSelectedTab(null);
    }, [elementId, storePageId, setCurrentPageId]);

    // 프로젝트 ID로 현재 페이지 ID 가져오기
    const fetchCurrentPageId = async (projectId: string) => {
        try {
            console.log('Fetching current page ID for project:', projectId);

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
                console.log('Fetched current page ID:', pageId, 'Name:', pages[0].name);
                setLocalPageId(pageId);
                setCurrentPageId(pageId);
            } else {
                console.warn('No pages found for project:', projectId);
            }
        } catch (err) {
            console.error('Failed to fetch current page ID:', err);
        }
    };

    // 페이지 ID 유효성 검증
    const validatePageId = async (pageId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('id, name')
                .eq('id', pageId)
                .single();

            if (error) {
                console.error('Page validation error:', error);
                return false;
            }

            if (data) {
                console.log('Page validation successful:', data.id, data.name);
                return true;
            }

            return false;
        } catch (err) {
            console.error('Page validation failed:', err);
            return false;
        }
    };

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 탭 배열 가져오기
    const tabs = Array.isArray(currentProps.children) ? currentProps.children as TabItem[] : [];
    console.log('Tabs array:', tabs);

    // 선택된 탭이 있고, 현재 Tabs 컴포넌트의 탭인 경우 개별 탭 편집 UI 표시
    if (selectedTab && selectedTab.parentId === elementId) {
        const currentTab = tabs[selectedTab.tabIndex];
        if (!currentTab) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Tab Properties</legend>

                    {/* 탭 제목 편집 */}
                    <PropertyInput
                        label="Tab Title"
                        value={currentTab.title || ''}
                        onChange={(value) => {
                            const updatedTabs = [...tabs];
                            updatedTabs[selectedTab.tabIndex] = {
                                ...updatedTabs[selectedTab.tabIndex],
                                title: value
                            };
                            updateProp('children', updatedTabs);
                        }}
                        icon={Type}
                    />

                    {/* 탭 variant 설정 */}
                    <PropertySelect
                        label="Variant"
                        value={currentTab.variant || 'default'}
                        onChange={(value) => {
                            const updatedTabs = [...tabs];
                            updatedTabs[selectedTab.tabIndex] = {
                                ...updatedTabs[selectedTab.tabIndex],
                                variant: value as 'default' | 'bordered' | 'underlined' | 'pill'
                            };
                            updateProp('children', updatedTabs);
                        }}
                        options={[
                            { id: 'default', label: 'Default' },
                            { id: 'bordered', label: 'Bordered' },
                            { id: 'underlined', label: 'Underlined' },
                            { id: 'pill', label: 'Pill' }
                        ]}
                        icon={Layout}
                    />

                    {/* 탭 appearance 설정 */}
                    <PropertySelect
                        label="Appearance"
                        value={currentTab.appearance || 'light'}
                        onChange={(value) => {
                            const updatedTabs = [...tabs];
                            updatedTabs[selectedTab.tabIndex] = {
                                ...updatedTabs[selectedTab.tabIndex],
                                appearance: value as 'light' | 'dark' | 'solid' | 'bordered'
                            };
                            updateProp('children', updatedTabs);
                        }}
                        options={[
                            { id: 'light', label: 'Light' },
                            { id: 'dark', label: 'Dark' },
                            { id: 'solid', label: 'Solid' },
                            { id: 'bordered', label: 'Bordered' }
                        ]}
                        icon={AppWindow}
                    />

                    {/* 탭 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                // 삭제할 탭의 패널 ID 찾기
                                try {
                                    const { data: panelElements } = await supabase
                                        .from('elements')
                                        .select('*')
                                        .eq('parent_id', elementId)
                                        .eq('props->tabIndex', selectedTab.tabIndex);

                                    // 패널 요소 삭제
                                    if (panelElements && panelElements.length > 0) {
                                        await supabase
                                            .from('elements')
                                            .delete()
                                            .eq('id', panelElements[0].id);
                                    }

                                    // 탭 배열에서 제거
                                    const updatedTabs = [...tabs];
                                    updatedTabs.splice(selectedTab.tabIndex, 1);

                                    // 탭 인덱스 업데이트
                                    for (let i = selectedTab.tabIndex; i < updatedTabs.length; i++) {
                                        const { data: panelsToUpdate } = await supabase
                                            .from('elements')
                                            .select('*')
                                            .eq('parent_id', elementId)
                                            .eq('props->tabIndex', i + 1);

                                        if (panelsToUpdate && panelsToUpdate.length > 0) {
                                            await supabase
                                                .from('elements')
                                                .update({
                                                    props: {
                                                        ...panelsToUpdate[0].props,
                                                        tabIndex: i
                                                    }
                                                })
                                                .eq('id', panelsToUpdate[0].id);
                                        }
                                    }

                                    // Tabs 업데이트
                                    const updatedProps = {
                                        ...currentProps,
                                        children: updatedTabs,
                                        defaultSelectedKey: updatedTabs.length > 0 ? updatedTabs[0].id : undefined
                                    };
                                    onUpdate(updatedProps);

                                    // 선택 상태 초기화
                                    setSelectedTab(null);
                                } catch (err) {
                                    console.error('Delete tab error:', err);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Tab
                        </button>
                    </div>
                </fieldset>

                {/* 탭 편집 모드 종료 버튼 */}
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

    // Tabs 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tab Settings</legend>

                {/* 기본 선택 탭 */}
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

                {/* 방향 설정 */}
                <PropertySelect
                    label="Orientation"
                    value={String(currentProps.orientation || 'horizontal')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { id: 'horizontal', label: 'Horizontal' },
                        { id: 'vertical', label: 'Vertical' }
                    ]}
                    icon={Layout}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tab Management</legend>

                {/* 탭 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total tabs: {tabs.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual tabs from tree to edit title, variant, and appearance
                    </p>
                </div>

                {/* 탭 목록 */}
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

                {/* 새 탭 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={async () => {
                            const newTabId = `tab${Date.now()}`;
                            const newTabIndex = tabs.length || 0;
                            const newTab = {
                                id: newTabId,
                                title: `Tab ${newTabIndex + 1}`,
                                variant: 'default',
                                appearance: 'light'
                            };

                            const updatedProps = {
                                ...currentProps,
                                children: [...tabs, newTab],
                                defaultSelectedKey: tabs.length === 0 ? newTabId : currentProps.defaultSelectedKey
                            };

                            // 새로운 Panel 컴포넌트 생성
                            const newPanelElement = {
                                id: crypto.randomUUID(),
                                page_id: localPageId || storePageId, // 페이지 ID 사용
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

                            try {
                                // Tabs props 업데이트
                                await supabase
                                    .from('elements')
                                    .update({ props: updatedProps })
                                    .eq('id', elementId);

                                // 새로운 Panel 컴포넌트 생성
                                const { data: panelData, error: panelError } = await supabase
                                    .from('elements')
                                    .insert([newPanelElement])
                                    .select()
                                    .single();

                                if (panelError) {
                                    console.error('Panel creation error:', panelError);
                                    return;
                                }

                                // 상태 업데이트
                                onUpdate(updatedProps);

                                // 스토어에 새 패널 추가
                                if (panelData) {
                                    addElement(panelData);
                                }
                            } catch (err) {
                                console.error('Add tab error:', err);
                            }
                        }}
                    >
                        <Plus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add New Tab
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
