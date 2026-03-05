# Skia Button 텍스트 줄바꿈 버그

## Status: 보류 (2026-03-05)

## 증상

- "Action 3" 같은 **공백 포함 텍스트**가 CSS Preview에서는 한 줄인데, Canvas(Skia/WebGL)에서 강제 줄바꿈됨
- "Action" / "3" 으로 분리되어 2줄 렌더링
- 공백 없는 텍스트("Action3")에서는 발생하지 않음

## 근본 원인

CanvasKit Paragraph API의 `paragraph.layout(maxWidth)` 호출 시, maxWidth가 텍스트 intrinsic width보다 조금이라도 작으면 **공백 위치에서 word-wrap** 발생.

### 불일치 발생 경로

```
[Layout Engine — 폭 측정]                [Skia Renderer — 텍스트 렌더링]
calculateContentWidth()                  specShapesToSkia() → nodeRenderers
  → measureTextWidth()                     → paragraph.layout(maxWidth)
  → canvaskitTextMeasurer                  → maxWidth = containerWidth - padding
  → fontFamily: resolveFontFamily()        → fontFamily: 배열 전달
    (첫 번째 폰트만 추출)                    (CSS fallback chain 그대로)
  → fontWeight: 400 (기본값)               → fontWeight: Spec 값 (500)
  → 결과: N px → Taffy container 결정      → maxWidth < N px 이면 줄바꿈
```

### 불일치 원인 3가지

1. **fontFamily 해석 차이**: 측정기(`canvaskitTextMeasurer`)는 `resolveFontFamily()`로 CSS fallback chain에서 첫 번째 폰트만 추출. specShapeConverter는 전체 CSS string을 단일 배열 요소로 전달 → CanvasKit `fontFamilies` 매칭 실패 → fallback 폰트 사용 → 폭 차이
2. **fontWeight 불일치**: `calculateTextWidth()`가 기본 fontWeight 400 사용, Spec Button은 500 → 글리프 폭 차이
3. **padding 계산 경로 차이**: layout engine의 `BUTTON_SIZE_CONFIG.paddingX` vs specShapeConverter의 `shape.x` 기반 padding 역산

## 시도한 해결 방법들

### 방법 A: fontFamily split (부분 해결)

```typescript
// specShapeConverter.ts — CSS fallback chain을 개별 폰트명으로 분리
const fontFamilies = shape.fontFamily
  ? [
      ...shape.fontFamily.split(",").map((f: string) => f.trim()),
      "Inter",
      "system-ui",
      "sans-serif",
    ]
  : ["Inter", "system-ui", "sans-serif"];
```

- 효과: CanvasKit fontFamilies 매칭 성공률 향상
- 한계: fontWeight 불일치 남아있으면 여전히 발생 가능

### 방법 B: fontWeight 전달 (부분 해결)

```typescript
// layout/engines/utils.ts — BUTTON_SIZE_CONFIG에 fontWeight 추가
const BUTTON_SIZE_CONFIG = {
  xs: { paddingLeft: 8, paddingRight: 8, paddingY: 4, fontSize: 10, fontWeight: 500, borderWidth: 1 },
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 12, fontWeight: 500, borderWidth: 1 },
  md: { paddingLeft: 16, paddingRight: 16, paddingY: 8, fontSize: 14, fontWeight: 500, borderWidth: 1 },
  // ...
};

// calculateTextWidth에 fontWeight 파라미터 추가
function calculateTextWidth(text, fontSize, padding, fontWeight) { ... }
```

- 효과: 측정-렌더링 fontWeight 정합성 확보
- 한계: 소수점 반올림 차이 가능

### 방법 C: maxWidth 버퍼 (증상 회피)

```typescript
// specShapeConverter.ts
maxWidth = Math.ceil(maxWidth) + 1;
```

- 효과: 1px 버퍼로 소수점 오차 흡수
- 한계: 근본 해결 아님, 매직 넘버

### 방법 D: whiteSpace: "nowrap" 기본값 (증상 회피)

```typescript
// specShapeConverter.ts — 모든 Spec shape 텍스트에 적용
whiteSpace: "nowrap",

// 또는 컴포넌트 기본값 시스템으로 이동:
// unified.types.ts — createDefaultButtonProps()
style: { whiteSpace: "nowrap" }

// Button.css
white-space: nowrap;
```

- 효과: 공백에서의 word-wrap 완전 차단
- 한계: 줄바꿈 자체를 막는 것이지, 측정-렌더링 정합성 문제는 남아있음
- Typography 패널의 Wrap 셀렉터로 사용자 오버라이드 가능

## 근본 해결 방향 (미착수)

**측정-렌더링 동일 경로 보장**: layout engine의 텍스트 폭 측정과 Skia 렌더링이 동일한 fontFamily/fontWeight/letterSpacing 설정을 사용하도록 단일 소스 정합성 확보.

관련 파일:

- `canvaskitTextMeasurer.ts` — `measureTextWidth()`, `resolveFontFamily()`
- `layout/engines/utils.ts` — `calculateTextWidth()`, `BUTTON_SIZE_CONFIG`
- `specShapeConverter.ts` — Spec shapes → SkiaNodeData 변환
- `nodeRenderers.ts` — CanvasKit Paragraph 렌더링 (`whiteSpace` 처리)
- `fontManager.ts` — `resolveFamily()` 폰트 매칭

## 관련 컴포넌트

Button, ToggleButton, Badge, Link, Tab — 공백 포함 텍스트를 가진 모든 Spec 기반 컴포넌트
