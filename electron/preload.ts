/**
 * Electron Preload Script
 *
 * Provides safe IPC bridge between renderer and main processes.
 * Exposes database API to renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { DbAdapter, SelectOptions } from '../src/services/database/types';

/**
 * Electron API exposed to renderer process
 */
const electronAPI = {
  // ============================================
  // Database API (matches DbAdapter interface)
  // ============================================

  db: {
    /**
     * Raw SQL query
     */
    query: <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
      return ipcRenderer.invoke('db:query', sql, params);
    },

    /**
     * Select rows from table
     */
    select: <T = any>(table: string, options?: SelectOptions): Promise<T[]> => {
      return ipcRenderer.invoke('db:select', table, options);
    },

    /**
     * Insert rows into table
     */
    insert: <T = any>(table: string, data: Partial<T> | Partial<T>[]): Promise<T[]> => {
      return ipcRenderer.invoke('db:insert', table, data);
    },

    /**
     * Update row by ID
     */
    update: <T = any>(table: string, id: string, data: Partial<T>): Promise<T> => {
      return ipcRenderer.invoke('db:update', table, id, data);
    },

    /**
     * Delete row by ID
     */
    delete: (table: string, id: string): Promise<void> => {
      return ipcRenderer.invoke('db:delete', table, id);
    },

    /**
     * Call RPC function
     */
    rpc: <T = any>(functionName: string, params?: Record<string, any>): Promise<T> => {
      return ipcRenderer.invoke('db:rpc', functionName, params);
    },
  },

  // ============================================
  // App API
  // ============================================

  app: {
    /**
     * Get user data path
     */
    getUserDataPath: (): Promise<string> => {
      return ipcRenderer.invoke('app:getUserDataPath');
    },

    /**
     * Get app version
     */
    getVersion: (): Promise<string> => {
      return ipcRenderer.invoke('app:getVersion');
    },
  },

  // ============================================
  // Platform Detection
  // ============================================

  platform: process.platform,
  isElectron: true,
};

/**
 * Expose API to renderer process
 */
contextBridge.exposeInMainWorld('electron', electronAPI);

/**
 * TypeScript type definitions for window.electron
 *
 * Add this to src/types/global.d.ts:
 *
 * ```typescript
 * interface Window {
 *   electron: {
 *     db: {
 *       query<T = any>(sql: string, params?: any[]): Promise<T[]>;
 *       select<T = any>(table: string, options?: SelectOptions): Promise<T[]>;
 *       insert<T = any>(table: string, data: Partial<T> | Partial<T>[]): Promise<T[]>;
 *       update<T = any>(table: string, id: string, data: Partial<T>): Promise<T>;
 *       delete(table: string, id: string): Promise<void>;
 *       rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<T>;
 *     };
 *     app: {
 *       getUserDataPath(): Promise<string>;
 *       getVersion(): Promise<string>;
 *     };
 *     platform: string;
 *     isElectron: true;
 *   };
 * }
 * ```
 */
