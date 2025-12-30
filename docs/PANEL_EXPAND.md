# Panel Display Modes 확장 계획

패널 시스템에 다양한 표시 모드(modal)를 추가하여 패널을 더 유연하게 호출할 수 있도록 확장하는 계획입니다.

## 구현 완료 (2025-12-30)

### 구현된 기능
- **Phase 1-5**: 모두 완료
- **Phase 6**: 부분 완료 (CommandPalette, Header 버튼)

### 사용 방법
| 방법 | 설명 |
|------|------|
| Header 버튼 | ⚙️ Settings 아이콘 클릭 |
| CommandPalette | `Cmd+K` → "설정 창으로 열기" / "히스토리 창으로 열기" / "AI 창으로 열기" |

### 지원 패널
- Settings (`displayModes: ["panel", "modal"]`)
- AI (`displayModes: ["panel", "modal"]`)
- History (`displayModes: ["panel", "modal"]`)

### 주요 변경 파일
- `src/builder/panels/core/types.ts` - 타입 확장
- `src/builder/panels/core/PanelRegistry.ts` - displayMode 메서드 추가
- `src/builder/hooks/usePanelLayout.ts` - Modal 액션 구현
- `src/builder/layout/ModalPanelContainer.tsx` - Modal 렌더링 (신규)
- `src/builder/layout/ModalPanelContainer.css` - Modal 스타일 (신규)
- `src/builder/main/BuilderCore.tsx` - ModalPanelContainer 마운트
- `src/builder/main/BuilderHeader.tsx` - Settings 버튼 추가
- `src/builder/components/overlay/CommandPalette.tsx` - Modal 명령 추가

---

## 현재 상태 분석

### 기존 패널 시스템 구조

```
src/builder/panels/core/
├── types.ts          # 패널 타입 정의
├── PanelRegistry.ts  # 패널 등록/관리
├── panelConfigs.ts   # 패널 설정 및 등록
└── index.ts          # export
```

### 현재 지원하는 패널 위치
- `PanelSide`: `'left' | 'right' | 'bottom'`
- 패널은 사이드바에 고정되어 표시됨

### 현재 PanelConfig 인터페이스
```typescript
interface PanelConfig {
  id: PanelId;
  name: string;
  nameEn?: string;
  icon: LucideIcon;
  component: ComponentType<PanelProps>;
  category: PanelCategory;
  defaultPosition: PanelSide;
  minWidth?: number;
  maxWidth?: number;
  description?: string;
  shortcut?: string;
}
```

## 목표

1. **다양한 표시 모드 지원**
   - `panel`: 기존 사이드바 패널 (기본값)
   - `modal`: 떠있는 모달 형태 (드래그 가능, React Aria Components 기반)

2. **유연한 패널 호출**
   - 동일 패널을 상황에 따라 다른 모드로 표시
   - 키보드 단축키, 우클릭 메뉴 등에서 모드 선택 가능

3. **사용성 향상**
   - 드래그로 위치 이동
   - 리사이즈 지원
   - ESC 키로 닫기
   - 다중 modal 패널 지원 (z-index 관리)

---

## 정책 및 UX 규칙

- 패널은 **단일 인스턴스**만 유지하고, 다른 모드로 열기 요청 시 **모드 전환**(기존 닫고 새 모드만 표시)으로 처리
- modal은 `react-aria-components`로 구현하며 **포커스 트랩 + 배경 inert/클릭 차단 + ESC 닫기** 기본 적용
- modal 기본 위치는 **화면 중앙** (필요 시 추후 패널별 예외 옵션 추가)
- 초기 크기는 `defaultWidth/defaultHeight`를 사용하고, `min/max`는 제약으로만 사용

---

## Phase 1: 타입 시스템 확장

### 목표
패널 표시 모드를 위한 타입 정의 추가

### 변경 파일
- `src/builder/panels/core/types.ts`

### 작업 내용

#### 1.1 PanelDisplayMode 타입 추가
```typescript
/**
 * 패널 표시 모드
 * - panel: 사이드바/하단에 고정된 패널 (기본)
 * - modal: 떠있는 모달 형태 (드래그 가능, React Aria Components 기반)
 */
export type PanelDisplayMode = 'panel' | 'modal';
```

#### 1.2 PanelConfig 확장
```typescript
interface PanelConfig {
  // ... 기존 속성들

  /** 기본 너비 (px, modal 초기값) */
  defaultWidth?: number;

  /** 기본 높이 (px, modal 초기값) */
  defaultHeight?: number;

  /** 최소 높이 (px, modal 제약) */
  minHeight?: number;

  /** 최대 높이 (px, modal 제약) */
  maxHeight?: number;

  /** 지원하는 표시 모드 목록 (기본: ['panel']) */
  displayModes?: PanelDisplayMode[];
}
```

#### 1.3 PanelProps 확장
```typescript
interface PanelProps {
  // ... 기존 속성들

  /** 현재 표시 모드 */
  displayMode?: PanelDisplayMode;
}
```

#### 1.4 ModalPanelState 타입 추가
```typescript
/**
 * Modal 패널 상태
 */
interface ModalPanelState {
  /** 패널 ID */
  panelId: PanelId;

  /** 표시 모드 */
  mode: 'modal';

  /** 위치 (드래그 이동 시 업데이트) */
  position: { x: number; y: number };

  /** 크기 (리사이즈 시 업데이트) */
  size: { width: number; height: number };

  /** z-index (포커스 순서) */
  zIndex: number;
}
```

#### 1.5 PanelLayoutState 확장
```typescript
interface PanelLayoutState {
  // ... 기존 속성들

  /** Modal 패널 목록 */
  modalPanels: ModalPanelState[];

  /** 다음 modal 패널의 z-index */
  nextModalZIndex: number;
}
```

#### 1.6 PanelLayoutActions 확장
```typescript
interface PanelLayoutActions {
  // ... 기존 액션들

  /** 패널을 Modal로 열기 */
  openPanelAsModal: (panelId: PanelId) => void;

  /** Modal 패널 닫기 */
  closeModalPanel: (panelId: PanelId) => void;

  /** Modal 패널 포커스 (z-index 업데이트) */
  focusModalPanel: (panelId: PanelId) => void;

  /** Modal 패널 위치 업데이트 */
  updateModalPanelPosition: (panelId: PanelId, position: { x: number; y: number }) => void;

  /** Modal 패널 크기 업데이트 */
  updateModalPanelSize: (panelId: PanelId, size: { width: number; height: number }) => void;

  /** 모든 Modal 패널 닫기 */
  closeAllModalPanels: () => void;
}
```

#### 1.7 DEFAULT_PANEL_LAYOUT 확장
```typescript
const DEFAULT_PANEL_LAYOUT: PanelLayoutState = {
  // ... 기존 값들
  modalPanels: [],
  nextModalZIndex: 1000,
};
```

### 검증
- TypeScript 컴파일 에러 없음 확인
- 기존 코드와의 호환성 유지

---

## Phase 2: PanelRegistry 확장

### 목표
표시 모드 관련 조회 메서드 추가

### 변경 파일
- `src/builder/panels/core/PanelRegistry.ts`

### 작업 내용

#### 2.1 표시 모드별 패널 조회
```typescript
/**
 * 특정 표시 모드를 지원하는 패널 조회
 */
getPanelsByDisplayMode(mode: PanelDisplayMode): PanelConfig[] {
  return this.getAllPanels().filter((panel) => {
    const modes = panel.displayModes || ["panel"];
    return modes.includes(mode);
  });
}
```

#### 2.2 패널의 모드 지원 여부 확인
```typescript
/**
 * 패널이 특정 표시 모드를 지원하는지 확인
 */
supportsDisplayMode(panelId: PanelId, mode: PanelDisplayMode): boolean {
  const panel = this.getPanel(panelId);
  if (!panel) return false;
  const modes = panel.displayModes || ["panel"];
  return modes.includes(mode);
}
```

#### 2.3 패널의 지원 모드 목록 조회
```typescript
/**
 * 패널의 지원 표시 모드 목록 조회
 */
getDisplayModes(panelId: PanelId): PanelDisplayMode[] {
  const panel = this.getPanel(panelId);
  return panel?.displayModes || ["panel"];
}
```

### 검증
- 기존 메서드 영향 없음 확인
- 새 메서드 동작 테스트

---

## Phase 3: usePanelLayout 훅 확장

### 목표
Modal 패널 관련 액션 구현

### 변경 파일
- `src/builder/hooks/usePanelLayout.ts`
- `src/builder/layout/types.ts` (UsePanelLayoutReturn 확장)

### 작업 내용

#### 3.1 openPanelAsModal 구현
```typescript
const openPanelAsModal = useCallback((panelId: PanelId) => {
  // 이미 열려있으면 포커스만 (다른 모드면 닫고 모드 전환)
  const existing = layout.modalPanels.find((p) => p.panelId === panelId);
  if (existing) {
    if (existing.mode === "modal") {
      focusModalPanel(panelId);
      return;
    }
    closeModalPanel(panelId);
  }

  // 패널 설정 가져오기
  const panelConfig = PanelRegistry.getPanel(panelId);
  if (!panelConfig) return;

  // 초기 위치 및 크기 계산 (화면 중앙)
  const width = panelConfig.defaultWidth || panelConfig.minWidth || 360;
  const height = panelConfig.defaultHeight || panelConfig.minHeight || 480;
  const x = Math.max(100, (window.innerWidth - width) / 2);
  const y = Math.max(100, (window.innerHeight - height) / 2);

  // 위치 경계 검사 (화면 밖으로 나가지 않도록 clamp)
  const clampPosition = (x: number, y: number, width: number, height: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - width)),
    y: Math.max(0, Math.min(y, window.innerHeight - height)),
  });
  const clamped = clampPosition(x, y, width, height);

  const newPanel: ModalPanelState = {
    panelId,
    mode: "modal",
    position: { x: clamped.x, y: clamped.y },
    size: { width, height },
    zIndex: layout.nextModalZIndex,
  };

  setPanelLayout({
    ...layout,
    modalPanels: [...layout.modalPanels, newPanel],
    nextModalZIndex: layout.nextModalZIndex + 1,
  });
}, [layout, setPanelLayout]);
```

#### 3.2 layout/types.ts 확장 상세
```typescript
// layout/types.ts
export interface UsePanelLayoutReturn extends PanelLayoutActions {
  layout: PanelLayoutState;
  isLoading: boolean;
  isLoaded: boolean;
  openPanelAsModal: (panelId: PanelId) => void;
  closeModalPanel: (panelId: PanelId) => void;
  focusModalPanel: (panelId: PanelId) => void;
  updateModalPanelPosition: (
    panelId: PanelId,
    position: { x: number; y: number }
  ) => void;
  updateModalPanelSize: (
    panelId: PanelId,
    size: { width: number; height: number }
  ) => void;
  closeAllModalPanels: () => void;
}
```

#### 3.3 기타 액션들 구현
- `closeModalPanel`
- `focusModalPanel`
- `updateModalPanelPosition`
- `updateModalPanelSize`
- `closeAllModalPanels`

### 검증
- 액션 호출 시 상태 정상 업데이트 확인
- 기존 액션 영향 없음 확인

---

## Phase 4: ModalPanelContainer 컴포넌트 구현

### 목표
Modal 모드 패널을 렌더링하는 컨테이너 컴포넌트 생성

### 생성 파일
- `src/builder/layout/ModalPanelContainer.tsx`
- `src/builder/layout/ModalPanelContainer.css`

### 작업 내용

#### 4.1 ModalPanelContainer 구조
```tsx
export const ModalPanelContainer = memo(function ModalPanelContainer() {
  const { layout, closeModalPanel, focusModalPanel, updateModalPanelPosition } = usePanelLayout();
  const { modalPanels } = layout;

  return (
    <div className="modal-panel-container">
      {modalPanels.map((panel) => (
        <ModalPanel key={panel.panelId} panel={panel} ... />
      ))}
    </div>
  );
});
```

#### 4.2 ModalPanel 컴포넌트
React Aria Components 레퍼런스 구조(`ModalOverlay` → `Modal` → `Dialog`)를 사용해 포커스 트랩과 배경 inert 처리를 기본으로 둡니다.
```tsx
import { ModalOverlay, Modal, Dialog, Heading } from "react-aria-components";

const ModalPanel = memo(function ModalPanel({ panel, onClose, onFocus, onPositionChange }) {
  const panelConfig = PanelRegistry.getPanel(panel.panelId);
  const PanelComponent = panelConfig.component;

  return (
    <ModalOverlay
      className="modal-panel-backdrop"
      isDismissable={false}
      isKeyboardDismissDisabled={false}
    >
      <Modal
        className={`modal-panel modal-panel--${panel.mode}`}
        style={{ left: panel.position.x, top: panel.position.y, zIndex: panel.zIndex }}
      >
        <Dialog aria-label={panelConfig.name}>
          <Heading slot="title">{panelConfig.name}</Heading>
          <div className="modal-panel-header" onMouseDown={handleDragStart}>
            <span>{panelConfig.name}</span>
            <button onClick={handleClose}><X /></button>
          </div>
          <div className="modal-panel-content">
            <PanelComponent isActive={true} displayMode={panel.mode} onClose={handleClose} />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
});
```

#### 4.2.1 OverlayProvider 위치
React Aria Components의 오버레이 스택 관리를 위해 Builder 전용으로 `OverlayProvider`를 배치합니다.
```tsx
import { OverlayProvider } from "react-aria-components";

// Builder 전용: src/builder/index.tsx에서 감싸기
<OverlayProvider>
  <BuilderCore />
</OverlayProvider>
```

#### 4.3 드래그 기능 구현
```typescript
// 드래그 시작
const handleMouseDown = (e: React.MouseEvent) => {
  isDragging.current = true;
  dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
};

// 드래그 중
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    onPositionChange(panelId, { x: newX, y: newY });
  };
  // ...
}, []);
```

#### 4.4 CSS 스타일
```css
.modal-panel-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 900;
}

.modal-panel-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.modal-panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--spectrum-gray-100);
  border: 1px solid var(--spectrum-gray-300);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
  pointer-events: auto;
  animation: modalPanelIn 150ms ease-out;
}

.modal-panel-header {
  cursor: grab;
  user-select: none;
}

.modal-panel-header:active {
  cursor: grabbing;
}

@keyframes modalPanelIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### 검증
- 드래그 동작 확인
- z-index 포커스 동작 확인
- ESC 키 닫기 동작 확인
- Modal 모드 동작 확인

---

## Phase 5: 앱 통합 및 패널 설정

### 목표
메인 앱에 ModalPanelContainer 마운트 및 패널 설정 업데이트

### 변경 파일
- `src/builder/main/BuilderCore.tsx`
- `src/builder/layout/index.ts`
- `src/builder/panels/core/panelConfigs.ts`

### 작업 내용

#### 5.1 layout/index.ts export 추가
```typescript
export { ModalPanelContainer } from "./ModalPanelContainer";
```

#### 5.2 BuilderCore에 ModalPanelContainer 추가
```tsx
import { ModalPanelContainer } from "../layout";

// render 부분
<>
  {/* ... 기존 컴포넌트들 */}
  <ModalPanelContainer />
</>
```

#### 5.3 패널 설정 업데이트
```typescript
// panelConfigs.ts
{
  id: "settings",
  name: "설정",
  // ...
  defaultHeight: 500,
  displayModes: ["panel", "modal"],
},
{
  id: "ai",
  name: "AI",
  // ...
  defaultHeight: 500,
  displayModes: ["panel", "modal"],
},
{
  id: "history",
  name: "히스토리",
  // ...
  defaultHeight: 450,
  displayModes: ["panel", "modal"],
},
```

### 검증
- 앱 정상 동작 확인
- 설정된 패널에서 modal 모드 동작 확인

---

## Phase 6: UI 트리거 구현 (선택사항)

### 목표
사용자가 패널을 다양한 모드로 열 수 있는 UI 제공

### 작업 내용

#### 6.1 패널 아이콘 우클릭 메뉴
```tsx
<ContextMenu>
  <MenuItem onAction={() => togglePanel(side, panelId)}>
    패널에서 열기
  </MenuItem>
  {supportsModal && (
    <MenuItem onAction={() => openPanelAsModal(panelId)}>
      모달로 열기
    </MenuItem>
  )}
</ContextMenu>
```

#### 6.2 키보드 단축키 확장
```typescript
// 기존 단축키 + Shift로 다른 모드
Ctrl+, -> Settings 패널 열기
Ctrl+Shift+, -> Settings 모달로 열기
```

#### 6.3 CommandPalette 통합
```typescript
{
  id: "open-settings-modal",
  label: "설정을 모달로 열기",
  action: () => openPanelAsModal("settings"),
}
```

---

## Phase 7: 고급 기능 (선택사항)

### 7.1 리사이즈 지원
- 패널 모서리/가장자리 드래그로 크기 조절
- 최소/최대 크기 제한

### 7.2 위치 저장
- localStorage에 마지막 위치/크기 저장
- 다음 열기 시 복원

### 7.3 스냅 기능
- 화면 가장자리에 자동 정렬
- 다른 modal 패널과 정렬

### 7.4 최소화/최대화
- 타이틀바 더블클릭으로 최대화
- 최소화 버튼으로 축소

---

## 일정 및 우선순위

| Phase | 설명 | 우선순위 | 예상 복잡도 |
|-------|------|----------|-------------|
| 1 | 타입 시스템 확장 | 필수 | 낮음 |
| 2 | PanelRegistry 확장 | 필수 | 낮음 |
| 3 | usePanelLayout 확장 | 필수 | 중간 |
| 4 | ModalPanelContainer | 필수 | 높음 |
| 5 | 앱 통합 및 패널 설정 | 필수 | 낮음 |
| 6 | UI 트리거 구현 | 선택 | 중간 |
| 7 | 고급 기능 | 선택 | 높음 |

---

## 파일 변경 요약

### 수정 파일
1. `src/builder/panels/core/types.ts` - Phase 1
2. `src/builder/panels/core/PanelRegistry.ts` - Phase 2
3. `src/builder/panels/core/panelConfigs.ts` - Phase 5
4. `src/builder/hooks/usePanelLayout.ts` - Phase 3
5. `src/builder/layout/types.ts` - Phase 3
6. `src/builder/layout/index.ts` - Phase 5
7. `src/builder/main/BuilderCore.tsx` - Phase 5

### 생성 파일
1. `src/builder/layout/ModalPanelContainer.tsx` - Phase 4
2. `src/builder/layout/ModalPanelContainer.css` - Phase 4

---

## 테스트 체크리스트

### 기능 테스트
- [ ] Modal 모드로 패널 열기
- [ ] 드래그로 위치 이동
- [ ] 클릭으로 z-index 변경 (포커스)
- [ ] ESC 키로 닫기
- [ ] X 버튼으로 닫기
- [ ] 배경 클릭 차단 확인
- [ ] 다중 modal 패널 동시 표시

### 접근성 테스트
- [ ] 스크린 리더로 패널 제목 읽기
- [ ] Tab 키로 패널 내 포커스 순환
- [ ] 포커스 트랩 동작 (modal 모드)

### 엣지 케이스
- [ ] 창 리사이즈 시 패널 위치 보정
- [ ] 패널 열린 상태에서 라우트 변경
- [ ] 드래그 중 마우스가 창 밖으로 나갈 때

### 호환성 테스트
- [ ] 기존 패널 기능 정상 동작
- [ ] TypeScript 컴파일 에러 없음
- [ ] ESLint 에러 없음
- [ ] 반응형 레이아웃 대응
