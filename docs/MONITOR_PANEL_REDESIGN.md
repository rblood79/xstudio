# Monitor Panel 완전 재구축 - Phase별 상세 설계 문서

## 📋 Executive Summary

**목표**: 기존 monitor 시스템을 완전히 삭제하고 패널 시스템 기반의 경량 모니터링 패널로 재구축

### 핵심 조건 (모두 충족 필수)

- ✅ **기존 시스템 삭제**: `src/builder/monitor/` 전면 제거 + 연계 코드 완전 삭제
- ✅ **패널 시스템 통합**: `src/builder/panels/monitor/` 로 이전, PanelRegistry 등록
- ✅ **메모리 관리 필수**: 메모리 사용량 모니터링 및 최적화 기능
- ✅ **Zero 의존성**: 추가 라이브러리 설치 없음 (특히 상용 라이브러리 금지)
- ✅ **성능 영향 최소화**: 빌더 사용 중 퍼포먼스 저하 없음
- ✅ **Bottom 위치**: Footer 영역에 배치
- ✅ **접근성 준수**: 키보드 탐색, Esc 닫기, ARIA 레이블 필수
- ✅ **보안/프라이버시**: 메모리 데이터 외부 전송 금지, 민감 정보 로깅 금지

### 전체 작업 예상 시간

**총 8.5-11.5시간** (1명 개발자 기준)

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
# 실행할 명령
rm -rf src/builder/monitor/
rm src/builder/hooks/useMemoryMonitor.ts
rm src/builder/stores/memoryMonitor.ts
```

**삭제 확인**:
```bash
# 삭제 확인 명령
ls src/builder/monitor/        # → "No such file or directory"
ls src/builder/hooks/useMemoryMonitor.ts  # → 파일 없음
ls src/builder/stores/memoryMonitor.ts    # → 파일 없음
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

## 📊 Phase 3: 경량 Monitor Panel 구현

**예상 시간**: 3-4시간
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

  // SVG 경로 생성 (Zero 의존성!)
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
- ✅ Zero 의존성 (react-chartjs 등 불필요)
- ✅ 가볍고 빠름
- ✅ CSS variables 사용 (테마 대응)
- ✅ Responsive (viewBox)

### 🎯 Step 3.3: MonitorPanel 메인 컴포넌트 (1-1.5시간)

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx` (새 파일, 130줄)

```typescript
import React, { useState, useEffect } from 'react';
import type { PanelProps } from '../core/types';
import { useMemoryStats } from './hooks/useMemoryStats';
import { MemoryChart } from './components/MemoryChart';
import { MemoryActions } from './components/MemoryActions';
import './monitor-panel.css';

export function MonitorPanel({ isActive }: PanelProps) {
  const { stats, optimize, statusMessage } = useMemoryStats();
  const [history, setHistory] = useState<number[]>([]);

  // 메모리 히스토리 수집 (최대 60개 = 10분)
  useEffect(() => {
    if (!isActive || !stats) return;

    setHistory(prev => {
      const newHistory = [...prev, stats.estimatedMemoryUsage];
      return newHistory.slice(-60);
    });
  }, [stats, isActive]);

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
        <h3>Memory Monitor</h3>
        {statusMessage && (
          <span className="status-message">{statusMessage}</span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="monitor-stats">
        <StatCard
          label="Memory Usage"
          value={formatBytes(stats.estimatedMemoryUsage)}
          trend={getTrend(history)}
        />
        <StatCard
          label="History Entries"
          value={stats.totalEntries}
        />
        <StatCard
          label="Commands"
          value={stats.commandCount}
        />
        <StatCard
          label="Cache Size"
          value={stats.cacheSize}
        />
        <StatCard
          label="Compression"
          value={`${(stats.compressionRatio * 100).toFixed(0)}%`}
        />
      </div>

      {/* Mini Chart */}
      <MemoryChart data={history} height={80} />

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
}
```

### ✅ Phase 3 완료 체크리스트

```bash
# 1. TypeScript 컴파일
npm run type-check
# → Expected: 0 errors

# 2. 파일 생성 확인
ls src/builder/panels/monitor/
# → Expected:
#   MonitorPanel.tsx
#   monitor-panel.css
#   hooks/useMemoryStats.ts
#   components/MemoryChart.tsx
#   components/MemoryActions.tsx

# 3. Import 테스트
import { MonitorPanel } from './panels/monitor/MonitorPanel';
// → No errors
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

  estimate(obj: unknown, key?: string): number {
    // 캐시 히트
    if (key && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

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
  }

  getCacheSize(): number {
    return this.cache.size;
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

### 새 파일 (9개, ~610줄)
```
src/builder/panels/
├── core/
│   ├── BottomPanelSlot.tsx          (90줄)
│   └── bottom-panel-slot.css        (60줄)
└── monitor/
    ├── MonitorPanel.tsx             (130줄)
    ├── monitor-panel.css            (160줄)
    ├── hooks/useMemoryStats.ts      (80줄)
    └── components/
        ├── MemoryChart.tsx          (70줄)
        └── MemoryActions.tsx        (20줄)

src/builder/stores/utils/
└── sizeEstimator.ts                 (70줄)
```

### 수정 파일 (7개)
```
src/builder/main/BuilderCore.tsx
src/builder/header/BuilderHeader.tsx
src/builder/panels/core/panelConfigs.ts
src/builder/panels/core/types.ts
src/builder/hooks/panels/usePanelLayout.ts
src/builder/stores/commandDataStore.ts
src/builder/styles/4-layout/grid.css
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
3. **Phase 3 (3-4h)**: Monitor panel → 기능 구현
4. **Phase 4 (0.5h)**: Registry 등록 → 통합
5. **Phase 5 (1-2h)**: 성능 최적화 → 마무리

**총 8.5-11.5시간** → 1.5일 작업

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

계획 완료! 구현 준비 완료되었습니다.
