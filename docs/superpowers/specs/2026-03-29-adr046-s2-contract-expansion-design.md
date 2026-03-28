# ADR-046 통합 구현 설계 — S2 계약 확장 + ADR-045 잔여 통합

> **작성일**: 2026-03-29
> **관련 ADR**: ADR-046 (S2 계약 확장), ADR-045 (Property Editor 정합성 정렬)
> **접근 방식**: 컴포넌트 단위 순차 구현 (E2E 완전 구현)

---

## 범위

### 이미 완료 (코드 변경 불필요)

| 컴포넌트   | props                                                                                                                                   | 상태                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Form       | labelPosition, labelAlign, necessityIndicator                                                                                           | ✅ Spec + Shared + Preview 완료 |
| ColorField | variant, size, isInvalid, autoFocus, name, form, validationBehavior, necessityIndicator, labelPosition, labelAlign, channel, colorSpace | ✅ 12개 모두 완료               |
| Menu       | size                                                                                                                                    | ✅ Spec + Shared + Preview 완료 |

### 신규 구현 대상 (5개 컴포넌트)

| #   | 컴포넌트    | 신규 props                                                   | 규모 |
| --- | ----------- | ------------------------------------------------------------ | ---- |
| 1   | Tabs        | density 에디터 노출 확인                                     | 소   |
| 2   | Breadcrumbs | size E2E 완성                                                | 소   |
| 3   | Tooltip     | containerPadding, crossOffset, shouldFlip                    | 중   |
| 4   | Popover     | crossOffset, shouldFlip, containerPadding + size 에디터 노출 | 중   |
| 5   | Menu        | align, direction, shouldFlip                                 | 중   |

### 명시적 보류

| prop                       | 이유                                           |
| -------------------------- | ---------------------------------------------- |
| Form.size                  | XStudio field size 축과 S2 Form size 축 불일치 |
| Form.isEmphasized          | 공통 시각 계약 아님                            |
| Tooltip.trigger            | styling hook 성격 (G5 위반)                    |
| Tabs.isQuiet, isEmphasized | 채택 근거 부족                                 |

---

## 구현 순서 및 상세

### 1. Tabs — density 에디터 노출 확인

**현재 상태**: Spec properties에 density field 정의됨 (Appearance 섹션). TabsEditor는 Hybrid 에디터.

**작업**:

- TabsHybridAfterSections에서 density가 GenericPropertyEditor Spec fields로 이미 노출되는지 확인
- 노출 안 되면 Spec properties에서 density field가 GenericPropertyEditor를 통해 렌더링되도록 조정
- shared Tabs component에서 `data-density={density}` 전달 확인
- Preview renderer에서 props 전달 확인
- 브라우저 검증: density 변경 → Tabs 높이/간격 반영

**E2E 경로**: Spec → TabsEditor(Hybrid) → Shared `data-density` → CSS `[data-density]` → Preview

### 2. Breadcrumbs — size E2E 완성

**현재 상태**: Spec에 sizes(xs~xl) + properties에 size field 정의됨. Shared component에서 `data-size` 미설정 가능성.

**작업**:

- shared `Breadcrumbs.tsx`에서 `data-size={size}` 설정 확인, 없으면 추가
- Breadcrumbs.css에 `[data-size]` 스타일 존재 확인, 없으면 추가
- 에디터 노출: GenericPropertyEditor가 Spec size field를 자동 렌더링하므로 추가 작업 없음
- 브라우저 검증: size 변경 → font-size/padding 반영

**E2E 경로**: Spec → GenericPropertyEditor → Shared `data-size` → CSS → Preview

### 3. Tooltip — overlay props 추가

**현재 상태**: Spec properties에 placement, offset, showArrow만 정의. overlay positioning props 없음.

**추가할 props**:

| prop             | 타입    | 섹션  | 설명                            |
| ---------------- | ------- | ----- | ------------------------------- |
| containerPadding | number  | State | viewport 경계로부터의 패딩 (px) |
| crossOffset      | number  | State | 교차축 오프셋 (px)              |
| shouldFlip       | boolean | State | 공간 부족 시 반전 여부          |

**작업**:

1. `TooltipProps` 인터페이스에 props 추가
2. `Tooltip.spec.ts` properties State 섹션에 fields 추가
3. shared `Tooltip.tsx` — React Aria `TooltipTrigger`에 해당 props 전달 (이 props는 Tooltip 자체가 아닌 TooltipTrigger에 속함)
4. Preview renderer에서 props 전달 확인
5. 타입 체크 + 브라우저 검증

**React Aria 구조 주의**: `containerPadding`, `crossOffset`, `shouldFlip`은 `<TooltipTrigger>` props. XStudio에서 Tooltip 요소에 저장되지만, 렌더링 시 trigger로 전달해야 함.

### 4. Popover — overlay props 추가

**현재 상태**: Spec에 size 정의됨. properties 섹션 없음. overlay positioning props 없음.

**추가할 props**:

| prop             | 타입    | 섹션  | 설명                            |
| ---------------- | ------- | ----- | ------------------------------- |
| crossOffset      | number  | State | 교차축 오프셋 (px)              |
| shouldFlip       | boolean | State | 공간 부족 시 반전 여부          |
| containerPadding | number  | State | viewport 경계로부터의 패딩 (px) |

**작업**:

1. `PopoverProps` 인터페이스에 props 추가
2. `Popover.spec.ts`에 properties 섹션 생성 (Appearance: size, State: overlay props)
3. shared `Popover.tsx` — React Aria `<Popover>` 컴포넌트에 직접 전달 (Tooltip과 다르게 Popover 자체 props)
4. Preview renderer에서 props 전달 확인
5. 타입 체크 + 브라우저 검증

### 5. Menu — trigger positioning props

**현재 상태**: Spec에 size 있음 + properties에 size/children/isDisabled 등 정의됨. trigger positioning props 없음.

**추가할 props**:

| prop       | 타입                                   | 섹션       | 설명              |
| ---------- | -------------------------------------- | ---------- | ----------------- |
| align      | "start" \| "end"                       | Appearance | 메뉴 정렬         |
| direction  | "bottom" \| "top" \| "left" \| "right" | Appearance | 메뉴 방향         |
| shouldFlip | boolean                                | State      | 공간 부족 시 반전 |

**작업**:

1. `MenuProps` 인터페이스에 props 추가
2. `Menu.spec.ts` properties에 fields 추가
3. shared `Menu.tsx` — 이 props는 `<MenuTrigger>`에 전달됨. XStudio에서 Menu 컴포넌트가 trigger를 래핑하는 구조 확인 필요
4. Preview renderer(`renderMenu` 또는 관련 함수)에서 MenuTrigger로 props 전달
5. 타입 체크 + 브라우저 검증

**React Aria 구조 주의**: `align`, `direction`, `shouldFlip`은 `<MenuTrigger>` props. Menu 자체가 아닌 trigger에 전달해야 함.

---

## 게이트 (ADR-046 G1~G5 준수)

| Gate                     | 검증 방법                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| G1 (S2 문서 + 코드 근거) | 모든 추가 prop에 React Spectrum S2 문서 + React Aria API 근거 확인 |
| G2 (types + shared 동시) | Props 인터페이스 + shared component 동시 반영                      |
| G3 (타입/린트 통과)      | `pnpm exec tsc --noEmit` 통과                                      |
| G4 (범위 팽창 방지)      | 보류 항목 명시, 범위 외 prop 추가 금지                             |
| G5 (ADR 형식 준수)       | 세부 체크리스트는 본 문서에서 관리                                 |

## 완료 후 문서 업데이트

- ADR-045: Status → "Implemented (ADR-046에 통합)" 변경
- ADR-046: Decision Snapshot에 Tooltip/Popover/Breadcrumbs/Menu 추가
- ADR README: ADR-045 완료 섹션 이동, ADR-046 상태 업데이트
