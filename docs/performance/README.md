# XStudio Builder 성능 최적화 가이드

> **작성일**: 2025-12-09
> **최종 수정**: 2025-12-11 (교차 검토 반영)
> **진행 현황**: [task.md](./task.md) 참조 (단일 진실 소스)
> **목표**: 엔터프라이즈급 10,000개+ 요소, 24시간+ 안정 사용

## 개요

XStudio Builder의 대규모 프로젝트 지원을 위한 성능 최적화 계획입니다.
Panel 시스템, Store 아키텍처, History, Canvas 통신, 메모리 관리, 네트워크 정책을 다룹니다.

### 🚀 Major Architecture Change (Phase 10)

**2025-12-11 추가**: Builder를 **WebGL 기반(@pixi/react)**으로 재구축하고, 기존 Canvas iframe을 **Publish App 전용**으로 분리하는 대규모 아키텍처 변경이 계획되었습니다.

```
현재: Builder (React DOM) ◄─── postMessage ───► Canvas iframe (Preview + Publish)
목표: Builder (WebGL/PixiJS) ─── Direct State ──► Zustand Store
      Publish App (React DOM) ← Export ← Builder (별도 프로젝트)
```

**모노레포 구조 (제안 - 미확정)**:

> ⚠️ 현재: npm 단일 패키지 구조 | 전제조건은 [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md) 참조

```
xstudio/
├── packages/
│   ├── builder/           ← WebGL Builder (현재 src/ 이전)
│   ├── publish/           ← Publish App (SSR/SEO 지원)
│   └── shared/            ← 공통 코드 (React Aria, Types)
└── pnpm-workspace.yaml
```

자세한 내용은 [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md) 참조

## 문서 구조

| 문서                                               | 설명                                           | 상태            |
| -------------------------------------------------- | ---------------------------------------------- | --------------- |
| [01-problem-analysis.md](./01-problem-analysis.md) | 현재 문제 분석 및 목표 성능 지표               | 📋 계획         |
| [02-architecture.md](./02-architecture.md)         | 아키텍처 설계                                  | 📋 계획         |
| [03-phase-1-4.md](./03-phase-1-4.md)               | Phase 1-4: Panel, Store, History, Canvas       | 📋 계획         |
| [04-phase-5-8.md](./04-phase-5-8.md)               | Phase 5-8: Lazy, React Query, Monitor, CI      | 🔄 진행중 (task.md 참조) |
| [05-supplement.md](./05-supplement.md)             | 보완 제안: 캔버스 가상화, 웹 워커, 에셋 최적화 | 📋 계획         |
| [06-implementation.md](./06-implementation.md)     | 구현 순서 및 체크리스트 (Phase 9 포함)         | 📋 계획         |
| [07-decisions.md](./07-decisions.md)               | 결정 사항 (오픈 질문 해결)                     | ✅ 완료         |
| [08-additional-ideas.md](./08-additional-ideas.md) | 추가 최적화 아이디어                           | 🆕 신규         |
| [task.md](./task.md)                               | 작업 진행 현황 (Checklist)                     | 🔄 진행중       |
| **[10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)** | **🚀 WebGL Builder + Publish App 분리** | **🆕 NEW** |

## 목표 성능 지표

| 지표                | 현재 (DOM) | 목표 (Phase 1-9) | **목표 (Phase 10 WebGL)** |
| ------------------- | ---------- | ---------------- | ------------------------- |
| **5,000개 렌더링**  | 불가능     | < 1초            | **< 16ms (60fps)**        |
| **10,000개 렌더링** | 불가능     | -                | **< 33ms (30fps)**        |
| **요소 선택**       | 50-100ms   | < 30ms           | **< 5ms**                 |
| **줌/팬 반응**      | 100-200ms  | -                | **< 16ms**                |
| **메모리 (24시간)** | +200MB     | < +50MB          | **GPU VRAM 활용**         |
| **CPU (유휴)**      | 15-25%     | < 5%             | **< 2% (GPU 오프로드)**   |
| **안정 사용**       | 2-3시간    | **24시간+**      | **24시간+**               |

## Phase 진행 현황

> **📌 단일 진실 소스**: **[task.md](./task.md)** 참조
>
> Phase별 진행률, 체크리스트, 우선순위는 task.md에서 관리합니다.
> 이 문서에서는 중복 테이블을 제거하고 task.md로 단일화합니다.

**주요 현황 요약** (상세: task.md):
- ✅ **완료**: Phase 3 (History Diff)
- 🟡 **진행중**: Phase 1 (50%), Phase 9 (60%)
- ⚠️ **폐기**: Phase 4 → Phase 10으로 대체
- 🆕 **신규**: Phase 10 (WebGL Builder) - 전제조건 확인 후 착수

## P0 우선 작업 (수정된 우선순위)

### 단기 (Phase 1-9 기반)
1. **Panel Gateway 수정** (Phase 1)
   - PropertiesPanel, StylesPanel, ComponentsPanel에 Content 분리 필요
   - 현재 hook이 isActive 체크 전에 호출됨

2. **Store Index Migration** (Phase 2)
   - `getPageElements()` 정의됨, 실제 사용 안 함
   - 10곳의 `.filter(page_id)` → `getPageElements()` 전환

3. **구현된 훅 통합** (Phase 5, 7)
   - `usePageLoader` → 페이지 전환에 통합
   - `useAutoRecovery` → BuilderApp에 통합

### 중장기 (Phase 10: WebGL 마이그레이션)
4. **🚀 @pixi/react v8 설정** (Phase 10.1)
   - React 19 업그레이드 필요
   - `packages/builder/workspace/canvas/` 구조 생성
   - WebGL 기반 Builder Canvas 구축

5. **🚀 ElementSprite 시스템** (Phase 10.2)
   - `packages/builder/workspace/canvas/sprites/`
   - Box, Text, Image 등 기본 렌더링
   - 5,000개+ 요소 60fps 목표

6. **🚀 Publish App 분리** (Phase 10.7)
   - 모노레포 구조: `packages/publish/`
   - 기존 Canvas iframe 코드 → `packages/publish/components/`
   - SEO + 접근성 최적화된 별도 앱

## 추가 최적화 아이디어 (08-additional-ideas.md)

| 아이디어              | 난이도 | 효과                                           |
| --------------------- | ------ | ---------------------------------------------- |
| **이벤트 위임**       | 중     | 메모리 ↓, 초기 로딩 ↑ (리스너 10,000개 → 10개) |
| **CSS Containment**   | 하     | 렌더링 성능 ↑ (`content-visibility: auto`)     |
| **Selection Overlay** | 상     | 선택 반응성 ↑ (0개 요소 리렌더링)              |

## 리뷰 코멘트 및 구현 체크리스트

### 1. WebGL/Pixi 전환 리스크 완화

- [ ] **포커스 트랩 테스트 체크리스트**: Builder 내 키보드 포커스 경로를 Dev 도구용으로 유지
- [ ] **frameTick/renderVersion 시퀀스**: Zustand 스토어에 단일 넘버형 시퀀스 추가
  ```typescript
  // stores/canvasSync.ts
  interface CanvasSyncState {
    renderVersion: number;
    incrementRenderVersion: () => void;
  }
  ```
- [ ] **렌더-스토어 불일치 탐지 로그**: Pixi↔React DOM 패널 간 프레임 지연 디버깅용

### 2. 공통 Scene 스키마

- [ ] **`packages/shared/types/scene.ts`**: Element, Transform, Styling 타입 정의
  ```typescript
  // packages/shared/types/scene.ts
  export interface SceneElement {
    id: string;
    transform: Transform;
    styling: Styling;
    children?: SceneElement[];
  }

  export interface Transform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    scale?: { x: number; y: number };
  }

  export interface Styling {
    backgroundColor?: string;
    borderRadius?: number;
    opacity?: number;
    // ...
  }
  ```
- [ ] **직렬화/역직렬화 유틸**: 모드 간 상태 변환 표준화

### 3. 장시간 안정성 검증 강화

- [ ] **24시간 스트레스 테스트 스크립트**: `npm run soak:webgl`
  ```json
  // package.json
  {
    "scripts": {
      "soak:webgl": "playwright test --project=soak --timeout=86400000"
    }
  }
  ```
- [ ] **GPU 메모리/텍스처 누수 로깅**: CI 아티팩트로 저장
- [ ] **텍스처 캐시/LRU 정책 문서화**:
  - 비동기 해제 시점
  - `texture.destroy(true)` 호출 조건
  - VRAM 예산 계산 가이드

### 4. 번들 최적화

- [ ] **Tree-shaking 점검**: `packages/shared` import 시 번들 비대화 방지
- [ ] **`exports` 필드 모듈 분리**:
  ```json
  // packages/shared/package.json
  {
    "exports": {
      "./types": "./dist/types/index.js",
      "./hooks": "./dist/hooks/index.js",
      "./utils": "./dist/utils/index.js"
    }
  }
  ```

### 5. 추가 안정성 항목

- [ ] **GPU 프로파일링 통합**: `@pixi/stats` 또는 자체 VRAM 모니터
- [ ] **WebGL Context Lost 처리**:
  ```typescript
  // WebGL context lost 복구 로직
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    // 복구 로직
  });
  canvas.addEventListener('webglcontextrestored', () => {
    // 텍스처/셰이더 재로드
  });
  ```
- [ ] **WebGL 미지원 브라우저 대응**: Safari 구버전 등 Fallback 정책 명시

## 구현 완료 항목

### Phase 6: DataTablePanel (2025-12-10) ✅

**문제**: 페이지 새로고침 후 DataTable 목록이 비어있음 (IndexedDB에는 데이터 존재)

**해결**: React Query + Zustand Store 이중 레이어 동기화

```typescript
// 패널 활성화 시 Zustand Store 초기화
useEffect(() => {
  if (isActive && projectId && initialLoadedRef.current !== projectId) {
    initialLoadedRef.current = projectId;
    Promise.all([
      fetchDataTables(projectId),
      fetchApiEndpoints(projectId),
      fetchVariables(projectId),
      fetchTransformers(projectId),
    ]);
  }
}, [isActive, projectId, ...]);
```

## 관련 문서

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
- [COMPLETED_FEATURES.md](../COMPLETED_FEATURES.md) - 완료된 기능 목록
- [PLANNED_FEATURES.md](../PLANNED_FEATURES.md) - 계획된 기능 목록

---

> **문서 작성**: Claude AI
> **다음 단계**:
> 1. **Phase 1 완료**: 3개 패널 Gateway 적용 (PropertiesPanel, StylesPanel, ComponentsPanel)
> 2. **Phase 10 전제조건 확인**: @pixi/react v8 호환성, pnpm workspace 전환
> 3. **Phase 10.1 착수**: WebGL Builder 프로토타입
>
> ※ 캔버스 가상화(Phase 9)는 **Publish App 전용**으로 재분류됨 - WebGL Builder에는 불필요
