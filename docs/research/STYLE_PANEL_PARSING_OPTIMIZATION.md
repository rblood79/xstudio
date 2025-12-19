# 스타일 패널 파싱 최적화 리서치

## 요약

현재 시스템은 JavaScript 객체 기반 + WebGL(PixiJS) 렌더링이므로 CSS 파싱 라이브러리(Lightning CSS, CSSTree, PostCSS)는 **부적합**합니다.
대신 **구조적 최적화(StyleValues 분할)**로 성능을 개선합니다.

### 핵심 전략
1. **StyleValues 섹션별 분할**: 28개 → 4~11개씩 분리, 75% 재계산 감소
2. **colord 도입**: 색상 파싱/변환 안정화 (1.7KB)
3. **점진적 마이그레이션**: 기존 코드 호환성 유지

> **참고**: 현재 빌더는 WebGL(PixiJS) 기반이므로 CSS Typed OM은 적용 불가

---

## 1. 현재 시스템 분석

### 1.1 현재 아키텍처

```
요소 선택 → useSelectedElementData() → mapElementToSelectedElement()
                                              ↓
                                    SelectedElement {
                                      style: CSSProperties (inline)
                                      computedStyle: CSSProperties
                                    }
                                              ↓
                                    useStyleValues() → StyleValues (28개 속성)
                                              ↓
                          ┌─────────────┼─────────────┐
                          ↓             ↓             ↓
                  TransformSection  LayoutSection  AppearanceSection ...
```

### 1.2 현재 병목 지점

1. **선택 시 전체 StyleValues 재계산**: 28개 속성 매번 추출
2. **LayoutSection 9개 속성 비교**: padding/margin 4방향씩
3. **WebGL 캔버스 ↔ 스타일 패널 동기화**: 양방향 데이터 흐름
4. **styleConverter.ts 변환 비용**: CSS 속성 → PixiJS 속성 변환

---

## 2. 라이브러리 평가

### 2.1 Lightning CSS (Rust/WASM)

| 항목 | 내용 |
|------|------|
| **개발사** | Parcel 팀 (Devon Govett) |
| **언어** | Rust → WASM 바인딩 |
| **크기** | ~800KB (WASM 번들) |
| **사용처** | Next.js, Astro, Vite 공식 지원 |
| **적합도** | ❌ 부적합 |

**부적합 이유**:
- CSS 문자열 기반, 객체→문자열 변환 오버헤드
- WASM 로딩 지연 (~100ms)

### 2.2 CSSTree (JavaScript)

| 항목 | 내용 |
|------|------|
| **개발사** | Yandex 출신 (Roman Dvornov) |
| **언어** | 순수 JavaScript |
| **크기** | ~50KB (minified) |
| **사용처** | CSSO, stylelint, css-modules |
| **적합도** | ⚠️ 제한적 |

**특징**:
- mdn-data 기반 W3C 스펙 준수
- 모듈별 import 가능 (parser, walker, lexer)
- 값 파싱: `parse('red 1px solid', { context: 'value' })`
- 속성 매칭: `lexer.matchProperty('border', ast)`

**활용 가능 영역**: shorthand 파싱에만 유용

### 2.3 PostCSS (JavaScript)

| 항목 | 내용 |
|------|------|
| **개발사** | Evil Martians |
| **크기** | ~30KB (core only) |
| **사용처** | Tailwind, Autoprefixer |
| **현재 상태** | 이미 빌드 타임에 사용 중 |
| **적합도** | ❌ 현상유지 |

**현재 package.json**:
```json
{
  "postcss": "8.5.6",
  "@tailwindcss/postcss": "4.1.17",
  "postcss-import": "16.1.1",
  "postcss-nested": "7.0.2",
  "autoprefixer": "10.4.22"
}
```

### 2.4 CSS Typed OM (브라우저 네이티브)

| 항목 | 내용 |
|------|------|
| **표준** | W3C CSS Houdini |
| **크기** | 0KB (브라우저 내장) |
| **적합도** | ✅ 권장 |

**브라우저 지원**:
| 브라우저 | 지원 | 버전 |
|---------|------|------|
| Chrome | ✅ | 66+ (2018) |
| Safari | ✅ | 16.4+ (2023) |
| Firefox | ❌ | 미지원 |

**핵심 API**:
```typescript
// 읽기 - 구조화된 값으로 반환
const styleMap = element.computedStyleMap();
const width = styleMap.get('width'); // CSSUnitValue { value: 100, unit: 'px' }

// 쓰기 - 타입 안전한 설정
element.attributeStyleMap.set('width', CSS.px(200));
```

**장점**:
- 파싱 비용 제로
- 타입 안전성

**현재 시스템 적용 한계**:
- 현재 빌더는 WebGL(PixiJS) 기반으로 DOM이 없음
- CSS Typed OM은 DOM 요소에서만 사용 가능
- 따라서 **구조적 최적화(StyleValues 분할)가 더 적합**

---

## 3. 업계 리서치 결과

### 3.1 Webstudio (오픈소스 Webflow 대안)

- **GitHub**: [webstudio-is/webstudio](https://github.com/webstudio-is/webstudio)
- **핵심 패키지**:
  - `@webstudio-is/css-data`: mdn-data에서 CSS 속성 정보 생성
  - `@webstudio-is/css-engine`: CSS 렌더링 엔진
- **접근 방식**:
  - Atomic CSS (속성당 하나의 룰) → CSS 파일 크기 160KB→16KB 감소
  - CSS 붙여넣기 시 스타일 패널 필드로 자동 파싱
  - 색상 출처 표시 (Token, inherited, default 구분)

### 3.2 Colord (색상 라이브러리)

- **GitHub**: [omgovich/colord](https://github.com/omgovich/colord)
- **크기**: 1.7KB gzipped
- **용도**: CSS Color Level 스펙 준수 파싱
- **사용처**: cssnano, Leva (React GUI 패널)

```typescript
import { colord } from 'colord';
colord('#ff0000').toHsl(); // { h: 0, s: 100, l: 50 }
```

### 3.3 Culori (고급 색상 라이브러리)

- **사이트**: [culorijs.org](https://culorijs.org/)
- **특징**: CSS Colors Level 4 전체 지원, 색상 보간/혼합

### 3.4 업계 패턴 정리

| 영역 | 일반적 접근 | 라이브러리 |
|------|-----------|-----------|
| **CSS 문자열 파싱** | AST 기반 | CSSTree, PostCSS |
| **CSS 속성 데이터** | MDN 데이터 | mdn-data, @webstudio-is/css-data |
| **색상 파싱/변환** | 전용 라이브러리 | colord (경량), culori (풀스펙) |
| **단위 파싱** | CSS Typed OM 또는 정규식 | 브라우저 네이티브 |
| **스타일 동기화** | 객체 기반 상태 관리 | Zustand, Jotai |

### 3.5 현재 시스템과의 비교

| 항목 | Webstudio | 현재 시스템 (xstudio) |
|------|-----------|---------------------|
| **데이터 형태** | 객체 기반 | ✅ 동일 (JavaScript 객체) |
| **CSS 파싱** | CSSTree 사용 | ❌ 직접 파싱 |
| **색상 처리** | 전용 라이브러리 | ❌ 수동 변환 |
| **속성 메타데이터** | mdn-data 기반 | ❌ 수동 매핑 |
| **Atomic CSS** | O | ❌ 미적용 |

---

## 4. 권장 최적화 전략

### 4.1 Phase 1: StyleValues 섹션별 분할

**목표**: 28개 속성을 한 번에 계산하는 `useStyleValues()` 대신, 섹션별 분리된 훅으로 **75% 재계산 감소**

**섹션별 속성 분리**:

| Section | 속성 | 개수 |
|---------|------|------|
| **Transform** | width, height, top, left | 4개 |
| **Layout** | display, flexDirection, alignItems, justifyContent, gap, padding*, margin*, flexWrap | 15개 |
| **Appearance** | backgroundColor, borderColor, borderWidth, borderRadius, borderStyle | 5개 |
| **Typography** | fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, color, textAlign, textDecoration, textTransform, verticalAlign | 11개 |

**신규 훅 구조**:
```typescript
export function useTransformValues(selectedElement): TransformStyleValues | null
export function useLayoutValues(selectedElement): LayoutStyleValues | null
export function useAppearanceValues(selectedElement): AppearanceStyleValues | null
export function useTypographyValues(selectedElement): TypographyStyleValues | null
```

### 4.2 Phase 2: 추가 최적화 (선택적)

현재 빌더는 WebGL(PixiJS) 기반이므로 CSS Typed OM은 적용 불가.
대신 다음 최적화를 검토:

1. **colord 도입** - 색상 파싱/변환 안정화
2. **css-tree 부분 도입** - shorthand 파싱 정확도 향상
3. **Web Worker 오프로딩** - 대규모 요소 처리 시 메인 스레드 부하 감소

### 4.3 권장 라이브러리 도입

**즉시 도입 가능**:
1. **colord** (1.7KB) - 색상 파싱/변환
2. **css-tree** 부분 사용 - shorthand 파싱

**중장기 검토**:
3. **mdn-data** - CSS 속성 메타데이터

---

## 5. 예상 성능 개선

| 최적화 | 개선율 | 설명 |
|--------|-------|------|
| StyleValues 분할 | ~75% | 재계산 속성 수 감소 |
| 리렌더링 범위 | ~75% | 영향받는 섹션 수 감소 |
| colord 도입 | - | 색상 파싱 안정성 향상 |

**시나리오별 개선**:

| 시나리오 | Before | After | 개선 |
|---------|--------|-------|------|
| width 변경 | 28개 속성 재계산, 4개 Section 비교 | 4개 속성 재계산, TransformSection만 비교 | 86% 감소 |
| backgroundColor 변경 | 28개 속성 재계산 | 5개 속성 재계산 | 82% 감소 |
| fontSize 변경 | 28개 속성 재계산 | 11개 속성 재계산 | 61% 감소 |

---

## 6. 결론

### 핵심 발견

1. **CSS 파싱 라이브러리는 부적합**: 현재 시스템은 JavaScript 객체 기반이므로 문자열 파싱 엔진은 오히려 오버헤드 증가

2. **CSS Typed OM은 적용 불가**: 현재 빌더는 WebGL(PixiJS) 기반으로 DOM이 없음

3. **구조적 최적화가 가장 효과적**:
   - StyleValues 섹션별 분할 (75% 성능 개선)
   - colord 도입 (색상 파싱 안정화)
   - Web Worker 오프로딩 (장기)

### 권장 조합

```
[빌드 타임] PostCSS (현재 유지) - Tailwind 컴파일
     ↓
[런타임 - Store] JavaScript 객체 직접 조작 (현재 유지)
     ↓
[런타임 - 최적화] StyleValues 분할 + colord 도입
     ↓
[WebGL Canvas] PixiJS Graphics로 스타일 렌더링
```

---

## Sources

- [Webstudio GitHub](https://github.com/webstudio-is/webstudio)
- [CSSTree GitHub](https://github.com/csstree/csstree)
- [Colord](https://github.com/omgovich/colord)
- [Culori](https://culorijs.org/)
- [MDN CSS Numeric Data Types](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Values_and_units/Numeric_data_types)
