# XStudio AI 코딩 도우미 지침

XStudio는 React, TypeScript, Vite, Supabase를 사용하는 웹 기반 UI 빌더/디자인 스튜디오입니다. 이 문서는 AI 코딩 도우미가 이 코드베이스에서 효과적으로 작업하기 위한 핵심 정보를 제공합니다.

## 프로젝트 아키텍처

XStudio는 다음과 같은 주요 구성 요소로 이루어져 있습니다:

1. **빌더 (Builder)**: 메인 편집 환경
   - **BuilderCore**: 메인 빌더 컴포넌트 (`src/builder/main/BuilderCore.tsx`)
   - **BuilderHeader**: 상단 툴바 및 네비게이션 (`src/builder/main/BuilderHeader.tsx`)
   - **BuilderWorkspace**: 작업 영역 관리 (`src/builder/main/BuilderWorkspace.tsx`)
   - **BuilderViewport**: 레이아웃 컨테이너 (`src/builder/main/BuilderViewport.tsx`)

2. **사이드바 (Sidebar)**: 페이지와 요소 계층 구조 관리 (`src/builder/sidebar/`)
3. **인스펙터 (Inspector)**: 선택된 요소의 속성 편집 (`src/builder/inspector/`)
4. **프리뷰 (Preview)**: 실시간 변경사항을 보여주는 iframe (`src/builder/preview/`)
5. **오버레이 (Overlay)**: 선택된 요소 시각화 (`src/builder/overlay/`)

### 디렉토리 구조

```
src/
├── builder/
│   ├── main/              # 메인 빌더 컴포넌트들
│   ├── components/        # React Aria 기반 컴포넌트
│   ├── inspector/         # 속성 편집 패널
│   │   └── properties/    # 컴포넌트별 속성 에디터
│   ├── preview/           # iframe 프리뷰
│   ├── sidebar/           # 사이드바 컴포넌트
│   ├── overlay/           # 선택 오버레이
│   ├── stores/            # Zustand 상태 관리
│   ├── hooks/             # 커스텀 React hooks
│   └── utils/             # 유틸리티 함수
├── services/
│   └── api/               # API 서비스 레이어
├── types/                 # TypeScript 타입 정의
└── env/                   # 환경 설정
    └── supabase.client.ts # Supabase 클라이언트
```

### 데이터 흐름

- **Zustand**: 클라이언트 상태 관리 (`src/builder/stores/`)
- **Supabase**: 백엔드 데이터 저장소 (`src/env/supabase.client.ts`)
- **상태 처리 흐름**: 
  1. UI 액션 → 
  2. Zustand 상태 업데이트 → 
  3. Supabase API 직접 호출

```typescript
// 예시: 요소 추가 시 데이터 흐름
const handleAddElement = async (tag: string) => {
  const newElement = { 
    id: crypto.randomUUID(),
    tag,
    props: getDefaultProps(tag),
    parent_id: parentId,
    page_id: currentPageId,
    order_num: calculateNextOrderNum()
  };
  
  // Supabase 직접 호출
  const { data, error } = await supabase
    .from("elements")
    .insert([newElement])
    .select()
    .single();
    
  if (!error && data) {
    // Zustand 상태 업데이트
    addElement(data);
    
    // iframe 업데이트 (선택 사항)
    sendElementsToIframe();
  }
};
```

## 주요 파일 및 기능

- `src/builder/main/BuilderCore.tsx`: 빌더의 핵심 컴포넌트
- `src/builder/stores/`: 전역 상태 관리 (Zustand)
- `src/builder/hooks/`: 주요 로직을 담당하는 커스텀 훅들
  - `useElementCreator.ts`: 요소 생성 로직
  - `usePageManager.ts`: 페이지 관리 로직
  - `useIframeMessenger.ts`: iframe 통신 로직
  - `useOptimizedElements.ts`: 요소 최적화 관련 기능
  - `useDebounceSupabaseUpdate.ts`: Supabase 업데이트 디바운싱
- `src/builder/inspector/`: 속성 편집 패널 관련 컴포넌트
- `src/types/store.ts`: 주요 타입 정의

## 핵심 개념 및 패턴

### 1. Element 계층 구조

요소는 중첩 구조를 가지며 `parent_id`로 계층 구조를 표현합니다:

```typescript
interface Element {
  id: string;
  tag: string;
  props: ElementProps;
  parent_id: string | null;
  page_id: string;
  order_num: number;
  children?: Element[]; // 런타임 시 계층 구조 표현용
}
```

### 2. iframe 기반 프리뷰

프리뷰는 iframe으로 구현되며 `postMessage`를 통해 부모 컴포넌트와 통신합니다:

```typescript
// 부모에서 iframe으로 메시지 전송
iframe.contentWindow.postMessage(
  { type: "UPDATE_ELEMENTS", elements: updatedElements },
  window.location.origin
);

// iframe에서 메시지 수신
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  
  if (event.data.type === "UPDATE_ELEMENTS") {
    // 요소 업데이트 처리
  }
});
```

### 3. 최적화된 상태 관리

성능 향상을 위한 패턴:

```typescript
// 최적화된 상태 선택
const elements = useStore(
  state => state.elements.filter(el => el.page_id === pageId),
  shallow // 얕은 비교로 불필요한 리렌더링 방지
);

// 디바운스된 Supabase 업데이트
const optimizedUpdateElement = (elementId, props) => {
  // 1. 즉시 Zustand 상태 업데이트 (UI 응답성)
  updateElementProps(elementId, props);
  
  // 2. 디바운스된 Supabase 업데이트 (성능 최적화)
  debouncedSupabaseUpdate(elementId, props);
};
```

### 4. 히스토리 관리 (Undo/Redo)

페이지별 변경 히스토리 관리:

```typescript
const { undo, redo, canUndo, canRedo } = useStore(state => ({
  undo: state.undo,
  redo: state.redo,
  canUndo: state.canUndo,
  canRedo: state.canRedo
}), shallow);

// 히스토리 사용
<button onClick={undo} disabled={!canUndo}>Undo</button>
<button onClick={redo} disabled={!canRedo}>Redo</button>
```

## 최적화 권장사항

1. **메모이제이션 활용**: 복잡한 계산이나 파생 데이터는 `useMemo`와 `useCallback` 사용
2. **디바운싱 적용**: Supabase 호출과 iframe 통신에 디바운싱 적용
3. **선택적 렌더링**: 컴포넌트가 실제로 필요한 상태만 구독하도록 구현
4. **가상화 사용**: 많은 요소를 표시할 때는 가상화 라이브러리 고려

## 컴포넌트 개발 가이드라인

1. **새 컴포넌트 추가 시**:
   - React Aria 컴포넌트 생성: `src/builder/components/`
   - 속성 에디터 생성: `src/builder/inspector/properties/editors/`
   - 기본값 추가: `getDefaultProps`
   - 프리뷰 렌더링 로직 추가

2. **상태 관리**:
   - 전역 상태는 Zustand 사용
   - 지역 상태는 React 훅 사용
   - 복잡한 로직은 커스텀 훅으로 분리

3. **성능 최적화**:
   - 불필요한 리렌더링 방지 (shallow 비교, memo)
   - API 호출 최적화 (디바운싱, 배치 처리)
   - 무거운 계산 메모이제이션

## 디버깅 및 개발 도구

- **개발 로그**: 개발 모드에서 유용한 디버깅 정보 출력
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log(`🧩 Element created: ${newElement.id} (${newElement.tag})`);
  }
  ```

- **성능 모니터링**: 성능 측정을 위한 유틸리티
  ```typescript
  // src/builder/utils/performanceMonitor.ts 사용
  PerformanceMonitor.startMeasure('elementUpdate');
  // 작업 수행...
  PerformanceMonitor.endMeasure('elementUpdate'); // 콘솔에 시간 출력
  ```

## 알려진 주의사항

1. **BuilderCore.tsx 복잡성**: 큰 컴포넌트는 기능별로 분리된 커스텀 훅 사용 권장
2. **Supabase 동기화**: 상태와 데이터베이스 간 일관성 유지에 주의
3. **iframe 메시지 처리**: 보안 및 성능을 위해 메시지 검증 필수
4. **타입 안전성**: `any` 타입 사용 지양, 구체적인 타입 정의 권장

## 테스트 전략

현재 테스트 인프라는 개발 중입니다. 향후 다음 테스트 계층을 구현할 예정:

1. **단위 테스트**: 개별 유틸리티 및 훅 테스트
2. **통합 테스트**: 컴포넌트 간 상호 작용 테스트
3. **E2E 테스트**: 전체 사용자 흐름 테스트

## 개발 워크플로우

1. **개발 서버**: `npm run dev`로 Vite 개발 서버 시작
2. **컴포넌트 문서**: `npm run storybook`으로 Storybook 실행
3. **빌드**: `npm run build`로 프로덕션 빌드 생성
