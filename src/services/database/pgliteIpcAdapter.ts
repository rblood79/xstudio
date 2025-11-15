/**
 * PGlite IPC Adapter
 *
 * Electron renderer process adapter that communicates with PGlite in main process via IPC.
 * This is used instead of PGliteAdapter in the renderer process.
 */

import type {
  DbAdapter,
  SelectOptions,
  Migration,
} from './types';

/**
 * PGlite IPC Adapter (for Electron renderer process)
 *
 * Communicates with main process PGlite via window.electron.db IPC bridge.
 */
export class PGliteIpcAdapter implements DbAdapter {
  private initialized = false;

  constructor() {
    if (!this.isElectronRenderer()) {
      throw new Error(
        'PGliteIpcAdapter can only be used in Electron renderer process. ' +
        'Use PGliteAdapter in main process or SupabaseAdapter in web.'
      );
    }
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify IPC bridge is available
    if (!window.electron?.db) {
      throw new Error('Electron IPC bridge not available. Check preload script.');
    }

    this.initialized = true;
    console.log('✅ PGlite IPC adapter initialized');
  }

  async close(): Promise<void> {
    // IPC connection doesn't need explicit closing
    this.initialized = false;
    console.log('✅ PGlite IPC adapter closed');
  }

  getType(): 'pglite' {
    return 'pglite';
  }

  // ============================================
  // Query Methods (delegate to IPC)
  // ============================================

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureInitialized();
    return window.electron!.db.query<T>(sql, params);
  }

  async select<T = any>(
    table: string,
    options: SelectOptions = {}
  ): Promise<T[]> {
    this.ensureInitialized();
    return window.electron!.db.select<T>(table, options);
  }

  async insert<T = any>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]> {
    this.ensureInitialized();
    return window.electron!.db.insert<T>(table, data);
  }

  async update<T = any>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    this.ensureInitialized();
    return window.electron!.db.update<T>(table, id, data);
  }

  async delete(table: string, id: string): Promise<void> {
    this.ensureInitialized();
    return window.electron!.db.delete(table, id);
  }

  // ============================================
  // RPC Functions
  // ============================================

  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    this.ensureInitialized();
    return window.electron!.db.rpc<T>(functionName, params);
  }

  // ============================================
  // Transaction Support
  // ============================================

  async transaction<T>(
    callback: (tx: DbAdapter) => Promise<T>
  ): Promise<T> {
    this.ensureInitialized();

    await this.query('BEGIN');

    try {
      const result = await callback(this);
      await this.query('COMMIT');
      return result;
    } catch (error) {
      await this.query('ROLLBACK');
      throw error;
    }
  }

  // ============================================
  // Migration Support
  // ============================================

  async runMigrations(migrations: Migration[]): Promise<void> {
    console.warn('⚠️ Migrations are handled by Electron main process.');
    console.warn('   Renderer process should not run migrations directly.');

    // Migrations are already applied in main process during app startup
    // This is a no-op in renderer process
  }

  // ============================================
  // Utilities
  // ============================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PGliteIpcAdapter is not initialized. Call initialize() first.');
    }
  }

  private isElectronRenderer(): boolean {
    return typeof window !== 'undefined' && !!window.electron;
  }

  /**
   * Get database file size (via IPC)
   */
  async getDbSize(): Promise<number> {
    this.ensureInitialized();

    const results = await this.query<{ size: string }>(
      "SELECT pg_database_size(current_database()) as size"
    );

    return parseInt(results[0]?.size || '0', 10);
  }

  /**
   * Vacuum database (via IPC)
   */
  async vacuum(): Promise<void> {
    this.ensureInitialized();
    await this.query('VACUUM');
    console.log('✅ Database vacuumed');
  }
}
