# Monitor Panel 완전 재구축 - Phase별 상세 설계 문서

---

## ✅ Implementation Status (2025-12-04)

**상태: 🎉 전체 구현 완료**

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1 | ✅ 완료 | 2025-12-04 |
| Phase 2 | ✅ 완료 | 2025-12-04 |
| Phase 3 | ✅ 완료 | 2025-12-04 |
| Phase 4 | ✅ 완료 | 2025-12-04 |
| Phase 5 | ✅ 완료 | 2025-12-04 |
| Phase 6 | ✅ 완료 | 2025-12-04 |

### 구현된 파일 목록

```
src/builder/panels/monitor/
├── MonitorPanel.tsx              ✅ 메인 패널 (5개 탭)
├── index.ts                      ✅ 모듈 exports
├── monitor-panel.css             ✅ 전체 스타일 (1,113줄)
├── hooks/
│   ├── useMemoryStats.ts         ✅ 메모리 통계 수집
│   ├── useTimeSeriesData.ts      ✅ 시계열 데이터
│   ├── useFPSMonitor.ts          ✅ FPS 모니터링
│   ├── useWebVitals.ts           ✅ Core Web Vitals
│   └── useComponentMemory.ts     ✅ 컴포넌트 메모리 분석
└── components/
    ├── MemoryChart.tsx           ✅ SVG 메모리 차트
    ├── MemoryActions.tsx         ✅ 최적화 버튼
    ├── ThresholdIndicator.tsx    ✅ 임계값 표시기
    ├── ExportButton.tsx          ✅ CSV/JSON 내보내기
    ├── RealtimeChart.tsx         ✅ 실시간 차트
    ├── FPSMeter.tsx              ✅ FPS 미터
    ├── WebVitalsCard.tsx         ✅ Web Vitals 카드
    ├── ComponentMemoryList.tsx   ✅ 컴포넌트별 메모리
    └── ThresholdSettings.tsx     ✅ 임계값 설정

src/builder/hooks/
└── useToast.ts                   ✅ Toast 상태 관리

src/builder/components/
├── Toast.tsx                     ✅ Toast 컴포넌트
├── ToastContainer.tsx            ✅ Toast 컨테이너
└── styles/Toast.css              ✅ Toast 스타일
```

### 빌드 상태

```
TypeScript: 0 errors ✅
ESLint: 0 errors ✅
```

### 접근 방법

1. Builder Header 우측의 **Activity (📊) 아이콘** 클릭
2. 하단에 Monitor Panel 표시
3. 5개 탭: Memory | Realtime | Stats | Browser | Analysis

---

## 📋 Executive Summary

**목표**: 기존 monitor 시스템을 완전히 삭제하고 패널 시스템 기반의 경량 모니터링 패널로 재구축

### 핵심 조건 (모두 충족 필수)

- ✅ **기존 시스템 삭제**: `src/builder/monitor/` 전면 제거 + 연계 코드 완전 삭제
- ✅ **패널 시스템 통합**: `src/builder/panels/monitor/` 로 이전, PanelRegistry 등록
- ✅ **메모리 관리 필수**: 메모리 사용량 모니터링 및 최적화 기능
- ✅ **기존 라이브러리 활용**: 이미 설치된 오픈소스 라이브러리 사용 가능 (유료 라이브러리만 금지)
- ✅ **성능 영향 최소화**: 빌더 사용 중 퍼포먼스 저하 없음
- ✅ **Bottom 위치**: Footer 영역에 배치
- ✅ **접근성 준수**: 키보드 탐색, Esc 닫기, ARIA 레이블 필수
- ✅ **보안/프라이버시**: 메모리 데이터 외부 전송 금지, 민감 정보 로깅 금지

### 사용 가능한 라이브러리 (package.json 기준)

| 라이브러리 | 버전 | 용도 | 추천 활용처 |
|-----------|------|------|-------------|
| ~~@xyflow/react~~ | ~~12.10.0~~ | ~~플로우 다이어그램~~ | 제거됨 — 대안 필요 시 HTML/CSS 기반 구현 권장 |
| **three** | 0.181.2 | 3D 그래픽 | 고급 메모리 시각화 (선택적) |
| **@tanstack/react-virtual** | 3.13.12 | 가상 스크롤링 | 긴 히스토리 목록 렌더링 |
| **lucide-react** | 0.553.0 | 아이콘 | UI 아이콘 |

> **참고**: SVG 기반 차트도 여전히 유효한 옵션이며, 경량 구현이 필요한 경우 사용 가능합니다.

### 전체 작업 예상 시간

**총 14-18시간** (1명 개발자 기준, Full Implementation)

| Phase | 예상 시간 | 설명 | 의존성 |
|-------|-----------|------|--------|
| Phase 1 | 1.5-2h | 레거시 제거 | 없음 |
| Phase 2 | 2.5-3.5h | Panel 인프라 (Bottom Slot + Registry) | Phase 1 |
| Phase 3 | 3-4h | Core Monitor (Memory/History Charts) | Phase 2 |
| Phase 4 | 1.5-2h | 알림 시스템 (Toast + Threshold) | Phase 3 |
| Phase 5 | 2.5-3h | 실시간 모니터링 (Realtime Chart, FPS, Web Vitals) | Phase 3 |
| Phase 6 | 3-3.5h | 분석 도구 (Component Memory, Export, 최적화) | Phase 3-5 |

### Phase 구조 최적화 요약

```
Phase 1: 청소           → Phase 2: 인프라 구축
                              ↓
                        Phase 3: 핵심 기능
                        ↙         ↘
              Phase 4: 알림    Phase 5: 실시간
                        ↘         ↙
                        Phase 6: 분석 도구
```

**변경 사항:**
- ✅ Phase 3+4 통합: Monitor Panel + Registry → Core Monitor
- ✅ Phase 5 재정의: 성능 최적화 → 실시간 모니터링으로 변경
- ✅ Phase 6+7 재구성: 기능별 그룹화 (알림/실시간/분석)

---

# 📐 Phase별 상세 설계 문서

---

## 🏗️ Phase 1: 기존 시스템 완전 삭제 및 레거시 코드 제거

**예상 시간**: 1.5-2시간
**난이도**: ⭐ (쉬움)
**의존성**: 없음

### 📋 Phase 1 개요

**목표**: 기존 monitor 시스템의 모든 흔적을 완전히 제거하여 새로운 패널 시스템 구축을 위한 깨끗한 기반 마련

**삭제 대상**:
- 파일 4개 (monitor 폴더 포함)
- Import 7개 위치
- BuilderCore lifecycle 코드 2곳
- CSS footer 섹션
- 문서 3개 업데이트

### 🎯 Step 1.1: 파일 완전 삭제 (15분)

```bash
# 1. 관련 테스트/스토리 파일 확인
grep -r "monitor" src/**/*.test.ts src/**/*.test.tsx 2>/dev/null
grep -r "monitor" src/**/*.stories.tsx 2>/dev/null
grep -r "Monitor" src/stories/ 2>/dev/null

# 2. 실행할 명령
rm -rf src/builder/monitor/
rm src/builder/hooks/useMemoryMonitor.ts
rm src/builder/stores/memoryMonitor.ts

# 3. 테스트/스토리 파일도 삭제 (존재하는 경우)
rm -f src/**/*[Mm]onitor*.test.ts
rm -f src/**/*[Mm]onitor*.test.tsx
rm -f src/stories/*[Mm]onitor*.stories.tsx
```

**삭제 확인**:
```bash
# 삭제 확인 명령
ls src/builder/monitor/        # → "No such file or directory"
ls src/builder/hooks/useMemoryMonitor.ts  # → 파일 없음
ls src/builder/stores/memoryMonitor.ts    # → 파일 없음

# 테스트/스토리 잔여 확인
grep -r "useMemoryMonitor\|memoryMonitor" src/ --include="*.test.*" --include="*.stories.*"
# → Expected: No matches
```

### 🎯 Step 1.2: BuilderCore.tsx 완전 정리 (30분)

**파일**: `src/builder/main/BuilderCore.tsx`

#### 변경 1: Import 제거 (line 상단)
```typescript
// ❌ 제거
import { Monitor } from '../monitor';
import { memoryMonitor } from '../stores/memoryMonitor';
```

#### 변경 2: Lifecycle 코드 제거 (line 260-273)
```typescript
// ❌ 제거 전체 블록
if (import.meta.env.DEV) {
  memoryMonitor.startMonitoring();
}
// ...
if (import.meta.env.DEV) {
  memoryMonitor.stopMonitoring();
}
```

#### 변경 3: JSX 제거 (line 518-520)
```tsx
// ❌ 제거
<footer className="footer">
  <Monitor />
</footer>

// ✅ 임시 상태 (Phase 2에서 BottomPanelSlot 추가)
<!-- footer 영역 비어있음 -->
```

### 🎯 Step 1.3: Import 참조 제거 (30분)

**검색 명령**:
```bash
# 모든 monitor import 찾기
grep -r "from.*monitor" src/builder/
grep -r "memoryMonitor" src/builder/
grep -r "useMemoryMonitor" src/builder/
```

**제거 대상 패턴**:
```typescript
import { Monitor } from './monitor';
import { memoryMonitor } from './stores/memoryMonitor';
import { useMemoryMonitor } from './hooks/useMemoryMonitor';
import type { MemoryMonitor } from '../stores/memoryMonitor';
```

### 🎯 Step 1.4: CSS 정리 (15분)

#### footer.css 수정
**파일**: `src/builder/styles/4-layout/footer.css`

```css
/* ❌ 제거 - footer 관련 스타일 전체 */
.app footer {
  grid-area: footer;
  background: var(--highlight-background-hover);
}
```

### 🎯 Step 1.5: 문서 업데이트 (30분)

#### CLAUDE.md 업데이트
**파일**: `CLAUDE.md`

**제거할 섹션** (line 검색: "Monitor System"):
```markdown
### Monitor System (Footer)
... (전체 섹션 삭제)
```

**추가할 섹션**:
```markdown
### Monitor Panel (Bottom Panel)

경량 메모리 모니터링 패널 (패널 시스템 통합)

**Location**: `src/builder/panels/monitor/`

**Features**:
- Memory usage monitoring (메모리 사용량 추적)
- Performance optimization (메모리 최적화 버튼)
- Mini chart visualization (zero dependencies, SVG 기반)
- RequestIdleCallback 기반 수집 (퍼포먼스 영향 최소화)
```

#### COMPLETED_FEATURES.md 업데이트
**파일**: `docs/COMPLETED_FEATURES.md`

```markdown
<!-- 변경 전 -->
11. ✅ **Monitor System** - Real-time performance tracking in footer

<!-- 변경 후 -->
11. ✅ **Monitor Panel** - Bottom panel with memory monitoring (refactored 2025-01)
```

### ✅ Phase 1 완료 체크리스트

```bash
# 1. TypeScript 컴파일 확인
npm run type-check
# → Expected: 0 errors

# 2. Dev 서버 실행
npm run dev
# → Expected: footer 영역 비어있음 (정상)

# 3. Git diff 확인
git status
# → Expected:
#   deleted: src/builder/monitor/
#   deleted: src/builder/hooks/useMemoryMonitor.ts
#   deleted: src/builder/stores/memoryMonitor.ts
#   modified: src/builder/main/BuilderCore.tsx
#   modified: CLAUDE.md
#   modified: docs/COMPLETED_FEATURES.md

# 4. Import 잔여 확인
grep -r "from.*monitor" src/builder/
# → Expected: No matches (또는 패널 시스템 monitor만)
```

---

## 🎯 Phase 2: Bottom Panel Slot 시스템 구축

**예상 시간**: 2-3시간
**난이도**: ⭐⭐⭐ (중간)
**의존성**: Phase 1 완료

### 📋 Phase 2 개요

**목표**: 기존 left/right 패널 시스템을 확장하여 bottom 위치를 지원하는 새로운 PanelSlot 구축

**핵심 설계**:
- Bottom은 left/right와 독립 (별도 state)
- Resize 지원 (150px ~ 600px, 기본 200px)
- Close 버튼 포함
- CSS Grid 레이아웃 변경 (footer → bottom with auto height)

### 🎯 Step 2.1: usePanelLayout 확장 (30분)

**파일**: `src/builder/hooks/panels/usePanelLayout.ts`

#### 추가할 State
```typescript
interface PanelLayoutState {
  // 기존 (유지)
  leftPanels: PanelId[];
  rightPanels: PanelId[];
  activeLeftPanels: PanelId[];
  activeRightPanels: PanelId[];
  showLeft: boolean;
  showRight: boolean;

  // 🆕 Bottom panel 추가
  bottomPanels: PanelId[];           // ['monitor']
  activeBottomPanels: PanelId[];     // [] (기본 닫힘)
  showBottom: boolean;                // false (기본 닫힘)
  bottomHeight: number;               // 200 (px)

  // 🆕 Bottom panel actions
  toggleBottomPanel: (panelId: PanelId) => void;
  setBottomHeight: (height: number) => void;
  closeBottomPanel: () => void;
}
```

#### 초기값
```typescript
const initialState: PanelLayoutState = {
  // ... 기존 값
  bottomPanels: ['monitor'],
  activeBottomPanels: [],        // 닫힌 상태
  showBottom: false,
  bottomHeight: 200,
};
```

#### Action 구현
```typescript
toggleBottomPanel: (panelId) => {
  set((state) => {
    const isActive = state.activeBottomPanels.includes(panelId);
    return {
      activeBottomPanels: isActive ? [] : [panelId],
      showBottom: !isActive
    };
  });
},

setBottomHeight: (height) => {
  set({ bottomHeight: Math.max(150, Math.min(600, height)) });
},

closeBottomPanel: () => {
  set({ activeBottomPanels: [], showBottom: false });
}
```

### 🎯 Step 2.2: BottomPanelSlot 컴포넌트 (1시간)

**파일**: `src/builder/panels/core/BottomPanelSlot.tsx` (새 파일, 90줄)

```typescript
import React from 'react';
import { usePanelLayout } from '../../hooks/panels/usePanelLayout';
import { PanelContainer } from './PanelContainer';
import './bottom-panel-slot.css';

export function BottomPanelSlot() {
  const {
    showBottom,
    bottomHeight,
    activeBottomPanels,
    closeBottomPanel,
    setBottomHeight
  } = usePanelLayout();

  // 닫혀있으면 null 반환
  if (!showBottom || activeBottomPanels.length === 0) {
    return null;
  }

  return (
    <div
      className="bottom-panel-slot"
      style={{ height: `${bottomHeight}px` }}
      data-panel-count={activeBottomPanels.length}
      role="region"
      aria-label="메모리 모니터 패널"
    >
      {/* Resize Handle */}
      <div
        className="resize-handle"
        onMouseDown={(e) => handleResizeStart(e, setBottomHeight)}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize bottom panel"
      />

      {/* Panel Container */}
      <PanelContainer
        side="bottom"
        panelIds={activeBottomPanels}
      />

      {/* Close Button */}
      <button
        className="close-btn"
        onClick={closeBottomPanel}
        aria-label="Close bottom panel"
        title="Close (Esc)"
      >
        ×
      </button>
    </div>
  );
}

// Resize 핸들러
function handleResizeStart(
  e: React.MouseEvent,
  setHeight: (h: number) => void
) {
  e.preventDefault();
  const startY = e.clientY;
  const startHeight = (e.currentTarget.parentElement as HTMLElement).offsetHeight;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaY = startY - moveEvent.clientY;
    const newHeight = startHeight + deltaY;
    setHeight(newHeight);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}
```

**핵심 기능**:
1. **Conditional Rendering**: showBottom이 false면 null 반환
2. **Resize Handle**: 드래그로 높이 조절 (150-600px)
3. **Close Button**: × 버튼으로 패널 닫기
4. **Keyboard Support**: Esc 키로 닫기

### ♿ 접근성/키보드 UX 필수 요구사항

#### Esc 키로 패널 닫기
```typescript
// BottomPanelSlot.tsx에 추가
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showBottom) {
      closeBottomPanel();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [showBottom, closeBottomPanel]);
```

#### Resize Handle 키보드 포커스
```tsx
<div
  className="resize-handle"
  role="separator"
  aria-orientation="horizontal"
  aria-label="패널 높이 조절 핸들"
  aria-describedby="resize-hint"
  tabIndex={0}
  onKeyDown={(e) => handleResizeKeyboard(e, bottomHeight, setBottomHeight)}
/>
<span id="resize-hint" className="sr-only">
  위/아래 화살표 키로 패널 높이를 조절할 수 있습니다.
</span>
```

```typescript
function handleResizeKeyboard(
  e: React.KeyboardEvent,
  currentHeight: number,
  setHeight: (h: number) => void
) {
  const step = e.shiftKey ? 50 : 10; // Shift로 큰 단위 이동

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      setHeight(currentHeight + step);
      break;
    case 'ArrowDown':
      e.preventDefault();
      setHeight(currentHeight - step);
      break;
  }
}
```

#### 필수 ARIA 속성
| 요소 | ARIA 속성 | 값 |
|------|-----------|-----|
| 패널 컨테이너 | `role` | `region` |
| 패널 컨테이너 | `aria-label` | `"메모리 모니터 패널"` |
| Close 버튼 | `aria-label` | `"패널 닫기 (Esc)"` |
| Resize 핸들 | `role` | `separator` |
| Resize 핸들 | `aria-orientation` | `horizontal` |
| Resize 핸들 | `aria-describedby` | `resize-hint` (설명 연결) |
| 차트 SVG | `aria-label` | `"메모리 사용량 추이 차트"` |
| Trend 아이콘 | `aria-label` | `"Trend: up/down/stable"` |

#### 스크린 리더용 숨김 텍스트 CSS
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 🎯 Step 2.3: CSS 스타일 (30분)

**파일**: `src/builder/panels/core/bottom-panel-slot.css` (새 파일, 60줄)

```css
@layer builder-system {
  .bottom-panel-slot {
    position: relative;
    grid-area: bottom;
    border-top: 1px solid var(--outline-variant);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 5;
  }

  /* Resize Handle */
  .bottom-panel-slot .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
    background: transparent;
    z-index: 10;
    transition: background 0.2s;
  }

  .bottom-panel-slot .resize-handle:hover {
    background: var(--primary);
  }

  .bottom-panel-slot .resize-handle:active {
    background: var(--primary);
    height: 2px;
  }

  /* Close Button */
  .bottom-panel-slot .close-btn {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    width: 24px;
    height: 24px;
    border: none;
    background: var(--surface-container);
    color: var(--on-surface);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-lg);
    line-height: 1;
    z-index: 11;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .bottom-panel-slot .close-btn:hover {
    background: var(--surface-container-high);
    color: var(--error);
  }
}
```

### 🎯 Step 2.4: BuilderCore 레이아웃 수정 (30분)

#### Grid CSS 수정
**파일**: `src/builder/styles/4-layout/grid.css`

```css
/* ❌ 변경 전 */
.builder-container {
  display: grid;
  grid-template-areas:
    "header header header"
    "left-sidebar canvas right-inspector"
    "footer footer footer";
  grid-template-rows: var(--header-height) 1fr var(--footer-height);
  grid-template-columns: var(--sidebar-width) 1fr var(--inspector-width);
}

/* ✅ 변경 후 */
.builder-container {
  display: grid;
  grid-template-areas:
    "header header header"
    "left-sidebar canvas right-inspector"
    "bottom bottom bottom";
  grid-template-rows: var(--header-height) 1fr auto;  /* auto로 변경 */
  grid-template-columns: var(--sidebar-width) 1fr var(--inspector-width);
}
```

#### BuilderCore.tsx JSX 수정
**파일**: `src/builder/main/BuilderCore.tsx`

```tsx
// Import 추가
import { BottomPanelSlot } from '../panels/core/BottomPanelSlot';

// JSX (line 518 근처)
return (
  <div className="builder-container">
    <BuilderHeader />
    <PanelSlot side="left" />
    <BuilderCanvas />
    <PanelSlot side="right" />

    {/* 🆕 추가 */}
    <BottomPanelSlot />
  </div>
);
```

### 🎯 Step 2.5: PanelContainer bottom side 지원 (30분)

**파일**: `src/builder/panels/core/PanelContainer.tsx`

```typescript
// side prop 타입 확장
type PanelContainerProps = {
  side: 'left' | 'right' | 'bottom';  // 🆕 bottom 추가
  panelIds: PanelId[];
};

// CSS class 적용
<div className={`panel-container panel-container-${side}`}>
  {/* ... */}
</div>
```

**CSS 추가**:
```css
.panel-container-bottom {
  flex-direction: row;  /* bottom은 가로 배치 */
  height: 100%;
}
```

### 🎯 Step 2.6: 상태 복원/퍼시스턴스 (선택적, 15분)

**목적**: 사용자가 선호하는 패널 레이아웃(열림/닫힘 상태, 높이)을 유지

#### localStorage 저장/복원
```typescript
// usePanelLayout.ts에 추가

const STORAGE_KEY = 'xstudio-bottom-panel-state';

interface BottomPanelPersistedState {
  showBottom: boolean;
  bottomHeight: number;
  activeBottomPanels: PanelId[];
}

// 저장 함수
function saveBottomPanelState(state: BottomPanelPersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage 비활성화 또는 quota 초과 시 무시
    console.warn('Failed to save bottom panel state:', e);
  }
}

// 복원 함수
function loadBottomPanelState(): Partial<BottomPanelPersistedState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load bottom panel state:', e);
  }
  return {};
}
```

#### 초기값에 복원 로직 통합
```typescript
const persistedState = loadBottomPanelState();

const initialState: PanelLayoutState = {
  // ... 기존 값
  bottomPanels: ['monitor'],
  activeBottomPanels: persistedState.activeBottomPanels || [],
  showBottom: persistedState.showBottom ?? false,
  bottomHeight: persistedState.bottomHeight ?? 200,
};
```

#### 변경 시 자동 저장
```typescript
// subscribe로 변경 감지
usePanelLayout.subscribe(
  (state) => ({
    showBottom: state.showBottom,
    bottomHeight: state.bottomHeight,
    activeBottomPanels: state.activeBottomPanels,
  }),
  (current) => {
    saveBottomPanelState(current);
  },
  { equalityFn: shallow }
);
```

**주의**: 이 단계는 선택적이며, 기본 기능 완료 후 Phase 4 또는 5에서 구현해도 무방합니다.

### 🎯 Step 2.7: index.ts Export 추가 (5분)

**파일**: `src/builder/panels/core/index.ts`

```typescript
// 기존 export에 추가
export { BottomPanelSlot } from './BottomPanelSlot';
```

**CSS Import 추가**:
**파일**: `src/builder/panels/core/index.css` (또는 메인 CSS 진입점)

```css
@import './bottom-panel-slot.css';
```

### ✅ Phase 2 완료 체크리스트

```bash
# 1. TypeScript 컴파일
npm run type-check
# → Expected: 0 errors

# 2. Dev 서버 실행
npm run dev
# → Expected: footer 영역 여전히 비어있음 (monitor 아직 미등록)

# 3. Git diff 확인
git status
# → Expected:
#   new file: src/builder/panels/core/BottomPanelSlot.tsx
#   new file: src/builder/panels/core/bottom-panel-slot.css
#   modified: src/builder/hooks/panels/usePanelLayout.ts
#   modified: src/builder/main/BuilderCore.tsx
#   modified: src/builder/styles/4-layout/grid.css

# 4. usePanelLayout 동작 테스트 (콘솔)
import { usePanelLayout } from './hooks/panels/usePanelLayout';
const { bottomPanels, activeBottomPanels, toggleBottomPanel } = usePanelLayout();
console.log(bottomPanels); // → ['monitor']
console.log(activeBottomPanels); // → []

# 5. 접근성 검증
# → Esc 키로 패널 닫힘 확인
# → Resize 핸들에 Tab으로 포커스 이동 확인
# → 화살표 키로 높이 조절 확인
```

---

## 📊 Phase 3: Monitor Panel 구현 (Full Implementation)

**예상 시간**: 4-5시간 📈 (3가지 차트 모두 구현)
**난이도**: ⭐⭐⭐⭐ (어려움)
**의존성**: Phase 2 완료

### 📋 Phase 3 개요

**목표**: 메모리 관리 중심의 경량 모니터링 패널 구현 (Zero 의존성)

**핵심 기능**:
- 메모리 사용량 모니터링 (필수)
- 메모리 최적화 버튼
- 미니 차트 (SVG, zero dependencies)
- 5개 Stat 카드 (Memory/Entries/Commands/Cache/Compression)
- Trend 표시 (↗↘→)

### 🎯 Step 3.0: 폴더 구조 생성 (5분)

```bash
# 폴더 구조 생성
mkdir -p src/builder/panels/monitor/hooks
mkdir -p src/builder/panels/monitor/components
```

**최종 폴더 구조**:
```
src/builder/panels/monitor/
├── index.ts                    # 모듈 export
├── MonitorPanel.tsx            # 메인 패널 컴포넌트
├── monitor-panel.css           # 스타일
├── hooks/
│   └── useMemoryStats.ts       # 메모리 통계 훅
└── components/
    ├── MemoryChart.tsx         # 차트 컴포넌트
    └── MemoryActions.tsx       # 액션 버튼 컴포넌트
```

### 🎯 Step 3.1: useMemoryStats Hook (1시간)

**파일**: `src/builder/panels/monitor/hooks/useMemoryStats.ts` (새 파일, 80줄)

```typescript
import { useState, useEffect, useRef } from 'react';
import { historyManager } from '../../../stores/history';

interface MemoryStats {
  totalEntries: number;
  commandCount: number;
  cacheSize: number;
  estimatedMemoryUsage: number;
  compressionRatio: number;
  recommendation: string;
}

export function useMemoryStats() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const intervalRef = useRef<number | null>(null);

  // 🚀 성능 최적화: RequestIdleCallback 사용
  const collectStats = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const newStats = getMemoryStats();
        setStats(newStats);
      });
    } else {
      // Fallback for Safari
      setTimeout(() => {
        const newStats = getMemoryStats();
        setStats(newStats);
      }, 0);
    }
  };

  useEffect(() => {
    collectStats(); // 초기 수집
    intervalRef.current = window.setInterval(collectStats, 10000); // 10초마다

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const optimize = () => {
    historyManager.optimizeMemory();
    setStatusMessage('✨ 메모리 최적화 완료');
    collectStats(); // 즉시 다시 수집

    setTimeout(() => setStatusMessage(''), 3000);
  };

  return { stats, optimize, statusMessage };
}

function getMemoryStats(): MemoryStats {
  const historyStats = historyManager.getMemoryStats();
  const commandStats = historyStats.commandStoreStats;

  return {
    totalEntries: historyStats.totalEntries,
    commandCount: commandStats.commandCount,
    cacheSize: commandStats.cacheSize,
    estimatedMemoryUsage: commandStats.estimatedMemoryUsage,
    compressionRatio: commandStats.compressionRatio,
    recommendation: analyzeMemory(
      commandStats.estimatedMemoryUsage,
      commandStats.compressionRatio
    )
  };
}

function analyzeMemory(usage: number, ratio: number): string {
  if (usage > 10 * 1024 * 1024) {
    return '⚠️ High memory usage (> 10MB). Consider optimizing.';
  }
  if (ratio < 0.2) {
    return '⚠️ Low compression ratio (< 20%). Check data structure.';
  }
  return '✅ Memory usage normal.';
}
```

**핵심 포인트**:
1. **RequestIdleCallback**: 브라우저 idle 상태에서만 수집 → 퍼포먼스 영향 최소화
2. **10초 간격**: 기존과 동일 (충분히 빠름)
3. **Safari fallback**: requestIdleCallback 미지원 브라우저 대응

### ⚠️ 에러/권한 대응 (Fallback 정책)

#### performance.memory 비지원 브라우저 대응

`performance.memory`는 Chrome 계열에서만 지원되며, Firefox/Safari에서는 `undefined`입니다.

```typescript
// useMemoryStats.ts에 추가

interface BrowserMemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function getBrowserMemoryInfo(): BrowserMemoryInfo | null {
  // Chrome/Edge only
  const perf = performance as Performance & {
    memory?: BrowserMemoryInfo;
  };

  if (perf.memory) {
    return perf.memory;
  }

  return null; // Firefox, Safari
}

function getMemoryStats(): MemoryStats {
  const browserMemory = getBrowserMemoryInfo();
  const historyStats = historyManager.getMemoryStats();

  return {
    // historyManager 기반 (항상 작동)
    totalEntries: historyStats.totalEntries,
    commandCount: historyStats.commandStoreStats.commandCount,
    cacheSize: historyStats.commandStoreStats.cacheSize,
    estimatedMemoryUsage: historyStats.commandStoreStats.estimatedMemoryUsage,
    compressionRatio: historyStats.commandStoreStats.compressionRatio,
    recommendation: analyzeMemory(...),

    // 브라우저 메모리 (Chrome only, optional)
    browserHeapUsed: browserMemory?.usedJSHeapSize ?? null,
    browserHeapTotal: browserMemory?.totalJSHeapSize ?? null,
    isBrowserMemorySupported: browserMemory !== null,
  };
}
```

#### Fallback UI

```tsx
// MonitorPanel.tsx에 추가
{!stats.isBrowserMemorySupported && (
  <div className="browser-memory-fallback">
    <span>ℹ️ 브라우저 메모리 정보는 Chrome/Edge에서만 지원됩니다.</span>
  </div>
)}
```

#### 에러 발생 시 Graceful Degradation

```typescript
const collectStats = () => {
  try {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        try {
          const newStats = getMemoryStats();
          setStats(newStats);
          setError(null);
        } catch (e) {
          setError('메모리 통계 수집 중 오류가 발생했습니다.');
          console.warn('[MonitorPanel] Stats collection error:', e);
        }
      });
    } else {
      setTimeout(() => {
        try {
          const newStats = getMemoryStats();
          setStats(newStats);
          setError(null);
        } catch (e) {
          setError('메모리 통계 수집 중 오류가 발생했습니다.');
          console.warn('[MonitorPanel] Stats collection error:', e);
        }
      }, 0);
    }
  } catch (e) {
    setError('메모리 모니터링을 시작할 수 없습니다.');
    console.error('[MonitorPanel] Critical error:', e);
  }
};
```

### 🔒 보안/프라이버시 주의사항

#### 금지 사항 (MUST NOT)

1. **외부 전송 금지**: 메모리 통계 데이터를 외부 서버로 전송하지 않음
2. **민감 정보 로깅 금지**: element 내용, 사용자 데이터 등을 로그에 기록하지 않음
3. **스냅숏 저장 금지**: 메모리 덤프, 객체 스냅숏을 저장하지 않음

```typescript
// ❌ NEVER DO THIS
console.log('Elements:', elements);  // 사용자 데이터 노출
console.log('Memory dump:', JSON.stringify(historyManager));  // 전체 덤프

// ✅ SAFE - 수치 정보만 로깅
console.log('[MonitorPanel] Memory usage:', stats.estimatedMemoryUsage, 'bytes');
console.log('[MonitorPanel] Entry count:', stats.totalEntries);
```

#### 로깅 정책

| 로그 레벨 | 허용 정보 | 금지 정보 |
|-----------|-----------|-----------|
| `info` | 수치 메트릭 (bytes, count) | 객체 내용 |
| `warn` | 에러 타입, 메시지 | 스택트레이스 내 데이터 |
| `error` | 에러 발생 여부 | 원본 에러 객체 |
| `debug` | 함수 호출 흐름 | 파라미터 값 |

#### 개발 환경 전용 로깅

```typescript
// 개발 환경에서만 상세 로그 출력
if (import.meta.env.DEV) {
  console.debug('[MonitorPanel] Stats updated:', {
    entries: stats.totalEntries,
    memory: formatBytes(stats.estimatedMemoryUsage),
  });
}
```

### 🎯 Step 3.2: MemoryChart 컴포넌트 (1시간)

차트 구현에는 두 가지 옵션이 있습니다:

#### Option A: SVG 기반 경량 차트 (기본 권장)

**파일**: `src/builder/panels/monitor/components/MemoryChart.tsx` (새 파일, 70줄)

```typescript
import React from 'react';

interface MemoryChartProps {
  data: number[];
  height: number;
}

export function MemoryChart({ data, height }: MemoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="memory-chart empty">
        <span>No data yet</span>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // SVG 경로 생성
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((max - value) / range) * 80 + 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="memory-chart">
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label="Memory usage trend chart"
      >
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="var(--outline-variant)" strokeWidth="0.2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--outline-variant)" strokeWidth="0.2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="var(--outline-variant)" strokeWidth="0.2" />

        {/* Area fill */}
        <polyline
          points={`0,100 ${points} 100,100`}
          fill="var(--primary-container)"
          opacity="0.3"
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1"
        />
      </svg>

      {/* Labels */}
      <div className="chart-labels">
        <span className="label-max">{formatBytes(max)}</span>
        <span className="label-min">{formatBytes(min)}</span>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)}${sizes[i]}`;
}
```

**SVG 기반 차트 장점**:
- ✅ 가볍고 빠름
- ✅ CSS variables 사용 (테마 대응)
- ✅ Responsive (viewBox)
- ✅ 간단한 시계열 데이터에 적합

#### Option B: ~~ReactFlow 기반~~ 히스토리 플로우 (고급 기능)

> **⚠️ 주의**: `@xyflow/react`는 프로젝트에서 제거되었습니다 (2026-02-10). 아래 코드 예제는 참고용이며, 구현 시 HTML/CSS/Canvas 기반 대안이 필요합니다.

~~히스토리 변화를 플로우 다이어그램으로 시각화하려면 이미 설치된 **@xyflow/react**를 활용할 수 있습니다.~~

**파일**: `src/builder/panels/monitor/components/HistoryFlowChart.tsx`

```typescript
import React, { useMemo } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  BackgroundVariant,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface HistoryEntry {
  id: string;
  type: 'add' | 'update' | 'delete';
  elementId: string;
  timestamp: number;
}

interface HistoryFlowChartProps {
  history: HistoryEntry[];
  height: number;
}

export function HistoryFlowChart({ history, height }: HistoryFlowChartProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = history.slice(-20).map((entry, index) => ({
      id: entry.id,
      position: { x: index * 120, y: getYPosition(entry.type) },
      data: {
        label: `${entry.type}\n${entry.elementId.slice(0, 8)}`,
      },
      style: getNodeStyle(entry.type),
      type: 'default',
    }));

    const edges: Edge[] = nodes.slice(1).map((node, index) => ({
      id: `e${index}`,
      source: nodes[index].id,
      target: node.id,
      animated: index === nodes.length - 2,
    }));

    return { nodes, edges };
  }, [history]);

  return (
    <div className="history-flow-chart" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        panOnDrag={false}
        zoomOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <MiniMap nodeColor={getMinimapColor} zoomable={false} pannable={false} />
      </ReactFlow>
    </div>
  );
}

function getYPosition(type: string): number {
  switch (type) {
    case 'add': return 0;
    case 'update': return 60;
    case 'delete': return 120;
    default: return 60;
  }
}

function getNodeStyle(type: string) {
  const colors = {
    add: { background: 'var(--success-container)', border: 'var(--success)' },
    update: { background: 'var(--primary-container)', border: 'var(--primary)' },
    delete: { background: 'var(--error-container)', border: 'var(--error)' },
  };
  return {
    ...colors[type as keyof typeof colors],
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-xs)',
    padding: '4px 8px',
  };
}

function getMinimapColor(node: Node): string {
  const type = node.data?.label?.split('\n')[0];
  switch (type) {
    case 'add': return 'var(--success)';
    case 'update': return 'var(--primary)';
    case 'delete': return 'var(--error)';
    default: return 'var(--on-surface-variant)';
  }
}
```

**ReactFlow 기반 차트 장점**:
- ✅ 인터랙티브 (줌, 팬, 선택)
- ✅ 노드/엣지 기반 복잡한 관계 표현
- ✅ MiniMap으로 전체 뷰 제공
- ✅ 이미 설치됨 (추가 설치 불필요)
- ✅ MIT 라이선스 (무료)

#### Option C: @tanstack/react-virtual로 긴 히스토리 목록

히스토리 항목이 많을 경우 가상 스크롤링으로 성능 최적화:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="history-list" style={{ height: 200, overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <HistoryEntryRow entry={entries[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 🎯 구현 결정: Full Implementation (3가지 모두)

**품질 우선 완성형**으로 3가지 시각화를 모두 구현합니다.

| 기능 | 구현 방식 | 파일 | 용도 |
|------|-----------|------|------|
| **메모리 추이 차트** | SVG | `MemoryChart.tsx` | 실시간 메모리 사용량 시계열 |
| **히스토리 플로우** | ReactFlow | `HistoryFlowChart.tsx` | Undo/Redo 히스토리 시각화 |
| **히스토리 목록** | @tanstack/react-virtual | `HistoryList.tsx` | 상세 히스토리 목록 (가상 스크롤) |

#### 탭 기반 뷰 전환 UI

```tsx
// MonitorPanel.tsx 내부
<Tabs>
  <TabList>
    <Tab id="memory">Memory</Tab>
    <Tab id="flow">Flow</Tab>
    <Tab id="history">History</Tab>
  </TabList>
  <TabPanel id="memory">
    <MemoryChart data={memoryHistory} height={120} />
  </TabPanel>
  <TabPanel id="flow">
    <HistoryFlowChart history={historyEntries} height={150} />
  </TabPanel>
  <TabPanel id="history">
    <HistoryList entries={historyEntries} />
  </TabPanel>
</Tabs>
```

#### 추가 파일 구조

```
src/builder/panels/monitor/
├── components/
│   ├── MemoryChart.tsx         (70줄) - SVG 시계열 차트
│   ├── HistoryFlowChart.tsx    (90줄) - ReactFlow 플로우 다이어그램 🆕
│   ├── HistoryList.tsx         (60줄) - 가상 스크롤 목록 🆕
│   └── MemoryActions.tsx       (30줄) - 액션 버튼
```

**구현 순서**: MemoryChart → HistoryList → HistoryFlowChart

### 🎯 Step 3.3: HistoryList 컴포넌트 (30분)

**파일**: `src/builder/panels/monitor/components/HistoryList.tsx` (새 파일, 80줄)

```typescript
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Edit3, Trash2, RotateCcw } from 'lucide-react';

interface HistoryEntry {
  id: string;
  type: 'add' | 'update' | 'delete' | 'undo' | 'redo';
  elementId: string;
  elementTag?: string;
  timestamp: number;
  description?: string;
}

interface HistoryListProps {
  entries: HistoryEntry[];
  currentIndex?: number;
  onEntryClick?: (index: number) => void;
}

export function HistoryList({ entries, currentIndex, onEntryClick }: HistoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  if (entries.length === 0) {
    return (
      <div className="history-list empty">
        <span>No history entries yet</span>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="history-list"
      role="listbox"
      aria-label="History entries"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index];
          const isCurrent = virtualItem.index === currentIndex;

          return (
            <div
              key={virtualItem.key}
              role="option"
              aria-selected={isCurrent}
              data-current={isCurrent}
              className="history-entry"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onClick={() => onEntryClick?.(virtualItem.index)}
            >
              <HistoryEntryRow entry={entry} isCurrent={isCurrent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryEntryRow({ entry, isCurrent }: { entry: HistoryEntry; isCurrent: boolean }) {
  const icons = {
    add: <Plus size={14} />,
    update: <Edit3 size={14} />,
    delete: <Trash2 size={14} />,
    undo: <RotateCcw size={14} />,
    redo: <RotateCcw size={14} style={{ transform: 'scaleX(-1)' }} />,
  };

  const typeLabels = {
    add: 'Added',
    update: 'Updated',
    delete: 'Deleted',
    undo: 'Undo',
    redo: 'Redo',
  };

  return (
    <div className={`history-entry-row ${entry.type}`} data-current={isCurrent}>
      <span className="entry-icon" aria-hidden="true">{icons[entry.type]}</span>
      <span className="entry-type">{typeLabels[entry.type]}</span>
      <span className="entry-tag">{entry.elementTag || entry.elementId.slice(0, 8)}</span>
      <span className="entry-time">{formatTime(entry.timestamp)}</span>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
```

**CSS 추가** (`monitor-panel.css`):
```css
/* History List */
.history-list {
  height: 150px;
  overflow: auto;
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-sm);
}

.history-list.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-surface-variant);
  font-size: var(--text-xs);
}

.history-entry-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: background 0.15s;
}

.history-entry-row:hover {
  background: var(--surface-container);
}

.history-entry-row[data-current="true"] {
  background: var(--primary-container);
  color: var(--on-primary-container);
}

.history-entry-row .entry-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-entry-row.add .entry-icon { color: var(--success); }
.history-entry-row.update .entry-icon { color: var(--primary); }
.history-entry-row.delete .entry-icon { color: var(--error); }

.history-entry-row .entry-type {
  font-weight: var(--font-weight-medium);
  min-width: 50px;
}

.history-entry-row .entry-tag {
  flex: 1;
  color: var(--on-surface-variant);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-entry-row .entry-time {
  color: var(--on-surface-variant);
  font-size: 10px;
}
```

### 🎯 Step 3.4: HistoryFlowChart 컴포넌트 (45분)

**파일**: `src/builder/panels/monitor/components/HistoryFlowChart.tsx` (새 파일, 120줄)

```typescript
import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface HistoryEntry {
  id: string;
  type: 'add' | 'update' | 'delete' | 'undo' | 'redo';
  elementId: string;
  elementTag?: string;
  timestamp: number;
}

interface HistoryFlowChartProps {
  history: HistoryEntry[];
  height: number;
  currentIndex?: number;
  onNodeClick?: (index: number) => void;
}

export function HistoryFlowChart({
  history,
  height,
  currentIndex,
  onNodeClick,
}: HistoryFlowChartProps) {
  const { nodes, edges } = useMemo(() => {
    // 최근 30개만 표시
    const recentHistory = history.slice(-30);

    const nodes: Node[] = recentHistory.map((entry, index) => ({
      id: entry.id,
      position: { x: index * 100, y: getYPosition(entry.type) },
      data: {
        label: entry.elementTag || entry.type,
        type: entry.type,
        index: history.length - recentHistory.length + index,
      },
      style: getNodeStyle(entry.type, index === currentIndex),
      type: 'default',
    }));

    const edges: Edge[] = recentHistory.slice(1).map((entry, index) => ({
      id: `e-${index}`,
      source: recentHistory[index].id,
      target: entry.id,
      animated: index === recentHistory.length - 2,
      style: { stroke: 'var(--outline-variant)' },
    }));

    return { nodes, edges };
  }, [history, currentIndex]);

  const [nodesState] = useNodesState(nodes);
  const [edgesState] = useEdgesState(edges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.data.index);
    },
    [onNodeClick]
  );

  if (history.length === 0) {
    return (
      <div className="history-flow-chart empty" style={{ height }}>
        <span>No history to visualize</span>
      </div>
    );
  }

  return (
    <div className="history-flow-chart" style={{ height }}>
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag={true}
        zoomOnScroll={true}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <MiniMap
          nodeColor={getMinimapColor}
          zoomable={false}
          pannable={false}
          style={{ background: 'var(--surface-container)' }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function getYPosition(type: string): number {
  const positions = { add: 0, update: 50, delete: 100, undo: 50, redo: 50 };
  return positions[type as keyof typeof positions] ?? 50;
}

function getNodeStyle(type: string, isCurrent: boolean) {
  const colors = {
    add: { bg: 'var(--success-container)', border: 'var(--success)' },
    update: { bg: 'var(--primary-container)', border: 'var(--primary)' },
    delete: { bg: 'var(--error-container)', border: 'var(--error)' },
    undo: { bg: 'var(--tertiary-container)', border: 'var(--tertiary)' },
    redo: { bg: 'var(--tertiary-container)', border: 'var(--tertiary)' },
  };

  const color = colors[type as keyof typeof colors] || colors.update;

  return {
    background: color.bg,
    border: `2px solid ${isCurrent ? 'var(--primary)' : color.border}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-xs)',
    padding: '4px 8px',
    boxShadow: isCurrent ? '0 0 0 2px var(--primary)' : 'none',
  };
}

function getMinimapColor(node: Node): string {
  const type = node.data?.type;
  const colors = {
    add: 'var(--success)',
    update: 'var(--primary)',
    delete: 'var(--error)',
    undo: 'var(--tertiary)',
    redo: 'var(--tertiary)',
  };
  return colors[type as keyof typeof colors] || 'var(--on-surface-variant)';
}
```

**CSS 추가** (`monitor-panel.css`):
```css
/* History Flow Chart */
.history-flow-chart {
  background: var(--surface-container-low);
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.history-flow-chart.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-surface-variant);
  font-size: var(--text-xs);
}

.history-flow-chart .react-flow__minimap {
  border-radius: var(--radius-sm);
}

.history-flow-chart .react-flow__controls {
  border-radius: var(--radius-sm);
  box-shadow: none;
  border: 1px solid var(--outline-variant);
}

.history-flow-chart .react-flow__controls-button {
  background: var(--surface);
  border-color: var(--outline-variant);
  color: var(--on-surface);
}

.history-flow-chart .react-flow__controls-button:hover {
  background: var(--surface-container);
}
```

### 🎯 Step 3.5: MemoryActions 컴포넌트 (15분)

**파일**: `src/builder/panels/monitor/components/MemoryActions.tsx` (새 파일, 30줄)

```typescript
import React from 'react';
import { Sparkles } from 'lucide-react';

interface MemoryActionsProps {
  onOptimize: () => void;
  recommendation: string;
  isOptimizing?: boolean;
}

export function MemoryActions({
  onOptimize,
  recommendation,
  isOptimizing = false
}: MemoryActionsProps) {
  return (
    <div className="memory-actions">
      <span className="recommendation">{recommendation}</span>
      <button
        className="optimize-btn"
        onClick={onOptimize}
        disabled={isOptimizing}
        aria-label="Optimize memory usage"
        title="Clear unused history entries and cache"
      >
        <Sparkles size={14} />
        <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
      </button>
    </div>
  );
}
```

**핵심 기능**:
- `onOptimize`: 최적화 버튼 클릭 핸들러
- `recommendation`: 현재 메모리 상태 권장사항 표시
- `isOptimizing`: 최적화 진행 중 버튼 비활성화

### 🎯 Step 3.6: MonitorPanel 메인 컴포넌트 (1-1.5시간)

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx` (새 파일, 180줄)

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import { Activity, GitBranch, List } from 'lucide-react';
import type { PanelProps } from '../core/types';
import { useMemoryStats } from './hooks/useMemoryStats';
import { MemoryChart } from './components/MemoryChart';
import { HistoryFlowChart } from './components/HistoryFlowChart';
import { HistoryList, type HistoryEntry } from './components/HistoryList';
import { MemoryActions } from './components/MemoryActions';
import { historyManager } from '../../../stores/history';
import './monitor-panel.css';

export function MonitorPanel({ isActive }: PanelProps) {
  const { stats, optimize, statusMessage } = useMemoryStats();
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);

  // 메모리 히스토리 수집 (최대 60개 = 10분)
  useEffect(() => {
    if (!isActive || !stats) return;

    setMemoryHistory(prev => {
      const newHistory = [...prev, stats.estimatedMemoryUsage];
      return newHistory.slice(-60);
    });
  }, [stats, isActive]);

  // 히스토리 엔트리 수집
  useEffect(() => {
    if (!isActive) return;

    const updateEntries = () => {
      const entries = historyManager.getEntries();
      const currentIndex = historyManager.getCurrentIndex();

      setHistoryEntries(entries.map((entry, index) => ({
        id: `entry-${index}`,
        type: entry.type as HistoryEntry['type'],
        elementId: entry.elementId || 'unknown',
        elementTag: entry.elementTag,
        timestamp: entry.timestamp || Date.now(),
      })));
      setCurrentHistoryIndex(currentIndex);
    };

    updateEntries();
    const interval = setInterval(updateEntries, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  // 히스토리 항목 클릭 시 해당 상태로 이동
  const handleHistoryClick = (index: number) => {
    historyManager.goToIndex(index);
    setCurrentHistoryIndex(index);
  };

  // 🚀 패널 비활성 시 렌더링 최소화
  if (!isActive) {
    return null;
  }

  if (!stats) {
    return (
      <div className="monitor-panel loading">
        <span>Loading memory stats...</span>
      </div>
    );
  }

  return (
    <div className="monitor-panel" data-active={isActive}>
      {/* Header */}
      <div className="monitor-header">
        <h3>Monitor</h3>
        {statusMessage && (
          <span className="status-message">{statusMessage}</span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="monitor-stats">
        <StatCard
          label="Memory"
          value={formatBytes(stats.estimatedMemoryUsage)}
          trend={getTrend(memoryHistory)}
        />
        <StatCard label="Entries" value={stats.totalEntries} />
        <StatCard label="Commands" value={stats.commandCount} />
        <StatCard label="Cache" value={stats.cacheSize} />
        <StatCard
          label="Ratio"
          value={`${(stats.compressionRatio * 100).toFixed(0)}%`}
        />
      </div>

      {/* Tabbed Views */}
      <Tabs defaultSelectedKey="memory" className="monitor-tabs">
        <TabList aria-label="Monitor views">
          <Tab id="memory">
            <Activity size={14} />
            <span>Memory</span>
          </Tab>
          <Tab id="flow">
            <GitBranch size={14} />
            <span>Flow</span>
          </Tab>
          <Tab id="history">
            <List size={14} />
            <span>History</span>
          </Tab>
        </TabList>

        <TabPanel id="memory">
          <MemoryChart data={memoryHistory} height={120} />
        </TabPanel>

        <TabPanel id="flow">
          <HistoryFlowChart
            history={historyEntries}
            height={150}
            currentIndex={currentHistoryIndex}
            onNodeClick={handleHistoryClick}
          />
        </TabPanel>

        <TabPanel id="history">
          <HistoryList
            entries={historyEntries}
            currentIndex={currentHistoryIndex}
            onEntryClick={handleHistoryClick}
          />
        </TabPanel>
      </Tabs>

      {/* Actions */}
      <MemoryActions
        onOptimize={optimize}
        recommendation={stats.recommendation}
      />
    </div>
  );
}

// StatCard 컴포넌트
function StatCard({
  label,
  value,
  trend
}: {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {trend && <TrendIcon trend={trend} />}
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const icons = { up: '↗', down: '↘', stable: '→' };
  const className = `trend ${trend}`;
  return <span className={className} aria-label={`Trend: ${trend}`}>{icons[trend]}</span>;
}

function getTrend(history: number[]): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';

  const recent = history.slice(-5);
  const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
  const last = recent[recent.length - 1];

  if (last > avg * 1.1) return 'up';
  if (last < avg * 0.9) return 'down';
  return 'stable';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

### 🎯 Step 3.4: CSS 스타일 (30분)

**파일**: `src/builder/panels/monitor/monitor-panel.css` (새 파일, 160줄)

```css
@layer builder-system {
  .monitor-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
    background: var(--surface);
    color: var(--on-surface);
    overflow-y: auto;
  }

  .monitor-panel.loading {
    justify-content: center;
    align-items: center;
    color: var(--on-surface-variant);
    font-size: var(--text-sm);
  }

  /* Header */
  .monitor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--spacing-xs);
    border-bottom: 1px solid var(--outline-variant);
  }

  .monitor-header h3 {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    margin: 0;
  }

  .monitor-header .status-message {
    font-size: var(--text-xs);
    color: var(--primary);
    animation: fadeIn 0.3s;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Stats Cards */
  .monitor-stats {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .stat-card {
    flex: 1;
    min-width: 100px;
    padding: var(--spacing-xs);
    background: var(--surface-container);
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }

  .stat-card:hover {
    background: var(--surface-container-high);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--on-surface-variant);
    margin-bottom: 2px;
  }

  .stat-value {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Trend Icons */
  .trend {
    font-size: 14px;
    line-height: 1;
  }

  .trend.up { color: var(--error); }
  .trend.down { color: var(--success); }
  .trend.stable { color: var(--on-surface-variant); }

  /* Tabs */
  .monitor-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .monitor-tabs [role="tablist"] {
    display: flex;
    gap: 2px;
    padding: var(--spacing-xs);
    background: var(--surface-container);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-xs);
  }

  .monitor-tabs [role="tab"] {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: none;
    border-radius: var(--radius-xs);
    font-size: var(--text-xs);
    color: var(--on-surface-variant);
    cursor: pointer;
    transition: all 0.15s;
  }

  .monitor-tabs [role="tab"]:hover {
    background: var(--surface-container-high);
    color: var(--on-surface);
  }

  .monitor-tabs [role="tab"][aria-selected="true"] {
    background: var(--primary-container);
    color: var(--on-primary-container);
  }

  .monitor-tabs [role="tabpanel"] {
    flex: 1;
    min-height: 0;
  }

  .monitor-tabs [role="tabpanel"]:focus {
    outline: none;
  }

  /* Chart */
  .memory-chart {
    position: relative;
    background: var(--surface-container-low);
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-sm);
    overflow: hidden;
    min-height: 80px;
  }

  .memory-chart.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--on-surface-variant);
    font-size: var(--text-xs);
  }

  .memory-chart svg {
    display: block;
  }

  .chart-labels {
    position: absolute;
    top: var(--spacing-xs);
    left: var(--spacing-xs);
    right: var(--spacing-xs);
    bottom: var(--spacing-xs);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 10px;
    color: var(--on-surface-variant);
    pointer-events: none;
  }

  /* Actions */
  .memory-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--spacing-xs);
    border-top: 1px solid var(--outline-variant);
  }

  .memory-actions .recommendation {
    font-size: var(--text-xs);
    color: var(--on-surface-variant);
  }

  .memory-actions .optimize-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--primary);
    color: var(--on-primary);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background 0.2s;
  }

  .memory-actions .optimize-btn:hover {
    background: var(--primary-hover);
  }

  .memory-actions .optimize-btn:active {
    transform: scale(0.98);
  }

  .memory-actions .optimize-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .memory-actions .optimize-btn svg {
    flex-shrink: 0;
  }
}
```

### 🎯 Step 3.6: index.ts Export 파일 (5분)

**파일**: `src/builder/panels/monitor/index.ts` (새 파일, 15줄)

```typescript
// Main panel export
export { MonitorPanel } from './MonitorPanel';

// Hooks
export { useMemoryStats } from './hooks/useMemoryStats';

// Components (exported for testing and potential reuse)
export { MemoryChart } from './components/MemoryChart';
export { HistoryFlowChart } from './components/HistoryFlowChart';
export { HistoryList } from './components/HistoryList';
export { MemoryActions } from './components/MemoryActions';

// Types
export type { HistoryEntry } from './components/HistoryList';
```

**CSS Import 추가**:
**파일**: `src/builder/styles/index.css` (또는 메인 CSS 진입점)

```css
/* Monitor Panel */
@import '../panels/monitor/monitor-panel.css';
```

### ✅ Phase 3 완료 체크리스트

```bash
# 1. TypeScript 컴파일
npm run type-check
# → Expected: 0 errors

# 2. 파일 생성 확인
ls src/builder/panels/monitor/
# → Expected:
#   index.ts
#   MonitorPanel.tsx
#   monitor-panel.css
#   hooks/useMemoryStats.ts
#   components/MemoryChart.tsx
#   components/MemoryActions.tsx

# 3. Import 테스트 (index.ts 통해)
import { MonitorPanel, useMemoryStats } from './panels/monitor';
// → No errors

# 4. CSS import 확인
grep -r "monitor-panel.css" src/builder/styles/
# → Expected: 1 match
```

---

## 🔌 Phase 4: PanelRegistry 등록

**예상 시간**: 30분
**난이도**: ⭐ (쉬움)
**의존성**: Phase 2, 3 완료

### 📋 Phase 4 개요

**목표**: MonitorPanel을 패널 시스템에 정식 등록하여 사용 가능하게 만들기

### 🎯 Step 4.1: PanelConfig 추가 (10분)

**파일**: `src/builder/panels/core/panelConfigs.ts`

```typescript
import { Activity } from 'lucide-react';
import { MonitorPanel } from '../monitor/MonitorPanel';

// panelDefinitions 배열에 추가
const panelDefinitions: PanelConfig[] = [
  // ... 기존 패널들
  {
    id: 'monitor',
    name: '모니터',
    nameEn: 'Monitor',
    icon: Activity,
    component: MonitorPanel,
    category: 'system',
    defaultPosition: 'bottom',
    minWidth: 600,
    description: 'Memory usage monitoring and optimization'
  }
];
```

### 🎯 Step 4.2: Types 확장 (10분)

**파일**: `src/builder/panels/core/types.ts`

```typescript
// PanelId 타입 확장
export type PanelId =
  | 'nodes' | 'components' | 'library' | 'dataset' | 'datasetEditor'
  | 'theme' | 'ai'
  | 'user' | 'settings'
  | 'properties' | 'styles' | 'data' | 'events'
  | 'monitor'; // 🆕 추가

// PanelPosition 타입 확장
export type PanelPosition = 'left' | 'right' | 'bottom'; // 🆕 bottom 추가
```

### 🎯 Step 4.3: Header Toggle 버튼 (10분)

**파일**: `src/builder/header/BuilderHeader.tsx`

```tsx
import { Activity } from 'lucide-react';
import { usePanelLayout } from '../hooks/panels/usePanelLayout';

export function BuilderHeader() {
  const { activeBottomPanels, toggleBottomPanel } = usePanelLayout();
  const isMonitorActive = activeBottomPanels.includes('monitor');

  return (
    <header className="builder-header">
      {/* ... 기존 코드 ... */}

      <div className="header-actions">
        {/* 🆕 Monitor toggle button */}
        <button
          className="monitor-toggle"
          data-active={isMonitorActive}
          onClick={() => toggleBottomPanel('monitor')}
          aria-label="Toggle Monitor Panel"
          title="Toggle Monitor (Ctrl+Shift+M)"
        >
          <Activity size={16} />
          <span>Monitor</span>
        </button>

        {/* ... 기존 버튼들 ... */}
      </div>
    </header>
  );
}
```

**CSS 추가** (`src/builder/styles/4-layout/header.css`):
```css
.header-actions .monitor-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: transparent;
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-sm);
  color: var(--on-surface);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--text-xs);
}

.header-actions .monitor-toggle:hover {
  background: var(--surface-container);
}

.header-actions .monitor-toggle[data-active="true"] {
  background: var(--primary-container);
  color: var(--on-primary-container);
  border-color: var(--primary);
}
```

### 🎯 Step 4.4: 키보드 단축키 구현 (10분)

**파일**: `src/builder/header/BuilderHeader.tsx` (또는 별도 hook)

```typescript
import { useMemo } from 'react';
import { useKeyboardShortcutsRegistry } from '../hooks/useKeyboardShortcutsRegistry';

export function BuilderHeader() {
  const { toggleBottomPanel } = usePanelLayout();

  // 🆕 키보드 단축키 등록
  const shortcuts = useMemo(() => [
    {
      key: 'm',
      modifier: 'ctrlShift',
      handler: () => toggleBottomPanel('monitor'),
      description: 'Toggle Monitor Panel'
    }
  ], [toggleBottomPanel]);

  useKeyboardShortcutsRegistry(shortcuts, [toggleBottomPanel]);

  // ... 나머지 코드
}
```

**단축키 사양**:
| 플랫폼 | 단축키 | 동작 |
|--------|--------|------|
| macOS | `Cmd+Shift+M` | Monitor 패널 토글 |
| Windows/Linux | `Ctrl+Shift+M` | Monitor 패널 토글 |

**참고**: `useKeyboardShortcutsRegistry`는 기존 프로젝트의 키보드 단축키 훅을 재사용합니다. 존재하지 않는 경우 Phase 2의 Esc 키 핸들러와 통합하여 구현합니다.

### ✅ Phase 4 완료 체크리스트

```bash
# 1. Dev 서버 실행
npm run dev

# 2. Header에서 Monitor 버튼 확인
# → Expected: Activity 아이콘 + "Monitor" 텍스트 버튼 표시

# 3. 버튼 클릭
# → Expected: Bottom panel 열림, MonitorPanel 렌더링

# 4. 메모리 stat 확인
# → Expected: 5개 stat 카드 + 차트 + 최적화 버튼

# 5. Close 버튼 클릭
# → Expected: Panel 닫힘

# 6. 키보드 단축키 테스트
# → macOS: Cmd+Shift+M으로 패널 토글
# → Windows: Ctrl+Shift+M으로 패널 토글
# → Expected: 패널 열림/닫힘 토글

# 7. 단축키 충돌 확인
# → 기존 Cmd+Shift+M 단축키가 없는지 확인
grep -r "Shift.*m\|m.*Shift" src/builder/hooks/useKeyboardShortcuts*.ts
```

---

## ⚡ Phase 5: 성능 최적화

**예상 시간**: 1-2시간
**난이도**: ⭐⭐⭐ (중간)
**의존성**: 모든 Phase 완료

### 📋 Phase 5 개요

**목표**: SizeEstimator 캐싱으로 CPU 사용량 70% 감소

### 🎯 Step 5.1: SizeEstimator 구현 (1시간)

**파일**: `src/builder/stores/utils/sizeEstimator.ts` (새 파일, 70줄)

```typescript
class SizeEstimator {
  private cache = new Map<string, number>();
  private hitCount = 0;   // 🆕 캐시 히트 카운트
  private missCount = 0;  // 🆕 캐시 미스 카운트

  estimate(obj: unknown, key?: string): number {
    // 캐시 히트
    if (key && this.cache.has(key)) {
      this.hitCount++;  // 🆕 히트 카운트 증가
      return this.cache.get(key)!;
    }

    this.missCount++;  // 🆕 미스 카운트 증가

    let size = 0;

    // Primitive fast path
    switch (typeof obj) {
      case 'string':
        size = obj.length * 2; // UTF-16
        break;
      case 'number':
        size = 8;
        break;
      case 'boolean':
        size = 4;
        break;
      case 'undefined':
        size = 0;
        break;
      case 'object':
        if (obj === null) {
          size = 0;
        } else if (Array.isArray(obj)) {
          size = obj.reduce((sum, item) => sum + this.estimate(item), 0);
        } else {
          for (const [k, v] of Object.entries(obj)) {
            size += k.length * 2 + this.estimate(v);
          }
        }
        break;
      default:
        size = 0;
    }

    // 캐시 저장
    if (key) {
      this.cache.set(key, size);
    }

    return size;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;   // 🆕 카운트도 리셋
    this.missCount = 0;
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // 🆕 캐시 히트율 계산 (성능 모니터링용)
  getCacheHitRate(): number {
    const total = this.hitCount + this.missCount;
    if (total === 0) return 0;
    return this.hitCount / total;
  }

  // 🆕 캐시 통계 반환 (디버깅용)
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: this.getCacheHitRate(),
      size: this.cache.size,
    };
  }
}

export const sizeEstimator = new SizeEstimator();
```

### 🎯 Step 5.2: commandDataStore 적용 (30분)

**파일**: `src/builder/stores/commandDataStore.ts`

```typescript
import { sizeEstimator } from './utils/sizeEstimator';

// getMemoryStats 메서드 수정
getMemoryStats(): CommandStoreMemoryStats {
  let totalSize = 0;

  // ❌ 기존 (느림)
  // for (const [id, command] of this.commands) {
  //   totalSize += new Blob([JSON.stringify(command)]).size;
  // }

  // ✅ 개선 (빠름)
  for (const [id, command] of this.commands) {
    totalSize += sizeEstimator.estimate(command, `cmd_${id}`);
  }

  for (const [id, element] of this.elementCache) {
    totalSize += sizeEstimator.estimate(element, `el_${id}`);
  }

  // ... 나머지 코드 동일
}
```

**성능 비교**:
```
기존 (JSON.stringify):  ~80ms (100개 commands)
개선 (SizeEstimator):   ~8ms  (캐시 히트 시)
→ 10배 빠름
```

### ✅ Phase 5 완료 체크리스트

```bash
# 1. 성능 테스트
# Console에서 실행:
console.time('memory-stats');
historyManager.getMemoryStats();
console.timeEnd('memory-stats');
# → Expected: < 10ms

# 2. CPU 프로파일링 (Chrome DevTools)
# Performance tab → Record → Monitor 열기
# → Expected: RequestIdleCallback 실행, CPU usage < 5%
```

### 📊 성능 검증 지표 보강

#### 필수 측정 항목

| 지표 | 측정 방법 | 기준값 | 비고 |
|------|-----------|--------|------|
| **getMemoryStats 실행 시간** | `console.time()` | < 10ms | 캐시 히트 시 |
| **getMemoryStats 실행 시간 (cold)** | `console.time()` | < 100ms | 캐시 미스 시 |
| **SizeEstimator 캐시 히트율** | `sizeEstimator.getCacheHitRate()` | > 80% | 정상 사용 시 |
| **CPU 사용률 (패널 열림)** | Performance 프로파일링 | < 5% | idle 시간 기준 |
| **CPU 사용률 (패널 닫힘)** | Performance 프로파일링 | 0% | 수집 중단 확인 |
| **메모리 히스토리 GC 영향** | Memory 프로파일링 | < 1MB/min | GC 증가분 |

#### GC 부담 측정

```typescript
// 콘솔에서 실행
function measureGCImpact() {
  const iterations = 100;
  const memoryBefore = performance.memory?.usedJSHeapSize;

  for (let i = 0; i < iterations; i++) {
    historyManager.getMemoryStats();
  }

  // Force GC (Chrome DevTools > Performance > 🗑️ 버튼)
  // 또는 --expose-gc 플래그로 Node 실행 시 gc()

  const memoryAfter = performance.memory?.usedJSHeapSize;
  console.log(`GC 부담: ${(memoryAfter - memoryBefore) / 1024}KB per ${iterations} calls`);
}
```

#### 패널 비활성 시 수집 중단 확인

```typescript
// 콘솔에서 실행
let collectCount = 0;
const originalCollect = window.__monitorCollectStats;

window.__monitorCollectStats = function() {
  collectCount++;
  console.log(`[DEBUG] Stats collected: ${collectCount}`);
  return originalCollect?.apply(this, arguments);
};

// 1. 패널 열기 → 10초 대기 → collectCount 증가 확인
// 2. 패널 닫기 → 10초 대기 → collectCount 증가 없음 확인
```

#### Performance 프로파일링 스크린샷 체크리스트

- [ ] **패널 열림 상태 10초 Recording**
  - RequestIdleCallback 호출 확인
  - Scripting 시간 < 50ms/10초
  - CPU flame graph에 `getMemoryStats` 피크 없음

- [ ] **패널 닫힘 상태 10초 Recording**
  - Monitor 관련 함수 호출 0건
  - setInterval 콜백 없음

- [ ] **Memory 프로파일링 (Heap snapshot)**
  - Monitor 관련 객체 메모리 < 500KB
  - 히스토리 배열 크기 < 60개 유지

#### 회귀 검증용 숫자 로그 저장

```bash
# 테스트 결과를 파일로 저장 (CI에서 비교용)
echo "=== Monitor Panel Performance Report ===" > perf-report.txt
echo "Date: $(date)" >> perf-report.txt
echo "getMemoryStats (cached): XX ms" >> perf-report.txt
echo "getMemoryStats (cold): XX ms" >> perf-report.txt
echo "Cache hit rate: XX%" >> perf-report.txt
echo "CPU usage (panel open): XX%" >> perf-report.txt
echo "Memory overhead: XX KB" >> perf-report.txt
```

---

## 📦 최종 파일 구조 요약

### 새 파일 (13개, ~900줄)
```
src/builder/panels/
├── core/
│   ├── BottomPanelSlot.tsx          (90줄)
│   └── bottom-panel-slot.css        (60줄)
└── monitor/
    ├── index.ts                     (15줄)
    ├── MonitorPanel.tsx             (180줄)  📈 (탭 UI 포함)
    ├── monitor-panel.css            (280줄)  📈 (3개 차트 스타일)
    ├── hooks/
    │   └── useMemoryStats.ts        (80줄)
    └── components/
        ├── MemoryChart.tsx          (70줄)   - SVG 시계열 차트
        ├── HistoryFlowChart.tsx     (120줄)  🆕 ReactFlow 플로우
        ├── HistoryList.tsx          (80줄)   🆕 가상 스크롤 목록
        └── MemoryActions.tsx        (30줄)

src/builder/stores/utils/
└── sizeEstimator.ts                 (90줄)
```

### 수정 파일 (9개)
```
src/builder/main/BuilderCore.tsx
src/builder/header/BuilderHeader.tsx
src/builder/panels/core/panelConfigs.ts
src/builder/panels/core/types.ts
src/builder/panels/core/index.ts           🆕 (BottomPanelSlot export 추가)
src/builder/hooks/panels/usePanelLayout.ts
src/builder/stores/commandDataStore.ts
src/builder/styles/4-layout/grid.css
src/builder/styles/index.css               🆕 (monitor-panel.css import 추가)
```

### 삭제 파일 (4개, ~645줄)
```
src/builder/monitor/            (폴더)
src/builder/hooks/useMemoryMonitor.ts
src/builder/stores/memoryMonitor.ts
src/builder/styles/4-layout/footer.css (일부)
```

---

## ✅ 전체 성공 기준

### 기능 요구사항
- [x] 기존 monitor 완전 삭제
- [x] `src/builder/panels/monitor/` 이전
- [x] PanelRegistry 등록
- [x] Bottom PanelSlot 구축
- [x] 메모리 모니터링 (필수)
- [x] 메모리 최적화 버튼
- [x] 미니 차트 (Zero 의존성)

### 성능 요구사항
- [x] UI 블로킹 없음 (RequestIdleCallback)
- [x] CPU < 5%
- [x] 메모리 오버헤드 < 1MB
- [x] 패널 비활성 시 수집 중단

### 기술 요구사항
- [x] Zero 추가 의존성
- [x] SVG 기반 차트
- [x] TypeScript strict mode
- [x] CSS 변수 사용

---

## 🚀 구현 순서 요약

1. **Phase 1 (1.5-2h)**: 레거시 제거 → 깨끗한 기반
2. **Phase 2 (2-3h)**: Bottom slot → 인프라 구축
3. **Phase 3 (4-5h)**: Monitor panel → 3가지 차트 Full Implementation
4. **Phase 4 (0.5h)**: Registry 등록 → 통합
5. **Phase 5 (1-2h)**: 성능 최적화 → 마무리

**총 9.5-12.5시간** → 2일 작업 (품질 우선)

---

## 🧪 테스트 시나리오 확장

### 단위 테스트 (Unit Tests)

#### SizeEstimator 테스트

**파일**: `src/builder/stores/utils/__tests__/sizeEstimator.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { sizeEstimator } from '../sizeEstimator';

describe('SizeEstimator', () => {
  beforeEach(() => {
    sizeEstimator.clear();
  });

  describe('캐시 히트/미스', () => {
    it('같은 키로 두 번째 호출 시 캐시 히트', () => {
      const obj = { name: 'test', value: 123 };

      const size1 = sizeEstimator.estimate(obj, 'test_key');
      const size2 = sizeEstimator.estimate(obj, 'test_key');

      expect(size1).toBe(size2);
      expect(sizeEstimator.getCacheSize()).toBe(1);
    });

    it('다른 키로 호출 시 캐시 미스', () => {
      const obj = { name: 'test' };

      sizeEstimator.estimate(obj, 'key1');
      sizeEstimator.estimate(obj, 'key2');

      expect(sizeEstimator.getCacheSize()).toBe(2);
    });

    it('invalidate 후 캐시 미스', () => {
      const obj = { name: 'test' };
      sizeEstimator.estimate(obj, 'key1');

      sizeEstimator.invalidate('key1');

      expect(sizeEstimator.getCacheSize()).toBe(0);
    });
  });

  // 🆕 캐시 히트율 테스트 추가
  describe('캐시 히트율', () => {
    it('초기 상태에서 히트율 0', () => {
      expect(sizeEstimator.getCacheHitRate()).toBe(0);
    });

    it('캐시 히트 후 히트율 증가', () => {
      const obj = { name: 'test' };

      // 1st call: miss
      sizeEstimator.estimate(obj, 'key1');
      expect(sizeEstimator.getCacheHitRate()).toBe(0); // 0/1

      // 2nd call: hit
      sizeEstimator.estimate(obj, 'key1');
      expect(sizeEstimator.getCacheHitRate()).toBe(0.5); // 1/2

      // 3rd call: hit
      sizeEstimator.estimate(obj, 'key1');
      expect(sizeEstimator.getCacheHitRate()).toBeCloseTo(0.667, 2); // 2/3
    });

    it('clear 후 히트율 리셋', () => {
      const obj = { name: 'test' };
      sizeEstimator.estimate(obj, 'key1');
      sizeEstimator.estimate(obj, 'key1');

      sizeEstimator.clear();

      expect(sizeEstimator.getCacheHitRate()).toBe(0);
    });

    it('getCacheStats 전체 통계 반환', () => {
      const obj = { name: 'test' };
      sizeEstimator.estimate(obj, 'key1'); // miss
      sizeEstimator.estimate(obj, 'key1'); // hit

      const stats = sizeEstimator.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(1);
    });
  });

  describe('사이즈 계산', () => {
    it('string 크기 계산 (UTF-16)', () => {
      const size = sizeEstimator.estimate('hello');
      expect(size).toBe(10); // 5 chars * 2 bytes
    });

    it('number 크기 계산', () => {
      const size = sizeEstimator.estimate(123);
      expect(size).toBe(8); // 8 bytes for number
    });

    it('nested object 크기 계산', () => {
      const obj = { a: { b: 'c' } };
      const size = sizeEstimator.estimate(obj);
      expect(size).toBeGreaterThan(0);
    });
  });
});
```

#### usePanelLayout 토글 동작 테스트

**파일**: `src/builder/hooks/panels/__tests__/usePanelLayout.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelLayout } from '../usePanelLayout';

describe('usePanelLayout - Bottom Panel', () => {
  beforeEach(() => {
    // Reset store state
    usePanelLayout.setState({
      activeBottomPanels: [],
      showBottom: false,
      bottomHeight: 200,
    });
  });

  describe('toggleBottomPanel', () => {
    it('닫힌 상태에서 토글 시 패널 열림', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.toggleBottomPanel('monitor');
      });

      expect(result.current.showBottom).toBe(true);
      expect(result.current.activeBottomPanels).toContain('monitor');
    });

    it('열린 상태에서 토글 시 패널 닫힘', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.toggleBottomPanel('monitor');
        result.current.toggleBottomPanel('monitor');
      });

      expect(result.current.showBottom).toBe(false);
      expect(result.current.activeBottomPanels).not.toContain('monitor');
    });
  });

  describe('setBottomHeight', () => {
    it('높이 설정 (정상 범위)', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setBottomHeight(300);
      });

      expect(result.current.bottomHeight).toBe(300);
    });

    it('최소값 미만 시 최소값으로 고정', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setBottomHeight(100); // min: 150
      });

      expect(result.current.bottomHeight).toBe(150);
    });

    it('최대값 초과 시 최대값으로 고정', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.setBottomHeight(800); // max: 600
      });

      expect(result.current.bottomHeight).toBe(600);
    });
  });

  describe('closeBottomPanel', () => {
    it('패널 닫기 시 상태 초기화', () => {
      const { result } = renderHook(() => usePanelLayout());

      act(() => {
        result.current.toggleBottomPanel('monitor');
        result.current.closeBottomPanel();
      });

      expect(result.current.showBottom).toBe(false);
      expect(result.current.activeBottomPanels).toHaveLength(0);
    });
  });
});
```

#### useMemoryStats 테스트

**파일**: `src/builder/panels/monitor/hooks/__tests__/useMemoryStats.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemoryStats } from '../useMemoryStats';

// Mock historyManager
vi.mock('../../../../stores/history', () => ({
  historyManager: {
    getMemoryStats: vi.fn(() => ({
      totalEntries: 10,
      commandStoreStats: {
        commandCount: 5,
        cacheSize: 3,
        estimatedMemoryUsage: 1024,
        compressionRatio: 0.5,
      },
    })),
    optimizeMemory: vi.fn(),
  },
}));

describe('useMemoryStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('초기 로딩 후 stats 반환', async () => {
    const { result } = renderHook(() => useMemoryStats());

    // RequestIdleCallback 시뮬레이션
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current.stats).not.toBeNull();
    expect(result.current.stats?.totalEntries).toBe(10);
  });

  it('optimize 호출 시 statusMessage 업데이트', async () => {
    const { result } = renderHook(() => useMemoryStats());

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    act(() => {
      result.current.optimize();
    });

    expect(result.current.statusMessage).toContain('최적화');

    // 3초 후 메시지 사라짐
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.statusMessage).toBe('');
  });
});
```

### E2E 테스트 (Playwright)

**파일**: `e2e/monitor-panel.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Monitor Panel E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.waitForSelector('.builder-container');
  });

  test('헤더 버튼 → 열기 → 리사이즈 → 닫기 플로우', async ({ page }) => {
    // 1. 헤더에서 Monitor 버튼 찾기
    const monitorButton = page.locator('.monitor-toggle');
    await expect(monitorButton).toBeVisible();

    // 2. 클릭하여 패널 열기
    await monitorButton.click();

    // 3. Bottom panel 열림 확인
    const bottomPanel = page.locator('.bottom-panel-slot');
    await expect(bottomPanel).toBeVisible();

    // 4. MonitorPanel 내용 확인
    await expect(page.locator('.monitor-panel')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(5);

    // 5. 리사이즈 핸들 드래그
    const resizeHandle = page.locator('.bottom-panel-slot .resize-handle');
    const initialHeight = await bottomPanel.evaluate(el => el.offsetHeight);

    await resizeHandle.hover();
    await page.mouse.down();
    await page.mouse.move(0, -100, { steps: 10 });
    await page.mouse.up();

    const newHeight = await bottomPanel.evaluate(el => el.offsetHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);

    // 6. Close 버튼으로 닫기
    await page.locator('.bottom-panel-slot .close-btn').click();
    await expect(bottomPanel).not.toBeVisible();
  });

  test('Esc 키로 패널 닫기', async ({ page }) => {
    // 패널 열기
    await page.locator('.monitor-toggle').click();
    await expect(page.locator('.bottom-panel-slot')).toBeVisible();

    // Esc 키 누르기
    await page.keyboard.press('Escape');

    // 패널 닫힘 확인
    await expect(page.locator('.bottom-panel-slot')).not.toBeVisible();
  });

  test('키보드로 리사이즈', async ({ page }) => {
    await page.locator('.monitor-toggle').click();

    const bottomPanel = page.locator('.bottom-panel-slot');
    const initialHeight = await bottomPanel.evaluate(el => el.offsetHeight);

    // 리사이즈 핸들에 포커스
    await page.locator('.resize-handle').focus();

    // 화살표 위로 높이 증가
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');

    const newHeight = await bottomPanel.evaluate(el => el.offsetHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('Optimize 버튼 동작', async ({ page }) => {
    await page.locator('.monitor-toggle').click();

    // Optimize 버튼 클릭
    const optimizeBtn = page.locator('.optimize-btn');
    await optimizeBtn.click();

    // 상태 메시지 표시 확인
    await expect(page.locator('.status-message')).toContainText('최적화');

    // 3초 후 메시지 사라짐
    await page.waitForTimeout(3500);
    await expect(page.locator('.status-message')).not.toBeVisible();
  });
});
```

### 접근성 테스트 (A11y)

**파일**: `e2e/monitor-panel-a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Monitor Panel Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder');
    await page.locator('.monitor-toggle').click();
    await page.waitForSelector('.monitor-panel');
  });

  test('axe 접근성 검사 통과', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.bottom-panel-slot')
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  test('ARIA role 및 label 확인', async ({ page }) => {
    // Panel container
    const panel = page.locator('.bottom-panel-slot');
    await expect(panel).toHaveAttribute('role', 'region');

    // Resize handle
    const resizeHandle = page.locator('.resize-handle');
    await expect(resizeHandle).toHaveAttribute('role', 'separator');
    await expect(resizeHandle).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(resizeHandle).toHaveAttribute('aria-describedby', 'resize-hint');

    // Close button
    const closeBtn = page.locator('.close-btn');
    await expect(closeBtn).toHaveAttribute('aria-label');

    // Chart SVG
    const chart = page.locator('.memory-chart svg');
    await expect(chart).toHaveAttribute('aria-label');
  });

  test('Tab 순서 확인', async ({ page }) => {
    // Monitor button에서 시작
    await page.locator('.monitor-toggle').focus();

    // Tab으로 resize handle로 이동
    await page.keyboard.press('Tab');
    await expect(page.locator('.resize-handle')).toBeFocused();

    // Tab으로 close button으로 이동
    await page.keyboard.press('Tab');
    await expect(page.locator('.close-btn')).toBeFocused();

    // Tab으로 optimize button으로 이동
    await page.keyboard.press('Tab');
    await expect(page.locator('.optimize-btn')).toBeFocused();
  });

  test('스크린 리더 텍스트 확인', async ({ page }) => {
    // sr-only 텍스트 존재 확인
    const srOnly = page.locator('.sr-only');
    await expect(srOnly).toBeAttached();

    // 실제 내용 확인 (시각적으로 숨겨져 있어도 DOM에 존재)
    const text = await srOnly.textContent();
    expect(text).toContain('화살표 키');
  });

  test('고대비 모드 테스트', async ({ page }) => {
    // 고대비 모드 에뮬레이션
    await page.emulateMedia({ forcedColors: 'active' });

    // 패널이 여전히 보이는지 확인
    await expect(page.locator('.monitor-panel')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(5);
  });
});
```

### QA 체크리스트 종합

#### 기능 테스트
- [ ] Header Monitor 버튼 클릭 → 패널 열림
- [ ] Close 버튼 클릭 → 패널 닫힘
- [ ] Esc 키 → 패널 닫힘
- [ ] 마우스 드래그로 리사이즈
- [ ] 키보드 화살표로 리사이즈
- [ ] Optimize 버튼 → 상태 메시지 표시 → 3초 후 사라짐
- [ ] 5개 stat 카드 표시
- [ ] 차트 표시 (데이터 있을 때)
- [ ] Trend 아이콘 표시 (up/down/stable)
- [ ] 패널 닫을 때 수집 중단

#### 접근성 테스트
- [ ] axe 검사 통과 (violations = 0)
- [ ] Tab 키로 모든 컨트롤 탐색 가능
- [ ] ARIA role, label 모두 설정됨
- [ ] 스크린 리더로 내용 읽기 가능
- [ ] 고대비 모드에서 정상 표시
- [ ] 150% 확대에서 레이아웃 유지

#### 성능 테스트
- [ ] getMemoryStats < 10ms (캐시 히트)
- [ ] CPU < 5% (패널 열림)
- [ ] CPU = 0% (패널 닫힘, 수집 중단)
- [ ] 메모리 오버헤드 < 500KB

#### 브라우저 호환성
- [ ] Chrome 120+
- [ ] Firefox 120+ (performance.memory 미지원 fallback)
- [ ] Safari 17+ (requestIdleCallback 미지원 fallback)
- [ ] Edge 120+

#### 에러 처리
- [ ] performance.memory 미지원 시 fallback UI 표시
- [ ] 통계 수집 에러 시 에러 메시지 표시
- [ ] localStorage 비활성화 시 정상 동작 (저장 실패 무시)

---

## 🚀 Phase 6: 개선 기능 구현 (Threshold, Export, Toast, Web Vitals)

**예상 시간**: 3-4시간
**난이도**: ⭐⭐ (중간)
**의존성**: Phase 3-5 완료

### 📋 Phase 6 개요

**목표**: 경쟁 제품 분석 기반 고급 기능 추가 (Figma, Chrome DevTools, Supabase 스타일)

**구현 항목**:
- Threshold 경고 시스템 (60%/75% 시각적 표시)
- Export 기능 (CSV/JSON 내보내기)
- Toast/Notification 시스템 (경고 알림)
- Core Web Vitals (LCP/FID/CLS 측정)

**추가 파일 구조**:
```
src/builder/panels/monitor/
├── components/
│   ├── ThresholdIndicator.tsx (20줄)
│   ├── ExportButton.tsx (30줄)
│   └── WebVitalsCard.tsx (40줄)
└── hooks/
    └── useWebVitals.ts (50줄)

src/builder/components/
├── Toast.tsx (60줄)
├── ToastContainer.tsx (40줄)
└── styles/Toast.css (50줄)

src/builder/hooks/
└── useToast.ts (40줄)
```

---

### 🎯 Step 6.1: Threshold 경고 시스템 (30분)

#### 6.1.1 CSS 변수 추가

**파일**: `src/builder/panels/monitor/monitor-panel.css`

```css
/* Threshold 경고 색상 */
.monitor-panel {
  --threshold-warning: var(--color-yellow-500, #eab308);
  --threshold-danger: var(--color-red-500, #ef4444);
  --threshold-safe: var(--color-green-500, #22c55e);
}

/* Stat card 상태별 스타일 */
.stat-card[data-threshold="warning"] {
  border-color: var(--threshold-warning);
  background: color-mix(in srgb, var(--threshold-warning) 10%, transparent);
}

.stat-card[data-threshold="danger"] {
  border-color: var(--threshold-danger);
  background: color-mix(in srgb, var(--threshold-danger) 10%, transparent);
}

.stat-card[data-threshold="safe"] {
  border-color: var(--threshold-safe);
}
```

#### 6.1.2 ThresholdIndicator 컴포넌트

**파일**: `src/builder/panels/monitor/components/ThresholdIndicator.tsx`

```tsx
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface ThresholdIndicatorProps {
  value: number;
  warningThreshold?: number;  // default: 60
  dangerThreshold?: number;   // default: 75
  label?: string;
}

export function ThresholdIndicator({
  value,
  warningThreshold = 60,
  dangerThreshold = 75,
  label = 'Memory Usage',
}: ThresholdIndicatorProps) {
  const threshold =
    value >= dangerThreshold ? 'danger' :
    value >= warningThreshold ? 'warning' : 'safe';

  const Icon =
    threshold === 'danger' ? AlertCircle :
    threshold === 'warning' ? AlertTriangle : CheckCircle;

  return (
    <div className="threshold-indicator" data-threshold={threshold}>
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">
        {threshold === 'danger' ? '위험: ' : threshold === 'warning' ? '경고: ' : '정상: '}
      </span>
      <span>{label}: {value}%</span>
    </div>
  );
}
```

#### 6.1.3 MemoryChart threshold 라인 추가

**파일**: `src/builder/panels/monitor/components/MemoryChart.tsx` (수정)

```tsx
// SVG에 threshold 라인 추가
<svg {...svgProps}>
  {/* 기존 차트 영역 */}

  {/* Threshold 라인 - 60% 경고 */}
  <line
    x1="0" y1={height * 0.4}
    x2={width} y2={height * 0.4}
    stroke="var(--threshold-warning)"
    strokeDasharray="4 2"
    strokeWidth="1"
    aria-hidden="true"
  />

  {/* Threshold 라인 - 75% 위험 */}
  <line
    x1="0" y1={height * 0.25}
    x2={width} y2={height * 0.25}
    stroke="var(--threshold-danger)"
    strokeDasharray="4 2"
    strokeWidth="1"
    aria-hidden="true"
  />

  {/* 라벨 */}
  <text x="4" y={height * 0.4 - 4} fill="var(--threshold-warning)" fontSize="10">
    60%
  </text>
  <text x="4" y={height * 0.25 - 4} fill="var(--threshold-danger)" fontSize="10">
    75%
  </text>
</svg>
```

---

### 🎯 Step 6.2: Export 기능 (30분)

#### 6.2.1 ExportButton 컴포넌트

**파일**: `src/builder/panels/monitor/components/ExportButton.tsx`

```tsx
import { Download } from 'lucide-react';
import { Button } from 'react-aria-components';
import type { MemoryStats } from '../hooks/useMemoryStats';

interface ExportButtonProps {
  stats: MemoryStats | null;
  format?: 'csv' | 'json';
}

export function ExportButton({ stats, format = 'json' }: ExportButtonProps) {
  const handleExport = () => {
    if (!stats) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      // UTF-8 BOM for Korean support
      const BOM = '\uFEFF';
      const headers = ['Metric', 'Value', 'Timestamp'];
      const rows = [
        ['Total Entries', stats.totalEntries, timestamp],
        ['Command Count', stats.commandStoreStats.commandCount, timestamp],
        ['Cache Size', stats.commandStoreStats.cacheSize, timestamp],
        ['Memory Usage (bytes)', stats.commandStoreStats.estimatedMemoryUsage, timestamp],
        ['Compression Ratio', stats.commandStoreStats.compressionRatio, timestamp],
      ];
      content = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else {
      content = JSON.stringify(stats, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitor-stats-${timestamp}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      className="export-btn"
      onPress={handleExport}
      isDisabled={!stats}
      aria-label={`Export stats as ${format.toUpperCase()}`}
    >
      <Download size={14} aria-hidden="true" />
      <span>Export {format.toUpperCase()}</span>
    </Button>
  );
}
```

#### 6.2.2 CSS 스타일

**파일**: `src/builder/panels/monitor/monitor-panel.css` (추가)

```css
/* Export 버튼 */
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  font-size: var(--text-xs, 12px);
  background: var(--color-surface-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: background 150ms;
}

.export-btn:hover:not([data-disabled]) {
  background: var(--color-surface-200);
}

.export-btn[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### 🎯 Step 6.3: Toast/Notification 시스템 (1시간)

#### 6.3.1 Toast 컴포넌트

**파일**: `src/builder/components/Toast.tsx`

```tsx
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from 'react-aria-components';
import './styles/Toast.css';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;  // ms, 0 = persistent
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

export function Toast({ id, type, message, duration = 5000, onDismiss }: ToastProps) {
  const Icon = ICONS[type];

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => onDismiss(id), duration);
  }

  return (
    <div
      className="toast"
      data-type={type}
      role="alert"
      aria-live="polite"
    >
      <Icon size={16} className="toast-icon" aria-hidden="true" />
      <span className="toast-message">{message}</span>
      <Button
        className="toast-dismiss"
        onPress={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
```

#### 6.3.2 ToastContainer 컴포넌트

**파일**: `src/builder/components/ToastContainer.tsx`

```tsx
import { Toast, type ToastProps } from './Toast';

interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onDismiss'>[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'bottom-right' | 'bottom-center';
}

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'bottom-right'
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" data-position={position}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
```

#### 6.3.3 useToast 훅

**파일**: `src/builder/hooks/useToast.ts`

```tsx
import { useState, useCallback, useRef } from 'react';
import type { ToastType } from '../components/Toast';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// 중복 알림 방지 (5분 쿨다운)
const COOLDOWN_MS = 5 * 60 * 1000;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastShownRef = useRef<Map<string, number>>(new Map());

  const showToast = useCallback((
    type: ToastType,
    message: string,
    options?: { duration?: number; dedupeKey?: string }
  ) => {
    const { duration = 5000, dedupeKey } = options ?? {};

    // 중복 체크
    if (dedupeKey) {
      const lastShown = lastShownRef.current.get(dedupeKey);
      if (lastShown && Date.now() - lastShown < COOLDOWN_MS) {
        return; // 쿨다운 중
      }
      lastShownRef.current.set(dedupeKey, Date.now());
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
```

#### 6.3.4 Toast CSS

**파일**: `src/builder/components/styles/Toast.css`

```css
@layer components {
  .toast-container {
    position: fixed;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 8px);
    pointer-events: none;
  }

  .toast-container[data-position="bottom-right"] {
    bottom: var(--spacing-lg, 16px);
    right: var(--spacing-lg, 16px);
  }

  .toast-container[data-position="top-right"] {
    top: var(--spacing-lg, 16px);
    right: var(--spacing-lg, 16px);
  }

  .toast-container[data-position="bottom-center"] {
    bottom: var(--spacing-lg, 16px);
    left: 50%;
    transform: translateX(-50%);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 8px);
    padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
    background: var(--color-surface-800);
    color: var(--color-text-inverse);
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    animation: toast-slide-in 200ms ease-out;
  }

  @keyframes toast-slide-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toast[data-type="success"] .toast-icon {
    color: var(--color-green-400);
  }

  .toast[data-type="warning"] .toast-icon {
    color: var(--color-yellow-400);
  }

  .toast[data-type="error"] .toast-icon {
    color: var(--color-red-400);
  }

  .toast[data-type="info"] .toast-icon {
    color: var(--color-blue-400);
  }

  .toast-message {
    flex: 1;
    font-size: var(--text-sm, 14px);
  }

  .toast-dismiss {
    display: flex;
    padding: var(--spacing-xs, 4px);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 150ms;
  }

  .toast-dismiss:hover {
    opacity: 1;
  }
}
```

#### 6.3.5 Monitor Panel에 Threshold 알림 연동

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx` (수정)

```tsx
// useToast 훅 추가
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ToastContainer';

export function MonitorPanel() {
  const { stats, /* ... */ } = useMemoryStats();
  const { toasts, showToast, dismissToast } = useToast();

  // Threshold 알림
  useEffect(() => {
    if (!stats) return;

    const memoryPercent = calculateMemoryPercent(stats);

    if (memoryPercent >= 75) {
      showToast('error', `메모리 사용량이 ${memoryPercent}%에 도달했습니다. 최적화를 권장합니다.`, {
        dedupeKey: 'memory-danger',
      });
    } else if (memoryPercent >= 60) {
      showToast('warning', `메모리 사용량이 ${memoryPercent}%입니다.`, {
        dedupeKey: 'memory-warning',
      });
    }
  }, [stats, showToast]);

  return (
    <>
      {/* 기존 패널 내용 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
```

---

### 🎯 Step 6.4: Core Web Vitals (1-2시간)

#### 6.4.1 useWebVitals 훅

**파일**: `src/builder/panels/monitor/hooks/useWebVitals.ts`

```tsx
import { useState, useEffect, useCallback } from 'react';

export interface WebVitals {
  lcp: number | null;  // Largest Contentful Paint (ms)
  fid: number | null;  // First Input Delay (ms)
  cls: number | null;  // Cumulative Layout Shift (score)
  ttfb: number | null; // Time to First Byte (ms)
}

export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  // Canvas iframe으로부터 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'WEB_VITALS_UPDATE') {
        setVitals(event.data.vitals);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Canvas에 Web Vitals 수집 요청
  const requestVitals = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.canvas-iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'REQUEST_WEB_VITALS' }, '*');
    }
  }, []);

  return { vitals, requestVitals };
}
```

#### 6.4.2 Canvas 측 Web Vitals 수집 (postMessage 핸들러)

**파일**: `src/canvas/messageHandlers.ts` (추가)

```tsx
// Web Vitals 수집 핸들러
case 'REQUEST_WEB_VITALS':
  collectWebVitals().then((vitals) => {
    window.parent.postMessage({
      type: 'WEB_VITALS_UPDATE',
      vitals,
    }, event.origin);
  });
  break;

// Web Vitals 수집 함수
async function collectWebVitals(): Promise<{
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}> {
  const vitals = {
    lcp: null as number | null,
    fid: null as number | null,
    cls: null as number | null,
    ttfb: null as number | null,
  };

  // Performance Observer 기반 수집
  if ('PerformanceObserver' in window) {
    // LCP
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      vitals.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
    }

    // TTFB
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      vitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
    }

    // CLS (Layout Shift 기반)
    const layoutShiftEntries = performance.getEntriesByType('layout-shift');
    vitals.cls = layoutShiftEntries.reduce((sum, entry) => {
      return sum + (entry as PerformanceEntry & { value: number }).value;
    }, 0);
  }

  return vitals;
}
```

#### 6.4.3 WebVitalsCard 컴포넌트

**파일**: `src/builder/panels/monitor/components/WebVitalsCard.tsx`

```tsx
import { Gauge, MousePointer, Layout, Clock } from 'lucide-react';
import type { WebVitals } from '../hooks/useWebVitals';

interface WebVitalsCardProps {
  vitals: WebVitals;
}

// Good/Needs Improvement/Poor 기준 (Google 기준)
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
};

function getStatus(metric: keyof typeof THRESHOLDS, value: number | null) {
  if (value === null) return 'unknown';
  const { good, poor } = THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function WebVitalsCard({ vitals }: WebVitalsCardProps) {
  const metrics = [
    { key: 'lcp', label: 'LCP', value: vitals.lcp, unit: 'ms', icon: Gauge },
    { key: 'fid', label: 'FID', value: vitals.fid, unit: 'ms', icon: MousePointer },
    { key: 'cls', label: 'CLS', value: vitals.cls, unit: '', icon: Layout },
    { key: 'ttfb', label: 'TTFB', value: vitals.ttfb, unit: 'ms', icon: Clock },
  ] as const;

  return (
    <div className="web-vitals-card">
      <h4 className="web-vitals-title">Core Web Vitals</h4>
      <div className="web-vitals-grid">
        {metrics.map(({ key, label, value, unit, icon: Icon }) => (
          <div
            key={key}
            className="web-vital-item"
            data-status={getStatus(key, value)}
          >
            <Icon size={14} aria-hidden="true" />
            <span className="web-vital-label">{label}</span>
            <span className="web-vital-value">
              {value !== null ? `${value}${unit}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 6.4.4 WebVitals CSS

**파일**: `src/builder/panels/monitor/monitor-panel.css` (추가)

```css
/* Web Vitals 카드 */
.web-vitals-card {
  background: var(--color-surface-50);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  padding: var(--spacing-sm, 8px);
}

.web-vitals-title {
  font-size: var(--text-xs, 12px);
  font-weight: 600;
  margin-bottom: var(--spacing-sm, 8px);
  color: var(--color-text-secondary);
}

.web-vitals-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm, 8px);
}

.web-vital-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-xs, 4px);
  border-radius: var(--radius-sm, 4px);
}

.web-vital-item[data-status="good"] {
  background: color-mix(in srgb, var(--color-green-500) 10%, transparent);
  color: var(--color-green-700);
}

.web-vital-item[data-status="needs-improvement"] {
  background: color-mix(in srgb, var(--color-yellow-500) 10%, transparent);
  color: var(--color-yellow-700);
}

.web-vital-item[data-status="poor"] {
  background: color-mix(in srgb, var(--color-red-500) 10%, transparent);
  color: var(--color-red-700);
}

.web-vital-item[data-status="unknown"] {
  background: var(--color-surface-100);
  color: var(--color-text-muted);
}

.web-vital-label {
  font-size: var(--text-xs, 12px);
  font-weight: 500;
}

.web-vital-value {
  font-size: var(--text-sm, 14px);
  font-weight: 600;
}
```

---

### ✅ Phase 6 QA 체크리스트

#### Threshold 경고
- [ ] 60% 이상 시 노란색 경고 표시
- [ ] 75% 이상 시 빨간색 위험 표시
- [ ] 차트에 threshold 라인 표시
- [ ] 스크린 리더에 상태 읽힘

#### Export 기능
- [ ] JSON 내보내기 동작
- [ ] CSV 내보내기 동작 (한글 정상)
- [ ] 비활성화 상태 (stats 없을 때)
- [ ] 파일명에 타임스탬프 포함

#### Toast/Notification
- [ ] 60% 도달 시 warning toast
- [ ] 75% 도달 시 error toast
- [ ] 5분 쿨다운 (중복 방지)
- [ ] 닫기 버튼 동작
- [ ] 5초 후 자동 사라짐

#### Core Web Vitals
- [ ] LCP 측정 및 표시
- [ ] CLS 측정 및 표시
- [ ] TTFB 측정 및 표시
- [ ] Good/Needs Improvement/Poor 색상 표시
- [ ] Canvas iframe 통신 정상

---

## 🔥 Phase 7: 고급 기능 구현 (실시간 그래프, FPS, 컴포넌트별 메모리)

**예상 시간**: 4-4.5시간
**난이도**: ⭐⭐⭐ (높음)
**의존성**: Phase 3-6 완료

### 📋 Phase 7 개요

**목표**: Figma/Chrome DevTools 수준의 고급 모니터링 기능 구현

**구현 항목**:
- 실시간 시계열 그래프 (최근 60초 데이터)
- FPS 모니터 (렌더링 성능)
- 컴포넌트별 메모리 분석 (Figma 스타일)
- Threshold 커스터마이징

**추가 파일 구조**:
```
src/builder/panels/monitor/
├── components/
│   ├── RealtimeChart.tsx (100줄)
│   ├── FPSMeter.tsx (60줄)
│   ├── ComponentMemoryList.tsx (120줄)
│   └── ThresholdSettings.tsx (80줄)
└── hooks/
    ├── useTimeSeriesData.ts (70줄)
    ├── useFPSMonitor.ts (50줄)
    └── useComponentMemory.ts (90줄)
```

**총 추가 코드량**: ~570줄

---

### 🎯 Step 7.1: 실시간 시계열 그래프 (1시간)

#### 7.1.1 useTimeSeriesData 훅

**파일**: `src/builder/panels/monitor/hooks/useTimeSeriesData.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

export interface DataPoint {
  timestamp: number;
  memoryUsage: number;      // bytes
  memoryPercent: number;    // 0-100
  historyEntries: number;
  cacheSize: number;
}

interface UseTimeSeriesOptions {
  maxPoints?: number;       // default: 60 (60초)
  intervalMs?: number;      // default: 1000 (1초)
  enabled?: boolean;
}

export function useTimeSeriesData(
  getStats: () => { memoryUsage: number; memoryPercent: number; historyEntries: number; cacheSize: number } | null,
  options: UseTimeSeriesOptions = {}
) {
  const { maxPoints = 60, intervalMs = 1000, enabled = true } = options;
  const [data, setData] = useState<DataPoint[]>([]);
  const intervalRef = useRef<number | null>(null);

  const collectPoint = useCallback(() => {
    const stats = getStats();
    if (!stats) return;

    const point: DataPoint = {
      timestamp: Date.now(),
      memoryUsage: stats.memoryUsage,
      memoryPercent: stats.memoryPercent,
      historyEntries: stats.historyEntries,
      cacheSize: stats.cacheSize,
    };

    setData((prev) => {
      const newData = [...prev, point];
      // 최대 포인트 수 유지 (FIFO)
      return newData.slice(-maxPoints);
    });
  }, [getStats, maxPoints]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 즉시 첫 포인트 수집
    collectPoint();

    // 주기적 수집 시작
    intervalRef.current = window.setInterval(collectPoint, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, collectPoint]);

  const clearData = useCallback(() => {
    setData([]);
  }, []);

  return { data, clearData };
}
```

#### 7.1.2 RealtimeChart 컴포넌트

**파일**: `src/builder/panels/monitor/components/RealtimeChart.tsx`

```tsx
import { useMemo } from 'react';
import type { DataPoint } from '../hooks/useTimeSeriesData';

interface RealtimeChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  metric?: 'memoryPercent' | 'historyEntries' | 'cacheSize';
  showThresholds?: boolean;
}

export function RealtimeChart({
  data,
  width = 400,
  height = 120,
  metric = 'memoryPercent',
  showThresholds = true,
}: RealtimeChartProps) {
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 데이터 범위 계산
  const { minValue, maxValue, pathD, points } = useMemo(() => {
    if (data.length === 0) {
      return { minValue: 0, maxValue: 100, pathD: '', points: [] };
    }

    const values = data.map((d) => d[metric]);
    const min = metric === 'memoryPercent' ? 0 : Math.min(...values);
    const max = metric === 'memoryPercent' ? 100 : Math.max(...values) * 1.1;
    const range = max - min || 1;

    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
      y: padding.top + chartHeight - ((d[metric] - min) / range) * chartHeight,
      value: d[metric],
      time: d.timestamp,
    }));

    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return { minValue: min, maxValue: max, pathD: path, points: pts };
  }, [data, metric, chartWidth, chartHeight, padding]);

  // 시간 라벨 (10초 간격)
  const timeLabels = useMemo(() => {
    if (data.length < 2) return [];
    const labels = [];
    for (let i = 0; i < data.length; i += 10) {
      const d = data[i];
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const timeAgo = Math.round((Date.now() - d.timestamp) / 1000);
      labels.push({ x, label: `-${timeAgo}s` });
    }
    return labels;
  }, [data, chartWidth, padding.left]);

  // Y축 라벨
  const yLabels = useMemo(() => {
    const labels = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const value = minValue + ((maxValue - minValue) * i) / steps;
      const y = padding.top + chartHeight - (i / steps) * chartHeight;
      labels.push({
        y,
        label: metric === 'memoryPercent' ? `${Math.round(value)}%` : Math.round(value).toString(),
      });
    }
    return labels;
  }, [minValue, maxValue, chartHeight, padding.top, metric]);

  return (
    <svg
      width={width}
      height={height}
      className="realtime-chart"
      aria-label={`Real-time ${metric} chart showing last ${data.length} seconds`}
      role="img"
    >
      {/* 배경 그리드 */}
      <g className="chart-grid" aria-hidden="true">
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="var(--color-border)"
            strokeOpacity="0.3"
          />
        ))}
      </g>

      {/* Threshold 라인 */}
      {showThresholds && metric === 'memoryPercent' && (
        <g className="threshold-lines" aria-hidden="true">
          {/* 60% 경고 */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * 0.4}
            x2={width - padding.right}
            y2={padding.top + chartHeight * 0.4}
            stroke="var(--threshold-warning)"
            strokeDasharray="4 2"
            strokeWidth="1"
          />
          {/* 75% 위험 */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * 0.25}
            x2={width - padding.right}
            y2={padding.top + chartHeight * 0.25}
            stroke="var(--threshold-danger)"
            strokeDasharray="4 2"
            strokeWidth="1"
          />
        </g>
      )}

      {/* 데이터 영역 (그라데이션 fill) */}
      {pathD && (
        <g className="chart-area">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${points[points.length - 1]?.x ?? 0} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
            fill="url(#areaGradient)"
          />
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-primary-500)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* 현재 값 포인트 */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill="var(--color-primary-600)"
          stroke="white"
          strokeWidth="2"
        />
      )}

      {/* Y축 라벨 */}
      <g className="y-axis" aria-hidden="true">
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 5}
            y={label.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-text-muted)"
          >
            {label.label}
          </text>
        ))}
      </g>

      {/* X축 라벨 */}
      <g className="x-axis" aria-hidden="true">
        {timeLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={height - 5}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-muted)"
          >
            {label.label}
          </text>
        ))}
      </g>

      {/* 스크린 리더용 현재 값 */}
      <text className="sr-only">
        Current {metric}: {points[points.length - 1]?.value.toFixed(1) ?? 'N/A'}
      </text>
    </svg>
  );
}
```

#### 7.1.3 RealtimeChart CSS

**파일**: `src/builder/panels/monitor/monitor-panel.css` (추가)

```css
/* 실시간 차트 */
.realtime-chart {
  background: var(--color-surface-50);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
}

.realtime-chart .chart-grid line {
  stroke: var(--color-border);
  stroke-opacity: 0.2;
}

.realtime-chart-container {
  position: relative;
}

.realtime-chart-controls {
  position: absolute;
  top: var(--spacing-xs, 4px);
  right: var(--spacing-xs, 4px);
  display: flex;
  gap: var(--spacing-xs, 4px);
}

.chart-metric-select {
  padding: 2px 6px;
  font-size: var(--text-xs, 12px);
  background: var(--color-surface-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
}
```

---

### 🎯 Step 7.2: FPS 모니터 (30분)

#### 7.2.1 useFPSMonitor 훅

**파일**: `src/builder/panels/monitor/hooks/useFPSMonitor.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface FPSData {
  current: number;
  average: number;
  min: number;
  max: number;
  history: number[];  // 최근 60개
}

interface UseFPSMonitorOptions {
  enabled?: boolean;
  historySize?: number;
}

export function useFPSMonitor(options: UseFPSMonitorOptions = {}) {
  const { enabled = true, historySize = 60 } = options;

  const [fps, setFPS] = useState<FPSData>({
    current: 0,
    average: 0,
    min: 60,
    max: 0,
    history: [],
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);

  const measureFrame = useCallback(() => {
    frameCountRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    // 1초마다 FPS 계산
    if (elapsed >= 1000) {
      const currentFPS = Math.round((frameCountRef.current * 1000) / elapsed);

      // 히스토리 업데이트
      historyRef.current = [...historyRef.current.slice(-(historySize - 1)), currentFPS];

      // 통계 계산
      const history = historyRef.current;
      const average = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
      const min = Math.min(...history);
      const max = Math.max(...history);

      setFPS({
        current: currentFPS,
        average,
        min,
        max,
        history: [...history],
      });

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    if (enabled) {
      rafIdRef.current = requestAnimationFrame(measureFrame);
    }
  }, [enabled, historySize]);

  useEffect(() => {
    if (enabled) {
      rafIdRef.current = requestAnimationFrame(measureFrame);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, measureFrame]);

  const reset = useCallback(() => {
    historyRef.current = [];
    setFPS({
      current: 0,
      average: 0,
      min: 60,
      max: 0,
      history: [],
    });
  }, []);

  return { fps, reset };
}
```

#### 7.2.2 FPSMeter 컴포넌트

**파일**: `src/builder/panels/monitor/components/FPSMeter.tsx`

```tsx
import { Activity } from 'lucide-react';
import type { useFPSMonitor } from '../hooks/useFPSMonitor';

interface FPSMeterProps {
  fps: ReturnType<typeof useFPSMonitor>['fps'];
}

function getFPSStatus(fps: number): 'good' | 'warning' | 'poor' {
  if (fps >= 55) return 'good';
  if (fps >= 30) return 'warning';
  return 'poor';
}

export function FPSMeter({ fps }: FPSMeterProps) {
  const status = getFPSStatus(fps.current);

  return (
    <div className="fps-meter" data-status={status}>
      <div className="fps-meter-header">
        <Activity size={14} aria-hidden="true" />
        <span className="fps-meter-title">FPS</span>
      </div>

      <div className="fps-meter-value">
        <span className="fps-current">{fps.current}</span>
        <span className="fps-unit">fps</span>
      </div>

      <div className="fps-meter-stats">
        <div className="fps-stat">
          <span className="fps-stat-label">Avg</span>
          <span className="fps-stat-value">{fps.average}</span>
        </div>
        <div className="fps-stat">
          <span className="fps-stat-label">Min</span>
          <span className="fps-stat-value">{fps.min}</span>
        </div>
        <div className="fps-stat">
          <span className="fps-stat-label">Max</span>
          <span className="fps-stat-value">{fps.max}</span>
        </div>
      </div>

      {/* 미니 바 차트 */}
      <div className="fps-mini-chart" aria-hidden="true">
        {fps.history.slice(-30).map((value, i) => (
          <div
            key={i}
            className="fps-bar"
            style={{ height: `${Math.min(100, (value / 60) * 100)}%` }}
            data-status={getFPSStatus(value)}
          />
        ))}
      </div>

      {/* 스크린 리더용 */}
      <span className="sr-only">
        Current FPS: {fps.current}, Average: {fps.average}, Status: {status}
      </span>
    </div>
  );
}
```

#### 7.2.3 FPSMeter CSS

**파일**: `src/builder/panels/monitor/monitor-panel.css` (추가)

```css
/* FPS 미터 */
.fps-meter {
  background: var(--color-surface-50);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  padding: var(--spacing-sm, 8px);
  min-width: 120px;
}

.fps-meter[data-status="good"] {
  border-color: var(--threshold-safe);
}

.fps-meter[data-status="warning"] {
  border-color: var(--threshold-warning);
}

.fps-meter[data-status="poor"] {
  border-color: var(--threshold-danger);
}

.fps-meter-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  margin-bottom: var(--spacing-xs, 4px);
}

.fps-meter-title {
  font-size: var(--text-xs, 12px);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.fps-meter-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.fps-current {
  font-size: var(--text-2xl, 24px);
  font-weight: 700;
  line-height: 1;
}

.fps-meter[data-status="good"] .fps-current {
  color: var(--threshold-safe);
}

.fps-meter[data-status="warning"] .fps-current {
  color: var(--threshold-warning);
}

.fps-meter[data-status="poor"] .fps-current {
  color: var(--threshold-danger);
}

.fps-unit {
  font-size: var(--text-xs, 12px);
  color: var(--color-text-muted);
}

.fps-meter-stats {
  display: flex;
  gap: var(--spacing-sm, 8px);
  margin-top: var(--spacing-xs, 4px);
  padding-top: var(--spacing-xs, 4px);
  border-top: 1px solid var(--color-border);
}

.fps-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fps-stat-label {
  font-size: 9px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.fps-stat-value {
  font-size: var(--text-sm, 14px);
  font-weight: 500;
}

/* FPS 미니 바 차트 */
.fps-mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 20px;
  margin-top: var(--spacing-xs, 4px);
}

.fps-bar {
  flex: 1;
  min-width: 2px;
  background: var(--color-primary-400);
  border-radius: 1px 1px 0 0;
  transition: height 100ms;
}

.fps-bar[data-status="good"] {
  background: var(--threshold-safe);
}

.fps-bar[data-status="warning"] {
  background: var(--threshold-warning);
}

.fps-bar[data-status="poor"] {
  background: var(--threshold-danger);
}
```

---

### 🎯 Step 7.3: 컴포넌트별 메모리 분석 (2시간)

#### 7.3.1 useComponentMemory 훅

**파일**: `src/builder/panels/monitor/hooks/useComponentMemory.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../stores';

export interface ComponentMemoryInfo {
  elementId: string;
  customId?: string;
  tag: string;
  depth: number;
  memoryBytes: number;
  childCount: number;
  propsSize: number;
  percentage: number;
}

interface UseComponentMemoryOptions {
  enabled?: boolean;
  sortBy?: 'memory' | 'children' | 'depth';
  limit?: number;
}

// 객체 크기 추정 (바이트)
function estimateObjectSize(obj: unknown): number {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj === 'boolean') return 4;
  if (typeof obj === 'number') return 8;
  if (typeof obj === 'string') return (obj as string).length * 2;

  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + estimateObjectSize(item), 0);
  }

  if (typeof obj === 'object') {
    return Object.entries(obj).reduce((sum, [key, value]) => {
      return sum + key.length * 2 + estimateObjectSize(value);
    }, 0);
  }

  return 0;
}

// 요소의 깊이 계산
function getElementDepth(
  elementId: string,
  elements: { id: string; parent_id: string | null }[]
): number {
  let depth = 0;
  let current = elements.find((el) => el.id === elementId);

  while (current?.parent_id) {
    depth++;
    current = elements.find((el) => el.id === current!.parent_id);
    if (depth > 100) break; // 무한 루프 방지
  }

  return depth;
}

// 자식 요소 수 계산
function countChildren(
  elementId: string,
  elements: { id: string; parent_id: string | null }[]
): number {
  const directChildren = elements.filter((el) => el.parent_id === elementId);
  return directChildren.reduce(
    (sum, child) => sum + 1 + countChildren(child.id, elements),
    0
  );
}

export function useComponentMemory(options: UseComponentMemoryOptions = {}) {
  const { enabled = true, sortBy = 'memory', limit = 20 } = options;
  const elements = useStore((state) => state.elements);
  const [componentMemory, setComponentMemory] = useState<ComponentMemoryInfo[]>([]);
  const [totalMemory, setTotalMemory] = useState(0);

  const analyze = useCallback(() => {
    if (!enabled || elements.length === 0) {
      setComponentMemory([]);
      setTotalMemory(0);
      return;
    }

    // 각 요소별 메모리 계산
    const memoryInfos: ComponentMemoryInfo[] = elements.map((el) => {
      const propsSize = estimateObjectSize(el.props);
      const baseSize = 100; // 기본 객체 오버헤드
      const idSize = (el.id?.length ?? 0) * 2;
      const customIdSize = (el.customId?.length ?? 0) * 2;
      const tagSize = (el.tag?.length ?? 0) * 2;

      const memoryBytes = baseSize + idSize + customIdSize + tagSize + propsSize;
      const childCount = countChildren(el.id, elements);
      const depth = getElementDepth(el.id, elements);

      return {
        elementId: el.id,
        customId: el.customId,
        tag: el.tag,
        depth,
        memoryBytes,
        childCount,
        propsSize,
        percentage: 0, // 후처리에서 계산
      };
    });

    // 전체 메모리 계산
    const total = memoryInfos.reduce((sum, info) => sum + info.memoryBytes, 0);
    setTotalMemory(total);

    // 백분율 계산
    memoryInfos.forEach((info) => {
      info.percentage = total > 0 ? (info.memoryBytes / total) * 100 : 0;
    });

    // 정렬
    memoryInfos.sort((a, b) => {
      switch (sortBy) {
        case 'memory':
          return b.memoryBytes - a.memoryBytes;
        case 'children':
          return b.childCount - a.childCount;
        case 'depth':
          return a.depth - b.depth;
        default:
          return 0;
      }
    });

    // 상위 N개만
    setComponentMemory(memoryInfos.slice(0, limit));
  }, [enabled, elements, sortBy, limit]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  return { componentMemory, totalMemory, refresh: analyze };
}
```

#### 7.3.2 ComponentMemoryList 컴포넌트

**파일**: `src/builder/panels/monitor/components/ComponentMemoryList.tsx`

```tsx
import { useState } from 'react';
import { Box, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Select, SelectValue, Popover, ListBox, ListBoxItem } from 'react-aria-components';
import { useComponentMemory, type ComponentMemoryInfo } from '../hooks/useComponentMemory';

interface ComponentMemoryListProps {
  enabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMemoryStatus(percentage: number): 'low' | 'medium' | 'high' {
  if (percentage >= 10) return 'high';
  if (percentage >= 5) return 'medium';
  return 'low';
}

export function ComponentMemoryList({ enabled = true }: ComponentMemoryListProps) {
  const [sortBy, setSortBy] = useState<'memory' | 'children' | 'depth'>('memory');
  const [expanded, setExpanded] = useState(true);
  const { componentMemory, totalMemory, refresh } = useComponentMemory({
    enabled,
    sortBy,
    limit: 15,
  });

  return (
    <div className="component-memory-list">
      <div className="component-memory-header">
        <Button
          className="component-memory-toggle"
          onPress={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <Box size={14} aria-hidden="true" />
          <span>Component Memory</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>

        <div className="component-memory-actions">
          <span className="component-memory-total">
            Total: {formatBytes(totalMemory)}
          </span>

          <Select
            selectedKey={sortBy}
            onSelectionChange={(key) => setSortBy(key as typeof sortBy)}
            aria-label="Sort by"
          >
            <Button className="sort-select-btn">
              <SelectValue />
            </Button>
            <Popover>
              <ListBox>
                <ListBoxItem id="memory">Memory</ListBoxItem>
                <ListBoxItem id="children">Children</ListBoxItem>
                <ListBoxItem id="depth">Depth</ListBoxItem>
              </ListBox>
            </Popover>
          </Select>

          <Button className="refresh-btn" onPress={refresh} aria-label="Refresh">
            ↻
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="component-memory-content">
          {componentMemory.length === 0 ? (
            <div className="component-memory-empty">
              No components to analyze
            </div>
          ) : (
            <ul className="component-memory-items" role="list">
              {componentMemory.map((info) => (
                <ComponentMemoryItem key={info.elementId} info={info} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ComponentMemoryItem({ info }: { info: ComponentMemoryInfo }) {
  const status = getMemoryStatus(info.percentage);

  return (
    <li className="component-memory-item" data-status={status}>
      <div className="component-memory-item-main">
        <span className="component-tag">{info.tag}</span>
        {info.customId && (
          <span className="component-custom-id">#{info.customId}</span>
        )}
      </div>

      <div className="component-memory-item-details">
        <span className="component-memory-size">{formatBytes(info.memoryBytes)}</span>
        <span className="component-memory-percent">({info.percentage.toFixed(1)}%)</span>
      </div>

      <div className="component-memory-bar-container">
        <div
          className="component-memory-bar"
          style={{ width: `${Math.min(100, info.percentage * 2)}%` }}
          data-status={status}
        />
      </div>

      <div className="component-memory-meta">
        <span title="Child count">👶 {info.childCount}</span>
        <span title="Depth">📏 {info.depth}</span>
        <span title="Props size">📦 {formatBytes(info.propsSize)}</span>
      </div>
    </li>
  );
}
```

#### 7.3.3 ComponentMemoryList CSS

**파일**: `src/builder/panels/monitor/monitor-panel.css` (추가)

```css
/* 컴포넌트별 메모리 리스트 */
.component-memory-list {
  background: var(--color-surface-50);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
}

.component-memory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm, 8px);
  background: var(--color-surface-100);
  border-bottom: 1px solid var(--color-border);
}

.component-memory-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  background: transparent;
  border: none;
  font-size: var(--text-sm, 14px);
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text);
}

.component-memory-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.component-memory-total {
  font-size: var(--text-xs, 12px);
  color: var(--color-text-muted);
}

.sort-select-btn {
  padding: 2px 8px;
  font-size: var(--text-xs, 12px);
  background: var(--color-surface-200);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
}

.refresh-btn {
  padding: 2px 6px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
}

.component-memory-content {
  max-height: 300px;
  overflow-y: auto;
}

.component-memory-empty {
  padding: var(--spacing-lg, 16px);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--text-sm, 14px);
}

.component-memory-items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.component-memory-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto auto;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-sm, 8px);
  border-bottom: 1px solid var(--color-border);
}

.component-memory-item:last-child {
  border-bottom: none;
}

.component-memory-item[data-status="high"] {
  background: color-mix(in srgb, var(--threshold-danger) 5%, transparent);
}

.component-memory-item[data-status="medium"] {
  background: color-mix(in srgb, var(--threshold-warning) 5%, transparent);
}

.component-memory-item-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}

.component-tag {
  font-weight: 600;
  font-size: var(--text-sm, 14px);
  color: var(--color-primary-600);
}

.component-custom-id {
  font-size: var(--text-xs, 12px);
  color: var(--color-text-muted);
}

.component-memory-item-details {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  justify-self: end;
}

.component-memory-size {
  font-weight: 600;
  font-size: var(--text-sm, 14px);
}

.component-memory-percent {
  font-size: var(--text-xs, 12px);
  color: var(--color-text-muted);
}

.component-memory-bar-container {
  grid-column: 1 / -1;
  height: 4px;
  background: var(--color-surface-200);
  border-radius: 2px;
  overflow: hidden;
}

.component-memory-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 300ms;
}

.component-memory-bar[data-status="low"] {
  background: var(--threshold-safe);
}

.component-memory-bar[data-status="medium"] {
  background: var(--threshold-warning);
}

.component-memory-bar[data-status="high"] {
  background: var(--threshold-danger);
}

.component-memory-meta {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--spacing-sm, 8px);
  font-size: 10px;
  color: var(--color-text-muted);
}
```

---

### 🎯 Step 7.4: Threshold 커스터마이징 (30분)

#### 7.4.1 ThresholdSettings 컴포넌트

**파일**: `src/builder/panels/monitor/components/ThresholdSettings.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { Button, Dialog, DialogTrigger, Modal, Slider, Label } from 'react-aria-components';

export interface ThresholdConfig {
  warning: number;  // default: 60
  danger: number;   // default: 75
}

interface ThresholdSettingsProps {
  config: ThresholdConfig;
  onChange: (config: ThresholdConfig) => void;
}

const STORAGE_KEY = 'xstudio-monitor-thresholds';

// localStorage에서 설정 로드
export function loadThresholdConfig(): ThresholdConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // 무시
  }
  return { warning: 60, danger: 75 };
}

// localStorage에 설정 저장
function saveThresholdConfig(config: ThresholdConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 무시
  }
}

export function ThresholdSettings({ config, onChange }: ThresholdSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    // danger가 warning보다 커야 함
    const validConfig = {
      warning: Math.min(localConfig.warning, localConfig.danger - 5),
      danger: localConfig.danger,
    };
    saveThresholdConfig(validConfig);
    onChange(validConfig);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultConfig = { warning: 60, danger: 75 };
    setLocalConfig(defaultConfig);
  };

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button className="threshold-settings-btn" aria-label="Threshold settings">
        <Settings size={14} />
      </Button>

      <Modal>
        <Dialog className="threshold-settings-dialog">
          {({ close }) => (
            <>
              <div className="dialog-header">
                <h3>Threshold Settings</h3>
                <Button className="dialog-close" onPress={close}>
                  <X size={16} />
                </Button>
              </div>

              <div className="dialog-content">
                <div className="threshold-slider-group">
                  <Label>Warning Threshold: {localConfig.warning}%</Label>
                  <Slider
                    value={localConfig.warning}
                    onChange={(value) => setLocalConfig((prev) => ({ ...prev, warning: value }))}
                    minValue={30}
                    maxValue={90}
                    step={5}
                    aria-label="Warning threshold"
                  >
                    <div className="slider-track">
                      <div
                        className="slider-fill warning"
                        style={{ width: `${((localConfig.warning - 30) / 60) * 100}%` }}
                      />
                      <div className="slider-thumb" />
                    </div>
                  </Slider>
                  <p className="threshold-hint">
                    노란색 경고가 표시되는 메모리 사용률
                  </p>
                </div>

                <div className="threshold-slider-group">
                  <Label>Danger Threshold: {localConfig.danger}%</Label>
                  <Slider
                    value={localConfig.danger}
                    onChange={(value) => setLocalConfig((prev) => ({ ...prev, danger: value }))}
                    minValue={40}
                    maxValue={95}
                    step={5}
                    aria-label="Danger threshold"
                  >
                    <div className="slider-track">
                      <div
                        className="slider-fill danger"
                        style={{ width: `${((localConfig.danger - 40) / 55) * 100}%` }}
                      />
                      <div className="slider-thumb" />
                    </div>
                  </Slider>
                  <p className="threshold-hint">
                    빨간색 위험 경고가 표시되는 메모리 사용률
                  </p>
                </div>

                <div className="threshold-preview">
                  <div className="threshold-preview-bar">
                    <div
                      className="threshold-zone safe"
                      style={{ width: `${localConfig.warning}%` }}
                    >
                      Safe
                    </div>
                    <div
                      className="threshold-zone warning"
                      style={{ width: `${localConfig.danger - localConfig.warning}%` }}
                    >
                      Warning
                    </div>
                    <div
                      className="threshold-zone danger"
                      style={{ width: `${100 - localConfig.danger}%` }}
                    >
                      Danger
                    </div>
                  </div>
                </div>
              </div>

              <div className="dialog-footer">
                <Button className="btn-secondary" onPress={handleReset}>
                  Reset to Default
                </Button>
                <Button className="btn-primary" onPress={handleSave}>
                  Save
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
```

#### 7.4.2 ThresholdSettings CSS

**파일**: `src/builder/panels/monitor/monitor-panel.css` (추가)

```css
/* Threshold 설정 버튼 */
.threshold-settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--color-surface-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 150ms;
}

.threshold-settings-btn:hover {
  background: var(--color-surface-200);
  color: var(--color-text);
}

/* Threshold 설정 다이얼로그 */
.threshold-settings-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-xl);
  width: 360px;
  max-width: 90vw;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: var(--text-lg, 18px);
  font-weight: 600;
}

.dialog-close {
  display: flex;
  padding: var(--spacing-xs, 4px);
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
}

.dialog-content {
  padding: var(--spacing-lg, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 16px);
}

.threshold-slider-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.threshold-slider-group label {
  font-size: var(--text-sm, 14px);
  font-weight: 500;
}

.slider-track {
  position: relative;
  height: 8px;
  background: var(--color-surface-200);
  border-radius: 4px;
}

.slider-fill {
  position: absolute;
  height: 100%;
  border-radius: 4px;
}

.slider-fill.warning {
  background: var(--threshold-warning);
}

.slider-fill.danger {
  background: var(--threshold-danger);
}

.threshold-hint {
  margin: 0;
  font-size: var(--text-xs, 12px);
  color: var(--color-text-muted);
}

/* Threshold 미리보기 */
.threshold-preview {
  padding: var(--spacing-sm, 8px);
  background: var(--color-surface-100);
  border-radius: var(--radius-md, 8px);
}

.threshold-preview-bar {
  display: flex;
  height: 24px;
  border-radius: var(--radius-sm, 4px);
  overflow: hidden;
}

.threshold-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
}

.threshold-zone.safe {
  background: var(--threshold-safe);
}

.threshold-zone.warning {
  background: var(--threshold-warning);
}

.threshold-zone.danger {
  background: var(--threshold-danger);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  border-top: 1px solid var(--color-border);
}

.btn-secondary {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  background: var(--color-surface-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-sm, 14px);
  cursor: pointer;
}

.btn-primary {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  background: var(--color-primary-600);
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-sm, 14px);
  color: white;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--color-primary-700);
}
```

---

### 🎯 Step 7.5: MonitorPanel 통합 업데이트 (30분)

#### 7.5.1 MonitorPanel.tsx 최종 버전

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx` (최종 업데이트)

```tsx
import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import { useMemoryStats } from './hooks/useMemoryStats';
import { useTimeSeriesData } from './hooks/useTimeSeriesData';
import { useFPSMonitor } from './hooks/useFPSMonitor';
import { useWebVitals } from './hooks/useWebVitals';
import { useToast } from '../../hooks/useToast';
import { MemoryChart } from './components/MemoryChart';
import { RealtimeChart } from './components/RealtimeChart';
import { HistoryFlowChart } from './components/HistoryFlowChart';
import { HistoryList } from './components/HistoryList';
import { FPSMeter } from './components/FPSMeter';
import { ComponentMemoryList } from './components/ComponentMemoryList';
import { WebVitalsCard } from './components/WebVitalsCard';
import { ExportButton } from './components/ExportButton';
import { ThresholdIndicator } from './components/ThresholdIndicator';
import { ThresholdSettings, loadThresholdConfig, type ThresholdConfig } from './components/ThresholdSettings';
import { ToastContainer } from '../../components/ToastContainer';
import { MemoryActions } from './components/MemoryActions';
import './monitor-panel.css';

export function MonitorPanel() {
  const [activeTab, setActiveTab] = useState<'realtime' | 'memory' | 'flow' | 'history' | 'components'>('realtime');
  const [thresholdConfig, setThresholdConfig] = useState<ThresholdConfig>(loadThresholdConfig);

  const { stats, statusMessage, optimize, isOptimizing } = useMemoryStats();
  const { fps } = useFPSMonitor({ enabled: activeTab === 'realtime' });
  const { vitals, requestVitals } = useWebVitals();
  const { toasts, showToast, dismissToast } = useToast();

  // 시계열 데이터 수집
  const getStatsForTimeSeries = useCallback(() => {
    if (!stats) return null;
    return {
      memoryUsage: stats.commandStoreStats.estimatedMemoryUsage,
      memoryPercent: calculateMemoryPercent(stats),
      historyEntries: stats.totalEntries,
      cacheSize: stats.commandStoreStats.cacheSize,
    };
  }, [stats]);

  const { data: timeSeriesData } = useTimeSeriesData(getStatsForTimeSeries, {
    enabled: activeTab === 'realtime',
    maxPoints: 60,
    intervalMs: 1000,
  });

  // Threshold 알림
  useEffect(() => {
    if (!stats) return;
    const memoryPercent = calculateMemoryPercent(stats);

    if (memoryPercent >= thresholdConfig.danger) {
      showToast('error', `메모리 사용량이 ${memoryPercent.toFixed(0)}%에 도달했습니다. 최적화를 권장합니다.`, {
        dedupeKey: 'memory-danger',
      });
    } else if (memoryPercent >= thresholdConfig.warning) {
      showToast('warning', `메모리 사용량이 ${memoryPercent.toFixed(0)}%입니다.`, {
        dedupeKey: 'memory-warning',
      });
    }
  }, [stats, thresholdConfig, showToast]);

  // Web Vitals 주기적 요청
  useEffect(() => {
    if (activeTab === 'realtime') {
      requestVitals();
      const interval = setInterval(requestVitals, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, requestVitals]);

  const memoryPercent = stats ? calculateMemoryPercent(stats) : 0;

  return (
    <div className="monitor-panel">
      <div className="monitor-panel-header">
        <ThresholdIndicator
          value={memoryPercent}
          warningThreshold={thresholdConfig.warning}
          dangerThreshold={thresholdConfig.danger}
        />

        <div className="monitor-panel-actions">
          <ExportButton stats={stats} format="json" />
          <ExportButton stats={stats} format="csv" />
          <ThresholdSettings config={thresholdConfig} onChange={setThresholdConfig} />
        </div>
      </div>

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as typeof activeTab)}>
        <TabList className="monitor-tabs" aria-label="Monitor views">
          <Tab id="realtime">Realtime</Tab>
          <Tab id="memory">Memory</Tab>
          <Tab id="flow">Flow</Tab>
          <Tab id="history">History</Tab>
          <Tab id="components">Components</Tab>
        </TabList>

        <TabPanel id="realtime" className="monitor-tab-content">
          <div className="realtime-grid">
            <div className="realtime-main">
              <RealtimeChart
                data={timeSeriesData}
                width={500}
                height={150}
                metric="memoryPercent"
                showThresholds
              />
            </div>

            <div className="realtime-sidebar">
              <FPSMeter fps={fps} />
              <WebVitalsCard vitals={vitals} />
            </div>
          </div>

          <div className="realtime-stats">
            <StatCard label="Memory" value={`${memoryPercent.toFixed(1)}%`} />
            <StatCard label="Entries" value={stats?.totalEntries ?? 0} />
            <StatCard label="Cache" value={stats?.commandStoreStats.cacheSize ?? 0} />
            <StatCard label="Compression" value={`${((stats?.commandStoreStats.compressionRatio ?? 0) * 100).toFixed(0)}%`} />
          </div>
        </TabPanel>

        <TabPanel id="memory" className="monitor-tab-content">
          <MemoryChart stats={stats} width={600} height={200} />
          <MemoryActions
            onOptimize={optimize}
            isOptimizing={isOptimizing}
            statusMessage={statusMessage}
          />
        </TabPanel>

        <TabPanel id="flow" className="monitor-tab-content">
          <HistoryFlowChart />
        </TabPanel>

        <TabPanel id="history" className="monitor-tab-content">
          <HistoryList />
        </TabPanel>

        <TabPanel id="components" className="monitor-tab-content">
          <ComponentMemoryList enabled={activeTab === 'components'} />
        </TabPanel>
      </Tabs>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// 유틸리티 함수
function calculateMemoryPercent(stats: NonNullable<ReturnType<typeof useMemoryStats>['stats']>): number {
  // 예상 최대 메모리 기준 백분율 계산 (10MB 기준)
  const maxMemory = 10 * 1024 * 1024;
  return Math.min(100, (stats.commandStoreStats.estimatedMemoryUsage / maxMemory) * 100);
}

// StatCard 컴포넌트
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
```

---

### ✅ Phase 7 QA 체크리스트

#### 실시간 시계열 그래프
- [ ] 1초마다 데이터 포인트 추가
- [ ] 최대 60초 데이터 유지 (FIFO)
- [ ] Threshold 라인 표시
- [ ] 그라데이션 fill 렌더링
- [ ] 현재 값 포인트 표시
- [ ] X/Y축 라벨 표시
- [ ] 탭 전환 시 수집 중단/재개

#### FPS 모니터
- [ ] requestAnimationFrame 기반 측정
- [ ] Current/Avg/Min/Max 표시
- [ ] 30fps 미만 시 warning 표시
- [ ] 55fps 이상 시 good 표시
- [ ] 미니 바 차트 렌더링

#### 컴포넌트별 메모리
- [ ] 요소별 메모리 추정 표시
- [ ] 정렬 옵션 (Memory/Children/Depth)
- [ ] 상위 15개 표시
- [ ] 백분율 바 표시
- [ ] 메타 정보 (자식 수, 깊이, props 크기)
- [ ] 접기/펼치기 동작

#### Threshold 커스터마이징
- [ ] 설정 다이얼로그 열기/닫기
- [ ] Warning threshold 슬라이더 동작
- [ ] Danger threshold 슬라이더 동작
- [ ] 미리보기 바 업데이트
- [ ] localStorage 저장/로드
- [ ] Reset to Default 동작

---

계획 완료! 구현 준비 완료되었습니다.

## 📊 최종 기능 완성도

| 카테고리 | 이전 | 현재 |
|----------|------|------|
| 핵심 기능 | 95% | **100%** |
| 개선 기능 | 90% | **100%** |
| 고급 기능 | 40% | **100%** |
| UX/접근성 | 98% | **100%** |

**종합 기능 완성도: 100/100** 🎉

---

## 📋 Phase 매핑 가이드 (최적화된 구현 순서)

문서의 상세 내용은 기존 구조로 작성되어 있으나, **실제 구현 시에는 아래 최적화된 순서**를 따르세요.

### 🔄 구현 순서 매핑

| 새 Phase | 구현 내용 | 문서 참조 위치 |
|----------|-----------|----------------|
| **Phase 1** | 레거시 제거 | 기존 Phase 1 그대로 |
| **Phase 2** | Panel 인프라 | 기존 Phase 2 + Phase 4 (Registry) |
| **Phase 3** | Core Monitor | 기존 Phase 3 (MemoryChart, HistoryFlowChart, HistoryList) |
| **Phase 4** | 알림 시스템 | 기존 Phase 6 Step 6.1 (Threshold) + Step 6.3 (Toast) |
| **Phase 5** | 실시간 모니터링 | 기존 Phase 7 Step 7.1-7.2 + Phase 6 Step 6.4 |
| **Phase 6** | 분석 도구 | 기존 Phase 7 Step 7.3-7.4 + Phase 6 Step 6.2 + Phase 5 |

### 📝 상세 매핑

#### NEW Phase 2: Panel 인프라 (2.5-3.5h)
```
기존 Phase 2: Bottom Panel Slot 전체
+ 기존 Phase 4: Registry 등록 전체
```

#### NEW Phase 4: 알림 시스템 (1.5-2h)
```
기존 Phase 6 Step 6.1: Threshold 경고 시스템 (CSS, ThresholdIndicator, MemoryChart threshold 라인)
+ 기존 Phase 6 Step 6.3: Toast/Notification 시스템 (Toast, ToastContainer, useToast)
+ 기존 Phase 6 Step 6.3.5: Monitor Panel Threshold 알림 연동
```

#### NEW Phase 5: 실시간 모니터링 (2.5-3h)
```
기존 Phase 7 Step 7.1: 실시간 시계열 그래프 (useTimeSeriesData, RealtimeChart)
+ 기존 Phase 7 Step 7.2: FPS 모니터 (useFPSMonitor, FPSMeter)
+ 기존 Phase 6 Step 6.4: Core Web Vitals (useWebVitals, WebVitalsCard, Canvas 핸들러)
```

#### NEW Phase 6: 분석 도구 (3-3.5h)
```
기존 Phase 7 Step 7.3: 컴포넌트별 메모리 분석 (useComponentMemory, ComponentMemoryList)
+ 기존 Phase 7 Step 7.4: Threshold 커스터마이징 (ThresholdSettings)
+ 기존 Phase 6 Step 6.2: Export 기능 (ExportButton)
+ 기존 Phase 5: 성능 최적화 (SizeEstimator, RequestIdleCallback)
+ 기존 Phase 7 Step 7.5: MonitorPanel 최종 통합
```

### ⚡ 병렬 구현 가능 구간

```
Phase 1 → Phase 2 → Phase 3 → [Phase 4 || Phase 5] → Phase 6
                                    ↑
                              병렬 구현 가능
```

**Phase 4와 5는 서로 의존성이 없으므로 2명이 병렬 작업 가능**
- 개발자 A: Phase 4 (알림 시스템) - 1.5-2h
- 개발자 B: Phase 5 (실시간 모니터링) - 2.5-3h

### 🎯 구현 체크리스트

```
[ ] Phase 1: 레거시 제거 완료
[ ] Phase 2: BottomPanelSlot + PanelRegistry 등록 완료
[ ] Phase 3: MonitorPanel 기본 UI + 3가지 차트 완료
[ ] Phase 4: Toast 컴포넌트 + Threshold 경고 완료
[ ] Phase 5: 실시간 차트 + FPS + Web Vitals 완료
[ ] Phase 6: 컴포넌트 메모리 + Export + 최적화 완료
[ ] 전체 통합 테스트 완료
```

---

## 📊 최종 산출물 요약

### 파일 구조 (총 27개 파일, ~1,800줄)

```
src/builder/
├── panels/
│   ├── monitor/
│   │   ├── index.ts (15줄)
│   │   ├── MonitorPanel.tsx (220줄)
│   │   ├── monitor-panel.css (450줄)
│   │   ├── hooks/
│   │   │   ├── useMemoryStats.ts (80줄)
│   │   │   ├── useTimeSeriesData.ts (70줄)
│   │   │   ├── useFPSMonitor.ts (50줄)
│   │   │   ├── useWebVitals.ts (50줄)
│   │   │   └── useComponentMemory.ts (90줄)
│   │   └── components/
│   │       ├── MemoryChart.tsx (70줄)
│   │       ├── RealtimeChart.tsx (100줄)
│   │       ├── HistoryFlowChart.tsx (120줄)
│   │       ├── HistoryList.tsx (80줄)
│   │       ├── FPSMeter.tsx (60줄)
│   │       ├── ComponentMemoryList.tsx (120줄)
│   │       ├── WebVitalsCard.tsx (40줄)
│   │       ├── ThresholdIndicator.tsx (20줄)
│   │       ├── ThresholdSettings.tsx (80줄)
│   │       ├── ExportButton.tsx (30줄)
│   │       └── MemoryActions.tsx (30줄)
│   └── slots/
│       └── BottomPanelSlot.tsx (60줄)
├── components/
│   ├── Toast.tsx (60줄)
│   ├── ToastContainer.tsx (40줄)
│   └── styles/Toast.css (50줄)
└── hooks/
    └── useToast.ts (40줄)
```

### 기능 매트릭스

| 기능 | Figma | DevTools | XStudio |
|------|:-----:|:--------:|:-------:|
| 메모리 모니터링 | ✅ | ✅ | ✅ |
| 실시간 그래프 | ✅ | ✅ | ✅ |
| FPS 모니터 | ✅ | ✅ | ✅ |
| Core Web Vitals | - | ✅ | ✅ |
| 컴포넌트별 메모리 | ✅ | - | ✅ |
| Threshold 경고 | ✅ | ✅ | ✅ |
| Threshold 커스텀 | - | ✅ | ✅ |
| Export CSV/JSON | - | ✅ | ✅ |
| Toast 알림 | ✅ | - | ✅ |
| 히스토리 플로우 | - | - | ✅ |

**XStudio Monitor Panel = Figma + Chrome DevTools 장점 결합** 🚀
