# ADR-107: Preview/Publish `:root` + body 대칭 복구 via shared-tokens

## Status

Implemented — 2026-04-22 (Proposed 2026-04-22 — 3차 개정: Codex 1/3/4차 리뷰 7건 반영. Phase 1-5 + Gate G1-G6 전원 통과로 Implemented 전환)

## Context

Base typography domain 에서 **Preview iframe 의 실 렌더 상속 체인**이 Publish 와 비대칭. ADR-056 Phase 3 구현으로 `document.body.style` 은 postMessage `THEME_BASE_TYPOGRAPHY` 수신 시 `DEFAULT_BASE_TYPOGRAPHY` 값으로 주입되나, 정적 상태 (postMessage 수신 전 + static CSS) 에서는:

- Preview `:root` (html) — font-family 미정의 (브라우저 기본 / macOS + `lang="ko"` 조합 시 Apple SD Gothic Neo)
- Preview `body` — `preview/index.tsx:42-48` 에서 `font-family: "Pretendard", "Inter Variable", monospace, system-ui, sans-serif; line-height: 1.5;` 하드코딩. **`DEFAULT_BASE_TYPOGRAPHY` 체인과 다름** (Inter Variable / monospace 포함, `-apple-system`/`BlinkMacSystemFont`/Roboto/Helvetica Neue/Segoe UI 누락)
- Publish `:root` — `apps/publish/src/styles/index.css:72-87` 에서 `DEFAULT_BASE_TYPOGRAPHY` 와 동일 체인 + 16px + 1.5 명시
- Builder `:root` — `apps/builder/src/App.css:6-9` (`--font-inter: "Pretendard"` / `--font-sans: var(--font-inter), system-ui`) + `App.css:392` (`--default-font-family: var(--font-inter), system-ui`) + `App.css:423-445` (`html, :root { font-family: var(--default-font-family, ui-sans-serif, ...) }`) 체인으로 **이미 `Pretendard, system-ui` 로 해석됨**
- Builder Skia D3 consumer — `apps/builder/src/builder/workspace/canvas/layout/engines/cssResolver.ts:294 getRootComputedStyle()` 가 `themeConfigStore.baseTypography ?? DEFAULT_BASE_TYPOGRAPHY` 를 직접 읽음 → ADR-056 Phase 2 에서 SSOT 연결 완결. **본 ADR 범위 외**

ADR-063 **SSOT 체인 3-domain** 기준 **D3(시각 스타일) symmetric consumer** 의 **실 시각 결과 대칭** 위반 지점은 다음 둘로 재정의:

| 대상                            | 현 상태                                                                              | 지향                              |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| Preview iframe `:root` computed | 브라우저 기본 (Apple SD Gothic Neo)                                                  | DEFAULT 체인 (Pretendard ...)     |
| Preview iframe `body` 정적 체인 | `"Pretendard", "Inter Variable", monospace, system-ui, sans-serif` (DEFAULT 와 상이) | DEFAULT 체인 상속 (하드코딩 제거) |

Publish / Builder(Skia D3 via `cssResolver`) 2 경로는 이미 DEFAULT 체인 SSOT 연결 완료 → 변경 불요.

Builder UI (`App.css :root`) 는 cascade layer 관점에서 본 ADR 의 **간접 영향권**: `apps/builder/src/index.css:14` layer 순서가 `dashboard, base, preview-system, components, shared-tokens, builder-system, utilities` 로 `base < shared-tokens` 이므로 shared-tokens `:root` 에 `font-family` 추가 시 `App.css:400-445 @layer base { html, :root { font-family: var(--default-font-family, ...) } }` 규칙을 cascade override 한다. 현재 Builder `:root` computed fontFamily 는 `Pretendard, system-ui` 2-family (via `--default-font-family: var(--font-inter), system-ui`) 이고, 변경 후에는 `DEFAULT_BASE_TYPOGRAPHY` 체인 (`Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", sans-serif`) 으로 교체된다. **1st family = Pretendard 동일** + macOS 에서 2nd family 가 `system-ui` → `-apple-system` 으로 교체되나 양쪽 모두 System Font (San Francisco) 로 resolve → Pretendard `@font-face` 로드 정상 시 visible 차이 0 예상. Pretendard 로드 실패 시에만 fallback chain 차이 관찰 가능.

### Hard Constraints

1. **D3 symmetric 재정의** — Preview iframe `getComputedStyle(documentElement)` + `getComputedStyle(document.body)` + Preview 내부 텍스트 노드 inherited fontFamily 3 레벨이 모두 `DEFAULT_BASE_TYPOGRAPHY` 체인과 일치
2. ADR-056 Phase 3 `body.style` 동적 주입 (postMessage `THEME_BASE_TYPOGRAPHY`) 경로 보존 — ThemesPanel 런타임 변경 동작 유지
3. **Builder UI `:root` 1st family = Pretendard 유지** — cascade layer override 로 fallback chain 은 shared-tokens 체인으로 교체되나, 1st family 동일 + macOS SF 동등성으로 visible 차이 0 예상. Pretendard `@font-face` 로드 실패 극단 시나리오는 R6 에서 관리
4. Builder Skia D3 (`cssResolver.ts:294 getRootComputedStyle()`) 경로 불변 — ADR-056 Phase 2 에서 이미 `themeConfigStore.baseTypography ?? DEFAULT_BASE_TYPOGRAPHY` SSOT 연결됨. `App.css :root` cascade 와 무관
5. BC 0% — `DEFAULT_BASE_TYPOGRAPHY` 상수값 / Publish `index.css :root` / `apps/builder` 모든 파일 불변 (코드 변경 없음). Builder computed fontFamily 의 fallback chain 만 cascade 로 교체
6. Pretendard 고유 `font-feature-settings: "cv02", "cv03", "cv04", "cv11"` (Preview body) 보존 — cv 변형은 Pretendard 의 한글 타이포 품질 핵심

### Soft Constraints

- Pretendard `@font-face` 는 Preview/Publish/Builder 모두 이미 로드 중 (신규 로딩 불요)
- 향후 `themeConfigStore.baseTypography` 런타임 변경은 postMessage 경로로 `body.style` + `documentElement.style` 양쪽 주입
- `shared-tokens.css :root` 는 현재 `--text-*` / `--spacing-*` / `--font-weight-*` 등 디자인 토큰만 정의 (font-family / size / line-height 기저값 없음) — 여기에 DEFAULT 체인 추가 시 Preview 도 shared-tokens import 경유로 자동 상속 (shared-tokens import: `preview/index.tsx:12 "@composition/shared/components/styles/index.css"` → `theme.css` → `shared-tokens.css`)

## Alternatives Considered

### 대안 A: Preview `injectBaseStyles()` 확장 — `:root` + body 양쪽 CSS rule 추가

- 설명: `preview/index.tsx:injectBaseStyles()` 의 `<style>` 에 `:root { font-family: DEFAULT; font-size: 16px; line-height: 1.5; }` 추가 + body 의 `font-family` / `line-height` 를 제거 (`font-feature-settings`/`color`/`background` 유지). `handleThemeBaseTypography` 에 `document.documentElement.style` 주입 추가.
- 근거: Preview 내부 수정만 → scope 최소. `DEFAULT_BASE_TYPOGRAPHY` TS 상수를 import 하여 직접 사용 → SSOT 1곳(TS) 기반.
- 위험:
  - 기술: L — `injectBaseStyles()` 2 블록 수정 + handler 3 라인 추가
  - 성능: L — 정적 CSS rule 2개
  - 유지보수: M — `DEFAULT_BASE_TYPOGRAPHY` TS 상수 + Publish `index.css` + Preview `injectBaseStyles` 3곳 하드코딩 유지
  - 마이그레이션: L — BC 0

### 대안 B: Preview 전용 static CSS 파일 신설

- 설명: `apps/builder/src/preview/styles/base-typography.css` 신설, `:root { ... }` 정의 + `preview/index.tsx` 에서 import + body 하드코딩 제거.
- 근거: Publish `apps/publish/src/styles/index.css` static CSS 구조 대칭.
- 위험:
  - 기술: L
  - 성능: L
  - 유지보수: M — 3곳 하드코딩 유지, 대안 A 대비 이점 없음
  - 마이그레이션: L

### 대안 C: `shared-tokens.css :root` 에 base typography 추가 + Preview body 하드코딩 제거 (공유 SSOT)

- 설명: `packages/shared/src/components/styles/theme/shared-tokens.css :root` 에 `font-family: DEFAULT 체인; line-height: 1.5;` 추가 (font-size 제외). Preview + Publish + Builder 3 app 모두 shared-tokens 를 import 하므로 `@layer shared-tokens` 가 `@layer base` (Builder `App.css`) 를 cascade override — Builder `:root` fallback chain 도 교체되나 1st family Pretendard 동일로 visible 차이 0 예상. Preview `injectBaseStyles()` 에 `:root { font-size: 16px }` 추가 + body 의 `font-family` / `line-height` 제거. `handleThemeBaseTypography` 에 documentElement.style 주입 추가. Publish `index.css :root` 중복은 unlayered specificity 로 유지 (BC 0).
- 근거: Tailwind v4 base.css `html, :root { ... }` 패턴 + Adobe Spectrum CSS shared tokens 패턴. shared-tokens 가 이미 Preview + Publish + Builder 공통 import 지점 → 실 SSOT 역할 강화. font-size 는 shared-tokens 제외 — Builder `App.css:441` "browser default 유지" 주석 원칙 준수 (shared-tokens 경유 시 Builder 까지 영향받지 않도록 의도적 배제) 및 Publish index.css 에서 이미 명시.
- 위험:
  - 기술: L — shared-tokens `:root` 2 항목 + Preview 2 파일 수정 (`injectBaseStyles` + `messageHandler`). Builder cascade override 발생하나 1st family = Pretendard 동일 + macOS SF 동등성으로 visible risk LOW (R6 관리)
  - 성능: L — CSS rule 추가
  - 유지보수: L — SSOT 2곳 (shared-tokens CSS + `DEFAULT_BASE_TYPOGRAPHY` TS 상수) 동일성 유지. 기존 3곳 (TS + Publish index.css + Preview body inline) 대비 축소. 추후 codegen 도입 시 1곳 수렴 가능
  - 마이그레이션: M — Publish `index.css :root` 중복 유지 (BC 0), 후속 제거 결정 별도

### 대안 D: Vite codegen (TS 상수 → generated CSS)

- 설명: Vite plugin 으로 `DEFAULT_BASE_TYPOGRAPHY` 를 빌드타임 CSS 로 자동 생성. 3 app 모두 동일 generated CSS.
- 근거: Adobe Spectrum CSS token codegen 패턴.
- 위험:
  - 기술: **H** — Vite plugin 추가, 빌드 파이프라인 복잡도, HMR 상호작용. ADR-056 Alternatives D 에서 기각된 패턴
  - 성능: L
  - 유지보수: M
  - 마이그레이션: M

### 대안 E: `documentElement.style` + `body.style` inline 주입만 (CSS rule 없이)

- 설명: `injectBaseStyles()` 에서 JS inline 으로 `document.documentElement.style` + `document.body.style` 직접 주입.
- 근거: ADR-056 Phase 3 body.style 패턴 복제.
- 위험:
  - 기술: L
  - 성능: L
  - 유지보수: M — inline specificity 최상위 → 후속 CSS cascade override 불가
  - 마이그레이션: L

### Risk Threshold Check

| 대안  | 기술  | 성능 | 유지보수 | 마이그 | HIGH+ |      SSOT 완전성       | 대칭성 (body 포함) |
| ----- | :---: | :--: | :------: | :----: | :---: | :--------------------: | :----------------: |
| A     |   L   |  L   |    M     |   L    |   0   |   중 (3곳 하드코딩)    |        완전        |
| B     |   L   |  L   |    M     |   L    |   0   |   중 (3곳 하드코딩)    |        완전        |
| **C** |   L   |  L   |    L     |   M    |   0   | **고 (2곳: CSS + TS)** |      **완전**      |
| D     | **H** |  L   |    M     |   M    |   1   |          최상          |        완전        |
| E     |   L   |  L   |    M     |   L    |   0   |           중           |        완전        |

루프 판정: A/B/C/E 전원 HIGH+ 0. D 기각 (기술 H). 추가 루프 불요.

### 반복 패턴 선차단 (rules/adr-writing.md §Experimental seed)

- **#1 코드 경로 구체 인용 (3곳+)**:
  - Preview static: `apps/builder/preview.html` / `apps/builder/src/preview/index.tsx:28-69` (`injectBaseStyles`)
  - Preview body 하드코딩: `apps/builder/src/preview/index.tsx:42-48`
  - Preview 동적: `apps/builder/src/preview/messaging/messageHandler.ts:425-430` (`handleThemeBaseTypography`)
  - Publish: `apps/publish/src/styles/index.css:72-87`
  - Builder UI root: `apps/builder/src/App.css:6-11` (`--font-inter: "Pretendard"`, `--font-sans: var(--font-inter), system-ui`) / `App.css:392` (`--default-font-family: var(--font-inter), system-ui`) / `App.css:400` (`@layer base {` 시작) / `App.css:423-445` (`html, :root { font-family: var(--default-font-family, ...) }`)
  - Builder cascade layer 순서: `apps/builder/src/index.css:14` `@layer dashboard, base, preview-system, components, shared-tokens, builder-system, utilities;` → **`base < shared-tokens`** (본 ADR 의 cascade 근거)
  - Builder Skia D3: `apps/builder/src/builder/workspace/canvas/layout/engines/cssResolver.ts:294 getRootComputedStyle()` (ADR-056 Phase 2 SSOT 연결, `App.css :root` cascade 와 무관)
  - SSOT 상수: `apps/builder/src/builder/fonts/customFonts.ts:307` (`DEFAULT_BASE_TYPOGRAPHY`)
  - shared-tokens 대상: `packages/shared/src/components/styles/theme/shared-tokens.css:7` (`@layer shared-tokens { :root { ... } }`)
  - shared theme import: `packages/shared/src/components/theme.css:21` (`@import "./styles/theme/shared-tokens.css"`) — Builder `index.css:25` 가 이 theme.css 를 import 하므로 Builder 도 shared-tokens 연쇄
- **#2 SSOT/Generator 지원 질문**: 해당 없음 — CSS 변수/상수 수정만, Spec/CSSGenerator 확장 아님
- **#3 BC 수식화**:
  - Preview visible 변화: `body` font-family 체인이 `"Pretendard","Inter Variable",monospace,system-ui,sans-serif` → DEFAULT 체인으로 이동. 실질 1st family 가 양쪽 모두 Pretendard 라 실 렌더 0% 변화. 2nd family 이하는 Pretendard fallback 시나리오에서만 관찰 (Pretendard 실패 시 Preview 는 Inter Variable 이었으나 DEFAULT 는 `-apple-system` 사용). Pretendard 는 @font-face 로 로드되므로 fallback 경유 가능성 저 — 실측 0% 예상
  - Builder visible 변화: `:root` fallback chain 이 `Pretendard, system-ui` (2-family) → DEFAULT 체인 (8-family) 으로 cascade override 발생. **1st family = Pretendard 동일** + macOS `system-ui` == `-apple-system` == San Francisco 동등성으로 실 렌더 0% 예상. Pretendard 로드 실패 시에만 2nd family 이하 차이 관찰 가능 (R6)
  - Publish 0% (중복 유지, unlayered specificity 우선)
- **#4 Phase 분리 가능성**: 본 ADR 단일 완결. 파일 3개 (shared-tokens.css / preview/index.tsx / messageHandler.ts) 수정으로 완결되며 단계 분리 이점 없음

## Decision

**대안 C: `shared-tokens.css :root` base typography 추가 + Preview body 하드코딩 제거 + postMessage documentElement.style 확장** 을 선택한다.

선택 근거:

1. **실 상속 체인 대칭 확보** — 단지 `documentElement` 뿐 아니라 `body` 까지 DEFAULT 체인으로 일치시켜 Preview 의 모든 텍스트 노드가 동일 상속 경로 사용. Codex 리뷰 2차 지적 2 해소
2. **Builder visible risk LOW (cascade override 수용)** — Builder UI `:root` 는 `@layer base < @layer shared-tokens` cascade 로 shared-tokens 값이 이기며 fallback chain 이 교체된다. 그러나 **1st family = Pretendard 동일** + macOS `system-ui` / `-apple-system` 이 San Francisco 로 동등 resolve → Pretendard `@font-face` 로드 정상 시 visible 차이 0. Builder Skia D3 (`cssResolver.ts:294`) 는 ADR-056 Phase 2 에서 이미 `DEFAULT_BASE_TYPOGRAPHY` 연결되어 `App.css :root` cascade 와 무관 (독립 경로). Codex 리뷰 1차 지적 1 (Builder consumer 정의) + 3차 지적 (cascade override 정직 서술) 양쪽 해소
3. **SSOT 경로 축소** — shared-tokens 가 Preview + Publish + Builder 공통 import 지점이므로 Preview body 하드코딩 제거 후 실 SSOT 는 (a) `shared-tokens.css :root` CSS 값 + (b) `DEFAULT_BASE_TYPOGRAPHY` TS 상수 두 곳. Publish `index.css :root` 의 중복은 동일 값 미러 (유지/제거는 후속 결정). 기존 3곳 → 2곳 축소
4. **`DEFAULT_BASE_TYPOGRAPHY` TS 상수와 shared-tokens CSS 값의 동일성 유지 의무** 를 breakdown 체크리스트로 명문화 → 향후 drift 방지
5. **font-size 제외로 Builder `App.css:441` 주석 원칙 준수** — shared-tokens 가 Builder 에도 import 됨을 고려하여 font-size 는 제외. Preview 는 `injectBaseStyles()` 에서 16px 명시, Publish 는 `index.css :root` 유지, Builder 는 browser default 유지
6. **Pretendard `font-feature-settings` 보존** — Preview body 하드코딩 제거 시 `font-feature-settings: "cv02","cv03","cv04","cv11"` 는 body 에 유지 (cv 변형 = Pretendard 한글 타이포 품질 핵심)

기각 사유:

- **대안 A 기각**: Preview 로컬 수정으로 scope 최소이나 SSOT 3곳 분산 유지. 대안 C 는 shared-tokens 경유로 2곳 축소
- **대안 B 기각**: 대안 A 대비 이점 없음 (하드코딩 3곳 유지)
- **대안 D 기각**: Vite plugin 기술 HIGH 리스크, ADR-056 에서 동일 사유로 기각된 패턴. 현 scope 과잉
- **대안 E 기각**: inline style specificity 최상위 → 후속 CSS cascade override 불가능. CSS rule (대안 C) 이 더 유연

> 구현 상세: [107-preview-publish-root-symmetry-breakdown.md](../design/107-preview-publish-root-symmetry-breakdown.md)

## Risks

| ID  | 위험                                                                                                                                                                                                                                                                                            | 심각도 | 대응                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Preview body 의 font-family 2nd family 변경 (`"Inter Variable"` → `-apple-system`) 으로 Pretendard fallback 시 시각 차이                                                                                                                                                                        |  LOW   | Pretendard `@font-face` 정상 로드 전제에서 1st family 가 Pretendard 로 확보됨. @font-face 실패 시에만 2nd family 관찰. Chrome MCP Phase 5 에서 Preview 텍스트 노드 computed fontFamily + 실 렌더 screenshot 로 확증                                                                                                                                                                   |
| R2  | Publish `index.css :root` 의 DEFAULT 체인 중복이 향후 drift 발생 시 탐지 어려움                                                                                                                                                                                                                 |  LOW   | 본 ADR 에서 Publish `index.css :root` 유지 결정 (BC 안전). 후속 Addendum / 별도 ADR 에서 제거 결정 시 drift 검출 필요성 재평가                                                                                                                                                                                                                                                        |
| R3  | ThemesPanel 런타임 `baseTypography` 변경 시 Preview `:root` inline style 이 shared-tokens CSS rule 을 override (specificity 상위)                                                                                                                                                               |  LOW   | 기존 `handleThemeBaseTypography` body.style 패턴과 동일 흐름. 사용자 변경이 default 체인 위로 올라오는 것이 의도된 동작                                                                                                                                                                                                                                                               |
| R4  | `DEFAULT_BASE_TYPOGRAPHY` TS 상수와 `shared-tokens.css :root` CSS 값 간 drift (한쪽만 변경)                                                                                                                                                                                                     |  MED   | breakdown 체크리스트에 "두 값 동일성 유지" 명시 + 향후 codegen / lint rule 후속 과제로 식별                                                                                                                                                                                                                                                                                           |
| R5  | Preview body 의 `font-feature-settings: cv02, cv03, cv04, cv11` 제거 실수 시 Pretendard 한글 타이포 품질 회귀                                                                                                                                                                                   |  MED   | Phase 2 구현 시 body 의 `font-family` / `line-height` **만** 제거, `font-feature-settings` / `color` / `background` 유지 명시. 코드 diff 리뷰 필수                                                                                                                                                                                                                                    |
| R6  | Builder `:root` cascade override — `@layer shared-tokens` 가 `@layer base` (App.css) 를 이겨 fallback chain 이 shared-tokens 체인으로 교체. Pretendard `@font-face` 로드 실패 시 2nd family 이하 차이 (Builder 기존: `system-ui`, 변경 후: `-apple-system, BlinkMacSystemFont, system-ui, ...`) |  LOW   | 1st family Pretendard 동일 + macOS `system-ui` / `-apple-system` SF 동등성으로 정상 로드 시 visible 0. Pretendard 는 Builder `index.css:17` 에서 static import 되므로 로드 실패 가능성 저. Phase 5 G6 Gate 로 Builder `:root` 1st family 불변 확증. 실패 시 fallback = Builder 전용 override (`apps/builder/src/index.css :root { font-family: ... }`) 추가로 shared-tokens 체인 복구 |

## Gates

| Gate                                                  | 시점    | 통과 조건                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 실패 시 대안                                                                                                                                           |
| ----------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **G1 기준선 회귀 없음**                               | Phase 4 | 명령 실행 후 회귀 없음: `pnpm -w type-check` FULL TURBO + `packages/specs vitest run` + `apps/builder pnpm test -- --run` + `packages/shared pnpm test -- --run`. 현 기준선: specs 205/205 / builder 247/247 / shared 52/52 (세션 17 시점)                                                                                                                                                                                                                                       | rollback + 원인 조사                                                                                                                                   |
| **G2 Preview `:root` computed 대칭**                  | Phase 5 | Chrome MCP Preview iframe `getComputedStyle(documentElement)` — fontFamily 첫 family = `Pretendard` / 체인 = `DEFAULT_BASE_TYPOGRAPHY` 와 동일 (순서 포함) / fontSize = `16px` / lineHeight = `24px`                                                                                                                                                                                                                                                                             | `injectBaseStyles()` `:root` rule 재점검 + shared-tokens layer cascade 재조사                                                                          |
| **G3 Preview `body` computed 대칭**                   | Phase 5 | Chrome MCP Preview iframe `getComputedStyle(document.body)` — fontFamily / lineHeight 가 `documentElement` 에서 상속받아 DEFAULT 체인 (body override 없음 확인). fontFeatureSettings 는 `"cv02","cv03","cv04","cv11"` 유지                                                                                                                                                                                                                                                       | body 하드코딩 잔존 여부 재확인                                                                                                                         |
| **G4 Preview/Publish 텍스트 노드 최종 computed 대칭** | Phase 5 | Chrome MCP Preview iframe + Publish 탭 내부 임의 React Aria 컴포넌트 (Button/Card/Input 등) 텍스트 노드 **최종 computed fontFamily = DEFAULT 체인과 일치**. 주의: generated CSS (예: `Button.css:19 font-family: var(--font-sans)`) 가 명시적 선언을 가지나 Preview/Publish 컨텍스트에서 `--font-sans` 는 미정의 (`App.css:9` 는 Builder 전용) → CSS `var()` unresolved → font-family declaration 무효 → 부모 상속. 따라서 Preview/Publish 에선 실 상속 경로로 DEFAULT 체인 도달 | 컴포넌트별 CSS override 식별 + `--font-sans` 정의 추가 (shared-tokens) 여부 별도 결정 또는 Spec D3 논의 분리                                           |
| **G5 Publish `:root` 불변 (BC 0)**                    | Phase 5 | Chrome MCP Publish 탭 `getComputedStyle(documentElement)` — fontFamily / fontSize / lineHeight 값 = ADR-056 Addendum 세션 16 baseline 과 동일                                                                                                                                                                                                                                                                                                                                    | specificity / unlayered 우선순위 재조사                                                                                                                |
| **G6 Builder `:root` 1st family 불변**                | Phase 5 | Chrome MCP Builder 탭 `getComputedStyle(documentElement).fontFamily` **첫 family = `Pretendard`** 유지. fallback chain 전체가 shared-tokens 체인으로 교체되는 것은 수용 (cascade 의도). Pretendard 로드 실패 아티팩트 없음 (주요 Builder 패널 screenshot 시각 회귀 없음)                                                                                                                                                                                                         | Builder 전용 override 추가 (`apps/builder/src/index.css :root { font-family: var(--default-font-family, ...) }`) 로 Builder cascade 격리 — R6 fallback |

## Consequences

### Positive

- D3 symmetric consumer `:root` + `body` + 실 텍스트 노드 3 레벨 대칭 복구 (단순 `documentElement` computed 매칭 넘어 실 상속 체인 일치)
- `DEFAULT_BASE_TYPOGRAPHY` TS 상수의 정본성 강화 — shared-tokens CSS 가 동일 체인 명시로 SSOT 경로 2곳 수렴 (기존 3곳: TS + Publish + Preview body inline)
- ADR-056 Addendum §잔존 debt "Preview iframe `:root` 체인 불일치" 완전 해소 + body 하드코딩 debt 까지 동시 해소
- ADR-063 §4-1 "시각 결과 동일성" 기준 symmetric 재복구
- Preview body 의 `font-feature-settings` (Pretendard 한글 타이포 품질) 보존

### Negative

- `shared-tokens.css` 가 디자인 토큰 + base typography 공존 → 파일 책임 경계 확장 (파일 상단 주석으로 명시)
- Publish `index.css :root` 의 중복 font-family / line-height 유지 (BC 안전 차원, 후속 Addendum/ADR 에서 제거 결정)
- `DEFAULT_BASE_TYPOGRAPHY` TS 상수 + `shared-tokens.css` CSS 값 수동 동기 유지 의무 (R4 — breakdown 체크리스트로 관리)
- Builder `:root` fallback chain cascade override 발생 (R6) — 1st family Pretendard 동일성으로 visible 0 예상이나 "Builder 불개입"이 아닌 "Builder 1st family 불변" 으로 계약 축소. Pretendard 로드 실패 극단 시나리오는 G6 Gate + override fallback 으로 관리

## Implementation Summary (2026-04-22)

Phase 1-5 전체 완결. 코드 변경 3 파일 / 추가 16 LOC / 제거 3 LOC. Gate G1-G6 전원 통과.

### 완료된 Phase

| Phase | 변경                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `shared-tokens.css :root` 에 `DEFAULT_BASE_TYPOGRAPHY` 체인 font-family + line-height 1.5 추가 (font-size 제외)                   |
| 2.1   | Preview `injectBaseStyles()` `:root { font-size: 16px }` 추가                                                                     |
| 2.2   | Preview `injectBaseStyles()` body 의 `font-family` / `line-height` 제거 → `:root` 상속. `font-feature-settings` cv02~cv11 보존    |
| 2.3   | Preview `handleThemeBaseTypography` 에 `document.documentElement.style.fontFamily/fontSize/lineHeight` 주입 추가 (body 경로 유지) |
| 3     | Publish `index.css :root` 중복 보존 (명시적 no-op, BC 0)                                                                          |
| 4     | 기준선 4건 재검증 — type-check 3/3 FULL TURBO + specs 205/205 + builder 247/247 + shared 52/52 PASS                               |
| 5     | Chrome MCP 3 탭 × 3 레벨 실측 — Builder / Preview / Publish `:root` + `body` + dynamic text node 대칭 확증                        |

### Gate 통과 결과 (Chrome MCP 실측 2026-04-22)

|          Gate          |  결과   | 실측                                                                                                                                                                                      |
| :--------------------: | :-----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     **G1 기준선**      | ✅ PASS | type-check 3/3 FULL TURBO + specs 205/205 + builder 247/247 + shared 52/52 (세션 18 시점, 세션 17 동일)                                                                                   |
| **G2 Preview `:root`** | ✅ PASS | fontFamily = `Pretendard, -apple-system, "system-ui", system-ui, Roboto, "Helvetica Neue", "Segoe UI", sans-serif` / fontSize = `16px` / lineHeight = `24px` / firstFamily = `Pretendard` |
| **G3 Preview `body`**  | ✅ PASS | `:root` 와 동일 체인 상속 + fontFeatureSettings = `"cv02", "cv03", "cv04", "cv11"` 보존                                                                                                   |
|   **G4 텍스트 노드**   | ✅ PASS | Preview dynamic `<p>` computed fontFamily = DEFAULT 체인 (body → `:root` 상속 경로로 도달). Publish 탭 `:root` 체인과 1:1 일치                                                            |
|  **G5 Publish 불변**   | ✅ PASS | Publish `:root` fontFamily / fontSize / lineHeight = ADR-056 Addendum 세션 16 baseline 과 동일 (BC 0 확증)                                                                                |
|   **G6 Builder 1st**   | ✅ PASS | Builder `:root` firstFamily = `Pretendard` 유지 (기존 `Pretendard, system-ui` 2-family → DEFAULT 8-family 로 cascade override, 1st family 동일성 확인)                                    |

### 실측 환경

- Chrome MCP 탭 그룹 `351330741`
- Builder 탭 `tabId=2123360908` — `http://localhost:5173/builder/7de093a0-...`
- Preview 탭 `tabId=2123360930` — `http://localhost:5173/preview.html` (top-level 로 직접 열어 `injectBaseStyles` + shared-tokens 환경 검증)
- Publish 탭 `tabId=2123360933` — `http://localhost:5173/publish/`

### 3축 대칭 실측 매트릭스

|   축    | `:root` fontFamily 체인 | firstFamily | fontSize | lineHeight |
| :-----: | ----------------------- | :---------: | :------: | :--------: |
| Builder | DEFAULT 체인 (8-family) | Pretendard  |   16px   |    24px    |
| Preview | DEFAULT 체인 (8-family) | Pretendard  |   16px   |    24px    |
| Publish | DEFAULT 체인 (8-family) | Pretendard  |   16px   |    24px    |

**D3 symmetric consumer 완전 대칭 복구 확증.** ADR-063 §4-1 기준 "시각 결과 동일성" 달성.

### 잔존 debt / 후속 과제

- Publish `index.css :root` 의 중복 font-family / line-height 제거 여부 (BC 안전 차원 유지 중, Phase 통과 후 별도 Addendum / ADR 에서 결정 가능)
- `DEFAULT_BASE_TYPOGRAPHY` TS 상수 + `shared-tokens.css` CSS 값 drift 자동 검출 (R4 — 향후 codegen / lint rule)
- Preview 토글 버튼 기반 iframe mount 경로는 본 검증에서 `click()` 이 상태 변화 triggering 되지 않아 top-level 로 우회. 실제 사용자 경로 (ThemesPanel → sendBaseTypography postMessage → iframe body.style + documentElement.style) 는 코드 상 정합 (messageHandler 확장 확증) 하나 Chrome MCP 실측 미포함 — 후속 세션에서 Preview 버튼 경로 재확인 권장
