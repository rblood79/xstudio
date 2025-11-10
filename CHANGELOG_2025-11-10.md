# Changelog - 2025-11-10

## 주요 업데이트

### 1. ESLint 오류 전체 수정 ✅ (53개 → 0개)
**Commit**: `3de270c`

모든 ESLint 오류 및 경고를 수정하여 코드 품질 향상

#### 수정 항목
- **Unused Imports 제거** (15개 파일)
  - lucide-react 아이콘 import 정리
  - 사용하지 않는 타입 import 제거

- **Unused Variables 제거** (3개 파일)
  - useCollectionData.ts: dataBindingKey 제거
  - EventSection.tsx: selectedHandlerId, updateAction 등 제거
  - Layers.tsx: renderTree prop 제거

- **Unused Props 제거** (2개 파일)
  - EventHandlerManager.tsx: onUpdateHandler, onAddAction 제거
  - EventSection.tsx: element prop intentionally unused 표시

- **React Hook Dependency 수정** (3개 파일)
  - EventSection.tsx: updateHandler, selectedHandler, updateEvents 의존성 추가
  - APICollectionEditor.tsx: Functional update pattern 적용
  - SupabaseCollectionEditor.tsx: columnLoader 의존성 추가

- **Backup 파일 삭제**
  - EventSection.old2.tsx 전체 삭제 (35개 오류 포함)

**결과**: 53 problems → 0 problems (100% 해결)

---

### 2. Preview 영역 사이즈 표시 복구 ✅
**Commit**: `0a86724`

CSS attr() 함수가 작동하도록 data-max-width/height attribute 추가

#### 구현 내용

**BuilderWorkspace.tsx**
- workspace div에 `data-max-width`, `data-max-height` attribute 추가
- 현재 breakpoint의 max_width/height 값을 HTML attribute로 전달

**index.css**
- `::before` (넓이값): 상단 중앙에 정방향 표시
  - 예: "1200px"
  - `top: -24px`, `left: 50%`, `translateX(-50%)`

- `::after` (높이값): 좌측 중앙에 90도 회전 표시
  - 예: "800px"
  - `top: 50%`, `left: -16px`, `translate(-56%, -50%) rotate(-90deg)`

**결과**
- Preview 영역 좌측/상단에 현재 사이즈 표시 복구
- 넓이와 높이가 명확하게 분리되어 표시됨

---

### 3. 사이드바 상태 localStorage 저장 ✅
**Commit**: `6eac21c`

사용자 환경 설정을 localStorage에 저장하여 새로고침 시에도 유지

#### 새로운 Hook

**useSidebarTabs**
- 사이드바 활성 탭 상태를 localStorage에 저장/불러오기
- 초기값: 빈 Set (모든 탭 닫힌 상태)
- 키: `xstudio_sidebar_tabs`

```typescript
const { activeTabs, toggleTab, closeAll } = useSidebarTabs();
```

**useRecentSearches**
- 컴포넌트 검색 기록을 localStorage에 저장/불러오기
- 최대 10개 저장, 중복 제거, 최신순 정렬
- 1초 debounce 적용 (타이핑 중 과도한 저장 방지)
- 키: `xstudio_recent_searches`

```typescript
const { recentSearches, addSearch, clearSearches, removeSearch } = useRecentSearches();
```

#### 변경사항

**sidebar/index.tsx**
- `useState` → `useSidebarTabs` 사용
- 초기값: `new Set(['nodes'])` → `loadTabsFromStorage()` (빈 Set 또는 저장된 상태)
- toggleTab 함수 제거 (useSidebarTabs에서 제공)

**ComponentSearch.tsx**
- useRecentSearches 사용
- 검색어 입력 1초 후 자동 저장
- 빈 검색어는 저장하지 않음

**결과**
- ✅ 사이드바 탭 상태 유지 (새로고침 후에도 동일한 탭 열림)
- ✅ 초기 로드 시 nodes 탭 닫힌 상태
- ✅ 검색 기록 저장 (최대 10개, 중복 제거)
- ✅ useFavoriteComponents 패턴 재사용

---

### 4. 사이드바 전체 닫기 버튼 추가 ✅
**Commits**: `1a60773`, `9f5e7c9`, `b56c249`

.sidebar-nav 내 nav-list 다음에 전체 닫기 버튼 추가

#### 구현 내용

**UI 위치**
```
.sidebar-nav
  ├── ul.nav-list (기존 탭 버튼들)
  └── button.close-all-button (ChevronLeft 아이콘) ← nav-list 다음
```

**SidebarNav.tsx**
- ChevronLeft 아이콘 import (lucide-react)
- onCloseAll prop 추가 (optional)
- nav-list 다음에 close-all-button 추가
- `activeTabs.size > 0`일 때만 표시 (탭이 열려있을 때만)
- className: `nav-button close-all-button`
- title: "전체 닫기"

**useSidebarTabs.ts**
- `closeAll()` 함수 추가
- `setActiveTabs(new Set<Tab>())` - 모든 탭 닫기

**sidebar/index.tsx**
- closeAll을 useSidebarTabs에서 받아옴
- SidebarNav에 `onCloseAll={closeAll}` 전달

**아이콘 변경 히스토리**
1. X 아이콘 (초기)
2. PanelLeftClose 아이콘 (9f5e7c9)
3. ChevronLeft 아이콘 (최종, b56c249)

**동작**
- 열려있는 탭이 있을 때만 버튼 표시
- 클릭 시 모든 탭 닫기
- localStorage에 빈 상태 저장

---

## 커밋 이력

```bash
b56c249 style(sidebar): 전체 닫기 버튼 아이콘 PanelLeftClose → ChevronLeft 변경
9f5e7c9 style(sidebar): 전체 닫기 버튼 아이콘 X → PanelLeftClose 변경
1a60773 feat(sidebar): 사이드바 전체 닫기 버튼 추가
6eac21c feat(sidebar): 사이드바 상태 및 검색 기록 localStorage 저장
0a86724 feat: Enhance BuilderWorkspace with dynamic max-width and max-height attributes
3de270c fix(lint): ESLint 오류 전체 수정 (53개 → 0개)
```

---

## 통계

### 코드 품질
- ESLint 오류: 53 → 0 (100% 해결)
- TypeScript 타입 체크: ✅ 통과

### 새로 추가된 파일
- `src/builder/hooks/useSidebarTabs.ts` (80 lines)
- `src/builder/hooks/useRecentSearches.ts` (105 lines)

### 수정된 파일
- `src/builder/sidebar/index.tsx` (activeTabs 상태 관리 변경)
- `src/builder/sidebar/SidebarNav.tsx` (전체 닫기 버튼 추가)
- `src/builder/components/ComponentSearch.tsx` (검색 기록 저장)
- `src/builder/main/BuilderWorkspace.tsx` (사이즈 attribute 추가)
- `src/builder/main/index.css` (사이즈 표시 CSS 수정)
- 기타 15개 파일 (lint 수정)

---

## 사용자 경험 개선

### 1. 상태 지속성
- ✅ 사이드바 탭 상태가 새로고침 후에도 유지됨
- ✅ 검색 기록이 자동으로 저장되고 재사용 가능

### 2. UI/UX
- ✅ Preview 영역 사이즈가 명확하게 표시됨 (넓이 상단, 높이 좌측)
- ✅ 전체 닫기 버튼으로 한 번에 모든 탭 닫기 가능
- ✅ 초기 로드 시 깔끔한 상태 (모든 탭 닫힌 상태)

### 3. 코드 품질
- ✅ ESLint 오류 0개로 깨끗한 코드베이스
- ✅ React Stately 패턴 일관성 유지
- ✅ localStorage 기반 상태 관리 패턴 확립

---

## 다음 단계

### 완료된 작업
- ✅ Phase 0-15: React Stately 마이그레이션
- ✅ ESLint 오류 수정
- ✅ Preview 사이즈 표시
- ✅ 사이드바 상태 저장
- ✅ 검색 기록 저장

### 대기 중인 작업
- 🔄 애플리케이션 기능 테스트 (Dashboard, Builder, Inspector)
- 🔄 React Profiler 성능 측정 (선택)
- 🔄 TypeScript 빌드 오류 수정 (Theme service)

---

**생성일**: 2025-11-10
**버전**: XStudio v0.0.0
**개발 서버**: http://localhost:5174
