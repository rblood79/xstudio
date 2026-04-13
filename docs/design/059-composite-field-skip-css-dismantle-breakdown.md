# ADR-059 Breakdown: Composite Field `skipCSSGeneration` 해체

> 상위 ADR: [059-composite-field-skip-css-dismantle.md](../adr/059-composite-field-skip-css-dismantle.md)

## 파일 인벤토리

### CSSGenerator (Pre-Phase 0 수정 대상)

| 파일                                                         | 역할                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/specs/src/runtime/CSSGenerator.ts`                 | `skipCSSGeneration` 분기, Composite 생성 로직            |
| `packages/specs/src/runtime/compositeCssGenerator.ts` (신설) | Archetype 별 composition.delegation 자동 생성 규칙       |
| `packages/specs/src/runtime/tokenResolver.ts`                | `spec.sizes` → CSS 변수 매핑 헬퍼                        |
| `packages/specs/src/types/spec.types.ts`                     | `composition.delegation.variables` 타입 `auto` 옵션 추가 |

### Phase 1 — Field 계열 7개

| Spec 파일                                           | 수동 CSS 파일                                           | `@sync` 주석 위치                   |
| --------------------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `packages/specs/src/components/TextField.spec.ts`   | `packages/shared/src/components/styles/TextField.css`   | `TextField.spec.ts:309`             |
| `packages/specs/src/components/NumberField.spec.ts` | `packages/shared/src/components/styles/NumberField.css` | `NumberField.spec.ts` (`@sync` 8개) |
| `packages/specs/src/components/SearchField.spec.ts` | `packages/shared/src/components/styles/SearchField.css` | TBD                                 |
| `packages/specs/src/components/ColorField.spec.ts`  | `packages/shared/src/components/styles/ColorField.css`  | TBD                                 |
| `packages/specs/src/components/DateField.spec.ts`   | `packages/shared/src/components/styles/DateField.css`   | TBD                                 |
| `packages/specs/src/components/TimeField.spec.ts`   | `packages/shared/src/components/styles/TimeField.css`   | TBD                                 |
| `packages/specs/src/components/TextArea.spec.ts`    | `packages/shared/src/components/styles/TextArea.css`    | TBD                                 |

### Phase 2~4 대상 (요약)

- **Phase 2**: `Select.spec.ts`, `ComboBox.spec.ts` + Popover 렌더링 경로
- **Phase 3**: `DatePicker.spec.ts`, `DateRangePicker.spec.ts`, `Calendar.spec.ts` 연동 검증
- **Phase 4**: Menu/Dialog/Modal/Tabs/Form/Toolbar/Breadcrumb/Tree/Table/Tab/Disclosure/Accordion 등 ~48개

### Phase 5 — 상수 테이블 폐지

- `apps/builder/src/builder/workspace/canvas/utils/fieldDelegation.ts` (`FIELD_TRIGGER_VARIABLES`, `FIELD_AUTO_HEIGHT_VARIABLES`)

## Pre-Phase 0 작업 순서

1. **CSSGenerator 확장 스키마 설계**
   - `composition.delegation.variables.md = "auto"` 선언 시 spec.sizes에서 자동 파생
   - 파생 규칙 table (예시):
     | 시맨틱 변수 | spec.sizes 소스 |
     | ---------------------- | ---------------------------------------------------- |
     | `--tf-input-padding` | `${size.paddingY}px ${size.paddingX}px` |
     | `--tf-input-height` | `${size.height}px` |
     | `--tf-input-font-size` | `var(${resolveToken(size.fontSize)})` |
     | `--tf-input-gap` | `${size.gap}px` |
     | `--tf-input-radius` | `var(${resolveToken(size.borderRadius)})` |
2. **simple 컴포넌트 회귀 테스트** — Button/Badge/Link/Tag 등 `skipCSSGeneration: false` 컴포넌트의 CSS 생성 결과 byte diff 0건 확인
3. **Archetype 분류 확정** — Field / Overlay / Picker / Composite-Container 4가지 archetype에 대한 생성 규칙 정의
4. **단위 테스트**: `compositeCssGenerator.test.ts` 신설. 샘플 spec 주입 → 기대 CSS 문자열 비교

## Phase 1 작업 순서 (Field 계열)

### Step 1. TextField 시험대

1. `TextField.spec.ts`의 `skipCSSGeneration: true` → `false` 전환
2. `composition.delegation.variables.md = "auto"` 선언
3. `@sync` 주석 제거 (L309)
4. `pnpm build:specs` → `packages/shared/src/components/styles/generated/TextField.css` 생성 확인
5. 기존 수동 `TextField.css`와 시맨틱 diff 실행
6. 차이점 있으면 spec.sizes 값 수정 또는 파생 규칙 수정 (hand-written CSS는 수정 금지)
7. 수동 `TextField.css`를 generated 파일 import + 수동 override (React Aria 상태별) 분리 구조로 재작성
8. Preview screenshot diff (xs/sm/md/lg/xl 5사이즈 × default/hover/focus/disabled/invalid 5상태 = 25 샷)

### Step 2. NumberField/SearchField 복제

- TextField 패턴 복제. 각 컴포넌트 고유 변수 (spinner, clear button 등)는 수동 override 경로 유지

### Step 3. Color/Date/Time Field 확장

- `ColorField`, `DateField`, `TimeField` — 내부 Segment/Swatch 렌더링 경로 추가 검증
- `TextArea` — multi-line 높이 계산 경로 무회귀

### Step 4. Phase 1 Gate 검증

- 모든 7개 컴포넌트에 대해:
  - CSS byte diff 0 (시맨틱 단위)
  - Preview screenshot ≤1px
  - `@sync` 주석 0건
  - Storybook 테스트 통과
  - `pnpm type-check` 통과
  - Canvas 60fps 유지

## Phase 2~4 요약

- **Phase 2 (Select/ComboBox)**: Popover 렌더링 경로 ADR-047 무회귀. `Select.composition.delegation`은 trigger/popover/option 3개 child selector를 가지므로 archetype 규칙 확장 필요
- **Phase 3 (DatePicker/DateRangePicker)**: Calendar 절대 좌표 (ADR-050 overflow clipping) 무회귀. Popover 자식 레이아웃 제외 규칙 (canvas-rendering.md §6) 확인
- **Phase 4 (잔존 48개)**: Archetype 별 그룹 전환. 한 번에 5~8개씩 Sub-Phase

## Phase 5 — 상수 테이블 폐지 + ADR-036 재승격

1. `utils/fieldDelegation.ts`의 `FIELD_TRIGGER_VARIABLES`, `FIELD_AUTO_HEIGHT_VARIABLES` 사용처 grep
2. CSS 자동 생성 결과로 치환 가능한 항목 제거
3. 파일 완전 삭제 또는 legacy export 유지 (dead code 확인 후 결정)
4. `@sync` 주석 13개 파일 전수 제거 확인
5. `docs/adr/README.md` 업데이트 — ADR-036 "Implemented" 유지 근거로 ADR-059 완료 링크 추가

## 회귀 진단 절차

### 단위 1: CSS byte diff

```bash
# 전환 전 수동 CSS 스냅샷
cp packages/shared/src/components/styles/TextField.css /tmp/TextField.css.before

# 전환 후 자동 생성 vs 수동 override 합성
cat packages/shared/src/components/styles/generated/TextField.css \
    packages/shared/src/components/styles/TextField.override.css \
    > /tmp/TextField.css.after

# 시맨틱 diff (공백/순서 정규화)
css-diff /tmp/TextField.css.before /tmp/TextField.css.after
```

### 단위 2: Preview screenshot

- Storybook + Playwright visual regression
- `xs/sm/md/lg/xl × default/hover/focus/disabled/invalid` = 25 샷
- threshold: ≤1px, ≤0.5% pixel diff

### 단위 3: Canvas rendering (Skia)

- `/cross-check` skill 실행
- spec.sizes 값 변경 없음 → Skia 무회귀

## 체크리스트 (Phase 1 완료 시)

- [ ] `TextField.spec.ts` skipCSSGeneration false
- [ ] `NumberField.spec.ts` skipCSSGeneration false
- [ ] `SearchField.spec.ts` skipCSSGeneration false
- [ ] `ColorField.spec.ts` skipCSSGeneration false
- [ ] `DateField.spec.ts` skipCSSGeneration false
- [ ] `TimeField.spec.ts` skipCSSGeneration false
- [ ] `TextArea.spec.ts` skipCSSGeneration false
- [ ] 7개 컴포넌트 `@sync` 주석 0건
- [ ] 7개 `generated/*.css` 파일 생성 확인
- [ ] CSS byte diff 0건 (시맨틱)
- [ ] Screenshot diff ≤1px × 25 샷 × 7 컴포넌트
- [ ] Storybook 전 스토리 통과
- [ ] `pnpm type-check` 통과
- [ ] Canvas 60fps 유지
- [ ] 2-pass re-enrichment 무회귀 (Label/Checkbox 내부 미재발)
- [ ] ADR-042 dimension injection 무회귀

## 롤백 전략

- Phase 1 실패 시: 전환된 컴포넌트의 `skipCSSGeneration: true` 복원, 수동 CSS 복원, `@sync` 주석 복원
- Pre-Phase 0 실패 시: CSSGenerator 확장 revert, Phase 1 차단
- Phase 5 실패 시: `utils/fieldDelegation.ts` 복원
