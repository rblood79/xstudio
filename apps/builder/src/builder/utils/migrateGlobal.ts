/**
 * Dev-time migration helpers exposed on `window.__composition_MIGRATE__`.
 *
 * Side-effect import — attaches global handlers for DevTools-driven
 * one-shot data repair. Dev builds only; production no-op.
 *
 * Handlers:
 * - `fixAllDuplicateOrderNums()` — scans every page in the current in-memory
 *   store for duplicate / out-of-sequence order_num and rewrites memory +
 *   IndexedDB + Supabase in a single pass (A'' from ADR-069 follow-up).
 */

import { useStore } from "../stores";
import { migrateDuplicateOrderNums } from "../stores/utils/elementReorder";

type MigrateReport = Awaited<ReturnType<typeof migrateDuplicateOrderNums>>;

async function fixAllDuplicateOrderNums(): Promise<MigrateReport> {
  const { elements, batchUpdateElementOrders } = useStore.getState();
  const report = await migrateDuplicateOrderNums(
    elements,
    batchUpdateElementOrders,
  );
  console.log("[migrate] fixAllDuplicateOrderNums", report);
  return report;
}

if (typeof window !== "undefined") {
  const w = window as unknown as {
    __composition_MIGRATE__?: {
      fixAllDuplicateOrderNums: typeof fixAllDuplicateOrderNums;
    };
  };
  w.__composition_MIGRATE__ = {
    fixAllDuplicateOrderNums,
  };
}
