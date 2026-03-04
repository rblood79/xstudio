# ADR-021: 테마 시스템 개편 — Tint + Tailwind 기반 인라인 테마 패널

## Status

Proposed (2026-03-04)

## Scope

> **이 테마 시스템은 Builder UI가 아닌, 사용자 콘텐츠의 출력물에 적용된다.**

| 적용 대상                   | 설명                     | 테마 전달 방식                                         |
| --------------------------- | ------------------------ | ------------------------------------------------------ |
| **CSS Preview** (iframe)    | 실시간 미리보기          | postMessage → CSS 변수 (`--tint`, `--color-neutral-*`) |
| **Publish** (배포 앱)       | 최종 배포물              | 정적 CSS 파일 (빌드 시 생성)                           |
| **Skia/CanvasKit** (캔버스) | Builder 내 캔버스 렌더링 | TokenRef → `resolveToken()` → Float32Array (RGBA)      |

Builder UI 자체 테마(`builder-system.css`, `--builder-*`)는 이 ADR의 범위가 **아님**.

### 3가지 렌더링 경로에서의 테마 적용

```
ThemeConfig (사용자 설정)
    │
    ├─→ CSS Preview ────→ CSS 변수 주입 (postMessage → setThemeVars)
    │                     --tint, --color-neutral-*, data-theme 속성
    │                     oklch() relative color + color-mix() 자동 파생
    │
    ├─→ Publish ─────────→ 정적 CSS 생성 (generateThemeCSS → theme.css)
    │                     동일 CSS 변수 체계, data-theme 속성
    │
    └─→ Skia Canvas ────→ TokenRef 해석 (resolveToken → Float32Array)
                          specShapesToSkia() → colorValueToFloat32()
                          MutationObserver로 data-theme 변경 감지
```

**핵심: 동일 ThemeConfig에서 3가지 경로로 분기**

- CSS 경로 (Preview/Publish): `--tint` CSS 변수 → oklch 자동 스케일
- Skia 경로: `resolveToken('{color.primary}', 'light'|'dark')` → hex → RGBA Float32Array

## Context

### 문제 정의

현재 XStudio의 테마 시스템은 초기에 설계되어 다음 문제를 가진다:

1. **Theme Studio가 새 창(`window.open`)으로 분리됨** — Builder 워크플로우 단절
2. **ThemesPanel이 읽기 전용** — 토큰 목록만 표시, 편집 불가 → "Theme Studio 열기" 버튼이 유일한 인터랙션
3. **Supabase DB 기반 토큰 관리** — `DesignToken` 테이블에 개별 토큰 CRUD → 색상 하나 변경에 DB 왕복 필요
4. **과도한 기능** — HCT Generator, Figma Import/Export, AI Theme Generator 등 사용되지 않는 서브 뷰 7개
5. **ADR-017 완료 후 토큰 시스템 불일치** — M3 제거 + Tint System 도입으로 CSS 변수 체계가 바뀌었으나, Theme Store/DB 스키마는 구 토큰 구조 유지
6. **현재 Tint System이 하드코딩** — `--tint: var(--blue)` 고정, 사용자가 Builder 내에서 변경 불가
7. **Skia 렌더러와 CSS 테마 불일치** — Spec의 `resolveToken()`이 하드코딩된 색상 맵 참조, Tint System과 독립적으로 동작

### Hard Constraints

- Preview iframe 격리 유지 (postMessage 통신)
- 기존 Tint Color System (`preview-system.css`) 보존 및 확장
- Tailwind v4 색상 체계(`--color-*`) 호환
- Light/Dark 모드 전환 유지
- Builder UI 테마(`builder-system.css`)와 사용자 콘텐츠 테마 분리 유지
- **Skia/CSS 색상 일치** — 캔버스와 Preview/Publish에서 동일 요소가 같은 색상으로 렌더링

### 현재 아키텍처

```
ThemesPanel (읽기 전용) → "Theme Studio 열기" → window.open('/theme/{projectId}')
  ↓
ThemeStudio (새 창) → Supabase DB (design_themes, design_tokens)
  ↓
injectThemeCSS() → <style id="design-theme-vars"> → Preview iframe (CSS만)
                                                      Skia는 별도 경로 (resolveToken)
```

**현재 색상 경로 분리 문제:**

| 경로        | 색상 소스                 | 테마 변경 반영                 |
| ----------- | ------------------------- | ------------------------------ |
| CSS Preview | `--tint` CSS 변수 (oklch) | `--tint: var(--blue)` 하드코딩 |
| Skia Canvas | `colors.ts` 하드코딩 hex  | `resolveToken()` 정적 맵       |
| Publish     | CSS 변수 (정적)           | 빌드 시점 고정                 |

→ Tint 변경 시 CSS는 반영되지만 Skia는 별도 업데이트 필요

**현재 파일 구성:**

- `panels/themes/ThemesPanel.tsx` — 읽기 전용 패널
- `panels/themes/ThemeStudio.tsx` — 새 창 전용 (375줄, 7개 서브뷰)
- `panels/themes/components/` — AIThemeGenerator, HctThemeGenerator, FigmaImporter, TokenEditor, DarkModeGenerator, FigmaPluginExporter, ThemeExporter
- `stores/themeStore.ts` — UnifiedThemeStore (Supabase CRUD)
- `types/theme/index.ts` — DesignToken, DesignTheme 등 (420줄)
- `packages/specs/src/primitives/colors.ts` — Skia용 하드코딩 색상 맵
- `packages/specs/src/renderers/utils/tokenResolver.ts` — TokenRef → hex/CSSVar 변환
- `specShapeConverter.ts` — Spec → Float32Array (Skia 렌더링)

---

## 업계 리서치

### 주요 빌더 테마 시스템 비교

| 항목            | Webflow                      | Framer              | Figma Variables | Squarespace            | shadcn/ui             |
| --------------- | ---------------------------- | ------------------- | --------------- | ---------------------- | --------------------- |
| **토큰 계층**   | Primitive → Semantic (2계층) | Color Styles (단일) | Aliasing N계층  | 5색 → 10테마 자동 파생 | Semantic 우선 (2계층) |
| **색상 포맷**   | HEX                          | UI Picker           | HEX             | UI Picker              | OKLCH                 |
| **Light/Dark**  | Variable Modes + class       | Color Style 내장    | Mode 전환       | 10단계 밝기            | `.dark` class         |
| **섹션별 테마** | class 적용                   | 컴포넌트별          | 프레임별 Mode   | 섹션별 테마            | 컨테이너 class        |
| **프리셋**      | 3종                          | Light/Dark          | 없음            | 다수 큐레이션          | 5종 base              |
| **편집 위치**   | 인라인 패널                  | Assets 패널         | Variables 패널  | Site Styles            | globals.css           |

### 핵심 인사이트

1. **인라인 편집이 표준** — Webflow, Framer, Figma 모두 별도 창이 아닌 빌더 내 패널에서 테마 편집
2. **소수 색상 → 자동 파생이 트렌드** — Squarespace(5색→10테마), XStudio Tint(1색→16스케일) 패턴 공유
3. **OKLCH가 대세** — shadcn/ui, Tailwind v4 모두 채택. XStudio 이미 사용 중
4. **CSS 변수 기반 전환** — 모든 시스템이 CSS 변수 교체로 테마 전환. DB 기반은 없음
5. **2계층 구조 보편화** — Primitive(원시) → Semantic(시맨틱) 참조 패턴

---

## Alternatives Considered

### 대안 A: Theme Studio 리팩토링 (기존 DB 구조 유지)

- **설명**: ThemeStudio를 새 창에서 Builder 우측 패널로 이동. Supabase 토큰 DB 스키마 유지, UI만 인라인화.
- **위험**:
  - 기술: **L** — UI 이동만으로 기존 코드 대부분 재사용
  - 성능: **M** — DB 왕복이 여전히 존재 (색상 변경마다 Supabase CRUD)
  - 유지보수: **H** — Tint System과 DB 토큰 이중 관리 지속, CSS 변수 ↔ DB 동기화 복잡도 유지
  - 마이그레이션: **L** — 최소 변경

### 대안 B: CSS 변수 네이티브 테마 (DB 토큰 폐기)

- **설명**: Tint System + Tailwind 색상을 SSOT로. 테마 설정을 프로젝트 메타데이터(JSON)로 저장. ThemesPanel을 인라인 편집 패널로 교체.
- **위험**:
  - 기술: **M** — CSS 변수 주입 파이프라인 재설계 필요
  - 성능: **L** — DB 왕복 제거, CSS 변수 즉시 적용
  - 유지보수: **L** — 단일 소스(CSS 변수), 이중 관리 제거
  - 마이그레이션: **H** — 기존 ThemeStudio/Store/DB 스키마 전면 교체

### 대안 C: 하이브리드 (Tint CSS 우선 + DB 커스텀 토큰 유지)

- **설명**: 기본 테마는 CSS 변수(Tint + Tailwind)로 처리, 고급 커스텀 토큰만 DB에 저장. 인라인 패널에서 기본 편집, 고급 토큰은 별도 뷰.
- **위험**:
  - 기술: **M** — 두 시스템 경계 관리 필요
  - 성능: **L** — 기본 테마는 CSS만, 커스텀만 DB
  - 유지보수: **M** — 경계가 명확하면 관리 가능, 불명확하면 혼란
  - 마이그레이션: **M** — 기본 테마 부분만 전환, DB 일부 유지

### Risk Threshold Check

- 대안 A: 유지보수 HIGH → 신규 대안 검토 ✓ (대안 B, C 존재)
- 대안 B: 마이그레이션 HIGH → 위험 수용 근거 필요
- 대안 C: HIGH 없음, 전체 MEDIUM 이하

---

## Decision

**대안 B: CSS 변수 네이티브 테마** 선택

### 위험 수용 근거 (마이그레이션 HIGH)

1. **기존 ThemeStudio 사용률 극히 낮음** — 새 창 분리로 인해 실제 사용자 워크플로우에서 거의 미사용
2. **ADR-017로 M3 토큰 이미 제거됨** — DB 토큰과 CSS 변수 사이 괴리가 이미 발생, 정리 시점
3. **Tint System이 이미 SSOT 역할** — `preview-system.css`가 실질적 테마 엔진, DB 토큰은 중복
4. **단계적 마이그레이션으로 위험 완화** — Phase A(최소 기능)부터 점진 전환, 기존 코드는 Phase D에서 제거

### 설계 개요

#### 1. 테마 데이터 모델 (JSON in project metadata)

```typescript
interface ThemeConfig {
  // Accent Color
  tint: TintPreset | CustomTint;

  // Neutral Color (gray scale)
  neutral: NeutralPreset; // 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

  // Semantic Overrides (선택)
  overrides?: {
    [key: string]: string; // e.g., '--highlight-background': '#custom'
  };

  // Dark Mode
  darkMode: {
    enabled: boolean;
    default: "light" | "dark" | "system";
  };

  // Border Radius Scale
  radiusScale: "none" | "sm" | "md" | "lg" | "xl";
}

type TintPreset =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "turquoise"
  | "cyan"
  | "blue"
  | "indigo"
  | "purple"
  | "pink";

interface CustomTint {
  type: "custom";
  hue: number; // 0-360
  chroma: number; // 0-0.4
}

type NeutralPreset = "slate" | "gray" | "zinc" | "neutral" | "stone";
```

#### 2. 테마 적용 파이프라인 (3경로 동시 반영)

```
ThemePanel (인라인 편집)
  ↓ Zustand store 업데이트 (즉시)
  ↓
ThemeConfig
  ├─→ generateThemeCSS() → CSS 변수 문자열
  │     ├─→ Preview iframe (postMessage → <style id="theme-vars">)
  │     └─→ Publish 빌드 시 정적 CSS 파일
  │
  ├─→ updateSkiaColors() → Spec TokenRef 색상 맵 갱신
  │     ├─→ colors.ts의 lightColors/darkColors 동적 업데이트
  │     ├─→ Tint → oklch 계산 → hex 변환 → Float32Array
  │     └─→ registryVersion++ → Skia 캐시 무효화 → 캔버스 재렌더링
  │
  └─→ 프로젝트 메타데이터에 JSON 저장 (비동기, Supabase projects 테이블)
```

**Skia-CSS 색상 일치 보장:**

- `ThemeConfig.tint` → oklch 계산 → CSS 변수 + hex 값 동시 생성
- Neutral 프리셋 → Tailwind 색상 → CSS 변수 + Spec 색상 맵 동시 갱신
- Dark Mode 토글 → `data-theme` 속성 + `resolveToken()` theme 파라미터 동시 전환

#### 3. 인라인 Theme Panel UI 구성

```
┌─ Theme Panel ──────────────┐
│                            │
│ Accent Color               │
│ ┌──────────────────────┐   │
│ │ 🔴🟠🟡🟢🔵🟣  ···  │   │ ← 10개 Tint 프리셋 그리드
│ │ [Custom Color Picker] │   │ ← 커스텀 색상 (hue/chroma)
│ └──────────────────────┘   │
│                            │
│ Neutral Tone               │
│ [Slate ▾]                  │ ← 5개 프리셋 드롭다운
│                            │
│ Dark Mode                  │
│ [○ Light  ● Dark  ○ Auto] │ ← 3-way 토글
│                            │
│ Border Radius              │
│ [none|sm|md|lg|xl]         │ ← 5단계 슬라이더
│                            │
│ ─── Preview ───            │
│ ┌────────────────────┐     │
│ │  Button  [Input ]  │     │ ← 실시간 미니 프리뷰
│ │  Link    Card       │     │
│ └────────────────────┘     │
│                            │
│ ─── Advanced ───           │
│ [▸ Semantic Overrides]     │ ← 접을 수 있는 고급 섹션
└────────────────────────────┘
```

#### 4. CSS 생성 함수

```typescript
function generateThemeCSS(config: ThemeConfig): string {
  const lines: string[] = [":root {"];

  // 1. Tint 설정
  if (typeof config.tint === "string") {
    lines.push(`  --tint: var(--${config.tint});`);
  } else {
    lines.push(
      `  --tint: oklch(0.55 ${config.tint.chroma} ${config.tint.hue});`,
    );
  }

  // 2. Neutral 색상 매핑 (Tailwind 색상 참조)
  for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
    lines.push(
      `  --color-neutral-${step}: var(--color-${config.neutral}-${step});`,
    );
  }

  // 3. Border Radius Scale
  const radiusMap = {
    none: "0",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  };
  lines.push(`  --radius-base: ${radiusMap[config.radiusScale]};`);

  // 4. Semantic Overrides
  if (config.overrides) {
    for (const [key, value] of Object.entries(config.overrides)) {
      lines.push(`  ${key}: ${value};`);
    }
  }

  lines.push("}");

  // 5. Dark Mode
  if (config.darkMode.enabled) {
    lines.push('[data-theme="dark"] {');
    // lightness scale 반전은 preview-system.css에 이미 정의됨
    // 추가 다크모드 오버라이드만 여기에
    lines.push("}");
  }

  return lines.join("\n");
}
```

#### 5. Tailwind v4 Neutral 색상 통합

현재 `shared-tokens.css`의 `--color-neutral-*`을 Tailwind 프리셋으로 교체 가능하게:

| Neutral 프리셋 | 특성             | 사용 예     |
| -------------- | ---------------- | ----------- |
| `slate`        | 청회색 (cool)    | 모던/테크   |
| `gray`         | 순수 회색        | 범용        |
| `zinc`         | 약간 따뜻한 회색 | 깔끔한 느낌 |
| `neutral`      | 완전 중립        | 미니멀      |
| `stone`        | 난색 회색 (warm) | 따뜻한 느낌 |

---

## Implementation Plan

### Phase A: 인라인 Theme Panel + 3경로 동시 반영 (최소 기능)

**목표**: ThemesPanel을 편집 가능한 인라인 패널로 교체, CSS Preview + Skia + Publish 동시 반영

**작업 범위:**

1. `ThemePanel.tsx` 신규 작성 — Accent Color 프리셋 선택 + Dark Mode 토글
2. `themeConfigStore.ts` 신규 — `ThemeConfig` Zustand store (로컬 상태 우선)
3. `generateThemeCSS.ts` 신규 — ThemeConfig → CSS 변수 문자열 변환 (Preview/Publish용)
4. `updateSkiaColors.ts` 신규 — ThemeConfig → Spec 색상 맵 동적 갱신 (Skia용)
   - Tint oklch → hex 변환 (CSS `oklch()` ↔ hex 변환 유틸)
   - `colors.ts`의 `lightColors`/`darkColors` 런타임 업데이트
   - `registryVersion++` → Skia 캐시 무효화 → 캔버스 자동 재렌더링
5. Preview iframe에 CSS 주입 (`postMessage` → `<style id="theme-vars">`)
6. 기존 ThemesPanel을 새 ThemePanel로 교체

**변경 파일**: ~6개 신규, 2개 수정 (패널 레지스트리, colors.ts를 동적으로 전환)
**위험**: M (Skia 색상 동기화 복잡도 — oklch↔hex 변환 정확도 검증 필요)

### Phase B: Neutral Tone + Radius + 미니 프리뷰

**목표**: 전체 테마 커스터마이징 완성

**작업 범위:**

1. Neutral 프리셋 드롭다운 (5종 Tailwind gray scale)
2. Border Radius 스케일 선택 (5단계)
3. 인라인 미니 프리뷰 컴포넌트 (Button, Input, Card 샘플)
4. 커스텀 Tint 색상 피커 (hue/chroma 슬라이더)

**변경 파일**: ~4개 신규/수정
**위험**: L

### Phase C: 프로젝트 메타데이터 영속화 + Publish 통합

**목표**: ThemeConfig를 DB에 저장/복원, Publish 앱에서 정적 테마 적용

**작업 범위:**

1. Supabase `projects` 테이블에 `theme_config` JSONB 컬럼 추가 (또는 기존 metadata 필드 활용)
2. 프로젝트 로딩 시 ThemeConfig 복원 → CSS 주입 + Skia 색상 맵 갱신
3. ThemeConfig 변경 시 비동기 DB 저장 (디바운스)
4. **Publish 빌드**: `generateThemeCSS(config)` → `theme.css` 정적 파일 생성
5. **Publish 런타임**: `App.tsx`에서 `theme_config` JSON 로드 → CSS 변수 적용 + `data-theme` 설정

**변경 파일**: ~4개 수정 (projects 스키마, Builder 로딩, Publish App, Publish 빌드)
**위험**: M (DB 마이그레이션)

### Phase D: 레거시 정리

**목표**: 구 ThemeStudio 및 관련 코드 제거

**작업 범위:**

1. `ThemeStudio.tsx` + 7개 서브 컴포넌트 제거
2. `themeStore.ts` (UnifiedThemeStore) 제거 또는 축소
3. `/theme/:projectId` 라우트 제거
4. Supabase `design_themes`, `design_tokens` 테이블 비활성화 (데이터 보존, 코드 참조 제거)
5. `types/theme/index.ts` 간소화 — `ThemeConfig` 중심으로

**변경 파일**: ~15개 삭제, ~5개 수정
**위험**: M (삭제 범위 넓지만 Phase A-C에서 대체 완료 후 진행)

### Phase E (선택): 섹션별 테마 오버라이드

**목표**: 페이지/섹션 단위로 다른 Tint 적용

**작업 범위:**

1. 요소별 `data-tint` 속성으로 Tint 오버라이드
2. CSS 선택자: `[data-tint="purple"] { --tint: var(--purple); }`
3. Inspector에 "Section Theme Override" 옵션

**위험**: M (CSS 스코프 관리 복잡도)

---

## Gates

| Gate | 시점            | 조건                                                                                    | 위험 대응                          |
| ---- | --------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| G1   | Phase A 완료    | Tint 프리셋 10종 변경 시 **CSS Preview + Skia 캔버스** 동시 반영 확인                   | 실패 시 기존 ThemesPanel 복원      |
| G1.1 | Phase A 완료    | **Skia-CSS 색상 일치 검증**: 동일 Button 요소가 캔버스와 Preview에서 같은 색상 (ΔE < 2) | oklch→hex 변환 정밀도 검증         |
| G2   | Phase B 완료    | Neutral 5종 전환 시 전체 gray scale 일관 교체 확인 (3경로 모두)                         | shared-tokens.css 호환성 검증      |
| G3   | Phase C 완료    | 새로고침 후 테마 설정 복원 + **Publish 정적 CSS 정상** + Skia 색상 복원                 | DB 마이그레이션 롤백 스크립트 준비 |
| G4   | Phase D 시작 전 | Phase A-C 전체 안정화 2주 이상 운영                                                     | 조기 삭제 방지                     |

---

## Consequences

### Positive

1. **워크플로우 통합** — 새 창 전환 없이 Builder 내에서 테마 편집 완료
2. **즉시 반영** — CSS 변수 교체로 DB 왕복 없이 실시간 프리뷰
3. **코드 대폭 감소** — ThemeStudio 7개 서브뷰 + UnifiedThemeStore + DB 서비스 제거 (~2,000줄+)
4. **Tint System 정합성** — ADR-017에서 도입한 Tint System을 사용자 인터페이스로 완성
5. **업계 표준 정렬** — Webflow/Framer/shadcn 수준의 인라인 테마 편집 UX
6. **Tailwind v4 통합** — Neutral 프리셋으로 Tailwind 색상 체계를 직접 활용

### Negative

1. **기존 DB 토큰 비활성화** — `design_themes`/`design_tokens` 테이블 데이터 사실상 폐기
2. **고급 토큰 기능 축소** — HCT 생성, Figma Import 등 제거 (사용률 미미하나 재도입 시 비용 발생)
3. **커스텀 색상 제한** — Tint 프리셋 10종 + 커스텀 hue/chroma로 범위 제한 (개별 토큰 세밀 제어 불가)

---

## References

- [ADR-017: CSS Override SSOT — M3 제거 + Tint System](017-css-override-ssot.md)
- [ADR-018: 컴포넌트 CSS 구조 재작성](018-component-css-restructure.md)
- [preview-system.css](../../packages/shared/src/components/styles/theme/preview-system.css) — Tint Color System 구현
- [shared-tokens.css](../../packages/shared/src/components/styles/theme/shared-tokens.css) — Tailwind 색상 팔레트
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) — OKLCH + CSS 변수 패턴
- [Tailwind CSS v4 Theme](https://tailwindcss.com/docs/theme) — `@theme` 디렉티브
- [Webflow Design Tokens](https://webflow.com/blog/theming-design-tokens) — Primitive + Semantic 2계층
- [Squarespace Color Themes](https://support.squarespace.com/hc/en-us/articles/205815278) — 5색 → 10테마 자동 파생
