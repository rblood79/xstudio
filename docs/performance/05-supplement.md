# 보완 제안 (추가 검토 결과)

> **관련 문서**: [04-phase-5-8.md](./04-phase-5-8.md) | [06-implementation.md](./06-implementation.md)
> **작성자**: Antigravity AI
> **최종 수정**: 2025-12-10

본 문서는 기존 최적화 계획에서 식별된 공백을 보완하기 위한 추가 제안 사항입니다.

---

## 1. 캔버스 가상화 (Canvas Virtualization) - P0 필수

### 1.1 제안 배경

현재 `LayoutRenderers.tsx` 등 캔버스 렌더러는 전달받은 모든 자식 요소를 DOM에 렌더링합니다.

- **현황**: 5,000개 요소가 있는 페이지를 로드하면, 5,000개의 DOM 노드가 생성
- **문제**: 브라우저의 Layout/Paint 연산 비용이 기하급수적으로 증가하여, 단순 스크롤이나 드래그 시에도 FPS가 10 이하로 떨어지는 'Jank' 현상 발생
- Phase 4(Delta Update)로 데이터 전송량을 줄여도, **최종 렌더링 비용**은 줄어들지 않음

### 1.2 목적

- **DOM 노드 최소화**: 화면에 보이지 않는 요소는 DOM에서 제거하여 브라우저 메모리 및 렌더링 부하 감소
- **일관된 FPS 유지**: 요소가 1,000개든 10,000개든 화면에 표시되는 수(예: 50개)만큼만 렌더링하여 60fps 유지

### 1.3 상세 구현 방안

#### List/Grid 가상화

- `@tanstack/react-virtual` 라이브러리 활용 (이미 의존성 존재)
- `Box`, `Flex`, `Grid` 등 컨테이너 컴포넌트 렌더러 내부에서 자식 요소가 일정 수(예: 50개) 이상일 경우 `useVirtualizer` 훅을 조건부로 활성화
- 스크롤 컨테이너의 높이를 계산하고, 현재 스크롤 위치에 해당하는 아이템만 렌더링

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedContainer({ children, parentRef }: Props) {
  const virtualizer = useVirtualizer({
    count: children.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <div
          key={virtualItem.key}
          style={{
            position: 'absolute',
            top: virtualItem.start,
            height: virtualItem.size,
          }}
        >
          {children[virtualItem.index]}
        </div>
      ))}
    </div>
  );
}
```

#### Viewport Culling (자유 배치형)

- Absolute Positioning을 사용하는 캔버스의 경우, `IntersectionObserver` 또는 좌표 기반 계산을 통해 뷰포트 영역과 겹치는 요소만 필터링하여 렌더링

### 1.4 리스크 및 완화

| 리스크 | 완화 방안 |
|--------|----------|
| 깜빡임(Flicker) | `overscan` 옵션을 충분히 주어 스크롤 방향의 요소를 미리 렌더링 |
| 동적 높이 계산 어려움 | `estimateSize`를 보수적으로 설정, `measureElement`로 동적 측정 |

---

## 2. 웹 워커 오프로딩 (Web Worker Offloading) - P1 권장

### 2.1 제안 배경

Phase 2(인덱싱)와 Phase 3(History Diff)는 대량의 데이터 연산을 필요로 합니다.

- **현황**: 모든 로직이 메인 스레드(UI 스레드)에서 실행
- **문제**: 5,000개 요소의 Diff를 계산하거나 인덱스를 재구축하는 동안(약 50~200ms 소요), UI가 멈추거나 버벅거림. 특히 드래그 앤 드롭 같은 실시간 상호작용 중에 치명적

### 2.2 목적

- **UI 스레드 해방**: 무거운 연산을 백그라운드 스레드로 격리하여, 데이터 처리 중에도 UI는 즉각적으로 반응
- **병렬 처리**: 멀티코어 CPU를 활용하여 데이터 처리 속도 향상

### 2.3 상세 구현 방안

#### Worker 모듈 분리

**파일**: `src/workers/data.worker.ts`

```typescript
// Diff 알고리즘, 인덱스 구축 로직, 대용량 JSON 파싱 로직을 Worker로 이동
import { expose } from 'comlink';

const workerApi = {
  calculateDiff(prev: Element[], next: Element[]) {
    // Heavy diff computation
    const changes: DeltaUpdate[] = [];
    // ... computation logic
    return changes;
  },

  buildIndex(elements: Element[]) {
    // Heavy index building
    const index = new Map<string, Set<string>>();
    // ... indexing logic
    return index;
  },

  parseJson(jsonString: string) {
    // Heavy JSON parsing
    return JSON.parse(jsonString);
  }
};

expose(workerApi);
```

#### 통신 인터페이스

`comlink` 라이브러리를 도입하여 Worker 통신을 비동기 함수 호출처럼 추상화 (RPC 스타일):

```typescript
import { wrap } from 'comlink';

const worker = new Worker(new URL('./data.worker.ts', import.meta.url));
const workerApi = wrap<typeof import('./data.worker').workerApi>(worker);

// 사용: 일반 async 함수처럼 호출
const diff = await workerApi.calculateDiff(prevElements, nextElements);
```

### 2.4 리스크 및 완화

| 리스크 | 완화 방안 |
|--------|----------|
| 직렬화 오버헤드 | `SharedArrayBuffer` 고려, Delta 패턴 유지 |
| 디버깅 복잡도 | 개발 모드에서는 메인 스레드 동작 설정 |

---

## 3. 에셋 최적화 (Asset Lazy Loading) - P2 보통

### 3.1 제안 배경

엔터프라이즈 프로젝트는 다수의 고해상도 이미지를 포함할 가능성이 높습니다.

- **현황**: 현재 `Image` 컴포넌트 렌더러가 명확하지 않으며, 일반 `<img>` 태그 사용 시 페이지 로드 즉시 모든 이미지를 다운로드
- **문제**: 초기 로딩 시 네트워크 대역폭을 포화시켜 정작 중요한 데이터(JSON) 로딩이 지연되고, 메모리 사용량이 급증

### 3.2 목적

- **초기 로딩 속도 향상**: 뷰포트에 없는 이미지는 로드하지 않아 LCP(Largest Contentful Paint) 및 TTI(Time to Interactive) 개선
- **네트워크 효율화**: 불필요한 데이터 전송 방지

### 3.3 상세 구현 방안

#### Image 렌더러 구현

**파일**: `src/canvas/renderers/MediaRenderers.tsx`

```tsx
function ImageRenderer({ element }: RendererProps) {
  const { src, alt, ...rest } = element.props;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"      // Native lazy loading
      decoding="async"    // Async decoding
      {...rest}
    />
  );
}
```

#### 스켈레톤 UI

이미지 로딩 전까지 표시할 경량 스켈레톤(Placeholder) 적용:

```tsx
function LazyImage({ src, alt, ...rest }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="lazy-image-container">
      {!loaded && <Skeleton className="image-skeleton" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
        {...rest}
      />
    </div>
  );
}
```

### 3.4 리스크 및 완화

| 리스크 | 완화 방안 |
|--------|----------|
| 스크롤 시 이미지 지연 | `IntersectionObserver`의 `rootMargin`을 크게 주어 미리 로딩 |

---

## 4. 종합 우선순위 제안

| 우선순위 | 항목 | 구현 난이도 | 예상 효과 | 비고 |
|:---------|:-----|:-----------|:---------|:-----|
| **P0 (필수)** | **캔버스 가상화** | 상 | **렌더링 성능 해결의 유일한 열쇠** | 미적용 시 5,000개 요소 렌더링 불가 |
| **P1 (권장)** | **웹 워커** | 상 | UX 반응성(Responsiveness) 확보 | 드래그 등 인터랙션 품질 결정 |
| **P2 (보통)** | **에셋 최적화** | 하 | 초기 로딩 속도 개선 | 구현 비용 대비 효과 좋음 |

---

## 5. 결론

기존 계획의 Phase 4(Canvas Delta)와 병행하여 **P0 캔버스 가상화**를 즉시 착수해야 합니다.

이는 선택 사항이 아닌 **엔터프라이즈급 성능을 위한 필수 전제 조건**입니다.

---

> **다음 문서**: [06-implementation.md](./06-implementation.md) - 구현 순서 및 체크리스트
