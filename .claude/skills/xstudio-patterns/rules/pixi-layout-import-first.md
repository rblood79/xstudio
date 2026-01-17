---
title: Import @pixi/layout Before Other PIXI Modules
impact: CRITICAL
impactDescription: 레이아웃 시스템 초기화, 스타일 적용 보장
tags: [pixi, layout, import]
---

@pixi/layout을 다른 PIXI 모듈보다 먼저 import합니다.

## Incorrect

```tsx
// ❌ 잘못된 import 순서
import { Container, Sprite } from 'pixi.js';
import { Text } from '@pixi/text';
import '@pixi/layout';  // 너무 늦은 import - 스타일이 적용되지 않을 수 있음

function PixiComponent() {
  return <Container style={{ flexDirection: 'row' }} />;  // style이 무시될 수 있음
}
```

## Correct

```tsx
// ✅ @pixi/layout을 최상단에 import
import '@pixi/layout';  // 반드시 첫 번째!
import { Container, Sprite } from 'pixi.js';
import { Text } from '@pixi/text';

function PixiComponent() {
  return <Container style={{ flexDirection: 'row' }} />;  // 정상 작동
}

// ✅ 앱 진입점에서 한 번만 import
// main.tsx 또는 App.tsx
import '@pixi/layout';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```
