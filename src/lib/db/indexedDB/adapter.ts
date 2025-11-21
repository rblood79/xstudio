/**
 * IndexedDB Adapter Implementation
 *
 * 브라우저의 IndexedDB를 사용한 로컬 데이터베이스 구현
 * - 빠른 로컬 저장 (1-5ms)
 * - 오프라인 지원
 * - Supabase와 동일한 인터페이스
 */

import type {
  DatabaseAdapter,
  Project,
  HistoryEntry,
  SyncMetadata,
} from '../types';
import type { Element, Page } from '../../../types/core/store.types';
import type { DesignToken } from '../../../types/theme';
import { LRUCache } from './LRUCache';

const DB_NAME = 'xstudio';
const DB_VERSION = 5; // ✅ 버전 5: elements.layout_id 인덱스 추가

export class IndexedDBAdapter implements DatabaseAdapter {
  private db: IDBDatabase | null = null;

  // LRU Caches for frequently accessed data
  private elementCache = new LRUCache<Element>(1000);
  private pageCache = new LRUCache<Page>(100);
  private projectCache = new LRUCache<Project>(10);

  // === Database Lifecycle ===

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
          console.log('[IndexedDB] Created store: projects');
        }

        // Pages store
        if (!db.objectStoreNames.contains('pages')) {
          const pagesStore = db.createObjectStore('pages', { keyPath: 'id' });
          pagesStore.createIndex('project_id', 'project_id', { unique: false });
          pagesStore.createIndex('order_num', 'order_num', { unique: false });
          console.log('[IndexedDB] Created store: pages');
        }

        // Elements store (가장 중요!)
        if (!db.objectStoreNames.contains('elements')) {
          const elementsStore = db.createObjectStore('elements', { keyPath: 'id' });
          elementsStore.createIndex('page_id', 'page_id', { unique: false });
          elementsStore.createIndex('parent_id', 'parent_id', { unique: false });
          elementsStore.createIndex('order_num', 'order_num', { unique: false });
          elementsStore.createIndex('layout_id', 'layout_id', { unique: false });
          console.log('[IndexedDB] Created store: elements');
        } else {
          // ✅ 버전 5: 기존 스토어에 layout_id 인덱스 추가
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const elementsStore = transaction.objectStore('elements');
            if (!elementsStore.indexNames.contains('layout_id')) {
              elementsStore.createIndex('layout_id', 'layout_id', { unique: false });
              console.log('[IndexedDB] Added index: elements.layout_id');
            }
          }
        }

        // Design tokens store
        if (!db.objectStoreNames.contains('design_tokens')) {
          const tokensStore = db.createObjectStore('design_tokens', { keyPath: 'id' });
          tokensStore.createIndex('project_id', 'project_id', { unique: false });
          tokensStore.createIndex('theme_id', 'theme_id', { unique: false });
          console.log('[IndexedDB] Created store: design_tokens');
        } else {
          // ✅ 버전 3: 기존 스토어에 theme_id 인덱스 추가
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const tokensStore = transaction.objectStore('design_tokens');
            if (!tokensStore.indexNames.contains('theme_id')) {
              tokensStore.createIndex('theme_id', 'theme_id', { unique: false });
              console.log('[IndexedDB] Added index: design_tokens.theme_id');
            }
          }
        }

        // History store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('page_id', 'page_id', { unique: false });
          historyStore.createIndex('created_at', 'created_at', { unique: false });
          console.log('[IndexedDB] Created store: history');
        }

        // Design themes store
        if (!db.objectStoreNames.contains('design_themes')) {
          const themesStore = db.createObjectStore('design_themes', { keyPath: 'id' });
          themesStore.createIndex('project_id', 'project_id', { unique: false });
          themesStore.createIndex('status', 'status', { unique: false });
          console.log('[IndexedDB] Created store: design_themes');
        }

        // Metadata store (sync 상태 저장)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'project_id' });
          console.log('[IndexedDB] Created store: metadata');
        }

        // ✅ 버전 4: Layouts store (Layout/Slot System)
        if (!db.objectStoreNames.contains('layouts')) {
          const layoutsStore = db.createObjectStore('layouts', { keyPath: 'id' });
          layoutsStore.createIndex('project_id', 'project_id', { unique: false });
          layoutsStore.createIndex('name', 'name', { unique: false });
          console.log('[IndexedDB] Created store: layouts');
        }

        console.log('[IndexedDB] Schema upgrade completed');
      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;

      // Clear all caches
      this.elementCache.clear();
      this.pageCache.clear();
      this.projectCache.clear();

      console.log('[IndexedDB] Database closed and caches cleared');
    }
  }

  // === Helper Methods ===

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  private async getFromStore<T>(storeName: string, id: string): Promise<T | null> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async putToStore<T>(storeName: string, data: T): Promise<T> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromStore(storeName: string, id: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    value: string
  ): Promise<T[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // === Projects ===

  projects = {
    insert: async (project: Project): Promise<Project> => {
      const result = await this.putToStore('projects', project);
      this.projectCache.set(project.id, result);
      return result;
    },

    update: async (id: string, data: Partial<Project>): Promise<Project> => {
      let existing = this.projectCache.get(id);

      if (!existing) {
        existing = await this.getFromStore<Project>('projects', id);
      }

      if (!existing) {
        throw new Error(`Project not found: ${id}`);
      }

      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      const result = await this.putToStore('projects', updated);
      this.projectCache.set(id, result);
      return result;
    },

    delete: async (id: string): Promise<void> => {
      await this.deleteFromStore('projects', id);
      this.projectCache.delete(id);
    },

    getById: async (id: string): Promise<Project | null> => {
      const cached = this.projectCache.get(id);

      if (cached) {
        return cached;
      }

      const project = await this.getFromStore<Project>('projects', id);

      if (project) {
        this.projectCache.set(id, project);
      }

      return project;
    },

    getAll: async (): Promise<Project[]> => {
      return this.getAllFromStore<Project>('projects');
    },
  };

  // === Pages ===

  pages = {
    insert: async (page: Page): Promise<Page> => {
      const result = await this.putToStore('pages', page);
      this.pageCache.set(page.id, result);
      return result;
    },

    insertMany: async (pages: Page[]): Promise<Page[]> => {
      if (pages.length === 0) {
        return [];
      }

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('pages', 'readwrite');
        const store = tx.objectStore('pages');

        // Queue all operations - single transaction commit
        pages.forEach((page) => {
          store.put(page);
        });

        // Resolve when entire transaction completes
        tx.oncomplete = () => {
          // Cache all inserted pages
          this.pageCache.setMany(
            pages.map((page) => ({ key: page.id, value: page }))
          );

          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [IndexedDB] pages.insertMany completed: ${pages.length} pages (cached)`);
          }
          resolve(pages);
        };

        tx.onerror = () => {
          console.error('❌ [IndexedDB] pages.insertMany transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    },

    update: async (id: string, data: Partial<Page>): Promise<Page> => {
      let existing = this.pageCache.get(id);

      if (!existing) {
        existing = await this.getFromStore<Page>('pages', id);
      }

      if (!existing) {
        throw new Error(`Page not found: ${id}`);
      }

      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      const result = await this.putToStore('pages', updated);
      this.pageCache.set(id, result);
      return result;
    },

    delete: async (id: string): Promise<void> => {
      await this.deleteFromStore('pages', id);
      this.pageCache.delete(id);
    },

    getById: async (id: string): Promise<Page | null> => {
      const cached = this.pageCache.get(id);

      if (cached) {
        return cached;
      }

      const page = await this.getFromStore<Page>('pages', id);

      if (page) {
        this.pageCache.set(id, page);
      }

      return page;
    },

    getByProject: async (projectId: string): Promise<Page[]> => {
      return this.getAllByIndex<Page>('pages', 'project_id', projectId);
    },

    getAll: async (): Promise<Page[]> => {
      return this.getAllFromStore<Page>('pages');
    },
  };

  // === Elements (가장 중요!) ===

  elements = {
    insert: async (element: Element): Promise<Element> => {
      const result = await this.putToStore('elements', element);
      // Cache the inserted element
      this.elementCache.set(element.id, result);
      return result;
    },

    insertMany: async (elements: Element[]): Promise<Element[]> => {
      if (elements.length === 0) {
        return [];
      }

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('elements', 'readwrite');
        const store = tx.objectStore('elements');

        // Queue all operations - single transaction commit
        elements.forEach((element) => {
          store.put(element);
        });

        // Resolve when entire transaction completes
        tx.oncomplete = () => {
          // Cache all inserted elements
          this.elementCache.setMany(
            elements.map((el) => ({ key: el.id, value: el }))
          );

          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [IndexedDB] insertMany completed: ${elements.length} elements (cached)`);
          }
          resolve(elements);
        };

        tx.onerror = () => {
          console.error('❌ [IndexedDB] insertMany transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    },

    update: async (id: string, data: Partial<Element>): Promise<Element> => {
      // Try cache first
      let existing = this.elementCache.get(id);

      if (!existing) {
        // Cache miss - read from IndexedDB
        existing = await this.getFromStore<Element>('elements', id);
      }

      if (!existing) {
        throw new Error(`Element not found: ${id}`);
      }

      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      const result = await this.putToStore('elements', updated);

      // Update cache
      this.elementCache.set(id, result);

      return result;
    },

    updateMany: async (
      updates: Array<{ id: string; data: Partial<Element> }>
    ): Promise<Element[]> => {
      if (updates.length === 0) {
        return [];
      }

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('elements', 'readwrite');
        const store = tx.objectStore('elements');

        const results: Element[] = [];

        // Queue all get+put operations
        updates.forEach(({ id, data }) => {
          const getRequest = store.get(id);

          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (existing) {
              const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
              store.put(updated);
              results.push(updated);
            }
          };
        });

        // Resolve when entire transaction completes
        tx.oncomplete = () => {
          // Update cache with all updated elements
          this.elementCache.setMany(
            results.map((el) => ({ key: el.id, value: el }))
          );

          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [IndexedDB] updateMany completed: ${results.length} elements (cached)`);
          }
          resolve(results);
        };

        tx.onerror = () => {
          console.error('❌ [IndexedDB] updateMany transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    },

    delete: async (id: string): Promise<void> => {
      await this.deleteFromStore('elements', id);
      // Remove from cache
      this.elementCache.delete(id);
    },

    deleteMany: async (ids: string[]): Promise<void> => {
      if (ids.length === 0) {
        return;
      }

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('elements', 'readwrite');
        const store = tx.objectStore('elements');

        // Queue all delete operations - single transaction commit
        ids.forEach((id) => {
          store.delete(id);
        });

        // Resolve when entire transaction completes
        tx.oncomplete = () => {
          // Remove from cache
          this.elementCache.deleteMany(ids);

          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [IndexedDB] deleteMany completed: ${ids.length} elements (cache cleared)`);
          }
          resolve();
        };

        tx.onerror = () => {
          console.error('❌ [IndexedDB] deleteMany transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    },

    getById: async (id: string): Promise<Element | null> => {
      // Try cache first
      const cached = this.elementCache.get(id);

      if (cached) {
        return cached;
      }

      // Cache miss - read from IndexedDB
      const element = await this.getFromStore<Element>('elements', id);

      if (element) {
        // Cache for future access
        this.elementCache.set(id, element);
      }

      return element;
    },

    getByPage: async (pageId: string): Promise<Element[]> => {
      return this.getAllByIndex<Element>('elements', 'page_id', pageId);
    },

    getByLayout: async (layoutId: string): Promise<Element[]> => {
      return this.getAllByIndex<Element>('elements', 'layout_id', layoutId);
    },

    getChildren: async (parentId: string): Promise<Element[]> => {
      return this.getAllByIndex<Element>('elements', 'parent_id', parentId);
    },

    getAll: async (): Promise<Element[]> => {
      return this.getAllFromStore<Element>('elements');
    },
  };

  // === Design Tokens ===

  designTokens = {
    getById: async (id: string): Promise<DesignToken | null> => {
      return this.getFromStore<DesignToken>('design_tokens', id);
    },

    insert: async (token: DesignToken): Promise<DesignToken> => {
      return this.putToStore('design_tokens', token);
    },

    insertMany: async (tokens: DesignToken[]): Promise<DesignToken[]> => {
      if (tokens.length === 0) {
        return [];
      }

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('design_tokens', 'readwrite');
        const store = tx.objectStore('design_tokens');

        // Queue all operations - single transaction commit
        tokens.forEach((token) => {
          store.put(token);
        });

        // Resolve when entire transaction completes
        tx.oncomplete = () => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [IndexedDB] designTokens.insertMany completed: ${tokens.length} tokens`);
          }
          resolve(tokens);
        };

        tx.onerror = () => {
          console.error('❌ [IndexedDB] designTokens.insertMany transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    },

    update: async (id: string, data: Partial<DesignToken>): Promise<DesignToken> => {
      const existing = await this.getFromStore<DesignToken>('design_tokens', id);
      if (!existing) {
        throw new Error(`Design token not found: ${id}`);
      }
      const updated = { ...existing, ...data };
      return this.putToStore('design_tokens', updated);
    },

    delete: async (id: string): Promise<void> => {
      return this.deleteFromStore('design_tokens', id);
    },

    getByProject: async (projectId: string): Promise<DesignToken[]> => {
      return this.getAllByIndex<DesignToken>('design_tokens', 'project_id', projectId);
    },

    getByTheme: async (themeId: string): Promise<DesignToken[]> => {
      return this.getAllByIndex<DesignToken>('design_tokens', 'theme_id', themeId);
    },

    getAll: async (): Promise<DesignToken[]> => {
      return this.getAllFromStore<DesignToken>('design_tokens');
    },
  };

  // === History ===

  history = {
    insert: async (entry: HistoryEntry): Promise<HistoryEntry> => {
      return this.putToStore('history', entry);
    },

    getByPage: async (pageId: string, limit = 50): Promise<HistoryEntry[]> => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const index = store.index('page_id');
        const request = index.getAll(pageId);

        request.onsuccess = () => {
          const results = request.result
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    },

    deleteOldEntries: async (pageId: string, keepCount: number): Promise<void> => {
      const entries = await this.history.getByPage(pageId, 1000);
      const toDelete = entries.slice(keepCount);

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');

        let completed = 0;
        toDelete.forEach((entry) => {
          const request = store.delete(entry.id);
          request.onsuccess = () => {
            completed++;
            if (completed === toDelete.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });

        if (toDelete.length === 0) {
          resolve();
        }
      });
    },

    clear: async (pageId: string): Promise<void> => {
      const entries = await this.history.getByPage(pageId, 1000);

      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');

        let completed = 0;
        entries.forEach((entry) => {
          const request = store.delete(entry.id);
          request.onsuccess = () => {
            completed++;
            if (completed === entries.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });

        if (entries.length === 0) {
          resolve();
        }
      });
    },
  };

  // === Design Themes ===

  themes = {
    getAll: async () => {
      return this.getAllFromStore<Record<string, unknown>>('design_themes');
    },

    getById: async (id: string) => {
      return this.getFromStore<Record<string, unknown>>('design_themes', id);
    },

    getByProject: async (projectId: string) => {
      const db = this.ensureDB();
      return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const tx = db.transaction('design_themes', 'readonly');
        const store = tx.objectStore('design_themes');
        const index = store.index('project_id');
        const request = index.getAll(projectId);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    },

    getActiveTheme: async (projectId: string) => {
      const themes = await this.themes.getByProject(projectId);
      const activeTheme = themes.find((t) => (t as { status?: string }).status === 'active');
      return activeTheme || themes[0] || null;
    },

    insert: async (theme: Record<string, unknown>) => {
      await this.putToStore('design_themes', theme);
      return theme;
    },

    update: async (id: string, updates: Record<string, unknown>) => {
      const existing = await this.themes.getById(id);
      if (!existing) {
        throw new Error(`Theme ${id} not found`);
      }
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      await this.putToStore('design_themes', updated);
      return updated;
    },

    delete: async (id: string) => {
      const db = this.ensureDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('design_themes', 'readwrite');
        const store = tx.objectStore('design_themes');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
  };

  // === Layouts (Layout/Slot System) ===

  layouts = {
    insert: async (layout: { id: string; name: string; project_id: string; description?: string; created_at?: string; updated_at?: string }) => {
      const now = new Date().toISOString();
      const layoutWithTimestamps = {
        ...layout,
        created_at: layout.created_at || now,
        updated_at: layout.updated_at || now,
      };
      await this.putToStore('layouts', layoutWithTimestamps);
      return layoutWithTimestamps;
    },

    update: async (id: string, updates: Partial<{ name: string; description: string }>) => {
      const existing = await this.layouts.getById(id);
      if (!existing) {
        throw new Error(`Layout ${id} not found`);
      }
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      await this.putToStore('layouts', updated);
      return updated;
    },

    delete: async (id: string): Promise<void> => {
      await this.deleteFromStore('layouts', id);
    },

    getById: async (id: string) => {
      return this.getFromStore<{ id: string; name: string; project_id: string; description?: string; created_at?: string; updated_at?: string }>('layouts', id);
    },

    getByProject: async (projectId: string) => {
      return this.getAllByIndex<{ id: string; name: string; project_id: string; description?: string; created_at?: string; updated_at?: string }>('layouts', 'project_id', projectId);
    },

    getAll: async () => {
      return this.getAllFromStore<{ id: string; name: string; project_id: string; description?: string; created_at?: string; updated_at?: string }>('layouts');
    },
  };

  // === Metadata ===

  metadata = {
    get: async (): Promise<SyncMetadata | null> => {
      const all = await this.getAllFromStore<SyncMetadata>('metadata');
      return all[0] || null;
    },

    set: async (data: SyncMetadata): Promise<void> => {
      await this.putToStore('metadata', data);
    },

    update: async (data: Partial<SyncMetadata>): Promise<void> => {
      const existing = await this.metadata.get();
      if (!existing) {
        throw new Error('Metadata not found. Call set() first.');
      }
      const updated = { ...existing, ...data };
      await this.putToStore('metadata', updated);
    },
  };

  // === Cache Management ===

  cache = {
    getStats: () => {
      return {
        elements: this.elementCache.getStats(),
        pages: this.pageCache.getStats(),
        projects: this.projectCache.getStats(),
      };
    },

    clear: () => {
      this.elementCache.clear();
      this.pageCache.clear();
      this.projectCache.clear();
      console.log('[IndexedDB] All caches cleared');
    },

    resetStats: () => {
      this.elementCache.resetStats();
      this.pageCache.resetStats();
      this.projectCache.resetStats();
      console.log('[IndexedDB] Cache statistics reset');
    },
  };

  // === Batch Operations ===

  batch = {
    export: async () => {
      const [project, pages, elements, designTokens, metadata] = await Promise.all([
        this.projects.getAll().then((projects) => projects[0] || null),
        this.pages.getAll(),
        this.elements.getAll(),
        this.designTokens.getAll(),
        this.metadata.get(),
      ]);

      return {
        project,
        pages,
        elements,
        designTokens,
        metadata,
      };
    },

    import: async (data: {
      project?: Project;
      pages?: Page[];
      elements?: Element[];
      designTokens?: DesignToken[];
      metadata?: SyncMetadata;
    }): Promise<void> => {
      if (data.project) {
        await this.projects.insert(data.project);
      }

      if (data.pages && data.pages.length > 0) {
        await this.pages.insertMany(data.pages);
      }

      if (data.elements && data.elements.length > 0) {
        await this.elements.insertMany(data.elements);
      }

      if (data.designTokens && data.designTokens.length > 0) {
        await this.designTokens.insertMany(data.designTokens);
      }

      if (data.metadata) {
        await this.metadata.set(data.metadata);
      }

      console.log('[IndexedDB] Import completed:', {
        pages: data.pages?.length || 0,
        elements: data.elements?.length || 0,
        designTokens: data.designTokens?.length || 0,
      });
    },

    clear: async (): Promise<void> => {
      const db = this.ensureDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(
          ['projects', 'pages', 'elements', 'design_tokens', 'design_themes', 'history', 'metadata', 'layouts'],
          'readwrite'
        );

        const stores = ['projects', 'pages', 'elements', 'design_tokens', 'design_themes', 'history', 'metadata', 'layouts'];
        let completed = 0;

        stores.forEach((storeName) => {
          const request = tx.objectStore(storeName).clear();
          request.onsuccess = () => {
            completed++;
            if (completed === stores.length) {
              console.log('[IndexedDB] All stores cleared');
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      });
    },
  };
}
