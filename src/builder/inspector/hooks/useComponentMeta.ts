import { useMemo } from "react";
import { getComponentMeta } from "../../components/metadata";

/**
 * 컴포넌트 메타데이터 조회 Hook
 */
export function useComponentMeta(type: string | undefined) {
  return useMemo(() => {
    if (!type) return null;
    return getComponentMeta(type);
  }, [type]);
}
