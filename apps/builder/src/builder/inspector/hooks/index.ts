// Re-export from @/builder/hooks (Phase 2 승격)
export { useComponentMeta } from "../../hooks";

// 🚀 Single Source of Truth: useInspectorState, useSyncWithBuilder 제거
// Builder Store (useStore, useSelectedElementData, useInspectorActions)를 직접 사용
