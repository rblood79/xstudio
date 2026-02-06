/**
 * AI Tool Registry
 *
 * 모든 도구를 등록하고 레지스트리로 제공
 */

import type { ToolExecutor } from '../../../types/integrations/ai.types';
import { getEditorStateTool } from './getEditorState';
import { getSelectionTool } from './getSelection';
import { createElementTool } from './createElement';
import { updateElementTool } from './updateElement';
import { deleteElementTool } from './deleteElement';

export { toolDefinitions } from './definitions';

/**
 * 도구 레지스트리 생성
 */
export function createToolRegistry(): Map<string, ToolExecutor> {
  const registry = new Map<string, ToolExecutor>();

  const tools: ToolExecutor[] = [
    getEditorStateTool,
    getSelectionTool,
    createElementTool,
    updateElementTool,
    deleteElementTool,
  ];

  for (const tool of tools) {
    registry.set(tool.name, tool);
  }

  return registry;
}
