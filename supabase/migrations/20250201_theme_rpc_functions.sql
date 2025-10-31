-- =====================================================
-- Theme System V3: RPC Functions Only (Zero Migration)
-- 기존 design_themes, design_tokens 테이블 활용
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
  WHERE th.depth < 10  -- 무한 루프 방지 (최대 10단계)
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
ORDER BY t.name, t.scope, th.depth ASC;  -- 가장 가까운 테마의 토큰 우선
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION resolve_theme_tokens IS '테마 상속 체인을 따라 모든 토큰을 해석합니다. 자식 테마의 토큰이 부모 테마의 토큰을 오버라이드합니다.';

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
  -- 원본 테마의 project_id 가져오기
  SELECT project_id INTO v_project_id
  FROM design_themes
  WHERE id = p_source_theme_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION '원본 테마를 찾을 수 없습니다: %', p_source_theme_id;
  END IF;

  -- 새 테마 생성
  INSERT INTO design_themes (project_id, name, parent_theme_id, status, version)
  VALUES (
    v_project_id,
    p_new_name,
    CASE WHEN p_inherit THEN p_source_theme_id ELSE NULL END,
    'draft',
    1
  )
  RETURNING id INTO v_new_theme_id;

  -- 상속이 아니면 토큰 전체 복사
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

    RAISE NOTICE '% 개의 토큰이 복사되었습니다', v_token_count;
  ELSE
    RAISE NOTICE '상속 테마로 생성되었습니다. 토큰은 복사되지 않았습니다';
  END IF;

  RETURN v_new_theme_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION duplicate_theme IS '테마를 복제합니다. p_inherit=true면 상속 테마(토큰 미복사), false면 완전 복제(토큰 복사)';

-- 3. 토큰 검색 함수 (Full-Text Search)
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
    -- 상속된 토큰 포함
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
    -- 현재 테마의 토큰만
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

COMMENT ON FUNCTION search_tokens IS '토큰을 이름으로 검색합니다. p_include_inherited=true면 상속된 토큰도 포함';

-- 4. 토큰 일괄 업데이트 함수
CREATE OR REPLACE FUNCTION bulk_upsert_tokens(p_tokens JSONB)
RETURNS INTEGER AS $$
DECLARE
  v_token JSONB;
  v_count INTEGER := 0;
  v_id UUID;
BEGIN
  -- JSONB 배열의 각 토큰 처리
  FOR v_token IN SELECT * FROM jsonb_array_elements(p_tokens)
  LOOP
    -- ID 생성 또는 기존 ID 사용
    v_id := COALESCE((v_token->>'id')::UUID, gen_random_uuid());

    -- Upsert (INSERT or UPDATE)
    INSERT INTO design_tokens (
      id,
      project_id,
      theme_id,
      name,
      type,
      value,
      scope,
      alias_of,
      css_variable
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

COMMENT ON FUNCTION bulk_upsert_tokens IS 'JSONB 배열로 전달된 토큰들을 일괄 삽입/업데이트합니다. 중복 시 값만 업데이트';

-- =====================================================
-- 테스트 쿼리 (선택적)
-- =====================================================

-- 테스트 1: 테마 상속 해석
-- SELECT * FROM resolve_theme_tokens('your-theme-id-here');

-- 테스트 2: 테마 복제
-- SELECT duplicate_theme('source-theme-id', 'New Theme Name', false);

-- 테스트 3: 토큰 검색
-- SELECT * FROM search_tokens('your-theme-id', 'color', true);

-- 테스트 4: 토큰 일괄 삽입
-- SELECT bulk_upsert_tokens('[{"project_id":"...","theme_id":"...","name":"test.token","type":"color","value":{"h":210,"s":100,"l":50,"a":1},"scope":"raw"}]'::jsonb);

-- =====================================================
-- 완료
-- =====================================================

SELECT 'Theme System V3 RPC functions created successfully!' AS status,
       'Functions: resolve_theme_tokens, duplicate_theme, search_tokens, bulk_upsert_tokens' AS created_functions;
