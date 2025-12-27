# Photoshop 벤치마크 기반 UI/UX 적용 계획

참고 자료: `docs/explanation/research/PHOTOSHOP_BENCHMARK.md`

## 1. 목적
- Photoshop Web의 사용자 편의성 패턴을 xstudio에 맞게 도입해 학습 부담을 줄이고 작업 속도를 높인다.
- 초기 단계에서는 이미 배치된 History 패널(우측)과 컨텍스트 도구 흐름을 우선 개선해 체감 효용을 만든다.

## 2. History 패널 보완 아이디어 (우선 적용)
### 2.1 UX/레이아웃
- **현재/미래 상태 시각 구분**: redo 구간은 투명도 50% 처리, 시작 상태는 이탤릭+보조 색상 강조.
- **항목 아이콘**: add/remove/update/batch 등 유형별 아이콘을 좌측에 배치해 일목요연한 스캔을 지원.
- **타임라인/날짜 라벨**: 시간단위 표시 외에 날짜 경계 시 구분선 추가.
- **키보드 네비게이션**: ↑/↓ 포커스, Enter로 복원, Cmd/Ctrl+Z(Undo), Cmd/Ctrl+Shift+Z 또는 Y(Redo).

### 2.2 기능
- **스냅샷/핀**: 특정 시점을 북마크로 고정하고 Clear 영향을 받지 않는 Snapshot 섹션 제공.
- **라벨 정규화**: 동일 요소 연속 업데이트는 하나의 “일괄 수정 (n)”으로 병합해 리스트 소음을 줄임.
- **썸네일(옵션)**: Canvas 미니 스크린샷을 지연 로딩으로 표시해 시각적 탐색 지원.
- **검색/필터**: 요소 ID/customId/tag 기준 필터 및 타입별 필터(추가/삭제/수정 등).

### 2.3 데이터/성능
- **대량 점프 최적화**: 반복 undo/redo 대신 targetIndex 기반 단일 복원 API를 제공해 긴 리스트 점프 시간을 단축.
- **History States limit 표기**: 최대 유지 개수와 현재 사용량을 헤더/툴팁에 노출해 삭제 정책을 투명하게 안내.
- **IDB 로딩 UX**: 초기 로딩 시 Skeleton과 “동기화 중” 상태를 표시하고 완료 후 현재 항목으로 자동 스크롤.

### 2.4 협업/버전
- **버전 히스토리 분리**: 세션 히스토리와 저장 버전을 탭으로 분리(Photoshop History vs Versions 패턴).
- **변경자 태그(확장)**: Supabase Realtime 메타 정보 연동 시 작성자/협업자 배지를 표시.

## 3. 기타 Photoshop UX 차용 대상
### 3.1 컨텍스트 액션 바 (Contextual Task Bar)
- **개념**: 선택한 요소/도구에 따라 플로팅 버튼 세트를 자동 전환, 위치 고정(Pin) 옵션 제공.
- **행동 예시**: Button 선택 시 텍스트/스타일/이벤트 빠른 편집, Image 선택 시 대체 텍스트·마스크·크기.
- **우선순위**: P0. SelectionOverlay 하단 플로팅으로 시작, 추후 드래그 가능/Pin 유지 추가.

### 3.2 Quick Actions 컨텍스트 메뉴
- **개념**: 우클릭 메뉴에 요소별 빠른 작업과 공통 작업(복사/붙여넣기/삭제) 노출.
- **우선순위**: P0. History 패널/컨텍스트 바와 동일한 액션 맵을 재사용해 유지 보수 비용 최소화.

### 3.3 Generative Workspace & AI 보조
- **생성 공간**: 별도 탭/패널에서 프롬프트당 여러 변형 생성, Variables(다중 슬롯) 지원.
- **반복 자동화**: 배경 제거/색상 변경/스타일 제안 등 프리셋 액션을 제공하고 캔버스 요소에 직접 적용.
- **모델 선택**: Firefly vs 기타 모델(예: Gemini/FLUX) 전환 UX 설계만 먼저 정의, 실제 모델 연동은 단계적 적용.
- **우선순위**: P1. MVP는 “프롬프트 → 요소 생성/스타일 제안 → 미리보기/적용” 흐름.

### 3.4 패널 시스템(플로팅/도킹)
- **개념**: 고정 3단 레이아웃을 보완해 패널을 플로팅/도킹/그룹화 가능하게 전환.
- **우선순위**: P1. History/Comments/AI 패널을 플로팅 파이럿으로 시작 후 전체 패널로 확장.

### 3.5 협업/코멘트
- **코멘트 패널**: 요소 단위 쓰레드, 해결/미해결 상태, 멘션, Supabase Realtime 연동.
- **Presence/커서**: 현재 작업자 표시 및 캔버스 커서 공유(라이트 모드로 시작).
- **우선순위**: P1. History 패널 옆 탭으로 시작해 학습 비용 최소화.

### 3.6 버전 히스토리/저장 상태
- **버전 히스토리**: 저장 지점별 상태, 주석, 썸네일, 복원 기능. 세션 히스토리와 탭 분리.
- **저장 상태 표시**: 헤더/Status 영역에 “저장됨/동기화 중/충돌” 상태 노출.
- **우선순위**: P1. History 패널 확장 시 병렬 설계.

### 3.7 디자인 시스템/아이콘
- **아이콘 톤 조정**: Lucide 기반을 굵고 둥근 톤으로 커스터마이즈(선 두께/라운드 조정)해 Spectrum 2 느낌 반영.
- **색상 대비 점검**: WCAG AA 대비 재확인, 토큰 기반 대비 스케일 정의.
- **우선순위**: P2. 기존 토큰 체계에 맞춰 단계적 치환.

## 4. 로드맵(제안)
| 단계 | 목표 | 범위 |
|------|------|------|
| P0 (즉시) | 히스토리 UX 강화 & 컨텍스트 액션 진입점 | History 패널 보완, 컨텍스트 액션 바 MVP, Quick Actions 컨텍스트 메뉴 |
| P1 (단기) | 협업/생성형 UX 토대 | Generative Workspace MVP, Comments 패널, 플로팅 패널 파이럿, 버전 히스토리 설계 |
| P2 (중기) | 안정화 및 디자인 시스템 조정 | 액션 맵 확장, AI 모델 스위칭, 아이콘/테마 정비, Presence/커서 공유 고도화 |

## 5. 성공 지표 예시
- 히스토리 패널: 목표 상태 복원까지 평균 클릭 수 30% 감소, redo 구간 이해도(설문) 4.0/5 이상.
- 컨텍스트 액션 바: 가장 많이 쓰는 편집 3건을 패널 이동 없이 수행한 비율 50% 이상.
- Generative Workspace: 프롬프트→적용까지 평균 시간 20% 단축, 생성 결과 활용률(적용/생성) 30% 이상.

## 6. 리스크/검증 포인트
- 플로팅/도킹 UI는 레이아웃 저장/복원 복잡도가 증가하므로 기존 panelLayout 스토어와 호환성 검증 필요.
- 썸네일 캡처는 퍼포먼스 비용이 커서 지연/배치 처리와 해상도 제한을 병행해야 함.
- AI 생성/스타일 제안은 모델 응답 지연과 품질 편차가 커서, 미리보기와 되돌리기(히스토리 연계) UX가 필수.

---

# 구현 계획 상세 (Implementation Specification)

> 아래는 위 계획을 실제 코드베이스와 화면에 매핑한 구체적인 구현 명세입니다.

## 7. 코드베이스 구조 분석

### 7.1 현재 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    BuilderHeader                             │
│        src/builder/main/BuilderHeader.tsx                    │
├──────────────┬────────────────────────┬─────────────────────┤
│              │                        │                     │
│   Sidebar    │      Canvas            │    Inspector        │
│   (좌측)     │      (중앙)            │    (우측)           │
│              │                        │                     │
│ NodesPanel   │  BuilderCanvas.tsx     │  속성 에디터들      │
│ Components   │  + SelectionOverlay    │  (100+ 에디터)      │
│ Theme        │    overlay/index.tsx   │                     │
│ AI           │                        │  HistoryPanel       │
│ Settings     │                        │  AIPanel (탭)       │
│              │                        │                     │
├──────────────┴────────────────────────┴─────────────────────┤
│                  BottomPanelSlot (Monitor)                   │
│            src/builder/layout/BottomPanelSlot.tsx            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 핵심 파일 매핑

| 영역 | 현재 파일 | 역할 |
|------|-----------|------|
| 선택 오버레이 | `src/builder/overlay/index.tsx` | 요소 선택 시각화, **Contextual Action Bar 추가 위치** |
| 히스토리 패널 | `src/builder/panels/history/HistoryPanel.tsx` | 변경 이력 표시 |
| 히스토리 스토어 | `src/builder/stores/history.ts` | IndexedDB 기반 히스토리 관리 |
| AI 패널 | `src/builder/panels/ai/AIPanel.tsx` | Groq 기반 AI 어시스턴트 |
| 패널 레지스트리 | `src/builder/panels/core/PanelRegistry.ts` | 패널 등록/관리 |
| 메인 빌더 | `src/builder/main/BuilderCore.tsx` | 전체 빌더 오케스트레이션 |

---

## 8. P0 구현 명세 (즉시 적용)

### 8.1 Contextual Action Bar

#### 8.1.1 화면 설계

```
선택된 요소 아래 또는 위에 플로팅 표시:

┌──────────────────────────────────────────┐
│          [선택된 Button 요소]             │
└──────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────┐
    │ 📝 텍스트 │ 🎨 스타일 │ ⚡ 이벤트 │ ⋮ │
    └─────────────────────────────────┘
         ↑ Contextual Action Bar
```

#### 8.1.2 파일 구조

```
src/builder/overlay/
├── index.tsx                          # 기존 SelectionOverlay
├── components/
│   ├── BorderRadiusHandles.tsx        # 기존
│   └── ContextualActionBar.tsx        # 🆕 신규 생성
├── hooks/
│   ├── useOverlayRAF.ts               # 기존
│   ├── useVisibleOverlays.ts          # 기존
│   └── useContextualActions.ts        # 🆕 요소별 액션 매핑
└── types/
    └── actions.ts                     # 🆕 액션 타입 정의
```

#### 8.1.3 액션 매핑 설계

```typescript
// src/builder/overlay/types/actions.ts

export interface ContextualAction {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  shortcut?: string;
  action: (elementId: string) => void;
  isActive?: (element: Element) => boolean;
}

export type ElementActionMap = Record<string, ContextualAction[]>;

// 요소별 액션 정의
export const elementActions: ElementActionMap = {
  // 공통 액션
  '_common': [
    { id: 'copy', icon: Copy, label: '복사', shortcut: '⌘C' },
    { id: 'delete', icon: Trash2, label: '삭제', shortcut: '⌫' },
  ],

  // Button 전용
  'Button': [
    { id: 'edit-text', icon: Type, label: '텍스트 편집' },
    { id: 'change-variant', icon: Palette, label: '스타일 변경' },
    { id: 'add-event', icon: Zap, label: '이벤트 추가' },
  ],

  // TextField 전용
  'TextField': [
    { id: 'placeholder', icon: Type, label: '플레이스홀더' },
    { id: 'validation', icon: Shield, label: '유효성 검사' },
  ],

  // Image 전용
  'Image': [
    { id: 'change-src', icon: ImageIcon, label: '이미지 변경' },
    { id: 'alt-text', icon: FileText, label: '대체 텍스트' },
    { id: 'resize', icon: Maximize2, label: '크기 조정' },
  ],

  // Container/Layout
  'Flex': [
    { id: 'direction', icon: ArrowRight, label: '방향 전환' },
    { id: 'alignment', icon: AlignCenter, label: '정렬' },
    { id: 'gap', icon: Space, label: '간격 조정' },
  ],
};
```

#### 8.1.4 컴포넌트 구현 명세

```typescript
// src/builder/overlay/components/ContextualActionBar.tsx

interface ContextualActionBarProps {
  elementId: string;
  elementTag: string;
  overlayRect: Rect;
  onAction: (actionId: string) => void;
}

/**
 * 위치 계산 로직:
 * 1. 기본: 선택 영역 하단 8px 아래
 * 2. 공간 부족 시: 선택 영역 상단 위로 이동
 * 3. 좌우 경계: 화면 밖으로 나가지 않도록 조정
 */
function calculatePosition(overlayRect: Rect, barHeight: number = 40): CSSProperties {
  const padding = 8;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const bottomSpace = viewportHeight - (overlayRect.top + overlayRect.height);
  const showAbove = bottomSpace < barHeight + padding * 2;

  return {
    position: 'fixed',
    left: Math.max(8, Math.min(
      overlayRect.left + overlayRect.width / 2,
      viewportWidth - 150
    )),
    top: showAbove
      ? overlayRect.top - barHeight - padding
      : overlayRect.top + overlayRect.height + padding,
    transform: 'translateX(-50%)',
    zIndex: 1000,
  };
}
```

#### 8.1.5 SelectionOverlay 수정 포인트

```typescript
// src/builder/overlay/index.tsx 수정

// 1. import 추가
import { ContextualActionBar } from './components/ContextualActionBar';
import { useContextualActions } from './hooks/useContextualActions';

// 2. 컴포넌트 내부 (single-select 모드 렌더링 부분)
return (
  <div className="overlay">
    <div className="overlay-element" style={...}>
      {/* 기존 오버레이 내용 */}
      <div className="overlay-info">...</div>
      <BorderRadiusHandles ... />
    </div>

    {/* 🆕 Contextual Action Bar */}
    {overlayRect && selectedElementId && (
      <ContextualActionBar
        elementId={selectedElementId}
        elementTag={displayTag}
        overlayRect={overlayRect}
        onAction={handleContextualAction}
      />
    )}
  </div>
);
```

---

### 8.2 History Panel 보완

#### 8.2.1 현재 vs 개선 비교

| 항목 | 현재 상태 | 개선 목표 |
|------|-----------|-----------|
| 아이콘 | ❌ 없음 | ✅ 유형별 아이콘 (add/remove/update) |
| Redo 구분 | ❌ 없음 | ✅ 투명도 50% 처리 |
| 점프 최적화 | ⚠️ 반복 undo/redo | ✅ targetIndex 직접 점프 |
| 스냅샷 | ❌ 없음 | ✅ 북마크 기능 |
| 로딩 상태 | ❌ 없음 | ✅ Skeleton + 동기화 상태 |

#### 8.2.2 파일 수정 목록

```
src/builder/panels/history/
├── HistoryPanel.tsx           # 수정: UI 개선
├── HistoryPanel.css           # 수정: 스타일 추가
├── components/
│   ├── HistoryItem.tsx        # 🆕 개별 항목 컴포넌트
│   ├── HistoryIcon.tsx        # 🆕 유형별 아이콘
│   ├── HistorySnapshot.tsx    # 🆕 스냅샷 섹션
│   └── HistorySkeleton.tsx    # 🆕 로딩 스켈레톤
└── hooks/
    └── useHistoryJump.ts      # 🆕 최적화된 점프 훅

src/builder/stores/
├── history.ts                 # 수정: jumpToIndex API 추가
└── history/
    └── historyActions.ts      # 수정: 스냅샷 기능 추가
```

#### 8.2.3 히스토리 아이템 UI 개선

```typescript
// src/builder/panels/history/components/HistoryItem.tsx

interface HistoryItemProps {
  entry: HistoryEntry;
  index: number;
  currentIndex: number;
  isRedo: boolean;  // currentIndex보다 큰 경우
  onJump: (index: number) => void;
}

// 유형별 아이콘 매핑
const typeIcons: Record<HistoryEntry['type'], LucideIcon> = {
  add: Plus,
  remove: Minus,
  update: Pencil,
  move: Move,
  batch: Layers,
  group: FolderPlus,
  ungroup: FolderMinus,
};

// CSS 클래스
// .history-item[data-redo="true"] { opacity: 0.5; }
// .history-item[data-active="true"] { background: var(--accent); }
```

#### 8.2.4 점프 최적화 API

```typescript
// src/builder/stores/history.ts 추가

/**
 * 🆕 targetIndex로 직접 점프 (반복 undo/redo 대신)
 *
 * 기존: for loop로 undo/redo 반복 호출
 * 개선: 단일 API로 대상 상태 직접 복원
 */
async jumpToIndex(targetIndex: number): Promise<boolean> {
  if (!this.currentPageId) return false;

  const pageHistory = this.pageHistories.get(this.currentPageId);
  if (!pageHistory) return false;

  const currentIndex = pageHistory.currentIndex;
  if (targetIndex === currentIndex) return true;
  if (targetIndex < -1 || targetIndex >= pageHistory.entries.length) return false;

  // 직접 인덱스 업데이트 (undo/redo 반복 없이)
  pageHistory.currentIndex = targetIndex;

  // 상태 복원 로직
  await this.restoreStateAtIndex(targetIndex);

  this.notifyListeners();
  return true;
}
```

---

### 8.3 Quick Actions Context Menu

#### 8.3.1 화면 설계

```
우클릭 시 표시되는 컨텍스트 메뉴:

┌─────────────────────────┐
│ 📝 텍스트 편집          │
│ 🎨 스타일 변경          │
│ ⚡ 이벤트 추가          │
├─────────────────────────┤
│ 📋 복사          ⌘C    │
│ 📄 붙여넣기      ⌘V    │
│ 📑 복제          ⌘D    │
├─────────────────────────┤
│ ⬆️ 맨 앞으로           │
│ ⬇️ 맨 뒤로             │
├─────────────────────────┤
│ 🗑️ 삭제          ⌫     │
└─────────────────────────┘
```

#### 8.3.2 파일 구조

```
src/builder/components/
├── ContextMenu/
│   ├── index.tsx              # 🆕 메인 컨텍스트 메뉴
│   ├── ContextMenu.css        # 🆕 스타일
│   ├── useContextMenu.ts      # 🆕 우클릭 훅
│   └── menuItems.ts           # 🆕 메뉴 아이템 정의 (액션 맵 재사용)
```

#### 8.3.3 Canvas 통합

```typescript
// src/builder/main/BuilderCanvas.tsx 수정

import { ContextMenu, useContextMenu } from '../components/ContextMenu';

function BuilderCanvas() {
  const { menuPosition, showMenu, hideMenu } = useContextMenu();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const elementId = getElementIdFromEvent(e);
    if (elementId) {
      showMenu(e.clientX, e.clientY, elementId);
    }
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {/* Canvas 내용 */}

      {menuPosition && (
        <ContextMenu
          position={menuPosition}
          elementId={menuPosition.elementId}
          onClose={hideMenu}
        />
      )}
    </div>
  );
}
```

---

## 9. P1 구현 명세 (단기)

### 9.1 Generative Workspace 강화

#### 9.1.1 현재 AIPanel 분석

현재 `src/builder/panels/ai/AIPanel.tsx`는:
- ✅ Groq 서비스 연동
- ✅ 프롬프트 기반 요소 생성/수정/삭제
- ⚠️ 단일 결과만 생성
- ❌ 변형(Variations) 미지원
- ❌ 미리보기 미지원

#### 9.1.2 개선 설계

```
┌─────────────────────────────────────────────┐
│ 🤖 AI Assistant                    [🗑️]    │
├─────────────────────────────────────────────┤
│                                             │
│  [Quick Actions]                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 🔘  │ │ 📝  │ │ 🎨  │ │ 📐  │           │
│  │버튼 │ │텍스트│ │스타일│ │레이아웃│        │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│                                             │
│  [Variations] (3개 생성됨)                  │
│  ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ V1  │ │ V2  │ │ V3  │  [+ 더 생성]      │
│  │ ✓  │ │     │ │     │                   │
│  └─────┘ └─────┘ └─────┘                   │
│                                             │
│  [Chat Messages...]                         │
│                                             │
├─────────────────────────────────────────────┤
│ 메시지 입력...                    [전송]    │
└─────────────────────────────────────────────┘
```

#### 9.1.3 파일 수정/추가 목록

```
src/builder/panels/ai/
├── AIPanel.tsx                    # 수정: 구조 개선
├── AIPanel.css                    # 수정: 스타일 추가
├── components/
│   ├── QuickActions.tsx           # 🆕 빠른 액션 버튼
│   ├── VariationsGrid.tsx         # 🆕 변형 그리드
│   ├── VariationPreview.tsx       # 🆕 변형 미리보기
│   └── PromptTemplates.tsx        # 🆕 프롬프트 템플릿
└── hooks/
    ├── useVariations.ts           # 🆕 변형 생성 관리
    └── usePromptHistory.ts        # 🆕 프롬프트 히스토리
```

---

### 9.2 Comments Panel

#### 9.2.1 파일 구조

```
src/builder/panels/comments/
├── CommentsPanel.tsx              # 🆕 메인 패널
├── CommentsPanel.css              # 🆕 스타일
├── components/
│   ├── CommentThread.tsx          # 🆕 댓글 쓰레드
│   ├── CommentItem.tsx            # 🆕 개별 댓글
│   ├── CommentInput.tsx           # 🆕 댓글 입력
│   └── CommentIndicator.tsx       # 🆕 캔버스 마커
├── hooks/
│   └── useComments.ts             # 🆕 Supabase Realtime 연동
└── types/
    └── comment.types.ts           # 🆕 타입 정의
```

#### 9.2.2 데이터 구조

```typescript
// src/builder/panels/comments/types/comment.types.ts

export interface Comment {
  id: string;
  project_id: string;
  page_id: string;
  element_id: string | null;  // null이면 페이지 레벨 코멘트

  author_id: string;
  author_name: string;
  author_avatar?: string;

  content: string;
  resolved: boolean;

  parent_id: string | null;  // 답글인 경우

  position?: {  // 캔버스 위치 (element_id 없을 때)
    x: number;
    y: number;
  };

  created_at: string;
  updated_at: string;
}
```

---

### 9.3 Floating Panel System

#### 9.3.1 설계 개념

```typescript
// src/builder/layout/types.ts 확장

export interface PanelState {
  id: string;
  type: 'docked' | 'floating' | 'minimized';

  // Docked 상태
  dockPosition?: 'left' | 'right' | 'bottom';
  dockOrder?: number;

  // Floating 상태
  floatingPosition?: { x: number; y: number };
  floatingSize?: { width: number; height: number };

  // 공통
  isVisible: boolean;
  isPinned: boolean;
}

export interface PanelGroup {
  id: string;
  panelIds: string[];
  activeTabId: string;
}
```

#### 9.3.2 파일 구조

```
src/builder/layout/
├── types.ts                       # 수정: 플로팅 타입 추가
├── usePanelLayout.ts              # 수정: 플로팅 로직 추가
├── PanelContainer.tsx             # 수정: 도킹/플로팅 분기
├── FloatingPanel/
│   ├── index.tsx                  # 🆕 플로팅 패널 래퍼
│   ├── FloatingPanel.css          # 🆕 스타일
│   ├── FloatingHeader.tsx         # 🆕 드래그 가능 헤더
│   ├── ResizeHandles.tsx          # 🆕 크기 조절 핸들
│   └── useFloatingDrag.ts         # 🆕 드래그 훅
└── PanelGroup/
    ├── index.tsx                  # 🆕 탭 그룹 패널
    └── PanelTabs.tsx              # 🆕 탭 헤더
```

---

## 10. P2 구현 명세 (중기)

### 10.1 디자인 시스템 조정

#### 10.1.1 아이콘 커스터마이징

```css
/* src/styles/icons.css */

/* Lucide 아이콘 Spectrum 2 스타일 적용 */
.icon-spectrum {
  --icon-stroke-width: 2.5;  /* 기본 2 → 2.5 */
  --icon-stroke-linecap: round;
  --icon-stroke-linejoin: round;
}

/* 아이콘 크기 스케일 */
:root {
  --icon-xs: 12px;
  --icon-sm: 14px;
  --icon-md: 16px;
  --icon-lg: 20px;
  --icon-xl: 24px;
}
```

#### 10.1.2 색상 대비 토큰

```css
/* src/styles/tokens/contrast.css */

:root {
  /* WCAG AA 준수 대비 스케일 */
  --contrast-high: 7:1;     /* 본문 텍스트 */
  --contrast-medium: 4.5:1; /* 큰 텍스트, 아이콘 */
  --contrast-low: 3:1;      /* 비활성 요소 */

  /* 상태별 색상 */
  --color-text-primary: oklch(20% 0 0);
  --color-text-secondary: oklch(40% 0 0);
  --color-text-disabled: oklch(60% 0 0);

  /* 다크 모드 */
  [data-theme="dark"] {
    --color-text-primary: oklch(95% 0 0);
    --color-text-secondary: oklch(75% 0 0);
    --color-text-disabled: oklch(50% 0 0);
  }
}
```

---

## 11. 테스트 전략

### 11.1 단위 테스트

```
src/builder/
├── overlay/components/__tests__/
│   └── ContextualActionBar.test.tsx
├── panels/history/__tests__/
│   └── HistoryPanel.test.tsx
└── stores/__tests__/
    └── historyManager.test.ts  # 기존 확장
```

### 11.2 E2E 테스트

```typescript
// e2e/contextual-action-bar.spec.ts

test('요소 선택 시 Contextual Action Bar 표시', async ({ page }) => {
  await page.goto('/builder');
  await page.click('[data-element-tag="Button"]');

  await expect(page.locator('.contextual-action-bar')).toBeVisible();
  await expect(page.locator('[data-action="edit-text"]')).toBeVisible();
});

test('Quick Action 실행 시 속성 변경', async ({ page }) => {
  await page.click('[data-action="change-variant"]');

  // 변형 선택 팝오버 표시 확인
  await expect(page.locator('.variant-popover')).toBeVisible();
});
```

---

## 12. 마이그레이션 체크리스트

### P0 단계
- [ ] `ContextualActionBar` 컴포넌트 생성
- [ ] `SelectionOverlay`에 Action Bar 통합
- [ ] 요소별 액션 매핑 정의
- [ ] History Panel 아이콘 추가
- [ ] History Panel redo 구간 스타일링
- [ ] `jumpToIndex` API 구현
- [ ] Quick Actions Context Menu 구현
- [ ] 기존 테스트 통과 확인

### P1 단계
- [ ] AI Panel 변형 생성 기능
- [ ] Comments Panel MVP
- [ ] Floating Panel 프로토타입
- [ ] 버전 히스토리 설계 문서

### P2 단계
- [ ] 아이콘 스타일 가이드
- [ ] 색상 대비 감사
- [ ] Presence/커서 공유 프로토타입
