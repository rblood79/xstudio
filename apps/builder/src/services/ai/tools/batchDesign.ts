/**
 * batch_design Tool
 *
 * 여러 작업(create/update/delete)을 순차 실행
 * 기존 도구의 execute()를 직접 재사용
 */

import type { ToolExecutor, ToolExecutionResult } from '../../../types/integrations/ai.types';
import { createElementTool } from './createElement';
import { updateElementTool } from './updateElement';
import { deleteElementTool } from './deleteElement';

interface BatchOperation {
  action: 'create' | 'update' | 'delete';
  args: Record<string, unknown>;
}

const ACTION_EXECUTORS: Record<string, ToolExecutor> = {
  create: createElementTool,
  update: updateElementTool,
  delete: deleteElementTool,
};

export const batchDesignTool: ToolExecutor = {
  name: 'batch_design',

  async execute(args: Record<string, unknown>): Promise<ToolExecutionResult> {
    const operations = args.operations as BatchOperation[] | undefined;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return { success: false, error: 'operations 배열이 필요합니다.' };
    }

    if (operations.length > 20) {
      return { success: false, error: '한 번에 최대 20개 작업까지 가능합니다.' };
    }

    const results: Array<{
      index: number;
      action: string;
      success: boolean;
      data?: unknown;
      error?: string;
    }> = [];
    const allAffectedIds: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const executor = ACTION_EXECUTORS[op.action];

      if (!executor) {
        results.push({
          index: i,
          action: op.action,
          success: false,
          error: `알 수 없는 action: ${op.action}. create/update/delete만 가능.`,
        });
        continue;
      }

      const result = await executor.execute(op.args || {});
      results.push({
        index: i,
        action: op.action,
        success: result.success,
        data: result.data,
        error: result.error,
      });

      if (result.affectedElementIds) {
        allAffectedIds.push(...result.affectedElementIds);
      }

      // 실패 시 나머지 작업 중단
      if (!result.success) {
        break;
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return {
      success: successCount > 0,
      data: {
        total: operations.length,
        executed: results.length,
        succeeded: successCount,
        failed: results.length - successCount,
        results,
      },
      affectedElementIds: allAffectedIds,
    };
  },
};
