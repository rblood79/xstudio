-- ============================================
-- Layout/Slot System Migration
-- Created: 2025-11-21
-- Description: Adds Layout and Slot support for page templates
-- ============================================

-- ============================================
-- 1. layouts 테이블 (신규)
-- ============================================
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT,

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약조건: 프로젝트 내 고유한 Layout 이름
  CONSTRAINT unique_layout_name_per_project UNIQUE (project_id, name)
);

-- 테이블 코멘트
COMMENT ON TABLE layouts IS 'Page templates with reusable structure and Slot placeholders';
COMMENT ON COLUMN layouts.name IS 'Layout display name (unique per project)';
COMMENT ON COLUMN layouts.description IS 'Optional description for the layout';

-- ============================================
-- 2. pages 테이블 수정
-- ============================================
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL;

COMMENT ON COLUMN pages.layout_id IS 'Optional Layout template applied to this page';

-- ============================================
-- 3. elements 테이블 수정
-- ============================================

-- Layout ID 추가 (Layout에 속한 요소)
ALTER TABLE elements
ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE;

-- Slot 이름 추가 (Page 요소가 어떤 Slot에 들어갈지)
ALTER TABLE elements
ADD COLUMN IF NOT EXISTS slot_name TEXT;

COMMENT ON COLUMN elements.layout_id IS 'Layout ID for layout elements (mutually exclusive with page_id)';
COMMENT ON COLUMN elements.slot_name IS 'Target slot name for page elements';

-- ============================================
-- 4. 제약조건 추가
-- ============================================

-- 제약조건: page_id와 layout_id 중 하나만 설정
-- (기존 데이터가 있을 수 있으므로 NOT VALID로 생성 후 VALIDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_element_owner'
  ) THEN
    ALTER TABLE elements
    ADD CONSTRAINT check_element_owner
    CHECK (
      (page_id IS NOT NULL AND layout_id IS NULL) OR
      (page_id IS NULL AND layout_id IS NOT NULL)
    )
    NOT VALID;
  END IF;
END $$;

-- 제약조건: slot_name은 Page element에만 설정 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_slot_name_page_only'
  ) THEN
    ALTER TABLE elements
    ADD CONSTRAINT check_slot_name_page_only
    CHECK (
      slot_name IS NULL OR page_id IS NOT NULL
    )
    NOT VALID;
  END IF;
END $$;

-- ============================================
-- 5. 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_layouts_project ON layouts(project_id);
CREATE INDEX IF NOT EXISTS idx_elements_layout ON elements(layout_id) WHERE layout_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_elements_slot ON elements(slot_name) WHERE slot_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_layout ON pages(layout_id) WHERE layout_id IS NOT NULL;

-- ============================================
-- 6. RLS (Row Level Security)
-- ============================================
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (idempotent)
DROP POLICY IF EXISTS "Users can view layouts in their projects" ON layouts;
DROP POLICY IF EXISTS "Users can manage layouts in their projects" ON layouts;

-- SELECT 정책
CREATE POLICY "Users can view layouts in their projects"
  ON layouts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- INSERT, UPDATE, DELETE 정책
CREATE POLICY "Users can manage layouts in their projects"
  ON layouts FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- ============================================
-- 7. Trigger: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION update_layout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_layout_updated_at ON layouts;
CREATE TRIGGER trigger_layout_updated_at
  BEFORE UPDATE ON layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_layout_updated_at();

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Layout/Slot System migration completed successfully';
END $$;
