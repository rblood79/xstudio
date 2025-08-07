# XStudio AI 코딩 도우미 지침

XStudio는 React, TypeScript, Vite, Supabase를 사용하는 웹 기반 UI 빌더/디자인 스튜디오입니다. 이 문서는 AI 코딩 도우미가 이 코드베이스에서 효과적으로 작업하기 위한 핵심 정보를 제공합니다.

## 프로젝트 아키텍처

XStudio는 다음과 같은 주요 구성 요소로 이루어져 있습니다:

1. **빌더 (Builder)**: 메인 편집 환경으로, 사이드바, 인스펙터, 프리뷰 iframe을 포함
2. **사이드바 (Sidebar)**: 페이지와 요소 계층 구조를 표시하고 관리
3. **인스펙터 (Inspector)**: 선택된 요소의 속성을 편집 (디자인, 속성, 레이아웃)
4. **프리뷰 (Preview)**: 실시간 변경사항을 보여주는 iframe
5. **오버레이 (Overlay)**: 선택된 요소를 시각적으로 표시하는 레이어

### 데이터 흐름

- **Zustand**: 클라이언트 상태 관리 (`src/builder/stores/elements.ts`)
- **Supabase**: 백엔드 데이터 저장소 (싱글톤 패턴으로 구현됨, `src/env/supabase.client.ts`)
- **상태 처리 흐름**: 
  1. UI 액션 → 
  2. Zustand 상태 업데이트 → 
  3. Supabase API 직접 호출

```typescript
// 예시: 요소 추가 시 데이터 흐름
const newElement = { id: crypto.randomUUID(), /* ... */ };
const { data, error } = await supabase.from("elements").insert([newElement]);
if (!error && data) {
  addElement(data[0]); // Zustand 액션
}
```

## 주요 파일 및 디렉토리

- `src/builder/builder.tsx`: 빌더의 핵심 컴포넌트
- `src/builder/stores/elements.ts`: 전역 상태 관리 (Zustand)
- `src/builder/components/`: 공통 UI 컴포넌트
- `src/builder/nodes/`: 페이지 및 요소 트리 관리
- `src/builder/preview/`: 실시간 미리보기 iframe
- `src/env/supabase.client.ts`: Supabase 싱글톤 클라이언트

## 핵심 개념 및 패턴

### 1. Element 계층 구조

요소는 중첩 구조를 가지며 `parent_id`로 계층 구조를 표현합니다:

```typescript
interface Element {
  id: string;
  tag: string;
  props: ElementProps;
  parent_id?: string | null;
  page_id?: string;
  order_num?: number;
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
  if (event.data.type === "UPDATE_ELEMENTS") {
    // 요소 업데이트 처리
  }
});
```

### 3. 히스토리 관리 (Undo/Redo)

Immer 패치를 사용한 효율적인 히스토리 관리:

```typescript
// 히스토리 사용 예시
undo: () => {
  set(produce((state: Store) => {
    // 히스토리 적용 로직
  }));
}
```

## 개발 워크플로우

1. **개발 서버**: `npm run dev`로 Vite 개발 서버 시작
2. **컴포넌트 문서**: `npm run storybook`으로 Storybook 실행
3. **빌드**: `npm run build`로 프로덕션 빌드 생성

## 알려진 주의사항

1. **Supabase 싱글톤**: Supabase 클라이언트는 `src/env/supabase.client.ts`에서 싱글톤으로 관리됨
2. **iframe 보안**: 프리뷰 iframe에 적절한 sandbox 속성과 메시지 검증 사용
3. **컴포넌트 디렉토리**: 공통 컴포넌트는 `src/builder/components/`에 위치하며, 확장 시 관련 타입도 업데이트 필요

## 테스트 및 디버깅

테스트 방법과 디버깅 팁에 관해서는 아직 명확한 정보가 제공되지 않았습니다.
