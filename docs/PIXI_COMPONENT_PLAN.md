# Pixi Canvas 컴포넌트 검증 및 수정 계획

> **작성일**: 2026-01-03
> **상태**: 분석 완료, 수정 대기
> **관련 경로**: `apps/builder/src/builder/workspace/canvas/ui/`

---

## 1. Executive Summary

### 1.1 전체 현황

| 구분 | 수량 |
|------|------|
| 전체 Pixi 컴포넌트 | 62개 |
| ✅ 정상 (Working) | 32개 (52%) |
| ⚠️ 부분 (Partial) | 22개 (35%) |
| ❌ 문제 (Broken) | 5개 (8%) |
| 🔵 Pixi 전용 | 3개 (5%) |

### 1.2 핵심 문제 요약

1. **CSS 변수 미사용 (하드코딩)**: 15개 컴포넌트
2. **Variant 시스템 누락/불완전**: 18개 컴포넌트
3. **Size Preset 불일치**: 6개 컴포넌트
4. **React 컴포넌트와 아키텍처 차이**: 8개 컴포넌트

---

## 2. 전체 컴포넌트 비교표

### 2.1 Form Input 컴포넌트 (16개)

| 컴포넌트 | 상태 | SIZE | COLOR | VARIANTS | 주요 문제 | 우선순위 |
|----------|------|------|-------|----------|-----------|----------|
| PixiButton | ✅ | ✅ | ✅ | 8개 (일치) | - | - |
| PixiToggleButton | ⚠️ | ✅ | ✅ | 6개 | L332: default→"primary" 오류 | High |
| PixiToggleButtonGroup | ⚠️ | ✅ | ❌ | 4개 (2개 누락) | 색상 하드코딩, tertiary/error 누락 | High |
| PixiCheckbox | ⚠️ | ✅ | ❌ | 1개 (4개 누락) | L39-41: 색상 하드코딩 | High |
| PixiCheckboxGroup | ✅ | ✅ | ✅ | 5개 | - | - |
| PixiCheckboxItem | 🔵 | - | - | - | Pixi 전용 하위 컴포넌트 | - |
| PixiRadio | ⚠️ | ✅ | ❌ | 1개 (4개 누락) | L46-48: 색상 하드코딩 | High |
| PixiRadioItem | 🔵 | - | - | - | Pixi 전용 하위 컴포넌트 | - |
| PixiSwitch | ✅ | ✅ | ✅ | 1개 | variant 확장 필요 | Low |
| PixiInput | ✅ | ✅ | ✅ | 1개 | - | - |
| PixiTextField | ✅ | ✅ | ✅ | 6개 (일치) | - | - |
| PixiTextArea | ✅ | ✅ | ✅ | 1개 | label/description 미구현 | Medium |
| PixiNumberField | ✅ | ✅ | ✅ | 6개 (일치) | - | - |
| PixiSearchField | ✅ | ✅ | ✅ | 6개 (일치) | - | - |
| PixiSelect | ⚠️ | ⚠️ | ⚠️ | 1개 | L309: JSX 미반환, 명령형 API | High |
| PixiComboBox | ✅ | ✅ | ✅ | 6개 (일치) | - | - |

### 2.2 Data Display 컴포넌트 (10개)

| 컴포넌트 | 상태 | SIZE | COLOR | VARIANTS | 주요 문제 | 우선순위 |
|----------|------|------|-------|----------|-----------|----------|
| PixiBadge | ⚠️ | ✅ | ✅ | 6개 | React에서 variant prop 미전달 | High |
| PixiMeter | ⚠️ | ✅ | ⚠️ | 5개 | CSS class/data-variant 불일치 | High |
| PixiProgressBar | ⚠️ | ✅ | ❌ | - | L54-55: 색상 하드코딩 | High |
| PixiListBox | ✅ | ✅ | ✅ | 4개 (일치) | - | - |
| PixiList | ❌ | ❌ | ❌ | - | L60-76: 전체 하드코딩 | High |
| PixiGridList | ✅ | ✅ | ✅ | 5개 (일치) | - | - |
| PixiTable | ✅ | ✅ | ✅ | 5개 (일치) | - | - |
| PixiTree | ✅ | ✅ | ✅ | 3개 (일치) | - | - |
| PixiTagGroup | ⚠️ | ✅ | ✅ | 4개 | L32-34: data-tag-variant 비표준 | Medium |
| PixiSkeleton | ✅ | ✅ | ✅ | 다수 | - | - |

### 2.3 Navigation/Layout 컴포넌트 (11개)

| 컴포넌트 | 상태 | SIZE | COLOR | VARIANTS | 주요 문제 | 우선순위 |
|----------|------|------|-------|----------|-----------|----------|
| PixiLink | ✅ | ✅ | ✅ | 3개 | L68: default variant 추가됨 | Medium |
| PixiBreadcrumbs | ⚠️ | ✅ | ✅ | 6개 (1개 추가) | L65: "default" CSS 미정의 | Medium |
| PixiTabs | ⚠️ | ✅ | ✅ | 4개 (1개 추가) | L82: "default" CSS 미정의 | Medium |
| PixiMenu | ⚠️ | ✅ | ✅ | 6개 (1개 추가) | L85: "default" CSS 미정의 | Medium |
| PixiPagination | ⚠️ | ✅ | ✅ | - | React 컴포넌트 M3 미지원 | High |
| PixiToolbar | ⚠️ | ✅ | ✅ | - | React 컴포넌트 래퍼만 존재 | High |
| PixiSeparator | ✅ | ✅ | ✅ | 4개 + 3 line styles | - | - |
| PixiCard | ✅ | ✅ | ✅ | 6개 | CSS에 "quiet" 추가 variant | Low |
| PixiGroup | ⚠️ | ✅ | ✅ | - | React와 용도 차이 (시각적 vs 시맨틱) | Medium |
| PixiSlot | ⚠️ | ✅ | ✅ | - | React와 용도 차이 | Medium |
| PixiForm | ⚠️ | ✅ | ✅ | - | React와 용도 차이 | Medium |

### 2.4 Overlay/Popup 컴포넌트 (8개)

| 컴포넌트 | 상태 | SIZE | COLOR | VARIANTS | 주요 문제 | 우선순위 |
|----------|------|------|-------|----------|-----------|----------|
| PixiDialog | ✅ | ✅ | ✅ | 5개 (일치) | - | - |
| PixiPopover | ✅ | ✅ | ✅ | 5개 (일치) | Arrow 렌더링 부분 구현 | Medium |
| PixiTooltip | ✅ | ✅ | ✅ | 5개 (일치) | - | - |
| PixiToast | ⚠️ | ❌ | ⚠️ | 4 types | type vs variant 불일치, size 미지원 | High |
| PixiDisclosure | ✅ | ✅ | ✅ | 2개 (일치) | Chevron 애니메이션 차이 | Low |
| PixiDisclosureGroup | 🔵 | ✅ | ✅ | 2개 | React 동등 컴포넌트 없음 | High |
| PixiDropZone | ✅ | ✅ | ✅ | 3개 (일치) | Dashed border 복잡 구현 | Low |
| PixiFileTrigger | ❌ | ❌ | ❌ | - | React는 래퍼만, Pixi는 버튼 드로잉 | High |

### 2.5 Color/Date 컴포넌트 (12개)

| 컴포넌트 | 상태 | SIZE | COLOR | VARIANTS | 주요 문제 | 우선순위 |
|----------|------|------|-------|----------|-----------|----------|
| PixiColorSwatch | ⚠️ | ✅ | ❌ | - | 색상 하드코딩 (#3b82f6) | Medium |
| PixiColorSlider | ⚠️ | ✅ | ❌ | - | 채널별 스타일링 누락 | High |
| PixiColorArea | ⚠️ | ✅ | ❌ | - | 고정 그리드 크기 (8x8) | Medium |
| PixiColorWheel | ⚠️ | ✅ | ❌ | - | 세그먼트 수 하드코딩 (60) | Medium |
| PixiColorField | ❌ | ✅ | ❌ | 0개 (5개 누락) | L67-102: 전체 색상 하드코딩 | High |
| PixiColorPicker | ⚠️ | ✅ | ❌ | 0개 (3개 누락) | L52,151,156,160,164,176: 하드코딩 | High |
| PixiColorSwatchPicker | ✅ | ✅ | ❌ | grid/stack layout | - | Low |
| PixiDateField | ❌ | ✅ | ❌ | 0개 (5개 누락) | L58-68: 하드코딩, variant 시스템 없음 | High |
| PixiTimeField | ❌ | ✅ | ❌ | 0개 (5개 누락) | L62-78: 하드코딩, variant 시스템 없음 | High |
| PixiDatePicker | ⚠️ | ✅ | ❌ | 0개 (5개 누락) | L84-88,124: 하드코딩, 정적 렌더링 | High |
| PixiDateRangePicker | ⚠️ | ✅ | ❌ | 0개 (5개 누락) | 정적 듀얼 캘린더, variant 없음 | High |
| PixiCalendar | ⚠️ | ✅ | ❌ | 0개 (3개 누락) | L147: 포커스 색상 하드코딩 | Medium |

### 2.6 Pixi 전용 컴포넌트 (5개)

| 컴포넌트 | 상태 | 용도 | CSS 통합 | 주요 문제 | 우선순위 |
|----------|------|------|----------|-----------|----------|
| PixiFancyButton | ✅ | @pixi/ui 고급 버튼 | 동적 파싱 | L251-276: CanvasTextSystem 레이스 | Medium |
| PixiSlider | ✅ | 레인지 슬라이더 | getSliderSizePreset() | 프리셋 캐싱 없음 | Medium |
| PixiScrollBox | ⚠️ | 스크롤 컨테이너 | drawBox() 사용 | L162-165: 더미 콘텐츠, 실데이터 바인딩 없음 | High |
| PixiMaskedFrame | ⚠️ | 이미지 마스킹 | 기본 파싱 | L201: Texture.from() 동기, 에러 처리 없음 | High |
| PixiSwitcher | ✅ | 탭/세그먼트 컨트롤 | getSwitchSizePreset() | L265-266: @pixi/ui 타입 불완전 | Medium |

---

## 3. 문제 유형별 분류

### 3.1 🔴 Critical: CSS 변수 하드코딩 (15개)

색상값을 CSS 변수 대신 hex 리터럴로 직접 사용:

| 컴포넌트 | 라인 | 하드코딩된 값 |
|----------|------|---------------|
| PixiCheckbox | 39-41 | `0x3b82f6` (DEFAULT_PRIMARY_COLOR) |
| PixiRadio | 46-48 | `0x3b82f6` (DEFAULT_PRIMARY_COLOR) |
| PixiProgressBar | 54-55 | `0x3b82f6`, `0xe5e7eb` |
| PixiList | 60-76 | 전체 스타일 하드코딩 |
| PixiToggleButtonGroup | cssVariableReader:961-1002 | selectedBackground 전체 |
| PixiColorSwatch | 33-45 | `0x3b82f6` (fallback) |
| PixiColorSlider | 82, 92 | border/track 색상 |
| PixiColorArea | 69, 76 | `0xcad3dc` (border) |
| PixiColorField | 67, 121-122 | 전체 색상 |
| PixiDateField | 58-68, 105 | 세그먼트 크기, 스타일 |
| PixiTimeField | 62-78 | 세그먼트 너비 |
| PixiDatePicker | 48-49, 84-88, 124 | 캘린더 색상 |
| PixiDateRangePicker | 다수 | 범위 하이라이트 색상 |
| PixiCalendar | 147 | `0x3b82f6` (포커스) |
| PixiColorPicker | 52, 151, 156, 160, 164, 176 | 레이아웃/색상 |

### 3.2 🟠 High: Variant 시스템 누락 (18개)

CSS에는 variant가 정의되어 있으나 Pixi에서 미구현:

| 컴포넌트 | Pixi Variants | CSS Variants | 누락 |
|----------|---------------|--------------|------|
| PixiToggleButton | primary (기본값 오류) | default | default |
| PixiToggleButtonGroup | 4개 | 6개 | tertiary, error |
| PixiCheckbox | default only | 5개 | primary, secondary, tertiary, error |
| PixiRadio | default only | 5개 | primary, secondary, tertiary, error |
| PixiSwitch | default only | 5개 | primary, secondary, tertiary, error |
| PixiColorField | 0개 | 5개 × 3sizes | 전체 |
| PixiDateField | 0개 | 5개 × 3sizes | 전체 |
| PixiTimeField | 0개 | 5개 × 3sizes | 전체 |
| PixiDatePicker | 0개 | 5개 × 3sizes | 전체 |
| PixiDateRangePicker | 0개 | 5개 × 3sizes | 전체 |
| PixiCalendar | 0개 | 3개 × 3sizes | 전체 |
| PixiColorPicker | 0개 | 3개 × 3sizes | 전체 |
| PixiColorSlider | size only | orientation variants | channel 스타일 |

### 3.3 🟡 Medium: CSS Selector 불일치 (5개)

CSS와 data-attribute 선택자 패턴 불일치:

| 컴포넌트 | 문제 | 상세 |
|----------|------|------|
| PixiMeter | CSS: `.primary` / Pixi: `data-variant` | 클래스 vs 속성 |
| PixiProgressBar | CSS: `.primary` / Pixi: `data-variant` | 클래스 vs 속성 |
| PixiTagGroup | `data-tag-variant` vs 표준 `data-variant` | 비표준 속성명 |
| PixiToast | `type` vs `variant` | prop 이름 차이 |
| PixiBadge | React에서 variant prop 미전달 | prop 누락 |

### 3.4 🔵 아키텍처 차이 (8개)

React와 Pixi의 근본적 용도/구현 차이:

| 컴포넌트 | React 용도 | Pixi 용도 | 차이점 |
|----------|-----------|----------|--------|
| PixiFileTrigger | 래퍼 (children Button 필요) | 버튼 직접 드로잉 | 완전히 다른 패턴 |
| PixiDisclosureGroup | 없음 | 아코디언 그룹 | React 미구현 |
| PixiGroup | 시맨틱 그룹핑 (ARIA) | 시각적 레이아웃 | 용도 차이 |
| PixiSlot | 콘텐츠 삽입 슬롯 | 시각적 플레이스홀더 | 용도 차이 |
| PixiForm | FocusScope 래퍼 | 시각적 폼 프리뷰 | 용도 차이 |
| PixiPagination | 기본 버튼 래퍼 | 전체 M3 구현 | React 미완성 |
| PixiToolbar | thin 래퍼 | 전체 M3 구현 | React 미완성 |
| PixiSelect | - | 명령형 API, JSX 미반환 | 비표준 패턴 |

---

## 4. 수정 우선순위

### 4.1 Phase 1: Critical (즉시 수정 필요) - 15개

**목표**: CSS 변수 읽기 및 핵심 variant 시스템 구현

| # | 컴포넌트 | 수정 내용 | 예상 난이도 |
|---|----------|-----------|-------------|
| 1 | PixiToggleButton | L332: "primary" → "default" 변경 | 쉬움 |
| 2 | PixiToggleButtonGroup | cssVariableReader 색상 동적 읽기 | 중간 |
| 3 | PixiCheckbox | L39-41: useThemeColors() 적용 | 중간 |
| 4 | PixiRadio | L46-48: useThemeColors() 적용 | 중간 |
| 5 | PixiProgressBar | L54-55: 색상 프리셋 함수 추가 | 중간 |
| 6 | PixiList | L60-76: 전체 리팩토링 | 어려움 |
| 7 | PixiColorField | variant 시스템 추가 | 어려움 |
| 8 | PixiDateField | variant 시스템 추가 | 어려움 |
| 9 | PixiTimeField | variant 시스템 추가 | 어려움 |
| 10 | PixiFileTrigger | 아키텍처 재설계 | 어려움 |
| 11 | PixiBadge | React variant prop 추가 | 쉬움 |
| 12 | PixiMeter | CSS selector 수정 | 중간 |
| 13 | PixiToast | type → variant 통일 | 중간 |
| 14 | PixiScrollBox | 실데이터 바인딩 추가 | 중간 |
| 15 | PixiMaskedFrame | L201: async 이미지 로딩 | 중간 |

### 4.2 Phase 2: High (1-2주 내 수정) - 12개

**목표**: Color/Date 컴포넌트 variant 시스템 및 테마 통합

| # | 컴포넌트 | 수정 내용 |
|---|----------|-----------|
| 1 | PixiColorSlider | 채널별 스타일링, CSS 변수 |
| 2 | PixiColorPicker | variant 시스템, 테마 색상 |
| 3 | PixiDatePicker | variant 시스템, 동적 렌더링 |
| 4 | PixiDateRangePicker | variant 시스템 |
| 5 | PixiCalendar | variant 시스템 |
| 6 | PixiSelect | JSX 기반으로 재구현 |
| 7 | PixiPagination | React M3 variant 추가 |
| 8 | PixiToolbar | React M3 variant 추가 |
| 9 | PixiDisclosureGroup | React 동등 컴포넌트 생성 |
| 10 | PixiColorSwatch | CSS 변수 적용 |
| 11 | PixiColorArea | CSS 변수 적용 |
| 12 | PixiColorWheel | CSS 변수 적용 |

### 4.3 Phase 3: Medium (개선 사항) - 10개

**목표**: 일관성 및 품질 향상

| # | 컴포넌트 | 수정 내용 |
|---|----------|-----------|
| 1 | PixiTextArea | label/description 추가 |
| 2 | PixiBreadcrumbs | "default" variant CSS 정의 |
| 3 | PixiTabs | "default" variant CSS 정의 |
| 4 | PixiMenu | "default" variant CSS 정의 |
| 5 | PixiLink | variant 일관성 |
| 6 | PixiTagGroup | data-tag-variant → data-variant |
| 7 | PixiPopover | Arrow 렌더링 완성 |
| 8 | PixiGroup | 용도 문서화 |
| 9 | PixiSlot | 용도 문서화 |
| 10 | PixiForm | 용도 문서화 |

### 4.4 Phase 4: Low (선택 사항) - 8개

| # | 컴포넌트 | 수정 내용 |
|---|----------|-----------|
| 1 | PixiSwitch | variant 확장 |
| 2 | PixiCard | "quiet" variant 노출 |
| 3 | PixiDisclosure | Chevron 애니메이션 통일 |
| 4 | PixiDropZone | Dashed border 최적화 |
| 5 | PixiFancyButton | 레이스 컨디션 개선 |
| 6 | PixiSlider | 프리셋 캐싱 |
| 7 | PixiSwitcher | @pixi/ui 타입 정의 |
| 8 | PixiColorSwatchPicker | 완성도 향상 |

---

## 5. 구현 가이드

### 5.1 CSS 변수 읽기 패턴 (권장)

```typescript
// ❌ 잘못된 패턴 - 하드코딩
const DEFAULT_PRIMARY_COLOR = 0x3b82f6;

// ✅ 올바른 패턴 - CSS 변수 읽기
import { useThemeColors } from '../hooks/useThemeColors';
import { getVariantColors } from '../utils/cssVariableReader';

const themeColors = useThemeColors();
const variantColors = getVariantColors(variant, themeColors);
```

### 5.2 Variant 시스템 구현 패턴

```typescript
// ❌ 잘못된 패턴 - variant 미지원
const selectedColors = useMemo(() => {
  const variant = props?.variant || "primary"; // 기본값 오류
  return getVariantColors(variant, themeColors);
}, [props?.variant, themeColors]);

// ✅ 올바른 패턴 - default variant 사용
const selectedColors = useMemo(() => {
  const variant = props?.variant || "default"; // CSS와 일치
  return getVariantColors(variant, themeColors);
}, [props?.variant, themeColors]);
```

### 5.3 Size Preset 사용 패턴

```typescript
// ✅ 올바른 패턴 - CSS 변수에서 동적 읽기
import { getSizePreset } from '../utils/cssVariableReader';

const sizePreset = getSizePreset(size);
// { fontSize: 14, paddingX: 12, paddingY: 4, borderRadius: 4 }
```

### 5.4 cssVariableReader.ts 수정 예시

```typescript
// getToggleButtonColorPreset() 수정 필요
export function getToggleButtonColorPreset(variant: string): ToggleButtonColorPreset {
  const colors = getM3ButtonColors(); // 기존 함수 재사용

  switch(variant) {
    case 'primary':
      return {
        background: colors.defaultBg,
        selectedBackground: colors.primaryBg, // CSS 변수에서 읽기
        selectedText: colors.primaryText,
        // ...
      };
    case 'tertiary': // 누락된 variant 추가
      return {
        selectedBackground: colors.tertiaryBg,
        selectedText: colors.tertiaryText,
        // ...
      };
    case 'error': // 누락된 variant 추가
      return {
        selectedBackground: colors.errorBg,
        selectedText: colors.errorText,
        // ...
      };
  }
}
```

---

## 6. 검증 체크리스트

### 6.1 컴포넌트별 검증 항목

- [ ] CSS 변수에서 색상 읽기 (하드코딩 없음)
- [ ] 모든 variant 지원 (primary, secondary, tertiary, error, surface)
- [ ] 모든 size 지원 (xs, sm, md, lg, xl)
- [ ] 테마 변경 시 색상 업데이트
- [ ] React 컴포넌트와 시각적 일치
- [ ] disabled 상태 스타일링
- [ ] hover/pressed 상태 스타일링

### 6.2 통합 테스트

- [ ] 라이트 모드에서 모든 컴포넌트 렌더링
- [ ] 다크 모드에서 모든 컴포넌트 렌더링
- [ ] 테마 전환 시 실시간 업데이트
- [ ] Builder ↔ Preview 시각적 일치 확인

---

## 7. 참조 파일

### 7.1 핵심 유틸리티

- `apps/builder/src/builder/workspace/canvas/utils/cssVariableReader.ts`
- `apps/builder/src/builder/workspace/canvas/hooks/useThemeColors.ts`
- `apps/builder/src/builder/workspace/canvas/utils/index.ts` (drawBox)

### 7.2 CSS 스타일

- `packages/shared/src/components/styles/*.css`
- `packages/shared/src/components/styles/theme/shared-tokens.css`

### 7.3 React 컴포넌트

- `packages/shared/src/components/*.tsx`

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-01-03 | 1.0 | 초기 분석 및 계획 문서 작성 |
