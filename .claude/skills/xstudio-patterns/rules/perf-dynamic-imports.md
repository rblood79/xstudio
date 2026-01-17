---
title: Use Dynamic Imports for Heavy Components
impact: MEDIUM
impactDescription: 초기 로드 시간 단축, 코드 분할
tags: [performance, imports, lazy-loading]
---

무거운 컴포넌트와 라이브러리는 동적 import로 지연 로드합니다.

## Incorrect

```tsx
// ❌ 정적 import - 초기 번들에 포함
import { MonacoEditor } from '@/components/MonacoEditor';  // ~2MB
import { PDFViewer } from '@/components/PDFViewer';        // ~1MB
import * as THREE from 'three';                            // ~500KB

function App() {
  const [showEditor, setShowEditor] = useState(false);

  return showEditor ? <MonacoEditor /> : <Button onClick={() => setShowEditor(true)} />;
}
```

## Correct

```tsx
// ✅ React.lazy로 컴포넌트 지연 로드
import { lazy, Suspense } from 'react';

const MonacoEditor = lazy(() => import('@/components/MonacoEditor'));
const PDFViewer = lazy(() => import('@/components/PDFViewer'));

function App() {
  const [showEditor, setShowEditor] = useState(false);

  return showEditor ? (
    <Suspense fallback={<Skeleton />}>
      <MonacoEditor />
    </Suspense>
  ) : (
    <Button onClick={() => setShowEditor(true)} />
  );
}

// ✅ 라이브러리 동적 import
async function render3DPreview(canvas: HTMLCanvasElement) {
  const THREE = await import('three');
  const scene = new THREE.Scene();
  // ...
}

// ✅ 조건부 로드
if (process.env.NODE_ENV === 'development') {
  import('./devtools').then(({ initDevtools }) => initDevtools());
}
```
