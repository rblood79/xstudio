# Phase 2-8 실행 가이드

**작성일**: 2025-11-09
**목적**: 다른 PC에서 작업 재개 시 참고할 상세 실행 가이드
**현재 진행률**: Phase 1 완료 (100%), Phase 2 준비 (10%)

---

## 📋 목차

1. [현재 상태 요약](#현재-상태-요약)
2. [Phase 2: Inspector Data 섹션](#phase-2-inspector-data-섹션)
3. [Phase 3: Sidebar Tree](#phase-3-sidebar-tree)
4. [Phase 4-8: 추가 개선](#phase-4-8-추가-개선)
5. [체크리스트](#체크리스트)

---

## 현재 상태 요약

### ✅ 완료된 작업

**Phase 0: 환경 설정** (100%)
- React Stately 3.37.0 설치 완료
- Adobe 패키지 설치 (@internationalized/date, @internationalized/number 등)
- 타입 정의 완료 (src/types/stately.ts, src/types/collections.ts)

**Phase 1: Inspector Events** (100%)
- React Stately 훅 3개 생성 완료
- React Aria Pickers 2개 생성 완료
- listMode 제거 (9개 파일 삭제)
- 버그 4개 수정 완료:
  1. handler.actions undefined (b80d969)
  2. DataCloneError - postMessage (23b4caf)
  3. TriggerNode ReactFlow mode (49f5bfc)
  4. TriggerNode Simple mode (8bd0e1d)

**Phase 2: Inspector Data** (10%)
- ✅ ColumnListItem 타입 정의 (src/types/stately.ts:26-37)
- ✅ Phase 2 분석 문서 (docs/PHASE_2_ANALYSIS.md)
- ⏳ useColumnLoader hook (미생성)
- ⏳ APICollectionEditor 리팩토링 (대기)
- ⏳ SupabaseCollectionEditor 리팩토링 (대기)

### 📊 주요 지표

| 지표 | Phase 0-1 | 목표 (Phase 2-8) |
|------|-----------|------------------|
| 커밋 수 | 12개 | ~30-40개 |
| 생성 파일 | 8개 | ~15-20개 |
| 삭제 파일 | 9개 | ~5-10개 |
| 코드 감소율 | -15% | -25% ~ -35% |
| 문서 | 4개 | 8-10개 |

### 🎯 다음 우선순위

1. **Phase 2 Day 1** (3-4시간)
   - useColumnLoader hook 생성
   - APICollectionEditor 리팩토링 시작

2. **Phase 2 Day 2** (3-4시간)
   - APICollectionEditor 완료
   - SupabaseCollectionEditor 리팩토링

3. **Phase 3** (2-3시간)
   - Sidebar Tree useTreeData 적용

---

## Phase 2: Inspector Data 섹션

### 목표

- APICollectionEditor: 617줄 → ~350줄 (-43%)
- SupabaseCollectionEditor: ~500줄 → ~300줄 (-40%)
- 자동 로딩/에러 상태 관리
- Abort signal 자동 처리

### Step 1: useColumnLoader Hook 생성

**파일**: `src/builder/inspector/data/hooks/useColumnLoader.ts`

**구현 코드**:

```typescript
import { useAsyncList } from 'react-stately';
import type { AsyncListLoadOptions, ColumnListItem } from '@/types/stately';
import type { APICollectionConfig } from '../types';
import { detectColumnsFromData } from '../../../utils/columnTypeInference';
import type { ColumnMapping } from '../../../types/unified';
import { apiConfig } from '../../../services/api';

export interface UseColumnLoaderOptions {
  baseUrl: string;
  endpoint: string;
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  dataMapping: {
    resultPath?: string;
  };
}

export interface UseColumnLoaderResult {
  columns: ColumnListItem[];
  isLoading: boolean;
  error: Error | null;
  loadColumns: () => void;
  columnMapping?: ColumnMapping;
}

/**
 * useColumnLoader - API 컬럼 로딩 자동화
 * useAsyncList를 사용하여 API 호출, 컬럼 감지, 에러 처리 자동화
 */
export function useColumnLoader(options: UseColumnLoaderOptions): UseColumnLoaderResult {
  const { baseUrl, endpoint, params = {}, headers = {}, dataMapping } = options;

  const columnList = useAsyncList<ColumnListItem>({
    async load({ signal }: AsyncListLoadOptions) {
      try {
        let data: unknown;

        // MOCK_DATA 특별 처리
        if (baseUrl === "MOCK_DATA") {
          const mockFetch = apiConfig.MOCK_DATA;
          data = await mockFetch(endpoint, params);
        } else {
          // 실제 API 호출
          const queryString = new URLSearchParams(
            params as Record<string, string>
          ).toString();
          const fullUrl = queryString
            ? `${baseUrl}${endpoint}?${queryString}`
            : `${baseUrl}${endpoint}`;

          const response = await fetch(fullUrl, {
            headers: headers as HeadersInit,
            signal, // Abort signal 자동 전달
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          data = await response.json();
        }

        // resultPath 추출
        let items = data;
        if (dataMapping.resultPath) {
          const pathParts = dataMapping.resultPath.split('.');
          for (const part of pathParts) {
            if (items && typeof items === 'object' && part in items) {
              items = (items as Record<string, unknown>)[part];
            }
          }
        }

        // 배열이 아니면 에러
        if (!Array.isArray(items)) {
          throw new Error('Result is not an array');
        }

        // 컬럼 자동 감지
        const columnMapping = detectColumnsFromData(items);
        const columnKeys = Object.keys(columnMapping);

        // ColumnListItem 배열 반환
        return {
          items: columnKeys.map((key, index) => ({
            id: key,
            key,
            label: columnMapping[key].label || key,
            type: columnMapping[key].type || 'string',
            selected: true,
            order: index,
          })),
        };
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('🚫 API 요청 취소됨');
          throw error;
        }
        throw new Error(
          `Failed to load columns: ${(error as Error).message}`
        );
      }
    },
  });

  return {
    columns: columnList.items,
    isLoading: columnList.isLoading,
    error: columnList.error,
    loadColumns: columnList.reload,
    // columnMapping은 별도로 관리 (load 함수 내부에서만 접근 가능)
  };
}
```

**테스트 방법**:

```typescript
// APICollectionEditor.tsx에서 테스트
const { columns, isLoading, error, loadColumns } = useColumnLoader({
  baseUrl: config.baseUrl,
  endpoint: localEndpoint,
  params: JSON.parse(localParams),
  headers: JSON.parse(localHeaders),
  dataMapping: JSON.parse(localDataMapping),
});

// Load 버튼 클릭 시
<Button onPress={loadColumns}>
  {isLoading ? "Loading..." : "Load Data"}
</Button>

// 에러 표시
{error && <div className="error">{error.message}</div>}

// 컬럼 목록 표시
{columns.map(col => (
  <div key={col.id}>{col.label} ({col.type})</div>
))}
```

### Step 2: APICollectionEditor 리팩토링

**파일**: `src/builder/inspector/data/APICollectionEditor.tsx`

**현재 구조**:
- 617줄
- 수동 useState (loading, loadError, availableColumns)
- 수동 fetch 로직 (81-150줄)
- 수동 컬럼 선택 관리 (localColumns)

**리팩토링 단계**:

#### 2.1. useColumnLoader로 로딩 로직 교체

**제거할 코드**:
```typescript
// Line 47-51: 수동 state
const [availableColumns, setAvailableColumns] = useState<string[]>([]);
const [loading, setLoading] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);

// Line 81-150: handleLoadData 함수 전체
const handleLoadData = async () => {
  setLoading(true);
  // ... 100줄의 수동 로직
};
```

**추가할 코드**:
```typescript
// Import
import { useColumnLoader } from './hooks/useColumnLoader';

// Hook 사용
const {
  columns: availableColumns,
  isLoading: loading,
  error: loadError,
  loadColumns,
  columnMapping: detectedColumnMapping,
} = useColumnLoader({
  baseUrl: config.baseUrl,
  endpoint: localEndpoint,
  params: JSON.parse(localParams || '{}'),
  headers: JSON.parse(localHeaders || '{}'),
  dataMapping: JSON.parse(localDataMapping),
});

// Load 버튼
<Button onPress={loadColumns}>
  {loading ? "Loading..." : "Load Data"}
</Button>
```

**예상 코드 감소**: 150줄 → 20줄

#### 2.2. useListData로 컬럼 선택 관리

**제거할 코드**:
```typescript
// Line 48: 수동 state
const [localColumns, setLocalColumns] = useState<string[]>(config.columns || []);

// 컬럼 토글 핸들러
const handleColumnToggle = (column: string, checked: boolean) => {
  if (checked) {
    setLocalColumns([...localColumns, column]);
  } else {
    setLocalColumns(localColumns.filter(c => c !== column));
  }
};
```

**추가할 코드**:
```typescript
import { useListData } from 'react-stately';

const selectedColumnsList = useListData({
  initialItems: (config.columns || []).map(col => ({
    id: col,
    key: col,
    selected: true,
  })),
  getKey: (item) => item.id,
});

// 컬럼 토글
const handleColumnToggle = (columnKey: string, checked: boolean) => {
  if (checked) {
    selectedColumnsList.append({ id: columnKey, key: columnKey, selected: true });
  } else {
    selectedColumnsList.remove(columnKey);
  }
};

// Apply 버튼에서 사용
const selectedColumns = selectedColumnsList.items.map(item => item.key);
onChange({
  ...config,
  columns: selectedColumns,
});
```

**예상 코드 감소**: 50줄 → 30줄

#### 2.3. 완료 후 검증

**체크리스트**:
- [ ] TypeScript 컴파일 에러 없음 (`npx tsc --noEmit`)
- [ ] Load Data 버튼 클릭 시 컬럼 로딩 정상 작동
- [ ] MOCK_DATA 엔드포인트 테스트 (`/countries`, `/products` 등)
- [ ] 실제 API 엔드포인트 테스트
- [ ] 컬럼 선택/해제 정상 작동
- [ ] Apply 버튼 클릭 시 config 업데이트 확인
- [ ] 개발 서버 에러 없음

### Step 3: SupabaseCollectionEditor 리팩토링

**파일**: `src/builder/inspector/data/SupabaseCollectionEditor.tsx`

**전략**: APICollectionEditor와 동일한 패턴 적용

1. Supabase 클라이언트로 데이터 로딩
2. detectColumnsFromData로 컬럼 자동 감지
3. useListData로 컬럼 선택 관리

**Supabase용 hook**: 필요 시 `useSupabaseColumnLoader` 생성

```typescript
export function useSupabaseColumnLoader(options: {
  table: string;
  columns?: string[];
}) {
  const columnList = useAsyncList<ColumnListItem>({
    async load({ signal }) {
      const { data, error } = await supabase
        .from(options.table)
        .select('*')
        .limit(10);

      if (error) throw error;

      const columnMapping = detectColumnsFromData(data);
      // ... 나머지 로직
    },
  });

  return {
    columns: columnList.items,
    isLoading: columnList.isLoading,
    error: columnList.error,
    loadColumns: columnList.reload,
  };
}
```

### Phase 2 완료 기준

- [ ] APICollectionEditor: 617줄 → ~350줄
- [ ] SupabaseCollectionEditor: ~500줄 → ~300줄
- [ ] TypeScript 에러 0개
- [ ] 모든 기능 정상 작동
- [ ] 문서 업데이트 완료
- [ ] Git 커밋 완료

**예상 커밋 수**: 4-6개
**예상 작업 시간**: 6-8시간

---

## Phase 3: Sidebar Tree

### 목표

Sidebar의 요소 트리를 useTreeData로 관리하여 드래그앤드롭, 폴딩/펼치기 자동화

### 현재 구조

**파일**: `src/builder/sidebar/LayerTree.tsx` (추정)

**현재 패턴**:
- 수동 useState로 expanded 상태 관리
- 수동 드래그앤드롭 로직
- 수동 요소 추가/삭제 처리

### 리팩토링 계획

#### 3.1. useTreeData 적용

```typescript
import { useTreeData } from 'react-stately';
import type { TreeDataItem } from '@/types/stately';

interface ElementTreeItem extends TreeDataItem {
  id: string;
  tag: string;
  customId?: string;
  children?: ElementTreeItem[];
}

const tree = useTreeData<ElementTreeItem>({
  initialItems: buildTreeFromElements(elements),
  getKey: (item) => item.id,
  getChildren: (item) => item.children,
});

// CRUD 자동 제공
tree.append(parentKey, newElement);
tree.remove(elementKey);
tree.move(elementKey, newParentKey, index);
```

#### 3.2. useTreeState로 확장/선택 관리

```typescript
import { useTreeState } from 'react-stately';

const treeState = useTreeState({
  collection: tree.items,
  selectionMode: 'single',
  expandedKeys: new Set(expandedElementIds),
  onExpandedChange: (keys) => {
    // 확장 상태 저장
  },
  onSelectionChange: (keys) => {
    const selectedId = Array.from(keys)[0];
    setSelectedElement(selectedId);
  },
});

// 자동 제공되는 상태
treeState.expandedKeys; // Set<Key>
treeState.toggleKey(elementId); // 펼치기/접기
treeState.selectionManager.selectedKeys; // 선택된 요소
```

#### 3.3. 드래그앤드롭 통합

```typescript
// React Aria의 useDrag, useDrop과 통합
const { dragProps } = useDrag({
  getItems: () => [{
    'element-id': elementId,
  }],
});

const { dropProps } = useDrop({
  onDrop: (e) => {
    const elementId = e.items[0]['element-id'];
    tree.move(elementId, dropTargetId, index);
  },
});
```

### Phase 3 완료 기준

- [ ] LayerTree useTreeData 적용
- [ ] 드래그앤드롭 정상 작동
- [ ] 펼치기/접기 정상 작동
- [ ] 요소 선택 정상 작동
- [ ] TypeScript 에러 0개
- [ ] 문서 업데이트

**예상 작업 시간**: 2-3시간

---

## Phase 4-8: 추가 개선

### Phase 4: Components List (useListState)

**대상**: `src/builder/sidebar/ComponentList.tsx` (추정)

**적용**: useListState로 컴포넌트 목록 관리

```typescript
const componentList = useListState({
  items: availableComponents,
  selectionMode: 'single',
});
```

**예상 시간**: 1-2시간

### Phase 5: Properties Section (useListData)

**대상**: Properties에서 리스트 형태로 관리되는 속성들

**적용**: 동적 속성 리스트 관리

**예상 시간**: 2-3시간

### Phase 6: Hooks Refactoring (useAsyncList)

**대상**: 커스텀 훅들에서 비동기 로딩 패턴

**적용**: useAsyncList로 통일

**예상 시간**: 2-3시간

### Phase 7: Data Fetching (useAsyncList)

**대상**: Preview에서 데이터 페칭

**적용**: Collection 컴포넌트 데이터 로딩

**예상 시간**: 2-3시간

### Phase 8: Final Optimization

**작업**:
- 코드 정리
- 문서 업데이트
- 성능 측정
- 최종 테스트

**예상 시간**: 1-2시간

---

## 체크리스트

### 작업 재개 시

- [ ] Git pull 최신 상태 확인
- [ ] npm install 의존성 확인
- [ ] npm run dev 개발 서버 실행
- [ ] 이 문서 읽기 (PHASE_2_TO_8_EXECUTION_GUIDE.md)
- [ ] REACT_STATELY_PROGRESS.md 확인

### Phase 2 시작 전

- [ ] docs/PHASE_2_ANALYSIS.md 읽기
- [ ] src/types/stately.ts의 ColumnListItem 타입 확인
- [ ] APICollectionEditor.tsx 현재 구조 파악
- [ ] useColumnLoader hook 생성 위치 확인

### 각 Phase 완료 시

- [ ] TypeScript 컴파일 (`npx tsc --noEmit`)
- [ ] 기능 테스트 (개발 서버에서 실제 동작 확인)
- [ ] Git 커밋 (feat: 메시지 형식)
- [ ] 문서 업데이트 (REACT_STATELY_PROGRESS.md)

### 전체 완료 시

- [ ] 모든 Phase 완료 확인
- [ ] 최종 문서 업데이트
- [ ] Git 태그 생성 (v2.0.0-react-stately)
- [ ] 성과 요약 문서 작성

---

## 참고 문서

1. **REACT_STATELY_REFACTORING_PLAN.md** - 전체 8 Phase 계획
2. **REACT_STATELY_PROGRESS.md** - 진행 상황 추적
3. **PHASE_2_ANALYSIS.md** - Phase 2 상세 분석
4. **INSPECTOR_ARCHITECTURE_ANALYSIS.md** - Inspector 구조 분석

---

**작성**: Claude Code
**날짜**: 2025-11-09
**다음 작업자를 위한 메시지**:

Phase 1이 성공적으로 완료되었습니다! 4개의 버그를 모두 수정했고, React Stately 패턴이 잘 작동하고 있습니다. Phase 2는 이 패턴을 Data 섹션에 적용하는 것입니다. useColumnLoader hook부터 시작하시면 됩니다. 화이팅!
