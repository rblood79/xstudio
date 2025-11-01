# ThemeStudio 통합 체크리스트

## ✅ 완료된 작업
- [x] Feature 1: TokenEditor 구현
- [x] Feature 2: Export 기능 (CSS, Tailwind, SCSS, JSON)
- [x] Feature 3: Dark Mode 자동 변환
- [x] Feature 4: Figma Plugin Export

**Note**: Version Control 기능은 DB 마이그레이션 없이 진행하기 위해 제외되었습니다.

## 🔧 통합 필수 작업 (DB 마이그레이션 불필요)

### 1. 라우팅 통합
- [ ] `src/main.tsx`에 `/theme/:projectId` 라우트 추가
- [ ] `ThemeStudio` 컴포넌트에서 `useParams`로 projectId 가져오기
- [ ] ProtectedRoute로 인증 보호

### 2. CSS Import
- [ ] `src/builder/components/index.css`에 ThemeStudio 스타일 import
  - [ ] ThemeStudio.css
  - [ ] TokenEditor.css
  - [ ] AIThemeGenerator.css
  - [ ] FigmaImporter.css
  - [ ] ThemeExporter.css
  - [ ] DarkModeGenerator.css
  - [ ] FigmaPluginExporter.css

### 3. Dashboard 통합
- [ ] `src/dashboard/index.tsx`에 "Theme" 버튼 추가
- [ ] 버튼 클릭 시 `/theme/:projectId`로 이동

### 4. 테스트
- [ ] 수동 테스트
  1. [ ] Dashboard → Theme 버튼 클릭
  2. [ ] TokenEditor: 토큰 CRUD 동작
  3. [ ] Export: CSS/Tailwind/SCSS/JSON 다운로드
  4. [ ] Dark Mode: 프리셋 선택 및 변환
  5. [ ] Figma Plugin: 파일 생성 및 다운로드

- [ ] 브라우저 호환성
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

### 5. 문서화
- [ ] 사용자 가이드 작성 (선택)
- [ ] 변경 로그 업데이트 (선택)

## 📝 선택적 개선 사항

### 성능 최적화
- [ ] TokenEditor: 가상 스크롤링 (1000개 이상 토큰 시)
- [ ] Export: Web Worker로 대용량 파일 생성

### UX 개선
- [ ] 토큰 검색: Fuzzy search (Fuse.js)
- [ ] 키보드 단축키 (Ctrl+S: 저장, Ctrl+Z: Undo)
- [ ] Drag & Drop 토큰 정렬

### 추가 기능
- [ ] Import: CSS Variables → XStudio 토큰
- [ ] Theme Marketplace: 공개 테마 공유
- [ ] Collaboration: 실시간 공동 편집
- [ ] Version Control: localStorage 기반 버전 관리 (추후)

## 🚀 배포 전 확인

### 환경 변수
- [ ] `VITE_SUPABASE_URL` 설정
- [ ] `VITE_SUPABASE_ANON_KEY` 설정

### 빌드
- [ ] `npm run build` 성공
- [ ] `npm run type-check` 통과
- [ ] 번들 크기 확인 (< 500KB 권장)

### 보안
- [ ] RLS 정책 검증
- [ ] API 권한 확인
- [ ] XSS/CSRF 방어 확인

---

## 📦 통합 완료 후 다음 단계

1. **PR 생성**: GitHub에서 `claude/refactor-builder-theme-*` → `main` PR
2. **코드 리뷰**: 팀원에게 리뷰 요청
3. **QA 테스트**: 스테이징 환경에서 전체 테스트
4. **배포**: Production 배포 후 모니터링

---

## 🎉 4개 핵심 기능으로 충분한 가치 제공

ThemeStudio는 DB 마이그레이션 없이도 다음 4가지 핵심 기능을 제공합니다:

1. **TokenEditor** - 디자인 토큰 편집 (가장 중요)
2. **Export** - 다양한 형식으로 출력 (실용적)
3. **Dark Mode** - 자동 변환 (차별화)
4. **Figma Plugin** - Figma 통합 (생산성)

Version Control은 필요시 localStorage 기반으로 추후 추가 가능합니다.
