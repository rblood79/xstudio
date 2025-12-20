# React Aria 1.14.0 마이그레이션 & 스타일 시스템 최적화

## 개요

**문서 버전**: 2025-12-20
**현재 버전**: react-aria-components ^1.13.0
**목표 버전**: react-aria-components ^1.14.0

### 목표

1. **React Aria 1.14.0 업그레이드** - 최신 기능 활용
2. **React Spectrum 패턴 전환** - data-* 속성 기반 스타일링
3. **StyleValues 분할 최적화** - 스타일 패널 성능 75% 개선

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Element Store                                 │
├─────────────────────────────────┬───────────────────────────────────┤
│          props (컴포넌트)        │          style (CSS)              │
│  { variant, size, children }    │  { width, height, backgroundColor }│
└─────────────────────────────────┴───────────────────────────────────┘
              │                                    │
              ▼                                    ▼
┌─────────────────────────────────┐  ┌───────────────────────────────────┐
│   작업 A: React Spectrum 패턴   │  │   작업 B: StyleValues 분할         │
│   (data-* 속성 전환)            │  │   (섹션별 훅 분리)                 │
├─────────────────────────────────┤  ├───────────────────────────────────┤
│ 영향: 컴포넌트 TSX + CSS        │  │ 영향: 스타일 패널 훅               │
│ 파일: 86개 (TSX 43 + CSS 43)   │  │ 파일: 4개 (새 훅 생성)            │
└─────────────────────────────────┘  └───────────────────────────────────┘
              │                                    │
              │          ✅ 독립적 영역            │
              └────────────────────────────────────┘
```

---

## Part 1: React Aria 1.14.0 업그레이드

### 1.1 현재 버전 상태

| 패키지 | 현재 버전 | 목표 버전 | 변경 필요 |
|--------|-----------|-----------|-----------|
| `react-aria-components` | ^1.13.0 | ^1.14.0 | ❌ 없음 |
| `@react-aria/focus` | ^3.21.2 | 최신 | ❌ 없음 |
| `@react-aria/i18n` | ^3.12.13 | 최신 | ❌ 없음 |
| `@react-aria/utils` | ^3.31.0 | 최신 | ❌ 없음 |
| `react-stately` | ^3.42.0 | 최신 | ❌ 없음 |

### 1.2 v1.14.0 주요 변경사항

| 변경 유형 | 내용 |
|-----------|------|
| 새 기능 | Tab 애니메이션 전환 지원 |
| 새 기능 | Spectrum 2 안정화 버전 출시 |
| 문서 | 새로운 웹사이트 및 문서 재설계 |
| Deprecated | `Section` → `ListBoxSection`, `MenuSection`, `SelectSection` 분리 |

### 1.3 마이그레이션 필요 항목

#### ⚠️ Deprecated `Section` 사용 (1개 파일)

**파일**: `src/stories/Select.stories.tsx`

```tsx
// Before (deprecated)
import { Form, Section, Header } from 'react-aria-components';

<Section>
  <Header>과일</Header>
  <SelectItem id="apple">사과</SelectItem>
</Section>

// After (v1.14.0 권장)
import { Form, ListBoxSection, Header } from 'react-aria-components';

<ListBoxSection>
  <Header>과일</Header>
  <SelectItem id="apple">사과</SelectItem>
</ListBoxSection>
```

### 1.4 업그레이드 명령

```bash
pnpm update react-aria-components@^1.14.0
```

### 1.5 검증 체크리스트

- [ ] 빌드 성공 확인
- [ ] Storybook 정상 동작 확인
- [ ] 기존 컴포넌트 동작 테스트

---

## Part 2: React Spectrum 패턴 전환 (data-* 속성)

### 2.1 현재 패턴 vs 목표 패턴

#### 현재 (Class 기반)

```tsx
// Button.tsx
const button = tv({
  variants: {
    variant: { primary: 'primary', secondary: 'secondary' },
    size: { sm: 'sm', md: 'md' },
  },
});

<RACButton className={button({ variant, size })} />
// 결과: class="react-aria-Button primary sm"
```

```css
/* Button.css */
.react-aria-Button.primary { background: var(--primary); }
.react-aria-Button.sm { padding: var(--spacing); }
```

#### 목표 (data-* 속성 기반)

```tsx
// Button.tsx
<RACButton
  data-variant={variant}
  data-size={size}
  className="react-aria-Button"
/>
// 결과: data-variant="primary" data-size="sm" class="react-aria-Button"
```

```css
/* Button.css */
.react-aria-Button[data-variant="primary"] { background: var(--primary); }
.react-aria-Button[data-size="sm"] { padding: var(--spacing); }
```

### 2.2 전환 이점

| 기준 | Class 방식 (현재) | data-* 방식 (Spectrum) |
|------|-------------------|------------------------|
| **충돌 가능성** | ⚠️ `.sm` 클래스 충돌 가능 | ✅ 충돌 없음 |
| **일관성** | React Aria 상태와 다른 패턴 | ✅ `data-pressed`, `data-hovered`와 통일 |
| **DevTools** | `class="... primary sm"` | `data-variant="primary"` 명확 |
| **tailwind-variants** | ✅ 필요 | ❌ 제거 가능 |

### 2.3 전환 대상 파일 (86개)

#### TSX 파일 (43개)

| 컴포넌트 그룹 | 파일 수 | 예시 |
|---------------|---------|------|
| **Form 컴포넌트** | 15 | Button, TextField, Select, ComboBox, Checkbox... |
| **Date 컴포넌트** | 5 | Calendar, DatePicker, DateField, TimeField... |
| **Layout 컴포넌트** | 8 | Card, Dialog, Modal, Popover, Tabs... |
| **Collection 컴포넌트** | 8 | ListBox, Menu, GridList, Table, Tree... |
| **기타** | 7 | Badge, Link, Separator, ProgressBar... |

#### CSS 파일 (43개)

| 위치 | 파일 수 |
|------|---------|
| `src/shared/components/styles/` | 43 |

### 2.4 전환 변환 규칙

```
TSX 변환:
  className={tv({ variant, size })}
  →
  data-variant={variant} data-size={size} className="react-aria-Button"

CSS 변환:
  .react-aria-Button.primary → .react-aria-Button[data-variant="primary"]
  .react-aria-Button.sm → .react-aria-Button[data-size="sm"]
```

### 2.5 연계 지점 분석

| 영역 | 파일 수 | 전환 영향 |
|------|---------|-----------|
| **Property Editors** | 47 | ❌ 없음 (props 저장 방식 동일) |
| **Styles Panel** | 5 | ❌ 없음 (CSS 스타일만 다룸) |
| **React Components (TSX)** | 43 | ✅ 수정 필요 |
| **Pixi Canvas UI** | 56 | ❌ 없음 (props에서 읽음) |
| **CSS Files** | 43 | ✅ 수정 필요 |

### 2.6 전환 전략

#### Option A: 자동화 스크립트 (권장)

```bash
# 1. TSX 변환 스크립트
# className={tv({ variant, size })} → data-variant={variant} data-size={size}

# 2. CSS 변환 스크립트
# .react-aria-Button.primary → .react-aria-Button[data-variant="primary"]
```

#### Option B: 점진적 전환

1. Button 컴포넌트 먼저 테스트
2. 검증 후 나머지 컴포넌트 일괄 적용

---

## Part 3: StyleValues 분할 최적화

> **참조**: [STYLE_PANEL_PARSING_OPTIMIZATION.md](research/STYLE_PANEL_PARSING_OPTIMIZATION.md)

### 3.1 현재 문제

- `useStyleValues()` 훅이 28개 속성을 한 번에 계산
- 단일 속성 변경 시에도 전체 재계산 발생
- 4개 섹션 모두 리렌더링

### 3.2 최적화 목표

| 시나리오 | Before | After | 개선 |
|---------|--------|-------|------|
| width 변경 | 28개 속성 재계산 | 4개 속성 재계산 | 86% 감소 |
| backgroundColor 변경 | 28개 속성 재계산 | 5개 속성 재계산 | 82% 감소 |
| fontSize 변경 | 28개 속성 재계산 | 11개 속성 재계산 | 61% 감소 |

### 3.3 섹션별 훅 분리

```typescript
// 신규 훅 구조
export function useTransformValues(selectedElement): TransformStyleValues | null
export function useLayoutValues(selectedElement): LayoutStyleValues | null
export function useAppearanceValues(selectedElement): AppearanceStyleValues | null
export function useTypographyValues(selectedElement): TypographyStyleValues | null
```

| Section | 속성 | 개수 |
|---------|------|------|
| **Transform** | width, height, top, left | 4개 |
| **Layout** | display, flexDirection, alignItems, justifyContent, gap, padding*, margin*, flexWrap | 15개 |
| **Appearance** | backgroundColor, borderColor, borderWidth, borderRadius, borderStyle | 5개 |
| **Typography** | fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, color, textAlign, textDecoration, textTransform, verticalAlign | 11개 |

### 3.4 colord 도입

**목적**: 색상 파싱/변환 안정화

**설치**:
```bash
pnpm add colord
```

**적용 위치**:
- `src/builder/panels/styles/` - 스타일 패널
- `src/builder/workspace/canvas/utils/cssVariableReader.ts` - Pixi Canvas

```typescript
// Before
function cssColorToHex(color: string, fallback: number): number {
  // 직접 파싱 로직
}

// After
import { colord } from 'colord';

function cssColorToHex(color: string, fallback: number): number {
  const parsed = colord(color);
  if (!parsed.isValid()) return fallback;
  return parseInt(parsed.toHex().slice(1), 16);
}
```

---

## Part 4: 실행 계획

### 4.1 의존성 분석

```
Part 1 (v1.14.0 업그레이드) ─────────────────────┐
                                                  │
Part 2 (data-* 패턴 전환) ────────┐               │ 독립
                                  │               │
Part 3 (StyleValues 최적화) ──────┴───────────────┘
```

**결론**: 세 작업은 **독립적**으로 병렬 진행 가능

### 4.2 권장 실행 순서

| 순서 | 작업 | 예상 규모 | 이유 |
|------|------|-----------|------|
| 1 | Part 1: v1.14.0 업그레이드 | 1개 파일 | 즉시 적용 가능 |
| 2 | Part 3: StyleValues 최적화 | 4개 훅 생성 | 성능 75% 개선, 독립적 |
| 2 | Part 3-2: colord 도입 | 2개 파일 수정 | 색상 파싱 통합 |
| 3 | Part 2: data-* 패턴 전환 | 86개 파일 | 대규모, 스크립트 필요 |

### 4.3 Phase별 상세 계획

#### Phase 1: 즉시 적용 (1일)

```bash
# 1. React Aria 업그레이드
pnpm update react-aria-components@^1.14.0

# 2. Section → ListBoxSection 수정 (1개 파일)
# src/stories/Select.stories.tsx

# 3. 빌드 및 테스트
pnpm build && pnpm test
```

#### Phase 2: StyleValues 최적화 (2-3일)

**생성할 파일**:
```
src/builder/panels/styles/hooks/
├── useTransformValues.ts   (신규)
├── useLayoutValues.ts      (신규)
├── useAppearanceValues.ts  (신규)
├── useTypographyValues.ts  (신규)
└── useStyleValues.ts       (기존 - 호환성 유지)
```

**수정할 파일**:
```
src/builder/panels/styles/sections/
├── TransformSection.tsx    (새 훅 사용)
├── LayoutSection.tsx       (새 훅 사용)
├── AppearanceSection.tsx   (새 훅 사용)
└── TypographySection.tsx   (새 훅 사용)
```

#### Phase 3: colord 도입 (1일)

```bash
pnpm add colord
```

**수정할 파일**:
- `src/builder/panels/styles/utils/colorParser.ts` (신규 또는 기존 수정)
- `src/builder/workspace/canvas/utils/cssVariableReader.ts`

#### Phase 4: data-* 패턴 전환 (3-5일)

**자동화 스크립트 작성**:
```
scripts/
├── migrate-tsx-to-data-attrs.ts
└── migrate-css-to-data-attrs.ts
```

**전환 순서**:
1. Button 컴포넌트 수동 전환 및 테스트
2. 자동화 스크립트 작성 및 검증
3. 나머지 42개 컴포넌트 일괄 전환
4. CSS 파일 일괄 전환
5. 전체 테스트

---

## Part 5: 기존 1.13 업데이트 작업 상태

> **참조**: [REACT_ARIA_1.13_UPDATE.md](REACT_ARIA_1.13_UPDATE.md)

### 5.1 완료된 작업

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 3 | Select Multi-Selection | ✅ 완료 |
| Phase 5 | ListBox Filtering | ✅ 완료 |

### 5.2 진행 중/예정 작업

| Phase | 내용 | 상태 | 영향 |
|-------|------|------|------|
| Phase 1 | CSS 애니메이션 | ⏳ 예정 | data-* 전환과 무관 |
| Phase 2 | Props 확장 | ⏳ 예정 | data-* 전환과 무관 |
| Phase 4 | SelectionIndicator | ⏳ 예정 | data-* 전환 후 진행 권장 |
| Phase 6 | Property 컴포넌트 | ⏳ 예정 | data-* 전환과 무관 |

---

## Part 6: 검증 체크리스트

### 6.1 v1.14.0 업그레이드

- [ ] `pnpm update react-aria-components@^1.14.0` 실행
- [ ] 빌드 성공 확인
- [ ] `Section` → `ListBoxSection` 수정 (Select.stories.tsx)
- [ ] Storybook 정상 동작 확인

### 6.2 StyleValues 최적화

- [ ] 4개 섹션별 훅 생성
- [ ] 각 Section 컴포넌트에서 새 훅 사용
- [ ] 스타일 패널 성능 측정 (DevTools Profiler)
- [ ] 기존 동작 regression 없음 확인

### 6.3 colord 도입

- [ ] colord 설치 (`pnpm add colord`)
- [ ] 스타일 패널 색상 파싱 적용
- [ ] Pixi Canvas 색상 파싱 적용
- [ ] 색상 변환 정확성 테스트

### 6.4 data-* 패턴 전환

- [ ] Button 컴포넌트 수동 전환 및 테스트
- [ ] 자동화 스크립트 작성
- [ ] TSX 43개 파일 전환
- [ ] CSS 43개 파일 전환
- [ ] tailwind-variants 의존성 제거 검토
- [ ] 전체 Storybook 테스트
- [ ] Pixi Canvas 정상 동작 확인
- [ ] Property Editor 정상 동작 확인

---

## Sources

- [React Aria v1.14.0 Release Notes](https://react-aria.adobe.com/releases/v1-14-0)
- [React Spectrum Styling](https://react-spectrum.adobe.com/react-spectrum/styling.html)
- [React Aria Styling](https://react-spectrum.adobe.com/react-aria/styling.html)
- [Spectrum 2 Styling (Beta)](https://react-spectrum.adobe.com/beta/s2/styling.html)
- [colord](https://github.com/omgovich/colord)
