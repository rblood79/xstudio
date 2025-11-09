# Phase 2 Analysis: Inspector Data/Styles React Stately Transformation

**Date**: 2025-11-09
**Status**: Planning
**Target**: Inspector Data and Styles sections

## 목차

1. [현재 구조 분석](#현재-구조-분석)
2. [React Stately 적용 기회](#react-stately-적용-기회)
3. [Phase 2 범위 결정](#phase-2-범위-결정)
4. [예상 효과](#예상-효과)

---

## 현재 구조 분석

### Data 섹션 (10개 파일)

```
src/builder/inspector/data/
├── DataSourceSelector.tsx (454줄) - 데이터 소스 선택 (API, Supabase, State, Static)
├── APICollectionEditor.tsx (617줄) - API Collection 설정
├── APIValueEditor.tsx - API Value 설정
├── SupabaseCollectionEditor.tsx - Supabase Collection 설정
├── SupabaseValueEditor.tsx - Supabase Value 설정
├── StateBindingEditor.tsx - Zustand Store 바인딩
├── StaticDataEditor.tsx - Static 데이터 입력
├── NoneDataSourceEditor.tsx - 데이터 소스 없음
├── utils/deleteTableColumns.ts - Table 컬럼 삭제 유틸
└── index.ts
```

**주요 패턴**:
- Source-based 구조 (API, Supabase, State, Static)
- 각 소스별 독립적인 Editor 컴포넌트
- **현재 문제점**:
  - APICollectionEditor에서 수동 `useState` 관리 (617줄 중 ~100줄이 상태 관리)
  - 컬럼 선택/관리 로직 복잡 (`availableColumns`, `localColumns`, `localColumnMapping`)
  - Load → Parse → Validate → Apply 순서 수동 관리

### Styles 섹션 (5개 파일)

```
src/builder/inspector/styles/
├── CSSVariableEditor.tsx (264줄) - CSS 변수 편집
├── PreviewPanel.tsx - 스타일 미리보기
├── SemanticClassPicker.tsx - 시맨틱 클래스 선택
├── semantic-classes.ts - 시맨틱 클래스 정의
└── index.ts
```

**주요 패턴**:
- CSS 변수 재정의 (컴포넌트별)
- 카테고리별 그룹화 (Colors, Spacing, Typography 등)
- **현재 구조**:
  - 단순한 `Record<string, string>` 관리
  - React Stately 적용 효과 제한적

---

## React Stately 적용 기회

### 1. Data 섹션: `useAsyncList` 적용

**Target**: `APICollectionEditor.tsx`

#### 현재 코드 (수동 관리)

```typescript
// 617줄 중 ~150줄이 상태 관리 + 에러 처리
const [availableColumns, setAvailableColumns] = useState<string[]>([]);
const [localColumns, setLocalColumns] = useState<string[]>(config.columns || []);
const [localColumnMapping, setLocalColumnMapping] = useState<ColumnMapping | undefined>(config.columnMapping);
const [loading, setLoading] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);

const handleLoadData = async () => {
  setLoading(true);
  setLoadError(null);

  try {
    // 1. API 호출
    const data = await fetch(/*...*/);

    // 2. 데이터 추출
    const items = extractResultPath(data, parsedDataMapping.resultPath);

    // 3. 컬럼 감지
    const columnMapping = detectColumnsFromData(items);
    const cols = Object.keys(columnMapping);

    // 4. State 업데이트
    setAvailableColumns(cols);
    setLocalColumnMapping(columnMapping);
    setLocalColumns(cols);
  } catch (error) {
    setLoadError((error as Error).message);
  } finally {
    setLoading(false);
  }
};
```

#### React Stately 적용 후 (`useAsyncList`)

```typescript
// ~50줄로 축소, 자동 로딩/에러 상태 관리
import { useAsyncList } from 'react-stately';
import type { AsyncListLoadOptions } from '@/types/stately';

const columnList = useAsyncList<ColumnDefinition>({
  async load({ signal, filterText }: AsyncListLoadOptions) {
    try {
      // 1. API 호출 (abort signal 자동 처리)
      const response = await fetchAPI(config.baseUrl, localEndpoint, { signal });

      // 2. 데이터 추출
      const items = extractResultPath(response, parsedDataMapping.resultPath);

      // 3. 컬럼 자동 감지
      const columnMapping = detectColumnsFromData(items);

      // 4. 컬럼 목록 반환
      return {
        items: Object.entries(columnMapping).map(([key, def]) => ({
          id: key,
          ...def,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to load columns: ${error.message}`);
    }
  },

  // 필터링 지원 (컬럼 검색)
  async filter({ filterText, items }) {
    return items.filter(col =>
      col.label.toLowerCase().includes(filterText.toLowerCase()) ||
      col.key.toLowerCase().includes(filterText.toLowerCase())
    );
  },
});

// 자동 제공되는 상태
const { items: availableColumns, isLoading, error, reload, setFilterText } = columnList;
```

**주요 개선사항**:
- ✅ **자동 로딩/에러 상태**: `useState(loading)`, `useState(loadError)` 제거
- ✅ **Abort signal 자동 관리**: 컴포넌트 unmount 시 자동 취소
- ✅ **필터링 내장**: 컬럼 검색 기능 자동 제공
- ✅ **Reload 함수**: `columnList.reload()` 한 줄로 재로딩
- ✅ **코드 감소**: 150줄 → 50줄 (67% 감소)

### 2. Data 섹션: `useListData` 적용

**Target**: Column selection state

#### 현재 코드

```typescript
const [localColumns, setLocalColumns] = useState<string[]>(config.columns || []);

// 컬럼 선택 핸들러
const handleColumnToggle = (column: string, checked: boolean) => {
  if (checked) {
    setLocalColumns([...localColumns, column]);
  } else {
    setLocalColumns(localColumns.filter(c => c !== column));
  }
};
```

#### React Stately 적용 후

```typescript
import { useListData } from 'react-stately';

const selectedColumns = useListData({
  initialItems: (config.columns || []).map(col => ({ id: col, name: col })),
  getKey: (item) => item.id,
});

// 자동 CRUD
selectedColumns.append({ id: 'newColumn', name: 'newColumn' });
selectedColumns.remove('columnToRemove');
selectedColumns.update('columnId', { name: 'updatedName' });
```

### 3. Styles 섹션: 제한적 적용

**결론**: Styles 섹션은 React Stately 적용 효과가 제한적입니다.

**이유**:
- CSS 변수는 단순한 `key-value` 구조 (`Record<string, string>`)
- CRUD 작업보다는 단순 업데이트 위주
- 현재 264줄 코드가 이미 충분히 간결함
- **Phase 2에서 제외하고, 필요 시 Phase 8에서 검토**

---

## Phase 2 범위 결정

### ✅ Phase 2 포함 항목

1. **APICollectionEditor React Stately 전환**
   - `useAsyncList`로 API 데이터 로딩 자동화
   - `useListData`로 컬럼 선택 상태 관리
   - 예상 코드 감소: 617줄 → ~350줄 (43% 감소)

2. **SupabaseCollectionEditor React Stately 전환** (동일 패턴)
   - `useAsyncList`로 Supabase 데이터 로딩
   - `useListData`로 컬럼 선택 관리

3. **타입 정의 확장**
   - `src/types/stately.ts`에 `ColumnListItem` 타입 추가
   - `AsyncListLoadOptions` 인터페이스 확장

### ❌ Phase 2 제외 항목

1. **APIValueEditor, SupabaseValueEditor**
   - 단순한 값 바인딩 (Collection보다 간단)
   - React Stately 적용 효과 미미
   - Phase 8에서 필요 시 재검토

2. **StateBindingEditor, StaticDataEditor**
   - Zustand Store 바인딩은 별도 패턴
   - Static 데이터는 JSON 입력 위주
   - React Stately보다 현재 구조가 적합

3. **Styles 섹션 전체**
   - CSS 변수 관리는 단순 key-value 구조
   - 현재 코드가 충분히 간결 (264줄)
   - Phase 8에서 재검토

---

## 예상 효과

### 코드 감소

| 파일 | 현재 | 예상 | 감소율 |
|------|------|------|--------|
| APICollectionEditor.tsx | 617줄 | ~350줄 | **-43%** |
| SupabaseCollectionEditor.tsx | ~500줄 (추정) | ~300줄 | **-40%** |
| **Total** | ~1,117줄 | ~650줄 | **-42%** |

### 기능 개선

✅ **자동 로딩 상태 관리**
- `isLoading`, `error` 자동 제공
- 수동 `useState(loading)`, `useState(error)` 제거

✅ **Abort signal 자동 처리**
- 컴포넌트 unmount 시 API 요청 자동 취소
- 메모리 누수 방지

✅ **필터링 내장**
- 컬럼 검색 기능 자동 제공
- `setFilterText()` 한 줄로 필터링

✅ **Reload 간소화**
- `columnList.reload()` 한 줄로 재로딩
- 수동 `handleLoadData()` 함수 제거

### 유지보수성

✅ **선언적 API**
- `load()` 함수에 비즈니스 로직 집중
- 상태 관리 보일러플레이트 제거

✅ **일관된 패턴**
- Phase 1 Events와 동일한 React Stately 패턴
- 팀원 학습 비용 감소

✅ **타입 안전성**
- `AsyncListLoadOptions`, `ColumnListItem` 타입으로 안전성 확보

---

## Phase 2 작업 계획

### Day 1: Type Definitions & APICollectionEditor

1. **타입 정의 확장** (30분)
   - `src/types/stately.ts`에 `ColumnListItem` 추가
   - `AsyncListLoadOptions` 인터페이스 완성

2. **APICollectionEditor 리팩토링** (3시간)
   - `useAsyncList` 적용 (컬럼 로딩)
   - `useListData` 적용 (컬럼 선택)
   - TypeScript 컴파일 확인
   - 기존 기능 유지 확인

3. **TypeScript 검증** (30분)
   - `npx tsc --noEmit` 실행
   - 타입 에러 수정

### Day 2: SupabaseCollectionEditor & Testing

1. **SupabaseCollectionEditor 리팩토링** (3시간)
   - APICollectionEditor와 동일한 패턴 적용
   - Supabase 클라이언트 통합

2. **통합 테스트** (1시간)
   - 개발 서버에서 실제 동작 확인
   - API/Supabase 데이터 로딩 테스트
   - 컬럼 선택/해제 테스트

3. **문서화 및 커밋** (30분)
   - Phase 2 완료 문서 작성
   - Git 커밋 (feat: Phase 2 - Data section React Stately transformation)

---

## 참고: React Stately API

### `useAsyncList` 주요 API

```typescript
interface AsyncListOptions<T> {
  // 데이터 로딩 함수 (필수)
  load: (options: AsyncListLoadOptions) => Promise<AsyncListLoadResult<T>>;

  // 초기 아이템 (선택)
  initialSelectedKeys?: 'all' | Iterable<Key>;

  // 정렬 함수 (선택)
  sort?: (options: AsyncListSortOptions<T>) => Promise<AsyncListSortResult<T>>;

  // 필터 함수 (선택)
  filter?: (options: AsyncListFilterOptions<T>) => Promise<T[]>;
}

interface AsyncListLoadOptions {
  signal: AbortSignal;  // 자동 abort 처리
  cursor?: string;      // 페이지네이션
  filterText?: string;  // 필터 텍스트
}

// 반환 객체
const list = useAsyncList(options);

// 제공되는 상태/메서드
list.items           // T[]
list.isLoading       // boolean
list.error           // Error | null
list.reload()        // 재로딩
list.setFilterText() // 필터링
list.sort()          // 정렬
```

### `useListData` 주요 API

```typescript
const list = useListData({
  initialItems: [...],
  getKey: (item) => item.id,
});

// CRUD 메서드
list.append(item)
list.prepend(item)
list.insert(targetKey, item)
list.insertBefore(targetKey, item)
list.insertAfter(targetKey, item)
list.remove(key)
list.update(key, newValue)
list.move(key, toIndex)

// 상태
list.items           // T[]
list.selectedKeys    // Set<Key>
list.setSelectedKeys()
```

---

## 다음 단계

1. ✅ Phase 2 분석 완료
2. ⏳ Phase 2 Day 1 시작:
   - 타입 정의 확장
   - APICollectionEditor 리팩토링
3. ⏳ Phase 2 Day 2:
   - SupabaseCollectionEditor 리팩토링
   - 통합 테스트

---

**문서 작성**: Claude Code
**검토**: 2025-11-09
