/**
 * PGlite Database Adapter
 *
 * Local PostgreSQL-compatible database for Electron apps.
 * Works in closed-network environments without internet access.
 */

import type { PGlite as PGliteType } from '@electric-sql/pglite';
import type {
  DbAdapter,
  SelectOptions,
  PGliteConfig,
  Migration,
} from './types';

/**
 * PGlite Adapter Implementation
 *
 * IMPORTANT: PGlite는 Electron의 main process에서만 초기화됩니다.
 * Renderer process는 IPC를 통해 DB에 접근합니다.
 */
export class PGliteAdapter implements DbAdapter {
  private db: PGliteType | null = null;
  private config: Required<PGliteConfig>;
  private initialized = false;

  constructor(config: PGliteConfig = {}) {
    this.config = {
      dataPath: config.dataPath || './xstudio.pglite',
      debug: config.debug ?? false,
    };
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import (PGlite는 Node.js 환경에서만 실행)
      const { PGlite } = await import('@electric-sql/pglite');

      this.db = new PGlite(this.config.dataPath, {
        debug: this.config.debug,
      });

      // 기본 확장 설치
      await this.db.exec('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

      // Migration 테이블 생성
      await this.createMigrationTable();

      this.initialized = true;

      if (this.config.debug) {
        console.log('✅ PGlite initialized at:', this.config.dataPath);
      }
    } catch (error) {
      console.error('❌ Failed to initialize PGlite:', error);
      throw new Error(`PGlite initialization failed: ${error}`);
    }
  }

  private async createMigrationTable(): Promise<void> {
    await this.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;

      if (this.config.debug) {
        console.log('✅ PGlite closed');
      }
    }
  }

  getType(): 'pglite' {
    return 'pglite';
  }

  // ============================================
  // Query Methods
  // ============================================

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureInitialized();

    try {
      if (this.config.debug) {
        console.log('[PGlite Query]', sql, params);
      }

      const result = await this.db!.query<T>(sql, params);
      return result.rows;
    } catch (error) {
      console.error('[PGlite Error]', error, { sql, params });
      throw error;
    }
  }

  async select<T = any>(
    table: string,
    options: SelectOptions = {}
  ): Promise<T[]> {
    const {
      columns = ['*'],
      where,
      orderBy,
      limit,
      offset,
    } = options;

    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // WHERE clause
    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY clause
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(
        (order) => `${order.column} ${order.ascending !== false ? 'ASC' : 'DESC'}`
      );
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // LIMIT clause
    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }

    // OFFSET clause
    if (offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(offset);
    }

    return this.query<T>(sql, params);
  }

  async insert<T = any>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]> {
    const records = Array.isArray(data) ? data : [data];

    if (records.length === 0) {
      return [];
    }

    const keys = Object.keys(records[0]);
    const columns = keys.join(', ');
    const valuePlaceholders = records.map((_, rowIndex) => {
      const placeholders = keys.map((_, colIndex) => {
        return `$${rowIndex * keys.length + colIndex + 1}`;
      });
      return `(${placeholders.join(', ')})`;
    }).join(', ');

    const params = records.flatMap((record) =>
      keys.map((key) => (record as any)[key])
    );

    const sql = `
      INSERT INTO ${table} (${columns})
      VALUES ${valuePlaceholders}
      RETURNING *
    `;

    return this.query<T>(sql, params);
  }

  async update<T = any>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const keys = Object.keys(data);
    const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
    const params = [...keys.map((key) => (data as any)[key]), id];

    const sql = `
      UPDATE ${table}
      SET ${setClauses.join(', ')}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    const results = await this.query<T>(sql, params);
    return results[0];
  }

  async delete(table: string, id: string): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE id = $1`;
    await this.query(sql, [id]);
  }

  // ============================================
  // RPC Functions (Supabase Compatibility)
  // ============================================

  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    this.ensureInitialized();

    // RPC 함수 호출 (PostgreSQL stored procedure)
    const paramKeys = Object.keys(params);
    const paramPlaceholders = paramKeys.map((key, index) => `${key} => $${index + 1}`);
    const paramValues = paramKeys.map((key) => params[key]);

    const sql = `SELECT * FROM ${functionName}(${paramPlaceholders.join(', ')})`;

    if (this.config.debug) {
      console.log('[PGlite RPC]', functionName, params);
    }

    const results = await this.query<T>(sql, paramValues);
    return results as T;
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
    this.ensureInitialized();

    const currentVersion = await this.getCurrentMigrationVersion();

    for (const migration of migrations) {
      if (currentVersion && migration.version <= currentVersion) {
        continue; // 이미 적용된 migration
      }

      if (this.config.debug) {
        console.log(`[Migration] Applying: ${migration.version} - ${migration.name}`);
      }

      await this.transaction(async (tx) => {
        // Migration SQL 실행
        await tx.query(migration.sql);

        // Migration 기록
        await tx.query(
          'INSERT INTO _migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
      });

      if (this.config.debug) {
        console.log(`✅ Migration applied: ${migration.version}`);
      }
    }
  }

  private async getCurrentMigrationVersion(): Promise<string | null> {
    const results = await this.query<{ version: string }>(
      'SELECT version FROM _migrations ORDER BY applied_at DESC LIMIT 1'
    );
    return results[0]?.version || null;
  }

  // ============================================
  // Utilities
  // ============================================

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('PGlite is not initialized. Call initialize() first.');
    }
  }

  /**
   * Get database file size (for monitoring)
   */
  async getDbSize(): Promise<number> {
    this.ensureInitialized();

    const results = await this.query<{ size: string }>(
      "SELECT pg_database_size(current_database()) as size"
    );

    return parseInt(results[0]?.size || '0', 10);
  }

  /**
   * Vacuum database (optimize storage)
   */
  async vacuum(): Promise<void> {
    this.ensureInitialized();
    await this.query('VACUUM');

    if (this.config.debug) {
      console.log('✅ Database vacuumed');
    }
  }
}
