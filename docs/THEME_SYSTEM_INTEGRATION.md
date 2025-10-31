# ThemeStudio 시스템 통합 가이드

XStudio에 ThemeStudio를 통합하여 디자인 토큰 관리 시스템을 활성화하는 방법입니다.

## 📋 개요

ThemeStudio는 5가지 핵심 기능을 제공합니다:
1. **TokenEditor** - 토큰 편집 UI (CRUD, 검색, 필터링)
2. **Export** - CSS, Tailwind, SCSS, JSON 형식 출력
3. **Dark Mode** - 라이트 모드 → 다크 모드 자동 변환
4. **Figma Plugin** - Figma에서 토큰 Import 가능한 Plugin 생성
5. **Version Control** - Git-like 버전 관리 시스템

## 🚀 빠른 시작 (5분)

### 1단계: 데이터베이스 마이그레이션

Supabase Dashboard → SQL Editor에서 실행:

```bash
# 마이그레이션 파일 위치
docs/migrations/001_theme_versions.sql
```

또는 직접 복사-붙여넣기:

```sql
-- theme_versions 테이블 생성
CREATE TABLE IF NOT EXISTS theme_versions (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  version TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot JSONB NOT NULL,
  parent_version_id TEXT,
  CONSTRAINT fk_theme FOREIGN KEY (theme_id)
    REFERENCES design_themes(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_theme_versions_theme_id ON theme_versions(theme_id);
CREATE INDEX idx_theme_versions_created_at ON theme_versions(created_at DESC);

-- RLS 활성화
ALTER TABLE theme_versions ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their theme versions"
  ON theme_versions FOR SELECT
  USING (
    theme_id IN (
      SELECT id FROM design_themes
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create theme versions"
  ON theme_versions FOR INSERT
  WITH CHECK (
    theme_id IN (
      SELECT id FROM design_themes
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    )
  );
```

### 2단계: 라우팅 추가

**`src/main.tsx`** 수정:

```tsx
import { ThemeStudio } from './builder/theme/ThemeStudio';

// Routes 섹션에 추가
<Routes>
  {/* 기존 라우트들... */}
  <Route
    path="/theme/:projectId"
    element={<ProtectedRoute><ThemeStudio /></ProtectedRoute>}
  />
</Routes>
```

**`src/builder/theme/ThemeStudio.tsx`** 수정:

```tsx
import { useParams } from 'react-router';

export function ThemeStudio() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <div>Project ID가 필요합니다</div>;
  }

  // 나머지 코드는 그대로...
}
```

### 3단계: CSS Import

**`src/builder/components/index.css`** 하단에 추가:

```css
/* Theme Studio Styles */
@import './styles/ThemeStudio.css';
@import './styles/TokenEditor.css';
@import './styles/AIThemeGenerator.css';
@import './styles/FigmaImporter.css';
@import './styles/ThemeExporter.css';
@import './styles/DarkModeGenerator.css';
@import './styles/FigmaPluginExporter.css';
@import './styles/VersionHistory.css';
```

### 4단계: Dashboard 버튼 추가

**`src/dashboard/index.tsx`** 수정 (156-162번째 줄):

```tsx
<div className="project-actions">
  <Button
    onPress={() => navigate(`/builder/${project.id}`)}
    isDisabled={loading}
    children="Edit"
    variant="surface"
  />
  {/* 🆕 ThemeStudio 버튼 추가 */}
  <Button
    onPress={() => navigate(`/theme/${project.id}`)}
    isDisabled={loading}
    children="Theme"
    variant="surface"
  />
  <Button
    onPress={() => handleDeleteProject(project.id)}
    isDisabled={loading}
    children="Del"
    variant="ghost"
  />
</div>
```

### 5단계: Service TODO 구현

**A. `src/services/theme/ThemeVersionService.ts`**

```typescript
import { supabase } from '../../env/supabase.client';

// createVersion 메서드
const { error } = await supabase.from('theme_versions').insert(version);
if (error) throw new Error(`Version creation failed: ${error.message}`);

// getVersionHistory 메서드
const { data, error } = await supabase
  .from('theme_versions')
  .select('*')
  .eq('theme_id', themeId)
  .order('created_at', { ascending: false });

// getVersion 메서드
const { data, error } = await supabase
  .from('theme_versions')
  .select('*')
  .eq('id', versionId)
  .single();
```

**B. `src/services/theme/TokenService.ts`** (bulkCreate/bulkUpdate 추가)

```typescript
static async bulkCreate(themeId: string, tokens: DesignToken[]): Promise<void> {
  const { error } = await supabase
    .from('design_tokens')
    .insert(tokens.map(token => ({ ...token, theme_id: themeId })));
  if (error) throw new Error(`Bulk token creation failed: ${error.message}`);
}

static async bulkUpdate(themeId: string, tokens: DesignToken[]): Promise<void> {
  await supabase.from('design_tokens').delete().eq('theme_id', themeId);
  await this.bulkCreate(themeId, tokens);
}
```

### 6단계: 빌드 & 테스트

```bash
# 타입 체크
npm run type-check

# 빌드
npm run build

# 개발 서버 시작
npm run dev
```

## ✅ 통합 검증

### 수동 테스트 시나리오

1. **Dashboard → Theme 버튼**
   - [ ] 프로젝트 카드에서 "Theme" 버튼 표시
   - [ ] 클릭 시 `/theme/:projectId`로 이동

2. **TokenEditor**
   - [ ] 토큰 목록 표시
   - [ ] 검색 기능 동작
   - [ ] 카테고리/Scope 필터 동작
   - [ ] 토큰 생성/수정/삭제
   - [ ] 색상 편집기 (HSL inputs)

3. **Export**
   - [ ] CSS Variables 다운로드
   - [ ] Tailwind Config 다운로드
   - [ ] SCSS Variables 다운로드
   - [ ] JSON 다운로드

4. **Dark Mode**
   - [ ] 프리셋 선택 (default, oled, soft, highContrast)
   - [ ] 미리보기 표시
   - [ ] 다크 테마 생성

5. **Figma Plugin**
   - [ ] Plugin 이름 입력
   - [ ] manifest.json, code.ts, ui.html 생성
   - [ ] 파일 다운로드

6. **Version Control**
   - [ ] Commit 생성
   - [ ] 버전 타임라인 표시
   - [ ] 버전 비교 (diff)
   - [ ] 이전 버전으로 복원

## 🔧 트러블슈팅

### 문제: "theme_versions 테이블이 없습니다"
**해결**: 1단계 마이그레이션 스크립트를 다시 실행하세요.

### 문제: "Permission denied" 에러
**해결**: Supabase RLS 정책이 올바르게 설정되었는지 확인하세요.

```sql
-- RLS 정책 확인
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'theme_versions';
```

### 문제: CSS 스타일이 적용되지 않음
**해결**: `src/builder/components/index.css`에 ThemeStudio 스타일 import가 추가되었는지 확인하세요.

### 문제: TypeScript 타입 에러
**해결**:
```bash
npm run type-check
```
에러 메시지를 확인하고, 누락된 import나 타입 정의를 추가하세요.

## 📚 추가 리소스

- **통합 체크리스트**: `INTEGRATION_CHECKLIST.md`
- **마이그레이션 스크립트**: `docs/migrations/001_theme_versions.sql`
- **API 문서**: `CLAUDE.md` (프로젝트 가이드)
- **커밋 히스토리**: GitHub에서 `claude/refactor-builder-theme-*` 브랜치 확인

## 🎉 완료!

모든 단계가 완료되면 Dashboard에서 "Theme" 버튼을 클릭하여 ThemeStudio에 접근할 수 있습니다.

**축하합니다! ThemeStudio가 성공적으로 통합되었습니다.** 🚀
