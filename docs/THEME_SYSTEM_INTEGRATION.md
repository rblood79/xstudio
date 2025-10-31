# ThemeStudio 시스템 통합 가이드

XStudio에 ThemeStudio를 통합하여 디자인 토큰 관리 시스템을 활성화하는 방법입니다.

## 📋 개요

ThemeStudio는 **DB 마이그레이션 없이** 4가지 핵심 기능을 제공합니다:
1. **TokenEditor** - 토큰 편집 UI (CRUD, 검색, 필터링)
2. **Export** - CSS, Tailwind, SCSS, JSON 형식 출력
3. **Dark Mode** - 라이트 모드 → 다크 모드 자동 변환
4. **Figma Plugin** - Figma에서 토큰 Import 가능한 Plugin 생성

**기존 DB 테이블 사용:**
- `design_themes` (테마 정보)
- `design_tokens` (토큰 데이터)

**DB 마이그레이션 불필요!** 🎉

---

## 🚀 빠른 시작 (3분)

### 1단계: 라우팅 추가

**\`src/main.tsx\`** 수정:

\`\`\`tsx
import { ThemeStudio } from './builder/theme/ThemeStudio';
import { useParams } from 'react-router';

// Routes 섹션에 추가
<Routes>
  {/* 기존 라우트들... */}
  <Route
    path="/theme/:projectId"
    element={<ProtectedRoute><ThemeStudioWrapper /></ProtectedRoute>}
  />
</Routes>

// Wrapper 컴포넌트 추가 (projectId 처리)
function ThemeStudioWrapper() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <div>Project ID가 필요합니다</div>;
  return <ThemeStudio projectId={projectId} />;
}
\`\`\`

### 2단계: CSS Import

**\`src/builder/components/index.css\`** 하단에 추가:

\`\`\`css
/* Theme Studio Styles */
@import '../theme/styles/ThemeStudio.css';
@import '../theme/styles/TokenEditor.css';
@import '../theme/styles/AIThemeGenerator.css';
@import '../theme/styles/FigmaImporter.css';
@import '../theme/styles/ThemeExporter.css';
@import '../theme/styles/DarkModeGenerator.css';
@import '../theme/styles/FigmaPluginExporter.css';
\`\`\`

### 3단계: Dashboard 버튼 추가

**\`src/dashboard/index.tsx\`** 수정 (156-162번째 줄):

\`\`\`tsx
<div className="project-actions">
  <Button
    onPress={() => navigate(\`/builder/\${project.id}\`)}
    isDisabled={loading}
    children="Edit"
    variant="surface"
  />
  {/* 🆕 ThemeStudio 버튼 추가 */}
  <Button
    onPress={() => navigate(\`/theme/\${project.id}\`)}
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
\`\`\`

### 4단계: 빌드 & 테스트

\`\`\`bash
# 타입 체크
npm run type-check

# 빌드
npm run build

# 개발 서버 시작
npm run dev
\`\`\`

---

## ✅ 통합 검증

### 수동 테스트 시나리오

1. **Dashboard → Theme 버튼**
   - [ ] 프로젝트 카드에서 "Theme" 버튼 표시
   - [ ] 클릭 시 \`/theme/:projectId\`로 이동

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

---

## 🔧 트러블슈팅

### 문제: TypeScript 타입 에러
**해결**:
\`\`\`bash
npm run type-check
\`\`\`
에러 메시지를 확인하고, 누락된 import나 타입 정의를 추가하세요.

### 문제: CSS 스타일이 적용되지 않음
**해결**: \`src/builder/components/index.css\`에 ThemeStudio 스타일 import가 추가되었는지 확인하세요.

### 문제: "Permission denied" 에러
**해결**: Supabase RLS 정책을 확인하세요. \`design_themes\`와 \`design_tokens\` 테이블에 대한 읽기/쓰기 권한이 필요합니다.

\`\`\`sql
-- RLS 정책 확인
SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('design_themes', 'design_tokens');
\`\`\`

---

## 📊 기존 DB 구조 (변경 없음)

\`\`\`
- projects (프로젝트)
- pages (페이지)
- elements (UI 요소)
- design_themes ✅ (테마 - 기존 테이블 사용)
- design_tokens ✅ (토큰 - 기존 테이블 사용)
\`\`\`

**새 테이블 생성 없음!** Index 추가도 필요 없습니다.

---

## 📚 추가 리소스

- **통합 체크리스트**: \`INTEGRATION_CHECKLIST.md\`
- **API 문서**: \`CLAUDE.md\` (프로젝트 가이드)
- **커밋 히스토리**: GitHub에서 \`claude/refactor-builder-theme-*\` 브랜치 확인

---

## 🎉 완료!

3단계만 완료하면 Dashboard에서 "Theme" 버튼을 클릭하여 ThemeStudio에 접근할 수 있습니다.

**축하합니다! ThemeStudio가 성공적으로 통합되었습니다.** 🚀

---

## 💡 추후 확장 가능

필요시 다음 기능들을 추가할 수 있습니다:

- **Version Control**: localStorage 기반 버전 관리
- **Import**: CSS Variables → XStudio 토큰
- **Theme Marketplace**: 공개 테마 공유
- **Real-time Collaboration**: 실시간 공동 편집

현재 4개 핵심 기능만으로도 충분한 가치를 제공합니다! 🎯
