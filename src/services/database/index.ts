/**
 * Database Service
 *
 * Unified database layer for XStudio.
 * Supports both PGlite (local) and Supabase (cloud) databases.
 *
 * @example
 * ```typescript
 * // Auto-detect environment and initialize
 * import { db } from './services/database';
 *
 * // Use database
 * const projects = await db.select('projects');
 * const newProject = await db.insert('projects', { name: 'My Project' });
 * ```
 */

import { getDb, resetDb, switchDb, getCurrentDbType, isDbInitialized } from './dbFactory';
import type { DbAdapter } from './types';

// ============================================
// Singleton Database Instance
// ============================================

let dbPromise: Promise<DbAdapter> | null = null;

/**
 * Get database instance (lazy initialization)
 */
export async function initializeDatabase(): Promise<DbAdapter> {
  if (!dbPromise) {
    dbPromise = getDb();
  }
  return dbPromise;
}

/**
 * Get initialized database instance
 *
 * @throws Error if database is not initialized
 */
export async function getDatabase(): Promise<DbAdapter> {
  if (!dbPromise) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbPromise;
}

/**
 * Convenient database instance (auto-initialized)
 *
 * Usage: `await db.select('projects')`
 */
export const db: Promise<DbAdapter> = (async () => {
  return initializeDatabase();
})();

// ============================================
// Re-exports
// ============================================

export {
  // Factory functions
  getDb,
  resetDb,
  switchDb,
  getCurrentDbType,
  isDbInitialized,

  // Adapters
  PGliteAdapter,
  SupabaseAdapter,

  // Environment detection
  detectEnvironment,
  determineDatabase,
  isElectron,
  hasInternetAccess,
  getUserDbPreference,
  setUserDbPreference,
  getEnvironmentDebugInfo,

  // Migrations
  MIGRATIONS,
  getMigrationsToApply,
} from './dbFactory';

export type {
  DbAdapter,
  DbConfig,
  SelectOptions,
  Migration,
  Environment,
  EnvironmentInfo,
} from './types';

// ============================================
// Imports (internal use)
// ============================================

import { PGliteAdapter } from './pgliteAdapter';
import { SupabaseAdapter } from './supabaseAdapter';
import {
  detectEnvironment,
  determineDatabase,
  isElectron,
  hasInternetAccess,
  getUserDbPreference,
  setUserDbPreference,
  getEnvironmentDebugInfo,
} from './environmentDetector';
import { MIGRATIONS, getMigrationsToApply } from './migrations';
