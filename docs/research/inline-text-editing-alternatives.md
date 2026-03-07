# 인라인 텍스트 편집 — 대안 접근법 리서치

> 날짜: 2026-03-07
> 관련: ADR-027 (Canvas Inline Text Editing)

## 현재 XStudio 구현 분석

XStudio는 **Quill 에디터 + DOM 오버레이** 방식을 사용한다 (Pencil 패턴 참조).

### 현재 흐름

```
더블클릭 → useTextEdit.startEdit() → Skia 텍스트 숨김(setEditingElementId)
→ TextEditOverlay 마운트 → Quill 에디터 생성 → CSS transform으로 위치 동기화
→ 편집 완료/취소 → store 업데이트 → Skia 텍스트 복원
```

### 현재 방식의 한계

| 문제                            | 원인                                                     | 심각도 |
| ------------------------------- | -------------------------------------------------------- | ------ |
| Skia ↔ DOM 폰트 렌더링 차이     | CanvasKit Paragraph와 브라우저 CSS의 텍스트 shaping 차이 | M      |
| 편집 시작/종료 시 텍스트 "점프" | hide/show 전환 시 1~2px 위치 차이                        | M      |
| Quill 번들 크기 (~40KB gzipped) | 리치 텍스트 기능 포함한 풀 에디터                        | L      |
| rAF 기반 위치 추적 비용         | 매 프레임 getSceneBounds → state 업데이트                | L      |
| Quill 마지막 `\n` 처리          | Quill이 항상 trailing newline 추가 → 수동 제거 필요      | L      |

---

## 업계 접근법 비교

### 1. DOM Overlay + contenteditable / textarea (현재 방식 계열)

#### 1a. Quill 에디터 오버레이 (Pencil Desktop, **XStudio 현재**)

```
Skia/WebGL 렌더링 → 더블클릭 → DOM Quill 에디터 오버레이
→ CSS transform으로 캔버스 좌표 매핑 → 편집 완료 → Skia 복원
```

- **사용처**: Pencil Desktop v1.1.10, XStudio (현재)
- **장점**: 리치 텍스트 확장 가능, IME 자동 지원, 검증된 패턴
- **단점**: Quill 번들 크기, trailing `\n` 처리, 오버스펙 (plain text에 리치 텍스트 에디터)

#### 1b. Plain contenteditable div (Figma 방식)

```
WebGL/Canvas 렌더링 → 더블클릭 → contenteditable div 오버레이
→ CSS transform 매핑 → 편집 완료 → Canvas 복원
```

- **사용처**: Figma, Framer
- **장점**: 브라우저 네이티브 편집, 번들 0KB, IME 자동 지원
- **단점**: 브라우저별 contenteditable 동작 차이, 리치 텍스트 직접 관리 복잡

#### 1c. Styled textarea 오버레이 (Excalidraw 방식)

```
Canvas 2D 렌더링 → 더블클릭 → styled <textarea> 오버레이
→ position/font 스타일 매칭 → 편집 완료 → Canvas 복원
```

- **사용처**: Excalidraw, Konva.js (공식 예제)
- **장점**: 가장 단순, textarea는 contenteditable보다 동작 예측 가능
- **단점**: 단일 스타일만 가능 (인라인 볼드/색상 불가), 멀티라인 크기 동기화 수동

### 2. Hidden Textarea + 커스텀 렌더링 (Figma 내부 추정)

```
WebGL 렌더링 → 화면 밖 숨겨진 <textarea>로 키보드/IME 입력 수신
→ 커스텀 텍스트 모델 업데이트 → 커서/셀렉션 직접 렌더링 (WebGL)
→ 매 키스트로크마다 Canvas 재렌더
```

- **사용처**: Figma (추정), VS Code (DOM 기반 변형), Google Docs Canvas
- **장점**: 완벽한 렌더링 제어, Skia ↔ DOM 차이 없음 (Canvas만 사용)
- **단점**: 커서/셀렉션/IME 조합창 위치 모두 직접 구현, 구현 복잡도 극히 높음

```
구현 필요 목록:
- 커서 깜빡임 렌더링 (Canvas)
- 텍스트 셀렉션 하이라이트 (Canvas)
- IME 조합 중 underline 표시
- IME 후보창 위치 계산 (hidden textarea 위치 조정)
- 클립보드 (hidden textarea 경유)
- 드래그 셀렉션
- 더블클릭 단어 선택, 트리플클릭 줄 선택
```

### 3. EditContext API (W3C 신규 표준)

```
Canvas 렌더링 → EditContext를 Canvas 요소에 연결
→ OS 텍스트 입력 서비스가 직접 EditContext에 이벤트 전달
→ textupdate 이벤트로 텍스트 모델 업데이트 → Canvas 재렌더
```

- **사용처**: Chrome 121+ (2024.01~), Edge 121+
- **장점**:
  - Hidden textarea 해킹 완전 제거
  - IME 조합 중 뷰 업데이트해도 조합 취소 안 됨
  - IME 후보창 위치를 API로 정확히 지정 (`updateBounds()`)
  - 다중 편집 영역 지원
  - 접근성 향상 (포커스 요소가 화면에 표시됨)
- **단점**:
  - **Firefox/Safari 미지원** (2026년 3월 기준)
  - 커서/셀렉션 렌더링은 여전히 직접 구현 필요
  - 맞춤법 검사(spellcheck) API 독립 제공 안 됨

#### EditContext API 핵심 인터페이스

```typescript
// Canvas에 EditContext 연결
const editContext = new EditContext();
canvasElement.editContext = editContext;

// OS → 앱: 텍스트 입력 수신
editContext.addEventListener("textupdate", (e) => {
  // e.text: 새 텍스트
  // e.selectionStart, e.selectionEnd: 셀렉션 범위
  updateTextModel(e.text, e.updateRangeStart, e.updateRangeEnd);
  renderCanvas();
});

// OS → 앱: IME 데코레이션 (밑줄 등)
editContext.addEventListener("textformatupdate", (e) => {
  applyIMEDecorations(e.getTextFormats());
});

// 앱 → OS: 셀렉션 위치 보고 (IME 후보창 위치용)
editContext.updateSelection(selectionStart, selectionEnd);
editContext.updateControlBounds(canvasBounds);
editContext.updateSelectionBounds(cursorBounds);
```

### 4. SVG 네이티브 (Penpot 방식)

```
SVG DOM 렌더링 → SVG foreignObject로 HTML contenteditable 삽입
→ 브라우저 네이티브 편집 → SVG DOM 업데이트
```

- **사용처**: Penpot (Clojure/ClojureScript)
- **장점**: 렌더링 = 편집 동일 DOM → 폰트 차이 없음
- **단점**: XStudio는 Skia/WebGL 기반 → SVG 전환 불가능

### 5. 캔버스 네이티브 텍스트 편집 (Fabric.js IText)

```
Canvas 2D 렌더링 → 더블클릭 → Canvas 내부에서 직접 편집
→ 커서 깜빡임, 셀렉션 하이라이트 모두 Canvas 드로잉
→ hidden textarea로 키보드 입력 수신
```

- **사용처**: Fabric.js IText/Textbox
- **장점**: DOM 오버레이 없음 → 렌더링 차이 없음
- **단점**: 커서/셀렉션 직접 구현, IME 이슈, Canvas 2D 전용 (Skia/CanvasKit과 다름)

---

## XStudio에 적용 가능한 개선 방안

### 방안 A: Quill → Plain contenteditable 전환 (권장, 단기)

현재 Quill을 사용하지만, Phase A (플레인 텍스트)에서는 오버스펙이다.

```
변경: Quill 에디터 → contenteditable div
효과:
- Quill 번들 제거 (~40KB gzipped)
- trailing \n 처리 로직 제거
- 초기화 단순화 (new Quill() → div.contentEditable = "true")
- IME 지원 유지 (브라우저 네이티브)
```

**구현 변경점**:

```typescript
// Before (Quill)
const quill = new Quill(container, {
  modules: { toolbar: false },
  formats: [],
});
quill.setText(initialValue);
quill.on("text-change", () => {
  /* trailing \n 제거 포함 */
});

// After (contenteditable)
const div = document.createElement("div");
div.contentEditable = "true";
div.textContent = initialValue;
div.addEventListener("input", () => onChange(div.textContent ?? ""));
```

**리치 텍스트 확장 시 (Phase D)**: contenteditable 위에 [Lexical](https://lexical.dev/) 또는 [TipTap](https://tiptap.dev/)을 도입. Excalidraw 커뮤니티에서도 Lexical을 리치 텍스트 후보로 논의 중.

| 항목        | Quill (현재)    | contenteditable (제안) | Lexical (Phase D) |
| ----------- | --------------- | ---------------------- | ----------------- |
| 번들        | ~40KB gz        | 0KB                    | ~30KB gz          |
| plain text  | 오버스펙        | 최적                   | 적합              |
| rich text   | 지원            | 직접 구현 필요         | 네이티브 지원     |
| IME         | Quill 내부 처리 | 브라우저 네이티브      | 브라우저 네이티브 |
| trailing \n | 수동 제거 필요  | 없음                   | 없음              |

### 방안 B: EditContext API 도입 (중기, 실험적)

Chrome/Edge 전용이지만, 노코드 빌더 사용자 대부분이 Chrome 기반이라면 고려 가능.

```
전략: EditContext를 primary로, contenteditable를 fallback으로
```

```typescript
function createTextEditor(canvasElement: HTMLCanvasElement) {
  if ("EditContext" in window) {
    // Modern path: EditContext
    const ctx = new EditContext();
    canvasElement.editContext = ctx;
    ctx.addEventListener("textupdate", handleTextUpdate);
    return { type: "editcontext", ctx };
  } else {
    // Fallback: contenteditable overlay
    return createContentEditableOverlay();
  }
}
```

**장점**:

- DOM 오버레이 완전 제거 → Skia ↔ DOM 폰트 차이 문제 근본 해결
- IME 후보창 위치를 `updateBounds()`로 정확 제어
- 편집 중 줌/팬 시 DOM 리포지셔닝 불필요

**단점**:

- 커서/셀렉션을 Skia에서 직접 렌더링해야 함 (구현 비용 높음)
- Firefox/Safari fallback 필요
- 맞춤법 검사 불가

### 방안 C: 포지셔닝 정확도 개선 (즉시 적용 가능)

현재 rAF 기반 `getSceneBounds()` 추적 대신, Skia 렌더 데이터에서 정확한 텍스트 bounds를 추출.

```
현재: rAF loop → getSceneBounds(elementId) → scene→screen 변환 → setState
개선: Skia 노드의 정확한 text bounds (padding 포함) 사용
      + camera subscribe로 변경 시에만 업데이트 (매 프레임 → 이벤트 기반)
```

### 방안 D: 편집 전환 애니메이션 (UX 개선)

Skia ↔ DOM 전환 시 1~2px 점프를 숨기기 위한 미세 트랜지션:

```css
/* DOM 오버레이 등장 시 */
[data-text-edit-overlay] > div {
  opacity: 0;
  animation: fade-in 50ms ease-out forwards;
}

@keyframes fade-in {
  to {
    opacity: 1;
  }
}
```

Skia 텍스트 숨김도 동시에 1프레임 페이드아웃 → 시각적 점프 완화.

---

## 종합 권장 로드맵

| 단계     | 방안                                     | 효과                   | 난이도 |
| -------- | ---------------------------------------- | ---------------------- | ------ |
| **즉시** | C: 포지셔닝 개선 + D: 전환 애니메이션    | 현재 UX 체감 개선      | L      |
| **단기** | A: Quill → contenteditable 전환          | 번들 축소, 코드 단순화 | L~M    |
| **중기** | B: EditContext 실험 (Chrome only)        | 근본적 폰트 차이 해결  | H      |
| **장기** | A+B 통합: Lexical + EditContext fallback | 리치 텍스트 + 최적 UX  | H      |

---

## 참조

### 오픈소스 구현체

- [Excalidraw WYSIWYG Text Editor](https://github.com/excalidraw/excalidraw) — `packages/excalidraw/wysiwyg/textWysiwyg.tsx`
- [Fabric.js IText](https://github.com/fabricjs/fabric.js) — 캔버스 네이티브 텍스트 편집
- [Konva.js Editable Text](https://konvajs.org/docs/sandbox/Editable_Text.html) — textarea 오버레이 패턴
- [Carota](https://github.com/danielearwicker/carota) — Canvas 리치 텍스트 에디터
- [canvas-text-editor-tutorial](https://github.com/grassator/canvas-text-editor-tutorial) — Hidden textarea 패턴 튜토리얼

### EditContext API

- [W3C EditContext Spec](https://w3c.github.io/edit-context/)
- [W3C EditContext Explainer](https://w3c.github.io/editing/docs/EditContext/explainer.html)
- [MDN EditContext API Guide](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API/Guide)
- [Chrome Blog: Introducing EditContext API](https://developer.chrome.com/blog/introducing-editcontext-api)
- [GitHub: Hidden textarea 비교 논의](https://github.com/w3c/edit-context/issues/102)

### 리치 텍스트 에디터 후보 (Phase D)

- [Lexical](https://lexical.dev/) — Meta, Excalidraw 커뮤니티 권장
- [TipTap](https://tiptap.dev/) — ProseMirror 기반
- [Excalidraw Rich Text Issue #6678](https://github.com/excalidraw/excalidraw/issues/6678) — Lexical 검토 논의

### 업계 아키텍처

- [Figma: Building a professional design tool on the web](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/)
- [Penpot Frontend Architecture](https://help.penpot.app/technical-guide/developer/architecture/frontend/)
