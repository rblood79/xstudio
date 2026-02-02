# WASM Remediation Plan

> **WASM.md** 계획 대비 실제 구현의 미완성/차이점 보완 방안
>
> SharedArrayBuffer 관련 항목은 이 문서 범위에서 제외한다.

---

## 1. 감사 요약

| Phase | 계획 완성도 | 주요 미비 |
|-------|------------|----------|
| Phase 0 (벤치마크) | ~85% | 시나리오별 벤치마크 부재 |
| Phase 1 (SpatialIndex) | ~95% | RAF 타이밍·페이지 전환 정리 |
| Phase 2 (Layout Engine) | ~90% | Worker 호출 연동 미확인, float32 정밀도 미검증 |
| Phase 3 (Text Engine) | 제거(정상) | spec에 따라 CanvasKit Paragraph로 대체 |
| Phase 4 (Worker) | ~90% | BlockEngine에서 Worker 호출 경로 조건부 |
| Phase 5 (CanvasKit 렌더) | ~92% | blend modes·textMeasure·mesh gradient 미연동 |
| Phase 6 (이중 Surface) | ~100% | camera-only blit 구현 완료 |
| 인프라 | ~80% | WASM 바이너리 배포·CI/CD 누락 |

---

## 2. 갭 상세 & 보완 방안

### 2.1 [P0 Critical] Blend Mode 파이프라인 미연동

**현황**
- `skia/blendModes.ts`에 18종 매핑 함수 `toSkiaBlendMode()` 구현 완료
- 어디에서도 import되지 않음 — **모든 요소가 기본 `SrcOver`로 렌더링됨**

**영향**: CSS `mix-blend-mode`를 설정한 요소가 Skia 모드에서 효과 없음

**보완 방안**

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | `SkiaNodeData`에 `blendMode?: string` 필드 추가 | `nodeRenderers.ts` |
| 2 | `renderNode()`에서 `blendMode`가 있으면 `canvas.saveLayer(paint)` 후 `paint.setBlendMode(toSkiaBlendMode(ck, node.blendMode))` 적용 | `nodeRenderers.ts` |
| 3 | 각 Sprite(`BoxSprite`, `TextSprite`, `ImageSprite`)의 `skiaNodeData`에 `style?.mixBlendMode` 전달 | `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx` |
| 4 | `styleConverter.ts`에서 `mixBlendMode` 추출 로직 추가 | `styleConverter.ts` |

**코드 변경 핵심**:
```typescript
// nodeRenderers.ts — renderNode() 내부
import { toSkiaBlendMode } from './blendModes';

// blendMode가 있고 기본값(normal)이 아닌 경우
if (node.blendMode && node.blendMode !== 'normal') {
  const layerPaint = new ck.Paint();
  layerPaint.setBlendMode(toSkiaBlendMode(ck, node.blendMode));
  canvas.saveLayer(layerPaint);
  layerPaint.delete();
  // ... 렌더링 ...
  canvas.restore(); // saveLayer 해제
}
```

---

### 2.2 [P0 Critical] textMeasure ↔ Yoga 레이아웃 미연동

**현황**
- `skia/textMeasure.ts`에 `createYogaMeasureFunc()` 구현 완료
- 어디에서도 import되지 않음
- 현재 텍스트 노드의 크기는 PixiJS 측정값에 의존 → **PixiJS와 CanvasKit 사이 텍스트 크기 불일치 가능**

**영향**: 텍스트가 overflow되거나 레이아웃 컨테이너 크기와 불일치

**보완 방안**

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | `@pixi/layout` Yoga 노드 생성 경로 파악 | `canvas/layout/` 디렉터리 |
| 2 | Text 요소의 Yoga 노드에 `measureFunc` 설정 — WASM_FLAGS.CANVASKIT_RENDERER가 true일 때만 | `layout/` 또는 `sprites/TextSprite.tsx` |
| 3 | `createYogaMeasureFunc(ck, fontMgr, text, style, maxWidth)` 호출하여 Yoga에 등록 | 연결 지점 |
| 4 | fontMgr 의존성 — SkiaFontManager 싱글톤에서 `getFontMgr()` 호출 | `textMeasure.ts` 호출부 |

**주의사항**:
- `@pixi/layout`이 Yoga measureFunc 커스터마이징을 지원하는지 확인 필요
- 지원하지 않으면 **Skia 전용 레이아웃 패스**를 별도 구현해야 함
- 우선순위가 높지만 `@pixi/layout` API 조사가 선행되어야 하므로 **탐색 후 구현**

---

### 2.3 [P1 High] WASM 바이너리 배포 경로 누락

**현황**
- `public/wasm/` 디렉터리 자체가 존재하지 않음
- `canvaskit-wasm` 패키지는 `node_modules`에 설치되어 있으나, 빌드 시 `public/wasm/canvaskit.wasm`으로 복사되지 않음
- `initCanvasKit.ts`가 CDN fallback을 가지고 있을 수 있으나, 프로덕션 배포 시 외부 CDN 의존은 바람직하지 않음

**보완 방안**

| 단계 | 작업 |
|------|------|
| 1 | `package.json`에 postinstall 스크립트 추가: `cp node_modules/canvaskit-wasm/bin/canvaskit.wasm public/wasm/` |
| 2 | `public/wasm/` 디렉터리 생성 및 `.gitkeep` 추가 |
| 3 | `.gitignore`에 `public/wasm/canvaskit.wasm` 추가 (바이너리는 git 미추적) |
| 4 | `initCanvasKit.ts`에서 로컬 경로 우선, CDN fallback 확인 |

**검증**: `pnpm install && ls -la apps/builder/public/wasm/canvaskit.wasm`

---

### 2.4 [P1 High] CI/CD 배포 파이프라인 WASM 누락

**현황**
- `.github/workflows/deploy.yml`에 WASM 관련 단계 없음
- `VITE_RENDER_MODE`, `VITE_WASM_SPATIAL`, `VITE_WASM_LAYOUT` 환경변수 미전달
- `canvaskit.wasm` 바이너리가 빌드 아티팩트에 포함되지 않을 수 있음

**보완 방안**

```yaml
# deploy.yml 수정 사항

    - name: Prepare WASM binaries
      run: |
        mkdir -p apps/builder/public/wasm
        cp node_modules/canvaskit-wasm/bin/canvaskit.wasm apps/builder/public/wasm/

    - name: Build project
      run: pnpm turbo run build --filter=@xstudio/builder
      env:
        # 기존 환경변수 유지
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        VITE_USE_WEBGL_CANVAS: ${{ secrets.VITE_USE_WEBGL_CANVAS }}
        VITE_CANVAS_COMPARE_MODE: ${{ secrets.VITE_CANVAS_COMPARE_MODE }}
        # WASM 환경변수 추가
        VITE_RENDER_MODE: ${{ secrets.VITE_RENDER_MODE || 'pixi' }}
        VITE_WASM_SPATIAL: ${{ secrets.VITE_WASM_SPATIAL || 'false' }}
        VITE_WASM_LAYOUT: ${{ secrets.VITE_WASM_LAYOUT || 'false' }}
```

---

### 2.5 [P1 High] Export 파이프라인 UI 미연동

**현황**
- `skia/export.ts`에 `exportToImage()`, `exportToBlobUrl()` 완전 구현
- 어디에서도 import되지 않음 — UI에서 Export 기능 접근 불가

**보완 방안**

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | Export 서비스 래퍼 생성 — CanvasKit 인스턴스와 현재 씬 트리를 연결 | `skia/exportService.ts` (신규) |
| 2 | Builder 툴바에 Export 버튼 추가 또는 기존 Export UI에 Skia 경로 분기 | 기존 Export UI 컴포넌트 |
| 3 | `WASM_FLAGS.CANVASKIT_RENDERER`일 때 Skia Export, 아닐 때 PixiJS Extract 사용 | 분기 로직 |
| 4 | 다운로드 트리거: `exportToBlobUrl()` → `<a download>` 클릭 | UI 컴포넌트 |

**핵심 구조**:
```typescript
// skia/exportService.ts
export async function exportCurrentScene(format: ExportFormat, quality?: number): Promise<string> {
  const ck = getCanvasKit();
  const rootNode = buildSkiaTreeFromRegistry(); // 현재 씬 트리
  const bounds = calculateSceneBounds(rootNode);
  return exportToBlobUrl(ck, rootNode, {
    width: bounds.width,
    height: bounds.height,
    format,
    quality,
    scale: window.devicePixelRatio,
  });
}
```

---

### 2.6 [P1 High] Element 렌더 순서(z-order) 보존

**현황**
- WASM.md에서 `elementOrderIndex`를 통한 z-order 보존을 명시
- 현재 `SkiaNodeData`에 순서 정보 없음
- `buildSkiaTreeFromRegistry()`가 Map 순회 순서에 의존 → 삽입 순서 보장이지만 사용자 z-order와 다를 수 있음

**보완 방안**

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | `SkiaNodeData`에 `order?: number` 필드 추가 | `nodeRenderers.ts` |
| 2 | 각 Sprite에서 `element.order` 또는 store의 `childrenMap` 순서를 `order`로 전달 | Sprite 컴포넌트들 |
| 3 | `buildSkiaTreeFromRegistry()`에서 children을 `order` 기준으로 정렬 후 렌더 | `SkiaOverlay.tsx` 또는 `skiaNodeRegistry.ts` |
| 4 | CSS `zIndex` 스타일이 있으면 우선 적용 | `styleConverter.ts` |

---

### 2.7 [P2 Medium] Mesh Gradient 구현

**현황**
- `skia/fills.ts:96-106`에 stub만 존재, dev 모드 콘솔 경고 출력
- 3가지 구현 전략이 코멘트로 제시됨

**보완 방안**

추천 전략: **Option 2 — Coons 패치 → ImageData → MakeImageShader**

| 단계 | 작업 |
|------|------|
| 1 | mesh-gradient 데이터 구조 정의 (control points, colors) |
| 2 | CPU 측에서 Coons 패치 보간 → `ImageData` 생성 |
| 3 | `ck.MakeImageFromEncoded()` 또는 직접 pixel buffer로 `SkImage` 생성 |
| 4 | `ck.MakeImageShader(image, TileMode, TileMode)` → Paint.setShader |
| 5 | 캐싱: gradient 파라미터 해시 기반으로 생성된 shader 재사용 |

**우선순위 낮음**: mesh-gradient를 사용하는 요소가 현재 적을 수 있으므로, 다른 P0/P1 항목 완료 후 진행

---

### 2.8 [P2 Medium] Phase 0 벤치마크 체계화

**현황**
- WASM.md §0.2에서 50/500/2,000/5,000 요소 시나리오별 벤치마크 요구
- 현재 벤치마크 코드가 최소한이거나 수동 측정에 의존

**보완 방안**

| 단계 | 작업 |
|------|------|
| 1 | `tests/benchmarks/` 디렉터리에 자동 벤치마크 스크립트 생성 |
| 2 | 시나리오: 50, 500, 2000, 5000 요소를 프로그래밍적으로 생성 |
| 3 | 측정 지표: 초기 렌더 시간, 프레임당 렌더 시간, 메모리 사용량 |
| 4 | PixiJS vs CanvasKit 비교 결과 출력 |
| 5 | CI에서 회귀 감지용 임계값 설정 (선택) |

---

### 2.9 [P2 Medium] SpatialIndex RAF 타이밍 & 페이지 전환

**현황**
- SpatialIndex WASM 가속 구현 완료
- 페이지 전환 시 인덱스 정리/재구축 경로 미확인
- RAF 기반 동기화 타이밍 최적화 여지

**보완 방안**

| 단계 | 작업 |
|------|------|
| 1 | 페이지 전환 이벤트 시 SpatialIndex 클리어 + 새 페이지 요소 재등록 확인 |
| 2 | RAF 콜백에서 SpatialIndex 업데이트 배치 처리 검증 |
| 3 | 엣지 케이스: 빈 페이지, 요소 0개, 대량 삭제 후 전환 테스트 |

---

### 2.10 [P3 Low] Layout Worker 호출 경로 강화

**현황**
- `initLayoutWorker()`가 `WASM_FLAGS.LAYOUT_WORKER=true`일 때 조건부 실행
- `BlockEngine.ts`, `GridEngine.ts`에서 Worker 사용 경로 존재
- 기본 환경변수가 `false`이므로 실사용 경로가 활성화되지 않음

**보완 방안**

| 단계 | 작업 |
|------|------|
| 1 | `VITE_WASM_LAYOUT=true`로 설정 후 엔드투엔드 레이아웃 동작 검증 |
| 2 | Worker 메시지 에러 핸들링 (timeout, crash recovery) 검증 |
| 3 | fallback 경로(Worker 실패 시 메인 스레드 폴백) 동작 확인 |

---

### 2.11 [P3 Low] 이벤트 메커닉 종합 검증

**현황**
- `eventBridge.ts` 구현 완료 (PointerEvent, WheelEvent, MouseEvent 클론)
- WASM.md §5.7 체크리스트 전체 항목의 실제 동작 검증 미수행

**보완 방안**

| 단계 | 검증 항목 |
|------|----------|
| 1 | 단일 요소 클릭 → 선택 |
| 2 | 드래그 시작/이동/종료 → 요소 이동 |
| 3 | 포인터 캡처 → 요소 밖에서도 이벤트 수신 |
| 4 | 멀티 셀렉트 (Shift/Cmd+클릭) |
| 5 | 더블클릭 → 텍스트 편집 모드 진입 |
| 6 | 휠 줌/패닝 |
| 7 | 우클릭 → 컨텍스트 메뉴 |

---

## 3. 실행 순서 (의존성 기반)

```
Phase A: 인프라 (2.3 → 2.4)
  ├─ 2.3 WASM 바이너리 배포 경로
  └─ 2.4 CI/CD 파이프라인

Phase B: 렌더링 정확성 (2.1 → 2.6)  [Phase A 이후]
  ├─ 2.1 Blend Mode 연동
  └─ 2.6 Element z-order 보존

Phase C: 텍스트 정밀도 (2.2)  [Phase A 이후]
  └─ 2.2 textMeasure ↔ Yoga 연동 (조사 선행)

Phase D: 기능 완성 (2.5 → 2.7)  [Phase B 이후]
  ├─ 2.5 Export UI 연동
  └─ 2.7 Mesh Gradient 구현

Phase E: 품질 보증 (2.8 → 2.11)  [Phase B, C 이후]
  ├─ 2.8 벤치마크 체계화
  ├─ 2.9 SpatialIndex 페이지 전환
  ├─ 2.10 Layout Worker 검증
  └─ 2.11 이벤트 메커닉 검증
```

```
Timeline:
  Phase A ─────┐
               ├── Phase B ─────┐
               ├── Phase C      ├── Phase D ─── Phase E
               └────────────────┘
```

---

## 4. 영향 범위 요약

| 보완 항목 | 수정 파일 | 신규 파일 | 위험도 |
|----------|----------|----------|--------|
| 2.1 Blend Mode | nodeRenderers.ts, BoxSprite.tsx, TextSprite.tsx, ImageSprite.tsx, styleConverter.ts | - | 중 |
| 2.2 textMeasure | 조사 후 결정 | - | 높 (layout 영향) |
| 2.3 WASM 바이너리 | package.json, .gitignore | public/wasm/.gitkeep | 낮 |
| 2.4 CI/CD | deploy.yml | - | 낮 |
| 2.5 Export UI | 기존 Export 컴포넌트 | exportService.ts | 중 |
| 2.6 z-order | nodeRenderers.ts, Sprite들, skiaNodeRegistry.ts | - | 중 |
| 2.7 Mesh Gradient | fills.ts | - | 낮 |
| 2.8 벤치마크 | - | tests/benchmarks/ | 낮 |
| 2.9 SpatialIndex | spatialIndex 관련 | - | 낮 |
| 2.10 Layout Worker | - (검증만) | - | 낮 |
| 2.11 이벤트 검증 | - (검증만) | - | 낮 |

---

## 5. 제외 항목

| 항목 | 사유 |
|------|------|
| SharedArrayBuffer | 요청에 의해 명시적 제외 |
| Phase 3 Text Engine | spec에 따라 제거됨 (CanvasKit Paragraph로 대체, 정상) |
| Camera-only blit | 이미 구현 완료 (`SkiaRenderer.ts:187-202`) |
| Event Bridge | 이미 구현 완료 (`eventBridge.ts`) |
| Font loading | 이전 세션에서 수정 완료 (`loadSkiaFonts.ts`) |
| Font weight rendering | 이전 세션에서 수정 완료 (`nodeRenderers.ts`, `TextSprite.tsx`) |
