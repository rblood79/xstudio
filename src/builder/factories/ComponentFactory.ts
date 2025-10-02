import { Element, ComponentElementProps } from '../../types/store'; // 통합된 타입 사용
//import { elementsApi } from '../../services/api';
import { HierarchyManager } from '../utils/HierarchyManager';
import { ElementUtils } from '../../utils/elementUtils'; // ElementUtils 추가
import { useStore } from '../stores'; // useStore import 추가
import {
    createDefaultTableProps,
    createDefaultTableHeaderProps,
    createDefaultTableBodyProps,
    createDefaultColumnProps,
    createDefaultColumnGroupProps,
    createDefaultRowProps,
    createDefaultCellProps
} from '../../types/unified';

export interface ComponentCreationResult {
    parent: Element;
    children: Element[];
    allElements: Element[];
}

export class ComponentFactory {
    /**
     * 복합 컴포넌트 생성
     */
    static async createComplexComponent(
        tag: string,
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // addElement 매개변수 제거
    ): Promise<ComponentCreationResult> {
        const creators = {
            TextField: this.createTextField,
            ToggleButtonGroup: this.createToggleButtonGroup,
            CheckboxGroup: this.createCheckboxGroup,
            RadioGroup: this.createRadioGroup,
            Select: this.createSelect,
            ComboBox: this.createComboBox,
            Tabs: this.createTabs,
            Tree: this.createTree,
            TagGroup: this.createTagGroup,
            ListBox: this.createListBox,
            GridList: this.createGridList,
            Table: this.createTable,
        };

        const creator = creators[tag as keyof typeof creators];
        if (!creator) {
            throw new Error(`No creator found for component type: ${tag}`);
        }

        return await creator(parentElement, pageId, elements);
    }

    /**
     * TextField 컴포넌트 생성
     */
    private static async createTextField(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'TextField',
            props: {
                label: 'Text Field',
                placeholder: 'Enter text...',
                value: '',
                type: 'text',
                isRequired: false,
                isDisabled: false,
                isReadOnly: false
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (DB 저장하지 않고 로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        // 자식 요소들 생성 - order_num을 동적으로 계산
        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'Label',
                props: { children: 'Label' } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Input',
                props: {
                    type: 'text',
                    placeholder: 'Enter text...'
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Description',
                props: { children: 'Description' } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 3,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'FieldError',
                props: { children: 'Error message' } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 4,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (setTimeout으로 비동기 처리)
        setTimeout(async () => {
            try {
                //console.log(' 부모 저장 시작 - parentData:', parentData);
                //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

                // 부모 먼저 저장 (parentData를 직접 사용)
                const parentToSave = {
                    ...parentData, // parentData 사용 (id 포함)
                    order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
                };

                //console.log('🔍 parentToSave:', parentToSave);
                //console.log('🔍 parentToSave.id:', parentToSave.id);

                const savedParent = await ElementUtils.createElement(parentToSave);

                //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

                // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
                const store = useStore.getState();
                const updatedElements = store.elements.map(el =>
                    el.id === parentData.id ? { ...el, id: savedParent.id } : el
                );
                store.setElements(updatedElements);
                //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

                // 자식들 순차 저장 (부모 ID 업데이트)
                for (let i = 0; i < childrenData.length; i++) {
                    const childToSave = {
                        ...childrenData[i], // childrenData 사용 (임시 ID 포함)
                        parent_id: savedParent.id
                    };
                    const savedChild = await ElementUtils.createElement(childToSave);

                    // 스토어에서 자식 요소 ID 업데이트
                    const updatedElements2 = store.elements.map(el =>
                        el.id === childrenData[i].id ? { ...el, id: savedChild.id } : el
                    );
                    store.setElements(updatedElements2);
                }

                //console.log(`Elements saved to DB: 1 parent + ${childrenData.length} children`);

            } catch (error) {
                console.error('Background save failed:', error);
            }
        }, 0);

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * ToggleButtonGroup 컴포넌트 생성
     */
    private static async createToggleButtonGroup(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'ToggleButtonGroup',
            props: {
                tag: 'ToggleButtonGroup',
                orientation: 'horizontal',
                selectionMode: 'single',
                value: []
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'ToggleButton',
                props: {
                    children: 'Toggle 1',
                    isSelected: false,
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'ToggleButton',
                props: {
                    children: 'Toggle 2',
                    isSelected: false,
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * CheckboxGroup 컴포넌트 생성
     */
    private static async createCheckboxGroup(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'CheckboxGroup',
            props: {
                tag: 'CheckboxGroup',
                label: 'Checkbox Group',
                orientation: 'vertical',
                value: []
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'Checkbox',
                props: {
                    children: 'Option 1',
                    isSelected: false,
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Checkbox',
                props: {
                    children: 'Option 2',
                    isSelected: false,
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * RadioGroup 컴포넌트 생성
     */
    private static async createRadioGroup(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'RadioGroup',
            props: {
                label: 'Radio Group',
                orientation: 'vertical',
                value: ''
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'Radio',
                props: {
                    children: 'Option 1',
                    value: 'option1',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Radio',
                props: {
                    children: 'Option 2',
                    value: 'option2',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * Select 컴포넌트 생성
     */
    private static async createSelect(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'Select',
            props: {
                label: 'Select',
                placeholder: 'Choose an option...',
                selectedKey: undefined
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'SelectItem',
                props: {
                    label: 'Option 1',
                    value: 'option1',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'SelectItem',
                props: {
                    label: 'Option 2',
                    value: 'option2',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'SelectItem',
                props: {
                    label: 'Option 3',
                    value: 'option3',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 3,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * ComboBox 컴포넌트 생성
     */
    private static async createComboBox(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'ComboBox',
            props: {
                label: 'Combo Box',
                placeholder: 'Type or select...',
                inputValue: '',
                allowsCustomValue: true,
                selectedKey: undefined
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'ComboBoxItem',
                props: {
                    label: 'Option 1',
                    value: 'option1',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'ComboBoxItem',
                props: {
                    label: 'Option 2',
                    value: 'option2',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * Tabs 컴포넌트 생성
     */
    private static async createTabs(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        // 초기 Tab들을 위한 UUID 생성
        const tab1Id = ElementUtils.generateId();
        const tab2Id = ElementUtils.generateId();

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'Tabs',
            props: {
                defaultSelectedKey: tab1Id,
                orientation: 'horizontal'
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'Tab',
                props: {
                    title: 'Tab 1',
                    tabId: tab1Id
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Panel',
                props: {
                    //tag: 'Panel',
                    title: 'Panel 1',
                    variant: 'tab',
                    tabId: tab1Id
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Tab',
                props: {
                    title: 'Tab 2',
                    tabId: tab2Id
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 3,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Panel',
                props: {
                    //tag: 'Panel',
                    title: 'Panel 2',
                    variant: 'tab',
                    tabId: tab2Id
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 4,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * Tree 컴포넌트 생성
     */
    private static async createTree(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'Tree',
            props: {
                'aria-label': 'Tree',
                selectionMode: 'single',
                selectionBehavior: 'replace'
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'TreeItem',
                props: {
                    title: 'Node 1',
                    hasChildren: true
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'TreeItem',
                props: {
                    title: 'Node 2',
                    hasChildren: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            // console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * TagGroup 컴포넌트 생성
     */
    private static async createTagGroup(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'TagGroup',
            props: {
                label: 'Tag Group',
                allowsRemoving: false,
                selectionMode: 'multiple'
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'Tag',
                props: {
                    children: 'Tag 1',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Tag',
                props: {
                    children: 'Tag 2',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < children.length; i++) {
                const childToSave = {
                    ...children[i],
                    parent_id: savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            //console.log(`Elements saved to DB: 1 parent + ${children.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * ListBox 컴포넌트 생성
     */
    private static async createListBox(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'ListBox',
            props: {
                orientation: 'vertical',
                selectionMode: 'single'
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'ListBoxItem',
                props: {
                    label: 'Item 1',
                    value: 'item1',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'ListBoxItem',
                props: {
                    label: 'Item 2',
                    value: 'item2',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < childrenData.length; i++) {
                const childToSave = {
                    ...childrenData[i], // childrenData 사용 (임시 ID 포함)
                    parent_id: savedParent.id
                };
                const savedChild = await ElementUtils.createElement(childToSave);

                // 스토어에서 자식 요소 ID 업데이트
                const updatedElements2 = store.elements.map(el =>
                    el.id === childrenData[i].id ? { ...el, id: savedChild.id } : el
                );
                store.setElements(updatedElements2);
            }

            //console.log(`Elements saved to DB: 1 parent + ${childrenData.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * GridList 컴포넌트 생성
     */
    private static async createGridList(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'GridList',
            props: {
                selectionMode: 'none'
            } as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'GridListItem',
                props: {
                    label: `Item 1`,
                    value: 'item1',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'GridListItem',
                props: {
                    label: `Item 2`,
                    value: 'item2',
                    isDisabled: false
                } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 자식 요소들 생성 - 모든 데이터를 먼저 준비
        const childrenData: Element[] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = {
                ...child,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(childData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가 (프리뷰에 한 번만 전송)
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];
        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장 (단순화)
        try {
            //console.log(' 부모 저장 시작 - parentData:', parentData);
            //console.log(' 부모 저장 시작 - parentData.id:', parentData.id);

            // 부모 먼저 저장 (parentData를 직접 사용)
            const parentToSave = {
                ...parentData, // parentData 사용 (id 포함)
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            //console.log('🔍 parentToSave:', parentToSave);
            //console.log('🔍 parentToSave.id:', parentToSave.id);

            const savedParent = await ElementUtils.createElement(parentToSave);

            //console.log('✅ 부모 저장 완료 - 저장된 ID:', savedParent.id, '원본 ID:', parentData.id);

            // 스토어에서 부모 요소 ID 업데이트 (임시 ID → 실제 DB ID)
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);
            //console.log('🔄 스토어 ID 업데이트 완료:', parentData.id, '→', savedParent.id);

            // 자식들 순차 저장 (부모 ID 업데이트)
            for (let i = 0; i < childrenData.length; i++) {
                const childToSave = {
                    ...childrenData[i], // childrenData 사용 (임시 ID 포함)
                    parent_id: savedParent.id
                };
                const savedChild = await ElementUtils.createElement(childToSave);

                // 스토어에서 자식 요소 ID 업데이트
                const updatedElements2 = store.elements.map(el =>
                    el.id === childrenData[i].id ? { ...el, id: savedChild.id } : el
                );
                store.setElements(updatedElements2);
            }

            //console.log(`Elements saved to DB: 1 parent + ${childrenData.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * Table 컴포넌트 생성
     */
    private static async createTable(
        parentElement: Element | null,
        pageId: string,
        elements: Element[]
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'Table',
            props: createDefaultTableProps() as ComponentElementProps,
            page_id: pageId,
            parent_id: parentId,
            order_num: orderNum
        };

        // 부모 요소 생성 (로컬 데이터로만)
        const parentData = {
            ...parent,
            id: ElementUtils.generateId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;

        // TableHeader 생성
        const tableHeaderId = ElementUtils.generateId();
        const tableHeader: Element = {
            id: tableHeaderId,
            tag: 'TableHeader',
            props: createDefaultTableHeaderProps() as ComponentElementProps,
            parent_id: parentData.id,
            page_id: pageId,
            order_num: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Column들 생성 (기본 5개 - API 데이터 필드에 맞춤)
        const columns: Element[] = [
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: {
                    key: 'id',
                    children: 'ID',
                    isRowHeader: false,
                    allowsSorting: true,
                    enableResizing: true,
                    width: 80
                } as ComponentElementProps,
                parent_id: tableHeaderId,
                page_id: pageId,
                order_num: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: {
                    key: 'name',
                    children: 'Name',
                    isRowHeader: false,
                    allowsSorting: true,
                    enableResizing: true,
                    width: 200
                } as ComponentElementProps,
                parent_id: tableHeaderId,
                page_id: pageId,
                order_num: 2,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: {
                    key: 'email',
                    children: 'Email',
                    isRowHeader: false,
                    allowsSorting: true,
                    enableResizing: true,
                    width: 250
                } as ComponentElementProps,
                parent_id: tableHeaderId,
                page_id: pageId,
                order_num: 3,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: {
                    key: 'phone',
                    children: 'Phone',
                    isRowHeader: false,
                    allowsSorting: true,
                    enableResizing: true,
                    width: 150
                } as ComponentElementProps,
                parent_id: tableHeaderId,
                page_id: pageId,
                order_num: 4,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: {
                    key: 'company',
                    children: 'Company',
                    isRowHeader: false,
                    allowsSorting: true,
                    enableResizing: true,
                    width: 200
                } as ComponentElementProps,
                parent_id: tableHeaderId,
                page_id: pageId,
                order_num: 5,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        const childrenData: Element[] = [tableHeader, ...columns];

        // 모든 요소를 한 번에 UI에 추가
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];

        console.log('🏗️ Table 구조 생성:', {
            parentId: parentData.id,
            parentTag: parentData.tag,
            tableHeaderId: tableHeader.id,
            columns: columns.length,
            children: childrenData.map(child => ({
                id: child.id,
                tag: child.tag,
                parent_id: child.parent_id,
                order_num: child.order_num
            }))
        });

        store.setElements(newElements);

        // 히스토리 기록 - 복합 컴포넌트 생성
        const { saveSnapshot } = store as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            saveSnapshot(newElements, '복합 컴포넌트 생성');
        }

        // 백그라운드에서 DB에 순차 저장
        try {
            // 부모 먼저 저장
            const parentToSave = {
                ...parentData,
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            const savedParent = await ElementUtils.createElement(parentToSave);

            // 스토어에서 부모 요소 ID 업데이트
            const store = useStore.getState();
            let updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements);

            // TableHeader 저장
            const tableHeaderToSave = {
                ...tableHeader,
                parent_id: savedParent.id
            };
            const savedTableHeader = await ElementUtils.createElement(tableHeaderToSave);

            updatedElements = store.elements.map(el =>
                el.id === tableHeader.id ? { ...el, id: savedTableHeader.id } : el
            );
            store.setElements(updatedElements);

            // Column들 저장
            for (let i = 0; i < columns.length; i++) {
                const columnToSave = {
                    ...columns[i],
                    parent_id: savedTableHeader.id
                };
                const savedColumn = await ElementUtils.createElement(columnToSave);

                updatedElements = store.elements.map(el =>
                    el.id === columns[i].id ? { ...el, id: savedColumn.id } : el
                );
                store.setElements(updatedElements);
            }

            console.log(`🎯 Table elements saved to DB: ${savedParent.id} (TableHeader + ${columns.length} Columns)`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

    /**
     * ColumnGroup 생성
     */
    static async createColumnGroup(
        parentElement: Element | null,
        pageId: string,
        elements: Element[] = []
    ): Promise<ComponentCreationResult> {
        // 기존 Column Group들의 order_num 중 최대값 찾기
        const existingColumnGroups = elements.filter(el =>
            el.parent_id === parentElement?.id && el.tag === 'ColumnGroup'
        );
        const maxOrderNum = existingColumnGroups.length > 0
            ? Math.max(...existingColumnGroups.map(group => group.order_num || 0))
            : -1;

        const parentData: Element = {
            id: ElementUtils.generateId(),
            tag: 'ColumnGroup',
            props: createDefaultColumnGroupProps(),
            parent_id: parentElement?.id || null,
            page_id: pageId,
            order_num: maxOrderNum + 1, // 중복 방지를 위해 최대값 + 1
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const childrenData: Element[] = [];

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }

}

