---
description: XStudio 웹 기반 UI 빌더 개발 가이드라인
globs: **/*.{ts,tsx,js,jsx,css,md,mdx}
alwaysApply: true
---

# XStudio 개발 가이드

**XStudio**는 React 19 + TypeScript + Supabase 기반의 웹 UI 빌더입니다.

## 🎯 핵심 아키텍처

### 기술 스택
- **Frontend**: React 19, TypeScript, React Aria Components, Zustand, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Tools**: Vite, Storybook 8, Vitest

### 데이터 흐름
```typescript
// UI 액션 → Zustand 상태 → Supabase → iframe 프리뷰 동기화
const addElement = async (tag: string) => {
  // 1. Supabase에 저장
  const { data } = await supabase.from("elements").insert([newElement]);
  // 2. Zustand 상태 업데이트
  addElement(data);
  // 3. iframe 프리뷰 동기화
  sendElementsToIframe();
};
```

## 🗄️ 데이터베이스 스키마 (Supabase)

### 핵심 테이블 구조

#### 1. **projects** - 프로젝트 메타데이터
```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  domain TEXT UNIQUE,  -- 서브도메인 (예: "myproject")
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_projects_user FOREIGN KEY (created_by)
    REFERENCES public.users(id) ON DELETE CASCADE
);
```

#### 2. **pages** - 프로젝트 페이지
```sql
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,  -- URL 경로 (예: "about", "contact")
  order_num INT,       -- 페이지 순서
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_pages_project FOREIGN KEY (project_id)
    REFERENCES public.projects(id) ON DELETE CASCADE
);
```

#### 3. **elements** - UI 요소 트리 (핵심)
```sql
CREATE TABLE public.elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL,
  parent_id UUID,      -- NULL이면 루트 요소
  tag TEXT NOT NULL,   -- 'div', 'Button', 'TextField' 등
  props JSONB DEFAULT '{}',  -- 컴포넌트 속성 (스타일, 이벤트 등)
  order_num INT DEFAULT 0,   -- 형제 요소 간 순서
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_elements_page FOREIGN KEY (page_id)
    REFERENCES public.pages(id) ON DELETE CASCADE,
  CONSTRAINT fk_elements_parent FOREIGN KEY (parent_id)
    REFERENCES public.elements(id) ON DELETE CASCADE
);
```
**중요**: `props` 필드는 JSONB로 다음을 저장:
- `style`: CSS 속성
- `className`: Tailwind 클래스
- `events`: 이벤트 핸들러 정의
- 컴포넌트별 속성 (예: TextField의 `placeholder`, Button의 `variant`)

#### 4. **design_tokens** - 디자인 토큰
```sql
CREATE TABLE public.design_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  theme_id UUID NOT NULL,
  name TEXT NOT NULL,      -- 예: "color.brand.primary"
  type TEXT NOT NULL,      -- 'color', 'typography', 'spacing', 'shadow'
  value JSONB NOT NULL,    -- 실제 값 (예: {"r":59, "g":130, "b":246, "a":1})
  scope TEXT NOT NULL DEFAULT 'raw' CHECK (scope IN ('raw', 'semantic')),
  alias_of TEXT,           -- semantic 토큰이 참조하는 raw 토큰
  css_variable TEXT,       -- 생성될 CSS 변수명 (예: "--color-primary")
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_tokens_project FOREIGN KEY (project_id)
    REFERENCES public.projects(id) ON DELETE CASCADE
);
```

#### 5. **design_themes** - 테마 관리
```sql
CREATE TABLE public.design_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT now()
);
```

## 📁 프로젝트 구조 및 아키텍처

### 디렉토리 구조
```
src/
├── App.tsx / App.css        # 루트 애플리케이션 셸
├── assets/                  # 정적 자산
├── auth/                    # 인증 관련 컴포넌트
├── builder/                 # 핵심 빌더 시스템
│   ├── ai/                  # AI 어시스턴트 UI
│   ├── components/          # React Aria 기반 위젯 래퍼
│   ├── dataset/             # 샘플 데이터
│   ├── factories/           # 컴포넌트 팩토리
│   ├── hooks/               # 빌더 전용 훅
│   ├── inspector/           # 속성 편집기
│   │   ├── design/          # 디자인 속성 편집
│   │   ├── events/          # 이벤트 속성 편집
│   │   └── properties/      # 컴포넌트별 속성 에디터
│   ├── library/             # 컴포넌트 라이브러리
│   ├── main/                # 메인 빌더 컴포넌트
│   ├── monitor/             # 성능 모니터링
│   ├── nodes/               # 노드 트리 관리
│   ├── overlay/             # 선택 오버레이
│   ├── preview/             # iframe 프리뷰
│   ├── setting/             # 빌더 설정
│   ├── sidebar/             # 사이드바 컴포넌트
│   ├── stores/              # Zustand 상태 저장소
│   ├── theme/               # 테마 편집기
│   ├── user/                # 사용자 관련
│   └── utils/               # 빌더 유틸리티
├── dashboard/               # 프로젝트 대시보드
├── demo/                    # 데모 컴포넌트
├── env/                     # 환경 설정
├── hooks/                   # 전역 훅
├── services/api/            # API 서비스 레이어
├── stories/                 # Storybook 스토리
├── types/                   # TypeScript 타입 정의
├── utils/                   # 전역 유틸리티
└── main.tsx                 # 애플리케이션 진입점
```

### 🏗️ 빌더 핵심 컴포넌트 역할

#### BuilderCore (`src/builder/main/BuilderCore.tsx`)
**역할**: 빌더의 루트 컴포넌트로 모든 하위 컴포넌트를 조율
- **상태 관리**: Zustand 스토어와 연결, 전역 상태 동기화
- **훅 초기화**: useElementCreator, usePageManager, useIframeMessenger 등 초기화
- **이벤트 조율**: Undo/Redo, 요소 선택, iframe 통신 핸들러 관리
- **레이아웃**: BuilderHeader, Sidebar, Inspector, BuilderWorkspace 배치

```typescript
// BuilderCore 주요 책임
export const BuilderCore: React.FC = () => {
    const { projectId } = useParams();
    
    // 1. 상태 구독
    const elements = useStore(state => state.elements);
    const selectedElementId = useStore(state => state.selectedElementId);
    
    // 2. 훅 초기화
    const { handleAddElement } = useElementCreator();
    const { handleIframeLoad, sendElementsToIframe } = useIframeMessenger();
    const { pages, loadPageElements } = usePageManager();
    
    // 3. Undo/Redo 관리
    const handleUndo = useCallback(() => {
        const { undo } = useStore.getState();
        undo();
    }, []);
    
    // 4. 레이아웃 렌더링
    return (
        <div className="builder-container">
            <BuilderHeader onUndo={handleUndo} ... />
            <Sidebar pages={pages} ... />
            <BuilderWorkspace onIframeLoad={handleIframeLoad} />
            <Inspector selectedElement={selectedElementId} />
        </div>
    );
};
```

#### BuilderHeader (`src/builder/main/BuilderHeader.tsx`)
**역할**: 상단 도구 모음 - 히스토리, 브레이크포인트, 프리뷰 제어
- **Undo/Redo 버튼**: 히스토리 시스템 제어
- **브레이크포인트 선택**: Desktop/Tablet/Mobile 뷰 전환
- **프리뷰/게시**: 미리보기 및 배포 기능

#### BuilderWorkspace (`src/builder/main/BuilderWorkspace.tsx`)
**역할**: iframe 프리뷰 영역 관리
- **iframe 마운트**: 프리뷰 프레임 렌더링
- **반응형 크기 조정**: 선택된 브레이크포인트에 따라 iframe 크기 변경

#### BuilderViewport (`src/builder/main/BuilderViewport.tsx`)
**역할**: 작업 영역 레이아웃 컨테이너
- **Sidebar + Workspace + Inspector** 배치

## 🔗 iframe 통신 패턴 (프리뷰 시스템)

### 아키텍처 개요
빌더(부모)와 프리뷰(iframe)는 `postMessage`로 양방향 통신합니다.

```
┌─────────────────────────────────────────────────────────────┐
│ BuilderCore (부모 window)                                   │
│  ├─ useIframeMessenger 훅                                   │
│  │   ├─ sendElementsToIframe()  // 요소 데이터 전송         │
│  │   ├─ handleMessage()          // 프리뷰 메시지 수신      │
│  │   └─ handleIframeLoad()       // iframe 준비 확인        │
│  └─ MessageService 클래스 (src/utils/messaging.ts)         │
│       └─ getIframe() / sendToIframe()                       │
└─────────────────────────────────────────────────────────────┘
                           ↕ postMessage
┌─────────────────────────────────────────────────────────────┐
│ Preview (iframe - src/builder/preview/index.tsx)            │
│  ├─ handleMessage()         // 부모 메시지 수신             │
│  ├─ DynamicComponentLoader  // 요소 렌더링                  │
│  └─ window.parent.postMessage()  // 부모에 이벤트 전달      │
└─────────────────────────────────────────────────────────────┘
```

### 주요 메시지 타입

#### 1. **UPDATE_ELEMENTS** (부모 → iframe)
요소 데이터를 iframe에 전송하여 프리뷰 업데이트
```typescript
// 부모 (BuilderCore)
const sendElementsToIframe = (elements: Element[]) => {
    const iframe = MessageService.getIframe();
    iframe?.contentWindow?.postMessage({
        type: "UPDATE_ELEMENTS",
        elements: elements
    }, window.location.origin);
};

// iframe (Preview)
const handleMessage = (event: MessageEvent) => {
    if (event.data.type === "UPDATE_ELEMENTS") {
        setElements(event.data.elements || []);
    }
};
```

#### 2. **ELEMENT_SELECTED** (양방향)
요소 선택 상태 동기화
```typescript
// 부모 → iframe: 선택된 요소 알림
iframe.contentWindow.postMessage({
    type: "ELEMENT_SELECTED",
    elementId: selectedElementId,
    payload: { tag: element.tag, props: element.props },
    source: "builder"
}, window.location.origin);

// iframe → 부모: 클릭된 요소 알림
window.parent.postMessage({
    type: "element-click",
    elementId: clickedElementId
}, '*');
```

#### 3. **UPDATE_ELEMENT_PROPS** (양방향)
속성 변경 실시간 동기화
```typescript
// Inspector에서 속성 변경 시
iframe.contentWindow.postMessage({
    type: "UPDATE_ELEMENT_PROPS",
    elementId: element.id,
    props: { backgroundColor: '#ff0000' },
    merge: true  // 기존 props와 병합
}, window.location.origin);
```

#### 4. **PREVIEW_READY** (iframe → 부모)
iframe 초기화 완료 신호
```typescript
// iframe (Preview)
useEffect(() => {
    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
}, []);

// 부모 (BuilderCore)
if (event.data.type === "PREVIEW_READY") {
    setIframeReadyState('ready');
    processMessageQueue();  // 대기 중인 메시지 전송
}
```

### 메시지 큐 시스템
iframe이 준비되기 전 메시지는 큐에 저장 후 준비 완료 시 전송
```typescript
const messageQueueRef = useRef<Array<{ type: string; payload: unknown }>>([]);

const sendElementsToIframe = (elements: Element[]) => {
    if (iframeReadyState !== 'ready') {
        // 큐에 저장
        messageQueueRef.current.push({ type: "UPDATE_ELEMENTS", payload: elements });
        return;
    }
    
    // 즉시 전송
    iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, origin);
};
```

### 보안 고려사항
```typescript
// Origin 검증 필수
const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) {
        console.warn("Untrusted origin:", event.origin);
        return;
    }
    // 메시지 처리...
};
```
├── services/api/            # API 서비스 레이어
├── stories/                 # Storybook 스토리
├── types/                   # TypeScript 타입 정의
├── utils/                   # 전역 유틸리티
└── main.tsx                 # 애플리케이션 진입점
```

### 주요 컴포넌트 아키텍처

#### 1. 빌더 핵심 컴포넌트
- **BuilderCore**: 메인 빌더 컴포넌트 (`src/builder/main/BuilderCore.tsx`)
- **BuilderHeader**: 상단 툴바 (`src/builder/main/BuilderHeader.tsx`)
- **BuilderWorkspace**: 작업 영역 (`src/builder/main/BuilderWorkspace.tsx`)
- **BuilderViewport**: 레이아웃 컨테이너 (`src/builder/main/BuilderViewport.tsx`)

#### 2. 데이터 흐름
```typescript
// UI 액션 → Zustand 상태 업데이트 → Supabase API 호출
const handleAddElement = async (tag: string) => {
  const newElement = { 
    id: crypto.randomUUID(),
    tag,
    props: getDefaultProps(tag),
    parent_id: parentId,
    page_id: currentPageId,
    order_num: calculateNextOrderNum()
  };
  
  // 1. Supabase에 저장
  const { data, error } = await supabase
    .from("elements")
    .insert([newElement])
    .select()
    .single();
    
  if (!error && data) {
    // 2. Zustand 상태 업데이트
    addElement(data);
    
    // 3. iframe 프리뷰 동기화
    sendElementsToIframe();
  }
};
```

## 프로젝트 구조 및 아키텍처

### 디렉토리 구조
```
src/
├── App.tsx / App.css        # 루트 애플리케이션 셸
├── assets/                  # 정적 자산
├── auth/                    # 인증 관련 컴포넌트
├── builder/                 # 핵심 빌더 시스템
│   ├── ai/                  # AI 어시스턴트 UI
│   ├── components/          # React Aria 기반 위젯 래퍼
│   ├── dataset/             # 샘플 데이터
│   ├── factories/           # 컴포넌트 팩토리
│   ├── hooks/               # 빌더 전용 훅
│   ├── inspector/           # 속성 편집기
│   │   ├── design/          # 디자인 속성 편집
│   │   ├── events/          # 이벤트 속성 편집
│   │   └── properties/      # 컴포넌트별 속성 에디터
│   ├── library/             # 컴포넌트 라이브러리
│   ├── main/                # 메인 빌더 컴포넌트
│   ├── monitor/             # 성능 모니터링
│   ├── nodes/               # 노드 트리 관리
│   ├── overlay/             # 선택 오버레이
│   ├── preview/             # iframe 프리뷰
│   ├── setting/             # 빌더 설정
│   ├── sidebar/             # 사이드바 컴포넌트
│   ├── stores/              # Zustand 상태 저장소
│   ├── theme/               # 테마 편집기
│   ├── user/                # 사용자 관련
│   └── utils/               # 빌더 유틸리티
├── dashboard/               # 프로젝트 대시보드
├── demo/                    # 데모 컴포넌트
├── env/                     # 환경 설정
├── hooks/                   # 전역 훅
├── services/api/            # API 서비스 레이어
├── stories/                 # Storybook 스토리
├── types/                   # TypeScript 타입 정의
├── utils/                   # 전역 유틸리티
└── main.tsx                 # 애플리케이션 진입점
```

### 주요 컴포넌트 아키텍처

#### 1. 빌더 핵심 컴포넌트
- **BuilderCore**: 메인 빌더 컴포넌트 (`src/builder/main/BuilderCore.tsx`)
- **BuilderHeader**: 상단 툴바 (`src/builder/main/BuilderHeader.tsx`)
- **BuilderWorkspace**: 작업 영역 (`src/builder/main/BuilderWorkspace.tsx`)
- **BuilderViewport**: 레이아웃 컨테이너 (`src/builder/main/BuilderViewport.tsx`)

#### 2. 데이터 흐름
```typescript
// UI 액션 → Zustand 상태 업데이트 → Supabase API 호출
const handleAddElement = async (tag: string) => {
  const newElement = { 
    id: crypto.randomUUID(),
    tag,
    props: getDefaultProps(tag),
    parent_id: parentId,
    page_id: currentPageId,
    order_num: calculateNextOrderNum()
  };
  
  // 1. Supabase에 저장
  const { data, error } = await supabase
    .from("elements")
    .insert([newElement])
    .select()
    .single();
    
  if (!error && data) {
    // 2. Zustand 상태 업데이트
    addElement(data);
    
    // 3. iframe 프리뷰 동기화
    sendElementsToIframe();
  }
};
```

## 🔑 핵심 개발 패턴

### React Aria 컴포넌트 래핑
```typescript
// ✅ DO: React Aria 기반 컴포넌트 생성
import { Button as AriaButton, ButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';

const buttonVariants = tv({
    base: 'px-4 py-2 rounded-md font-medium transition-colors',
    variants: {
        variant: {
            primary: 'bg-blue-500 text-white hover:bg-blue-600',
            secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        }
    }
});

export const Button = ({ variant = 'primary', ...props }: ButtonProps & {
    variant?: 'primary' | 'secondary'
}) => (
    <AriaButton 
        className={buttonVariants({ variant })} 
        {...props} 
    />
);
```

### Zustand 상태 관리
```typescript
// ✅ DO: Immer 미들웨어 사용
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useElementStore = create<ElementState>()(
    immer((set) => ({
        elements: [],
        selectedElementId: null,
        
        addElement: (element) => set((state) => {
            state.elements.push(element);
        }),
        
        updateElement: (id, props) => set((state) => {
            const element = state.elements.find(el => el.id === id);
            if (element) Object.assign(element, props);
        }),
    }))
);
```

### 히스토리 관리 (Undo/Redo)
```typescript
// ✅ DO: Proxy 안전 처리
function safeDeepCopy<T>(data: T): T {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (proxyError) {
        console.warn('⚠️ Proxy 오류로 원본 객체 사용:', proxyError);
        return data; // fallback
    }
}

// 히스토리 엔트리 추가 시
const createHistoryEntry = (element: Element) => ({
    id: crypto.randomUUID(),
    type: 'add' as const,
    elementId: element.id,
    data: { element: safeDeepCopy(element) }
});
```

### API 서비스 패턴
```typescript
// ✅ DO: 서비스 클래스 사용
export class ElementsApiService {
    static async createElement(element: ElementInsert): Promise<Element> {
        const { data, error } = await supabase
            .from('elements')
            .insert([element])
            .select()
            .single();
            
        if (error) throw handleApiError(error, '요소 생성 실패');
        return data;
    }
}
```

## 🚨 중요한 주의사항

### React Aria Collection 키 처리
```typescript
// ✅ DO: 옵션에 value 필드 포함
const options = [
    { id: 'none', value: 'none', label: '선택 불가' },
    { id: 'single', value: 'single', label: '단일 선택' }
];

// PropertyCheckbox에서 isSelected 사용 (checked 아님!)
<PropertyCheckbox
    label="소팅 가능"
    isSelected={element.props.allowsSorting}
    onChange={(allowsSorting) => onChange({ allowsSorting })}
/>
```

### 연결된 요소 삭제 (Tab/Panel)
```typescript
// ✅ DO: 연결된 요소 자동 삭제
if (elementToRemove.tag === 'Tab') {
    const linkedPanel = elements.find(el => 
        el.tag === 'Panel' && 
        el.parent_id === elementToRemove.parent_id &&
        el.props.order_num === elementToRemove.props.order_num
    );
    if (linkedPanel) elementsToDelete.push(linkedPanel);
}
```

## 🛠️ 개발 워크플로우

### 필수 명령어
- `npm run dev` - 개발 서버 (포트 3000)
- `npm run storybook` - 컴포넌트 문서 (포트 6006)
- `npm run build` - 프로덕션 빌드
- `npm run lint` - ESLint 검사

### 새 컴포넌트 추가 절차
1. `src/builder/components/NewComponent.tsx` 생성
2. `src/builder/inspector/properties/editors/NewComponentEditor.tsx` 생성
3. `src/stories/NewComponent.stories.tsx` **필수 생성**
4. 컴포넌트 팩토리에 등록

### 코딩 스타일
- **들여쓰기**: 공백 4칸
- **따옴표**: TypeScript 단일, JSX 속성 이중
- **파일명**: 컴포넌트는 PascalCase, 훅은 camelCase + `use`

### 환경 변수
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ENABLE_DEBUG_LOGS=true
```

---

이 규칙들을 따라 일관성 있고 안정적인 XStudio 개발을 진행하세요.