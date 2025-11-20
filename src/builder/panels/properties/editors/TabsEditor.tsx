import { useMemo, useState, useEffect, useCallback, memo } from "react";
import { AppWindow, Plus, Ratio, PointerOff, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { getDB } from '../../../../lib/db';
import { useStore } from '../../../stores';
import type { Element } from '../../../../types/core/store.types'; // 통합된 타입 사용
import { ElementUtils } from '../../../../utils/element/elementUtils';
import { generateCustomId } from '../../../utils/idGeneration';

// 상수 정의
const ORIENTATIONS: Array<{ value: string; label: string }> = [
    { value: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
    { value: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL }
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 커스텀 훅: 페이지 ID 관리
function usePageId() {
    const { currentPageId: storePageId, setCurrentPageId } = useStore();
    const [localPageId, setLocalPageId] = useState<string>('');

    const fetchCurrentPageId = useCallback(async (projectId: string) => {
        try {
            const db = await getDB();
            const pages = await db.pages.getByProject(projectId);

            if (pages && pages.length > 0) {
                // Sort by created_at descending, get first
                const sortedPages = pages.sort((a, b) => {
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return dateB - dateA;
                });
                const pageId = sortedPages[0].id;
                setLocalPageId(pageId);
                setCurrentPageId(pageId);
            }
        } catch (err) {
            console.error('❌ [IndexedDB] Failed to fetch current page ID:', err);
        }
    }, [setCurrentPageId]);

    useEffect(() => {
        if (storePageId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
            const db = await getDB();
            const page = await db.pages.getById(pageId);
            return !!page;
        } catch (err) {
            console.error('❌ [IndexedDB] Page validation failed:', err);
            return false;
        }
    };

    return { localPageId, storePageId, validatePageId };
}

export const TabsEditor = memo(function TabsEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const { addElement, elements: storeElements } = useStore();
  const { localPageId, storePageId } = usePageId();

  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleDefaultSelectedKeyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, defaultSelectedKey: value || undefined });
  }, [currentProps, onUpdate]);

  const handleIsDisabledChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isDisabled: checked });
  }, [currentProps, onUpdate]);

  const handleOrientationChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, orientation: value });
  }, [currentProps, onUpdate]);

  const handleAriaLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-label": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelledbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaDescribedbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-describedby": value || undefined });
  }, [currentProps, onUpdate]);


  // 실제 Tab 자식 요소들을 찾기 (useMemo로 최적화)
  const tabChildren = useMemo(() => {
    return storeElements
      .filter((child) => child.parent_id === elementId && child.tag === 'Tab')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [storeElements, elementId]);

  // ⭐ 최적화: defaultSelectedKey 옵션 생성
  const defaultTabOptions = useMemo(() => {
    return tabChildren.map(tab => ({
      id: tab.id,
      value: tab.id,
      label: ('title' in tab.props ? tab.props.title : 'Untitled Tab') as string
    }));
  }, [tabChildren]);

  // 새 탭 추가 함수 정의
  const addNewTab = useCallback(async () => {
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
  }, [localPageId, storePageId, tabChildren, currentProps, elementId, onUpdate, addElement]);

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="tabs_1"
        />
      </PropertySection>
    ),
    [customId, elementId]
  );

  const stateSection = useMemo(
    () => (
      <PropertySection title="State">
        <PropertySelect
          label={PROPERTY_LABELS.DEFAULT_TAB}
          value={String(currentProps.defaultSelectedKey || '')}
          onChange={handleDefaultSelectedKeyChange}
          options={defaultTabOptions}
          icon={AppWindow}
        />
      </PropertySection>
    ),
    [currentProps.defaultSelectedKey, defaultTabOptions, handleDefaultSelectedKeyChange]
  );

  const behaviorSection = useMemo(
    () => (
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={handleIsDisabledChange}
          icon={PointerOff}
        />
      </PropertySection>
    ),
    [currentProps.isDisabled, handleIsDisabledChange]
  );

  const designSection = useMemo(
    () => (
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || 'horizontal')}
          onChange={handleOrientationChange}
          options={ORIENTATIONS}
          icon={Ratio}
        />
      </PropertySection>
    ),
    [currentProps.orientation, handleOrientationChange]
  );

  const accessibilitySection = useMemo(
    () => (
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps['aria-label'] || '')}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="Tabs label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps['aria-labelledby'] || '')}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps['aria-describedby'] || '')}
          onChange={handleAriaDescribedbyChange}
          icon={Hash}
          placeholder="description-element-id"
        />
      </PropertySection>
    ),
    [
      currentProps['aria-label'],
      currentProps['aria-labelledby'],
      currentProps['aria-describedby'],
      handleAriaLabelChange,
      handleAriaLabelledbyChange,
      handleAriaDescribedbyChange,
    ]
  );

  const tabManagementSection = useMemo(
    () => (
      <PropertySection title="{PROPERTY_LABELS.TAB_MANAGEMENT}">
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
            {PROPERTY_LABELS.ADD_TAB}
          </button>
        </div>
      </PropertySection>
    ),
    [tabChildren.length, addNewTab, localPageId, storePageId]
  );

  // Tabs 컴포넌트 자체의 속성 편집 UI만 표시
  return (
    <>
      {basicSection}
      {stateSection}
      {behaviorSection}
      {designSection}
      {accessibilitySection}
      {tabManagementSection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});

// 유틸리티 함수들
async function createNewTab(
    tabChildren: Element[], // Element[] 타입으로 변경
    currentProps: Record<string, unknown>,
    elementId: string,
    pageId: string,
    onUpdate: (props: Record<string, unknown>) => void,
    addElement: (element: Element) => void
) {
    const newTabIndex = tabChildren.length || 0;

    // UUID 기반 tabId 사용 (안전하고 중복 없음)
    const tabId = ElementUtils.generateId();

    // 현재 Tabs의 모든 자식 요소들(Tab + Panel)의 order_num 중 최대값 구하기
    const { elements } = useStore.getState();
    const allTabsChildren = elements.filter(el => el.parent_id === elementId);
    const maxOrderNum = Math.max(0, ...allTabsChildren.map(el => el.order_num || 0));

    // 새로운 Tab 요소 생성
    const newTabElement = {
        id: ElementUtils.generateId(),
        customId: generateCustomId('Tab', elements),
        page_id: pageId,
        tag: 'Tab',
        props: {
            title: `Tab ${newTabIndex + 1}`,
            variant: 'default',
            appearance: 'light',
            style: {},
            className: '',
            tabId: tabId,
        },
        parent_id: elementId,
        order_num: maxOrderNum + 1, // 다음 순서로 배치
    };

    // 새로운 Panel 요소 생성
    const newPanelElement = {
        id: ElementUtils.generateId(),
        customId: generateCustomId('Panel', elements),
        page_id: pageId,
        tag: 'Panel',
        props: {
            variant: 'tab',
            title: newTabElement.props.title,
            tabIndex: newTabIndex,
            style: {},
            className: '',
            tabId: tabId,
        },
        parent_id: elementId,
        order_num: maxOrderNum + 2, // Tab 다음 순서로 배치
    };

    try {
        const db = await getDB();

        // Tab과 Panel을 IndexedDB에 저장
        const insertedTab = await db.elements.insert(newTabElement);
        const insertedPanel = await db.elements.insert(newPanelElement);

        // Tabs props 업데이트 (defaultSelectedKey만, children 제거)
        const updatedProps = {
            ...currentProps,
            defaultSelectedKey: tabChildren.length === 0 ? newTabElement.id : currentProps.defaultSelectedKey
        };

        // Tabs 요소 자체 업데이트
        await db.elements.update(elementId, { props: updatedProps });

        // 성공 시 상태 업데이트
        onUpdate(updatedProps);

        // 스토어에 새 요소들 추가
        addElement(insertedTab);
        addElement(insertedPanel);

        console.log('✅ [IndexedDB] Tab and Panel created successfully');

    } catch (err) {
        console.error('❌ [IndexedDB] createNewTab error:', err);
        // Rollback: IndexedDB에서 생성된 요소들 삭제
        try {
            const db = await getDB();
            await db.elements.delete(newTabElement.id);
            await db.elements.delete(newPanelElement.id);
            console.log('⚠️ [IndexedDB] Rollback completed');
        } catch (rollbackErr) {
            console.error('❌ [IndexedDB] Rollback failed:', rollbackErr);
        }
        throw err;
    }
}
