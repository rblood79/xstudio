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

const DB_NAME = 'xstudio';
const DB_VERSION = 1;

export class IndexedDBAdapter implements DatabaseAdapter {
  private db: IDBDatabase | null = null;

  // === Database Lifecycle ===

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database initialized');
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
          console.log('[IndexedDB] Created store: elements');
        }

        // Design tokens store
        if (!db.objectStoreNames.contains('design_tokens')) {
          const tokensStore = db.createObjectStore('design_tokens', { keyPath: 'id' });
          tokensStore.createIndex('project_id', 'project_id', { unique: false });
          console.log('[IndexedDB] Created store: design_tokens');
        }

        // History store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('page_id', 'page_id', { unique: false });
          historyStore.createIndex('created_at', 'created_at', { unique: false });
          console.log('[IndexedDB] Created store: history');
        }

        // Metadata store (sync 상태 저장)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'project_id' });
          console.log('[IndexedDB] Created store: metadata');
        }

        console.log('[IndexedDB] Schema upgrade completed');
      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDB] Database closed');
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
      return this.putToStore('projects', project);
    },

    update: async (id: string, data: Partial<Project>): Promise<Project> => {
      const existing = await this.getFromStore<Project>('projects', id);
      if (!existing) {
        throw new Error(`Project not found: ${id}`);
      }
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      return this.putToStore('projects', updated);
    },

    delete: async (id: string): Promise<void> => {
      return this.deleteFromStore('projects', id);
    },

    getById: async (id: string): Promise<Project | null> => {
      return this.getFromStore<Project>('projects', id);
    },

    getAll: async (): Promise<Project[]> => {
      return this.getAllFromStore<Project>('projects');
    },
  };

  // === Pages ===

  pages = {
    insert: async (page: Page): Promise<Page> => {
      return this.putToStore('pages', page);
    },

    insertMany: async (pages: Page[]): Promise<Page[]> => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('pages', 'readwrite');
        const store = tx.objectStore('pages');

        const results: Page[] = [];
        let completed = 0;

        pages.forEach((page) => {
          const request = store.put(page);
          request.onsuccess = () => {
            results.push(page);
            completed++;
            if (completed === pages.length) {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        });

        if (pages.length === 0) {
          resolve([]);
        }
      });
    },

    update: async (id: string, data: Partial<Page>): Promise<Page> => {
      const existing = await this.getFromStore<Page>('pages', id);
      if (!existing) {
        throw new Error(`Page not found: ${id}`);
      }
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      return this.putToStore('pages', updated);
    },

    delete: async (id: string): Promise<void> => {
      return this.deleteFromStore('pages', id);
    },

    getById: async (id: string): Promise<Page | null> => {
      return this.getFromStore<Page>('pages', id);
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
      return this.putToStore('elements', element);
    },

    insertMany: async (elements: Element[]): Promise<Element[]> => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('elements', 'readwrite');
        const store = tx.objectStore('elements');

        const results: Element[] = [];
        let completed = 0;

        elements.forEach((element) => {
          const request = store.put(element);
          request.onsuccess = () => {
            results.push(element);
            completed++;
            if (completed === elements.length) {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        });

        if (elements.length === 0) {
          resolve([]);
        }
      });
    },

    update: async (id: string, data: Partial<Element>): Promise<Element> => {
      const existing = await this.getFromStore<Element>('elements', id);
      if (!existing) {
        throw new Error(`Element not found: ${id}`);
      }
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      return this.putToStore('elements', updated);
    },

    updateMany: async (
      updates: Array<{ id: string; data: Partial<Element> }>
    ): Promise<Element[]> => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('elements', 'readwrite');
        const store = tx.objectStore('elements');

        const results: Element[] = [];
        let completed = 0;

        updates.forEach(async ({ id, data }) => {
          const getRequest = store.get(id);

          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (!existing) {
              completed++;
              if (completed === updates.length) {
                resolve(results);
              }
              return;
            }

            const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
            const putRequest = store.put(updated);

            putRequest.onsuccess = () => {
              results.push(updated);
              completed++;
              if (completed === updates.length) {
                resolve(results);
              }
            };

            putRequest.onerror = () => reject(putRequest.error);
          };

          getRequest.onerror = () => reject(getRequest.error);
        });

        if (updates.length === 0) {
          resolve([]);
        }
      });
    },

    delete: async (id: string): Promise<void> => {
      return this.deleteFromStore('elements', id);
    },

    deleteMany: async (ids: string[]): Promise<void> => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('elements', 'readwrite');
        const store = tx.objectStore('elements');

        let completed = 0;

        ids.forEach((id) => {
          const request = store.delete(id);
          request.onsuccess = () => {
            completed++;
            if (completed === ids.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });

        if (ids.length === 0) {
          resolve();
        }
      });
    },

    getById: async (id: string): Promise<Element | null> => {
      return this.getFromStore<Element>('elements', id);
    },

    getByPage: async (pageId: string): Promise<Element[]> => {
      return this.getAllByIndex<Element>('elements', 'page_id', pageId);
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
    insert: async (token: DesignToken): Promise<DesignToken> => {
      return this.putToStore('design_tokens', token);
    },

    insertMany: async (tokens: DesignToken[]): Promise<DesignToken[]> => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('design_tokens', 'readwrite');
        const store = tx.objectStore('design_tokens');

        const results: DesignToken[] = [];
        let completed = 0;

        tokens.forEach((token) => {
          const request = store.put(token);
          request.onsuccess = () => {
            results.push(token);
            completed++;
            if (completed === tokens.length) {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        });

        if (tokens.length === 0) {
          resolve([]);
        }
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

    import: async (data) => {
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

    clear: async () => {
      const db = this.ensureDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(
          ['projects', 'pages', 'elements', 'design_tokens', 'history', 'metadata'],
          'readwrite'
        );

        const stores = ['projects', 'pages', 'elements', 'design_tokens', 'history', 'metadata'];
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
