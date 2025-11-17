/**
 * Database Adapter Interface
 *
 * IndexedDB, PGlite, Supabase 등 다양한 데이터베이스를
 * 동일한 인터페이스로 사용하기 위한 추상화 레이어
 */

import type { Element, Page } from '../../types/core/store.types';
import type { DesignToken } from '../../types/theme';

// === Project Types ===

export interface Project {
  id: string;
  name: string;
  created_by?: string;
  domain?: string;
  created_at?: string;
  updated_at?: string;
}

// === History Types ===

export interface HistoryEntry {
  id: string;
  page_id: string;
  type: 'add' | 'update' | 'remove' | 'move' | 'batch' | 'group' | 'ungroup';
  element_id: string;
  element_ids?: string[];
  data: {
    element?: Element;
    prevElement?: Element;
    elements?: Element[];
    prevElements?: Element[];
    batchUpdates?: Array<{
      elementId: string;
      prevProps: Record<string, unknown>;
      newProps: Record<string, unknown>;
    }>;
    groupData?: {
      groupId: string;
      childIds: string[];
    };
  };
  created_at: string;
}

// === Sync Metadata Types ===

export interface SyncMetadata {
  project_id: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  local_updated_at: string;
  cloud_updated_at: string | null;
  sync_status: 'local-only' | 'synced' | 'conflict' | 'pending';
}

// === Database Adapter Interface ===

export interface DatabaseAdapter {
  // Initialize database
  init(): Promise<void>;

  // Close database
  close(): Promise<void>;

  // Projects
  projects: {
    insert(project: Project): Promise<Project>;
    update(id: string, data: Partial<Project>): Promise<Project>;
    delete(id: string): Promise<void>;
    getById(id: string): Promise<Project | null>;
    getAll(): Promise<Project[]>;
  };

  // Pages
  pages: {
    insert(page: Page): Promise<Page>;
    insertMany(pages: Page[]): Promise<Page[]>;
    update(id: string, data: Partial<Page>): Promise<Page>;
    delete(id: string): Promise<void>;
    getById(id: string): Promise<Page | null>;
    getByProject(projectId: string): Promise<Page[]>;
    getAll(): Promise<Page[]>;
  };

  // Elements (가장 중요!)
  elements: {
    insert(element: Element): Promise<Element>;
    insertMany(elements: Element[]): Promise<Element[]>;
    update(id: string, data: Partial<Element>): Promise<Element>;
    updateMany(updates: Array<{ id: string; data: Partial<Element> }>): Promise<Element[]>;
    delete(id: string): Promise<void>;
    deleteMany(ids: string[]): Promise<void>;
    getById(id: string): Promise<Element | null>;
    getByPage(pageId: string): Promise<Element[]>;
    getChildren(parentId: string): Promise<Element[]>;
    getAll(): Promise<Element[]>;
  };

  // Design Tokens
  designTokens: {
    insert(token: DesignToken): Promise<DesignToken>;
    insertMany(tokens: DesignToken[]): Promise<DesignToken[]>;
    update(id: string, data: Partial<DesignToken>): Promise<DesignToken>;
    delete(id: string): Promise<void>;
    getByProject(projectId: string): Promise<DesignToken[]>;
    getAll(): Promise<DesignToken[]>;
  };

  // History
  history: {
    insert(entry: HistoryEntry): Promise<HistoryEntry>;
    getByPage(pageId: string, limit?: number): Promise<HistoryEntry[]>;
    deleteOldEntries(pageId: string, keepCount: number): Promise<void>;
    clear(pageId: string): Promise<void>;
  };

  // Sync Metadata
  metadata: {
    get(): Promise<SyncMetadata | null>;
    set(data: SyncMetadata): Promise<void>;
    update(data: Partial<SyncMetadata>): Promise<void>;
  };

  // Batch Operations
  batch: {
    // Export all data for sync
    export(): Promise<{
      project: Project | null;
      pages: Page[];
      elements: Element[];
      designTokens: DesignToken[];
      metadata: SyncMetadata | null;
    }>;

    // Import data from sync
    import(data: {
      project?: Project;
      pages?: Page[];
      elements?: Element[];
      designTokens?: DesignToken[];
      metadata?: SyncMetadata;
    }): Promise<void>;

    // Clear all data
    clear(): Promise<void>;
  };
}

// === Helper Types ===

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface BulkInsertResult {
  inserted: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
