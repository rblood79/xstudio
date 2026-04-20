# ADR-083 Breakdown — Archetype Base Styles → Spec containerStyles 리프팅 구현 상세

> 본 문서는 ADR-083 (`docs/adr/083-archetype-base-styles-lifting.md`) 의 Decision 섹션에서 분리된 구현 상세. archetype별 Phase 분리, Spec 매핑표, Generator 수정, 테스트 전략.

## 배경 (요약)

- `packages/specs/src/renderers/CSSGenerator.ts:50-116` `ARCHETYPE_BASE_STYLES` 테이블이 11 archetype × 65 spec에 **숨은 기본값** 공급
- CSSGenerator 단독 소비 → **Skia Taffy + Style Panel은 archetype 무지**
- 결과: CSS에는 `display:flex` 적용, Skia/Panel에는 block fallback (InlineAlert 사례)
- `ssot-hierarchy.md` "symmetric = 시각 결과 동일" 원칙 위반
- ADR-078 Phase 5가 ListBox/Menu/Autocomplete에 **선제 적용한 SSOT 리프팅 패턴을 일반화**

## 전체 영향 범위 (archetype × spec)

| archetype          | base 선언 요약                                                                                                                                  | 영향 spec 수                                                                                                       | 권장 Phase 순서     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `alert`            | `display:flex; flex-direction:column; align-items:flex-start; width:100%; font-family`                                                          | 2 (InlineAlert, IllustratedMessage)                                                                                | **Phase 1 (Pilot)** |
| `input-base`       | `display:flex; align-items:center; font-family`                                                                                                 | 2                                                                                                                  | Phase 2             |
| `toggle-indicator` | `display:inline-flex; align-items:center; cursor:pointer; user-select:none`                                                                     | 3                                                                                                                  | Phase 3             |
| `calendar`         | `display:grid`                                                                                                                                  | 3                                                                                                                  | Phase 4             |
| `slider`           | `display:grid`                                                                                                                                  | 3                                                                                                                  | Phase 5             |
| `collection`       | `display:flex; flex-direction:column`                                                                                                           | 5 (Autocomplete/ListBox/Menu/TabPanel/TabPanels; ListBox 만 기존 리프팅 완료, 잔여 4 spec layout primitive 미적용) | Phase 6 (잔여 4)    |
| `text`             | `display:block; width:100%`                                                                                                                     | 4                                                                                                                  | Phase 7             |
| `button`           | `display:inline-flex; align-items:center; justify-content:center; width:fit-content; cursor:pointer; user-select:none; transition; font-family` | 5                                                                                                                  | Phase 8             |
| `overlay`          | `position:fixed`                                                                                                                                | 4                                                                                                                  | Phase 9             |
| `progress`         | `display:grid; grid-template-areas; grid-template-columns` + nested `.react-aria-Label` / `[slot=value]` / `.bar` slot 선언                     | 7                                                                                                                  | Phase 10 (특수)     |
| `simple`           | `display:inline-flex; align-items:center`                                                                                                       | 27 (`ListBoxItem.spec` 은 archetype="simple" + 기존 layout primitive 리프팅 완료 — 잔여 26 spec)                   | Phase 11 (대량)     |
| `tabs-indicator`   | `display:flex; position:relative`                                                                                                               | **0** (현재 소비 spec 없음 — Generator 테이블 entry 만 존재)                                                       | G5 최종 정리        |
| **합계**           | —                                                                                                                                               | **65** (영향 11 archetype)                                                                                         | —                   |

**기존 리프팅 완료 spec (선례 모수)**: `ListBox.spec.ts:84-91` (collection) + `ListBoxItem.spec.ts:52-57` (simple) = **2 spec**. Menu/Autocomplete 등 다른 containerStyles 보유 spec 은 색상·간격 SSOT 는 land 되었으나 layout primitive (display/flexDirection) 는 미적용 → Phase 6 / Phase 11 에서 포함 처리.

## Phase 공통 절차 (각 archetype별 반복)

1. **archetype별 대표 spec 1개 선정**하여 `containerStyles`에 archetype base 값 명시
2. **Factory 사전 감사 (R6)**: 해당 archetype 소속 `createDefault*Props` / `effectiveGetChildElements` 에 `display/flexDirection/alignItems/justifyContent/gap/padding` 중복 주입 여부 grep. 발견 시 **spec 리프팅 전 먼저 제거** — ADR-079 P3 계약 유지
3. **빌드 체인**: `pnpm build:specs` 성공 → `packages/shared/src/components/styles/generated/*.css` regenerate 확인 (stale 방지)
4. **3경로 검증**:
   - Generator: 해당 spec CSS 재생성 → 이전 CSS와 **diff 0** (archetype base가 `containerStyles` 중복으로 emit되어도 cascade 결과 동일)
   - Skia Taffy: 해당 spec 요소의 `display`/`flexDirection` 등이 실제 Skia 배치에 반영 (cross-check)
   - Panel: 해당 spec 선택 시 Layout/Transform section에 올바른 값 표시 (ADR-082 A1/A2 경로 활용)
5. **Snapshot 무결성**: `apps/builder/.../tokenConsumerDrift.test.ts` (ADR-081) 재실행 → 의도된 변경만 `.snap` update, 예상 외 drift 시 원인 분석
6. **archetype의 나머지 spec에 일괄 적용** (script 또는 batch edit). 각 spec 에 대해 2–5 재수행
7. **테스트 추가**: archetype별 최소 1건 — `resolveLayoutSpecPreset(tag, size)` 반환값에 display 포함 확인
8. **Preview/Publish cascade 확인 (R7)**: Phase 2 이상부터 Chrome MCP 샘플링 시 Builder Skia + Preview DOM + Publish DOM 3경로 중 2 이상 렌더 결과 비교

## Phase 1 (Pilot: `alert` archetype)

### 대상 Spec

- `packages/specs/src/components/InlineAlert.spec.ts`
- `packages/specs/src/components/IllustratedMessage.spec.ts`

### 변경

```typescript
// InlineAlert.spec.ts — variants 아래, sizes 위에 추가
containerStyles: {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  width: "100%",
  fontFamily: "var(--font-sans)", // 또는 primitive token
},
```

### 검증

- `pnpm build:specs` 성공 + `packages/shared/src/components/styles/generated/InlineAlert.css` regenerate 확인 (stale 방지)
- Factory 감사: `createDefaultInlineAlertProps` / `createDefaultIllustratedMessageProps` 에 `display/flexDirection/alignItems/width/fontFamily` 중복 주입 없음 grep 확인 (R6)
- Generated CSS diff: 기존 `display:flex`/`flex-direction:column`/... 과 containerStyles emit이 **동일 값 2회** → cascade 동일 → 회귀 0
- Chrome MCP 3경로 샘플: InlineAlert Builder Skia = Preview DOM = Panel 표시 (R7)
- Panel: InlineAlert 선택 시 Layout section `display: flex`, `flex-direction: column` 표시
- ADR-081 `tokenConsumerDrift.test.ts` 재실행 → 관련 snap 업데이트 또는 drift 없음 확인

### Gate 통과 조건

- `pnpm type-check` 3/3 PASS
- `pnpm --filter @composition/builder test` 215+ PASS (P4 land 기준)
- Generated CSS diff를 수동 검토 후 "실질 변화 없음" 확정
- **ADR-082 본문에 Hard Constraint "Spec 내용 불변" 해제 Addendum 작성** (R4 → Gate 매핑)
- **alert archetype factory 감사 완료** (R6)

## Phase 2~11 절차 축약

Phase 1과 동일 절차. `containerStyles` 필드 추가 + Generator 재생성 + 검증.

**주의 archetype**:

- `progress`: `grid-template-areas` 같은 nested slot 선언 포함 — `containerStyles`에 full string 수용 필요. `ContainerStylesSchema`에 grid 관련 필드 확장 필요할 수 있음
- `collection`: 5 spec 중 **ListBox 1개만** 기존 layout primitive 리프팅 완료 (`ListBox.spec.ts:84-91`). 잔여 **4개 (Autocomplete/Menu/TabPanel/TabPanels)** 처리 — Menu/Autocomplete 는 색상·간격 containerStyles 만 선언된 상태
- `simple`: 27 spec 대량 처리 (`ListBoxItem.spec.ts` 은 이미 리프팅 완료, 잔여 26). batch script로 자동화 권장 — `archetype==="simple"` + 기존 `containerStyles` 에 layout primitive 미선언 spec 에 `display="inline-flex"; alignItems="center"` 일괄 주입. 기존 layout primitive 선언된 spec 은 skip

## Generator 정리 (최종 Phase)

모든 archetype이 SSOT 리프팅 완료 후:

- `ARCHETYPE_BASE_STYLES` 테이블을 CSSGenerator에서 **삭제** (또는 빈 테이블로 축소)
- `DEFAULT_BASE_STYLES` 는 유지 (archetype 미지정 fallback)
- `generateBaseStyles` 함수를 단순화 — `containerStyles` 기반 emit만 남김

## 테스트 전략

### 단위 테스트

- `specPresetResolver.test.ts`에 archetype별 최소 1 케이스 추가:
  - InlineAlert → `display:flex`, `flex-direction:column`
  - Calendar → `display:grid`
  - Button → `display:inline-flex`
  - 등 11 archetype 대표 1개씩 → 총 11 케이스

### Regression 테스트 (drift 감지)

- `packages/specs/src/renderers/__tests__/archetypeCssParity.test.ts` **신설**:
  - archetype별 대표 spec의 Generated CSS가 base에서 선언하는 display/flex 속성이 `containerStyles`에도 선언돼 있는지 cross-ref
  - drift 발생 시 FAIL — ADR-081 tokenConsumerDrift 패턴 재사용

### Chrome MCP E2E

- Phase 1 (alert) 완료 후: InlineAlert 배치 Skia = CSS 확인
- 각 Phase별로 대표 spec 1개씩 Chrome MCP 샘플링

## 롤백 전략

각 Phase는 **독립 커밋**. 문제 발생 시 해당 Phase만 revert. `ARCHETYPE_BASE_STYLES` 테이블은 최종 Phase까지 **유지** → 부분 리프팅 상태에서도 CSS 생성 정상 (중복 emit은 cascade 영향 0).

## 세션 분할 권장

| 세션                    | 범위                                                    | 예상 시간 |
| ----------------------- | ------------------------------------------------------- | :-------: |
| A (이번 세션 또는 다음) | ADR-083 Proposed + Phase 1 Pilot (alert)                |   2–3h    |
| B                       | Phase 2–5 (input-base/toggle-indicator/calendar/slider) |   2–3h    |
| C                       | Phase 6–9 (collection 잔여/text/button/overlay)         |   3–4h    |
| D                       | Phase 10 (progress) — 특수 grid-template 처리           |   2–3h    |
| E                       | Phase 11 (simple 27 대량)                               |   3–4h    |
| F                       | Generator 테이블 삭제 + Parity test 전면 검증           |   1–2h    |

**총 13–19h** (5–6 세션). P5 Chrome MCP 검증은 Phase B 이후 병렬 가능.

## 참조 파일 경로

- 테이블 위치: `packages/specs/src/renderers/CSSGenerator.ts:50-116`
- 선례: `packages/specs/src/components/ListBox.spec.ts:76-91` (ADR-078 Phase 5 적용 예)
- Panel resolver: `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts`
- drift 인프라: `apps/builder/src/builder/workspace/canvas/layout/engines/tokenConsumerDrift.test.ts` (ADR-081)
- SSOT 원칙: `.claude/rules/ssot-hierarchy.md`
