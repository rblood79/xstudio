/**
 * Database Migrations
 *
 * Unified migration system for both PGlite and Supabase.
 * Migrations are loaded from /supabase/migrations/*.sql files.
 */

import type { Migration } from './types';

/**
 * Base Schema Migration
 *
 * Creates core tables: projects, pages, elements, design_tokens, design_themes
 */
const BASE_SCHEMA: Migration = {
  version: '20250101_000000',
  name: 'base_schema',
  sql: `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- ============================================
    -- Projects Table
    -- ============================================
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      created_by UUID,
      domain TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- Pages Table
    -- ============================================
    CREATE TABLE IF NOT EXISTS pages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, slug)
    );

    CREATE INDEX IF NOT EXISTS idx_pages_project_id ON pages(project_id);

    -- ============================================
    -- Elements Table
    -- ============================================
    CREATE TABLE IF NOT EXISTS elements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES elements(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      props JSONB DEFAULT '{}',
      order_num INTEGER DEFAULT 0,
      data_binding JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_elements_page_id ON elements(page_id);
    CREATE INDEX IF NOT EXISTS idx_elements_parent_id ON elements(parent_id);
    CREATE INDEX IF NOT EXISTS idx_elements_order_num ON elements(order_num);

    -- ============================================
    -- Design Themes Table
    -- ============================================
    CREATE TABLE IF NOT EXISTS design_themes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_theme_id UUID REFERENCES design_themes(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_design_themes_project_id ON design_themes(project_id);

    -- ============================================
    -- Design Tokens Table
    -- ============================================
    CREATE TABLE IF NOT EXISTS design_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      theme_id UUID NOT NULL REFERENCES design_themes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value JSONB NOT NULL,
      scope TEXT DEFAULT 'raw',
      alias_of TEXT,
      css_variable TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, theme_id, name, scope)
    );

    CREATE INDEX IF NOT EXISTS idx_design_tokens_project_id ON design_tokens(project_id);
    CREATE INDEX IF NOT EXISTS idx_design_tokens_theme_id ON design_tokens(theme_id);
    CREATE INDEX IF NOT EXISTS idx_design_tokens_name ON design_tokens(name);

    -- ============================================
    -- Updated_at Triggers
    -- ============================================
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_pages_updated_at
      BEFORE UPDATE ON pages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_elements_updated_at
      BEFORE UPDATE ON elements
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_design_themes_updated_at
      BEFORE UPDATE ON design_themes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_design_tokens_updated_at
      BEFORE UPDATE ON design_tokens
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `,
};

/**
 * Custom ID Migration (from 20250129_add_custom_id_to_elements.sql)
 */
const CUSTOM_ID_MIGRATION: Migration = {
  version: '20250129_000000',
  name: 'add_custom_id_to_elements',
  sql: `
    -- Add custom_id column to elements table for user-defined component IDs
    ALTER TABLE elements ADD COLUMN IF NOT EXISTS custom_id TEXT;

    -- Create index for faster lookups by custom_id
    CREATE INDEX IF NOT EXISTS idx_elements_custom_id ON elements(custom_id);

    -- Add comment for documentation
    COMMENT ON COLUMN elements.custom_id IS 'User-defined custom ID for component identification (e.g., button_1, input_2). Used for event handling, CSS selectors, and testing.';
  `,
};

/**
 * Theme RPC Functions Migration (from 20250201_theme_rpc_functions.sql)
 */
const THEME_RPC_MIGRATION: Migration = {
  version: '20250201_000000',
  name: 'theme_rpc_functions',
  sql: `
    -- =====================================================
    -- Theme System V3: RPC Functions Only (Zero Migration)
    -- =====================================================

    -- 1. 테마 토큰 상속 해석 (재귀 쿼리)
    CREATE OR REPLACE FUNCTION resolve_theme_tokens(p_theme_id UUID)
    RETURNS TABLE (
      id UUID,
      theme_id UUID,
      project_id UUID,
      name TEXT,
      type TEXT,
      value JSONB,
      scope TEXT,
      alias_of TEXT,
      css_variable TEXT,
      source_theme_id UUID,
      is_inherited BOOLEAN,
      inheritance_depth INTEGER,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    ) AS $$
    WITH RECURSIVE theme_hierarchy AS (
      -- 현재 테마
      SELECT
        dt.id,
        dt.parent_theme_id,
        0 AS depth
      FROM design_themes dt
      WHERE dt.id = p_theme_id

      UNION ALL

      -- 부모 테마들 (재귀)
      SELECT
        dt.id,
        dt.parent_theme_id,
        th.depth + 1
      FROM design_themes dt
      INNER JOIN theme_hierarchy th ON dt.id = th.parent_theme_id
      WHERE th.depth < 10  -- 무한 루프 방지
    )
    SELECT DISTINCT ON (t.name, t.scope)
      t.id,
      t.theme_id,
      t.project_id,
      t.name,
      t.type,
      t.value,
      t.scope,
      t.alias_of,
      t.css_variable,
      t.theme_id AS source_theme_id,
      (t.theme_id != p_theme_id) AS is_inherited,
      th.depth AS inheritance_depth,
      t.created_at,
      t.updated_at
    FROM theme_hierarchy th
    INNER JOIN design_tokens t ON t.theme_id = th.id
    ORDER BY t.name, t.scope, th.depth ASC;
    $$ LANGUAGE sql STABLE;

    -- 2. 테마 복제 함수
    CREATE OR REPLACE FUNCTION duplicate_theme(
      p_source_theme_id UUID,
      p_new_name TEXT,
      p_inherit BOOLEAN DEFAULT FALSE
    )
    RETURNS UUID AS $$
    DECLARE
      v_new_theme_id UUID;
      v_project_id UUID;
      v_token_count INTEGER;
    BEGIN
      SELECT project_id INTO v_project_id
      FROM design_themes
      WHERE id = p_source_theme_id;

      IF v_project_id IS NULL THEN
        RAISE EXCEPTION '원본 테마를 찾을 수 없습니다: %', p_source_theme_id;
      END IF;

      INSERT INTO design_themes (project_id, name, parent_theme_id, status, version)
      VALUES (
        v_project_id,
        p_new_name,
        CASE WHEN p_inherit THEN p_source_theme_id ELSE NULL END,
        'draft',
        1
      )
      RETURNING id INTO v_new_theme_id;

      IF NOT p_inherit THEN
        INSERT INTO design_tokens (
          project_id, theme_id, name, type, value, scope, alias_of, css_variable
        )
        SELECT
          v_project_id,
          v_new_theme_id,
          name, type, value, scope, alias_of, css_variable
        FROM design_tokens
        WHERE theme_id = p_source_theme_id;

        GET DIAGNOSTICS v_token_count = ROW_COUNT;
      END IF;

      RETURN v_new_theme_id;
    END;
    $$ LANGUAGE plpgsql;

    -- 3. 토큰 검색 함수
    CREATE OR REPLACE FUNCTION search_tokens(
      p_theme_id UUID,
      p_query TEXT,
      p_include_inherited BOOLEAN DEFAULT TRUE
    )
    RETURNS TABLE (
      id UUID,
      name TEXT,
      type TEXT,
      value JSONB,
      is_inherited BOOLEAN,
      inheritance_depth INTEGER
    ) AS $$
    BEGIN
      IF p_include_inherited THEN
        RETURN QUERY
        SELECT
          r.id,
          r.name,
          r.type,
          r.value,
          r.is_inherited,
          r.inheritance_depth
        FROM resolve_theme_tokens(p_theme_id) r
        WHERE r.name ILIKE '%' || p_query || '%'
        ORDER BY r.name;
      ELSE
        RETURN QUERY
        SELECT
          t.id,
          t.name,
          t.type,
          t.value,
          FALSE AS is_inherited,
          0 AS inheritance_depth
        FROM design_tokens t
        WHERE t.theme_id = p_theme_id
          AND t.name ILIKE '%' || p_query || '%'
        ORDER BY t.name;
      END IF;
    END;
    $$ LANGUAGE plpgsql STABLE;

    -- 4. 토큰 일괄 업데이트 함수
    CREATE OR REPLACE FUNCTION bulk_upsert_tokens(p_tokens JSONB)
    RETURNS INTEGER AS $$
    DECLARE
      v_token JSONB;
      v_count INTEGER := 0;
      v_id UUID;
    BEGIN
      FOR v_token IN SELECT * FROM jsonb_array_elements(p_tokens)
      LOOP
        v_id := COALESCE((v_token->>'id')::UUID, uuid_generate_v4());

        INSERT INTO design_tokens (
          id, project_id, theme_id, name, type, value, scope, alias_of, css_variable
        ) VALUES (
          v_id,
          (v_token->>'project_id')::UUID,
          (v_token->>'theme_id')::UUID,
          v_token->>'name',
          v_token->>'type',
          v_token->'value',
          v_token->>'scope',
          v_token->>'alias_of',
          v_token->>'css_variable'
        )
        ON CONFLICT (project_id, theme_id, name, scope)
        DO UPDATE SET
          value = EXCLUDED.value,
          type = EXCLUDED.type,
          alias_of = EXCLUDED.alias_of,
          css_variable = EXCLUDED.css_variable,
          updated_at = NOW();

        v_count := v_count + 1;
      END LOOP;

      RETURN v_count;
    END;
    $$ LANGUAGE plpgsql;
  `,
};

/**
 * All migrations in order
 */
export const MIGRATIONS: Migration[] = [
  BASE_SCHEMA,
  CUSTOM_ID_MIGRATION,
  THEME_RPC_MIGRATION,
];

/**
 * Get migrations that need to be applied
 *
 * @param currentVersion - Current database version (null if fresh install)
 * @returns Array of migrations to apply
 */
export function getMigrationsToApply(currentVersion: string | null): Migration[] {
  if (!currentVersion) {
    return MIGRATIONS;
  }

  return MIGRATIONS.filter((migration) => migration.version > currentVersion);
}
