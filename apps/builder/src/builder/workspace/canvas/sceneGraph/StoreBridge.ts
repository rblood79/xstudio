/**
 * StoreBridge (ADR-100)
 *
 * Zustand store → SceneGraph 동기화.
 * React 렌더 사이클을 완전 우회하여 store 변경을 RAF에서 일괄 처리.
 */

import { SceneGraph } from "./SceneGraph";

interface StoreElement {
  id: string;
  tag: string;
  parent_id: string | null;
  properties: Record<string, unknown>;
}

interface StoreSnapshot {
  elementsMap: Map<string, StoreElement>;
  childrenMap: Map<string, string[]>;
}

type ChangeType = "create" | "update" | "remove" | "reorder";

interface StoreChange {
  type: ChangeType;
  id: string;
  data?: Record<string, unknown>;
}

export class StoreBridge {
  private graph: SceneGraph;
  private prevElementIds = new Set<string>();
  private changeQueue: StoreChange[] = [];
  private rafId: number | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(graph: SceneGraph) {
    this.graph = graph;
  }

  /**
   * Subscribe to a Zustand store.
   * @param subscribe Store's subscribe function
   * @param getState Store's getState function
   */
  connect(
    subscribe: (listener: () => void) => () => void,
    getState: () => StoreSnapshot,
  ): void {
    // Initial sync
    this.fullSync(getState());

    // Subscribe to subsequent changes
    this.unsubscribe = subscribe(() => {
      this.diffAndQueue(getState());
      this.scheduleFlush();
    });
  }

  /**
   * Full sync — used for initial load and page switch.
   */
  fullSync(state: StoreSnapshot): void {
    this.graph.clear();
    this.prevElementIds.clear();

    for (const [id, element] of state.elementsMap) {
      const style =
        (element.properties?.style as Record<string, unknown>) ?? {};
      this.graph.createNode(id, element.tag, element.parent_id, style);
      this.prevElementIds.add(id);
    }
  }

  /**
   * Diff current state against previous snapshot and queue changes.
   */
  private diffAndQueue(state: StoreSnapshot): void {
    const currentIds = new Set(state.elementsMap.keys());

    // Created elements
    for (const id of currentIds) {
      if (!this.prevElementIds.has(id)) {
        const el = state.elementsMap.get(id)!;
        this.changeQueue.push({
          type: "create",
          id,
          data: {
            tag: el.tag,
            parentId: el.parent_id,
            style: (el.properties?.style as Record<string, unknown>) ?? {},
          },
        });
      }
    }

    // Removed elements
    for (const id of this.prevElementIds) {
      if (!currentIds.has(id)) {
        this.changeQueue.push({ type: "remove", id });
      }
    }

    // Updated elements (style changes)
    for (const id of currentIds) {
      if (this.prevElementIds.has(id)) {
        const el = state.elementsMap.get(id)!;
        this.changeQueue.push({
          type: "update",
          id,
          data: (el.properties?.style as Record<string, unknown>) ?? {},
        });
      }
    }

    this.prevElementIds = currentIds;
  }

  private scheduleFlush(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.flush();
      this.rafId = null;
    });
  }

  /**
   * Process all queued changes. Called from RAF or manually in tests.
   */
  flush(): void {
    if (this.changeQueue.length === 0) return;

    for (const change of this.changeQueue) {
      switch (change.type) {
        case "create": {
          const { tag, parentId, style } = change.data as {
            tag: string;
            parentId: string | null;
            style: Record<string, unknown>;
          };
          this.graph.createNode(change.id, tag, parentId, style);
          break;
        }
        case "update":
          this.graph.updateStyle(change.id, change.data ?? {});
          break;
        case "remove":
          this.graph.removeNode(change.id);
          break;
        case "reorder":
          // TODO: moveNode based on childrenMap changes
          break;
      }
    }

    this.changeQueue.length = 0;
  }

  /**
   * Get pending change count (for debugging/monitoring).
   */
  get pendingChanges(): number {
    return this.changeQueue.length;
  }

  /**
   * Disconnect from store and cancel pending RAF.
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.changeQueue.length = 0;
  }
}
