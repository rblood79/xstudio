# ADR-056: 프로젝트 레벨 Base Typography 단일 정본

## Status

Proposed — 2026-04-07

## Context

Base typography (font-family, font-size, line-height)가 Canvas/Preview/Publish 3곳에 하드코딩되어 불일치 발생.

| 위치                             | font-family                                | font-size                     | line-height                    |
| -------------------------------- | ------------------------------------------ | ----------------------------- | ------------------------------ |
| Canvas `ROOT_COMPUTED_STYLE`     | `Pretendard, sans-serif`                   | `16`                          | **누락** (`"normal"` fallback) |
| Preview `index.tsx` body         | `Pretendard, -apple-system, ...` (풀 체인) | **누락** (브라우저 기본 16px) | `1.5`                          |
| Publish `styles/index.css` :root | `-apple-system, ...` (**Pretendard 없음**) | `16px`                        | `1.5`                          |
| `CSS_INITIAL_VALUES`             | `sans-serif` (**Pretendard 없음**)         | `16`                          | `"normal"`                     |

**Hard Constraints:**

1. Canvas(Skia) ↔ Preview(CSS) ↔ Publish(CSS) 정합성 ≤1px 차이
2. 22+ 개 Spec 컴포넌트의 font 상속 체인이 깨지면 안 됨 (`DEFAULT_FONT_FAMILY` → `ROOT_COMPUTED_STYLE` → cascading)
3. 60fps 유지 — base style 변경 시 전체 재렌더가 프레임 드롭 없어야 함
4. 로컬 IndexedDB 기반 저장 — Supabase가 아닌 IndexedDB를 사용 중이므로 스키마 마이그레이션 부담 낮음
5. ADR-021 Theme System, ADR-014 Font Registry와 충돌 없이 공존
6. `rem` 단위 기준값 — `cssValueParser.ts`에 하드코딩된 `16`과 연동 필요

**Soft Constraints:**

- 향후 프로젝트 설정 UI에서 사용자가 font-family/size/line-height 변경 가능
- Google Fonts 통합(ADR-014)과 호환
- CSS `rem` 단위 — root font-size 변경 시 rem 기반 값 자동 연동

## Alternatives Considered

### 대안 A: CSS Custom Property 단일 정본

- 설명: CSS Custom Property `--root-font-family`, `--root-font-size`, `--root-line-height`를 정본으로 삼는다. Preview `:root`에 주입, Canvas는 `getComputedStyle(document.documentElement)`로 읽어 `ROOT_COMPUTED_STYLE` 동적 구성, Publish는 동일 CSS 변수 export.
- 근거: Webflow가 `--wf-font-family`, `--wf-base-size` CSS 변수를 정본으로 사용하는 패턴. Canvas와 Preview가 동일 변수 참조.
- 위험:
  - 기술: M — Canvas가 DOM 읽기에 의존. Skia 초기화 순서에 race condition 가능 (`getComputedStyle` 시점에 CSS 미적용)
  - 성능: L — `getComputedStyle`은 1회 읽기
  - 유지보수: M — CSS 변수와 TS 상수 이중 관리. sync 로직 필요
  - 마이그레이션: L — ADR-021 패턴과 동일

### 대안 B: TypeScript 상수 단일 정본 (BASE_TYPOGRAPHY 객체)

- 설명: `apps/builder/src/builder/fonts/` 에 `BASE_TYPOGRAPHY` 상수 하나를 두고 3곳이 모두 참조. `DEFAULT_FONT_FAMILY`를 `BASE_TYPOGRAPHY.fontFamily`로 통합. `ROOT_COMPUTED_STYLE`에 `lineHeight` 추가.
- 근거: Plasmic(오픈소스 노코드 빌더)이 `ProjectConfig.defaultStyles` 객체를 단일 정본으로 사용하는 패턴. XStudio에서 `DEFAULT_FONT_FAMILY`가 이미 동일 방식으로 3곳 import 중.
- 위험:
  - 기술: L — TS 상수 export/import는 검증된 패턴. `DEFAULT_FONT_FAMILY`가 이미 동작 중
  - 성능: L — 빌드타임 상수. 런타임 비용 없음
  - 유지보수: M — CSS 파일(`publish/styles/index.css`)은 TS import 불가 → 주석 연결 + 수동 동기화 (1파일 1줄)
  - 마이그레이션: L — `ROOT_COMPUTED_STYLE`에 lineHeight 1줄 추가

### 대안 C: 프로젝트 레벨 DB 설정 + 런타임 주입

- 설명: 로컬 IndexedDB의 프로젝트 설정에 `base_typography` 객체 추가. Builder 로딩 시 IndexedDB에서 읽어 Canvas(Zustand → ROOT_COMPUTED_STYLE), Preview(postMessage), Publish(빌드 시 CSS 생성) 3경로에 주입.
- 근거: Figma의 Variable Collections 패턴. 파일 메타데이터에 설계 토큰으로 저장, 렌더러 초기화 시 주입.
- 위험:
  - 기술: M — 새 postMessage 메시지 타입 + Preview 수신 로직 + Publish 빌드 파이프라인 수정. IndexedDB 스키마는 유연하므로 migration 부담 낮음
  - 성능: M — IndexedDB 비동기 로딩이 Canvas 초기화에 선행해야 함. 초기값 fallback 처리 필요
  - 유지보수: L — 단일 DB 정본. 향후 사용자 UI 확장에 자연스러움
  - 마이그레이션: L — IndexedDB는 스키마리스. 기존 프로젝트에 `base_typography` 없으면 default fallback으로 처리

### 대안 D: Vite codegen (빌드타임 CSS 자동 생성)

- 설명: TS 상수에서 빌드타임에 `base-typography.css`를 자동 생성. Canvas는 상수 직접 참조, Preview/Publish는 generated CSS 사용.
- 근거: 일부 디자인 시스템(Spectrum CSS)이 토큰에서 CSS 자동 생성하는 패턴.
- 위험:
  - 기술: H — Vite plugin 추가 필요. 빌드 파이프라인 복잡도 증가. HMR 상호작용 검증 필요
  - 성능: L — 빌드타임 생성
  - 유지보수: M — Vite plugin 유지보수 부담
  - 마이그레이션: M — 기존 CSS 파일 교체

### Risk Threshold Check

| 대안                    | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ----------------------- | ----- | ---- | -------- | ------------ | :--------: |
| A (CSS Custom Property) | M     | L    | M        | L            |     0      |
| B (TS 상수 단일 정본)   | L     | L    | M        | L            |     0      |
| C (프로젝트 IndexedDB)  | M     | M    | L        | L            |     0      |
| D (Vite codegen)        | **H** | L    | M        | M            |     1      |

루프 판정: 대안 A, B, C 모두 HIGH+ 없음. 대안 D만 HIGH 1개(기술). IndexedDB + localStorage 기반이므로 대안 C의 구현 비용이 대안 B와 거의 동일. `themeConfigStore`에 이미 tint/neutral/radiusScale이 동일 패턴으로 구현되어 있으므로 C가 최적.

## Decision

**대안 C: themeConfigStore + localStorage 동적 설정**을 선택한다.

기존 `themeConfigStore`(ADR-021)의 `tint`/`darkMode`/`neutral`/`radiusScale` 패턴을 그대로 확장하여 `baseTypography`를 추가한다.

### 기본값

```typescript
export const DEFAULT_BASE_TYPOGRAPHY = {
  fontFamily:
    "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', sans-serif",
  fontSize: 16,
  lineHeight: 1.5,
} as const;
```

- `fontFamily`: Pretendard 우선 + system font fallback 체인 (현재 Preview body와 동일)
- `fontSize`: 16px (CSS 기본값, 브라우저 기본값)
- `lineHeight`: 1.5 (현재 Preview body와 동일, CSS `normal` ≈ 1.2보다 가독성 우수)

### 변경 위치: ThemesPanel Typography 섹션

```
ThemesPanel (기존 ADR-021)
  ├─ Tint (색상 프리셋)          ← 기존
  ├─ Dark Mode (라이트/다크)      ← 기존
  ├─ Neutral (중립 톤)           ← 기존
  ├─ Radius Scale (모서리)       ← 기존
  └─ Typography (신규 섹션)      ← 추가
       ├─ Font Family (드롭다운: 프로젝트 등록 폰트 + system)
       ├─ Base Size (14/16/18 프리셋 또는 숫자 입력)
       └─ Line Height (1.4/1.5/1.6/1.75 프리셋)
```

### 데이터 흐름

```
ThemesPanel.setBaseTypography()
  → themeConfigStore (Zustand)
    → localStorage 영속화 (키: "xstudio-theme-config-{projectId}")
    → themeVersion++ (Skia 재렌더 트리거)
    → ROOT_COMPUTED_STYLE 동적 갱신
    → Preview postMessage (CSS 변수 주입)
    → Publish 빌드 시 CSS 생성

소비자 3경로:
  Canvas: themeConfigStore.baseTypography → ROOT_COMPUTED_STYLE → INHERITABLE_PROPERTIES 상속
  Preview: postMessage delta → iframe body style 갱신
  Publish: 빌드 시 themeConfig에서 읽어 :root CSS 생성
```

선택 근거:

1. `themeConfigStore`에 tint/neutral/radiusScale이 **동일한 패턴**으로 이미 구현됨 — localStorage 영속화, themeVersion 트리거, CSS+Skia 동시 반영. typography 추가는 이 패턴의 자연스러운 확장
2. IndexedDB/localStorage는 스키마리스 → 기존 프로젝트에 `baseTypography` 없으면 `DEFAULT_BASE_TYPOGRAPHY` fallback으로 무마이그레이션
3. ThemesPanel UI가 이미 PropertySection/PropertySelect 패턴으로 구성 → Typography 섹션 추가는 ~50줄
4. `ROOT_COMPUTED_STYLE`이 store에서 동적으로 읽으므로 사용자가 변경 즉시 Canvas 반영
5. rem 기준값도 store에서 읽으면 font-size 변경 시 rem 기반 레이아웃 자동 연동

기각 사유:

- **대안 A 기각**: Canvas가 DOM `getComputedStyle`에 의존하면 Skia 초기화 순서에 race condition 가능. themeConfigStore 직접 읽기가 더 안전
- **대안 B 기각**: 정적 상수는 정합성 수정만 가능하고 사용자 변경 불가. C의 구현 비용이 거의 동일한데 확장성이 훨씬 높음
- **대안 D 기각**: Vite plugin 빌드 파이프라인은 현재 XStudio 스택에 없는 새 의존성. 불필요한 인프라

> 구현 상세: [056-base-typography-ssot-breakdown.md](../design/056-base-typography-ssot-breakdown.md)

## Gates

잔존 HIGH 위험 없음.

| Gate               | 시점      | 통과 조건                                                              | 실패 시 대안          |
| ------------------ | --------- | ---------------------------------------------------------------------- | --------------------- |
| Spec 컴포넌트 정합 | 구현 직후 | 22+ Spec 컴포넌트 텍스트 높이 ≤1px 변화                                | lineHeight 값 조정    |
| Publish Pretendard | 구현 직후 | Publish 앱에서 Pretendard 렌더링 확인                                  | font-family 체인 조정 |
| rem 연동           | 구현 직후 | cssValueParser의 rem 기준값이 store.baseTypography.fontSize 참조       | DEFAULT 상수 fallback |
| 기존 테마 복원     | 구현 직후 | localStorage에 baseTypography 없는 기존 프로젝트가 DEFAULT로 정상 동작 | fallback 로직 보강    |

## Consequences

### Positive

- Canvas `ROOT_COMPUTED_STYLE.lineHeight`가 Preview(1.5)와 동기화 → Skia 텍스트 높이 불일치 해소
- Publish에 Pretendard 추가 → 빌더 ↔ 발행물 시각적 일치
- 사용자가 ThemesPanel에서 프로젝트별 base font 변경 가능 (프리셋 + 커스텀)
- tint/neutral과 동일한 themeVersion 트리거 → CSS + Skia 동시 반영 보장
- rem 기준값이 store에서 동적으로 읽히므로 font-size 변경 시 자동 연동
- `CSS_INITIAL_VALUES.fontFamily`도 store 값과 정렬 → cascading fallback 정합

### Negative

- CSS 파일(`publish/styles/index.css`)은 TS import 불가 → Publish 빌드 파이프라인에서 themeConfig를 읽어 CSS 주입하는 로직 필요 (또는 주석 연결)
- `lineHeight: 1.5` 추가로 기존 Canvas 렌더링 결과가 미세하게 변할 수 있음 (이전: `"normal"` ≈ 1.2 → 이후: 1.5). Spec 컴포넌트 대부분은 자체 lineHeight 지정이므로 영향 최소
- ThemesPanel에 Typography 섹션 추가 → 패널 높이 증가 (스크롤 필요할 수 있음)
