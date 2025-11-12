import type { ComponentType } from "react";
import type { ComponentEditorProps } from "../types";
import { componentMetadata } from "../../components/metadata";

/**
 * 에디터 캐시
 */
const editorCache = new Map<string, ComponentType<ComponentEditorProps>>();

/**
 * 에디터 모듈 동적 import
 */
async function importEditor(
  editorName: string
): Promise<ComponentType<ComponentEditorProps> | null> {
  try {
    // panels/properties/editors 경로에서 import (패널 시스템)
    const module = await import(`../../panels/properties/editors/${editorName}.tsx`);
    return module.default || module[editorName];
  } catch (error) {
    console.warn(`Editor not found: ${editorName}`, error);
    return null;
  }
}

/**
 * 에디터 조회 (자동 로딩)
 */
export async function getEditor(
  type: string
): Promise<ComponentType<ComponentEditorProps> | null> {
  console.log('[getEditor] Looking for editor:', type);

  // 캐시 확인
  if (editorCache.has(type)) {
    console.log('[getEditor] Found in cache:', type);
    return editorCache.get(type)!;
  }

  // 메타데이터에서 에디터 정보 확인
  const metadata = componentMetadata.find((c) => c.type === type);
  console.log('[getEditor] Metadata found:', type, !!metadata, metadata?.inspector);

  if (!metadata?.inspector.hasCustomEditor || !metadata.inspector.editorName) {
    console.warn('[getEditor] No custom editor for:', type);
    return null;
  }

  // 동적 import
  console.log('[getEditor] Importing editor:', metadata.inspector.editorName);
  const editor = await importEditor(metadata.inspector.editorName);

  if (editor) {
    editorCache.set(type, editor);
    console.log('[getEditor] Editor cached:', type);
  } else {
    console.warn('[getEditor] Failed to import editor:', metadata.inspector.editorName);
  }

  return editor;
}

/**
 * 에디터 캐시 초기화
 */
export function clearEditorCache(): void {
  editorCache.clear();
}

/**
 * 특정 에디터 캐시 제거
 */
export function removeEditorFromCache(type: string): void {
  editorCache.delete(type);
}
