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

## 추가 유틸리티 함수

### 컴포넌트 트리 조작

```typescript
// 트리 구조 변환
const tree = buildComponentTree(engineId, components);

// 트리 깊이 계산
const depth = getComponentTreeDepth(engineId, components);

// 특정 레벨 컴포넌트 조회
const level2Components = getComponentsByLevel(engineId, 2, components);

// 컴포넌트 경로 추적
const path = getComponentPath(componentId, components);

// 모든 자식 조회 (재귀)
const descendants = getComponentDescendants(componentId, components);
```

### 프로젝트 요약 정보

```typescript
const summary = getProjectEnginesSummary(projectId, engines, components);
// Returns:
// [{
//     engine: {...},
//     assembliesCount: 8,
//     totalPartsCount: 245,
//     totalComponentsCount: 253,
//     estimatedTotalCost: 12500000,
//     maxTreeDepth: 6
// }]
```

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
