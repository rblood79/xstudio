import { Element } from '../stores/elements';

export interface ElementNode {
    element: Element;
    children: ElementNode[];
    depth: number;
}

export interface ElementTree {
    roots: ElementNode[];
    elementMap: Map<string, ElementNode>;
    flatList: Element[];
}

export interface HierarchyStats {
    totalElements: number;
    maxDepth: number;
    averageDepth: number;
    orphanedElements: Element[];
}

export class HierarchyManager {
    private static elementMap: Map<string, ElementNode> = new Map();
    private static treeCache: Map<string, ElementTree> = new Map();

    /**
     * 요소 배열로부터 계층 구조 트리 생성
     */
    static buildElementTree(elements: Element[]): ElementTree {
        const cacheKey = this.generateCacheKey(elements);

        // 캐시된 트리가 있으면 반환
        if (this.treeCache.has(cacheKey)) {
            return this.treeCache.get(cacheKey)!;
        }

        const elementMap = new Map<string, ElementNode>();
        const roots: ElementNode[] = [];

        // 모든 요소를 노드로 변환
        elements.forEach(element => {
            elementMap.set(element.id, {
                element,
                children: [],
                depth: 0
            });
        });

        // 계층 구조 구성
        elements.forEach(element => {
            const node = elementMap.get(element.id)!;

            if (!element.parent_id) {
                // 루트 요소
                roots.push(node);
            } else {
                // 자식 요소
                const parentNode = elementMap.get(element.parent_id);
                if (parentNode) {
                    parentNode.children.push(node);
                    node.depth = parentNode.depth + 1;
                }
            }
        });

        // order_num으로 정렬
        this.sortNodesByOrder(roots);

        const tree: ElementTree = {
            roots,
            elementMap,
            flatList: elements
        };

        // 캐시에 저장
        this.treeCache.set(cacheKey, tree);

        return tree;
    }

    /**
     * 특정 부모의 정렬된 자식 요소들 반환
     */
    static getOrderedChildren(parentId: string | null, elements: Element[]): Element[] {
        return elements
            .filter(el => el.parent_id === parentId)
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }

    /**
     * 다음 order_num 계산
     */
    static calculateNextOrderNum(parentId: string | null, elements: Element[]): number {
        const siblings = elements.filter(el => el.parent_id === parentId);
        return siblings.length > 0
            ? Math.max(...siblings.map(el => el.order_num || 0)) + 1
            : 1;
    }

    /**
     * 요소를 특정 위치에 삽입하기 위한 order_num 재계산
     */
    static calculateOrderNumsForInsertion(
        parentId: string | null,
        insertIndex: number,
        elements: Element[]
    ): { [elementId: string]: number } {
        const siblings = this.getOrderedChildren(parentId, elements);
        const orderNumMap: { [elementId: string]: number } = {};

        // 삽입 위치 이후의 모든 요소들의 order_num을 1씩 증가
        siblings.forEach((sibling, index) => {
            if (index >= insertIndex) {
                orderNumMap[sibling.id] = (sibling.order_num || 0) + 1;
            }
        });

        return orderNumMap;
    }

    /**
     * 요소 이동 (드래그 앤 드롭)
     */
    static calculateMoveOrderNums(
        elementId: string,
        newParentId: string | null,
        newIndex: number,
        elements: Element[]
    ): { [elementId: string]: number } {
        const element = elements.find(el => el.id === elementId);
        if (!element) return {};

        const orderNumMap: { [elementId: string]: number } = {};

        // 기존 부모의 자식들에서 제거
        const oldSiblings = this.getOrderedChildren(element.parent_id, elements);
        const oldIndex = oldSiblings.findIndex(sibling => sibling.id === elementId);

        if (oldIndex !== -1) {
            // 기존 위치 이후의 요소들을 앞으로 이동
            oldSiblings.slice(oldIndex + 1).forEach(sibling => {
                orderNumMap[sibling.id] = (sibling.order_num || 0) - 1;
            });
        }

        // 새 부모의 자식들에 삽입
        const newSiblings = this.getOrderedChildren(newParentId, elements);
        newSiblings.slice(newIndex).forEach(sibling => {
            orderNumMap[sibling.id] = (sibling.order_num || 0) + 1;
        });

        // 이동할 요소의 새 order_num
        orderNumMap[elementId] = newIndex + 1;

        return orderNumMap;
    }

    /**
     * 특수 컴포넌트 처리 (Tabs, Tree 등)
     */
    static getSpecialComponentChildren(
        parentId: string,
        elements: Element[],
        componentType: 'Tabs' | 'Tree' | 'TagGroup' | 'ListBox' | 'GridList'
    ): Element[] {
        const parent = elements.find(el => el.id === parentId);
        if (!parent || parent.tag !== componentType) return [];

        switch (componentType) {
            case 'Tabs':
                // Tab과 Panel을 쌍으로 그룹화
                const tabs = elements
                    .filter(el => el.parent_id === parentId && el.tag === 'Tab')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

                const panels = elements
                    .filter(el => el.parent_id === parentId && el.tag === 'Panel')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

                // Tab과 Panel을 쌍으로 결합
                const pairedItems: Element[] = [];
                for (let i = 0; i < Math.max(tabs.length, panels.length); i++) {
                    if (tabs[i]) pairedItems.push(tabs[i]);
                    if (panels[i]) pairedItems.push(panels[i]);
                }
                return pairedItems;

            case 'Tree':
                // TreeItem만 반환
                return elements
                    .filter(el => el.parent_id === parentId && el.tag === 'TreeItem')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

            case 'TagGroup':
                // Tag만 반환
                return elements
                    .filter(el => el.parent_id === parentId && el.tag === 'Tag')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

            case 'ListBox':
                // ListBoxItem만 반환
                return elements
                    .filter(el => el.parent_id === parentId && el.tag === 'ListBoxItem')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

            case 'GridList':
                // GridListItem만 반환
                return elements
                    .filter(el => el.parent_id === parentId && el.tag === 'GridListItem')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

            default:
                return this.getOrderedChildren(parentId, elements);
        }
    }

    /**
     * 계층 구조 통계 정보
     */
    static getHierarchyStats(elements: Element[]): HierarchyStats {
        const tree = this.buildElementTree(elements);
        const depths: number[] = [];
        const orphanedElements: Element[] = [];

        const traverse = (nodes: ElementNode[]) => {
            nodes.forEach(node => {
                depths.push(node.depth);

                // 부모가 존재하지 않는 요소 (루트 제외)
                if (node.element.parent_id && !tree.elementMap.has(node.element.parent_id)) {
                    orphanedElements.push(node.element);
                }

                traverse(node.children);
            });
        };

        traverse(tree.roots);

        return {
            totalElements: elements.length,
            maxDepth: depths.length > 0 ? Math.max(...depths) : 0,
            averageDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
            orphanedElements
        };
    }

    /**
     * 계층 구조 검증
     */
    static validateHierarchy(elements: Element[]): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 중복 ID 검사
        const ids = elements.map(el => el.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            errors.push(`Duplicate element IDs found: ${duplicateIds.join(', ')}`);
        }

        // 순환 참조 검사
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (elementId: string): boolean => {
            if (recursionStack.has(elementId)) return true;
            if (visited.has(elementId)) return false;

            visited.add(elementId);
            recursionStack.add(elementId);

            const element = elements.find(el => el.id === elementId);
            if (element?.parent_id) {
                if (hasCycle(element.parent_id)) return true;
            }

            recursionStack.delete(elementId);
            return false;
        };

        elements.forEach(element => {
            if (hasCycle(element.id)) {
                errors.push(`Circular reference detected involving element: ${element.id}`);
            }
        });

        // 고아 요소 검사
        const stats = this.getHierarchyStats(elements);
        if (stats.orphanedElements.length > 0) {
            warnings.push(`Orphaned elements found: ${stats.orphanedElements.map(el => el.id).join(', ')}`);
        }

        // order_num 검증
        const parentGroups = new Map<string | null, Element[]>();
        elements.forEach(element => {
            const parentId = element.parent_id;
            if (!parentGroups.has(parentId)) {
                parentGroups.set(parentId, []);
            }
            parentGroups.get(parentId)!.push(element);
        });

        parentGroups.forEach((children, parentId) => {
            const orderNums = children.map(child => child.order_num || 0);
            const uniqueOrderNums = new Set(orderNums);

            if (orderNums.length !== uniqueOrderNums.size) {
                warnings.push(`Duplicate order_num values found in children of parent: ${parentId || 'root'}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 캐시 키 생성
     */
    private static generateCacheKey(elements: Element[]): string {
        return elements
            .map(el => `${el.id}:${el.parent_id}:${el.order_num}`)
            .sort()
            .join('|');
    }

    /**
     * 노드들을 order_num으로 정렬
     */
    private static sortNodesByOrder(nodes: ElementNode[]): void {
        nodes.sort((a, b) => (a.element.order_num || 0) - (b.element.order_num || 0));
        nodes.forEach(node => this.sortNodesByOrder(node.children));
    }

    /**
     * 캐시 클리어
     */
    static clearCache(): void {
        this.treeCache.clear();
        this.elementMap.clear();
    }
}
