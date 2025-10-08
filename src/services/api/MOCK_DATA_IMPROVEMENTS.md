# Mock 데이터 생성기 개선사항

## 적용된 개선사항

### 1. ✅ 에러 처리 및 성능 모니터링 (mockLargeDataV2.ts)

#### `generateCmsMockData` 함수 개선

```typescript
const generateCmsMockData = (...) => {
    // ✅ 성능 측정 시작
    console.time('⏱️ Mock 데이터 생성');

    try {
        // ... 데이터 생성 로직

        // ✅ 통계 출력
        console.timeEnd('⏱️ Mock 데이터 생성');
        console.log(`📊 생성된 데이터 통계: ...`);

        return { ... };
    } catch (error) {
        // ✅ 에러 핸들링
        console.error('❌ Mock 데이터 생성 실패:', error);
        throw new Error(`Mock 데이터 생성 중 오류 발생: ${error}`);
    }
};
```

**효과:**

- 데이터 생성 시간 측정
- 생성된 데이터 통계 자동 출력
- 에러 발생 시 상세 정보 제공

---

### 2. ⚠️ 재귀 깊이 안전장치 (제공하신 코드에 추가 필요)

#### `generateComponentsRecursive` 함수에 추가할 코드

```typescript
const generateComponentsRecursive = (...): MockComponent[] => {
    // ✅ 재귀 깊이 안전장치
    if (depth > maxDepth * 2) {
        console.warn(`⚠️ 재귀 깊이 초과 (현재: ${depth}, 최대: ${maxDepth * 2}), 강제 종료`);
        return [];
    }

    // ... 기존 로직
};
```

**효과:**

- 스택 오버플로우 방지
- 무한 재귀 방지
- 디버깅 시 경고 메시지 제공

---

### 3. ✅ BOM 생성 옵션 확장 (제공하신 코드에 이미 포함)

```typescript
const generateCmsMockData = (
  options?: Partial<{
    organizationCount: number;
    projectCount: number;
    userCount: number;
    bomMaxDepth?: number;
    bomMinChildrenPerNode?: number;
    bomMaxChildrenPerNode?: number;
    bomTopLevelAssemblies?: number[];
    bomAssemblyProbability?: number;
  }>
) => {
  const config = {
    // ... 기본값
    bomMaxDepth: 5,
    bomMinChildrenPerNode: 2,
    bomMaxChildrenPerNode: 4,
    bomTopLevelAssemblies: [4, 7],
    bomAssemblyProbability: 0.8,
    ...options,
  };

  const components = generateMockComponents(engines, {
    maxDepth: config.bomMaxDepth,
    minChildrenPerNode: config.bomMinChildrenPerNode,
    maxChildrenPerNode: config.bomMaxChildrenPerNode,
    topLevelAssemblies: config.bomTopLevelAssemblies,
    assemblyProbability: config.bomAssemblyProbability,
  });
};
```

**효과:**

- BOM 트리 깊이 조절 가능
- 자식 노드 개수 범위 설정
- 어셈블리/파트 비율 조정

---

## 사용 예시

### 기본 사용

```typescript
const data = generateCmsMockData();
// 콘솔 출력:
// ⏱️ Mock 데이터 생성: 1234.56ms
// 📊 생성된 데이터 통계:
//   - Organizations: 10
//   - Users: 10000
//   ...
```

### 커스텀 옵션으로 생성

```typescript
const customData = generateCmsMockData({
  organizationCount: 20,
  userCount: 50000,
  projectCount: 100,
  bomMaxDepth: 7, // 더 깊은 BOM 트리
  bomMinChildrenPerNode: 3,
  bomMaxChildrenPerNode: 6,
  bomAssemblyProbability: 0.9, // 더 많은 어셈블리
});
```

### 에러 처리

```typescript
try {
  const data = generateCmsMockData({ userCount: 1000000 });
} catch (error) {
  console.error("데이터 생성 실패:", error);
  // 대체 로직 실행
}
```

---

## 📚 함수별 상세 사용법

### 1. `buildComponentTree(engineId, components)`

**목적:** 특정 엔진의 모든 컴포넌트를 계층적 트리 구조로 변환

**파라미터:**

- `engineId: string` - 엔진 ID
- `components: MockComponent[]` - 전체 컴포넌트 배열

**반환값:** `TreeNode[]` (children 속성을 포함한 트리 노드 배열)

**사용 예시:**

```typescript
import {
  mockEngines,
  mockComponents,
  buildComponentTree,
} from "@/services/api";

// 첫 번째 엔진의 트리 구조 생성
const engineId = mockEngines[0].id;
const tree = buildComponentTree(engineId, mockComponents);

// 트리 구조 출력
console.log(tree);
// [
//   {
//     id: 'comp_abc123',
//     name: '동력 전달 시스템',
//     type: 'assembly',
//     level: 0,
//     children: [
//       {
//         id: 'comp_def456',
//         name: '변속기',
//         type: 'part',
//         level: 1,
//         children: []
//       },
//       // ... 더 많은 자식 노드
//     ]
//   }
// ]

// React 컴포넌트에서 렌더링
function BOMTree({ engineId }: { engineId: string }) {
  const tree = buildComponentTree(engineId, mockComponents);

  return (
    <ul>
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </ul>
  );
}
```

---

### 2. `getProjectEnginesSummary(projectId, engines, components)`

**목적:** 프로젝트의 모든 엔진과 BOM 요약 정보 조회

**파라미터:**

- `projectId: string` - 프로젝트 ID
- `engines: MockEngine[]` - 전체 엔진 배열
- `components: MockComponent[]` - 전체 컴포넌트 배열

**반환값:** 엔진별 요약 정보 배열

```typescript
Array<{
  engine: MockEngine;
  assembliesCount: number; // 최상위 어셈블리 개수
  totalPartsCount: number; // 전체 부품 개수
  totalComponentsCount: number; // 전체 컴포넌트 개수
  estimatedTotalCost: number; // 총 예상 비용
  maxTreeDepth: number; // 최대 트리 깊이
}>;
```

**사용 예시:**

```typescript
import {
  mockProjects,
  mockEngines,
  mockComponents,
  getProjectEnginesSummary,
} from "@/services/api";

const projectId = mockProjects[0].id;
const summary = getProjectEnginesSummary(
  projectId,
  mockEngines,
  mockComponents
);

console.log(summary);
// [
//   {
//     engine: { id: 'eng_123', name: '전기 모터 A형', ... },
//     assembliesCount: 6,
//     totalPartsCount: 142,
//     totalComponentsCount: 148,
//     estimatedTotalCost: 8750000,
//     maxTreeDepth: 5
//   },
//   { ... }
// ]

// 대시보드에서 표시
function ProjectDashboard({ projectId }: { projectId: string }) {
  const summary = getProjectEnginesSummary(
    projectId,
    mockEngines,
    mockComponents
  );

  return (
    <div>
      <h2>프로젝트 BOM 요약</h2>
      {summary.map(
        ({ engine, assembliesCount, totalPartsCount, estimatedTotalCost }) => (
          <Card key={engine.id}>
            <h3>{engine.name}</h3>
            <p>어셈블리: {assembliesCount}개</p>
            <p>부품: {totalPartsCount}개</p>
            <p>예상 비용: ₩{estimatedTotalCost.toLocaleString()}</p>
          </Card>
        )
      )}
    </div>
  );
}
```

---

### 3. `getComponentTreeDepth(engineId, components)`

**목적:** 특정 엔진의 BOM 트리 최대 깊이 계산

**파라미터:**

- `engineId: string` - 엔진 ID
- `components: MockComponent[]` - 전체 컴포넌트 배열

**반환값:** `number` (트리 깊이, 루트는 1)

**사용 예시:**

```typescript
import {
  mockEngines,
  mockComponents,
  getComponentTreeDepth,
} from "@/services/api";

const engineId = mockEngines[0].id;
const depth = getComponentTreeDepth(engineId, mockComponents);

console.log(`BOM 트리 깊이: ${depth}`); // BOM 트리 깊이: 5

// 복잡도에 따라 시각화 방식 변경
function BOMVisualization({ engineId }: { engineId: string }) {
  const depth = getComponentTreeDepth(engineId, mockComponents);

  if (depth > 7) {
    return <SimplifiedView engineId={engineId} />;
  } else if (depth > 4) {
    return <CollapsibleTreeView engineId={engineId} />;
  } else {
    return <FullTreeView engineId={engineId} />;
  }
}
```

---

### 4. `getComponentsByLevel(engineId, level, components)`

**목적:** 특정 레벨의 모든 컴포넌트 조회

**파라미터:**

- `engineId: string` - 엔진 ID
- `level: number` - 트리 레벨 (0: 최상위)
- `components: MockComponent[]` - 전체 컴포넌트 배열

**반환값:** `MockComponent[]` (해당 레벨의 컴포넌트 배열)

**사용 예시:**

```typescript
import {
  mockEngines,
  mockComponents,
  getComponentsByLevel,
} from "@/services/api";

const engineId = mockEngines[0].id;

// 최상위 어셈블리 (Level 0)
const topAssemblies = getComponentsByLevel(engineId, 0, mockComponents);
console.log(`최상위 어셈블리: ${topAssemblies.length}개`);

// Level 2 컴포넌트
const level2 = getComponentsByLevel(engineId, 2, mockComponents);
console.log(`Level 2 컴포넌트: ${level2.length}개`);

// 레벨별 통계 생성
function BOMStatistics({ engineId }: { engineId: string }) {
  const maxDepth = getComponentTreeDepth(engineId, mockComponents);
  const levelStats = Array.from({ length: maxDepth }, (_, level) => ({
    level,
    count: getComponentsByLevel(engineId, level, mockComponents).length,
  }));

  return (
    <table>
      <thead>
        <tr>
          <th>레벨</th>
          <th>컴포넌트 수</th>
        </tr>
      </thead>
      <tbody>
        {levelStats.map(({ level, count }) => (
          <tr key={level}>
            <td>Level {level}</td>
            <td>{count}개</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 5. `getComponentPath(componentId, components)`

**목적:** 루트부터 특정 컴포넌트까지의 전체 경로 추적

**파라미터:**

- `componentId: string` - 컴포넌트 ID
- `components: MockComponent[]` - 전체 컴포넌트 배열

**반환값:** `MockComponent[]` (루트부터 해당 컴포넌트까지의 경로)

**사용 예시:**

```typescript
import { mockComponents, getComponentPath } from "@/services/api";

// 특정 부품의 전체 경로 조회
const componentId = "comp_xyz789";
const path = getComponentPath(componentId, mockComponents);

console.log("컴포넌트 경로:");
path.forEach((comp, idx) => {
  console.log(`  ${"  ".repeat(idx)}└─ ${comp.name} (${comp.code})`);
});
// 출력:
// └─ 동력 전달 시스템 (ASM-123-1)
//   └─ 변속기 서브어셈블리 1 (SUB-456-1-0)
//     └─ 클러치 (PRT-78901)

// Breadcrumb 네비게이션
function ComponentBreadcrumb({ componentId }: { componentId: string }) {
  const path = getComponentPath(componentId, mockComponents);

  return (
    <nav>
      {path.map((comp, idx) => (
        <span key={comp.id}>
          <a href={`/component/${comp.id}`}>{comp.name}</a>
          {idx < path.length - 1 && " > "}
        </span>
      ))}
    </nav>
  );
}
```

---

### 6. `getComponentDescendants(componentId, components)`

**목적:** 특정 컴포넌트의 모든 하위 컴포넌트 조회 (재귀)

**파라미터:**

- `componentId: string` - 컴포넌트 ID
- `components: MockComponent[]` - 전체 컴포넌트 배열

**반환값:** `MockComponent[]` (모든 자손 컴포넌트)

**사용 예시:**

```typescript
import { mockComponents, getComponentDescendants } from "@/services/api";

const assemblyId = "comp_abc123";
const descendants = getComponentDescendants(assemblyId, mockComponents);

console.log(`총 하위 컴포넌트: ${descendants.length}개`);

// 타입별 분류
const parts = descendants.filter((c) => c.type === "part");
const assemblies = descendants.filter((c) => c.type === "assembly");

console.log(`  - 부품: ${parts.length}개`);
console.log(`  - 어셈블리: ${assemblies.length}개`);

// 총 비용 계산
const totalCost = descendants.reduce((sum, c) => sum + c.cost * c.quantity, 0);
console.log(`총 비용: ₩${totalCost.toLocaleString()}`);

// 컴포넌트 삭제 시 영향도 분석
function DeleteConfirmation({ componentId }: { componentId: string }) {
  const component = mockComponents.find((c) => c.id === componentId);
  const descendants = getComponentDescendants(componentId, mockComponents);

  return (
    <Dialog>
      <h3>⚠️ 삭제 확인</h3>
      <p>
        <strong>{component?.name}</strong>을(를) 삭제하시겠습니까?
      </p>
      <p>
        이 작업은 <strong>{descendants.length}개</strong>의 하위 컴포넌트도 함께
        삭제합니다.
      </p>
      <Button variant="danger">삭제</Button>
      <Button variant="outline">취소</Button>
    </Dialog>
  );
}
```

---

### 7. `generateCmsMockData(options?)`

**목적:** CMS Mock 데이터 생성 (모든 엔티티 포함)

**파라미터:**

```typescript
options?: Partial<{
  organizationCount: number;        // 조직 개수 (기본: 10)
  projectCount: number;             // 프로젝트 개수 (기본: 60)
  userCount: number;                // 사용자 개수 (기본: 10000)
  bomMaxDepth: number;              // BOM 최대 깊이 (기본: 5)
  bomMinChildrenPerNode: number;    // 최소 자식 노드 (기본: 2)
  bomMaxChildrenPerNode: number;    // 최대 자식 노드 (기본: 4)
  bomTopLevelAssemblies: number[];  // 최상위 어셈블리 범위 (기본: [4, 7])
  bomAssemblyProbability: number;   // 어셈블리 확률 (기본: 0.8)
}>
```

**반환값:** `CmsMockData` (모든 엔티티 포함)

**사용 예시:**

```typescript
import { generateCmsMockData } from "@/services/api/mockLargeDataV2";

// 기본 설정으로 생성
const data = generateCmsMockData();
console.log(data.users.length); // 10000
console.log(data.engines.length); // 약 90개 (프로젝트당 1-3개)
console.log(data.components.length); // 수천 개

// 소규모 테스트 데이터
const testData = generateCmsMockData({
  organizationCount: 3,
  projectCount: 10,
  userCount: 100,
  bomMaxDepth: 3,
  bomMinChildrenPerNode: 1,
  bomMaxChildrenPerNode: 2,
});

// 대용량 프로덕션 데이터
const productionData = generateCmsMockData({
  organizationCount: 50,
  projectCount: 500,
  userCount: 100000,
  bomMaxDepth: 4, // 성능 고려
  bomMinChildrenPerNode: 2,
  bomMaxChildrenPerNode: 3,
});

// 복잡한 BOM 구조 생성
const complexBOM = generateCmsMockData({
  bomMaxDepth: 7,
  bomMinChildrenPerNode: 3,
  bomMaxChildrenPerNode: 6,
  bomTopLevelAssemblies: [6, 8], // 최상위 어셈블리 6-8개
  bomAssemblyProbability: 0.9, // 90% 확률로 어셈블리 (더 많은 계층)
});
```

---

## 🎯 실전 활용 예시

### 예시 1: BOM 뷰어 컴포넌트

```typescript
import {
  mockEngines,
  mockComponents,
  buildComponentTree,
  getComponentTreeDepth,
} from "@/services/api";

function BOMViewer({ engineId }: { engineId: string }) {
  const tree = buildComponentTree(engineId, mockComponents);
  const depth = getComponentTreeDepth(engineId, mockComponents);

  return (
    <div>
      <h2>BOM 구조 (깊이: {depth})</h2>
      <TreeView nodes={tree} />
    </div>
  );
}

function TreeView({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>
          <span>
            {node.type === "assembly" ? "📦" : "🔩"} {node.name} - ₩
            {node.cost.toLocaleString()}
          </span>
          {node.children.length > 0 && <TreeView nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}
```

### 예시 2: 프로젝트 대시보드

```typescript
import {
  mockProjects,
  mockEngines,
  mockComponents,
  getProjectEnginesSummary,
} from "@/services/api";

function ProjectDashboard() {
  return (
    <div>
      {mockProjects.slice(0, 10).map((project) => {
        const summary = getProjectEnginesSummary(
          project.id,
          mockEngines,
          mockComponents
        );

        const totalCost = summary.reduce(
          (sum, s) => sum + s.estimatedTotalCost,
          0
        );
        const totalParts = summary.reduce(
          (sum, s) => sum + s.totalPartsCount,
          0
        );

        return (
          <Card key={project.id}>
            <h3>{project.name}</h3>
            <p>엔진: {summary.length}개</p>
            <p>총 부품: {totalParts}개</p>
            <p>예상 비용: ₩{totalCost.toLocaleString()}</p>
            <p>예산: ₩{project.budget.toLocaleString()}</p>
            <p>예산 대비: {((totalCost / project.budget) * 100).toFixed(1)}%</p>
          </Card>
        );
      })}
    </div>
  );
}
```

### 예시 3: 컴포넌트 검색

```typescript
import {
  mockComponents,
  getComponentPath,
  getComponentDescendants,
} from "@/services/api";

function ComponentSearch({ searchTerm }: { searchTerm: string }) {
  const results = mockComponents.filter(
    (c) =>
      c.name.includes(searchTerm) ||
      c.code.includes(searchTerm) ||
      c.supplier.includes(searchTerm)
  );

  return (
    <div>
      <h3>검색 결과: {results.length}개</h3>
      {results.map((component) => {
        const path = getComponentPath(component.id, mockComponents);
        const descendants =
          component.type === "assembly"
            ? getComponentDescendants(component.id, mockComponents)
            : [];

        return (
          <Card key={component.id}>
            <h4>
              {component.type === "assembly" ? "📦" : "🔩"} {component.name}
            </h4>
            <p>코드: {component.code}</p>
            <p>공급업체: {component.supplier}</p>
            <p>비용: ₩{component.cost.toLocaleString()}</p>
            <p>경로: {path.map((p) => p.name).join(" > ")}</p>
            {descendants.length > 0 && (
              <p>하위 컴포넌트: {descendants.length}개</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

---

## 추가 유틸리티 함수

---

## 성능 고려사항

### 권장 설정 (10,000 유저 기준)

```typescript
{
    organizationCount: 10,
    projectCount: 60,
    userCount: 10000,
    bomMaxDepth: 5,  // 스택 오버플로우 방지
    bomMinChildrenPerNode: 2,
    bomMaxChildrenPerNode: 4,
}
```

### 대용량 데이터 생성 시

```typescript
{
    organizationCount: 50,
    projectCount: 500,
    userCount: 100000,  // 주의: 메모리 사용량 증가
    bomMaxDepth: 4,  // 깊이 제한 권장
    bomMinChildrenPerNode: 2,
    bomMaxChildrenPerNode: 3,
}
```

---

## 디버깅 팁

### 1. 콘솔 로그 활용

```typescript
// 데이터 생성 시 자동으로 통계 출력됨
const data = generateCmsMockData();
```

### 2. 재귀 깊이 모니터링

```typescript
// 경고 메시지가 나타나면 maxDepth 조정
// ⚠️ 재귀 깊이 초과 (현재: 12, 최대: 10), 강제 종료
```

### 3. BOM 트리 검증

```typescript
const depth = getComponentTreeDepth(engineId, components);
console.log(`BOM 트리 최대 깊이: ${depth}`);

const summary = getProjectEnginesSummary(projectId, engines, components);
console.table(summary);
```

---

## 마이그레이션 가이드

### 기존 코드에서 업그레이드

**Before:**

```typescript
const data = generateCmsMockData();
// 에러 처리 없음, 성능 측정 없음
```

**After:**

```typescript
try {
  const data = generateCmsMockData({
    userCount: 10000,
    bomMaxDepth: 5,
  });
  // ✅ 자동으로 성능 측정 및 통계 출력
} catch (error) {
  console.error("데이터 생성 실패:", error);
  // ✅ 에러 핸들링
}
```

---

## 알려진 제한사항

1. **재귀 깊이**: `maxDepth * 2`를 초과하면 강제 종료
2. **메모리**: 10만 유저 생성 시 약 500MB 메모리 사용
3. **성능**: 10만 유저 + BOM 생성 시 약 5-10초 소요

---

## 향후 개선 계획

- [ ] Worker Thread를 활용한 병렬 처리
- [ ] IndexedDB를 활용한 대용량 데이터 캐싱
- [ ] 점진적 데이터 로딩 (Lazy Loading)
- [ ] 데이터 유효성 검증 함수 추가
- [ ] TypeScript Strict Mode 적용

---

## 참고 자료

- [Mock 데이터 생성 전략](https://github.com/faker-js/faker)
- [재귀 함수 최적화](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function)
- [성능 측정 Best Practices](https://web.dev/user-centric-performance-metrics/)
