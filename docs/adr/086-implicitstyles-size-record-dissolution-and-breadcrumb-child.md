# ADR-086: implicitStyles size Record 해체 + Breadcrumb child layout SSOT 복귀

## Status

Proposed — 2026-04-20 (**Revision 2** — Codex Round 3 HIGH 086-C1 반영: (a) `PROGRESSBAR_FONT_SIZE` 실제는 `sm/md/lg/xl` **4 size** (claude Rev 1 "2 size" 오류). (b) 소비처 inventory 확장 — `DateField/TimeField` (`:1445-1448`), `SearchFieldWrapper` (`:1497-1539`) 가 `SPEC_TRIGGER_HEIGHT` / `SPEC_INPUT_FONT_SIZE` 를 직접 소비. (c) G2/G4 검증 범위 확장 → ADR-086 ↔ ADR-087 경계 누수 차단. Revision 1 = claude self-review 반영: PROGRESSBAR_FONT_SIZE 재편입 + G2 단일화 + line drift 정정.)

## Context

### D3 domain 판정 (ADR-063 SSOT 체인)

본 ADR 은 [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md) **D3 (시각 스타일) symmetric consumer 의 대칭 복구**. ADR-084 scope 외로 분리된 "size-based padding/gap" 과 "Breadcrumb child 주입" 2 주제를 통합 해체. 공통 기반 = "implicitStyles 분기 내 size-indexed 로직의 Spec SSOT 복귀".

### 현재 비대칭 구조

**축 1 — 하드코딩 size Record**:

`implicitStyles.ts` 파일-스코프 + 분기 내 Record 상수가 `spec.sizes` SSOT 를 **우회**:

| Record                                                                      | 위치         | 내용                                                | SSOT 상응 필드                    |
| --------------------------------------------------------------------------- | ------------ | --------------------------------------------------- | --------------------------------- |
| `SPEC_INPUT_FONT_SIZE`                                                      | `:175-180`   | 5 size × fontSize                                   | `spec.sizes[size].fontSize`       |
| `SPEC_TRIGGER_HEIGHT`                                                       | `:184-189`   | 5 size × height                                     | `spec.sizes[size].height`         |
| `PROGRESSBAR_FONT_SIZE`                                                     | `:211-217`   | **4 size** (sm/md/lg/xl) × fontSize                 | `spec.sizes[size].fontSize`       |
| `SIZE_LINE_HEIGHT`                                                          | `:220-225`   | 4 size × lineHeight (ProgressBar/Meter/Slider 공통) | `spec.sizes[size].lineHeight`     |
| `calPadGap`                                                                 | `:1854-1858` | 3 size × { pad, gap }                               | `spec.sizes[size].paddingX/Y/gap` |
| Breadcrumb `breadcrumbsHeight` via `BreadcrumbsSpec.sizes[rspSize]?.height` | `:920`       | spec 직접 lookup 중 (정상)                          | —                                 |

`spec.sizes` (`spec.types.ts:739+` `export interface SizeSpec`) 이 이미 `paddingX/paddingY/height/fontSize/borderRadius/iconSize/gap` 필드 보유 → **SSOT 존재하나 일부 분기가 소비 안 함** (Breadcrumbs 분기는 이미 소비).

**축 2 — Breadcrumb child 주입 (spec.render 파이프라인 외부)**:

`implicitStyles.ts:955-971` 이 Breadcrumb child 당 다음을 주입:

- `width`/`minWidth`: `itemWidth = Math.ceil(textW + sepExtra)` — `measureTextWidth(label, fontSize, ffamily, fontWeight)` runtime 호출
- `height`/`minHeight`: `breadcrumbsHeight` (spec.sizes lookup)
- `flexShrink: 0`, `flexGrow: 0`, `display/flexDirection/alignItems`

이 로직이 `Breadcrumb.spec.ts` 의 `render.shapes` 파이프라인 **외부** 에서 실행 → spec SSOT 역행. `spec.render` 가 text measure hook 없이는 label 문자열 기반 width 계산 불가.

### Hard Constraints

1. `spec.sizes` 기존 필드 (paddingX/paddingY/gap/fontSize/height/lineHeight) 타입 변경 금지 — BC 유지
2. 시각 pixel-perfect 동일 유지 (Revision 2 확장):
   - Calendar 3 size / SelectTrigger 5 size / Breadcrumbs 3 size
   - **ProgressBar/Meter 4 size / DateField / TimeField / SearchFieldWrapper** (소비처 inventory 확장)
3. Breadcrumb child width/height 계산은 label 길이 변이를 반영해야 함 (고정값 불가)
4. spec.render signature 확장 시 optional param — 기존 62 spec render 함수 시그니처 변경 없음

### Soft Constraints

- Phase 1 (Record 해체) 와 Phase 2 (Breadcrumb child hook) 는 독립 세션으로 land 가능
- measureText hook 재사용 여지: Tabs label 폭 / Select max option width 등 후속 consumer

### 감사 결과 (Revision 2 — Codex 086-C1 반영)

`implicitStyles.ts` 분기 중 size-indexed 값을 직접 처리하는 부분:

- Calendar (`:1859`) — `calPadGap` Record
- SelectTrigger (`:1273-1275`) — `SPEC_TRIGGER_HEIGHT` fallback
- ComboBoxWrapper (`:1333-`) — `SPEC_INPUT_FONT_SIZE` 소비
- ProgressBar/Meter (`:1569-1653`) — `PROGRESSBAR_FONT_SIZE` + `SIZE_LINE_HEIGHT` 소비 (`PROGRESSBAR_TAGS` Set: `progressbar`/`progress`/`loadingbar`/`meter`/`gauge`). **본 ADR Phase 1 scope** (Rev 1 재편입). ADR-085 는 grid-template Schema 확장 + parent containerStyles 이관 + Skia flex emul 해체만 담당하며, size-indexed Record 해체는 본 ADR 의 공통 주제에 귀속.
- **DateField / TimeField** (`:1445-1448`) — `SPEC_TRIGGER_HEIGHT` 직접 소비 (DateInput height 주입). **Revision 2 신규 scope 편입**.
- **SearchFieldWrapper** (`:1497-1539`) — `SPEC_TRIGGER_HEIGHT` (wrapper height) + `SPEC_INPUT_FONT_SIZE` (SearchInput fontSize) 동시 소비. **Revision 2 신규 scope 편입**.

총 대상 (Revision 2) = Calendar / SelectTrigger / ComboBoxWrapper / ProgressBar-Meter / DateField / TimeField / SearchFieldWrapper 분기 내 5 Record (SPEC_INPUT_FONT_SIZE / SPEC_TRIGGER_HEIGHT / PROGRESSBAR_FONT_SIZE / SIZE_LINE_HEIGHT / calPadGap) + Breadcrumb child 주입.

**ADR-086 ↔ ADR-087 경계 정합**: Revision 2 inventory 가 ADR-087 SP3 (Field wrapper) 의 "input height 는 이미 ADR-086 에서 해체" 전제를 충족 — DateField/TimeField/SearchFieldWrapper 가 본 ADR 에서 처리되므로 SP3 는 layout-primitive (label positioning / flex-direction) 만 남김.

## Alternatives Considered

### 대안 A: Phase 1 (Record 해체) + Phase 2 (Breadcrumb child hook) 통합 ADR

- 설명:
  - **Phase 1**: `SPEC_INPUT_FONT_SIZE`/`SPEC_TRIGGER_HEIGHT`/`calPadGap` Record 를 `TAG_SPEC_MAP[tag].sizes[sizeName]` lookup 으로 전환. spec.sizes 미선언 size 는 build-time TypeScript exhaustiveness 로 감지
  - **Phase 2**: `spec.render.shapes` signature 에 optional `ctx?: { measureText: (s, fontSize, family, weight) => number }` 주입. Breadcrumb.spec 의 render 에서 itemWidth 계산. implicitStyles child 주입 제거, parent 에서만 children 순회 + child spec.render 결과 consume
- 위험:
  - 기술: MEDIUM — measureText hook interface 설계 (1 곳: spec.render signature 확장)
  - 성능: LOW — 기존 measureTextWidth 호출 경로만 바뀜
  - 유지보수: LOW — SSOT 복귀 2 축 동시
  - 마이그레이션: LOW — BC 유지

### 대안 B: Phase 1 만 (Record 해체) — Breadcrumb child 는 별도 ADR

- 설명: Record 해체는 mechanical 작업, BC 영향 0. Breadcrumb child 는 spec.render 파이프라인 확장 필요 → 분리
- 위험:
  - 기술: LOW
  - 성능: LOW
  - 유지보수: LOW
  - 마이그레이션: LOW

### 대안 C: spec.sizes 에 `childItemWidth/childItemHeight` 고정 필드 추가 (text measure 미사용)

- 설명: Breadcrumb child width 를 spec.sizes 에 fixed value 로 선언 (예: sm: 100, md: 120, lg: 140)
- 위험:
  - 기술: LOW
  - 성능: LOW
  - 유지보수: MEDIUM — label 길이 변이를 Spec 이 캡처 못함
  - 마이그레이션: **HIGH** — 시각 깨짐 (label overflow / truncation)

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| :--: | :--: | :--: | :------: | :----------: | :--------: |
|  A   |  M   |  L   |    L     |      L       |     0      |
|  B   |  L   |  L   |    L     |      L       |     0      |
|  C   |  L   |  L   |    M     |    **H**     |     1      |

- 대안 C 기각 (시각 깨짐 HIGH)
- 대안 A vs B: 권고안(②+③ 통합)과 정합 → A

## Decision

**대안 A: Phase 1 + Phase 2 통합 ADR** 을 선택.

선택 근거:

1. HIGH+ 0, 두 Phase 가 "implicitStyles size-indexed 로직 SSOT 복귀" 공통 주제
2. Phase 1 이 Phase 2 전제 (Breadcrumb child hook 도 spec.sizes lookup 필요)
3. measureText hook 이 범용 hook 로 설계되어 후속 consumer 재사용 가능

기각 사유:

- **대안 B 기각**: Phase 분리 시 추가 ADR 비용 (번호 할당, 리뷰 roundtrip) 이 통합 기술 MED 대비 높음. HIGH 없음 → 통합 가능
- **대안 C 기각**: label 변이 캡처 불가 → 시각 깨짐 HIGH. 수용 불가

> 구현 상세: [086-implicitstyles-size-record-dissolution-and-breadcrumb-child-breakdown.md](../design/086-implicitstyles-size-record-dissolution-and-breadcrumb-child-breakdown.md)

## Risks

| ID  | 위험                                                                                                                            | 심각도 | 대응                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | measureText hook interface 가 spec.render signature 확장 필요 → 62 spec render 함수 영향                                        |  MED   | Phase 2 에서 optional parameter 로 도입. 기존 spec 은 ctx 미사용 → BC 0. TypeScript union type 으로 점진 확장                                     |
| R2  | Phase 1 에서 Record → spec.sizes lookup 시 spec.sizes 미선언 size (예: SelectTrigger.sizes.xs.height 누락) 런타임 fallback 필요 |  MED   | 각 대상 spec.sizes 감사 후 누락 필드 추가. TypeScript `satisfies` 로 exhaustiveness 보장                                                          |
| R3  | Breadcrumb child spec.render 이관 시 기존 child element 가 `hasChildren` 플래그 조건부 렌더 경로 영향                           |  MED   | Breadcrumb.spec `render.shapes` 단독 실행. ElementSprite child 흐름은 Breadcrumbs parent 만 관여 — child Breadcrumb 의 hasChildren 경로 변경 없음 |
| R4  | Chrome MCP Breadcrumb label 변이 실측 부담 (3 size × 3 label 길이 = 9 샘플)                                                     |  LOW   | Phase 2 G3 에서 sample 샘플링 기준 명시 (short/medium/long label 3개)                                                                             |

## Gates

| Gate | 시점       | 통과 조건                                                                                                                                                                                                                                                                                                                   | 실패 시 대안                                             |
| :--: | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
|  G1  | 매 Phase   | `pnpm -w type-check` 3/3                                                                                                                                                                                                                                                                                                    | 직전 커밋 revert                                         |
|  G2  | Phase 1 후 | **7 소비처 pixel-perfect 동일** (Revision 2 확장) — Calendar 3 size / SelectTrigger 5 size / ComboBoxWrapper 5 size / ProgressBar/Meter **4 size (sm/md/lg/xl)** / DateField 3 size / TimeField 3 size / SearchFieldWrapper 3 size. **Chrome MCP 실측 primary** (Skia runtime pixel 비교), snapshot 은 CSS output diff 보조 | spec.sizes 누락 필드 보강 후 재시도                      |
|  G3  | Phase 2 후 | Breadcrumb label 길이 3 변이 (short/medium/long) × 3 size = 9 샘플 시각 정상                                                                                                                                                                                                                                                | Phase 1 까지 land + Phase 2 는 별도 ADR (대안 B 로 분할) |
|  G4  | 최종       | `builder` 217/217 + `specs` 166/166 회귀 0 + Revision 2 inventory (5 Record) 전수 제거 확인 (`SPEC_INPUT_FONT_SIZE` / `SPEC_TRIGGER_HEIGHT` / `PROGRESSBAR_FONT_SIZE` / `SIZE_LINE_HEIGHT` / `calPadGap` 모두 0 reference)                                                                                                  | 직전 Phase revert                                        |

## Consequences

### Positive

- `implicitStyles.ts` 파일 상단 Record 상수 3개 제거 → `spec.sizes` SSOT 복귀
- Breadcrumb child layout 이 `spec.render` 파이프라인에 포함 → ADR-063 D3 symmetric 강화
- `measureText` hook 이 공통 interface 화 → Tabs / Select / Menu 후속 consumer 재사용

### Negative

- `spec.render.shapes` signature 확장 (optional `ctx`) → 기존 spec 영향 0 이나 타입 정의 복잡도 증가
- Phase 2 실측 부담 (9 샘플)

## 반복 패턴 선차단 체크리스트 (adr-writing.md experimental seed)

- [x] #1: 코드 경로 3곳 이상 구체 인용 — `implicitStyles.ts:175/184/212/1854/955-971` + `spec.types.ts:712+` + `Breadcrumb.spec.ts`
- [x] #2: Spec/Generator 확장 ADR 로 "spec.render signature 확장 자식 emit 지원" Context 에 명시 (**optional ctx param**)
- [x] #3: BC 수식화 — 영향 spec: 4 (Calendar/SelectTrigger/ComboBoxWrapper/Breadcrumb), spec.render signature 확장 시 62 spec **영향 0** (optional param), Breadcrumbs re-serialization 0
- [x] #4: Phase 분리 가능성 질문 — 대안 B 로 Phase 1/2 분리 가능 (Gates G3 FAIL 시 대안 B 경로 전환 명시)
