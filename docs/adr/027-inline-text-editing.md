# ADR-027: Canvas Inline Text Editing (WebGL 위 텍스트 직접 편집)

## Status

Proposed (2026-03-06)

## Context

### 문제 정의

XStudio는 CanvasKit/Skia WASM 기반 캔버스 렌더러를 사용한다. 현재 텍스트 편집은 **우측 속성 패널의 입력 필드**를 통해서만 가능하며, 캔버스에서 텍스트를 직접 편집할 수 없다. 이는 노코드 빌더의 핵심 UX 기대치에 미달한다.

**현재 흐름** (비효율):

```
캔버스에서 텍스트 요소 클릭 → 우측 패널 스크롤 → 속성 입력란 찾기 → 텍스트 수정 → 캔버스 확인
```

**목표 흐름** (직관적):

```
캔버스에서 텍스트 요소 더블클릭 → 즉시 인라인 편집 → Enter/Escape/외부 클릭으로 완료
```

### 업계 레퍼런스

| 도구        | 인라인 편집 방식                                       |
| ----------- | ------------------------------------------------------ |
| **Pencil**  | WebGL 위 DOM contenteditable + Quill, 행렬 포지셔닝    |
| **Figma**   | Canvas 위 contenteditable div, 행렬 기반 CSS transform |
| **Framer**  | Canvas 위 contenteditable, 줌/팬 동기화                |
| **Webflow** | DOM 직접 편집 (Canvas가 DOM 기반)                      |

### Pencil 구현 분석 (참조: `docs/pencil-extracted/`)

Pencil은 다음 패턴으로 구현:

1. **상태 머신**: `EditingTextState` — 편집 중 포인터 이벤트 전부 무시 (DOM 에디터가 처리)
2. **이벤트 브릿지**: `eventEmitter.emit("startTextEdit")` → React 훅 리스닝 → DOM 오버레이 생성
3. **행렬 포지셔닝**: `camera.worldTransform + node.getWorldMatrix()` → CSS `matrix() translate()`
4. **이중 렌더링 방지**: Skia `hideText()` / `showText()` — 편집 중 캔버스 텍스트 숨김
5. **Quill 에디터**: contenteditable + 리치 텍스트 지원
6. **실시간 동기화**: Quill `text-change` → 노드 속성 업데이트 (undo 미기록)
7. **Undo 통합**: 편집 시작 시 스냅샷 → 편집 완료 시 단일 undo 블록 커밋

### Hard Constraints

- CanvasKit/Skia 렌더러 유지 (DOM Canvas가 아님)
- PixiJS EventBoundary 히트 테스트 체계 유지
- 멀티페이지 캔버스 (`pagePositions` 오프셋) 지원 필수
- Zustand 상태 관리 파이프라인 (Memory → Index → History → DB → Preview) 준수
- `layoutVersion` 계약 준수
- Spec 기반 컴포넌트 텍스트 (Button label 등)는 Phase 1 범위 외

## Alternatives Considered

### 대안 A: DOM Overlay + contenteditable div (Pencil/Figma 방식)

- 설명: 캔버스 위에 absolute 포지셔닝된 contenteditable div 오버레이. CSS transform으로 캔버스 좌표계에 매핑. 편집 중 Skia 텍스트 렌더링 숨김.
- 위험:
  - 기술: **M** — Skia ↔ DOM 폰트 렌더링 미세 차이 (텍스트 점프 가능)
  - 성능: **L** — DOM 노드 1개 추가, 영향 미미
  - 유지보수: **L** — 독립적 레이어, 기존 코드 침투 최소
  - 마이그레이션: **L** — 점진 도입 가능 (Text 노드 → Spec 컴포넌트 순)

### 대안 B: CanvasKit 네이티브 IME 통합

- 설명: CanvasKit 내부에서 직접 텍스트 입력 처리. hidden textarea로 IME 이벤트 수신 → Skia paragraph 실시간 재렌더링.
- 위험:
  - 기술: **H** — IME(한글/일본어/중국어) 조합 처리 복잡, 커서/셀렉션 직접 구현 필요
  - 성능: **M** — 매 키스트로크마다 paragraph 재생성 + Skia 렌더
  - 유지보수: **H** — 커서, 셀렉션, 클립보드, 접근성 모두 직접 구현
  - 마이그레이션: **L** — 독립 모듈

### 대안 C: 팝오버 에디터 (캔버스 옆 플로팅 입력)

- 설명: 더블클릭 시 해당 요소 근처에 플로팅 textarea 표시. 캔버스 좌표계와 무관.
- 위험:
  - 기술: **L** — 단순 DOM 포지셔닝
  - 성능: **L** — 최소 오버헤드
  - 유지보수: **L** — 독립적
  - 마이그레이션: **L** — 즉시 도입 가능

## Risk Threshold Check

- 대안 B: HIGH 2개 (기술, 유지보수) → IME + 커서/셀렉션 직접 구현은 브라우저 재구현에 가까움. **기각**
- 대안 C: 모두 LOW지만 **UX 가치가 낮음** — "인라인" 편집이 아닌 별도 입력 → 현재 속성 패널 방식과 본질적 차이 없음. **보류 (fallback)**
- 대안 A: HIGH 없음, M 1개 (폰트 렌더링 차이) → Gate로 관리 가능

## Decision

**대안 A: DOM Overlay + contenteditable div** 채택

Pencil/Figma와 동일한 업계 검증된 패턴. Skia ↔ DOM 폰트 차이는 Gate G1에서 허용 범위 검증.

### 위험 수용 근거

- **폰트 렌더링 차이 (M)**: CanvasKit Skia paragraph와 브라우저 CSS 사이의 미세한 차이는 편집 시작/종료 시 1~2px 점프로 나타날 수 있음. Pencil/Figma도 동일 현상이 있으며 사용자 수용 범위 내. 줌 레벨이 높을수록 차이 증폭 → G1 Gate에서 200% 줌까지 허용 범위 검증.

## Gates

| Gate | 조건                                                                                  | 검증 시점       |
| ---- | ------------------------------------------------------------------------------------- | --------------- |
| G0   | Text/Heading 요소 더블클릭 → contenteditable 오버레이 정확히 겹침 (100%/150%/200% 줌) | Phase A 완료 시 |
| G1   | Skia 텍스트 숨김 ↔ DOM 텍스트 표시 전환 시 시각적 점프 2px 이내 (100% 줌 기준)        | Phase A 완료 시 |
| G2   | 한글 IME 조합 정상 동작 (macOS, Chrome)                                               | Phase A 완료 시 |
| G3   | 멀티페이지 환경에서 다른 페이지 텍스트 편집 시 좌표 정확                              | Phase B 완료 시 |

## Consequences

### Positive

- 캔버스 위 직접 텍스트 편집 → 노코드 빌더 핵심 UX 달성
- 업계 표준 패턴 (Pencil/Figma) 검증됨 → 구현 리스크 낮음
- 기존 렌더링 파이프라인 변경 최소 (Skia hide/show만 추가)
- 점진적 확장 가능 (Text → Heading → Button label 순)

### Negative

- Skia ↔ DOM 폰트 렌더링 미세 차이 (1~2px 점프 가능)
- 줌/팬 시 DOM 오버레이 재포지셔닝 비용 (requestAnimationFrame 수준)
- Spec 컴포넌트 내부 텍스트 (Button, Badge)의 정확한 bounds 계산 복잡 (Phase C)

---

## Implementation Plan

### Phase A: 기본 인프라 + Text/Heading 편집 (핵심 MVP)

> 범위: Text, Heading 요소의 캔버스 직접 편집

#### A-1. 상태 슬라이스 추가

**파일**: `apps/builder/src/builder/store/slices/textEditingSlice.ts` (신규)

```typescript
interface TextEditingSlice {
  // 상태
  isEditingText: boolean;
  editingElementId: string | null;
  editingOriginalValue: string | null; // undo용 스냅샷

  // 액션
  startTextEditing: (elementId: string) => void;
  finishTextEditing: (newValue: string) => void;
  cancelTextEditing: () => void;
}
```

- `startTextEditing`: `isEditingText=true`, 원본 텍스트 스냅샷 저장
- `finishTextEditing`: 히스토리 기록 → 요소 업데이트 → `isEditingText=false`
- `cancelTextEditing`: 원본 복원 → `isEditingText=false`

#### A-2. 더블클릭 감지

**파일**: `apps/builder/src/builder/workspace/canvas/` 관련 이벤트 핸들러

- PixiJS EventBoundary의 `pointertap` / `pointerdown` 타임스탬프 비교 (300ms 임계)
- 대상 요소 타입이 `text` | `heading`이면 `startTextEditing(elementId)` 호출
- 편집 중 PixiJS 포인터 이벤트 차단 (hitArea 해제 또는 조건부 무시)

#### A-3. DOM Overlay 레이어

**파일**: `apps/builder/src/builder/workspace/canvas/TextEditOverlay.tsx` (신규)

```
<div data-text-edit-overlay class="absolute inset-0 pointer-events-none">
  <div class="fixed" ref={containerRef}>
    <!-- 편집 시에만 생성 -->
    <div
      contenteditable="true"
      style={{
        position: 'absolute',
        transformOrigin: 'top left',
        transform: `matrix(...)`,  // 카메라 + 요소 좌표 합성
        pointerEvents: 'auto',
        // 폰트 스타일 동기화
      }}
    />
  </div>
</div>
```

**포지셔닝 계산**:

```
1. pagePositions[pageId]  → 페이지 오프셋 (x, y)
2. Taffy 레이아웃 결과    → 요소의 페이지 내 위치 (x, y, w, h)
3. Camera transform       → 줌/팬 (scale, translateX, translateY)

→ CSS transform = scale(zoom) translate(pageX + elemX - scrollX, pageY + elemY - scrollY)
→ width/height = elemW * zoom, elemH * zoom (또는 transform에 포함)
```

#### A-4. Skia 텍스트 숨김/복원

**파일**: `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`

- `renderText()` 진입 시 `isEditingText && editingElementId === elementId`이면 텍스트 렌더링 스킵
- 배경/보더는 유지, **텍스트 드로잉만** 스킵

#### A-5. 폰트 스타일 동기화

**파일**: TextEditOverlay 내부

- `specTextStyle.ts`의 `extractSpecTextStyle(tag, props)`로 fontSize/fontWeight/fontFamily 추출
- Skia와 동일한 폰트 속성을 CSS로 적용:
  - `font-family`: `buildFontFamilies()` 결과의 CSS 폰트 스택
  - `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-align`
  - `color`: `resolveToken('{color.neutral}')` → hex

#### A-6. 편집 완료/취소 처리

- **Enter** (단일행) 또는 **Escape**: `cancelTextEditing()` (원본 복원)
- **Cmd/Ctrl+Enter** (멀티행) 또는 외부 클릭: `finishTextEditing(newValue)`
- **외부 클릭 감지**: `document.addEventListener('mousedown', handler)` — 오버레이 외부이면 finish

#### A-7. Undo/Redo 통합

- `startTextEditing`에서 원본 `textContent` 스냅샷
- `finishTextEditing`에서 변경이 있으면 히스토리 기록 (단일 블록)
- 편집 중 실시간 업데이트는 undo 미기록 (Pencil 패턴과 동일)

### Phase B: 줌/팬 동기화 + 멀티페이지

> 범위: 카메라 변환 추적, 페이지 간 텍스트 편집

#### B-1. 카메라 변환 추적

- 줌/팬 변경 시 DOM 오버레이 CSS transform 재계산
- `requestAnimationFrame` 기반 또는 카메라 상태 변경 subscribe

#### B-2. 멀티페이지 좌표 보정

- `pagePositions[pageId]` 오프셋을 포지셔닝 계산에 반영
- 다른 페이지 텍스트 더블클릭 시에도 정확한 좌표

#### B-3. 편집 중 줌/팬 처리

- 편집 중 줌 변경 → DOM 오버레이 실시간 리사이즈
- 편집 중 팬 변경 → DOM 오버레이 실시간 이동
- (선택) 편집 중 줌/팬 비활성화 옵션

### Phase C: Spec 컴포넌트 내부 텍스트

> 범위: Button label, Badge text, Card title 등 Spec 기반 컴포넌트

#### C-1. Spec 텍스트 bounds 계산

- `extractSpecTextStyle(tag, props)`로 텍스트 영역의 상대 위치/크기 추출
- Spec shapes에서 텍스트 shape의 x/y/width/height 결정
- padding, alignment 고려한 정확한 텍스트 영역 bounds

#### C-2. 컴포넌트별 편집 가능 텍스트 매핑

| 컴포넌트     | 편집 대상 속성                       | 비고                                 |
| ------------ | ------------------------------------ | ------------------------------------ |
| Button       | `label`                              | SELF_PADDING_TAGS, 내부 padding 고려 |
| Badge        | `label`                              | 짧은 텍스트, 크기 자동 조절          |
| Card         | CardHeader > Heading의 `textContent` | 자식 요소 텍스트                     |
| Link         | `label`                              |                                      |
| ToggleButton | `label`                              |                                      |

#### C-3. 편집 시 크기 재계산

- 텍스트 변경 → `layoutVersion + 1` → Taffy 재계산 → DOM 오버레이 크기 업데이트
- fit-content 요소: 텍스트 길이에 따라 요소 크기 변동 → 오버레이도 동기화

### Phase D: 고급 기능 (장기)

#### D-1. 리치 텍스트 지원

- Bold, Italic, 색상 등 인라인 스타일
- Quill 또는 TipTap 같은 리치 텍스트 에디터 도입 검토

#### D-2. 멀티 라인 편집

- 자동 높이 증가
- 줄바꿈 + CSS text wrapping 속성 반영

#### D-3. 텍스트 편집 툴바

- 편집 중 플로팅 미니 툴바 (B/I/U, 정렬, 색상)

---

## 주요 파일 영향 분석

### 신규 파일

| 파일                               | 용도                  |
| ---------------------------------- | --------------------- |
| `store/slices/textEditingSlice.ts` | 텍스트 편집 상태 관리 |
| `canvas/TextEditOverlay.tsx`       | DOM 오버레이 컴포넌트 |

### 수정 파일

| 파일                           | 변경 내용                           | Phase |
| ------------------------------ | ----------------------------------- | ----- |
| `store/useStore.ts`            | textEditingSlice 통합               | A     |
| `canvas/skia/nodeRenderers.ts` | 편집 중 텍스트 렌더링 스킵          | A     |
| `canvas/` 이벤트 핸들러        | 더블클릭 감지 + 편집 중 이벤트 차단 | A     |
| `canvas/BuilderCanvas.tsx`     | TextEditOverlay 마운트              | A     |
| `workspace/canvas/Camera` 관련 | 카메라 변환 subscribe               | B     |

### 미수정 파일 (변경 불필요)

- `specTextStyle.ts` — 이미 fontSize/fontWeight/fontFamily 추출 기능 존재
- `canvaskitTextMeasurer.ts` — 편집 중 측정은 DOM이 처리
- Preview iframe — 편집은 Builder 캔버스 전용, Preview에 영향 없음

---

## 기술 상세

### 좌표 변환 공식

```
// 요소의 스크린 좌표 계산
const pagePos = pagePositions[pageId];          // { x, y }
const elemLayout = layoutMap.get(elementId);     // { x, y, width, height }
const camera = cameraState;                      // { zoom, scrollX, scrollY }

const screenX = (pagePos.x + elemLayout.x - camera.scrollX) * camera.zoom;
const screenY = (pagePos.y + elemLayout.y - camera.scrollY) * camera.zoom;
const screenW = elemLayout.width * camera.zoom;
const screenH = elemLayout.height * camera.zoom;

// CSS 적용
overlay.style.transform = `translate(${screenX}px, ${screenY}px)`;
overlay.style.width = `${screenW}px`;
overlay.style.height = `${screenH}px`;
overlay.style.fontSize = `${fontSize * camera.zoom}px`;
```

### 이벤트 흐름도

```
[더블클릭]
  ↓
PixiJS EventBoundary → pointerdown 타임스탬프 비교
  ↓ (300ms 이내 + text/heading 타입)
store.startTextEditing(elementId)
  ↓
TextEditOverlay 감지 (useStore subscribe)
  ↓
1. Skia: nodeRenderers에서 해당 요소 텍스트 스킵
2. DOM: contenteditable div 생성 + 포지셔닝 + 포커스
  ↓
[사용자 입력]
  ↓
contenteditable onChange → store.updateElement(textContent) [undo 미기록]
  ↓
[완료 트리거: Escape / Cmd+Enter / 외부 클릭]
  ↓
store.finishTextEditing(newValue)
  ↓
1. 히스토리 기록 (원본 → 최종, 단일 블록)
2. DOM 오버레이 제거
3. Skia 텍스트 렌더링 복원
4. DB Persist + Preview Sync (백그라운드)
```

---

## 참조

- Pencil 구현 분석: `docs/pencil-extracted/` (engine/07, 11, 12, 13, 14, ui/19)
- Skia 텍스트 렌더링: `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`
- Spec 텍스트 스타일: `apps/builder/src/builder/workspace/canvas/skia/specTextStyle.ts`
- 멀티페이지: `docs/MULTIPAGE.md`
- 카메라: `apps/builder/src/builder/workspace/canvas/hooks/useCamera.ts`
