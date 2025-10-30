# Phase 2 시작 가이드

## 현재 상태 (Phase 1 완료)

### 완료된 작업
- ✅ 타입 시스템 통합 (`src/builder/inspector/events/types/`)
- ✅ 이벤트 카테고리 데이터 (26개 이벤트)
- ✅ 액션 메타데이터 (14개 액션)
- ✅ HideModalConfig 타입 추가
- ✅ TypeScript 컴파일 에러 없음

### 설치된 의존성
- reactflow: ^11.11.4
- fuse.js: ^7.1.0
- React Aria Components (이미 설치됨)

### 브랜치
```bash
git checkout claude/refactor-inspector-events-011CUaXcmu2R42FbcxAvic2E
```

---

## Phase 2: EventPalette + 검색 기능

### 구현할 컴포넌트

#### 1. useEventSearch Hook
**파일:** `src/builder/inspector/events/hooks/useEventSearch.ts`
**역할:** fuse.js 기반 이벤트 검색
```typescript
export function useEventSearch(query: string, componentType: string) {
  // fuse.js로 이벤트 검색
  // 컴포넌트 호환성 필터링
  return { searchResults, isSearching }
}
```

#### 2. useRecommendedEvents Hook
**파일:** `src/builder/inspector/events/hooks/useRecommendedEvents.ts`
**역할:** 컴포넌트별 추천 이벤트
```typescript
export function useRecommendedEvents(componentType: string) {
  // COMPONENT_RECOMMENDED_EVENTS에서 가져오기
  // 사용률 데이터 포함
  return recommendedEvents
}
```

#### 3. EventCategoryGroup Component
**파일:** `src/builder/inspector/events/components/listMode/EventCategoryGroup.tsx`
**역할:** 카테고리별 이벤트 그룹 표시
```tsx
<EventCategoryGroup
  category={EVENT_CATEGORIES.mouse}
  searchQuery=""
  registeredEvents={[]}
  onAddEvent={(eventType) => {...}}
/>
```

#### 4. EventPalette Component
**파일:** `src/builder/inspector/events/components/listMode/EventPalette.tsx`
**역할:** 메인 이벤트 팔레트 UI
```tsx
<EventPalette
  componentType="Button"
  registeredEvents={["onClick"]}
  onAddEvent={(eventType) => {...}}
/>
```

---

## 시작 명령어

```bash
# 1. 브랜치 확인
git branch
# 출력: * claude/refactor-inspector-events-011CUaXcmu2R42FbcxAvic2E

# 2. 의존성 확인
npm list reactflow fuse.js

# 3. Phase 1 파일 존재 확인
ls src/builder/inspector/events/types/
ls src/builder/inspector/events/data/

# 4. TypeScript 에러 확인
npx tsc --noEmit
```

---

## 예상 작업 시간

- useEventSearch Hook: 2시간
- useRecommendedEvents Hook: 1시간
- EventCategoryGroup: 2시간
- EventPalette: 3시간
- CSS 스타일링: 2시간
**총: 약 10시간 (2일)**

---

## 참고 파일

### 데이터 소스
- `src/builder/inspector/events/data/eventCategories.ts` - 이벤트 카테고리
- `src/builder/inspector/events/data/actionMetadata.ts` - 액션 메타데이터

### 타입 정의
- `src/builder/inspector/events/types/eventTypes.ts` - 모든 타입

### 기존 컴포넌트 (참고용)
- `src/builder/inspector/events/EventList.tsx` - 기존 이벤트 리스트
- `src/builder/inspector/components/PropertyInput.tsx` - 인풋 스타일 참고

---

## Claude에게 줄 프롬프트

```
Inspector Event 리팩토링 Phase 2를 시작하려고 합니다.

브랜치: claude/refactor-inspector-events-011CUaXcmu2R42FbcxAvic2E
완료: Phase 1 (타입 시스템 + 메타데이터)
시작: Phase 2 (EventPalette + 검색 기능)

PHASE2_START.md 파일을 읽고 useEventSearch Hook부터 구현해주세요.
```

---

## 체크리스트

다음에 시작할 때:
- [ ] 브랜치 확인
- [ ] git pull origin (혹시 다른 곳에서 작업했다면)
- [ ] npm install (의존성 확인)
- [ ] npx tsc --noEmit (타입 에러 확인)
- [ ] Phase 2 작업 시작

---

**이 파일은 자동 생성되었습니다. 다음 세션 시작 시 참고하세요.**
