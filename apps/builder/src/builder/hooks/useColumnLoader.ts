import { useAsyncList } from "react-stately";
import type { AsyncListLoadOptions, ColumnListItem } from "../../types/builder/stately.types";

/**
 * useColumnLoader - API 컬럼 로딩 자동화
 *
 * useAsyncList를 사용하여 API 호출, 컬럼 감지, 에러 처리를 자동화합니다.
 *
 * @example
 * ```tsx
 * const columnLoader = useColumnLoader(async ({ signal }) => {
 *   const data = await fetchAPI(endpoint, { signal });
 *   const columns = detectColumnsFromData(data);
 *   return Object.entries(columns).map(([key, def]) => ({
 *     id: key,
 *     key,
 *     label: def.label,
 *     type: def.type,
 *   }));
 * });
 *
 * // Loading state
 * if (columnLoader.isLoading) return <Spinner />;
 *
 * // Error state
 * if (columnLoader.error) return <Error message={columnLoader.error.message} />;
 *
 * // Success state
 * return <ColumnList columns={columnLoader.items} />;
 * ```
 */
export function useColumnLoader(
  loadFn: (options: AsyncListLoadOptions) => Promise<ColumnListItem[]>
) {
  const list = useAsyncList<ColumnListItem>({
    async load({ signal }: AsyncListLoadOptions) {
      try {
        const items = await loadFn({ signal });
        return { items };
      } catch (error) {
        // AbortError는 무시 (사용자가 요청을 취소한 경우)
        if ((error as Error).name === "AbortError") {
          console.log("🚫 API 요청이 취소되었습니다");
          return { items: [] };
        }
        // 다른 에러는 그대로 throw하여 error state에 저장
        throw error;
      }
    },
    getKey: (item) => item.id,
  });

  return {
    /**
     * 로딩된 컬럼 목록
     */
    items: list.items,

    /**
     * 로딩 중 여부
     */
    isLoading: list.isLoading,

    /**
     * 에러 발생 시 Error 객체
     */
    error: list.error,

    /**
     * 컬럼 데이터를 다시 로드합니다
     */
    reload: list.reload,

    // setLoadingState is not available on AsyncListData
  };
}

/**
 * useColumnLoader의 반환 타입
 */
export type UseColumnLoaderResult = ReturnType<typeof useColumnLoader>;
