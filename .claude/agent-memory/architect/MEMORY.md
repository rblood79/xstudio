# Architect Memory

## ADR 작성 시 참조

- Risk-First 템플릿 (Step 1~6): docs/adr/README.md
- 완료 ADR 목록: docs/adr/completed/
- 성능 기준: Canvas 60fps, 초기 로드 <3초, 번들 <500KB
- Builder ↔ Preview iframe 격리 필수 (postMessage Delta 동기화)

## 아키텍처 제약

- Dual Renderer: CanvasKit/Skia(화면) + PixiJS(이벤트) — 둘 다 동기화 필수
- 단일 Taffy WASM 레이아웃 엔진 (Flex/Grid/Block)
- 상태 파이프라인 6단계 순서 필수 보존

## CSSGenerator 지원 범위 (2026-04-21 확정)

- 지원: root selector / [data-variant][data-size] / [data-state] / composition.staticSelectors / composition.sizeSelectors / composition.rootSelectors / childSpecs inline embed (ADR-078)
- 미지원: 전역 공유 RAC 내부 selector (.react-aria-ColorThumb 등) / pseudo-element (::after/::before) / orientation 분기 선언형 / conic gradient CSS
- 판정 근거: CSSGenerator.ts:146 skipCSSGeneration 차단 + generateStaticSelectorRules 범위 확인

## Color Family skipCSSGeneration 판정 (ADR-106-a, 2026-04-21)

- ColorPicker / ColorSlider / ColorSwatchPicker / ColorWheel — G3 → G2 재판정
- 수동 CSS가 spec token 파생 (var(--bg-raised), var(--radius-md), var(--focus-ring) 등)
- CSSGenerator가 RAC Color 내부 구조체 selector emit 불가 → 수동 CSS 유지 구조적 정당
- Skia render.shapes는 이미 spec token 참조 → D3 대칭 consumer 준수 상태
- 잔존 debt: ColorPicker --cp-btn-width/height (spec 외부 독자 수치), ColorSlider/Wheel gray disabled (하드코딩)
- ADR-059 Tier 3 예외 목록에 4건 추가 필요 (Phase 1)

## TagGroup skipCSSGeneration 판정 (ADR-106-b, 2026-04-21)

- TagGroup.css 307줄 전체가 spec token 파생 — 독자 수치 0개 (ADR-106-a ColorPicker 보다 더 완전한 G2)
- `.react-aria-Tag`, `.react-aria-TagList`, `[data-tag-size] .react-aria-Tag` 2단계 parent-child → CSSGenerator emit 불가
- Button.css ↔ TagGroup.css size variants (xs~xl padding/fontSize/lineHeight) 1:1 완전 동일 — 의도된 설계
- ButtonSpec.sizes ↔ TagSpec.sizes paddingX/paddingY/fontSize 동일 (borderRadius xl만 1개 차이: Button=radius-xl, Tag=radius-lg)
- @sync 해소 4건: TagGroup.css:148,150 (F4) + Tag.spec.ts:57,65 (F2) → 설명 주석 교체
- ADR-059 Tier 3 표 TagGroup 행 근거 ADR: — → ADR-106-b 갱신 필요

## F2 spec-to-CSS @sync 판정 (ADR-105-c, 2026-04-21)

- **완전 해소**: Tag.spec.ts:57,65 — ADR-106-b grep 0건 재확증
- **자연 해소 (단순 주석 교체)**: SelectValue.spec.ts:47 — Select.spec sizeSelectors+staticSelectors가 per-size font-size를 CSSGenerator로 emit 중 (Select.spec.ts:501-567). ListBox.spec.ts:218,238 — containerStyles.background={color.raised}(line 88) + padding={spacing.xs}(line 93) 이미 Spec 선언 (ADR-076/079 완결)
- **실질 작업 (P2-a)**: GridListItem.spec.ts:107 — 삼자 불일치: Spec={radius.sm}=4px / resolver=8px(하드코딩) / CSS=--radius-md=6px. 결정: resolver 사용값 8px={radius.lg}로 통일. Spec+CSS 수정 필요.
- **실질 작업 (P2-b)**: ListBoxItem.spec.ts:132 — sizes.md.lineHeight={typography.text-sm--line-height} TokenRef 선언됨(line 77) but resolver가 fontSize 하드코딩 분기 사용. @sync 제거 + 설명 주석 교체로 현황 문서화 (완전 Spec 소비는 sizes 다중 lineHeight 선언이 필요 → 105-d 이관).
- radius 토큰 값: radius.sm=4px / radius.md=6px / radius.lg=8px / radius.xl=12px (primitives/radius.ts)
- ADR 파일: docs/adr/105-c-sync-spec-to-css-resolution.md / breakdown: docs/design/105-c-sync-spec-to-css-resolution-breakdown.md

## G4 잔존 3건 최종 분류 확정 (ADR-106-d, 2026-04-21)

- **Tag**: ADR-106-b에서 @sync 2건 해소 완료 확증 (grep 0건) → G2 확정. G4 제외.
- **SearchField**: `skipCSSGeneration: false` (line 89) 재확인 → G4 공식 제외. Charter 총계 27→26 조정.
- **Field**: `skipCSSGeneration: true` (line 27) + `render.shapes = () => []`. Field.css는 FieldSpec 파생물 아님 — `.react-aria-FieldGroup`/`.react-aria-DataField` selector는 FieldSpec emit 대상 `.react-aria-Field`와 다른 scope. index.css 주석 "/_ 구조 유틸리티 — Spec 없음 _/" 이 이를 명시. → G2 정당.
- **G4 완전 청산**: 3건 모두 분류 확정. ADR-106 Charter sub-ADR 4슬롯(106-a~d) 전부 완결.
- 잔존 debt: Field.css `.value-image` 40px (spec.sizes 미선언) — non-blocking LOW.
- ADR-059 Tier 3 예외 목록에 Tag + Field 추가 필요 (Charter Addendum 3 시 main session)
