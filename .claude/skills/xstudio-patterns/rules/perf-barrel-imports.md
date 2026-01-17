---
title: Avoid Barrel File Imports
impact: MEDIUM
impactDescription: 번들 크기 최적화, 트리 쉐이킹 효율
tags: [performance, imports, bundling]
---

Barrel 파일(index.ts) 대신 직접 경로에서 import합니다.

## Incorrect

```tsx
// ❌ Barrel import - 전체 모듈 로드
import { Button, Input, Select } from '@/components';
import { useAuth, useUser } from '@/hooks';

// components/index.ts가 모든 컴포넌트를 re-export하면
// 사용하지 않는 컴포넌트도 번들에 포함됨
```

## Correct

```tsx
// ✅ 직접 경로 import
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/hooks/useAuth';

// ✅ 또는 경로 alias 활용
import { Button } from '@components/Button';
import { useAuth } from '@hooks/useAuth';

// ✅ 라이브러리는 서브패스 import
import debounce from 'lodash/debounce';  // 'lodash' 전체 import 금지
import { format } from 'date-fns/format';  // 'date-fns' 전체 import 금지
```
