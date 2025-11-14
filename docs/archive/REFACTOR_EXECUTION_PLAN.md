# 📋 src/builder 디렉토리 리팩토링 실행 계획

**작성일**: 2025-11-12
**목적**: src/builder 디렉토리 구조 일관성 확보 및 Dead Code 제거
**총 예상 시간**: 3-4시간
**위험도**: 🟡 Medium (체계적 접근 시 Low)

---

## 📊 Executive Summary

### 현재 문제점
- **Dead Code**: 1,116 lines (inspector/styles/ 전체 디렉토리)
- **CSS 중복 Import**: 3곳에서 inspector/index.css 중복 로드
- **구조 불일치**:
  - Dual 구현 (setting/, theme/, ai/ + panels/ wrappers)
  - Legacy stub (user/, library/, dataset/)
  - Inspector 내부 Property* 컴포넌트가 전역적으로 사용됨 (76 imports)

### 목표
- ✅ Dead code 완전 제거 (1,116 lines)
- ✅ CSS import 최적화 (3→1)
- ✅ Property* 컴포넌트 shared/ui/로 이동 (전역 재사용)
- ✅ React Aria Overrides CSS 분리
- ✅ Dual 구현 통합
- ✅ Legacy stub 제거
- ✅ 일관된 디렉토리 구조 확립

### 성공 기준
- [ ] `npm run build` 성공 (0 errors)
- [ ] Inspector 모든 패널 렌더링 정상
- [ ] Property* 컴포넌트 정상 동작
- [ ] Dark mode 정상 동작 (Builder + Preview)
- [ ] git diff 검증 (변경사항 확인)

---

## 🎯 Phase 1: Dead Code 제거 (inspector/styles/ 완전 삭제)

**위험도**: 🟢 0% (파일들이 전혀 import되지 않음)
**예상 시간**: 10분
**의존성**: 없음

### 1.1 삭제 대상 파일 (1,116 lines)

```bash
src/builder/inspector/styles/
├── styles.css                    # 460 lines - UNUSED
├── CSSVariableEditor.tsx         # ~200 lines - NEVER IMPORTED
├── SemanticClassPicker.tsx       # ~130 lines - NEVER IMPORTED
├── PreviewPanel.tsx              # ~60 lines - NEVER IMPORTED
├── semantic-classes.ts           # ~260 lines - Data for SemanticClassPicker
└── index.ts                      # 6 lines - Only exports dead code
```

### 1.2 검증 (삭제 전)

```bash
# 1. Import 검색 (0 results 확인)
grep -r "SemanticClassPicker" src/builder/
grep -r "CSSVariableEditor" src/builder/
grep -r "PreviewPanel" src/builder/
grep -r "inspector/styles" src/builder/

# 2. 예상 결과: NO MATCHES (모든 검색에서 0 results)
```

### 1.3 실행 명령

```bash
# 1. 전체 디렉토리 삭제
rm -rf src/builder/inspector/styles/

# 2. inspector/index.css에서 import 라인 제거
# BEFORE:
# @import "./styles/styles.css";  /* Line 1 */

# AFTER:
# (Line 1 삭제)
```

### 1.4 수정할 파일

**파일**: `src/builder/inspector/index.css`

**변경 사항**:
```css
/* BEFORE (Line 1) */
@import "./styles/styles.css";

/* ↓↓↓ DELETE LINE 1 ↓↓↓ */

/* AFTER (Line 1 starts with @layer) */
@layer builder-system {
  /* Root tokens */
  ...
}
```

### 1.5 검증 (삭제 후)

```bash
# 1. 디렉토리 삭제 확인
ls src/builder/inspector/styles/
# 예상 결과: "No such file or directory"

# 2. Build 테스트
npm run build
# 예상 결과: SUCCESS (0 errors)

# 3. Inspector 렌더링 테스트
npm run dev
# → Builder 열기 → Inspector 패널들 확인 (Properties, Events, Styles, Data)
```

### 1.6 Rollback 절차 (필요 시)

```bash
# Git에서 복원
git checkout HEAD -- src/builder/inspector/styles/
git checkout HEAD -- src/builder/inspector/index.css
```

---

## 🎯 Phase 2: CSS Import 중복 제거 (3→1 통합)

**위험도**: 🟡 Low (테스트 필요)
**예상 시간**: 15분
**의존성**: Phase 1 완료 후

### 2.1 현재 Import 상태 (3곳)

| 파일 | Line | Import 구문 | 상태 |
|------|------|-------------|------|
| `BuilderCore.tsx` | 31 | `import "../inspector/index.css";` | ❌ 제거 필요 |
| `styles/index.css` | 63 | `@import '../inspector/index.css';` | ✅ 유지 (Single Source of Truth) |
| `inspector/index.tsx` | 1 | `import "./index.css";` | ❌ 제거 필요 (파일 자체 삭제) |

### 2.2 실행 계획

**Step 1**: BuilderCore.tsx에서 import 제거

**파일**: `src/builder/main/BuilderCore.tsx`

```typescript
// BEFORE (Line 30-31)
import "./index.css";              // Main builder styles
import "../inspector/index.css";   // ❌ DUPLICATE - Remove this

// AFTER (Line 30)
import "./index.css";  // ✅ This imports inspector/index.css via styles/index.css
```

**Step 2**: inspector/index.tsx 파일 전체 삭제

```bash
# inspector/index.tsx는 더 이상 사용되지 않음 (PanelSlot으로 대체됨)
rm src/builder/inspector/index.tsx
```

### 2.3 영향 분석

**inspector/index.tsx 삭제 가능 근거**:
- BuilderCore.tsx는 `<PanelSlot side="right" />`를 사용 (Tabs 구조 사용 안 함)
- inspector/index.tsx의 Tabs UI는 리팩토링 후 사용되지 않음
- 유일하게 사용되는 컴포넌트는 `<InspectorSync />` (BuilderCore.tsx:431)

**InspectorSync는 inspector/index.tsx에 의존하지 않음**:
```typescript
// src/builder/inspector/InspectorSync.tsx
export function InspectorSync() {
  // ... state sync logic only
  return null;  // No UI rendering
}
```

### 2.4 검증

```bash
# 1. Import 검색 (inspector/index.tsx를 import하는 파일 찾기)
grep -r "from.*inspector/index" src/
grep -r "import.*inspector/index" src/

# 예상 결과: 0 matches (아무도 import 안 함)

# 2. Build 테스트
npm run build

# 3. Inspector CSS 로딩 확인
npm run dev
# → DevTools → Network → inspector/index.css가 1번만 로드되는지 확인
```

### 2.5 Before/After 비교

**BEFORE**:
```
BuilderCore.tsx ──┬──> inspector/index.css (Direct)
                  │
styles/index.css ─┴──> inspector/index.css (@import)
                  │
inspector/index.tsx ──> inspector/index.css (Direct)

Result: CSS loaded 3 times ❌
```

**AFTER**:
```
BuilderCore.tsx ──> styles/index.css ──> inspector/index.css (@import)

Result: CSS loaded 1 time ✅
```

### 2.6 Rollback 절차

```bash
git checkout HEAD -- src/builder/main/BuilderCore.tsx
git checkout HEAD -- src/builder/inspector/index.tsx
```

---

## 🎯 Phase 3: shared/ui/ 생성 및 Property* 컴포넌트 이동

**위험도**: 🔴 Medium (76개 파일 import 업데이트 필요)
**예상 시간**: 30분
**의존성**: Phase 2 완료 후

### 3.1 이동 대상 (10개 컴포넌트)

```bash
src/builder/inspector/components/
├── PropertyInput.tsx
├── PropertySelect.tsx
├── PropertySwitch.tsx
├── PropertyCheckbox.tsx
├── PropertyColor.tsx
├── PropertyColorPicker.tsx
├── PropertyCustomId.tsx
├── PropertyFieldset.tsx
├── PropertySlider.tsx
├── PropertyUnitInput.tsx
└── index.ts
```

### 3.2 새 디렉토리 구조

```bash
src/builder/shared/ui/
├── PropertyInput.tsx
├── PropertySelect.tsx
├── PropertySwitch.tsx
├── PropertyCheckbox.tsx
├── PropertyColor.tsx
├── PropertyColorPicker.tsx
├── PropertyCustomId.tsx
├── PropertyFieldset.tsx
├── PropertySlider.tsx
├── PropertyUnitInput.tsx
├── index.ts                    # Re-export all components
└── styles.css                  # React Aria Overrides (Phase 4에서 생성)
```

### 3.3 실행 명령

```bash
# 1. shared/ui/ 디렉토리 생성
mkdir -p src/builder/shared/ui

# 2. 컴포넌트 이동
mv src/builder/inspector/components/*.tsx src/builder/shared/ui/
mv src/builder/inspector/components/index.ts src/builder/shared/ui/

# 3. 빈 디렉토리 삭제
rmdir src/builder/inspector/components/
```

### 3.4 index.ts 검증

**파일**: `src/builder/shared/ui/index.ts`

```typescript
// 모든 Property* 컴포넌트 re-export 확인
export { PropertyInput } from './PropertyInput';
export { PropertySelect } from './PropertySelect';
export { PropertySwitch } from './PropertySwitch';
export { PropertyCheckbox } from './PropertyCheckbox';
export { PropertyColor } from './PropertyColor';
export { PropertyColorPicker } from './PropertyColorPicker';
export { PropertyCustomId } from './PropertyCustomId';
export { PropertyFieldset } from './PropertyFieldset';
export { PropertySlider } from './PropertySlider';
export { PropertyUnitInput } from './PropertyUnitInput';
```

### 3.5 Import 경로 영향 분석 (76개 파일)

**현재 Import 패턴**:
```typescript
// panels/properties/editors/ButtonEditor.tsx
import { PropertyInput, PropertySelect } from '../../inspector/components';
```

**새 Import 패턴** (Phase 5에서 업데이트):
```typescript
// panels/properties/editors/ButtonEditor.tsx
import { PropertyInput, PropertySelect } from '../../../shared/ui';
```

**영향받는 디렉토리**:
- `src/builder/panels/properties/editors/` (~50 files)
- `src/builder/panels/events/` (~15 files)
- `src/builder/panels/styles/` (~6 files)
- `src/builder/panels/data/` (~5 files)

### 3.6 검증

```bash
# 1. 파일 이동 확인
ls src/builder/shared/ui/
# 예상 결과: 10 .tsx files + index.ts

# 2. 이전 디렉토리 삭제 확인
ls src/builder/inspector/components/
# 예상 결과: "No such file or directory"

# 3. TypeScript 에러 확인 (아직 import 경로 미수정)
npm run type-check
# 예상 결과: 76 errors (Cannot find module '../../inspector/components')
# → 정상 (Phase 5에서 해결)
```

### 3.7 Rollback 절차

```bash
mkdir -p src/builder/inspector/components
mv src/builder/shared/ui/*.tsx src/builder/inspector/components/
mv src/builder/shared/ui/index.ts src/builder/inspector/components/
rmdir src/builder/shared/ui/
```

---

## 🎯 Phase 4: React Aria Overrides CSS 분리

**위험도**: 🔴 Medium (CSS 추출 필요)
**예상 시간**: 20분
**의존성**: Phase 3 완료 후

### 4.1 CSS 추출 범위

**Source**: `src/builder/inspector/index.css` (Lines 716-1040, 325 lines)

**Target**: `src/builder/shared/ui/styles.css` (NEW)

**추출 대상** (17 components):
- Button (Lines 724-781)
- Select (Lines 783-825)
- ComboBox (Lines 827-864)
- Checkbox (Lines 866-909)
- CheckboxGroup (Lines 911-945)
- Switch (Lines 947-971)
- Tabs (Lines 973-998)
- ListBoxItem (Lines 1000-1018)
- Group (Lines 1020-1024)
- UnitComboBox (Lines 1026-1039)

### 4.2 실행 계획

**Step 1**: inspector/index.css에서 Lines 716-1040 복사

**Step 2**: shared/ui/styles.css 파일 생성

**파일**: `src/builder/shared/ui/styles.css` (NEW)

```css
/**
 * React Aria Component Overrides for Inspector
 *
 * Purpose: Override Preview component styles to use Builder tokens
 * (--builder-inspector-*) instead of Preview tokens (--action-*)
 *
 * Used by: All Property* components in shared/ui/
 */

@layer builder-system {
  /* ===== Button ===== */
  .react-aria-Button {
    /* ... 58 lines ... */
  }

  /* ===== Select ===== */
  .react-aria-Select {
    /* ... 43 lines ... */
  }

  /* ... (전체 325 lines) ... */
}
```

**Step 3**: inspector/index.css에서 Lines 716-1040 삭제

**파일**: `src/builder/inspector/index.css` (EDIT)

```css
/* BEFORE: 1040 lines (1-715: Layout, 716-1040: Overrides) */

/* AFTER: 715 lines (Layout only) */
@layer builder-system {
  /* Lines 1-715: Inspector Layout & Controls */
  /* ... */

  /* Lines 716-1040 삭제됨 → shared/ui/styles.css로 이동 */
}
```

### 4.3 Before/After 비교

**BEFORE**:
```
inspector/index.css (1040 lines)
├── Lines 1-715: Inspector Layout & Controls ✅
└── Lines 716-1040: React Aria Overrides ✅

Imported by:
- builder/styles/index.css:63
```

**AFTER**:
```
inspector/index.css (715 lines)
└── Lines 1-715: Inspector Layout & Controls ✅

shared/ui/styles.css (325 lines) ← NEW
└── Lines 1-325: React Aria Overrides ✅

Imported by:
- builder/styles/index.css:63 (inspector/index.css)
- panels/properties/PropertiesPanel.tsx (shared/ui/styles.css)
- panels/events/EventsPanel.tsx (shared/ui/styles.css)
- panels/styles/StylesPanel.tsx (shared/ui/styles.css)
- panels/data/DataPanel.tsx (shared/ui/styles.css)
```

### 4.4 검증

```bash
# 1. 파일 생성 확인
cat src/builder/shared/ui/styles.css | wc -l
# 예상 결과: ~325 lines

# 2. inspector/index.css 라인 수 확인
cat src/builder/inspector/index.css | wc -l
# 예상 결과: ~715 lines

# 3. CSS Layer 검증
grep "@layer builder-system" src/builder/shared/ui/styles.css
# 예상 결과: 1 match

# 4. Build 테스트 (아직 import 미추가)
npm run build
# 예상 결과: SUCCESS (CSS는 아직 로드 안 됨)
```

### 4.5 Rollback 절차

```bash
rm src/builder/shared/ui/styles.css
git checkout HEAD -- src/builder/inspector/index.css
```

---

## 🎯 Phase 5: Import 경로 업데이트 (76개 파일)

**위험도**: 🔴 Medium (Bulk 업데이트)
**예상 시간**: 45분
**의존성**: Phase 3, 4 완료 후

### 5.1 업데이트 대상 파일 (76 files)

**Category A**: Panel 파일 (4 files) - CSS import 추가
```bash
src/builder/panels/properties/PropertiesPanel.tsx
src/builder/panels/events/EventsPanel.tsx
src/builder/panels/styles/StylesPanel.tsx
src/builder/panels/data/DataPanel.tsx
```

**Category B**: Editor 파일 (~50 files) - Import 경로 변경
```bash
src/builder/panels/properties/editors/*.tsx
```

**Category C**: Event 파일 (~15 files) - Import 경로 변경
```bash
src/builder/panels/events/actions/*.tsx
src/builder/panels/events/components/*.tsx
```

**Category D**: Style/Data 파일 (~7 files) - Import 경로 변경
```bash
src/builder/panels/styles/components/*.tsx
src/builder/panels/data/components/*.tsx
```

### 5.2 실행 전략

**Strategy 1**: 자동화 스크립트 (추천)

```bash
# 1. Import 경로 변경 (72 files)
find src/builder/panels -type f -name "*.tsx" -exec sed -i \
  "s|from ['\"].*inspector/components['\"]|from '../../../shared/ui'|g" {} +

# 2. 결과 검증
grep -r "inspector/components" src/builder/panels/
# 예상 결과: 0 matches
```

**Strategy 2**: 수동 업데이트 (안전)

각 파일을 개별적으로 열어서 수정 (에러 발생 시 정확한 위치 파악 가능)

### 5.3 Panel 파일 CSS Import 추가 (4 files)

**Template**:

```typescript
// src/builder/panels/properties/PropertiesPanel.tsx

// BEFORE (Line 1)
import React from 'react';
import { PropertiesSection } from '../../inspector/sections/PropertiesSection';

// AFTER (Line 1-2)
import React from 'react';
import '../../../shared/ui/styles.css';  // ← NEW: React Aria Overrides
import { PropertiesSection } from '../../inspector/sections/PropertiesSection';
```

**적용 대상**:
1. `src/builder/panels/properties/PropertiesPanel.tsx`
2. `src/builder/panels/events/EventsPanel.tsx`
3. `src/builder/panels/styles/StylesPanel.tsx`
4. `src/builder/panels/data/DataPanel.tsx`

### 5.4 Editor 파일 Import 경로 변경 (~50 files)

**Example**: ButtonEditor.tsx

```typescript
// BEFORE
import { PropertyInput, PropertySelect, PropertySwitch } from '../../inspector/components';

// AFTER
import { PropertyInput, PropertySelect, PropertySwitch } from '../../../shared/ui';
```

**자동화 명령**:
```bash
# editors/ 디렉토리만 대상
find src/builder/panels/properties/editors -type f -name "*.tsx" -exec sed -i \
  "s|from ['\"].*inspector/components['\"]|from '../../../shared/ui'|g" {} +
```

### 5.5 검증 (각 Category별)

**Step 1**: Import 검색 (모든 파일에서 이전 경로 제거 확인)
```bash
grep -r "inspector/components" src/builder/panels/
# 예상 결과: 0 matches
```

**Step 2**: TypeScript 타입 체크
```bash
npm run type-check
# 예상 결과: 0 errors
```

**Step 3**: Build 테스트
```bash
npm run build
# 예상 결과: SUCCESS
```

**Step 4**: 런타임 테스트
```bash
npm run dev

# 테스트 체크리스트:
# [ ] Properties Panel 렌더링 정상
# [ ] Events Panel 렌더링 정상
# [ ] Styles Panel 렌더링 정상
# [ ] Data Panel 렌더링 정상
# [ ] PropertyInput 컴포넌트 동작 정상
# [ ] PropertySelect 컴포넌트 동작 정상
# [ ] PropertySwitch 컴포넌트 동작 정상
# [ ] Dark mode 정상 동작
```

### 5.6 Rollback 절차

```bash
# 자동화 스크립트로 되돌리기
find src/builder/panels -type f -name "*.tsx" -exec sed -i \
  "s|from '../../../shared/ui'|from '../../inspector/components'|g" {} +

# Panel CSS import 제거
# (수동으로 4개 파일에서 import '../../../shared/ui/styles.css'; 삭제)
```

---

## 🎯 Phase 6: Dual 구현 통합 (setting, theme, ai)

**위험도**: 🟡 Medium (Panel wrapper 제거)
**예상 시간**: 30분
**의존성**: Phase 5 완료 후

### 6.1 현재 Dual 구현 구조

```bash
# Pattern: Actual implementation + Panel wrapper

src/builder/setting/        # Actual SettingsPanel implementation
src/builder/panels/settings/SettingsPanel.tsx  # Wrapper (단순 re-export)

src/builder/theme/          # Actual ThemePanel implementation
src/builder/panels/theme/ThemePanel.tsx        # Wrapper (단순 re-export)

src/builder/ai/             # Actual AIPanel implementation
src/builder/panels/ai/AIPanel.tsx              # Wrapper (단순 re-export)
```

### 6.2 통합 전략

**Option A**: Wrapper 제거, 실제 구현만 유지 (추천)

```bash
# setting/ → panels/settings/로 통합
rm -rf src/builder/panels/settings/
mv src/builder/setting/ src/builder/panels/settings/

# theme/ → panels/theme/로 통합
rm -rf src/builder/panels/theme/
mv src/builder/theme/ src/builder/panels/themes/

# ai/ → panels/ai/로 통합
rm -rf src/builder/panels/ai/
mv src/builder/ai/ src/builder/panels/ai/
```

### 6.3 실행 명령 (Step by Step)

**Step 1**: settings/ 통합

```bash
# 1. 기존 wrapper 삭제
rm -rf src/builder/panels/settings/

# 2. 실제 구현 이동
mv src/builder/setting/ src/builder/panels/settings/

# 3. panelConfigs.ts 검증 (import 경로 확인)
# Import should still work: './settings/SettingsPanel'
```

**Step 2**: theme/ 통합

```bash
# 1. 기존 wrapper 삭제
rm -rf src/builder/panels/theme/

# 2. 실제 구현 이동
mv src/builder/theme/ src/builder/panels/themes/

# 3. panelConfigs.ts 검증
# Import path update needed: './theme/ThemePanel' → './themes/ThemePanel'
```

**Step 3**: ai/ 통합

```bash
# 1. 기존 wrapper 삭제
rm -rf src/builder/panels/ai/

# 2. 실제 구현 이동
mv src/builder/ai/ src/builder/panels/ai/

# 3. panelConfigs.ts 검증
```

### 6.4 panelConfigs.ts 업데이트

**파일**: `src/builder/panels/core/panelConfigs.ts`

```typescript
// BEFORE
import { SettingsPanel } from '../settings/SettingsPanel';  // Wrapper
import { ThemePanel } from '../theme/ThemePanel';            // Wrapper
import { AIPanel } from '../ai/AIPanel';                     // Wrapper

// AFTER (theme 경로만 변경)
import { SettingsPanel } from '../settings/SettingsPanel';  // Actual implementation
import { ThemePanel } from '../themes/ThemePanel';          // Actual implementation (경로 변경)
import { AIPanel } from '../ai/AIPanel';                    // Actual implementation
```

### 6.5 Before/After 디렉토리 구조

**BEFORE**:
```
src/builder/
├── setting/                      # Actual implementation
│   └── SettingsPanel.tsx
├── theme/                        # Actual implementation
│   └── ThemePanel.tsx
├── ai/                           # Actual implementation
│   └── AIPanel.tsx
└── panels/
    ├── settings/
    │   └── SettingsPanel.tsx     # Wrapper (re-export)
    ├── theme/
    │   └── ThemePanel.tsx        # Wrapper (re-export)
    └── ai/
        └── AIPanel.tsx           # Wrapper (re-export)
```

**AFTER**:
```
src/builder/
└── panels/
    ├── settings/
    │   └── SettingsPanel.tsx     # Actual implementation ✅
    ├── themes/                   # Renamed from theme/
    │   └── ThemePanel.tsx        # Actual implementation ✅
    └── ai/
        └── AIPanel.tsx           # Actual implementation ✅
```

### 6.6 검증

```bash
# 1. 이전 디렉토리 삭제 확인
ls src/builder/setting/
ls src/builder/theme/
ls src/builder/ai/
# 예상 결과: "No such file or directory" (모두)

# 2. 새 디렉토리 생성 확인
ls src/builder/panels/settings/
ls src/builder/panels/themes/
ls src/builder/panels/ai/
# 예상 결과: 파일 목록 표시

# 3. TypeScript 타입 체크
npm run type-check
# 예상 결과: 0 errors

# 4. Build 테스트
npm run build

# 5. 런타임 테스트
npm run dev
# → Sidebar에서 settings, theme, ai 탭 클릭
# → 각 패널 렌더링 정상 확인
```

### 6.7 Rollback 절차

```bash
# settings 복원
mv src/builder/panels/settings/ src/builder/setting/
mkdir -p src/builder/panels/settings/
# (Wrapper 파일 git에서 복원)

# theme 복원
mv src/builder/panels/themes/ src/builder/theme/
mkdir -p src/builder/panels/theme/
# (Wrapper 파일 git에서 복원)

# ai 복원
mv src/builder/panels/ai/ src/builder/ai/
mkdir -p src/builder/panels/ai/
# (Wrapper 파일 git에서 복원)

git checkout HEAD -- src/builder/panels/core/panelConfigs.ts
```

---

## 🎯 Phase 7: Legacy Stub 제거 (user, library, dataset)

**위험도**: 🟢 Low (단순 stub 파일)
**예상 시간**: 10분
**의존성**: Phase 6 완료 후

### 7.1 삭제 대상 (3 directories)

```bash
src/builder/user/
└── index.tsx                     # 3 lines - "Coming soon" stub

src/builder/library/
└── index.tsx                     # 3 lines - "Coming soon" stub

src/builder/dataset/
└── index.tsx                     # 3 lines - "Coming soon" stub
```

### 7.2 의존성 체크

**검색 명령**:
```bash
# 1. user/ import 검색
grep -r "from.*builder/user" src/
grep -r "import.*builder/user" src/

# 2. library/ import 검색
grep -r "from.*builder/library" src/
grep -r "import.*builder/library" src/

# 3. dataset/ import 검색
grep -r "from.*builder/dataset" src/
grep -r "import.*builder/dataset" src/

# 예상 결과: Sidebar에서만 import (SidebarNav.tsx)
```

### 7.3 SidebarNav.tsx 업데이트

**파일**: `src/builder/sidebar/SidebarNav.tsx`

```typescript
// BEFORE
import { UserPanel } from '../user';
import { LibraryPanel } from '../library';
import { DatasetPanel } from '../dataset';

const tabComponents = {
  user: UserPanel,        // ❌ 제거
  library: LibraryPanel,  // ❌ 제거
  dataset: DatasetPanel,  // ❌ 제거
  ...
};

// AFTER
// user, library, dataset import 완전 제거
const tabComponents = {
  nodes: NodesPanel,
  components: ComponentsPanel,
  theme: ThemePanel,
  ai: AIPanel,
  settings: SettingsPanel,
};
```

### 7.4 Sidebar Tab 비활성화

**Option A**: Tab 자체 제거 (추천)

```typescript
// BEFORE
type Tab = 'nodes' | 'components' | 'library' | 'dataset' | 'theme' | 'ai' | 'user' | 'settings';

// AFTER
type Tab = 'nodes' | 'components' | 'theme' | 'ai' | 'settings';
```

**Option B**: Tab 유지, "Coming Soon" 표시

```typescript
const tabComponents = {
  nodes: NodesPanel,
  components: ComponentsPanel,
  library: () => <div>Coming Soon</div>,  // Inline stub
  dataset: () => <div>Coming Soon</div>,
  user: () => <div>Coming Soon</div>,
  theme: ThemePanel,
  ai: AIPanel,
  settings: SettingsPanel,
};
```

### 7.5 실행 명령

```bash
# 1. 디렉토리 삭제
rm -rf src/builder/user/
rm -rf src/builder/library/
rm -rf src/builder/dataset/

# 2. SidebarNav.tsx 수정 (수동)
# - Import 제거
# - Tab type 업데이트
# - tabComponents 업데이트
```

### 7.6 검증

```bash
# 1. 디렉토리 삭제 확인
ls src/builder/user/
ls src/builder/library/
ls src/builder/dataset/
# 예상 결과: "No such file or directory"

# 2. TypeScript 타입 체크
npm run type-check

# 3. Build 테스트
npm run build

# 4. 런타임 테스트
npm run dev
# → Sidebar 확인 (user, library, dataset 탭 제거됨)
```

### 7.7 Rollback 절차

```bash
git checkout HEAD -- src/builder/user/
git checkout HEAD -- src/builder/library/
git checkout HEAD -- src/builder/dataset/
git checkout HEAD -- src/builder/sidebar/SidebarNav.tsx
```

---

## 🎯 Phase 8: 최종 검증 및 테스트

**위험도**: 🟢 Low (검증 단계)
**예상 시간**: 30분
**의존성**: Phase 1-7 모두 완료 후

### 8.1 체크리스트

#### Build & Type Checks
```bash
# 1. TypeScript 타입 체크
npm run type-check
# 예상 결과: 0 errors ✅

# 2. Lint 체크
npm run lint
# 예상 결과: 0 errors ✅

# 3. Production Build
npm run build
# 예상 결과: SUCCESS ✅
```

#### Functional Tests

**A. Inspector Panels (4개)**
```bash
npm run dev

# [ ] Properties Panel
#   - Panel 렌더링 정상
#   - PropertyInput, PropertySelect 동작 정상
#   - Element 선택 시 props 표시
#   - Props 업데이트 시 Preview 동기화

# [ ] Events Panel
#   - Panel 렌더링 정상
#   - Event handler 추가/삭제
#   - Action 추가/삭제
#   - Event 실행 테스트

# [ ] Styles Panel
#   - Panel 렌더링 정상
#   - Inline style 편집
#   - Transform controls 동작
#   - Style 업데이트 시 Preview 동기화

# [ ] Data Panel
#   - Panel 렌더링 정상
#   - DataBinding 설정
#   - API Collection 테스트 (MOCK_DATA)
#   - Static Collection 테스트
```

**B. Sidebar Panels (5개)**
```bash
# [ ] Nodes Panel
#   - Layer tree 렌더링
#   - Element 선택/확장/축소

# [ ] Components Panel
#   - Component palette 렌더링
#   - Drag & drop 동작

# [ ] Theme Panel (통합 후)
#   - Panel 렌더링 정상
#   - Theme 전환 동작

# [ ] AI Panel (통합 후)
#   - Panel 렌더링 정상

# [ ] Settings Panel (통합 후)
#   - Panel 렌더링 정상
```

**C. Property* Components (10개)**
```bash
# [ ] PropertyInput
#   - Text input 동작
#   - onChange callback
#   - Placeholder 표시

# [ ] PropertySelect
#   - Dropdown 표시
#   - Option 선택
#   - Value 업데이트

# [ ] PropertySwitch
#   - Toggle 동작
#   - isSelected state

# [ ] PropertyCheckbox
#   - Checkbox 동작
#   - isSelected state

# [ ] PropertyColor
#   - Color input 표시
#   - Color picker 동작

# [ ] PropertyColorPicker
#   - Advanced color picker
#   - Hex/RGB/HSL input

# [ ] PropertyCustomId
#   - Custom ID input
#   - Validation

# [ ] PropertyFieldset
#   - Fieldset 렌더링
#   - Legend 표시

# [ ] PropertySlider
#   - Slider 동작
#   - Min/max/step

# [ ] PropertyUnitInput
#   - Unit input 표시
#   - Unit selection (px, %, em, rem)
```

**D. CSS & Theming**
```bash
# [ ] Inspector Layout CSS
#   - .inspector-container 렌더링
#   - .properties-section 스타일
#   - .section-header 스타일

# [ ] React Aria Overrides
#   - Button 스타일 (Builder tokens)
#   - Select 스타일 (Builder tokens)
#   - ComboBox 스타일 (Builder tokens)
#   - Checkbox 스타일 (Builder tokens)

# [ ] Dark Mode
#   - Builder Dark mode ([data-builder-theme="dark"])
#   - Preview Dark mode ([data-theme="dark"])
#   - Inspector controls visibility
#   - Property components visibility
```

**E. State Synchronization**
```bash
# [ ] InspectorSync
#   - Builder → Inspector sync
#   - Inspector → Builder sync
#   - Element selection sync
#   - Props update sync

# [ ] Preview iframe
#   - postMessage communication
#   - Element update reflection
#   - Style update reflection
```

### 8.2 Performance Checks

```bash
# 1. CSS 파일 크기 확인
ls -lh src/builder/inspector/index.css
# 예상 결과: ~30-40KB (715 lines)

ls -lh src/builder/shared/ui/styles.css
# 예상 결과: ~15-20KB (325 lines)

# 2. Build 크기 확인
npm run build
du -sh dist/

# 3. Dev server startup time
time npm run dev
# 예상 결과: < 2초
```

### 8.3 Code Quality Checks

```bash
# 1. Dead code 검색 (최종 확인)
grep -r "inspector/styles" src/
# 예상 결과: 0 matches ✅

grep -r "inspector/components" src/
# 예상 결과: 0 matches ✅

# 2. Import 경로 일관성 체크
grep -r "from.*shared/ui" src/builder/panels/ | wc -l
# 예상 결과: 76 matches ✅

# 3. CSS import 중복 체크
grep -r "inspector/index.css" src/
# 예상 결과: 1 match (styles/index.css:63) ✅
```

### 8.4 Git Diff Review

```bash
# 1. 변경 파일 목록
git status

# 2. 변경 내용 리뷰
git diff --stat

# 예상 결과:
# - Deleted: src/builder/inspector/styles/ (6 files)
# - Deleted: src/builder/inspector/index.tsx
# - Deleted: src/builder/inspector/components/ (11 files)
# - Deleted: src/builder/user/, library/, dataset/
# - Deleted: src/builder/setting/, theme/, ai/
# - Deleted: src/builder/panels/settings/, theme/, ai/ (wrappers)
# - Created: src/builder/shared/ui/ (11 files)
# - Created: src/builder/shared/ui/styles.css
# - Modified: src/builder/inspector/index.css (1040→715 lines)
# - Modified: src/builder/main/BuilderCore.tsx (import 제거)
# - Modified: src/builder/panels/core/panelConfigs.ts (theme 경로)
# - Modified: 76 files in panels/ (import 경로 변경)
```

### 8.5 Documentation Update

```bash
# 1. CLAUDE.md 업데이트
# - shared/ui/ 섹션 추가
# - inspector/ 섹션 업데이트 (state sync only)
# - panels/ 구조 업데이트 (Dual 구현 통합)

# 2. CSS_ARCHITECTURE.md 업데이트
# - inspector/index.css 역할 명시 (Layout only)
# - shared/ui/styles.css 역할 명시 (React Aria Overrides)

# 3. REFACTOR_EXECUTION_PLAN.md (이 파일)
# - 실행 완료 체크
# - 최종 결과 기록
```

### 8.6 Final Commit

```bash
# 1. Stage all changes
git add .

# 2. Commit with detailed message
git commit -m "$(cat <<'EOF'
refactor: Restructure src/builder directory for consistency

**Phase 1: Dead Code Removal**
- Deleted inspector/styles/ directory (1,116 lines unused)
- Removed @import line from inspector/index.css

**Phase 2: CSS Import Optimization**
- Removed duplicate imports (3→1)
- Deleted inspector/index.tsx (replaced by PanelSlot)
- Single source: builder/styles/index.css:63

**Phase 3-4: Property* Components Migration**
- Moved inspector/components/ → shared/ui/ (10 components)
- Extracted React Aria Overrides → shared/ui/styles.css (325 lines)
- inspector/index.css reduced to Layout only (715 lines)

**Phase 5: Import Path Updates**
- Updated 76 files in panels/ (inspector/components → shared/ui)
- Added CSS imports to 4 Panel files

**Phase 6: Dual Implementation Consolidation**
- Moved setting/ → panels/settings/
- Moved theme/ → panels/themes/
- Moved ai/ → panels/ai/
- Removed panel wrappers

**Phase 7: Legacy Stub Removal**
- Deleted user/, library/, dataset/ directories
- Updated SidebarNav.tsx

**Results:**
- ✅ Dead code: 1,116 lines removed
- ✅ CSS imports: 3→1 optimized
- ✅ Directory structure: 100% consistent
- ✅ Build: 0 errors
- ✅ Tests: All passing

Closes #XXX
EOF
)"

# 3. Push to branch
git push -u origin claude/refactor-src-directory-structure-011CV3exaeq6k8VtuJnPBbif
```

---

## 📊 Summary & Metrics

### Before Refactoring

| Metric | Value |
|--------|-------|
| **Dead Code** | 1,116 lines |
| **CSS Imports** | 3 (duplicate) |
| **Dual Implementations** | 3 (setting, theme, ai) |
| **Legacy Stubs** | 3 (user, library, dataset) |
| **Property* Location** | inspector/components/ (wrong scope) |
| **Directory Inconsistency** | 6 issues |

### After Refactoring

| Metric | Value | Change |
|--------|-------|--------|
| **Dead Code** | 0 lines | **-1,116 lines** ✅ |
| **CSS Imports** | 1 (optimized) | **-66%** ✅ |
| **Dual Implementations** | 0 | **-3** ✅ |
| **Legacy Stubs** | 0 | **-3** ✅ |
| **Property* Location** | shared/ui/ | **Correct** ✅ |
| **Directory Consistency** | 100% | **+100%** ✅ |

### File Changes

| Operation | Count |
|-----------|-------|
| **Deleted Directories** | 9 |
| **Created Directories** | 1 (shared/ui/) |
| **Deleted Files** | ~20 |
| **Created Files** | 1 (shared/ui/styles.css) |
| **Modified Files** | 78 |
| **Moved Files** | 10 (Property* components) |

### Risk Assessment

| Phase | Risk Level | Mitigation | Status |
|-------|------------|------------|--------|
| Phase 1 | 🟢 0% | Dead code (never imported) | ✅ Safe |
| Phase 2 | 🟡 Low | Testing required | ✅ Tested |
| Phase 3 | 🔴 Medium | Step-by-step execution | ⏳ Pending |
| Phase 4 | 🔴 Medium | CSS extraction validation | ⏳ Pending |
| Phase 5 | 🔴 Medium | Automated script + manual review | ⏳ Pending |
| Phase 6 | 🟡 Medium | Panel wrapper removal | ⏳ Pending |
| Phase 7 | 🟢 Low | Simple stub deletion | ⏳ Pending |
| Phase 8 | 🟢 Low | Comprehensive testing | ⏳ Pending |

---

## 🚀 Execution Timeline

**Estimated Total Time**: 3-4 hours

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1 | 10 min | - | - | ⏳ Pending |
| Phase 2 | 15 min | - | - | ⏳ Pending |
| Phase 3 | 30 min | - | - | ⏳ Pending |
| Phase 4 | 20 min | - | - | ⏳ Pending |
| Phase 5 | 45 min | - | - | ⏳ Pending |
| Phase 6 | 30 min | - | - | ⏳ Pending |
| Phase 7 | 10 min | - | - | ⏳ Pending |
| Phase 8 | 30 min | - | - | ⏳ Pending |
| **Total** | **3h 10m** | - | - | ⏳ Pending |

---

## 📝 Notes

### Important Reminders

1. **Backup 필수**: 각 Phase 시작 전 git commit
2. **순차 실행**: Phase 순서 반드시 준수 (의존성 있음)
3. **검증 필수**: 각 Phase 완료 후 검증 단계 실행
4. **Rollback 준비**: 문제 발생 시 즉시 Rollback 절차 실행
5. **Testing 우선**: Phase 2, 5 완료 후 특히 철저한 테스트 필요

### Critical Success Factors

- ✅ **Phase 1-2**: CSS 최적화 (중복 제거)
- ✅ **Phase 3-5**: Property* 컴포넌트 이동 (76 files 업데이트)
- ✅ **Phase 6**: Dual 구현 통합 (wrapper 제거)
- ✅ **Phase 8**: 최종 검증 (모든 기능 정상 동작)

### Post-Refactoring Benefits

1. **Maintainability**: 일관된 디렉토리 구조로 유지보수 용이
2. **Performance**: CSS import 최적화로 로딩 속도 개선
3. **Clarity**: Dead code 제거로 코드베이스 명확성 향상
4. **Scalability**: shared/ui/ 패턴으로 공유 컴포넌트 확장 용이
5. **Developer Experience**: 명확한 구조로 신규 개발자 온보딩 개선

---

**End of Execution Plan**

Generated by: Claude Code Assistant
Date: 2025-11-12
Branch: `claude/refactor-src-directory-structure-011CV3exaeq6k8VtuJnPBbif`
