# XStudio AI Agent Instructions

## 프로젝트 개요

XStudio는 웹 기반 시각적 에디터로 인터랙티브한 인터페이스를 구축하기 위한 도구입니다. 이 프로젝트는 컴포넌트 기반 아키텍처를 사용하며, 빌더 인터페이스와 컴포넌트를 실시간으로 렌더링하는 프리뷰 iframe으로 분리되어 있습니다.

## 아키텍처

### 핵심 컴포넌트

- **Builder**: 사용자가 레이아웃을 디자인하고 컴포넌트 속성을 수정하는 주요 편집 인터페이스
- **Preview**: 컴포넌트를 실시간으로 렌더링하는 샌드박스 환경 (iframe 내부에서 실행)
- **Stores**: 요소, 히스토리, 프로젝트를 위한 Zustand 기반 상태 관리

### 주요 데이터 흐름

1. 빌더에서 사용자 편집 → 요소 스토어 업데이트 → iframe에 메시지 전송
2. iframe이 업데이트 수신 → 컴포넌트 렌더링 → 준비 상태 전송
3. 요소 변경 → 히스토리 항목 생성 → undo/redo 기능 활성화

## 상태 관리

XStudio는 다음과 같은 주요 스토어로 Zustand를 사용합니다:

- `elements.ts`: 컴포넌트 요소와 속성, 계층 구조 및 페이지 할당 관리
- `history.ts`: 페이지별 히스토리 추적을 통한 undo/redo 기능 제공
- `commandDataStore.ts`: 메모리 최적화된 명령어 및 요소 데이터 저장소

`elements.ts` 스토어는 향상된 히스토리 관리 기능을 갖추고 있습니다:
```typescript
export interface ElementsState {
  elements: Element[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  currentPageId: string | null;
  pageHistories: { [pageId: string]: { history: Element[][]; historyIndex: number } };
  historyTrackingPaused: boolean;
  historyOperationInProgress: boolean; // 히스토리 작업 중 재귀적 호출 방지 플래그
}
```

## 주요 패턴

### 히스토리 관리 시스템

XStudio는 최근 개선된 안정성을 갖춘 이중 히스토리 시스템을 유지합니다:

1. `historyManager` in `history.ts`: undo/redo 작업을 위한 추상화된 API 제공
2. `pageHistories` in `elements.ts`: 페이지 ID별로 실제 요소 스냅샷 저장

```typescript
// 히스토리 매니저 사용하기 (권장 방법)
import { historyManager } from '../stores/history';
historyManager.addEntry({
  type: 'update',
  elementId: element.id,
  data: { prevProps, newProps }
});
```

#### 히스토리 시스템 구현 세부사항

**주요 히스토리 상태 변수**:
- `historyOperationInProgress`: 히스토리 작업 중 재귀 호출 방지 플래그
- `historyTrackingPaused`: 대량 작업 중 히스토리 추적 일시 중단 플래그
- `pageHistories`: 페이지 ID로 색인된 페이지별 히스토리 스냅샷

**히스토리 작업 흐름**:
1. 요소 변경이 히스토리 스냅샷 생성 유발
2. undo/redo 중에는 `historyOperationInProgress` 플래그가 새 히스토리 항목 생성 방지
3. 안전한 요소 복제로 프록시 객체 오류 방지

```typescript
// 안전한 히스토리 작업 패턴
export const undo = async () => {
  try {
    const state = get();
    const { currentPageId } = state;
    if (!currentPageId) return;

    // 재귀적 히스토리 생성 방지 플래그 설정
    set({ historyOperationInProgress: true });
    
    // 히스토리 작업 로직...
    
    // 히스토리용 안전한 요소 복제
    const safeElements = elements.map(el => ({
      ...el,
      props: JSON.parse(JSON.stringify(el.props || {}))
    }));
    
  } catch (error) {
    console.error("Undo operation error:", error);
  } finally {
    // 작업이 완료되면 항상 플래그 재설정
    set({ historyOperationInProgress: false });
  }
};
```

**히스토리 이슈의 근본 원인**:
시스템에는 충돌을 일으키는 두 개의 병렬 히스토리 추적 구현이 있었습니다:
1. `history.ts`의 `historyManager` - 작업을 추상적으로 추적 (add/update/remove)
2. `elements.ts`의 `pageHistories` - 전체 요소 스냅샷 저장

이 시스템 간의 충돌로 인해 다음과 같은 문제가 발생했습니다:
- historyIndex가 한 시스템에서는 업데이트되었지만 다른 시스템에서는 업데이트되지 않아 발생하는 불일치 상태
- 스냅샷에 Immer 프록시가 포함되어 있을 때 발생하는 프록시 객체 오류
- iframe으로 복제할 수 없는 객체를 전송할 때 발생하는 DataCloneError

### 요소 Sanitization

iframe에 요소를 전송하거나 히스토리에 저장하기 전에 프록시 이슈를 방지하기 위해 항상 sanitize 처리:

```typescript
// elements.ts에서 가져옴
export const sanitizeElement = (element: Element): Element => {
  try {
    // structuredClone 우선 사용 (최신 브라우저)
    if (typeof structuredClone !== 'undefined') {
      return {
        id: element.id,
        tag: element.tag,
        props: structuredClone(element.props || {}),
        parent_id: element.parent_id,
        page_id: element.page_id,
        order_num: element.order_num
      };
    }

    // fallback: JSON 방식으로 깊은 복사
    return {
      id: element.id,
      tag: element.tag,
      props: JSON.parse(JSON.stringify(element.props || {})),
      parent_id: element.parent_id,
      page_id: element.page_id,
      order_num: element.order_num
    };
  } catch (error) {
    console.error("Element sanitization error:", error);
    // 기본값으로 대체
    return {
      id: element.id || "",
      tag: element.tag || "",
      props: {},
      parent_id: element.parent_id,
      page_id: element.page_id || "",
      order_num: element.order_num || 0
    };
  }
};
```

### IFrame 통신

빌더는 postMessage를 사용하여 iframe 렌더러와 통신합니다:

```typescript
// 요소를 iframe에 전송
window.parent.postMessage(
  {
    type: 'ELEMENTS_UPDATED',
    payload: { elements: safeElements }
  },
  '*'
);

// iframe에서 수신
handleMessage = useCallback(
  (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !data.type) return;

    if (data.type === 'UPDATE_ELEMENTS') {
      setElements(data.elements || [], { skipHistory: true });
    }
    
    // 다른 메시지 타입 처리...
  },
  [elements, setElements, updateElementProps]
);
```

## 일반적인 워크플로우

### 새 컴포넌트 타입 추가하기

1. `src/components/` 디렉토리에 컴포넌트 정의
2. 빌더와 iframe 컴포넌트 레지스트리에 모두 등록
3. ElementsPanel에 기본 속성 추가

### 디버깅 팁

- 히스토리 작업과 iframe 통신에 대한 자세한 로그를 확인하려면 브라우저 콘솔 확인
- 현재 히스토리 상태를 검사하려면 `historyManager.getInfo()` 사용
- iframe 통신 문제의 경우 요소가 올바르게 sanitize 처리되었는지 확인
- 히스토리 이슈 디버깅을 위해 플래그 확인:
  ```typescript
  console.log("History state:", {
    historyOperationInProgress: get().historyOperationInProgress,
    historyTrackingPaused: get().historyTrackingPaused,
    pageHistory: get().pageHistories[currentPageId],
    historyManager: historyManager.getInfo()
  });
  ```

### 알려진 이슈와 버그 수정

- 프록시 객체는 postMessage에서 `DataCloneError`를 일으킬 수 있음 - 항상 sanitizeElement 사용
- 히스토리 관리는 때때로 historyIndex와 elementCount 간에 불일치 표시
- 텍스트 요소 undo 작업은 적절히 sanitize 처리되지 않으면 "revoked proxy" 오류와 함께 실패할 수 있음
- 히스토리 작업을 구현할 때 UI 상태와 데이터베이스 동기화를 모두 처리해야 함

#### 최근 Undo 버그 수정

undo 시스템은 다음과 같은 여러 중요한 이슈를 해결하기 위해 최근 수정되었습니다:

1. **Revoked Proxy 오류**: 텍스트 요소 변경을 취소할 때 "Cannot perform 'get' on a proxy that has been revoked" 오류 발생
2. **DataCloneError**: undo 후 iframe으로 요소를 보낼 때 복제할 수 없는 프록시 객체로 인한 오류
3. **불일치 상태**: undo 작업 중 historyIndex와 elementCount가 동기화되지 않음

**구현된 해결책:**
```typescript
// 1. sanitizeElement 함수에서 안전한 객체 복제
export const sanitizeElement = (element: Element): Element => {
  try {
    // 프록시 객체 제거를 위한 깊은 복제
    return {
      id: element.id,
      tag: element.tag,
      props: JSON.parse(JSON.stringify(element.props || {})),
      parent_id: element.parent_id,
      page_id: element.page_id,
      order_num: element.order_num
    };
  } catch (error) {
    console.error("Element sanitization error:", error);
    // 기본 속성으로 폴백
    return { id: element.id || "", tag: element.tag || "", props: {}, /* ... */ };
  }
};

// 2. 적절한 오류 처리가 있는 undo 작업
export const undo = async () => {
  try {
    const state = get();
    const { currentPageId } = state;
    if (!currentPageId) return;

    // 재귀적 히스토리 생성 방지
    set({ historyOperationInProgress: true });

    // null 확인과 함께 안전한 히스토리 탐색
    if (!state.pageHistories?.[currentPageId]) {
      console.log("⚠️ 페이지 히스토리를 찾을 수 없음");
      return;
    }
    
    // try-catch로 안전한 요소 처리
    try {
      // 안전한 복제로 요소 처리
      const safeElements = elements.map(el => sanitizeElement(el));
      
      // 먼저 UI 상태 업데이트, 그 다음 데이터베이스
      set({ elements: safeElements });
      
      // 오류 처리와 함께 안전한 postMessage
      if (typeof window !== 'undefined' && window.parent) {
        try {
          window.parent.postMessage(
            { type: 'ELEMENTS_UPDATED', payload: { elements: safeElements } },
            '*'
          );
        } catch (postMessageError) {
          console.error("iframe message error:", postMessageError);
        }
      }
    } catch (elementError) {
      console.error("Element processing error:", elementError);
    }
  } finally {
    // 상태 손상을 방지하기 위해 항상 플래그 재설정
    set({ historyOperationInProgress: false });
  }
};
```

## 로컬 개발 환경 설정

### 사전 요구사항
- Node.js (v16 이상)
- npm (v7 이상)
- 최신 웹 브라우저 (Chrome 또는 Firefox 권장)

### 설정 단계

```bash
# 1. 저장소 복제
git clone [저장소-URL]
cd xstudio

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
# 다음 변수와 함께 .env 파일 생성:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. 개발 서버 시작
npm run dev
```

### 개발 워크플로우

1. 소스 코드 변경
2. 개발 서버 자동 새로고침
3. 오류 확인을 위한 콘솔 확인
4. 브라우저에서 변경사항 테스트

### 개발자 명령어
```bash
# 개발 서버 시작
npm run dev

# 프로덕션용 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview

# 린팅 실행
npm run lint
```

### 시작하기 위한 사용 사례

#### 1. 새 컴포넌트 생성하기

```typescript
// 1. src/components/MyNewComponent.tsx에서 컴포넌트 생성
import React from 'react';

export interface MyNewComponentProps {
  text: string;
  color?: string;
}

export const MyNewComponent: React.FC<MyNewComponentProps> = ({ text, color = 'black' }) => {
  return <div style={{ color }}>{text}</div>;
};

// 2. src/components/index.ts에 등록
export { MyNewComponent } from './MyNewComponent';
export type { MyNewComponentProps } from './MyNewComponent';

// 3. 빌더 인터페이스를 위해 ElementsPanel.tsx에 추가
<ElementButton
  tag="MyNewComponent"
  label="My Component"
  icon={<TextIcon />}
  defaultProps={{ text: 'New Component', color: 'blue' }}
/>
```

#### 2. 히스토리 기능 테스트하기

1. http://localhost:5173에서 브라우저에서 XStudio 열기
2. 새 프로젝트 생성 또는 기존 프로젝트 열기
3. 캔버스에 여러 요소 추가
4. 요소의 속성 수정
5. 히스토리 기능을 테스트하기 위해 실행 취소/다시 실행 버튼 사용
6. 히스토리 작업을 보려면 콘솔 로그 확인

#### 3. 통신 문제 디버깅하기

1. 브라우저 개발자 도구 열기 (F12)
2. "Console" 탭 선택
3. "iframe" 또는 "history"를 입력하여 콘솔 메시지 필터링
4. 빌더와 iframe 사이의 postMessage 작업 관찰
5. 직렬화 또는 프록시 객체 관련 오류 확인
