-- =============================================
-- G.1/G.2 Data Model Migration
-- Component-Instance System + Design Variable Reference
--
-- 이 파일은 참조용이며 직접 실행하지 않습니다.
-- Supabase Dashboard 또는 migration tool에서 실행하세요.
--
-- @see docs/WASM_DOC_IMPACT_ANALYSIS.md §C Step 1'
-- =============================================

-- =============================================
-- G.1: elements 테이블 확장 (Component-Instance)
-- =============================================

-- 컴포넌트 역할: master(원본) 또는 instance(참조)
ALTER TABLE elements
  ADD COLUMN component_role TEXT CHECK (component_role IN ('master', 'instance'));

-- instance가 참조하는 master element ID
ALTER TABLE elements
  ADD COLUMN master_id UUID REFERENCES elements(id) ON DELETE SET NULL;

-- instance 직접 props 오버라이드
ALTER TABLE elements
  ADD COLUMN overrides JSONB;

-- instance 하위 자손 노드별 오버라이드
ALTER TABLE elements
  ADD COLUMN descendants JSONB;

-- master 컴포넌트 표시 이름
ALTER TABLE elements
  ADD COLUMN component_name TEXT;

-- master_id 인덱스 (instance → master 조회 최적화)
CREATE INDEX idx_elements_master_id
  ON elements(master_id)
  WHERE master_id IS NOT NULL;

-- component_role 인덱스 (master 목록 조회)
CREATE INDEX idx_elements_component_role
  ON elements(component_role)
  WHERE component_role IS NOT NULL;

-- =============================================
-- G.2: elements 테이블 확장 (Variable Bindings)
-- =============================================

-- 이 요소가 참조하는 디자인 변수 목록
ALTER TABLE elements
  ADD COLUMN variable_bindings TEXT[];

-- =============================================
-- G.2: design_variables 테이블 (신규)
-- =============================================

CREATE TABLE design_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('color', 'string', 'number')),
  values JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  "group" TEXT,
  token_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- 프로젝트별 변수 조회 인덱스
CREATE INDEX idx_design_variables_project
  ON design_variables(project_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_design_variables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_design_variables_updated_at
  BEFORE UPDATE ON design_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_design_variables_updated_at();
