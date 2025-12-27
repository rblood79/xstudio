# SaveService 리팩토링

**날짜**: 2025-10-09  
**작업**: 서비스 레이어 구조 개선 및 재구성

## 개요

`SaveService`를 `src/builder/services/`에서 `src/services/save/`로 이동하여 프로젝트 전체의 서비스 레이어를 통합 관리합니다.

## 변경 사항

### 디렉토리 구조 변경

#### 이전 구조

```
src/
├── builder/
│   └── services/
│       └── saveService.ts
└── services/
    └── api/
        ├── BaseApiService.ts
        ├── ElementsApiService.ts
        └── ...
```

#### 변경 후 구조

```
src/
├── builder/
│   ├── components/
│   ├── stores/
│   └── ...
└── services/
    ├── api/                    # API 호출 서비스
    │   ├── BaseApiService.ts
    │   ├── ElementsApiService.ts
    │   └── ...
    ├── save/                   # 저장 관련 서비스 (신규)
    │   ├── saveService.ts
    │   └── index.ts
    └── index.ts                # 통합 export
```

### 파일 변경

#### 1. 이동된 파일

- `src/builder/services/saveService.ts` → `src/services/save/saveService.ts`

#### 2. 신규 생성 파일

- `src/services/save/index.ts` - SaveService export
- `src/services/index.ts` - 전체 서비스 통합 export

#### 3. 수정된 파일

- `src/builder/preview/index.tsx`
  - import 경로: `"../services/saveService"` → `"../../services/save"`
- `src/builder/main/BuilderHeader.tsx`
  - import 경로: `"../services/saveService"` → `"../../services/save"`

## 개선 효과

### 1. 일관된 구조

- 모든 서비스 레이어가 `src/services/` 아래에 통합됨
- API 서비스와 비즈니스 로직 서비스를 같은 위치에서 관리

### 2. 명확한 계층 분리

```
UI 레이어 (src/builder/)
  ↓ import
서비스 레이어 (src/services/)
  ↓ 호출
외부 API (Supabase)
```

### 3. 확장성 향상

향후 서비스 추가 시 일관된 위치에 배치:

- `src/services/auth/` - 인증 서비스
- `src/services/theme/` - 테마 서비스
- `src/services/analytics/` - 분석 서비스

### 4. 재사용성 증가

- Builder 외부(Dashboard, Admin 등)에서도 쉽게 사용 가능
- 통합 export로 일관된 import 경험 제공

## 사용 예시

### Before (이전)

```typescript
// src/builder/preview/index.tsx
import { saveService } from "../services/saveService";
```

### After (변경 후)

```typescript
// src/builder/preview/index.tsx
import { saveService } from "../../services/save";

// 또는 통합 export 사용
import { saveService } from "../../services";
```

## 마이그레이션 가이드

기존 코드에서 `saveService`를 사용하고 있다면 import 경로만 변경하면 됩니다:

```typescript
// ❌ 이전
import { saveService } from "../services/saveService";
import { saveService } from "../../builder/services/saveService";

// ✅ 변경 후
import { saveService } from "../../services/save";
// 또는
import { saveService } from "../../services";
```

## 참고 자료

- [실시간 저장 모드 구현](./REALTIME_SAVE_MODE_IMPLEMENTATION.md)
- [저장 모드 동작 방식](./SAVE_MODE_BEHAVIOR.md)

## 검증

- ✅ TypeScript 컴파일 에러 없음
- ✅ 모든 import 경로 업데이트 완료
- ✅ 기능 동작 정상 확인
