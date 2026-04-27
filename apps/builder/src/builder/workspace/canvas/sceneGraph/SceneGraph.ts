import { DirtyFlags, type SceneNode, type ComputedLayout } from "./types";

export class SceneGraph {
  private nodes = new Map<string, SceneNode>();
  private dirtySet = new Set<string>();

  createNode(
    id: string,
    type: string,
    parentId: string | null,
    style: Record<string, unknown> = {},
  ): SceneNode {
    const node: SceneNode = {
      id,
      type,
      parentId,
      children: [],
      style,
      layout: { x: 0, y: 0, width: 0, height: 0 },
      dirty: DirtyFlags.LAYOUT | DirtyFlags.VISUAL,
      visible: true,
      interactive: true,
      cursor: "default",
      stackingOrder: 0,
    };
    this.nodes.set(id, node);
    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) parent.children.push(id);
    }
    this.dirtySet.add(id);
    return node;
  }

  updateStyle(id: string, changes: Record<string, unknown>): void {
    const node = this.nodes.get(id);
    if (!node) return;
    Object.assign(node.style, changes);
    node.dirty |= DirtyFlags.LAYOUT | DirtyFlags.VISUAL;
    this.dirtySet.add(id);
  }

  updateLayout(id: string, layout: ComputedLayout): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.layout = layout;
    node.dirty |= DirtyFlags.VISUAL;
    this.dirtySet.add(id);
  }

  moveNode(id: string, newParentId: string, index: number): void {
    const node = this.nodes.get(id);
    if (!node) return;
    // Remove from old parent
    if (node.parentId) {
      const oldParent = this.nodes.get(node.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter((cid) => cid !== id);
        oldParent.dirty |= DirtyFlags.CHILDREN;
        this.dirtySet.add(oldParent.id);
      }
    }
    // Add to new parent
    node.parentId = newParentId;
    const newParent = this.nodes.get(newParentId);
    if (newParent) {
      newParent.children.splice(index, 0, id);
      newParent.dirty |= DirtyFlags.CHILDREN;
      this.dirtySet.add(newParent.id);
    }
    node.dirty |= DirtyFlags.LAYOUT;
    this.dirtySet.add(id);
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    // Remove from parent
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter((cid) => cid !== id);
        parent.dirty |= DirtyFlags.CHILDREN;
        this.dirtySet.add(parent.id);
      }
    }
    // Remove children recursively
    for (const childId of [...node.children]) {
      this.removeNode(childId);
    }
    this.nodes.delete(id);
    this.dirtySet.delete(id);
  }

  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  getChildren(id: string): SceneNode[] {
    const node = this.nodes.get(id);
    if (!node) return [];
    return node.children
      .map((cid) => this.nodes.get(cid))
      .filter(Boolean) as SceneNode[];
  }

  markDirty(id: string, flags: DirtyFlags): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.dirty |= flags;
    this.dirtySet.add(id);
  }

  collectDirtyNodes(): string[] {
    return [...this.dirtySet];
  }

  clearDirty(): void {
    for (const id of this.dirtySet) {
      const node = this.nodes.get(id);
      if (node) node.dirty = DirtyFlags.NONE;
    }
    this.dirtySet.clear();
  }

  getVisibleNodes(viewport: ComputedLayout): SceneNode[] {
    const result: SceneNode[] = [];
    for (const node of this.nodes.values()) {
      if (!node.visible) continue;
      const { x, y, width, height } = node.layout;
      // AABB intersection with viewport
      if (
        x + width >= viewport.x &&
        x <= viewport.x + viewport.width &&
        y + height >= viewport.y &&
        y <= viewport.y + viewport.height
      ) {
        result.push(node);
      }
    }
    return result;
  }

  get size(): number {
    return this.nodes.size;
  }

  get dirtyCount(): number {
    return this.dirtySet.size;
  }

  clear(): void {
    this.nodes.clear();
    this.dirtySet.clear();
  }
}
