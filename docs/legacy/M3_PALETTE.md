# Material Design 3 (M3) 팔레트 매핑 가이드

## 개요

XStudio는 Material Design 3 Color Roles을 브랜드 팔레트에 매핑하여 Theme Studio에서 생성된 색상을 자동으로 M3 시스템에 적용합니다.

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│ 1. Theme Studio (AI/Figma/수동)                 │
│    - 브랜드 팔레트 생성 (50-900 shades)          │
├─────────────────────────────────────────────────┤
│ primary-50, primary-100, ..., primary-900      │
│ secondary-50, secondary-100, ..., secondary-900│
│ surface-50, surface-100, ..., surface-900      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. preview-system.css (M3 매핑)                 │
│    - 팔레트 → M3 토큰 자동 연결                  │
├─────────────────────────────────────────────────┤
│ --primary: var(--color-primary-600)            │
│ --primary-container: var(--color-primary-100)  │
│ --surface-container: var(--color-surface-100)  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. React Aria Components (사용)                │
│    - M3 토큰으로 스타일링                        │
├─────────────────────────────────────────────────┤
│ background: var(--primary);                    │
│ color: var(--on-primary);                      │
└─────────────────────────────────────────────────┘
```

## M3 Color Roles 매핑 테이블

### Light Mode

| M3 Role | 브랜드 팔레트 매핑 | 설명 | 사용처 |
|---------|------------------|------|--------|
| **Primary Colors** |
| `--primary` | `--color-primary-600` | 메인 브랜드 컬러 | FAB, 주요 버튼 |
| `--primary-hover` | `color-mix(--primary, 92% black)` | Hover 상태 | 자동 계산 |
| `--primary-pressed` | `color-mix(--primary, 88% black)` | Pressed 상태 | 자동 계산 |
| `--on-primary` | `--color-white` | Primary 위 텍스트/아이콘 | 버튼 텍스트 |
| `--primary-container` | `--color-primary-100` | Primary 컨테이너 배경 | 칩, 카드 |
| `--on-primary-container` | `--color-primary-900` | Container 위 텍스트 | 컨테이너 내 텍스트 |
| **Secondary Colors** |
| `--secondary` | `--color-secondary-600` | 보조 액션 컬러 | 보조 버튼 |
| `--secondary-container` | `--color-secondary-100` | Secondary 컨테이너 | 보조 칩 |
| `--on-secondary` | `--color-white` | Secondary 위 텍스트 | 버튼 텍스트 |
| `--on-secondary-container` | `--color-secondary-900` | Container 위 텍스트 | 컨테이너 내 텍스트 |
| **Tertiary Colors** |
| `--tertiary` | `--color-tertiary-600` | 강조 컬러 (사용자 정의) | 탭, 배지 |
| `--tertiary-container` | `--color-tertiary-100` | Tertiary 컨테이너 | 강조 칩 |
| `--on-tertiary` | `--color-white` | Tertiary 위 텍스트 | 탭 텍스트 |
| `--on-tertiary-container` | `--color-tertiary-900` | Container 위 텍스트 | 컨테이너 내 텍스트 |
| **Error Colors** |
| `--error` | `--color-error-600` | 에러 상태 컬러 | 에러 버튼, 경고 |
| `--error-container` | `--color-error-100` | 에러 컨테이너 | 에러 배너 |
| `--on-error` | `--color-white` | Error 위 텍스트 | 에러 메시지 |
| `--on-error-container` | `--color-error-900` | Container 위 텍스트 | 경고 텍스트 |
| **Surface Colors** |
| `--surface` | `--color-surface-50` | 기본 표면 (가장 밝음) | 페이지 배경 |
| `--surface-container-lowest` | `--color-white` | 가장 낮은 elevation | - |
| `--surface-container-low` | `--color-surface-50` | 낮은 elevation | - |
| `--surface-container` | `--color-surface-100` | 기본 elevation | 카드, 다이얼로그 |
| `--surface-container-high` | `--color-surface-200` | 높은 elevation | 모달 |
| `--surface-container-highest` | `--color-surface-300` | 가장 높은 elevation | 팝오버 |
| `--on-surface` | `--color-neutral-900` | Surface 위 텍스트 | 본문 텍스트 |
| `--surface-variant` | `--color-surface-200` | Surface 변형 | - |
| `--on-surface-variant` | `--color-neutral-700` | Variant 위 텍스트 | 보조 텍스트 |
| **Background Colors** |
| `--background` | `--color-surface-50` | 앱 배경 | 전체 배경 |
| `--on-background` | `--color-neutral-900` | Background 위 텍스트 | 기본 텍스트 |
| **Outline Colors** |
| `--outline` | `--color-neutral-600` | 테두리 | Input border |
| `--outline-variant` | `--color-neutral-400` | 연한 테두리 | Divider |
| **Inverse Colors** |
| `--inverse-surface` | `--color-neutral-800` | 반전 배경 (Snackbar) | 토스트 배경 |
| `--inverse-on-surface` | `--color-neutral-100` | 반전 배경 위 텍스트 | 토스트 텍스트 |
| `--inverse-primary` | `--color-primary-300` | 반전 Primary | 토스트 링크 |

### Dark Mode

| M3 Role | 브랜드 팔레트 매핑 | 변경 사항 |
|---------|------------------|----------|
| **Primary Colors** |
| `--primary` | `--color-primary-400` | 밝은 톤 사용 (대비) |
| `--primary-hover` | `color-mix(--primary, 92% white)` | White 믹스 |
| `--primary-pressed` | `color-mix(--primary, 88% white)` | White 믹스 |
| `--on-primary` | `--color-primary-900` | 어두운 톤 (대비) |
| `--primary-container` | `--color-primary-800` | 어두운 배경 |
| `--on-primary-container` | `--color-primary-100` | 밝은 텍스트 |
| **Secondary Colors** |
| `--secondary` | `--color-secondary-400` | 밝은 톤 |
| `--secondary-container` | `--color-secondary-800` | 어두운 배경 |
| `--on-secondary` | `--color-secondary-900` | 어두운 텍스트 |
| `--on-secondary-container` | `--color-secondary-100` | 밝은 텍스트 |
| **Tertiary Colors** |
| `--tertiary` | `--color-tertiary-400` | 밝은 톤 |
| `--tertiary-container` | `--color-tertiary-800` | 어두운 배경 |
| `--on-tertiary` | `--color-tertiary-900` | 어두운 텍스트 |
| `--on-tertiary-container` | `--color-tertiary-100` | 밝은 텍스트 |
| **Error Colors** |
| `--error` | `--color-error-400` | 밝은 톤 |
| `--error-container` | `--color-error-800` | 어두운 배경 |
| `--on-error` | `--color-error-900` | 어두운 텍스트 |
| `--on-error-container` | `--color-error-100` | 밝은 텍스트 |
| **Surface Colors** |
| `--surface` | `--color-surface-900` | 어두운 배경 |
| `--surface-container-lowest` | `--color-surface-950` | 가장 어두움 |
| `--surface-container-low` | `--color-surface-900` | 어두움 |
| `--surface-container` | `--color-surface-800` | 기본 (카드) |
| `--surface-container-high` | `--color-surface-700` | 밝음 |
| `--surface-container-highest` | `--color-surface-600` | 가장 밝음 |
| `--on-surface` | `--color-neutral-100` | 밝은 텍스트 |
| `--surface-variant` | `--color-surface-700` | 변형 |
| `--on-surface-variant` | `--color-neutral-400` | 밝은 보조 텍스트 |
| **Background Colors** |
| `--background` | `--color-surface-900` | 어두운 배경 |
| `--on-background` | `--color-neutral-100` | 밝은 텍스트 |
| **Outline Colors** |
| `--outline` | `--color-neutral-500` | 밝은 테두리 |
| `--outline-variant` | `--color-neutral-700` | 어두운 테두리 |
| **Inverse Colors** |
| `--inverse-surface` | `--color-neutral-100` | 밝은 배경 (반전) |
| `--inverse-on-surface` | `--color-neutral-800` | 어두운 텍스트 |
| `--inverse-primary` | `--color-primary-600` | Light Mode Primary |

## 매핑 원칙

### 1. Light Mode 원칙

- **Primary/Secondary/Tertiary**: `600` shade 사용 (충분한 대비)
- **Container**: `100` shade 사용 (연한 배경)
- **On-Color**: White 또는 `900` shade (최대 대비)
- **Surface**: `50`-`300` shade (밝은 톤 → 어두운 톤)

### 2. Dark Mode 원칙

- **Primary/Secondary/Tertiary**: `400` shade 사용 (밝은 톤, 대비 확보)
- **Container**: `800` shade 사용 (어두운 배경)
- **On-Color**: `900` 또는 `100` shade (역방향 대비)
- **Surface**: `950`-`600` shade (어두운 톤 → 밝은 톤)

### 3. Hover/Pressed 상태

```css
/* Light Mode */
--primary-hover: color-mix(in srgb, var(--primary) 92%, black);
--primary-pressed: color-mix(in srgb, var(--primary) 88%, black);

/* Dark Mode */
--primary-hover: color-mix(in srgb, var(--primary) 92%, white);
--primary-pressed: color-mix(in srgb, var(--primary) 88%, white);
```

- **Light Mode**: Black 믹스 (더 어둡게)
- **Dark Mode**: White 믹스 (더 밝게)
- **비율**: Hover 92%, Pressed 88%

## Theme Studio 워크플로우

### AI 테마 생성

```typescript
// ThemeGenerationService.ts - AI가 생성하는 것
{
  primary: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",  // ⭐ --primary로 매핑
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95"   // ⭐ --on-primary-container로 매핑
  },
  secondary: { ... },
  surface: { ... }
}
```

### Figma Variables Import

```json
// Figma에서 export한 variables.json
{
  "colors": {
    "primary": {
      "50": { "value": "#f5f3ff" },
      ...
      "600": { "value": "#7c3aed" }
    }
  }
}

// Theme Studio가 자동으로 M3에 매핑
// --color-primary-600 → --primary
```

### 수동 커스터마이징

Theme Studio Token Editor에서:

1. **Tertiary 팔레트 추가**
   - `color.tertiary.600` 생성 → `--color-tertiary-600` → `--tertiary`

2. **특정 Shade 수정**
   - `color.primary.600` 수정 → `--primary` 자동 업데이트

## M3 Color System Guide (Theme Studio)

**위치**: Theme Studio 우측 패널

### 기능

**실시간 M3 다이어그램 생성**
- 선택된 테마의 실제 색상으로 M3 Color Roles 시각화
- 5개 카테고리별 색상 역할 표시 (Primary, Secondary, Tertiary, Error, Surface)
- Light/Dark Mode 전환 시 자동 업데이트

**표시 정보**
- 역할 이름 (Primary, Secondary Container, On Primary 등)
- Shade 이름 (primary-600, surface-100 등)
- Hex 색상 값 (#6750A4, #EADDFF 등)
- 자동 텍스트 대비 (Luminance 기반)

**기술 구현**
```typescript
// IndexedDB에서 브랜드 팔레트 토큰 로드
const tokens = await db.designTokens.getByTheme(themeId);

// HSL → Hex 변환
if (valueObj.h !== undefined) {
  colorValue = hslToHex(valueObj.h, valueObj.s, valueObj.l);
}

// M3 매핑 규칙 적용
const shadeName = isDarkMode ? role.darkShade : role.lightShade;
// primary-600 (light) → primary-400 (dark)
```

**파일 위치**
- 컴포넌트: `src/builder/panels/themes/components/M3ColorSystemGuide.tsx`
- 스타일: `src/builder/panels/themes/components/M3ColorSystemGuide.css`

---

## 마이그레이션 이력

### 2025-11-19: M3 팔레트 매핑 + 동적 다이어그램 완료

**변경 사항:**
- ✅ M3 토큰을 브랜드 팔레트에 매핑 (Light + Dark Mode)
- ✅ Deprecated action 토큰 제거 (284 lines)
- ✅ Legacy button aliases 제거
- ✅ M3 Color System Guide 구현 (실시간 시각화)

**Before:**
```css
--primary: var(--color-primary, #6750A4);  /* 하드코딩 폴백 */
--action-primary-bg: var(--color-primary-600);  /* Deprecated */
```

**After:**
```css
--primary: var(--color-primary-600, #6750A4);  /* 팔레트 매핑 */
/* action 토큰 완전 제거 */
```

**M3 Color System Guide:**
- 선택된 테마의 실제 색상으로 M3 다이어그램 생성
- IndexedDB 기반 토큰 로드 (TokenService 패턴)
- HSL → Hex 자동 변환
- Light/Dark Mode 실시간 전환
- 20개 M3 Color Roles 시각화

## 검증 방법

### 1. Theme Studio 테스트

```bash
# 1. Theme Studio에서 새 테마 생성
# 2. AI로 Primary/Secondary 색상 생성
# 3. Preview에서 색상 확인
# 4. Dark Mode 토글 테스트
# 5. M3 Color System Guide에서 실제 매핑 확인
```

**M3 Color System Guide**:
- Theme Studio 우측 패널에 실시간 색상 역할 표시
- 선택된 테마의 실제 색상으로 M3 다이어그램 생성
- Light/Dark Mode 전환 시 자동 업데이트
- 각 역할별 Shade 이름 및 Hex 값 표시

### 2. Figma Import 테스트

```bash
# 1. Figma Variables export
# 2. Theme Studio에서 import
# 3. 자동 매핑 확인
```

### 3. 수동 검증

```bash
# Deprecated 토큰 확인
grep -r "action-primary-bg\|action-secondary-bg" src/builder/styles/1-theme/preview-system.css

# 결과: 0 matches (clean)
```

## 참고 자료

- [Material Design 3 Color System](https://m3.material.io/styles/color/system/overview)
- [M3 Color Roles](https://m3.material.io/styles/color/roles)
- [Design Tokens Standard](https://www.w3.org/community/design-tokens/)
- [Style Dictionary](https://amzn.github.io/style-dictionary/)

---

**마지막 업데이트:** 2025-11-19
**담당자:** M3 Migration Team
