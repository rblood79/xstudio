/**
 * Selection Memory Utilities
 * Phase 9: Advanced Features - Selection Memory
 *
 * Remember and restore previous selections
 */

import type { Element } from "../../types/core/store.types";

/**
 * Selection history entry
 */
export interface SelectionHistoryEntry {
  /** Unique ID for this history entry */
  id: string;
  /** Element IDs in this selection */
  elementIds: string[];
  /** Timestamp when selected */
  timestamp: number;
  /** Human-readable label */
  label: string;
  /** Page ID where selection occurred */
  pageId: string;
}

/**
 * Maximum number of history entries to keep
 */
const MAX_HISTORY_SIZE = 5;

/**
 * Selection history store (in-memory)
 */
class SelectionMemoryStore {
  private history: SelectionHistoryEntry[] = [];
  private listeners: Set<() => void> = new Set();

  /**
   * Add a selection to history
   */
  addSelection(
    elementIds: string[],
    elements: Element[],
    pageId: string
  ): SelectionHistoryEntry | null {
    if (elementIds.length === 0) return null;

    // Create label from selected elements
    const label = this.createLabel(elementIds, elements);

    // Create history entry
    const entry: SelectionHistoryEntry = {
      id: `selection-${Date.now()}`,
      elementIds: [...elementIds],
      timestamp: Date.now(),
      label,
      pageId,
    };

    // Add to beginning of history
    this.history.unshift(entry);

    // Keep only last MAX_HISTORY_SIZE entries
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, MAX_HISTORY_SIZE);
    }

    // Notify listeners
    this.notifyListeners();

    console.log(`[SelectionMemory] Added to history: ${label} (${elementIds.length} elements)`);

    return entry;
  }

  /**
   * Get all history entries
   */
  getHistory(): SelectionHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get a specific history entry
   */
  getEntry(entryId: string): SelectionHistoryEntry | null {
    return this.history.find((entry) => entry.id === entryId) || null;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.notifyListeners();
    console.log('[SelectionMemory] History cleared');
  }

  /**
   * Remove a specific history entry
   */
  removeEntry(entryId: string): void {
    this.history = this.history.filter((entry) => entry.id !== entryId);
    this.notifyListeners();
    console.log(`[SelectionMemory] Removed entry: ${entryId}`);
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Create human-readable label from element IDs
   */
  private createLabel(elementIds: string[], elements: Element[]): string {
    if (elementIds.length === 1) {
      const element = elements.find((el) => el.id === elementIds[0]);
      return element ? element.tag : "1 element";
    }

    // Count elements by tag
    const tagCounts = new Map<string, number>();
    elementIds.forEach((id) => {
      const element = elements.find((el) => el.id === id);
      if (element) {
        const count = tagCounts.get(element.tag) || 0;
        tagCounts.set(element.tag, count + 1);
      }
    });

    // Create label from most common tags
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (sortedTags.length === 1) {
      const [tag, count] = sortedTags[0];
      return `${count} ${tag}${count > 1 ? "s" : ""}`;
    } else if (sortedTags.length === 2) {
      const [tag1, count1] = sortedTags[0];
      const [tag2, count2] = sortedTags[1];
      return `${count1} ${tag1}${count1 > 1 ? "s" : ""}, ${count2} ${tag2}${count2 > 1 ? "s" : ""}`;
    }

    return `${elementIds.length} elements`;
  }
}

/**
 * Global selection memory store instance
 */
export const selectionMemory = new SelectionMemoryStore();

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (days < 7) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}
