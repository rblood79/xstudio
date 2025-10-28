/**
 * ResizablePanel Component
 *
 * Provides resizable panel functionality similar to react-resizable-panels
 * but implemented using React Aria's useMove hook for accessibility
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useMove } from 'react-aria';
import './styles/ResizablePanel.css';

/**
 * Context for managing panel sizes within a PanelGroup
 */
interface PanelContextValue {
  direction: 'horizontal' | 'vertical';
  registerPanel: (id: string, defaultSize: number, minSize?: number, maxSize?: number) => void;
  unregisterPanel: (id: string) => void;
  getPanelSize: (id: string) => number;
  resizePanels: (beforeId: string, afterId: string, delta: number) => void;
}

const PanelContext = createContext<PanelContextValue | null>(null);

/**
 * Hook to access panel context
 */
function usePanelContext() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('Panel components must be used within a PanelGroup');
  }
  return context;
}

/**
 * PanelGroup - Container for resizable panels
 */
export interface PanelGroupProps {
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Children (Panel and PanelResizeHandle components) */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

export function PanelGroup({
  direction = 'horizontal',
  children,
  className = '',
  style,
}: PanelGroupProps) {
  const [panelSizes, setPanelSizes] = useState<Map<string, { size: number; minSize: number; maxSize: number }>>(new Map());

  const registerPanel = useCallback((id: string, defaultSize: number, minSize = 10, maxSize = 90) => {
    setPanelSizes(prev => {
      const next = new Map(prev);
      next.set(id, { size: defaultSize, minSize, maxSize });
      return next;
    });
  }, []);

  const unregisterPanel = useCallback((id: string) => {
    setPanelSizes(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getPanelSize = useCallback((id: string) => {
    return panelSizes.get(id)?.size || 50;
  }, [panelSizes]);

  const resizePanels = useCallback((beforeId: string, afterId: string, delta: number) => {
    setPanelSizes(prev => {
      const next = new Map(prev);
      const before = prev.get(beforeId);
      const after = prev.get(afterId);

      if (!before || !after) return prev;

      // Calculate new sizes
      let newBeforeSize = before.size + delta;
      let newAfterSize = after.size - delta;

      // Apply constraints
      newBeforeSize = Math.max(before.minSize, Math.min(before.maxSize, newBeforeSize));
      newAfterSize = Math.max(after.minSize, Math.min(after.maxSize, newAfterSize));

      // Ensure total size remains 100%
      const totalSize = newBeforeSize + newAfterSize;
      if (totalSize !== before.size + after.size) {
        const ratio = (before.size + after.size) / totalSize;
        newBeforeSize *= ratio;
        newAfterSize *= ratio;
      }

      next.set(beforeId, { ...before, size: newBeforeSize });
      next.set(afterId, { ...after, size: newAfterSize });

      return next;
    });
  }, []);

  const contextValue: PanelContextValue = {
    direction,
    registerPanel,
    unregisterPanel,
    getPanelSize,
    resizePanels,
  };

  return (
    <PanelContext.Provider value={contextValue}>
      <div
        className={`react-aria-PanelGroup ${className}`}
        data-direction={direction}
        style={style}
      >
        {children}
      </div>
    </PanelContext.Provider>
  );
}

/**
 * Panel - Resizable panel component
 */
export interface PanelProps {
  /** Unique identifier for the panel */
  id: string;
  /** Default size as percentage (0-100) */
  defaultSize?: number;
  /** Minimum size as percentage */
  minSize?: number;
  /** Maximum size as percentage */
  maxSize?: number;
  /** Children content */
  children?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

export function Panel({
  id,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  children,
  className = '',
  style,
}: PanelProps) {
  const { direction, registerPanel, unregisterPanel, getPanelSize } = usePanelContext();

  useEffect(() => {
    registerPanel(id, defaultSize, minSize, maxSize);
    return () => unregisterPanel(id);
  }, [id, defaultSize, minSize, maxSize, registerPanel, unregisterPanel]);

  const size = getPanelSize(id);
  const flexBasis = `${size}%`;

  return (
    <div
      className={`react-aria-Panel ${className}`}
      data-panel-id={id}
      data-direction={direction}
      style={{
        ...style,
        flexBasis,
        flexGrow: 0,
        flexShrink: 0,
        overflow: 'auto',
      }}
    >
      {children}
    </div>
  );
}

/**
 * PanelResizeHandle - Draggable separator for resizing panels
 */
export interface PanelResizeHandleProps {
  /** Additional CSS class */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

export function PanelResizeHandle({
  className = '',
  style,
}: PanelResizeHandleProps) {
  const { direction, resizePanels } = usePanelContext();
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Find adjacent panels
  const getAdjacentPanels = useCallback(() => {
    if (!ref.current?.parentElement) return null;

    const parent = ref.current.parentElement;
    containerRef.current = parent;

    const children = Array.from(parent.children);
    const handleIndex = children.indexOf(ref.current);

    // Find previous panel
    let beforePanel: HTMLElement | null = null;
    for (let i = handleIndex - 1; i >= 0; i--) {
      const element = children[i] as HTMLElement;
      if (element.dataset.panelId) {
        beforePanel = element;
        break;
      }
    }

    // Find next panel
    let afterPanel: HTMLElement | null = null;
    for (let i = handleIndex + 1; i < children.length; i++) {
      const element = children[i] as HTMLElement;
      if (element.dataset.panelId) {
        afterPanel = element;
        break;
      }
    }

    return { beforePanel, afterPanel };
  }, []);

  const { moveProps } = useMove({
    onMoveStart: () => {
      setIsDragging(true);
    },
    onMove: (e) => {
      const adjacent = getAdjacentPanels();
      if (!adjacent?.beforePanel || !adjacent?.afterPanel || !containerRef.current) return;

      const beforeId = adjacent.beforePanel.dataset.panelId!;
      const afterId = adjacent.afterPanel.dataset.panelId!;

      // Calculate delta as percentage of container size
      const containerSize = direction === 'horizontal'
        ? containerRef.current.offsetWidth
        : containerRef.current.offsetHeight;

      const delta = direction === 'horizontal'
        ? (e.deltaX / containerSize) * 100
        : (e.deltaY / containerSize) * 100;

      resizePanels(beforeId, afterId, delta);
    },
    onMoveEnd: () => {
      setIsDragging(false);
    },
  });

  return (
    <div
      ref={ref}
      {...moveProps}
      className={`react-aria-PanelResizeHandle ${className}`}
      data-direction={direction}
      data-dragging={isDragging}
      style={style}
      role="separator"
      aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
      tabIndex={0}
    />
  );
}
