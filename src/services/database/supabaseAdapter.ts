/**
 * Supabase Database Adapter
 *
 * Cloud PostgreSQL database for web and internet-connected Electron apps.
 * Wraps the existing Supabase client with DbAdapter interface.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DbAdapter,
  SelectOptions,
  SupabaseConfig,
  Migration,
} from './types';

/**
 * Supabase Adapter Implementation
 *
 * Wraps existing Supabase client to match DbAdapter interface.
 */
export class SupabaseAdapter implements DbAdapter {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;
  private initialized = false;

  constructor(config: SupabaseConfig) {
    this.config = config;
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import (Supabase는 web/electron 모두 지원)
      const { createClient } = await import('@supabase/supabase-js');

      this.client = createClient(this.config.url, this.config.anonKey, {
        auth: {
          persistSession: true,
          storageKey: 'xstudio-auth',
        },
      });

      this.initialized = true;
      console.log('✅ Supabase initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      throw new Error(`Supabase initialization failed: ${error}`);
    }
  }

  async close(): Promise<void> {
    // Supabase client는 명시적으로 close할 필요 없음
    this.client = null;
    this.initialized = false;
    console.log('✅ Supabase connection closed');
  }

  getType(): 'supabase' {
    return 'supabase';
  }

  // ============================================
  // Query Methods
  // ============================================

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureInitialized();

    try {
      // Supabase는 raw SQL을 직접 지원하지 않으므로 RPC 함수 필요
      // 또는 Supabase의 PostgREST API 사용
      console.warn('⚠️ Raw SQL query not directly supported in Supabase client.');
      console.warn('   Use .select(), .insert(), .update(), .delete() instead.');
      console.warn('   Or create a custom RPC function in Supabase.');

      // RPC fallback (Supabase에 raw_query 함수가 있다면)
      const { data, error } = await this.client!
        .rpc('raw_query', { sql, params });

      if (error) throw error;
      return data as T[];
    } catch (error) {
      console.error('[Supabase Error]', error, { sql, params });
      throw error;
    }
  }

  async select<T = any>(
    table: string,
    options: SelectOptions = {}
  ): Promise<T[]> {
    this.ensureInitialized();

    const {
      columns = ['*'],
      where,
      orderBy,
      limit,
      offset,
    } = options;

    let query = this.client!.from(table).select(columns.join(', '));

    // WHERE clause
    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // ORDER BY clause
    if (orderBy && orderBy.length > 0) {
      orderBy.forEach((order) => {
        query = query.order(order.column, {
          ascending: order.ascending !== false,
        });
      });
    }

    // LIMIT clause
    if (limit !== undefined) {
      query = query.limit(limit);
    }

    // OFFSET clause (range in Supabase)
    if (offset !== undefined && limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase Select Error]', error);
      throw error;
    }

    return (data || []) as T[];
  }

  async insert<T = any>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<T[]> {
    this.ensureInitialized();

    const { data: result, error } = await this.client!
      .from(table)
      .insert(data)
      .select();

    if (error) {
      console.error('[Supabase Insert Error]', error);
      throw error;
    }

    return result as T[];
  }

  async update<T = any>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    this.ensureInitialized();

    const { data: result, error } = await this.client!
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase Update Error]', error);
      throw error;
    }

    return result as T;
  }

  async delete(table: string, id: string): Promise<void> {
    this.ensureInitialized();

    const { error } = await this.client!
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase Delete Error]', error);
      throw error;
    }
  }

  // ============================================
  // RPC Functions
  // ============================================

  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    this.ensureInitialized();

    const { data, error } = await this.client!.rpc(functionName, params);

    if (error) {
      console.error('[Supabase RPC Error]', error, { functionName, params });
      throw error;
    }

    return data as T;
  }

  // ============================================
  // Transaction Support
  // ============================================

  async transaction<T>(
    callback: (tx: DbAdapter) => Promise<T>
  ): Promise<T> {
    this.ensureInitialized();

    // Supabase는 클라이언트 측 트랜잭션을 지원하지 않음
    // RPC 함수로 서버 측 트랜잭션 구현 필요
    console.warn('⚠️ Client-side transactions not supported in Supabase.');
    console.warn('   Use RPC functions for server-side transactions.');

    // Fallback: 트랜잭션 없이 실행 (권장하지 않음)
    return callback(this);
  }

  // ============================================
  // Migration Support
  // ============================================

  async runMigrations(migrations: Migration[]): Promise<void> {
    this.ensureInitialized();

    console.warn('⚠️ Migrations should be managed via Supabase CLI:');
    console.warn('   supabase migration new <name>');
    console.warn('   supabase db push');
    console.warn('   Client-side migration not recommended for production.');

    // 개발/테스트 환경에서만 실행 (프로덕션 비추천)
    for (const migration of migrations) {
      try {
        console.log(`[Migration] Applying: ${migration.version} - ${migration.name}`);

        // RPC로 migration 실행 (서버에 apply_migration 함수 필요)
        await this.rpc('apply_migration', {
          version: migration.version,
          name: migration.name,
          sql: migration.sql,
        });

        console.log(`✅ Migration applied: ${migration.version}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.version}`, error);
        throw error;
      }
    }
  }

  // ============================================
  // Utilities
  // ============================================

  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new Error('Supabase is not initialized. Call initialize() first.');
    }
  }

  /**
   * Get Supabase client (for advanced usage)
   */
  getClient(): SupabaseClient {
    this.ensureInitialized();
    return this.client!;
  }

  /**
   * Check internet connectivity
   */
  async checkConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // 간단한 쿼리로 연결 테스트
      const { error } = await this.client!
        .from('projects')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}
