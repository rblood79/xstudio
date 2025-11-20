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

/**
 * 에디터 모듈 동적 import
 */
async function importEditor(
  editorName: string
): Promise<ComponentType<ComponentEditorProps> | null> {
  try {
    // editorName에 해당하는 모듈 경로 생성
    const modulePath = `../../panels/properties/editors/${editorName}.tsx`;

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
    //console.log('[importEditor] Loading module:', modulePath);
    const module = await moduleLoader();

    // default export 우선, 없으면 named export (editorName) 시도
    const editor =
      module.default ||
      (
        module as unknown as Record<string, ComponentType<ComponentEditorProps>>
      )[editorName];

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
  // 캐시 확인
  if (editorCache.has(type)) {
    return editorCache.get(type)!;
  }

  // 메타데이터에서 에디터 정보 확인
  const metadata = componentMetadata.find((c) => c.type === type);

  if (!metadata?.inspector.hasCustomEditor || !metadata.inspector.editorName) {
    return null;
  }

  // 동적 import
  const editor = await importEditor(metadata.inspector.editorName);

  if (editor) {
    editorCache.set(type, editor);
  } else {
    console.warn(
      "[getEditor] Failed to import editor:",
      metadata.inspector.editorName
    );
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
