export const enum DirtyFlags {
  NONE = 0,
  LAYOUT = 1 << 0,
  VISUAL = 1 << 1,
  CHILDREN = 1 << 2,
  TRANSFORM = 1 << 3,
  SUBTREE = 1 << 4,
}

export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  tag: string;
  parentId: string | null;
  children: string[];
  style: Record<string, unknown>;
  layout: ComputedLayout;
  dirty: DirtyFlags;
  visible: boolean;
  interactive: boolean;
  cursor: string;
  stackingOrder: number;
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
