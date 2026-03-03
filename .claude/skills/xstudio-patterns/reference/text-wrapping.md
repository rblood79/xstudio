# Text Wrapping & Measurement Patterns (ADR-005)

CSS 텍스트 래핑 속성의 CanvasKit 에뮬레이션 패턴.

## 핵심 구조

### 공유 유틸리티 (textWrapUtils.ts)
`canvaskitTextMeasurer.ts`(높이 측정)와 `nodeRenderers.ts`(렌더링) 양쪽에서 동일한 전처리 함수를 호출하여 **측정-렌더링 경로 일치**를 보장한다.

| 함수 | 용도 |
|------|------|
| `cssNormalBreakProcess()` | `word-break:normal` + `overflow-wrap:normal` — 수동 `\n` 삽입 + effectiveWidth |
| `computeKeepAllWidth()` | `word-break:keep-all` — CJK 연속 문자열을 단어로 보호 |
| `preprocessBreakWordText()` | `overflow-wrap:break-word` — maxWidth 초과 단어에 ZWS+`\n` 삽입 |
| `measureTokenWidth()` | CanvasKit으로 단일 토큰 폭 측정 |
| `measureSpaceWidth()` | 스페이스 폭 측정 ('x x' vs 'xx' 차이) |

### 에뮬레이션 조합 테이블

| word-break | overflow-wrap | 처리 방식 |
|-----------|--------------|-----------|
| normal | normal | `cssNormalBreakProcess()` → `\n` 삽입 + effectiveWidth |
| normal | break-word/anywhere | `preprocessBreakWordText()` → ZWS+`\n` 삽입 |
| break-all | (any) | `Array.from(text).join('\u200B')` — 전체 ZWS 삽입 |
| keep-all | normal | `computeKeepAllWidth(allowOverflowBreak=false)` |
| keep-all | break-word | `computeKeepAllWidth(allowOverflowBreak=true)` |

## SkiaNodeData.text 텍스트 래핑 필드

```typescript
interface SkiaTextData {
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
  wordBreak?: 'normal' | 'break-all' | 'keep-all';
  overflowWrap?: 'normal' | 'break-word' | 'anywhere';
  textOverflow?: 'ellipsis' | 'clip';
  clipText?: boolean;  // overflow:hidden|clip → canvas.clipRect()
}
```

## 데이터 흐름

### text/heading 요소 (TextSprite)
```
element.style → TextSprite.tsx → SkiaNodeData.text에 whiteSpace/wordBreak/overflowWrap/textOverflow/clipText 주입
```

### spec shapes(Button 등) (ElementSprite)
```
element.style → ElementSprite.tsx → specShapesToSkia() 결과의 text children에 수동 주입
```
**CRITICAL**: spec shapes는 element style을 자동 상속하지 않으므로, `specNode.children` 순회하여 text 자식에 수동 주입 필수.

## CSS 상속 연동

- `cssResolver.ts`: `INHERITED_PROPERTIES` Set에 `wordBreak`, `overflowWrap`, `whiteSpace` 등록
- `elements.ts`: `INHERITED_LAYOUT_PROPS`에 동일 3개 속성 등록 (dirty tracking → layoutVersion 증가)
- `elementUpdate.ts`: `INHERITED_LAYOUT_PROPS_UPDATE`에 동일 복사본 (순환 import 방지)

## isEllipsis 3중 조건 (CRITICAL)

```typescript
const isEllipsis = node.text.textOverflow === 'ellipsis'
  && whiteSpace === 'nowrap'
  && !!node.text.clipText;
```
CSS 전제조건: `text-overflow:ellipsis` + `white-space:nowrap` + `overflow:hidden|clip`

## Inspector Preset UI

`TypographySection.tsx`에서 7가지 프리셋 + Custom 모드 제공:

| 프리셋 | white-space | word-break | overflow-wrap | text-overflow | overflow |
|--------|-----------|-----------|--------------|--------------|---------|
| Normal | — | — | — | — | — |
| No Wrap | `nowrap` | — | — | — | — |
| Truncate (...) | `nowrap` | — | — | `ellipsis` | `hidden` |
| Break Words | — | — | `break-word` | — | — |
| Break All | — | `break-all` | — | — | — |
| Keep All (CJK) | — | `keep-all` | `break-word` | — | — |
| Preserve | `pre-wrap` | — | — | — | — |

`deriveTextBehaviorPreset()`: 5개 속성 값 → 프리셋 이름 역변환 (Inspector 표시용).

## CanvasKit 큰 width 렌더링 실패 회피

```typescript
// nowrap/pre에서 paragraph.layout(100000) → 텍스트 미렌링
// 해결: maxIntrinsicWidth + 1로 재레이아웃
if (!isEllipsis && (whiteSpace === 'nowrap' || whiteSpace === 'pre')) {
  const intrinsicWidth = paragraph.getMaxIntrinsicWidth();
  if (intrinsicWidth > 0) {
    paragraph.layout(Math.ceil(intrinsicWidth) + 1);
  }
}
```

## clipText 클리핑 패턴

```typescript
const shouldClip = node.text.clipText && !isEllipsis;
if (shouldClip) {
  canvas.save();
  canvas.clipRect(ck.XYWHRect(0, 0, node.width, node.height), ck.ClipOp.Intersect, true);
}
canvas.drawParagraph(paragraph, x, y);
if (shouldClip) canvas.restore();
```
ellipsis 경로는 CanvasKit의 `maxLines:1 + ellipsis:'…'`로 자체 처리되므로 clip 불필요.
