-- ============================================
-- Nested Routes & Slug System Migration
-- Created: 2025-11-29
-- Description: Adds order_num and slug fields to layouts table for nested route support
-- Related: docs/features/NESTED_ROUTES_SLUG_SYSTEM.md
-- ============================================

-- ============================================
-- 1. layouts 테이블에 필드 추가
-- ============================================

-- order_num: 정렬 순서
ALTER TABLE layouts
ADD COLUMN IF NOT EXISTS order_num INTEGER DEFAULT 0;

-- slug: URL base path (e.g., "/products")
ALTER TABLE layouts
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 컬럼 코멘트
COMMENT ON COLUMN layouts.order_num IS 'Sort order for layouts within a project';
COMMENT ON COLUMN layouts.slug IS 'URL base path for pages using this layout (e.g., /products)';

-- ============================================
-- 2. 인덱스 생성
-- ============================================

-- order_num 인덱스 (정렬 성능)
CREATE INDEX IF NOT EXISTS idx_layout_order
  ON layouts(project_id, order_num);

-- slug 인덱스 (URL 조회 성능)
CREATE INDEX IF NOT EXISTS idx_layout_slug
  ON layouts(slug)
  WHERE slug IS NOT NULL;

-- ============================================
-- 3. Unique constraint (프로젝트 내 slug 고유)
-- ============================================

-- slug는 프로젝트 내에서 고유해야 함 (NULL은 여러 개 허용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_layout_slug_project_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_layout_slug_project_unique
      ON layouts(project_id, slug)
      WHERE slug IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 4. pages 테이블에 parent_id 확인/추가
-- ============================================

-- parent_id가 이미 있는지 확인하고 없으면 추가
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES pages(id) ON DELETE SET NULL;

-- parent_id 인덱스 (계층 구조 조회 성능)
CREATE INDEX IF NOT EXISTS idx_pages_parent
  ON pages(parent_id)
  WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN pages.parent_id IS 'Parent page ID for nested route hierarchy';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Nested Routes & Slug System migration completed successfully';
  RAISE NOTICE '   - Added layouts.order_num column';
  RAISE NOTICE '   - Added layouts.slug column with unique constraint per project';
  RAISE NOTICE '   - Verified pages.parent_id column for nested routes';
END $$;
