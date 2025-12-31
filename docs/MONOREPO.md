# XStudio 모노레포 구조 표준화

> **작성일**: 2025-12-31
> **상태**: 계획 (Plan)
> **관련 문서**: [WEBGL_BUILDER.md](./explanation/architecture/WEBGL_BUILDER.md)

---

## 1. Executive Summary

### 1.1 현재 상태

```
xstudio/ (불완전한 하이브리드 구조)
├── src/                    # 메인 빌더 앱 (187K LOC) - 루트에 위치
├── packages/
│   ├── shared/            # @xstudio/shared (의존성 미연결)
│   └── publish/           # @xstudio/publish (Vite 6 사용)
├── package.json           # 루트가 앱이면서 워크스페이스 (역할 혼합)
├── pnpm-workspace.yaml    # packages: ['.', 'packages/*']
├── vite.config.ts         # Vite 7
├── tsconfig.json          # packages/* 참조 없음
└── index.html
```

**문제점:**
| 문제 | 영향 |
|------|------|
| 루트가 앱이면서 워크스페이스 | 역할 혼합, 빌드 범위 불명확 |
| TypeScript references 미연결 | IDE 타입 추론 불완전 |
| 의존성 버전 불일치 | TS 5.9.3 vs 5.6.3, Vite 7 vs 6 |
| shared 패키지 빌드 미포함 | `tsc -b` 대상 제외 |
| workspace 의존성 미등록 | pnpm 심볼릭 링크 미생성 |

### 1.2 목표 상태

```
xstudio/ (표준 pnpm + Turborepo 모노레포)
├── apps/
│   ├── builder/              # 메인 빌더 앱 (@xstudio/builder)
│   │   ├── src/
│   │   │   ├── builder/      # Pixi.js 기반 Canvas 편집기
│   │   │   │   └── workspace/canvas/  # WebGL 편집 화면
│   │   │   ├── canvas/       # React 프리뷰 (COMPARE_MODE용)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── messaging/
│   │   │   │   └── router/
│   │   │   └── ...
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── publish/              # 배포 런타임 (@xstudio/publish)
│       ├── src/
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── packages/
│   ├── shared/               # 공유 라이브러리 (@xstudio/shared)
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── components/   # 공유 렌더러 (Canvas 프리뷰 & Publish 공용)
│   │   │       ├── FormRenderers.tsx
│   │   │       ├── LayoutRenderers.tsx
│   │   │       ├── DataRenderers.tsx
│   │   │       └── ...
│   │   └── package.json
│   │
│   └── config/               # 공유 설정 (@xstudio/config)
│       ├── tsconfig/
│       │   ├── base.json
│       │   ├── react-app.json
│       │   └── library.json
│       └── eslint/
│
├── pnpm-workspace.yaml       # catalog 포함
├── turbo.json                # Turborepo 설정
├── package.json              # 워크스페이스 전용 (private: true)
└── tsconfig.json             # solution style (선택)
```

### 1.3 아키텍처 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  apps/builder (Pixi.js Canvas 편집기)                        │
│  - 웹화면 편집 (컴포넌트 등록/수정/삭제)                       │
│  - src/builder/workspace/canvas: WebGL 기반 편집 화면        │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐
│  프리뷰     │  │  퍼블리싱   │  │  packages/shared        │
│  (iframe)   │  │  (export)   │  │  /components            │
│             │  │             │  │  - 공유 렌더러           │
│  canvas/    │  │  publish/   │  │  - React Aria 기반      │
│  App.tsx    │  │  App.tsx    │  │                         │
└──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘
       │                │                      │
       └────────────────┴──────────────────────┘
                        │
                  동일한 렌더러 사용
                  (일관된 결과물 보장)
```

**핵심 원칙:**
- **Builder**: Pixi.js WebGL로 편집 (빠른 조작)
- **프리뷰 (canvas/)**: React.js로 실시간 미리보기
- **퍼블리싱 (publish/)**: React.js로 최종 배포
- **공유 렌더러**: 프리뷰와 퍼블리싱이 동일한 결과물 보장

### 1.4 퍼블리싱 모드

Builder에서 퍼블리싱 시 두 가지 모드 중 선택 가능:

```
┌─────────────────────────────────────────────────────────────┐
│  퍼블리싱 옵션 선택                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │  📦 런타임 모드      │    │  📄 정적 빌드 모드   │         │
│  │  (SPA)              │    │  (SSG)              │         │
│  ├─────────────────────┤    ├─────────────────────┤         │
│  │  • 동적 데이터 지원  │    │  • SEO 최적화       │         │
│  │  • 실시간 업데이트   │    │  • 빠른 초기 로드    │         │
│  │  • API 연동 가능     │    │  • CDN 캐싱 최적    │         │
│  │  • CSR 방식         │    │  • 정적 HTML 생성    │         │
│  └─────────────────────┘    └─────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 모드 1: 런타임 렌더러 (SPA)

```
빌드 결과물:
dist/
├── index.html          # SPA 진입점
├── assets/
│   ├── index-[hash].js # React 앱 번들
│   └── index-[hash].css
└── data/
    └── project.json    # 프로젝트 데이터 (동적 로드)
```

**동작 방식:**
1. 사용자가 페이지 접속
2. React 앱 로드 (`index.js`)
3. `project.json` fetch
4. 렌더러가 JSON → React 컴포넌트 변환
5. 화면 표시

**적합한 경우:**
- 데이터가 자주 변경되는 사이트
- API 연동이 필요한 경우
- 사용자 인터랙션이 많은 앱

#### 모드 2: 정적 빌드 (SSG)

```
빌드 결과물:
dist/
├── index.html          # 홈페이지 (정적 HTML)
├── about/
│   └── index.html      # /about 페이지
├── products/
│   └── index.html      # /products 페이지
└── assets/
    ├── index-[hash].js # 하이드레이션용 JS (선택)
    └── index-[hash].css
```

**동작 방식:**
1. 빌드 시점에 JSON → HTML 변환
2. 각 페이지별 정적 HTML 생성
3. 배포 후 즉시 HTML 제공
4. (선택) 하이드레이션으로 인터랙션 추가

**적합한 경우:**
- SEO가 중요한 마케팅 사이트
- 정적 콘텐츠 위주 (블로그, 포트폴리오)
- CDN 배포로 빠른 로딩 필요

#### 모드별 운영 지표 및 모니터링

| 지표 | 런타임 모드 (SPA) | 정적 빌드 (SSG) | 측정 도구 |
|-----|-----------------|----------------|----------|
| First Contentful Paint (FCP) | 1.5-2.5초 | 0.5-1.0초 | Lighthouse |
| Time to Interactive (TTI) | 2.5-4.0초 | 1.0-2.0초 | Web Vitals |
| 번들 크기 | ~200KB (React 포함) | ~50KB (하이드레이션 시) | Bundlephobia |
| SEO 점수 | 60-80 | 90-100 | Lighthouse |

**API 실패 시 폴백 전략 (SPA 전용)**:

```typescript
// apps/publish/src/utils/dataLoader.ts
export async function loadProjectData() {
  try {
    const response = await fetch('/api/project');
    if (!response.ok) throw new Error('API 실패');
    return await response.json();
  } catch (error) {
    console.warn('API 실패, 로컬 캐시 사용:', error);

    // 폴백 1: 로컬 스토리지 캐시
    const cached = localStorage.getItem('project-cache');
    if (cached) return JSON.parse(cached);

    // 폴백 2: 빌드 시 포함된 정적 데이터
    return import('./fallback-data.json');
  }
}
```

**모드 선택 가이드라인**:

| 요구사항 | 권장 모드 |
|---------|----------|
| SEO 필수 | SSG |
| 실시간 데이터 표시 | SPA |
| CDN 캐싱 최대화 | SSG |
| 사용자 로그인 필요 | SPA |
| 빠른 초기 로딩 | SSG |
| API 기반 동적 콘텐츠 | SPA |

#### 퍼블리싱 UI 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  Builder 퍼블리싱 다이얼로그                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📤 퍼블리싱 설정                                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  퍼블리싱 모드 선택                                  │    │
│  │                                                      │    │
│  │  ○ 런타임 모드 (SPA)                                │    │
│  │    동적 데이터, API 연동 지원                        │    │
│  │                                                      │    │
│  │  ● 정적 빌드 (SSG) - 권장                           │    │
│  │    SEO 최적화, 빠른 로딩                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  배포 대상                                           │    │
│  │                                                      │    │
│  │  ○ 다운로드 (ZIP)                                   │    │
│  │  ○ Vercel                                           │    │
│  │  ○ Netlify                                          │    │
│  │  ○ AWS S3                                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│                              [ 취소 ]  [ 퍼블리싱 ]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 빌드 스크립트

```json
// apps/publish/package.json
{
  "scripts": {
    "build": "vite build",
    "build:ssg": "BUILD_MODE=ssg vite build",
    "preview": "vite preview"
  }
}
```

```typescript
// apps/publish/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // SSG 모드일 때 정적 HTML 생성
    process.env.BUILD_MODE === 'ssg' && ssgPlugin({
      routes: async () => {
        const data = await loadProjectData();
        return data.pages.map(page => page.slug);
      },
    }),
  ].filter(Boolean),
}));
```

---

## 2. 의존성 버전 정책

### 2.1 pnpm Catalogs

모든 패키지에서 공유하는 의존성 버전을 중앙에서 관리합니다.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  # React 생태계
  react: ^19.2.3
  react-dom: ^19.2.3
  react-router: ^7.11.0
  react-router-dom: ^7.11.0
  react-aria-components: ^1.14.0

  # 빌드 도구
  typescript: ~5.9.3
  vite: ^7.3.0
  '@vitejs/plugin-react-swc': ^4.2.2

  # 상태 관리
  zustand: ^5.0.9
  jotai: ^2.16.0
  immer: ^10.1.1

  # 타입 정의
  '@types/react': ^19.2.7
  '@types/react-dom': ^19.2.3
  '@types/node': ^24.10.2

onlyBuiltDependencies:
  - '@swc/core'
  - esbuild
  - puppeteer
```

### 2.2 패키지별 사용

```json
// apps/builder/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "@xstudio/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

---

## 3. Phase별 구현 계획

### Phase 1: 의존성 정리

**목표**: pnpm catalog로 의존성 버전 중앙 관리

**작업 내용**:
1. `pnpm-workspace.yaml`에 catalog 섹션 추가
2. 모든 패키지에서 `catalog:` 프로토콜 사용
3. 루트 package.json에 `@xstudio/shared` 의존성 추가

**수정 파일**:
- `/pnpm-workspace.yaml`
- `/package.json`
- `/packages/shared/package.json`
- `/packages/publish/package.json`

**검증**:
```bash
pnpm install
pnpm why typescript  # 모든 패키지에서 동일 버전 확인
```

---

### Phase 2: 공유 설정 패키지 생성

**목표**: TypeScript, ESLint 설정 중앙화

**디렉토리 구조**:
```
packages/config/
├── package.json
├── tsconfig/
│   ├── base.json
│   ├── react-app.json
│   └── library.json
└── eslint/
    └── base.js
```

**packages/config/package.json**:
```json
{
  "name": "@xstudio/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./tsconfig/base": "./tsconfig/base.json",
    "./tsconfig/react-app": "./tsconfig/react-app.json",
    "./tsconfig/library": "./tsconfig/library.json",
    "./eslint": "./eslint/base.js"
  }
}
```

**tsconfig/base.json**:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true
  }
}
```

**tsconfig/react-app.json**:
```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "moduleDetection": "force"
  }
}
```

**tsconfig/library.json**:
```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  }
}
```

---

### Phase 3: apps/builder/ 생성 및 이전

**목표**: 메인 빌더 앱을 표준 위치로 이전

**작업 내용**:

1. **디렉토리 생성**
   ```bash
   mkdir -p apps/builder
   ```

2. **파일 이동** (git mv 사용으로 이력 보존)
   ```bash
   git mv src/ apps/builder/src/
   git mv public/ apps/builder/public/
   git mv index.html apps/builder/index.html
   git mv vite.config.ts apps/builder/vite.config.ts
   git mv vite.preview.config.ts apps/builder/vite.preview.config.ts
   git mv tsconfig.app.json apps/builder/tsconfig.app.json
   git mv tsconfig.node.json apps/builder/tsconfig.node.json
   ```

3. **렌더러 코드 분리** (canvas 프리뷰 & publish 공용)
   ```bash
   # 렌더러를 packages/shared로 이동
   git mv apps/builder/src/canvas/renderers/ packages/shared/src/components/renderers/
   ```

   **분리 후 구조**:
   ```
   apps/builder/src/canvas/           # Builder 프리뷰 전용
   ├── App.tsx                        # 프리뷰 앱 진입점
   ├── index.tsx                      # srcdoc iframe 진입점
   ├── messaging/                     # postMessage 핸들러
   ├── router/                        # 프리뷰 라우팅
   ├── store/                         # 프리뷰 상태
   └── (renderers/ → 이동됨)

   packages/shared/src/components/    # 공유 렌더러
   ├── renderers/
   │   ├── index.ts
   │   ├── FormRenderers.tsx
   │   ├── LayoutRenderers.tsx
   │   ├── DataRenderers.tsx
   │   ├── DateRenderers.tsx
   │   ├── SelectionRenderers.tsx
   │   ├── TableRenderer.tsx
   │   └── CollectionRenderers.tsx
   └── index.ts
   ```

4. **Import 경로 업데이트**
   ```typescript
   // apps/builder/src/canvas/App.tsx (변경 전)
   import { FormRenderers } from './renderers';

   // apps/builder/src/canvas/App.tsx (변경 후)
   import { FormRenderers } from '@xstudio/shared/components/renderers';

   // apps/publish/src/App.tsx
   import { FormRenderers } from '@xstudio/shared/components/renderers';
   ```

**렌더러 계약 검증 테스트 계획**:

렌더러를 `packages/shared`로 이동할 때, Pixi 기반 WebGL과 React 프리뷰/퍼블리시가 동일한 컴포넌트 계약을 유지하는지 확인해야 합니다.

```typescript
// packages/shared/src/components/renderers/__tests__/contract.test.ts

import { describe, it, expect } from 'vitest';
import { FormRenderers, LayoutRenderers } from '../index';

// Props 타입 계약 검증
describe('Renderer Props Contract', () => {
  it('FormRenderers should accept standard props', () => {
    const props = {
      id: 'test-input',
      value: '',
      onChange: () => {},
      disabled: false,
    };
    // 타입 체크 통과 확인
    expect(() => FormRenderers.TextInput(props)).not.toThrow();
  });

  it('LayoutRenderers should accept children and style props', () => {
    const props = {
      children: null,
      style: { padding: 16 },
      className: 'container',
    };
    expect(() => LayoutRenderers.Container(props)).not.toThrow();
  });
});

// 스타일 토큰 계약 검증
describe('Style Token Contract', () => {
  it('should use consistent spacing tokens', () => {
    // 공유 스타일 토큰이 builder/publish에서 동일하게 적용되는지 확인
    expect(FormRenderers.getSpacing('md')).toBe(16);
    expect(LayoutRenderers.getSpacing('md')).toBe(16);
  });
});

// 이벤트 시그니처 계약 검증
describe('Event Signature Contract', () => {
  it('onChange should receive consistent event shape', () => {
    const mockOnChange = vi.fn();
    const input = FormRenderers.TextInput({ onChange: mockOnChange });

    // 시뮬레이션된 이벤트가 동일한 형태인지 확인
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'test' })
      })
    );
  });
});
```

**검증 항목 체크리스트**:
| 항목 | 검증 방법 | 기대 결과 |
|-----|----------|----------|
| Props 타입 일치 | `tsc --noEmit` | 타입 오류 없음 |
| 스타일 토큰 일관성 | 단위 테스트 | 동일 값 반환 |
| 이벤트 시그니처 | 통합 테스트 | 동일 형태 이벤트 |
| 시각적 일관성 | Chromatic 스냅샷 | 픽셀 차이 0% |

5. **apps/builder/package.json 생성**
   ```json
   {
     "name": "@xstudio/builder",
     "private": true,
     "version": "0.0.0",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "tsc -b && vite build",
       "build:preview": "vite build --config vite.preview.config.ts",
       "build:all": "npm run build:preview && npm run build",
       "preview": "vite preview",
       "check-types": "tsc --noEmit",
       "lint": "eslint src"
     },
     "dependencies": {
       "@xstudio/shared": "workspace:*",
       "react": "catalog:",
       "react-dom": "catalog:",
       "react-router": "catalog:",
       "react-router-dom": "catalog:",
       "react-aria-components": "catalog:",
       "zustand": "catalog:",
       "jotai": "catalog:"
       // ... 기존 의존성
     },
     "devDependencies": {
       "@xstudio/config": "workspace:*",
       "typescript": "catalog:",
       "vite": "catalog:",
       "@vitejs/plugin-react-swc": "catalog:"
     }
   }
   ```

6. **apps/builder/tsconfig.json 생성**
   ```json
   {
     "extends": "@xstudio/config/tsconfig/react-app",
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     },
     "include": ["src"],
     "references": [
       { "path": "./tsconfig.app.json" },
       { "path": "./tsconfig.node.json" }
     ]
   }
   ```

7. **vite.config.ts 수정** (경로 업데이트)
   ```typescript
   // resolve alias 수정
   resolve: {
     alias: {
       "@": path.resolve(__dirname, "./src"),
     },
   },
   ```

**검증 체크리스트**:
```bash
# 1. workspace 링크 확인
pnpm list --depth 0
# @xstudio/shared workspace:* 링크 확인

# 2. TypeScript project references 검증
pnpm exec tsc --showConfig | head -30
# "references" 섹션에 shared 패키지 포함 확인

# 3. 빌드 테스트
pnpm install && pnpm run build

# 4. 타입 체크
pnpm run check-types
```

---

### Phase 4: apps/publish/ 이동

**목표**: publish 앱을 apps/ 하위로 이동

**작업 내용**:

1. **디렉토리 이동**
   ```bash
   git mv packages/publish/ apps/publish/
   ```

2. **package.json 업데이트**
   ```json
   {
     "name": "@xstudio/publish",
     "dependencies": {
       "@xstudio/shared": "workspace:*",
       "react": "catalog:",
       "react-dom": "catalog:"
     },
     "devDependencies": {
       "@xstudio/config": "workspace:*",
       "typescript": "catalog:",
       "vite": "catalog:"
     }
   }
   ```

3. **vite.config.ts 업데이트** (Vite 7 호환)

4. **tsconfig.json 업데이트**
   ```json
   {
     "extends": "@xstudio/config/tsconfig/react-app",
     "compilerOptions": {
       "paths": {
         "@xstudio/shared": ["../../packages/shared/src"],
         "@xstudio/shared/*": ["../../packages/shared/src/*"]
       }
     }
   }
   ```

**검증 체크리스트**:
```bash
# 1. 의존성 링크 확인
cd apps/publish && pnpm list --depth 0
# @xstudio/shared, @xstudio/config 링크 확인

# 2. Vite 버전 호환성 확인
pnpm exec vite --version
# Vite 7.x 확인

# 3. 빌드 테스트 (SSG/SPA 모두)
pnpm run build
pnpm run build:ssg

# 4. shared 패키지 import 확인
pnpm exec tsc --noEmit
```

---

### Phase 5: packages/shared/ 정리

**목표**: Just-in-Time 타입 패턴 적용

**package.json 업데이트**:
```json
{
  "name": "@xstudio/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./types": {
      "types": "./src/types/index.ts",
      "default": "./src/types/index.ts"
    },
    "./utils": {
      "types": "./src/utils/index.ts",
      "default": "./src/utils/index.ts"
    },
    "./components": {
      "types": "./src/components/index.ts",
      "default": "./src/components/index.ts"
    }
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "@xstudio/config": "workspace:*",
    "typescript": "catalog:"
  }
}
```

**tsconfig.json 업데이트**:
```json
{
  "extends": "@xstudio/config/tsconfig/library",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**검증 체크리스트**:
```bash
# 1. exports 경로 확인
node -e "console.log(require.resolve('@xstudio/shared'))"
# packages/shared/src/index.ts 경로 확인

# 2. 타입 내보내기 확인
pnpm exec tsc --showConfig
# declaration: true 확인

# 3. builder/publish에서 import 테스트
cd apps/builder && pnpm exec tsc --noEmit
cd apps/publish && pnpm exec tsc --noEmit

# 4. 순환 의존성 확인
pnpm exec madge --circular packages/shared/src
```

---

### Phase 6: 루트 정리

**목표**: 루트를 순수 워크스페이스로 전환

**루트 package.json**:
```json
{
  "name": "xstudio",
  "private": true,
  "packageManager": "pnpm@10.26.2",
  "scripts": {
    "dev": "turbo run dev --filter=@xstudio/builder",
    "build": "turbo run build",
    "build:all": "turbo run build:all",
    "check-types": "turbo run check-types",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.5.0"
  }
}
```

**제거할 파일들** (이동 후):
- `src/`
- `public/`
- `index.html`
- `vite.config.ts`
- `vite.preview.config.ts`
- `tsconfig.app.json`
- `tsconfig.node.json`

**루트 tsconfig.json** (선택적 - solution style):
```json
{
  "files": [],
  "references": [
    { "path": "./apps/builder" },
    { "path": "./apps/publish" },
    { "path": "./packages/shared" },
    { "path": "./packages/config" }
  ]
}
```

---

### Phase 7: Turborepo 설정

**목표**: 빌드 캐싱 및 병렬 실행

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "inputs": ["src/**", "package.json", "tsconfig.json", "vite.config.ts"]
    },
    "build:preview": {
      "dependsOn": ["^build"],
      "outputs": ["dist/preview/**"]
    },
    "build:all": {
      "dependsOn": ["build:preview", "build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "check-types": {
      "dependsOn": ["^check-types"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

**turbo 설치**:
```bash
pnpm add -Dw turbo
```

---

### Phase 8: 검증 및 정리

**검증 체크리스트**:

1. **의존성 설치**
   ```bash
   pnpm install
   ```

2. **타입 체크**
   ```bash
   turbo run check-types
   ```

3. **빌드 테스트**
   ```bash
   turbo run build
   ```

4. **개발 서버**
   ```bash
   turbo run dev --filter=@xstudio/builder
   ```

5. **린트**
   ```bash
   turbo run lint
   ```

6. **테스트**
   ```bash
   turbo run test
   ```

**성능 확인**:
```bash
# Turborepo 캐시 상태 확인
turbo run build --summarize

# 빌드 시간 비교 (캐시 적중 vs 미적중)
turbo run build --force  # 캐시 무시
turbo run build          # 캐시 사용
```

---

## 4. 주의사항

### 4.1 Git 이력 보존

파일 이동 시 반드시 `git mv` 사용:
```bash
git mv src/ apps/builder/src/
```

### 4.2 Import 경로 업데이트

`@/` alias가 새 경로를 가리키도록 vite.config.ts 수정 필요.

### 4.3 CI/CD 업데이트

빌드 스크립트의 경로 업데이트 필요:

#### GitHub Actions 변경 사항

```yaml
# .github/workflows/ci.yml (변경 전)
- name: Build
  run: pnpm build
  working-directory: .

# .github/workflows/ci.yml (변경 후)
- name: Build
  run: pnpm turbo run build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}

# 캐시 키 패턴 변경
- name: Cache turbo build
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-
```

#### Vercel 설정 변경

```json
// vercel.json
{
  "buildCommand": "pnpm turbo run build --filter=@xstudio/builder",
  "outputDirectory": "apps/builder/dist",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

#### Netlify 설정 변경

```toml
# netlify.toml
[build]
  command = "pnpm turbo run build --filter=@xstudio/publish"
  publish = "apps/publish/dist"

[build.environment]
  NODE_VERSION = "20"
```

#### 워크스페이스 경로 변경 요약

| 항목 | 기존 경로 | 신규 경로 |
|-----|----------|----------|
| 빌더 빌드 출력 | `./dist` | `apps/builder/dist` |
| 퍼블리시 빌드 출력 | `packages/publish/dist` | `apps/publish/dist` |
| 캐시 디렉토리 | `node_modules/.cache` | `.turbo` |

### 4.4 ESLint 설정

현재 `eslint-local-rules/` 위치 결정:

#### 위치 선택 기준

| 규칙 유형 | 권장 위치 | 이유 |
|----------|----------|------|
| Pixi.js/Canvas 관련 룰 | `apps/builder/eslint-local-rules/` | Builder 전용 그래픽 로직 |
| WebGL 메모리 관리 룰 | `apps/builder/eslint-local-rules/` | Builder 전용 |
| API/데이터 검증 룰 | `packages/config/eslint/` | 전사 공용 |
| React Aria 접근성 룰 | `packages/config/eslint/` | 전사 공용 |
| 네이밍 컨벤션 룰 | `packages/config/eslint/` | 전사 공용 |

#### 옵션 A: 전사 공용 설정 (packages/config)

```javascript
// packages/config/eslint/base.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  plugins: ['@xstudio/eslint-local-rules'],
  rules: {
    '@xstudio/eslint-local-rules/no-unsafe-api-call': 'error',
    '@xstudio/eslint-local-rules/require-aria-label': 'warn',
  },
};

// apps/builder/eslint.config.js
import baseConfig from '@xstudio/config/eslint';

export default [
  ...baseConfig,
  {
    // Builder 전용 규칙 추가
    plugins: { 'local-rules': localRules },
    rules: {
      'local-rules/no-direct-pixi-dispose': 'error',
      'local-rules/require-webgl-cleanup': 'error',
    },
  },
];
```

#### 옵션 B: Builder 전용 설정

```javascript
// apps/builder/eslint-local-rules/index.js
module.exports = {
  rules: {
    'no-direct-pixi-dispose': require('./rules/no-direct-pixi-dispose'),
    'require-webgl-cleanup': require('./rules/require-webgl-cleanup'),
  },
};

// apps/builder/eslint.config.js
import localRules from './eslint-local-rules';

export default [
  {
    plugins: { 'local-rules': localRules },
    rules: {
      'local-rules/no-direct-pixi-dispose': 'error',
    },
  },
];
```

**권장사항**: Pixi/Canvas 관련 규칙은 옵션 B(Builder 전용), API/접근성 규칙은 옵션 A(전사 공용)로 분리

### 4.5 Storybook

`.storybook/` 설정 경로 업데이트:
- `apps/builder/.storybook/`으로 이동
- 또는 루트에 유지하고 경로 수정

#### 이동 후 설정 변경 예시

```typescript
// apps/builder/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // shared 패키지 스토리도 포함
    '../../../packages/shared/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],

  // 정적 에셋 디렉토리 (경로 변경 필수)
  staticDirs: [
    '../public',
    { from: '../../../packages/shared/public', to: '/shared-assets' },
  ],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          '@xstudio/shared': path.resolve(__dirname, '../../../packages/shared/src'),
        },
      },
    });
  },
};

export default config;
```

```typescript
// apps/builder/.storybook/preview.ts
import type { Preview } from '@storybook/react';

// import 경로 변경
import '../src/styles/globals.css';
import '@xstudio/shared/styles/components.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

#### Vite 프록시 설정 (API 모킹 시)

```typescript
// apps/builder/.storybook/main.ts - viteFinal 내부
async viteFinal(config) {
  return mergeConfig(config, {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          // Storybook에서 API 모킹 서버 사용 시
        },
      },
    },
  });
}
```

#### package.json 스크립트 변경

```json
// apps/builder/package.json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build -o storybook-static"
  }
}

// 루트 package.json (turbo 연동)
{
  "scripts": {
    "storybook": "turbo run storybook --filter=@xstudio/builder"
  }
}
```

---

## 5. 롤백 전략

### 5.1 단계별 롤백

각 Phase는 독립적으로 롤백 가능:

| Phase | 롤백 방법 |
|-------|----------|
| 1 | catalog 제거, 기존 버전 복원 |
| 2 | packages/config/ 삭제, 기존 tsconfig 복원 |
| 3 | apps/builder/ → 루트로 역이동 |
| 4 | apps/publish/ → packages/publish/로 역이동 |
| 5 | exports 필드 제거, 기존 설정 복원 |
| 6 | 루트 package.json 복원 |
| 7 | turbo.json 삭제, 기존 스크립트 복원 |

### 5.2 Git 브랜치 전략

```bash
# 마이그레이션 브랜치 생성
git checkout -b refactor/monorepo-standardization

# 각 Phase별 커밋
git commit -m "phase1: add pnpm catalog for dependency management"
git commit -m "phase2: create shared config package"
# ...

# 문제 발생 시 특정 Phase로 롤백
git revert <commit-hash>
```

---

## 6. 예상 결과

### 6.1 구조적 개선

- **역할 분리**: 루트 = 워크스페이스, apps/ = 앱, packages/ = 라이브러리
- **표준 구조**: 업계 표준 패턴으로 온보딩 용이

### 6.2 개발 경험 개선

- **의존성 관리**: catalog로 버전 충돌 방지
- **타입 추론**: Just-in-Time 타입으로 빌드 없이 타입 제공
- **빌드 성능**: Turborepo 캐싱으로 반복 빌드 시간 단축

### 6.3 유지보수성 향상

- **설정 통일**: 공유 tsconfig, eslint 설정
- **명확한 경계**: 앱과 라이브러리의 명확한 분리
- **확장성**: 새 앱/패키지 추가 용이

---

## 7. 참고 자료

- [Turborepo - Structuring a repository](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository)
- [Turborepo - TypeScript](https://turborepo.com/docs/guides/tools/typescript)
- [pnpm - Catalogs](https://pnpm.io/catalogs)
- [pnpm - Workspaces](https://pnpm.io/workspaces)
