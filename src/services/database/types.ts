/**
 * Database Abstraction Layer (DAL) Types
 *
 * Unified interface for both PGlite (local) and Supabase (cloud) databases.
 * Supports hybrid architecture for closed-network and internet environments.
 */

// ============================================
// Core Database Adapter Interface
// ============================================

export interface DbAdapter {
  /**
   * Raw SQL query execution
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * CRUD operations
   */
  select<T = any>(
    table: string,
    options?: SelectOptions
  ): Promise<T[]>;

  insert<T = any>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]>;

  update<T = any>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T>;

  delete(
    table: string,
    id: string
  ): Promise<void>;

  /**
   * RPC function call (for Supabase compatibility)
   */
  rpc<T = any>(
    functionName: string,
    params?: Record<string, any>
  ): Promise<T>;

  /**
   * Transaction support
   */
  transaction<T>(
    callback: (tx: DbAdapter) => Promise<T>
  ): Promise<T>;

  /**
   * Database initialization
   */
  initialize(): Promise<void>;

  /**
   * Database cleanup
   */
  close(): Promise<void>;

  /**
   * Get database type
   */
  getType(): 'pglite' | 'supabase';
}

// ============================================
// Query Options
// ============================================

export interface SelectOptions {
  columns?: string[];
  where?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
}

export interface WhereClause {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'ILIKE';
  value: any;
}

// ============================================
// Database Configuration
// ============================================

export interface DbConfig {
  type: 'pglite' | 'supabase';
  pglite?: PGliteConfig;
  supabase?: SupabaseConfig;
}

export interface PGliteConfig {
  /**
   * Database file path (default: userData/xstudio.pglite)
   */
  dataPath?: string;

  /**
   * Debug logging
   */
  debug?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

// ============================================
// Migration Types
// ============================================

export interface Migration {
  version: string;
  name: string;
  sql: string;
  appliedAt?: Date;
}

export interface MigrationRunner {
  run(migrations: Migration[]): Promise<void>;
  getCurrentVersion(): Promise<string | null>;
  rollback(targetVersion: string): Promise<void>;
}

// ============================================
// Environment Detection
// ============================================

export type Environment = 'electron-closed' | 'electron-internet' | 'web';

export interface EnvironmentInfo {
  environment: Environment;
  isElectron: boolean;
  hasInternet: boolean;
  preferredDb: 'pglite' | 'supabase';
}
