# ThemeStudio DB 마이그레이션 요약

작성일: 2025-11-01
브랜치: claude/theme-studio-typescript-fixes-011CUbNWT6EW6DbewaTBT8iv

---

## ✅ 결론: DB 테이블 수정 없음

**ThemeStudio는 기존 DB 테이블만 사용하며, RPC 함수만 추가합니다.**

---

## 📊 기존 테이블 사용 현황

### 사용하는 기존 테이블 (수정 없음)

1. **`design_themes`** 테이블
   ```sql
   - id UUID (PK)
   - project_id UUID (FK)
   - name TEXT
   - parent_theme_id UUID (자체 참조, 상속용)
   - status TEXT (active/draft/archived)
   - version INTEGER
   - created_at TIMESTAMPTZ
   - updated_at TIMESTAMPTZ
   ```
   **용도:** 테마 메타데이터 저장

2. **`design_tokens`** 테이블
   ```sql
   - id UUID (PK)
   - project_id UUID (FK)
   - theme_id UUID (FK → design_themes)
   - name TEXT (예: color.primary.500)
   - type TEXT (color, spacing, fontSize, etc.)
   - value JSONB (예: {"h":210,"s":100,"l":50,"a":1})
   - scope TEXT (raw/semantic)
   - alias_of TEXT (토큰 참조)
   - css_variable TEXT (예: --color-primary-500)
   - created_at TIMESTAMPTZ
   - updated_at TIMESTAMPTZ
   ```
   **용도:** 디자인 토큰 저장

**✅ 이 2개 테이블은 이미 존재하며, 구조 변경 없음**

---

## 🔧 추가되는 항목: RPC 함수만

파일: `supabase/migrations/20250201_theme_rpc_functions.sql`

### 추가되는 4개 RPC 함수

#### 1. `resolve_theme_tokens(p_theme_id UUID)`
**목적:** 테마 상속 체인을 따라 모든 토큰 해석 (재귀 쿼리)

**기능:**
- 현재 테마의 토큰 조회
- parent_theme_id를 따라 부모 테마들의 토큰 조회 (최대 10단계)
- 자식 테마의 토큰이 부모 토큰을 오버라이드

**예시:**
```sql
SELECT * FROM resolve_theme_tokens('theme-uuid-here');
```

---

#### 2. `duplicate_theme(p_source_theme_id UUID, p_new_name TEXT, p_inherit BOOLEAN)`
**목적:** 테마 복제

**기능:**
- `p_inherit = false`: 완전 복제 (토큰 전체 복사)
- `p_inherit = true`: 상속 테마 (parent_theme_id만 설정, 토큰 미복사)

**예시:**
```sql
-- 완전 복제
SELECT duplicate_theme('source-theme-id', 'New Theme', false);

-- 상속 테마
SELECT duplicate_theme('source-theme-id', 'Child Theme', true);
```

---

#### 3. `search_tokens(p_theme_id UUID, p_query TEXT, p_include_inherited BOOLEAN)`
**목적:** 토큰 이름으로 검색 (Full-Text Search)

**기능:**
- `p_include_inherited = true`: 상속된 토큰 포함
- `p_include_inherited = false`: 현재 테마 토큰만

**예시:**
```sql
SELECT * FROM search_tokens('theme-uuid', 'color', true);
```

---

#### 4. `bulk_upsert_tokens(p_tokens JSONB)`
**목적:** 토큰 일괄 삽입/업데이트 (Upsert)

**기능:**
- JSONB 배열로 전달된 토큰들을 일괄 처리
- 중복 시 (project_id, theme_id, name, scope 기준) 값만 업데이트

**예시:**
```sql
SELECT bulk_upsert_tokens('[
  {
    "project_id": "proj-uuid",
    "theme_id": "theme-uuid",
    "name": "color.primary.500",
    "type": "color",
    "value": {"h":210,"s":100,"l":50,"a":1},
    "scope": "raw"
  },
  {
    "project_id": "proj-uuid",
    "theme_id": "theme-uuid",
    "name": "spacing.md",
    "type": "spacing",
    "value": "16px",
    "scope": "raw"
  }
]'::jsonb);
```

---

## 🚫 추가되지 않는 항목

### ❌ 새 테이블 생성 없음

다음 테이블들은 **생성되지 않습니다**:
- ❌ `theme_versions` (Version Control 기능 제거됨)
- ❌ `theme_exports` (Export는 클라이언트 side만 처리)
- ❌ `theme_snapshots`
- ❌ 기타 새 테이블 없음

### ❌ 기존 테이블 컬럼 추가 없음

`design_themes` 테이블: 컬럼 추가 없음
`design_tokens` 테이블: 컬럼 추가 없음

### ❌ 제약조건 변경 없음

- Foreign Key 추가 없음
- Unique Constraint 추가 없음
- Check Constraint 추가 없음

---

## 📋 Migration 파일 목록

### Theme 시스템 관련
```bash
supabase/migrations/20250201_theme_rpc_functions.sql
```
**내용:** RPC 함수 4개만 추가 (테이블 수정 없음)

### 기타 (Theme 무관)
```bash
supabase/migrations/20250129_add_custom_id_to_elements.sql
```
**내용:** `elements` 테이블에 `custom_id` 컬럼 추가 (Builder 시스템용, Theme와 무관)

---

## 🎯 4개 기능별 DB 사용 현황

### Feature 1: Token Editor
- **사용 테이블:** `design_themes`, `design_tokens`
- **테이블 수정:** ❌ 없음
- **RPC 함수:** `search_tokens()`, `bulk_upsert_tokens()` 사용
- **CRUD:** 기존 Supabase API 사용

### Feature 2: Export (CSS, Tailwind, SCSS, JSON)
- **사용 테이블:** `design_tokens` (읽기만)
- **테이블 수정:** ❌ 없음
- **RPC 함수:** 사용 안함
- **처리:** 클라이언트 side에서 변환 후 다운로드

### Feature 3: Dark Mode Generator
- **사용 테이블:** `design_themes`, `design_tokens`
- **테이블 수정:** ❌ 없음
- **RPC 함수:** `duplicate_theme()` 사용 (새 테마 생성)
- **처리:** 클라이언트에서 색상 변환 → 새 테마 저장

### Feature 4: Figma Plugin Export
- **사용 테이블:** `design_tokens` (읽기만)
- **테이블 수정:** ❌ 없음
- **RPC 함수:** 사용 안함
- **처리:** 클라이언트 side에서 Figma Plugin 파일 생성 후 다운로드

---

## ✅ 최종 확인

### DB 마이그레이션 필요성

| 항목 | 필요 여부 | 설명 |
|------|----------|------|
| 테이블 생성 | ❌ 없음 | 기존 테이블 사용 |
| 테이블 수정 | ❌ 없음 | 컬럼 추가 없음 |
| 인덱스 추가 | ❌ 없음 | 기존 인덱스로 충분 |
| RPC 함수 추가 | ✅ **있음** | 4개 함수 생성 필요 |

### Migration 실행 방법

**Option A: Supabase CLI 사용**
```bash
# Migration 파일 적용
supabase db push

# 또는
supabase migration up
```

**Option B: Supabase Dashboard**
1. Supabase Dashboard → SQL Editor
2. `20250201_theme_rpc_functions.sql` 파일 내용 복사
3. 쿼리 실행

**Option C: DB 관리 도구 (pgAdmin, DBeaver 등)**
1. PostgreSQL 접속
2. SQL 파일 실행

---

## 🔒 RLS (Row Level Security) 정책

**기존 RLS 정책 그대로 사용:**

### `design_themes` 테이블
```sql
-- SELECT: 프로젝트 멤버만 조회 가능
CREATE POLICY "Users can view themes in their projects"
  ON design_themes FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- INSERT: 프로젝트 소유자만 생성 가능
CREATE POLICY "Users can create themes in their projects"
  ON design_themes FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- UPDATE: 프로젝트 소유자만 수정 가능
CREATE POLICY "Users can update themes in their projects"
  ON design_themes FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- DELETE: 프로젝트 소유자만 삭제 가능
CREATE POLICY "Users can delete themes in their projects"
  ON design_themes FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));
```

### `design_tokens` 테이블
```sql
-- SELECT: 프로젝트 멤버만 조회 가능
CREATE POLICY "Users can view tokens in their projects"
  ON design_tokens FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- INSERT: 프로젝트 소유자만 생성 가능
CREATE POLICY "Users can create tokens in their projects"
  ON design_tokens FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- UPDATE: 프로젝트 소유자만 수정 가능
CREATE POLICY "Users can update tokens in their projects"
  ON design_tokens FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

-- DELETE: 프로젝트 소유자만 삭제 가능
CREATE POLICY "Users can delete tokens in their projects"
  ON design_tokens FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));
```

**RLS 정책 수정 없음** ✅

---

## 📝 요약

### DB 마이그레이션 상태

```
테이블 생성: 0개
테이블 수정: 0개
컬럼 추가: 0개
인덱스 추가: 0개
RPC 함수 추가: 4개 ✅
RLS 정책 변경: 0개

총 변경 사항: RPC 함수 4개만 추가
```

### 결론

**ThemeStudio 4개 기능은 "Zero Migration" 원칙을 준수합니다.**

- ✅ 기존 DB 테이블 구조 그대로 사용
- ✅ RPC 함수만 추가 (선택사항, 클라이언트 로직으로도 대체 가능)
- ✅ 기존 애플리케이션에 영향 없음
- ✅ 롤백 간단 (함수만 DROP하면 됨)

**Migration 파일 실행만 하면 즉시 사용 가능합니다!**

---

**작성일:** 2025-11-01
**브랜치:** claude/theme-studio-typescript-fixes-011CUbNWT6EW6DbewaTBT8iv
