# Photoshop 벤치마크 기반 UI/UX 적용 계획

참고 자료: `docs/explanation/research/PHOTOSHOP_BENCHMARK.md`

## 1. 목적
- Photoshop Web의 사용자 편의성 패턴을 xstudio에 맞게 도입해 학습 부담을 줄이고 작업 속도를 높인다.
- 초기 단계에서는 이미 배치된 History 패널(우측)과 컨텍스트 도구 흐름을 우선 개선해 체감 효용을 만든다.

## 2. 로드맵 요약

| Phase | 목표 | 핵심 산출물 |
|-------|------|-------------|
| **P0** | 컨텍스트 인식 UI | Action Bar, Context Menu, History 개선 |
| **P1** | 협업/생성형 UX | AI Variations, Comments, Floating Panel |
| **P2** | 안정화 | 디자인 시스템, Presence/커서 |

## 3. 성공 지표
- History Panel: 목표 상태 복원까지 평균 클릭 수 30% 감소
- Contextual Action Bar: 패널 이동 없이 주요 편집 수행 비율 50% 이상
- AI Workspace: 프롬프트→적용까지 평균 시간 20% 단축

---

# 구현 계획 상세 (WebGL 모드 전용)

> **⚠️ 적용 범위**: 모든 구현은 `isWebGLCanvas = true` 기준입니다.
> 레거시 코드(`src/builder/overlay/`)는 현재 상태 유지합니다.

## 4. 아키텍처 개요

### 4.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    BuilderHeader                             │
├──────────────┬────────────────────────┬─────────────────────┤
│   Sidebar    │      Workspace         │    Inspector        │
│   (좌측)     │      (중앙)            │    (우측)           │
│              │                        │                     │
│ NodesPanel   │  workspace/canvas/     │  속성 에디터들      │
│ Components   │  BuilderCanvas.tsx     │  HistoryPanel       │
│ Theme        │  + SelectionLayer      │  AIPanel            │
│ AI           │  + TextEditOverlay     │                     │
│ Settings     │  + ContextualActionBar │                     │
├──────────────┴────────────────────────┴─────────────────────┤
│                  BottomPanelSlot (Monitor)                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 핵심 파일 매핑

| 영역 | 파일 경로 |
|------|-----------|
| Workspace 컨테이너 | `src/builder/workspace/Workspace.tsx` |
| PixiJS 캔버스 | `src/builder/workspace/canvas/BuilderCanvas.tsx` |
| 선택 레이어 | `src/builder/workspace/canvas/selection/SelectionLayer.tsx` |
| DOM 오버레이 | `src/builder/workspace/overlay/` |
| 뷰포트 컨트롤 | `src/builder/workspace/canvas/viewport/` |
| 히스토리 | `src/builder/stores/history.ts`, `panels/history/` |
| AI 패널 | `src/builder/panels/ai/AIPanel.tsx` |

---

## 5. Phase 0: 컨텍스트 인식 UI

### 5.1 공용 액션 시스템

**목표**: 요소별 액션을 중앙에서 정의하여 Action Bar, Context Menu, 단축키에서 재사용

```
src/builder/actions/           # 🆕 신규
├── types.ts                  # ContextualAction 인터페이스
├── elementActions.ts         # 요소별 액션 매핑
├── handlers.ts               # 액션 실행 로직
└── index.ts
```

**타입 정의**:
```typescript
export interface ContextualAction {
  id: string;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  handler: (elementId: string, store: BuilderStore) => void;
}

export type ElementActionMap = Record<string, ContextualAction[]>;
```

**요소별 액션 매핑**:
| 요소 | 액션 |
|------|------|
| `_common` | 복사, 삭제, 복제 |
| `Button` | 텍스트 편집, 스타일 변경, 이벤트 추가 |
| `TextField` | 플레이스홀더, 유효성 검사 |
| `Image` | 이미지 변경, 대체 텍스트, 크기 조정 |
| `Flex` | 방향 전환, 정렬, 간격 조정 |

---

### 5.2 Contextual Action Bar

**화면 설계**:
```
┌──────────────────────────────────────────┐
│          [선택된 Button 요소]             │
└──────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────┐
    │ 📝 텍스트 │ 🎨 스타일 │ ⚡ 이벤트 │ ⋮ │
    └─────────────────────────────────┘
```

**파일 구조**:
```
src/builder/workspace/overlay/
├── ContextualActionBar.tsx    # 🆕 DOM 기반 플로팅 바
├── ContextualActionBar.css    # 🆕 스타일
└── index.ts                   # export 추가
```

**통합 포인트**: `workspace/canvas/BuilderCanvas.tsx`
```typescript
// PixiJS Application 외부에 DOM으로 렌더링
<div className="builder-canvas-container">
  <Application>...</Application>
  <TextEditOverlay />
  <ContextualActionBar
    elementId={selectionState.elementId}
    bounds={screenBounds}  // 월드좌표 → 화면좌표 변환
    onAction={handleAction}
  />
</div>
```

**위치 계산**: `bounds.y * zoom + offset.y + bounds.height + 8px`

---

### 5.3 Quick Actions Context Menu

**화면 설계**:
```
┌─────────────────────────┐
│ 📝 텍스트 편집          │
│ 🎨 스타일 변경          │
├─────────────────────────┤
│ 📋 복사          ⌘C    │
│ 📄 붙여넣기      ⌘V    │
│ 📑 복제          ⌘D    │
├─────────────────────────┤
│ 🗑️ 삭제          ⌫     │
└─────────────────────────┘
```

**파일 구조**:
```
src/builder/components/ContextMenu/   # 🆕 신규
├── index.tsx
├── ContextMenu.css
├── useContextMenu.ts
└── menuItems.ts                     # elementActions 재사용
```

**통합**: SelectionLayer의 `onRightClick` 이벤트 → 화면 좌표 변환 → 메뉴 표시

---

### 5.4 History Panel 보완

**개선 항목**:

| 항목 | 현재 | 개선 |
|------|------|------|
| 아이콘 | ❌ | 유형별 아이콘 (Plus, Minus, Pencil, Move, Layers) |
| Redo 구분 | ❌ | `opacity: 0.5` 처리 |
| 점프 | 반복 undo/redo | `jumpToIndex(n)` 단일 API |
| 로딩 | ❌ | Skeleton + 동기화 상태 |

**파일 수정**:
```
src/builder/panels/history/
├── HistoryPanel.tsx          # UI 개선
├── components/
│   ├── HistoryItem.tsx       # 🆕 개별 항목
│   └── HistoryIcon.tsx       # 🆕 유형별 아이콘
└── HistoryPanel.css          # redo 스타일

src/builder/stores/history.ts  # jumpToIndex() 추가
```

---

## 6. Phase 1: 협업/생성형 UX

### 6.1 AI Workspace 강화

**현재 상태**: 단일 결과, 미리보기 없음

**개선 목표**:
- 프롬프트당 3개 변형 생성
- 변형 미리보기 및 선택 적용
- Quick Actions 버튼 (버튼/텍스트/스타일/레이아웃)

**파일 구조**:
```
src/builder/panels/ai/
├── AIPanel.tsx               # 구조 개선
├── components/
│   ├── QuickActions.tsx      # 🆕 빠른 액션
│   ├── VariationsGrid.tsx    # 🆕 변형 그리드
│   └── VariationPreview.tsx  # 🆕 미리보기
└── hooks/
    └── useVariations.ts      # 🆕 변형 생성/관리
```

---

### 6.2 Comments Panel

**파일 구조**:
```
src/builder/panels/comments/   # 🆕 신규
├── CommentsPanel.tsx
├── components/
│   ├── CommentThread.tsx
│   ├── CommentItem.tsx
│   └── CommentInput.tsx
└── hooks/
    └── useComments.ts        # Supabase Realtime
```

**데이터 모델**:
```typescript
interface Comment {
  id: string;
  element_id: string | null;
  author_id: string;
  content: string;
  resolved: boolean;
  parent_id: string | null;
  created_at: string;
}
```

---

### 6.3 Floating Panel System

**설계 개념**:
```typescript
interface PanelState {
  id: string;
  type: 'docked' | 'floating' | 'minimized';
  floatingPosition?: { x: number; y: number };
  floatingSize?: { width: number; height: number };
  isPinned: boolean;
}
```

**파일 구조**:
```
src/builder/layout/
├── FloatingPanel/            # 🆕 신규
│   ├── index.tsx
│   ├── FloatingHeader.tsx    # 드래그 헤더
│   └── useFloatingDrag.ts
└── types.ts                  # PanelState 확장
```

---

## 7. Phase 2: 안정화

### 7.1 디자인 시스템 조정

**아이콘 스타일** (Spectrum 2):
```css
.icon-spectrum {
  --icon-stroke-width: 2.5;
  --icon-stroke-linecap: round;
}
```

**색상 대비** (WCAG AA):
```css
:root {
  --color-text-primary: oklch(20% 0 0);
  --color-text-secondary: oklch(40% 0 0);
}
```

### 7.2 Presence/커서 공유

- 현재 작업자 표시 (라이트 모드)
- 캔버스 커서 위치 공유
- Supabase Realtime 연동

---

## 8. 구현 체크리스트

### Phase 0 ✅
- [ ] `src/builder/actions/` 생성
  - [ ] `types.ts`, `elementActions.ts`, `handlers.ts`
- [ ] `workspace/overlay/ContextualActionBar.tsx`
- [ ] `components/ContextMenu/`
- [ ] `BuilderCanvas.tsx` 통합 (Action Bar + Context Menu)
- [ ] History Panel 아이콘 및 redo 스타일
- [ ] `historyManager.jumpToIndex()` API
- [ ] 테스트 통과

### Phase 1
- [ ] AI Variations (`useVariations`, `VariationsGrid`)
- [ ] Comments Panel (Supabase Realtime)
- [ ] Floating Panel 프로토타입

### Phase 2
- [ ] 아이콘 Spectrum 2 스타일 가이드
- [ ] 색상 대비 감사
- [ ] Presence 프로토타입

---

## 9. 리스크/검증 포인트

| 리스크 | 대응 |
|--------|------|
| 플로팅 UI 레이아웃 저장/복원 | panelLayout 스토어 호환성 검증 |
| AI 응답 지연/품질 편차 | 미리보기 + 히스토리 연계 Undo |
| 좌표 변환 복잡도 | `worldToScreen()` 유틸리티 중앙화 |
