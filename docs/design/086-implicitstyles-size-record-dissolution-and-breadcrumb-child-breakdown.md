# ADR-086 Breakdown — implicitStyles size Record 해체 + Breadcrumb child layout SSOT 복귀

> ADR: [086-implicitstyles-size-record-dissolution-and-breadcrumb-child.md](../adr/086-implicitstyles-size-record-dissolution-and-breadcrumb-child.md)

## Phase 구성

| Phase  | 내용                                                                                                    | 소요 | Gate     |
| :----: | ------------------------------------------------------------------------------------------------------- | :--: | -------- |
| **P1** | spec.sizes 누락 필드 감사 및 보강 (Calendar padding/gap / SelectTrigger height 등)                      | 0.5h | G1/G2    |
| **P2** | `SPEC_INPUT_FONT_SIZE`/`SPEC_TRIGGER_HEIGHT`/`calPadGap` Record 를 `spec.sizes` lookup 으로 전환        | 0.8h | G1/G2    |
| **P3** | `spec.render.shapes` signature 에 optional `ctx?: { measureText }` 확장 + type 정의 + 기존 spec BC 확인 | 0.5h | G1       |
| **P4** | `Breadcrumb.spec.ts` `render.shapes` 에 itemWidth/height 계산 이관 (measureText 사용)                   | 0.8h | G1/G3    |
| **P5** | `implicitStyles.ts:955-971` Breadcrumb child 주입 제거 + parent `children` 순회만 유지                  | 0.4h | G1/G3/G4 |
| **P6** | Chrome MCP 실측 + ADR Status Implemented                                                                | 0.6h | G3       |

- P2 FAIL (R2 spec.sizes 누락) → P1 보강 재시도
- P5 FAIL (R3 child render 경로 회귀) → P5 revert, Phase 4 까지 land + 대안 B (후속 ADR) 전환

총 예상: 3.6h — 2 세션 분할 권장 (세션 A: P1+P2+검증 / 세션 B: P3+P4+P5+P6)

## 파일 변경표

| 파일                                                                         | Phase | 변경                                                                                                                                        |
| ---------------------------------------------------------------------------- | :---: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/specs/src/components/SelectTrigger.spec.ts`                        |  P1   | `sizes.xs/sm/md/lg/xl.height` 확인 및 누락 보강 (현재 SPEC_TRIGGER_HEIGHT 기준)                                                             |
| `packages/specs/src/components/Calendar.spec.ts`                             |  P1   | `sizes.sm/md/lg.paddingX/paddingY/gap` 확인 (현재 calPadGap 기준 4/8/12, 4/6/8)                                                             |
| `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` |  P2   | `SPEC_INPUT_FONT_SIZE` / `SPEC_TRIGGER_HEIGHT` / `calPadGap` 상수 제거 + 소비 분기에서 `TAG_SPEC_MAP[tag].sizes[sizeName]` lookup 사용      |
| `packages/specs/src/types/spec.types.ts`                                     |  P3   | `ComponentSpec.render.shapes` signature 에 optional `ctx?: SpecRenderContext` 추가. `SpecRenderContext = { measureText?: (...) => number }` |
| `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`          |  P3   | `measureTextWidth` 을 `SpecRenderContext.measureText` 로 wrap 가능한 구조 확인                                                              |
| `packages/specs/src/components/Breadcrumb.spec.ts`                           |  P4   | `render.shapes` 에서 `ctx.measureText` 호출로 itemWidth 계산. parent props 소비 (`label`, `size`, `isLast`)                                 |
| `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` |  P5   | `:955-971` Breadcrumb child 주입 삭제 (width/minWidth/height/minHeight/display/flexDirection/alignItems/flexShrink/flexGrow)                |

## 체크리스트

### Phase 1 — spec.sizes 감사 및 보강

- [ ] SelectTrigger.sizes.xs/sm/md/lg/xl.height = SPEC_TRIGGER_HEIGHT 와 동일 값 확인
- [ ] Calendar.sizes.sm/md/lg.paddingX/paddingY/gap = calPadGap 와 동일 값 확인
- [ ] ComboBoxWrapper/기타 SPEC_INPUT_FONT_SIZE 소비처 spec.sizes.fontSize TokenRef resolved 값 일치 확인
- [ ] 누락 발견 시 spec.sizes 에 추가 (type 변경 없음)

### Phase 2 — Record 해체 (G2 spec.sizes pixel-perfect)

- [ ] `SPEC_INPUT_FONT_SIZE` 소비처 → `spec.sizes[size].fontSize` resolveSpecFontSize 경유 lookup
- [ ] `SPEC_TRIGGER_HEIGHT` 소비처 (`:1273-1275` SelectTrigger height fallback) → `SelectTriggerSpec.sizes[sizeName]?.height`
- [ ] `calPadGap` 소비처 (`:1859` Calendar) → `CalendarSpec.sizes[calSize]?.{ paddingX, paddingY, gap }`
- [ ] Record 상수 3 개 제거 (`:175-180`, `:184-189`, `:212-216`)
- [ ] `pnpm -w type-check` + `builder` 217/217 + `specs` 166/166 PASS

### Phase 3 — spec.render signature 확장

- [ ] `SpecRenderContext` type 정의 (spec.types.ts)
- [ ] `ComponentSpec.render.shapes` 3번째 optional param 추가 `(props, size, state, ctx?)`
- [ ] 62 spec render 함수 BC 확인 — ctx 미사용, type-check PASS
- [ ] nodeRenderers.ts 등 호출부에서 ctx 주입

### Phase 4 — Breadcrumb.spec render 이관

- [ ] Breadcrumb.spec.ts render.shapes 에서 `ctx.measureText(label, fontSize, fontFamily, fontWeight)` 호출
- [ ] itemWidth = Math.ceil(textW + sepExtra) 계산 유지 (로직 동일, 위치만 spec.render 로 이동)
- [ ] Breadcrumb spec 이 `size`, `isLast`, `separator`, `separatorPadding` 같은 props 를 받도록 interface 확장

### Phase 5 — implicitStyles child 주입 제거 (G3)

- [ ] `:955-971` child Breadcrumb style 주입 제거
- [ ] Breadcrumbs parent 분기는 sorted 순회 + layout trigger 만 담당 (effectiveParent 유지)
- [ ] Breadcrumb child 의 spec.render 결과가 ElementSprite layout 파이프라인에 정상 전달됨을 확인
- [ ] child 주입 제거 후에도 Breadcrumbs 전체 레이아웃 재현 확인

### Phase 6 — 실측 + Status

- [ ] Chrome MCP Calendar sm/md/lg 3 size padding/gap 시각 동일 (G2)
- [ ] Chrome MCP SelectTrigger xs/sm/md/lg/xl 5 size height 시각 동일
- [ ] Chrome MCP Breadcrumbs 3 size × 3 label 변이 (short "Home" / medium "Dashboard" / long "Administrator Settings") 9 샘플 시각 정상 (G3)
- [ ] ADR Status Proposed → Implemented

## 커밋 계획

| 순서 | 커밋                                                                    | Phase |
| :--: | ----------------------------------------------------------------------- | :---: |
|  1   | `chore(adr-086): P1 spec.sizes 감사 + 누락 필드 보강`                   |  P1   |
|  2   | `feat(adr-086): P2 implicitStyles size Record → spec.sizes lookup 전환` |  P2   |
|  3   | `feat(adr-086): P3 spec.render SpecRenderContext 확장 (optional)`       |  P3   |
|  4   | `feat(adr-086): P4 Breadcrumb.spec render.shapes 에 itemWidth 이관`     |  P4   |
|  5   | `feat(adr-086): P5 implicitStyles Breadcrumb child 주입 제거`           |  P5   |
|  6   | `docs(adr-086): Status Proposed → Implemented`                          |  P6   |

## 롤백 전략

- **Phase 2 FAIL** (G2 pixel-perfect 실패) → Phase 2 커밋 revert. Phase 1 spec.sizes 보강은 유지 (BC 안전 개선)
- **Phase 4/5 FAIL** (G3 시각 변화) → Phase 5 revert → 분기 유지 + Phase 4 Breadcrumb.spec 은 유지 가능 (ctx 미소비시 무해)
- **대안 B 전환** — Phase 3~5 전체 revert + 본 ADR Status Partial-Implemented + 후속 ADR (Breadcrumb child 단독)

## 후속 ADR 후보

- `measureText` hook 확장 consumer: Tabs label 폭 / Select max option width / Menu 가로 정렬
- size-based 로직의 다른 consumer (Card/Section) SSOT 복귀
