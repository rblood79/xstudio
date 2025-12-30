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
- GitHub Actions
- Vercel/Netlify 배포 설정

### 4.4 ESLint 설정

현재 `eslint-local-rules/` 위치 결정:
- 옵션 A: `packages/config/eslint/local-rules/`로 이동
- 옵션 B: `apps/builder/eslint-local-rules/`로 이동 (builder 전용)

### 4.5 Storybook

`.storybook/` 설정 경로 업데이트:
- `apps/builder/.storybook/`으로 이동
- 또는 루트에 유지하고 경로 수정

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
