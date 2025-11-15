/**
 * TypeScript definitions for Electron IPC API
 */

import type { SelectOptions } from '../services/database/types';

declare global {
  interface Window {
    /**
     * Electron API (available only in Electron renderer process)
     */
    electron?: {
      /**
       * Database API (PGlite via IPC)
       */
      db: {
        query<T = any>(sql: string, params?: any[]): Promise<T[]>;
        select<T = any>(table: string, options?: SelectOptions): Promise<T[]>;
        insert<T = any>(table: string, data: Partial<T> | Partial<T>[]): Promise<T[]>;
        update<T = any>(table: string, id: string, data: Partial<T>): Promise<T>;
        delete(table: string, id: string): Promise<void>;
        rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<T>;
      };

      /**
       * App API
       */
      app: {
        getUserDataPath(): Promise<string>;
        getVersion(): Promise<string>;
      };

      /**
       * Platform information
       */
      platform: string;
      isElectron: true;
    };

    /**
     * Process versions (for Electron detection)
     */
    process?: {
      versions?: {
        electron?: string;
        node?: string;
        chrome?: string;
      };
    };
  }
}

export {};
