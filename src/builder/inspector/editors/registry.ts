import type { ComponentType } from "react";
import type { ComponentEditorProps } from "../types";
import { componentMetadata } from "../../components/metadata";

/**
 * 에디터 캐시
 */
const editorCache = new Map<string, ComponentType<ComponentEditorProps>>();

/**
 * Vite의 import.meta.glob을 사용하여 모든 에디터를 사전 로드
 * 이 방식은 빌드 타임에 모든 가능한 import를 정적으로 분석할 수 있게 함
 */
const editorModules = import.meta.glob<{
  default: ComponentType<ComponentEditorProps>;
}>("../../panels/properties/editors/*.tsx");

// 디버깅: 등록된 모든 에디터 경로 출력
console.log('[Registry] Available editor paths:', Object.keys(editorModules));

/**
 * 에디터 모듈 동적 import
 */
async function importEditor(
  editorName: string
): Promise<ComponentType<ComponentEditorProps> | null> {
  try {
    // editorName에 해당하는 모듈 경로 생성
    const modulePath = `../../panels/properties/editors/${editorName}.tsx`;

    console.log('[importEditor] Looking for:', {
      editorName,
      modulePath,
      hasLoader: !!editorModules[modulePath],
    });

    // import.meta.glob 결과에서 해당 경로의 모듈 찾기
    const moduleLoader = editorModules[modulePath];

    if (!moduleLoader) {
      console.warn(`[importEditor] Editor not found in glob: ${editorName}`, {
        requestedPath: modulePath,
        availablePaths: Object.keys(editorModules).slice(0, 5), // 처음 5개만 출력
        totalCount: Object.keys(editorModules).length,
      });
      return null;
    }

    // 모듈 로드
    console.log('[importEditor] Loading module:', modulePath);
    const module = await moduleLoader();

    // default export 우선, 없으면 named export (editorName) 시도
    const editor = module.default || (module as any)[editorName];

    console.log('[importEditor] Module loaded:', {
      editorName,
      hasDefault: !!module.default,
      hasNamedExport: !!(module as any)[editorName],
      resolved: !!editor,
    });

    return editor || null;
  } catch (error) {
    console.warn(`[importEditor] Failed to load editor: ${editorName}`, error);
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
