import { useMemo } from "react";
import { getComponentMeta } from "../../shared/components/metadata";

/**
 * 컴포넌트 메타데이터 조회 Hook
 * @since Phase 2 - 승격 from inspector/hooks (2025-12-30)
 */
export function useComponentMeta(type: string | undefined) {
  return useMemo(() => {
    if (!type) return null;
    return getComponentMeta(type);
  }, [type]);
}
