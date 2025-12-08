# Events Panel 재설계 문서

> **상태**: ✅ Phase 5 완료 (블록 기반 UI + Navigate 액션 수정)
> **작성일**: 2025-12-07
> **최종 수정**: 2025-12-08
> **관련 이슈**: Dataset Table DataBinding 기능 점검 후 진행

---

## 1. 현재 상태 분석

### 1.1 기존 아키텍처

```
src/builder/
├── panels/events/
│   └── EventsPanel.tsx          # 메인 패널 (363 lines)
│
└── events/
    ├── index.tsx                 # 레거시 Events 컴포넌트 (623 lines)
    ├── EventEditor.tsx           # 이벤트 편집기 (122 lines)
    ├── EventList.tsx             # 이벤트 목록
    │
    ├── types/
    │   ├── eventTypes.ts         # Inspector용 타입 (444 lines)
    │   └── templateTypes.ts
    │
    ├── state/
    │   ├── useEventHandlers.ts   # React Stately 기반 핸들러 관리
    │   ├── useActions.ts         # 액션 관리
    │   └── useEventSelection.ts  # 선택 상태 관리
    │
    ├── actions/                  # 21개 액션 에디터
    │   ├── ActionEditor.tsx
    │   ├── NavigateActionEditor.tsx
    │   ├── APICallActionEditor.tsx
    │   └── ... (19개 더)
    │
    ├── components/
    │   ├── EventHandlerManager.tsx
    │   ├── ConditionEditor.tsx
    │   ├── DebounceThrottleEditor.tsx
    │   └── visualMode/           # ReactFlow 기반 시각화
    │       ├── ReactFlowCanvas.tsx
    │       ├── SimpleFlowView.tsx
    │       ├── TriggerNode.tsx
    │       └── ActionNode.tsx
    │
    ├── pickers/
    │   ├── EventTypePicker.tsx
    │   └── ActionTypePicker.tsx
    │
    ├── execution/
    │   ├── eventExecutor.ts
    │   ├── conditionEvaluator.ts
    │   └── executionLogger.ts
    │
    └── data/
        ├── eventCategories.ts
        ├── actionMetadata.ts
        └── eventTemplates.ts
```

### 1.2 현재 UI 흐름

```
┌────────────────────────────────────────┐
│ Events Panel                      [+]  │
├────────────────────────────────────────┤
│ [요소 선택 안됨 → EmptyState]           │
│                                        │
│ [요소 선택됨]                           │
│   → 핸들러 목록 (PropertySection)       │
│      ├─ onClick (2 actions) →          │
│      └─ onChange (1 action) →          │
│                                        │
│ [핸들러 클릭 → 상세 뷰]                  │
│   ← Back                               │
│   Settings (Condition, Debounce)       │
│   Actions                              │
│      ├─ [+ Add Action]                 │
│      └─ EventHandlerManager            │
└────────────────────────────────────────┘
```

### 1.3 현재 문제점

| 문제 | 설명 | 영향도 |
|------|------|--------|
| **복잡한 네비게이션** | 핸들러 목록 → 상세 → 액션 편집 간 3단계 드릴다운 | High |
| **조건 분기 미지원** | THEN/ELSE 분기 없이 단일 액션 시퀀스만 지원 | High |
| **시각적 흐름 부재** | 텍스트 기반 UI로 이벤트 흐름 파악 어려움 | Medium |
| **코드 중복** | `index.tsx` (레거시)와 `EventsPanel.tsx` 중복 존재 | Medium |
| **타입 불일치** | snake_case/camelCase 혼용, 두 개의 타입 시스템 공존 | Medium |
| **변수 바인딩 미지원** | `{{user.id}}` 같은 동적 참조 불가 | High |

---

## 2. 경쟁사 UX 분석

### 2.1 빌더 도구 분석

#### Webflow Interactions
- **특징**: 타임라인 기반 애니메이션 + 트리거
- **장점**: GSAP 통합, 시각적 타임라인 편집
- **단점**: 복잡한 조건 로직에 취약

```
[Trigger: Click] → [Animation Timeline]
                    ├─ Element A: opacity 0→1 (0ms-300ms)
                    ├─ Element B: translateY (100ms-400ms)
                    └─ Element C: scale (200ms-500ms)
```

#### Bubble.io Workflows
- **특징**: 이벤트 + 조건 + 액션 순차 실행
- **장점**: 폴더 기반 정리, 색상 코딩
- **단점**: 복잡해지면 스파게티 코드화

```
[Event: Button Clicked]
  ├─ Only when: User is logged in
  └─ Actions:
      ├─ Step 1: Create thing in DB
      ├─ Step 2: Send email
      └─ Step 3: Navigate to page
```

#### Retool Event Handlers
- **특징**: 컴포넌트별 이벤트 + JS 스크립팅
- **장점**: Query 실행, 상태 변경 용이
- **단점**: 코드 중심으로 비개발자 접근성 낮음

```
Button.onClick = () => {
  query1.run();
  stateVar.setValue(newValue);
  utils.showNotification("Success");
}
```

#### Figma Prototyping
- **특징**: Trigger → Action 단순 모델
- **장점**: 직관적 연결선 UI
- **단점**: 복잡한 로직 표현 불가

```
[Frame A] ─── On Click ──→ [Frame B]
              Navigate
              Smart Animate
```

### 2.2 자동화 도구 분석

#### Airtable Automations ⭐ (권장 참고)
- **특징**: Trigger → Conditional Groups → Actions
- **장점**:
  - 조건 분기 그룹화
  - 단일 실행에서 하나의 조건 그룹만 실행
  - 시각적 블록 UI

```
[When record matches conditions]
    │
    ├─ IF: Status = "Approved"
    │   └─ Send approval email
    │   └─ Update related records
    │
    └─ ELSE IF: Status = "Rejected"
        └─ Send rejection email
        └─ Archive record
```

#### IFTTT (If This Then That)
- **특징**: 단순한 Trigger → Action 모델
- **장점**: 극도의 단순함, 학습 곡선 없음
- **단점**: 복잡한 로직 불가 (Filter Code로 우회)

```
IF [This: Instagram photo] THEN [That: Save to Dropbox]
                                [That: Post to Twitter]
```

#### n8n Workflow Automation ⭐ (권장 참고)
- **특징**: 노드 기반 시각적 워크플로우
- **장점**:
  - 노드 연결로 데이터 흐름 가시화
  - IF 노드, Loop 노드 지원
  - 각 노드 실행 결과 즉시 확인

```
[Webhook] → [IF] → [True: API Call] → [Slack]
              └─ [False: Email] → [End]
```

### 2.3 UX 패턴 비교

| 도구 | 트리거 UI | 조건 UI | 액션 UI | 시각화 |
|------|----------|---------|---------|--------|
| Webflow | 드롭다운 | 없음 | 타임라인 | ★★★★★ |
| Bubble | 드롭다운 | 인라인 조건 | 순차 목록 | ★★☆☆☆ |
| Retool | 코드 | 코드 | 코드 | ★☆☆☆☆ |
| Figma | 연결선 | 없음 | 연결선 | ★★★★☆ |
| Airtable | 드롭다운 | 조건 그룹 블록 | 블록 목록 | ★★★★☆ |
| IFTTT | 카드 선택 | Filter Code | 카드 선택 | ★★★☆☆ |
| n8n | 노드 연결 | IF 노드 | 노드 연결 | ★★★★★ |

---

## 3. 제안된 새 설계

### 3.1 핵심 설계 원칙

1. **블록 기반 UI**: Airtable/n8n 스타일의 시각적 블록
2. **WHEN → IF → THEN/ELSE 패턴**: 조건 분기 네이티브 지원
3. **색상 코딩**: 블록 타입별 일관된 컬러
4. **실시간 미리보기**: 설정에 따른 코드 자동 생성
5. **컴포넌트 컨텍스트**: 선택된 컴포넌트 타입에 맞는 이벤트 추천

### 3.1.1 현행 코드 이슈 대응

| 이슈 | 해결 방안 | Phase |
|------|----------|-------|
| `useActions` 리셋 버그 | 핸들러 전환 시 상태 재초기화, 훅 API로만 수정 | 0 |
| `showAddAction` 잔존 | 핸들러 변경 시 Add Action 패널 자동 닫기 | 0 |
| 훅 API 강제 원칙 | 로컬 배열 직접 수정 금지, 훅 API 통해서만 처리 | 0 |
| 타입 불일치 | snake_case/camelCase 정규화 중앙화 | 0 |
| 성능 (메모이즈) | JSON stringify 제거 → ID 기반/deep-compare 적용 | 0 |

### 3.1.2 벤치마크 비교 요약

| 타사 | 강점 | 약점 | XStudio 차별화 |
|------|------|------|----------------|
| **Webflow** | 타임라인 애니메이션 | 조건/데이터 액션 약함 | 데이터 액션 + 분기 집중 |
| **Framer** | 코드/변수 빠른 프로토타이핑 | 복잡 조건·캐시 수동 JS | 블록 UI·프리셋·캐시 플래그 |
| **Bubble** | 이벤트→조건→액션 순차 | 복잡해지면 스파게티화 | 색상코딩 + 검색/프리셋 |
| **Retool** | 쿼리/코드 강력 | 비개발자 접근성 낮음 | 자동완성·스키마 검증·프리셋 |
| **Figma** | 연결선 직관성 | 조건/데이터 없음 | 연결선/미니맵만 경량 참고 |

### 3.1.3 단순성 유지 요소

> **원칙**: 과도한 복잡도 지양 - 각 기능에 이유를 명시하여 scope creep 방지

| 요소 | 설명 | 복잡도 관리 | Phase |
|------|------|------------|-------|
| 조건 그룹 단일 실행 | IF 그룹 위→아래 첫 매칭만 실행 | 중첩 로직 없음 | 2 |
| 액션/조건 검색·즐겨찾기 | 필터 + 즐겨찾기로 목록 정리 | 새 뷰 추가 없음 | 2, 3 |
| 타이밍 최소 컨트롤 | 지연(ms) + 직렬/병렬 토글만 | 타임라인 에디터 없음 | 3 |
| 캐시 정책 토글 | TTL + forceReload만 | 고급 설정 숨김 | 3 |
| 경량 미니맵 | 블록 연결선만 표시 | 편집 기능 배제 | 5 |
| 실행 히스토리 스냅샷 | 입력/출력 + 재시도만 | UI 단순 유지 | 5 |
| 접근성/키보드 | 포커스 이동·단축키만 | UI 복잡도 증가 없음 | 1 |

### 3.2 새로운 UI 구조

```
┌─────────────────────────────────────────────────────────┐
│ ⚡ Events                                    [?] [⋮]   │
├─────────────────────────────────────────────────────────┤
│ 📦 Selected: [Button] #submit-btn              🔘 ON   │
├─────────────────────────────────────────────────────────┤
│ 📑 Visual Builder │ 💻 Code │ 📜 History              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚡ WHEN ─────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🖱️ onClick ▼ │ on this element     │ ⚙️ Options │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  🔍 IF (optional) ─────────────────────── [+ Add]      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🏷️ #email-input │ .value │ is not empty │      ≡ │  │
│  │            ────── AND ──────                      │  │
│  │ 🏷️ #password   │ .value.length │ >= │ 6 │      ≡ │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│            ┌─────────────┴─────────────┐               │
│            ▼                           ▼               │
│  ✅ THEN ────────────    ❌ ELSE ─────────────         │
│  ┌─────────────────┐    ┌─────────────────────┐        │
│  │ 1. 📡 API Call  │    │ 1. 🔔 Show Toast    │        │
│  │    POST /login  │    │    "입력값 확인"      │        │
│  ├─────────────────┤    ├─────────────────────┤        │
│  │ 2. 🔀 Navigate  │    │    [+ Add Action]   │        │
│  │    → /home      │    └─────────────────────┘        │
│  ├─────────────────┤                                   │
│  │ [+ Add Action]  │                                   │
│  └─────────────────┘                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ▸ Code Preview                            [▶ Test]    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ // Auto-generated JavaScript                     │  │
│  │ onClick: async (e) => {                          │  │
│  │   if (emailInput.value && password.length >= 6) {│  │
│  │     await api.post('/login', {...});             │  │
│  │     navigate('/home');                           │  │
│  │   } else {                                       │  │
│  │     toast.show('입력값을 확인하세요');             │  │
│  │   }                                              │  │
│  │ }                                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.3 컬러 시스템

| 블록 타입 | 색상 | CSS Variable | Hex |
|----------|------|--------------|-----|
| WHEN (Trigger) | Blue | `--event-trigger` | `#3B82F6` |
| IF (Condition) | Yellow/Amber | `--event-condition` | `#F59E0B` |
| THEN (Success) | Green | `--event-success` | `#10B981` |
| ELSE (Fallback) | Red | `--event-fallback` | `#EF4444` |
| Action | Gray | `--event-action` | `#6B7280` |

### 3.4 컴포넌트별 이벤트 컨텍스트

```typescript
// Collection 컴포넌트 (ListBox, GridList, Select 등)
┌─────────────────────────────────────────────┐
│ ☑️ Category List          [ListBox]         │
│    #category-list                           │
├─────────────────────────────────────────────┤
│ 📥 onLoad │ ✅ onSelectionChange │ 🔄 ...   │
├─────────────────────────────────────────────┤
│                                             │
│ ⚡ WHEN: onLoad (컴포넌트 마운트 시)          │
│      │                                      │
│      ▼                                      │
│ 📡 FETCH DATA                               │
│   ┌─────────────────────────────────────┐   │
│   │ GET /api/categories                 │   │
│   │ Headers: Authorization: {{token}}   │   │
│   └─────────────────────────────────────┘   │
│   ┌─────────────────────────────────────┐   │
│   │ 🔄 Response Mapping                 │   │
│   │  response.data  → items             │   │
│   │  item.id        → value             │   │
│   │  item.name      → label             │   │
│   └─────────────────────────────────────┘   │
│   ┌─────────────────────────────────────┐   │
│   │ ⏳ Loading State: Skeleton          │   │
│   │ ⚠️ Error State: Toast "로드 실패"    │   │
│   └─────────────────────────────────────┘   │
│                                             │
│ 👁️ PREVIEW (실시간 데이터 미리보기)          │
│   ☑ 전자제품                                │
│   ☐ 의류/패션                               │
│   ☑ 식품/음료                               │
│                                             │
└─────────────────────────────────────────────┘
```

### 3.5 복합 컴포넌트 이벤트 (ComboBox 예시)

```typescript
┌─────────────────────────────────────────────┐
│ 🔽 Product Search        [ComboBox]         │
│    #product-combo                           │
├─────────────────────────────────────────────┤
│ 📝 Input (2) │ 🔘 Button (1) │ 📋 Popup (3) │  ← 서브컴포넌트 탭
├─────────────────────────────────────────────┤
│ ┌─────────────────────┬───────┐             │
│ │   텍스트 입력 필드    │  ▼   │  ← 구조 다이어그램
│ │    (Input Field)    │(Btn) │             │
│ └─────────────────────┴───────┘             │
│        └── 📋 Popup ────────┘               │
├─────────────────────────────────────────────┤
│ ✏️ onChange │ 🎯 onFocus │ 💨 onBlur │ ...  │
├─────────────────────────────────────────────┤
│                                             │
│ ⚡ WHEN: onChange                            │
│   └─ ⏱️ Debounce: 300ms                     │
│      │                                      │
│      ▼                                      │
│ 🔍 IF: input.value.length >= 2              │
│      │                                      │
│      ├─────── ✅ THEN ──────────────────    │
│      │  1. 📋 Open Popup                    │
│      │  2. 📡 GET /api/products/search      │
│      │       ?keyword={{input.value}}       │
│      │  3. 🔗 Bind response → popup.items   │
│      │                                      │
│      └─────── ❌ ELSE ──────────────────    │
│         1. 📋 Close Popup                   │
│                                             │
├─────────────────────────────────────────────┤
│ 📋 Popup Events (클릭하여 편집)              │
│  ├─ onItemSelect → Set Input & Close        │
│  ├─ onClose → Focus Input                   │
│  └─ onScrollEnd → Load More (disabled)      │
└─────────────────────────────────────────────┘
```

---

## 3.2 React Aria Components 이벤트 최적화

> **참조**: [React Aria Interactions](https://react-spectrum.adobe.com/react-aria/interactions.html)
>
> React Aria Components는 기본 DOM 이벤트보다 더 최적화된 이벤트 시스템을 제공합니다.
> Events Panel은 이를 활용하여 접근성과 크로스 플랫폼 호환성을 향상시킵니다.

### 3.2.1 React Aria 이벤트 훅 목록

| 훅 | 이벤트 핸들러 | 용도 |
|---|---|---|
| **[usePress](https://react-spectrum.adobe.com/react-aria/usePress.html)** | `onPress`, `onPressStart`, `onPressEnd`, `onPressChange` | 통합 클릭/터치/키보드 |
| **[useHover](https://react-spectrum.adobe.com/react-aria/useHover.html)** | `onHoverStart`, `onHoverEnd`, `onHoverChange` | 안전한 호버 감지 |
| **[useLongPress](https://react-spectrum.adobe.com/react-aria/useLongPress.html)** | `onLongPress`, `onLongPressStart`, `onLongPressEnd` | 길게 누르기 (500ms) |
| **[useFocus](https://react-spectrum.adobe.com/react-aria/useFocus.html)** | `onFocus`, `onBlur`, `onFocusChange` | 포커스 추적 |
| **[useFocusWithin](https://react-spectrum.adobe.com/react-aria/useFocusWithin.html)** | `onFocusWithin`, `onBlurWithin`, `onFocusWithinChange` | 컨테이너 포커스 |
| **[useKeyboard](https://react-spectrum.adobe.com/react-aria/useKeyboard.html)** | `onKeyDown`, `onKeyUp` | 키보드 이벤트 |
| **[useMove](https://react-spectrum.adobe.com/react-aria/useMove.html)** | `onMoveStart`, `onMove`, `onMoveEnd` | 드래그/이동 |

### 3.2.2 이벤트 타입 마이그레이션

기존 DOM 이벤트를 React Aria 이벤트로 교체하여 최적화:

| 기존 이벤트 | React Aria 대체 | 개선점 |
|------------|----------------|--------|
| `onClick` | **`onPress`** | ✅ mouse/touch/keyboard/screen reader 통합 |
| `onMouseEnter` | **`onHoverStart`** | ✅ 터치 기기에서 안전하게 무시 |
| `onMouseLeave` | **`onHoverEnd`** | ✅ pointerType으로 입력 장치 구분 |
| *(신규)* | **`onLongPress`** | 🆕 모바일 컨텍스트 메뉴, 삭제 확인 |
| *(신규)* | **`onMove`** | 🆕 슬라이더, 리사이즈, 드래그 |
| *(신규)* | **`onFocusWithin`** | 🆕 폼 그룹 포커스 추적 |

### 3.2.3 PressEvent 속성 (조건 체크에 활용)

```typescript
interface PressEvent {
  type: 'pressstart' | 'pressend' | 'pressup' | 'press';

  // 🎯 입력 장치 구분 - 조건 분기에 활용
  pointerType: 'mouse' | 'pen' | 'touch' | 'keyboard' | 'virtual';

  // 🎯 수정키 - 단축키 조합에 활용
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;

  // 🎯 위치 - 영역별 분기에 활용
  x: number;  // target 기준 상대 좌표
  y: number;

  target: Element;
  continuePropagation(): void;
}
```

### 3.2.4 조건 표현식 예시

```typescript
// IF 블록에서 사용 가능한 조건들

// 입력 장치별 분기
"event.pointerType === 'touch'"        // 터치 전용 동작
"event.pointerType === 'keyboard'"     // 키보드 접근성 전용

// 수정키 조합
"event.shiftKey === true"              // Shift+클릭: 범위 선택
"event.metaKey === true"               // Cmd+클릭: 다중 선택
"event.ctrlKey && event.shiftKey"      // Ctrl+Shift: 특수 동작

// 위치 기반 분기
"event.x < 50"                         // 왼쪽 영역 클릭
"event.y > target.height - 20"         // 하단 영역 클릭
```

### 3.2.5 업데이트된 이벤트 레지스트리

```typescript
// src/types/events/events.registry.ts 업데이트 필요

export const IMPLEMENTED_EVENT_TYPES = [
  // === React Aria Press Events (권장) ===
  "onPress",              // onClick 대체 (mouse/touch/keyboard 통합)
  "onPressStart",         // 누르기 시작
  "onPressEnd",           // 누르기 종료

  // === React Aria Hover Events ===
  "onHoverStart",         // onMouseEnter 대체
  "onHoverEnd",           // onMouseLeave 대체

  // === React Aria Long Press ===
  "onLongPress",          // 🆕 길게 누르기 (500ms)

  // === React Aria Move Events ===
  "onMoveStart",          // 🆕 이동 시작
  "onMove",               // 🆕 이동 중 (deltaX, deltaY)
  "onMoveEnd",            // 🆕 이동 종료

  // === Focus Events (유지) ===
  "onFocus",
  "onBlur",
  "onFocusWithin",        // 🆕 컨테이너 포커스

  // === Form Events (유지) ===
  "onChange",
  "onSubmit",

  // === Keyboard Events (유지) ===
  "onKeyDown",
  "onKeyUp",

  // === Legacy (하위 호환, deprecated) ===
  "onClick",              // ⚠️ onPress 사용 권장
  "onMouseEnter",         // ⚠️ onHoverStart 사용 권장
  "onMouseLeave",         // ⚠️ onHoverEnd 사용 권장
] as const;
```

### 3.2.6 MoveEvent 활용 (드래그 인터랙션)

```typescript
interface MoveEvent {
  type: 'movestart' | 'move' | 'moveend';
  pointerType: 'mouse' | 'pen' | 'touch' | 'keyboard' | 'virtual';

  // 🎯 이동량 - 슬라이더, 리사이즈에 활용
  deltaX: number;  // X축 이동량
  deltaY: number;  // Y축 이동량

  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

// 활용 예시: 슬라이더 값 조정
// WHEN: onMove
// THEN: updateState({ volume: state.volume + event.deltaX })
```

### 3.2.7 구현 로드맵 반영

| Phase | 이벤트 타입 추가 |
|-------|-----------------|
| **Phase 1** | `onPress`, `onHoverStart`, `onHoverEnd` (기본) |
| **Phase 2** | `onLongPress`, `onFocusWithin` (조건 시스템과 연계) |
| **Phase 3** | `onMoveStart`, `onMove`, `onMoveEnd` (드래그 액션) |

---

## 4. 데이터 모델 재설계

### 4.1 새로운 EventHandler 타입

```typescript
/**
 * 이벤트 핸들러 구조 (새 설계)
 */
interface EventHandler {
  id: string;

  // WHEN 블록
  trigger: {
    event: EventType;
    target: 'self' | string;  // 'self' = 현재 요소, string = 다른 요소 ID
    options?: {
      capture?: boolean;
      passive?: boolean;
      once?: boolean;
    };
  };

  // IF 블록 (선택적)
  conditions?: ConditionGroup;

  // THEN 블록 (조건 만족 시)
  thenActions: EventAction[];

  // ELSE 블록 (조건 불만족 시, 선택적)
  elseActions?: EventAction[];

  // 메타데이터
  enabled: boolean;
  description?: string;

  // 타이밍 제어
  debounce?: number;
  throttle?: number;
}

/**
 * 조건 그룹 (AND/OR 연산)
 */
interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

interface Condition {
  id: string;

  // 조건 좌변 (참조)
  left: {
    type: 'element' | 'state' | 'event' | 'literal';
    reference: string;  // "#email-input.value", "state.user.id", "event.target.value"
  };

  // 연산자
  operator:
    | 'equals' | 'not_equals'
    | 'contains' | 'not_contains'
    | 'starts_with' | 'ends_with'
    | 'greater_than' | 'less_than'
    | 'greater_or_equal' | 'less_or_equal'
    | 'is_empty' | 'is_not_empty'
    | 'is_true' | 'is_false'
    | 'matches_regex';

  // 조건 우변 (값)
  right?: {
    type: 'element' | 'state' | 'event' | 'literal';
    value: unknown;
  };
}

/**
 * 이벤트 액션
 */
interface EventAction {
  id: string;
  type: ActionType;

  // 액션 설정 (타입별로 다름)
  config: ActionConfig;

  // 변수 바인딩 지원
  bindings?: Record<string, VariableBinding>;

  // 실행 제어
  delay?: number;
  condition?: string;  // 인라인 조건 (추가 필터링)
  enabled?: boolean;

  // 에러 핸들링
  onError?: 'continue' | 'stop' | EventAction[];

  // 액션 설명
  label?: string;
  description?: string;
}

/**
 * 변수 바인딩
 */
interface VariableBinding {
  type: 'state' | 'element' | 'event' | 'api_response' | 'literal';
  path: string;
  transform?: string;  // JavaScript 변환 표현식
}
```

---

## 5. 컴포넌트 설계

### 5.1 DOM 구조 및 클래스 네이밍 패턴

> **⚠️ 중요**: EventsPanel의 DOM 구조와 클래스 네이밍은 다른 패널들의 표준 구조를 **반드시** 따라야 합니다.
> 참조: `src/builder/panels/common/index.css` (Panel System 섹션)

#### 5.1.1 표준 패널 DOM 구조

```html
<!-- 모든 패널이 따르는 공통 구조 -->
<div class="panel">
  <div class="panel-header">
    <span class="panel-title">Events</span>
    <div class="panel-actions">
      <!-- 헤더 액션 버튼들 -->
    </div>
  </div>

  <div class="panel-contents">
    <!-- 섹션 반복 -->
    <div class="section" data-section-id="handlers">
      <div class="section-header">
        <span class="section-title">Event Handlers</span>
        <div class="section-actions">
          <!-- 섹션 액션 버튼들 -->
        </div>
      </div>

      <div class="section-content">
        <div class="list-group">
          <div class="list-item"><!-- 핸들러 아이템 --></div>
          <div class="list-item"><!-- 핸들러 아이템 --></div>
        </div>
      </div>

      <div class="section-footer">
        <!-- 선택적 푸터 -->
      </div>
    </div>

    <div class="section" data-section-id="actions">
      <!-- 다른 섹션... -->
    </div>
  </div>
</div>
```

#### 5.1.2 클래스 네이밍 규칙

| 레벨 | 클래스명 | 설명 |
|------|----------|------|
| **패널** | `.panel` | 패널 최상위 컨테이너 |
| | `.panel-header` | 패널 헤더 영역 |
| | `.panel-title` | 패널 제목 |
| | `.panel-actions` | 패널 헤더 액션 버튼 그룹 |
| | `.panel-contents` | 패널 콘텐츠 영역 (복수형 주의) |
| **섹션** | `.section` | 섹션 컨테이너 |
| | `.section-header` | 섹션 헤더 |
| | `.section-title` | 섹션 제목 |
| | `.section-actions` | 섹션 액션 버튼 그룹 |
| | `.section-content` | 섹션 콘텐츠 영역 |
| | `.section-footer` | 섹션 푸터 (선택적) |
| **리스트** | `.list-group` | 리스트 그룹 컨테이너 |
| | `.list-item` | 개별 리스트 아이템 |

#### 5.1.3 EventsPanel 적용 예시

```html
<div class="events-panel panel">
  <div class="panel-header">
    <span class="panel-title">
      <SquareMousePointer /> Events
    </span>
    <div class="panel-actions">
      <EventTypePicker />
    </div>
  </div>

  <div class="panel-contents">
    <!-- 핸들러 목록 섹션 -->
    <div class="section" data-section-id="handlers-list">
      <div class="section-header">
        <span class="section-title">Event Handlers</span>
      </div>
      <div class="section-content">
        <div class="list-group handlers-list">
          <button class="list-item handler-item">
            <Zap /> onClick
            <span class="handler-action-count">2 actions</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 선택된 핸들러 상세 섹션 -->
    <div class="section" data-section-id="handler-detail">
      <div class="section-header">
        <Button class="back-button"><ChevronLeft /></Button>
        <span class="section-title">onClick</span>
        <div class="section-actions">
          <Button><Trash /></Button>
        </div>
      </div>

      <div class="section-content">
        <!-- WHEN/IF/THEN 블록들 -->
        <div class="event-block when-block">...</div>
        <div class="event-block if-block">...</div>
        <div class="event-block then-block">...</div>
      </div>
    </div>
  </div>
</div>
```

#### 5.1.4 블록 UI 전용 클래스

블록 UI는 `.section-content` 내부에서 사용되며, 별도의 네임스페이스를 갖습니다:

| 클래스명 | 설명 |
|----------|------|
| `.event-block` | 모든 블록의 기본 클래스 |
| `.when-block` | WHEN 트리거 블록 (파란색) |
| `.if-block` | IF 조건 블록 (노란색) |
| `.then-block` | THEN 성공 블록 (초록색) |
| `.else-block` | ELSE 실패 블록 (빨간색) |
| `.block-header` | 블록 헤더 영역 |
| `.block-content` | 블록 콘텐츠 영역 |
| `.block-connector` | 블록 간 연결선 |

---

### 5.2 컴포넌트 구조

```
src/builder/panels/events/
├── EventsPanel.tsx              # 메인 패널
├── EventsPanel.css              # 스타일 (CSS Variables)
│
├── blocks/                      # 블록 UI 컴포넌트
│   ├── WhenBlock.tsx            # WHEN 트리거 블록
│   ├── IfBlock.tsx              # IF 조건 블록
│   ├── ThenElseBlock.tsx        # THEN/ELSE 분기 블록
│   ├── ActionBlock.tsx          # 개별 액션 블록
│   └── BlockConnector.tsx       # 블록 간 연결선
│
├── editors/                     # 블록 내부 에디터
│   ├── TriggerEditor.tsx        # 트리거 이벤트 선택
│   ├── ConditionEditor.tsx      # 조건 편집기
│   ├── ConditionRow.tsx         # 단일 조건 행
│   └── ActionConfigEditor.tsx   # 액션 설정 편집
│
├── pickers/                     # 선택기 컴포넌트
│   ├── EventTypePicker.tsx      # 이벤트 타입 선택
│   ├── ActionTypePicker.tsx     # 액션 타입 선택
│   ├── ElementPicker.tsx        # 요소 참조 선택
│   ├── StatePicker.tsx          # 상태 변수 선택
│   └── OperatorPicker.tsx       # 조건 연산자 선택
│
├── preview/                     # 미리보기
│   ├── CodePreview.tsx          # 코드 미리보기
│   ├── DataPreview.tsx          # 데이터 미리보기 (Collection용)
│   └── ExecutionPreview.tsx     # 실행 시뮬레이션
│
├── templates/                   # 템플릿 시스템
│   ├── QuickPresets.tsx         # 빠른 프리셋 (Click, Change 등)
│   ├── TemplateGallery.tsx      # 템플릿 갤러리
│   └── TemplateCard.tsx         # 템플릿 카드
│
├── state/                       # 상태 관리
│   ├── useEventHandlers.ts      # 핸들러 관리 훅
│   ├── useConditions.ts         # 조건 관리 훅
│   └── useBlockDrag.ts          # 블록 드래그 훅
│
└── types/
    └── eventTypes.ts            # 타입 정의
```

### 5.3 WhenBlock 컴포넌트

```tsx
// src/builder/panels/events/blocks/WhenBlock.tsx

interface WhenBlockProps {
  trigger: EventHandler['trigger'];
  onChange: (trigger: EventHandler['trigger']) => void;
  availableEvents: EventType[];
}

export function WhenBlock({ trigger, onChange, availableEvents }: WhenBlockProps) {
  return (
    <div className="event-block when-block">
      <div className="block-header">
        <Zap className="block-icon" size={16} />
        <span className="block-label">WHEN</span>
      </div>

      <div className="block-content">
        <div className="trigger-row">
          <EventTypePicker
            value={trigger.event}
            onChange={(event) => onChange({ ...trigger, event })}
            options={availableEvents}
          />

          <span className="trigger-target">on this element</span>

          <Button
            className="options-button"
            aria-label="Trigger options"
          >
            <Settings size={14} />
          </Button>
        </div>
      </div>

      <BlockConnector direction="down" />
    </div>
  );
}
```

### 5.3 IfBlock 컴포넌트

```tsx
// src/builder/panels/events/blocks/IfBlock.tsx

interface IfBlockProps {
  conditions?: ConditionGroup;
  onChange: (conditions?: ConditionGroup) => void;
  onRemove: () => void;
}

export function IfBlock({ conditions, onChange, onRemove }: IfBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!conditions) {
    return (
      <Button
        className="add-condition-button"
        onPress={() => onChange({ operator: 'AND', conditions: [] })}
      >
        <Plus size={14} />
        Add Condition (optional)
      </Button>
    );
  }

  return (
    <div className="event-block if-block">
      <div className="block-header">
        <Search className="block-icon" size={16} />
        <span className="block-label">IF</span>
        <span className="block-sublabel">(optional)</span>

        <div className="block-actions">
          <Button onPress={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </Button>
          <Button onPress={onRemove}>
            <Trash size={14} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="block-content">
          {conditions.conditions.map((condition, index) => (
            <Fragment key={condition.id}>
              {index > 0 && (
                <OperatorToggle
                  value={conditions.operator}
                  onChange={(op) => onChange({ ...conditions, operator: op })}
                />
              )}
              <ConditionRow
                condition={condition}
                onChange={(updated) => updateConditionAt(index, updated)}
                onRemove={() => removeConditionAt(index)}
              />
            </Fragment>
          ))}

          <Button
            className="add-row-button"
            onPress={addCondition}
          >
            <Plus size={14} />
            Add Condition
          </Button>
        </div>
      )}

      <BlockConnector direction="down" split />
    </div>
  );
}
```

### 5.4 ThenElseBlock 컴포넌트

```tsx
// src/builder/panels/events/blocks/ThenElseBlock.tsx

interface ThenElseBlockProps {
  thenActions: EventAction[];
  elseActions?: EventAction[];
  hasCondition: boolean;
  onThenChange: (actions: EventAction[]) => void;
  onElseChange: (actions?: EventAction[]) => void;
}

export function ThenElseBlock({
  thenActions,
  elseActions,
  hasCondition,
  onThenChange,
  onElseChange,
}: ThenElseBlockProps) {
  const [showElse, setShowElse] = useState(!!elseActions);

  return (
    <div className="then-else-container">
      {/* THEN 브랜치 */}
      <div className="event-block then-block">
        <div className="block-header">
          <Check className="block-icon" size={16} />
          <span className="block-label">THEN</span>
        </div>

        <div className="block-content">
          <ActionList
            actions={thenActions}
            onChange={onThenChange}
          />
        </div>
      </div>

      {/* ELSE 브랜치 (조건이 있을 때만) */}
      {hasCondition && (
        <>
          {!showElse ? (
            <Button
              className="add-else-button"
              onPress={() => {
                setShowElse(true);
                onElseChange([]);
              }}
            >
              <Plus size={14} />
              Add ELSE branch
            </Button>
          ) : (
            <div className="event-block else-block">
              <div className="block-header">
                <X className="block-icon" size={16} />
                <span className="block-label">ELSE</span>
                <Button
                  className="remove-else"
                  onPress={() => {
                    setShowElse(false);
                    onElseChange(undefined);
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>

              <div className="block-content">
                <ActionList
                  actions={elseActions || []}
                  onChange={onElseChange}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## 6. CSS 설계

### 6.1 색상 토큰

```css
/* src/builder/panels/events/styles/tokens.css */

:root {
  /* Block Colors */
  --event-trigger-bg: #EFF6FF;
  --event-trigger-border: #3B82F6;
  --event-trigger-icon: #2563EB;

  --event-condition-bg: #FFFBEB;
  --event-condition-border: #F59E0B;
  --event-condition-icon: #D97706;

  --event-success-bg: #ECFDF5;
  --event-success-border: #10B981;
  --event-success-icon: #059669;

  --event-fallback-bg: #FEF2F2;
  --event-fallback-border: #EF4444;
  --event-fallback-icon: #DC2626;

  --event-action-bg: #F9FAFB;
  --event-action-border: #D1D5DB;
  --event-action-icon: #6B7280;

  /* Connector */
  --event-connector-color: #9CA3AF;
  --event-connector-width: 2px;

  /* Block Layout */
  --event-block-radius: 8px;
  --event-block-padding: 12px;
  --event-block-gap: 8px;
}
```

### 6.2 블록 스타일

```css
/* src/builder/panels/events/styles/blocks.css */

@layer components {
  /* Base Block */
  .event-block {
    position: relative;
    background: var(--event-action-bg);
    border: 1px solid var(--event-action-border);
    border-radius: var(--event-block-radius);
    padding: var(--event-block-padding);
  }

  .event-block .block-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .event-block .block-label {
    font-weight: 600;
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .event-block .block-icon {
    flex-shrink: 0;
  }

  /* WHEN Block */
  .when-block {
    background: var(--event-trigger-bg);
    border-color: var(--event-trigger-border);
  }

  .when-block .block-icon,
  .when-block .block-label {
    color: var(--event-trigger-icon);
  }

  /* IF Block */
  .if-block {
    background: var(--event-condition-bg);
    border-color: var(--event-condition-border);
  }

  .if-block .block-icon,
  .if-block .block-label {
    color: var(--event-condition-icon);
  }

  /* THEN Block */
  .then-block {
    background: var(--event-success-bg);
    border-color: var(--event-success-border);
  }

  .then-block .block-icon,
  .then-block .block-label {
    color: var(--event-success-icon);
  }

  /* ELSE Block */
  .else-block {
    background: var(--event-fallback-bg);
    border-color: var(--event-fallback-border);
  }

  .else-block .block-icon,
  .else-block .block-label {
    color: var(--event-fallback-icon);
  }

  /* Block Connector */
  .block-connector {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .block-connector.down {
    bottom: -20px;
    height: 20px;
    width: var(--event-connector-width);
    background: var(--event-connector-color);
  }

  .block-connector.split {
    width: 100px;
    height: 20px;
    border-left: var(--event-connector-width) solid var(--event-connector-color);
    border-right: var(--event-connector-width) solid var(--event-connector-color);
    border-bottom: var(--event-connector-width) solid var(--event-connector-color);
    background: transparent;
  }

  /* Then/Else Container */
  .then-else-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 20px;
  }

  .then-else-container.single {
    grid-template-columns: 1fr;
  }
}
```

---

## 7. 구현 로드맵

> **총 6 Phase** (Phase 0 선행 + 5주)
>
> 📋 3.1.1 이슈 대응 → 📋 3.1.3 단순성 유지 요소 → 전체 반영됨
>
> ⚠️ **레거시 코드 완전 폐기** - 마이그레이션 불필요, 새 설계로 직접 구현

---

### Phase 0: 현행 버그 수정 (선행 작업)

> **3.1.1 이슈 대응** - 새 설계 전 필수 수정

- [ ] `useActions` 재초기화: 핸들러 전환 시 액션 리스트 리셋 버그 수정
- [ ] `showAddAction` 스코프 분리: 핸들러 변경 시 Add Action 패널 자동 닫기
- [ ] **훅 API 강제 원칙**: Event/Action 업데이트는 반드시 `useEventHandlers`/`useActions` 훅 API를 통해 처리 (로컬 배열 직접 수정 금지)
- [ ] 성능 개선: JSON stringify 메모이즈 제거 → ID 기반/deep-compare 헬퍼 적용
  - > ⚠️ 대형 핸들러에서 코드 프리뷰 생성 비용도 최적화 대상 (Phase 5에서 lazy 생성 고려)
- [ ] snake_case/camelCase 정규화 유틸 중앙화 (`normalizeEventTypes.ts`)

---

### Phase 1: 기반 작업 (1주)

**목표**: 타입 시스템 + 블록 기본 구조 + 접근성 + DOM 구조 표준화

- [ ] 새 타입 시스템 정의 (`eventTypes.ts`)
- [ ] 색상 토큰 및 CSS 변수 설정 (3.3 컬러 시스템)
- [ ] **DOM 구조 표준화** *(5.1)*: 다른 패널과 동일한 DOM/클래스 구조 준수
  - `.panel` > `.panel-header` > `.panel-contents` > `.section` 패턴
  - `data-section-id` 속성으로 섹션 식별
  - `.list-group` > `.list-item` 패턴 사용
- [ ] 블록 기본 컴포넌트 생성 (WhenBlock, ActionBlock)
- [ ] **접근성/키보드** *(3.1.3)*: 핵심 포커스 이동 + 단축키 (Tab, Enter, Esc)

---

### Phase 2: 조건 시스템 + 선택기 UX (1주)

**목표**: IF 블록 + 검색/필터 + 즐겨찾기

- [ ] IfBlock 컴포넌트 구현
- [ ] ConditionRow 에디터 구현
- [ ] ElementPicker, StatePicker 구현
- [ ] AND/OR 연산자 토글
- [ ] **조건 그룹 단일 실행** *(3.1.3)*: IF 그룹 위→아래 첫 매칭만 실행 (중첩 로직 없음)
- [ ] **Event/Action 타입 선택기 검색·필터**
- [ ] **즐겨찾기 기능** *(3.1.3)*: 자주 쓰는 이벤트/액션 즐겨찾기 (새 뷰 추가 없음)
- [ ] **플로우 프리셋 UI**: 버튼→API→DataTable→리프레시, 폼→validate→API→토스트

---

### Phase 3: THEN/ELSE 분기 + Dataset 액션 (1주)

**목표**: 분기 UI + Dataset 연동 + 타이밍 제어

- [ ] ThenElseBlock 컴포넌트 구현
- [ ] ActionList 컴포넌트 (드래그 정렬)
- [ ] 기존 21개 ActionEditor 통합
- [ ] BlockConnector 시각화
- [ ] **새 액션 타입 추가**:
  - [ ] `loadDataset` - DataTable 로드/리프레시
  - [ ] `syncComponent` - 컴포넌트 간 데이터 동기화
  - [ ] `apiCall.saveToDataTable` - API 응답 → DataTable 저장
- [ ] **타이밍 최소 컨트롤** *(3.1.3)*: 액션별 지연(ms) + 직렬/병렬 토글 (타임라인 에디터 없음)
- [ ] **캐시 정책 토글** *(3.1.3)*: `cache TTL` + `forceReload` + `mergeMode` (고급 설정 숨김)
- [ ] **프리셋 템플릿**: "API→DataTable 저장→브로드캐스트" 워크플로우
- [ ] **ActionTypePicker 검색·필터**: Phase 2와 동일한 UX (일관성)

---

### Phase 4: 변수 바인딩 + 안전장치 (1주)

**목표**: `{{variable}}` 지원 + 스키마 자동완성 + 검증

- [ ] `{{variable}}` 문법 파서
- [ ] VariableBinding 에디터
- [ ] **자동완성 확장**:
  - [ ] DataTable 스키마 (컬럼명, 타입)
  - [ ] API 응답 경로 (`response.data.items[0].id`)
  - [ ] 이벤트 페이로드 경로 (`event.target.value`)
- [ ] **바인딩 검증**: 없는 컬럼/경로 참조 시 인라인 경고
- [ ] 실시간 유효성 검사

---

### Phase 5: 블록 기반 UI 구현 ✅ (2025-12-08 완료)

**목표**: WHEN → IF → THEN/ELSE 블록 UI + Navigate 액션 수정

#### ✅ 완료된 작업

**블록 기반 UI 컴포넌트:**
- [x] `WhenBlock.tsx` - 이벤트 트리거 블록 (파란색)
- [x] `IfBlock.tsx` - 조건 블록 (노란색, 선택적)
- [x] `ThenElseBlock.tsx` - 액션 분기 블록 (초록/빨강)
- [x] `ActionBlock.tsx` - 개별 액션 표시
- [x] `BlockConnector.tsx` - 블록 간 연결선
- [x] `BlockActionEditor.tsx` - 액션 편집 어댑터

**EventEngine 수정:**
- [x] `getActionConfig<T>` 헬퍼 추가 - `config` 또는 `value` 필드 지원
- [x] 19개+ 액션 핸들러 업데이트
- [x] 비활성 액션 스킵 시 경고 메시지 추가
- [x] customFunction 빈 코드 처리 (에러 → 경고로 변경)

**Navigate 액션 수정:**
- [x] `enabled: false` 액션 스킵 경고 추가
- [x] EventsPanel에서 `enabled` 기본값 `true` 보장
- [x] 경로 정규화 (`/page-2` 형식 표준화)
- [x] NavigateActionEditor에서 자동 `/` 접두사 추가
- [x] BuilderCore에서 slug 비교 시 양방향 정규화

**수정된 파일:**
- `src/builder/panels/events/EventsPanel.tsx`
- `src/builder/panels/events/blocks/WhenBlock.tsx`
- `src/builder/panels/events/blocks/IfBlock.tsx`
- `src/builder/panels/events/blocks/ThenElseBlock.tsx`
- `src/builder/panels/events/blocks/ActionBlock.tsx`
- `src/builder/panels/events/blocks/BlockConnector.tsx`
- `src/builder/panels/events/editors/BlockActionEditor.tsx`
- `src/utils/events/eventEngine.ts`
- `src/builder/events/actions/NavigateActionEditor.tsx`
- `src/builder/main/BuilderCore.tsx`

#### 🔄 향후 작업

- [ ] **코드 프리뷰 패널** (lazy 생성으로 성능 최적화)
- [ ] 템플릿 시스템
- [ ] **경량 미니맵** *(3.1.3)*: 블록 간 연결선만 표시 (편집 기능 배제, 관계 파악용)
- [ ] **인라인 테스트 실행**:
  - [ ] 모의 이벤트 발생 (onClick, onChange 등)
  - [ ] 모의 데이터셋 주입
  - [ ] 단계별 실행 결과 표시
- [ ] **실행 히스토리 스냅샷** *(3.1.3)*: 각 단계 입력/출력 + 재시도 (UI 단순 유지)
- [ ] **실행 로그**: History 탭에 실행 시간/결과/에러 기록
- [ ] **디버그 모드**: 조건 평가 결과 시각화
- [ ] **문서화**: CLAUDE.md Event System 섹션 업데이트
- [ ] **레거시 코드 삭제**: `src/builder/events/index.tsx` (623줄) 완전 제거

---

### 로드맵 요약 테이블

| Phase | 핵심 목표 | 3.1.3 항목 | 참조 | 기간 |
|-------|----------|-----------|------|------|
| **0** | 현행 버그 수정 | - | 3.1.1 | 선행 |
| **1** | 타입 + 블록 + DOM 구조 | 접근성/키보드 | 5.1 | 1주 |
| **2** | 조건 시스템 + 선택기 | 단일 실행, 즐겨찾기 | - | 1주 |
| **3** | THEN/ELSE + Dataset | 타이밍, 캐시 토글 | - | 1주 |
| **4** | 변수 바인딩 | - | - | 1주 |
| **5** | 테스트/로그 + 정리 | 미니맵, 히스토리 스냅샷 | - | 1주 |

---

## 8. 참고 자료

### 8.1 경쟁사 문서

- [Webflow Interactions](https://webflow.com/feature/interactions-animations)
- [Bubble.io Workflows](https://manual.bubble.io/core-resources/workflows)
- [Retool Event Handlers](https://docs.retool.com/workflows/guides/retool-events)
- [Airtable Automations](https://support.airtable.com/docs/getting-started-with-airtable-automations)
- [IFTTT Applets](https://ifttt.com/docs/applets)
- [n8n Workflow Automation](https://n8n.io/features/)
- [Figma Prototyping](https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma)

### 8.2 관련 프로젝트 문서

- [CLAUDE.md - Event System Section](/CLAUDE.md#event-system-inspector-events-tab)
- [PANEL_SYSTEM.md](/docs/PANEL_SYSTEM.md)
- [COMPLETED_FEATURES.md](/docs/COMPLETED_FEATURES.md)

---

## 9. 결정 필요 사항

### 9.1 사용자 피드백 필요

1. **블록 vs 노드 UI**: Airtable 스타일(블록) vs n8n 스타일(노드 연결)?
2. **코드 프리뷰**: 항상 표시 vs 토글 vs 별도 탭?
3. **템플릿 범위**: 사전 정의 템플릿만 vs 사용자 정의 템플릿 저장?

### 9.2 기술적 결정

1. **상태 관리**: React Stately 유지 vs Zustand로 통합?
2. **드래그 앤 드롭**: react-beautiful-dnd vs @dnd-kit?
3. **코드 생성**: 런타임 함수 vs 정적 코드 문자열?
4. **조건 평가**: JavaScript eval vs 안전한 표현식 파서?

---

**문서 버전**: 1.5.0
**최종 수정**: 2025-12-08
**작성자**: Claude Code

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2025-12-07 | 초안 작성 - 현재 상태 분석, 경쟁사 조사, 기본 설계 |
| 1.1.0 | 2025-12-07 | 3.1.1~3.1.3 테이블 정리, 로드맵 전면 개편, 3.1.3 항목 Phase별 반영 |
| 1.2.0 | 2025-12-07 | 5.1 DOM 구조 및 클래스 네이밍 패턴 섹션 추가, Phase 1에 DOM 구조 표준화 반영 |
| 1.3.0 | 2025-12-07 | 레거시 코드 폐기 결정 반영: V2 접미사 제거, Phase 6 삭제, 마이그레이션 섹션 제거, 총 6 Phase로 단축 |
| 1.4.0 | 2025-12-07 | 3.2 React Aria Components 이벤트 최적화 섹션 추가: usePress, useHover, useLongPress, useMove 훅 활용, PressEvent/MoveEvent 조건 체크, Phase별 이벤트 추가 계획 |
| 1.5.0 | 2025-12-08 | **Phase 5 완료**: 블록 기반 UI 구현 (WhenBlock, IfBlock, ThenElseBlock, ActionBlock, BlockConnector, BlockActionEditor), EventEngine `getActionConfig<T>` 헬퍼 추가, Navigate 액션 경로 정규화 수정 |
