---
title: Error Boundary Required
impact: CRITICAL
impactDescription: 미처리 에러 = 흰 화면, 전체 앱 크래시
tags: [validation, error-handling, react]
---

모든 주요 UI 섹션에 Error Boundary를 적용합니다.

## Error Boundary 구조

```
App
├── ErrorBoundary (전역)
│   ├── Header
│   ├── ScopedErrorBoundary (사이드바)
│   │   └── Sidebar
│   ├── ScopedErrorBoundary (캔버스)
│   │   └── Canvas
│   └── ScopedErrorBoundary (인스펙터)
│       └── Inspector
```

## Incorrect

```tsx
// ❌ Error Boundary 없음
const App = () => (
  <div>
    <Header />
    <Sidebar />
    <Canvas />      {/* 에러 발생 시 전체 앱 크래시 */}
    <Inspector />
  </div>
);

// ❌ 단일 전역 Error Boundary만 사용
const App = () => (
  <ErrorBoundary>
    <Header />
    <Sidebar />
    <Canvas />      {/* 에러 시 전체 앱 fallback */}
    <Inspector />
  </ErrorBoundary>
);

// ❌ 비동기 에러 미처리
const loadData = async () => {
  const data = await fetch('/api/data');
  setData(data);  // fetch 실패 시 에러
};
```

## Correct

```tsx
import { ScopedErrorBoundary } from '@/builder/components/feedback/ScopedErrorBoundary';

// ✅ 섹션별 Error Boundary
const App = () => (
  <GlobalErrorBoundary fallback={<AppCrashScreen />}>
    <Header />

    <ScopedErrorBoundary
      fallback={<SidebarError onRetry={reloadSidebar} />}
      onError={(error) => logError('Sidebar', error)}
    >
      <Sidebar />
    </ScopedErrorBoundary>

    <ScopedErrorBoundary
      fallback={<CanvasError onRetry={reloadCanvas} />}
      onError={(error) => logError('Canvas', error)}
    >
      <Canvas />
    </ScopedErrorBoundary>

    <ScopedErrorBoundary
      fallback={<InspectorError onRetry={reloadInspector} />}
      onError={(error) => logError('Inspector', error)}
    >
      <Inspector />
    </ScopedErrorBoundary>
  </GlobalErrorBoundary>
);

// ✅ ScopedErrorBoundary 구현
interface ScopedErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ScopedErrorBoundary extends React.Component<
  ScopedErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ✅ 비동기 에러 처리
const useAsyncData = <T,>(fetcher: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [fetcher]);

  return { data, error, loading };
};

// ✅ TanStack Query 에러 처리
const { data, error, isError } = useQuery({
  queryKey: ['elements', pageId],
  queryFn: () => fetchElements(pageId),
  retry: 2,
  onError: (error) => {
    toast.error('요소를 불러오는데 실패했습니다');
    logError('fetchElements', error);
  },
});

if (isError) return <ErrorDisplay error={error} />;
```

## Fallback UI 가이드라인

```tsx
// ✅ 복구 가능한 fallback
const PanelErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="panel-error">
    <Icon name="warning" />
    <p>패널을 불러오는데 문제가 발생했습니다</p>
    <Button onPress={onRetry}>다시 시도</Button>
  </div>
);

// ✅ 최소 정보 표시
const MinimalErrorFallback = () => (
  <div className="error-minimal">
    <span>오류 발생</span>
  </div>
);
```

## 참조 파일

- `apps/builder/src/builder/components/feedback/ScopedErrorBoundary.tsx`
- `apps/builder/src/builder/components/feedback/ScopedErrorBoundary.css`
