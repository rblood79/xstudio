/**
 * Database Factory
 *
 * Creates and manages database adapter instances.
 * Automatically selects optimal adapter based on environment.
 */

import type { DbAdapter, DbConfig, PGliteConfig, SupabaseConfig } from './types';
import { PGliteAdapter } from './pgliteAdapter';
import { PGliteIpcAdapter } from './pgliteIpcAdapter';
import { SupabaseAdapter } from './supabaseAdapter';
import { determineDatabase, detectEnvironment, isElectron } from './environmentDetector';

// ============================================
// Singleton Instance
// ============================================

let dbInstance: DbAdapter | null = null;

/**
 * Get or create database adapter instance
 *
 * @param config - Optional configuration. If not provided, uses environment detection.
 * @returns Initialized database adapter
 */
export async function getDb(config?: DbConfig): Promise<DbAdapter> {
  // Return existing instance
  if (dbInstance) {
    return dbInstance;
  }

  // Create new instance
  if (config) {
    // Manual configuration
    dbInstance = await createDbFromConfig(config);
  } else {
    // Auto-detect environment
    dbInstance = await createDbAuto();
  }

  // Initialize
  await dbInstance.initialize();

  return dbInstance;
}

/**
 * Create database adapter from configuration
 */
async function createDbFromConfig(config: DbConfig): Promise<DbAdapter> {
  if (config.type === 'pglite') {
    if (!config.pglite) {
      throw new Error('PGliteConfig is required when type is "pglite"');
    }

    // Electron renderer: Use IPC adapter
    if (isElectronRenderer()) {
      return new PGliteIpcAdapter();
    }

    // Electron main or Node.js: Use direct adapter
    return new PGliteAdapter(config.pglite);
  }

  if (config.type === 'supabase') {
    if (!config.supabase) {
      throw new Error('SupabaseConfig is required when type is "supabase"');
    }
    return new SupabaseAdapter(config.supabase);
  }

  throw new Error(`Unknown database type: ${config.type}`);
}

/**
 * Create database adapter with auto-detection
 */
async function createDbAuto(): Promise<DbAdapter> {
  const envInfo = await detectEnvironment();
  const dbType = await determineDatabase();

  console.log('🔍 Environment Detection:');
  console.log(`   Environment: ${envInfo.environment}`);
  console.log(`   Electron: ${envInfo.isElectron ? 'Yes' : 'No'}`);
  console.log(`   Internet: ${envInfo.hasInternet ? 'Yes' : 'No'}`);
  console.log(`   Database: ${dbType === 'pglite' ? 'PGlite (Local)' : 'Supabase (Cloud)'}`);

  if (dbType === 'pglite') {
    // Electron renderer: Use IPC adapter
    if (isElectronRenderer()) {
      console.log('   Adapter: PGliteIpcAdapter (Electron renderer via IPC)');
      return new PGliteIpcAdapter();
    }

    // Electron main or Node.js: Use direct adapter
    const pgliteConfig: PGliteConfig = {
      // Electron에서는 userData 경로 사용
      dataPath: envInfo.isElectron
        ? await getElectronUserDataPath()
        : './xstudio.pglite',
      debug: import.meta.env.DEV,
    };

    console.log('   Adapter: PGliteAdapter (Electron main or Node.js)');
    return new PGliteAdapter(pgliteConfig);
  }

  // Supabase configuration
  const supabaseConfig: SupabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error(
      'Supabase environment variables not found. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return new SupabaseAdapter(supabaseConfig);
}

/**
 * Get Electron userData path via IPC
 */
async function getElectronUserDataPath(): Promise<string> {
  // Electron renderer process
  if (typeof window !== 'undefined' && (window as any).electron) {
    const userDataPath = await (window as any).electron.app.getUserDataPath();
    return `${userDataPath}/xstudio.pglite`;
  }

  // Fallback
  return './xstudio.pglite';
}

/**
 * Check if running in Electron renderer process
 */
function isElectronRenderer(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electron;
}

/**
 * Reset database instance (for testing or switching databases)
 */
export async function resetDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Switch to different database
 *
 * WARNING: This will close the current database and create a new one.
 * Make sure to save all pending changes before switching.
 */
export async function switchDb(type: 'pglite' | 'supabase'): Promise<DbAdapter> {
  console.warn('⚠️ Switching database. Current connection will be closed.');

  // Close current database
  await resetDb();

  // Create new database
  const config: DbConfig = {
    type,
    pglite: type === 'pglite' ? { debug: import.meta.env.DEV } : undefined,
    supabase: type === 'supabase' ? {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    } : undefined,
  };

  return getDb(config);
}

/**
 * Get current database type
 */
export function getCurrentDbType(): 'pglite' | 'supabase' | null {
  return dbInstance?.getType() || null;
}

/**
 * Check if database is initialized
 */
export function isDbInitialized(): boolean {
  return dbInstance !== null;
}

// ============================================
// Convenience Re-exports
// ============================================

export { detectEnvironment, determineDatabase } from './environmentDetector';
export type { DbAdapter, DbConfig, EnvironmentInfo } from './types';
