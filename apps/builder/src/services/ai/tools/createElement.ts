/**
 * create_element Tool
 *
 * 캔버스에 새 요소를 생성 (AIPanel.tsx의 executeIntent create case 추출)
 */

import type { ToolExecutor, ToolExecutionResult } from '../../../types/integrations/ai.types';
import type { Element } from '../../../types/core/store.types';
import { getStoreState } from '../../../builder/stores';
import { getDefaultProps } from '../../../types/builder/unified.types';
import { adaptPropsForElement } from '../styleAdapter';
import { useAIVisualFeedbackStore } from '../../../builder/stores/aiVisualFeedback';
import { HierarchyManager } from '../../../builder/utils/HierarchyManager';

export const createElementTool: ToolExecutor = {
  name: 'create_element',

  async execute(args: Record<string, unknown>): Promise<ToolExecutionResult> {
    const tag = args.tag as string;
    if (!tag) {
      return { success: false, error: 'tag는 필수입니다.' };
    }

    const aiProps = (args.props || {}) as Record<string, unknown>;
    const aiStyles = (args.styles || {}) as Record<string, unknown>;
    const parentIdArg = args.parentId as string | undefined;
    const dataBindingArg = args.dataBinding as { endpoint?: string } | undefined;

    try {
      const state = getStoreState();
      const { elements, selectedElementId, currentPageId, addElement } = state;

      // 기본 props 생성 + AI props 병합
      const defaultProps = getDefaultProps(tag);
      const mergedProps = { ...defaultProps, ...aiProps };

      // 스타일 적용
      const finalProps = adaptPropsForElement(tag, mergedProps, aiStyles);

      // 부모 결정
      let parentId: string | null = parentIdArg || null;
      if (!parentId) {
        if (selectedElementId) {
          parentId = selectedElementId;
        } else {
          const bodyElement = elements.find((el) => el.tag === 'body');
          if (bodyElement) {
            parentId = bodyElement.id;
          }
        }
      }

      // Element 생성
      const newElement: Element = {
        id: crypto.randomUUID(),
        tag,
        props: finalProps,
        parent_id: parentId,
        page_id: currentPageId || 'default',
        order_num: HierarchyManager.calculateNextOrderNum(parentId, elements),
        dataBinding: undefined,
      } as Element;

      // dataBinding 처리
      if (dataBindingArg?.endpoint) {
        newElement.dataBinding = {
          type: 'collection',
          source: 'api',
          config: {
            baseUrl: 'MOCK_DATA',
            endpoint: dataBindingArg.endpoint,
            params: {},
            dataMapping: {
              idField: 'id',
              labelField: 'name',
            },
          },
        };
      }

      await addElement(newElement);

      // G.3 시각 피드백: 생성 완료 flash
      useAIVisualFeedbackStore.getState().addFlashForNode(newElement.id, {
        scanLine: true,
      });

      return {
        success: true,
        data: {
          elementId: newElement.id,
          tag,
          parentId,
        },
        affectedElementIds: [newElement.id],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
