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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

        const parent: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            tag: 'Tabs',
            props: {
                defaultSelectedKey: 'tab1',
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
                    tabId: 'tab1'
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
                    variant: 'tab'
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
                    tabId: 'tab2'
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
                    variant: 'tab'
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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
            store.setElements(updatedElements, { skipHistory: true });
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
                store.setElements(updatedElements2, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
                    label: 'Grid Item 1',
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
                    label: 'Grid Item 2',
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
            store.setElements(updatedElements, { skipHistory: true });
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
                store.setElements(updatedElements2, { skipHistory: true });
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
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, Array.isArray(elements) ? elements : []);

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
        const theadId = ElementUtils.generateId();
        const thead = {
            id: theadId,
            tag: 'TableHeader',
            props: createDefaultTableHeaderProps() as ComponentElementProps,
            parent_id: parentData.id,
            page_id: pageId,
            order_num: 0,
        };

        // TableBody 생성
        const tbodyId = ElementUtils.generateId();
        const tbody = {
            id: tbodyId,
            tag: 'TableBody',
            props: createDefaultTableBodyProps() as ComponentElementProps,
            parent_id: parentData.id,
            page_id: pageId,
            order_num: 1,
        };

        // 헤더 컬럼들 생성 (React Aria Table은 Column을 사용)
        const headerColumns = [
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: { ...createDefaultColumnProps(), children: '이름', isRowHeader: true } as ComponentElementProps,
                parent_id: theadId,
                page_id: pageId,
                order_num: 0,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: { ...createDefaultColumnProps(), children: '나이' } as ComponentElementProps,
                parent_id: theadId,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Column',
                props: { ...createDefaultColumnProps(), children: '이메일' } as ComponentElementProps,
                parent_id: theadId,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 기본 행 생성 (1줄)
        const rowId = ElementUtils.generateId();
        const row = {
            id: rowId,
            tag: 'Row',
            props: createDefaultRowProps() as ComponentElementProps,
            parent_id: tbodyId,
            page_id: pageId,
            order_num: 0,
        };

        // 행의 셀들 생성
        const cells = [
            {
                id: ElementUtils.generateId(),
                tag: 'Cell',
                props: { ...createDefaultCellProps(), children: '홍길동' } as ComponentElementProps,
                parent_id: rowId,
                page_id: pageId,
                order_num: 0,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Cell',
                props: { ...createDefaultCellProps(), children: '25' } as ComponentElementProps,
                parent_id: rowId,
                page_id: pageId,
                order_num: 1,
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Cell',
                props: { ...createDefaultCellProps(), children: 'hong@example.com' } as ComponentElementProps,
                parent_id: rowId,
                page_id: pageId,
                order_num: 2,
            }
        ];

        // 모든 자식 요소들 생성
        const childrenData: Element[] = [];

        // tHead 추가
        const theadData = {
            ...thead,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;
        childrenData.push(theadData);

        // tBody 추가
        const tbodyData = {
            ...tbody,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;
        childrenData.push(tbodyData);

        // 헤더 컬럼들 추가
        for (let i = 0; i < headerColumns.length; i++) {
            const column = headerColumns[i];
            const columnData = {
                ...column,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(columnData);
        }

        // 데이터 행 추가
        const rowData = {
            ...row,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Element;
        childrenData.push(rowData);

        // 데이터 셀들 추가
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const cellData = {
                ...cell,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Element;
            childrenData.push(cellData);
        }

        // 모든 요소(부모 + 자식들)를 한 번에 UI에 추가
        const store = useStore.getState();
        const currentElements = store.elements;
        const newElements = [...currentElements, parentData, ...childrenData];

        console.log('🏗️ Table 구조 생성:', {
            parentId: parentData.id,
            parentTag: parentData.tag,
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

        // 백그라운드에서 DB에 순차 저장 (Tabs와 동일한 패턴)
        try {
            // 부모 먼저 저장
            const parentToSave = {
                ...parentData,
                order_num: HierarchyManager.calculateNextOrderNum(parentId, await ElementUtils.getElementsByPageId(pageId))
            };

            const savedParent = await ElementUtils.createElement(parentToSave);

            // 스토어에서 부모 요소 ID 업데이트
            const store = useStore.getState();
            const updatedElements = store.elements.map(el =>
                el.id === parentData.id ? { ...el, id: savedParent.id } : el
            );
            store.setElements(updatedElements, { skipHistory: true });

            // 자식들을 저장용 배열로 변환 (ID 매핑)
            const childrenToSave = childrenData.map(child => {
                let correctParentId = child.parent_id;

                // TableHeader, TableBody는 Table(부모)을 parent로 설정
                if (child.tag === 'TableHeader' || child.tag === 'TableBody') {
                    correctParentId = savedParent.id;
                }
                // Column은 TableHeader를 parent로 설정 (임시 ID를 실제 DB ID로 변경)
                else if (child.tag === 'Column') {
                    const headerChild = childrenData.find(c => c.tag === 'TableHeader');
                    if (headerChild) {
                        correctParentId = headerChild.id; // 임시 ID 사용 (나중에 실제 저장된 ID로 업데이트)
                    }
                }
                // Row는 TableBody를 parent로 설정
                else if (child.tag === 'Row') {
                    const bodyChild = childrenData.find(c => c.tag === 'TableBody');
                    if (bodyChild) {
                        correctParentId = bodyChild.id; // 임시 ID 사용
                    }
                }
                // Cell은 Row를 parent로 설정
                else if (child.tag === 'Cell') {
                    const rowChild = childrenData.find(c => c.tag === 'Row');
                    if (rowChild) {
                        correctParentId = rowChild.id; // 임시 ID 사용
                    }
                }

                return {
                    ...child,
                    parent_id: correctParentId
                };
            });

            // 계층 순서대로 저장 (TableHeader, TableBody, Column, Row, Cell)
            const idMapping: Record<string, string> = { [parentData.id]: savedParent.id };

            // 1. TableHeader, TableBody 먼저 저장
            for (const child of childrenToSave.filter(c => c.tag === 'TableHeader' || c.tag === 'TableBody')) {
                const savedChild = await ElementUtils.createElement(child);
                idMapping[child.id] = savedChild.id;
            }

            // 2. Column 저장 (TableHeader ID 업데이트)
            for (const child of childrenToSave.filter(c => c.tag === 'Column')) {
                const headerChild = childrenData.find(c => c.tag === 'TableHeader');
                const childToSave = {
                    ...child,
                    parent_id: headerChild ? idMapping[headerChild.id] : savedParent.id
                };
                const savedChild = await ElementUtils.createElement(childToSave);
                idMapping[child.id] = savedChild.id;
            }

            // 3. Row 저장 (TableBody ID 업데이트)
            for (const child of childrenToSave.filter(c => c.tag === 'Row')) {
                const bodyChild = childrenData.find(c => c.tag === 'TableBody');
                const childToSave = {
                    ...child,
                    parent_id: bodyChild ? idMapping[bodyChild.id] : savedParent.id
                };
                const savedChild = await ElementUtils.createElement(childToSave);
                idMapping[child.id] = savedChild.id;
            }

            // 4. Cell 저장 (Row ID 업데이트)
            for (const child of childrenToSave.filter(c => c.tag === 'Cell')) {
                const rowChild = childrenData.find(c => c.tag === 'Row');
                const childToSave = {
                    ...child,
                    parent_id: rowChild ? idMapping[rowChild.id] : savedParent.id
                };
                await ElementUtils.createElement(childToSave);
            }

            console.log(`🎯 Table elements saved to DB: 1 parent + ${childrenData.length} children`);

        } catch (error) {
            console.error('Background save failed:', error);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }
}

