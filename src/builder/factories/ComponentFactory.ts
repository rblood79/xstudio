import { Element, ComponentElementProps } from '../../types/store'; // 통합된 타입 사용
//import { elementsApi } from '../../services/api';
import { HierarchyManager } from '../utils/HierarchyManager';
import { ElementUtils } from '../../utils/elementUtils'; // ElementUtils 추가
//import { useStore } from '../../store/store'; // useStore 추가

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
        addElement: (element: Element) => void,
        elements: Element[] // 현재 요소들을 받아서 전달
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
        };

        const creator = creators[tag as keyof typeof creators];
        if (!creator) {
            throw new Error(`No creator found for component type: ${tag}`);
        }

        return await creator(parentElement, pageId, addElement, elements);
    }

    /**
     * TextField 컴포넌트 생성
     */
    private static async createTextField(
        parentElement: Element | null,
        pageId: string,
        addElement: (element: Element) => void,
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

        // 부모 요소 생성
        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'Label',
                props: { children: 'Label' } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 1, // 첫 번째 자식
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
                order_num: 2, // 두 번째 자식
            },
            {
                id: ElementUtils.generateId(),
                tag: 'Description',
                props: { children: 'Description' } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 3, // 세 번째 자식
            },
            {
                id: ElementUtils.generateId(),
                tag: 'FieldError',
                props: { children: 'Error message' } as ComponentElementProps,
                parent_id: parentData.id,
                page_id: pageId,
                order_num: 4, // 네 번째 자식
            }
        ];

        // 자식 요소들 생성
        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
        }

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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

        const children = [
            {
                id: ElementUtils.generateId(),
                tag: 'ToggleButton',
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
                tag: 'ToggleButton',
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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
        elements: Element[] // 현재 요소들을 받아서 전달
    ): Promise<ComponentCreationResult> {
        const parentId = parentElement?.id || null;
        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
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
        addElement: (element: Element) => void,
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

        const parentData = await ElementUtils.createElement(parent);
        addElement(parentData);

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

        const childrenData: Element[] = [];
        for (const child of children) {
            const childData = await ElementUtils.createElement(child);
            addElement(childData);
            childrenData.push(childData);
        }

        return {
            parent: parentData,
            children: childrenData,
            allElements: [parentData, ...childrenData]
        };
    }
}
