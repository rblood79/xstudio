---
name: parallel-verify
description: 병렬 서브에이전트로 컴포넌트 패밀리별 spec/factory/renderer/CSS 정합성을 동시 검증합니다.
TRIGGER when: user mentions "병렬 검증", "전체 컴포넌트 체크", "패밀리별 검증", "parallel verify", "일괄 검증", "전체 정합성", or asks to verify all components across rendering paths simultaneously.
user_invocable: true
---

# Parallel Verify: 컴포넌트 패밀리별 병렬 검증

변경된 컴포넌트를 패밀리별로 그룹화하고, 사용자가 병렬 검증/보조 에이전트를 명시적으로 요청한 경우 각 패밀리를 병렬 서브에이전트로 검증합니다.

## Phase 1: 변경 컴포넌트 식별 및 그룹화

`git diff --name-only`에서 변경된 컴포넌트를 아래 패밀리로 분류합니다:

| 패밀리          | 컴포넌트                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Buttons**     | Button, ToggleButton, ToggleButtonGroup, Menu, Toolbar, ButtonGroup                                               |
| **Forms**       | TextField, NumberField, SearchField, Checkbox, CheckboxGroup, Radio, RadioGroup, Switch, Slider, Select, ComboBox |
| **DateTime**    | DatePicker, DateRangePicker, DateField, TimeField, Calendar, RangeCalendar                                        |
| **Collections** | Table, ListBox, GridList, TagGroup, Tree, Tabs                                                                    |
| **Layout**      | Card, Panel, Group, Disclosure, DisclosureGroup, Accordion, Nav                                                   |
| **Display**     | Badge, Avatar, StatusLight, ProgressBar, Meter, ProgressCircle, Image                                             |
| **Overlays**    | Dialog, Popover, Tooltip, Toast                                                                                   |

## Phase 2: 병렬 에이전트 실행

변경이 있는 패밀리별로 Agent 도구를 사용하여 **병렬** 서브에이전트를 실행합니다.
모든 독립 에이전트는 **단일 메시지**에서 동시에 실행합니다.

각 에이전트에 전달할 프롬프트 템플릿:

```
[패밀리명] 컴포넌트 정합성 검증. 아래 컴포넌트들의 5-레이어를 검증하세요:
컴포넌트: [컴포넌트 목록]

각 컴포넌트에 대해:
1. Spec 파일 읽기 → defaultVariant, defaultSize, sizes, variants 확인
2. Factory 파일 읽기 → 기본 props가 Spec과 일치하는지 확인
3. CSS 파일 읽기 → data-variant/data-size 선택자가 Spec sizes/variants와 일치하는지 확인
4. WebGL 경로 확인:
   - ElementSprite.tsx의 TAG_SPEC_MAP 등록 여부
   - specTextStyle.ts의 TEXT_BEARING_SPECS 등록 여부 (텍스트 컴포넌트)
   - utils.ts의 INLINE_BLOCK_TAGS 등록 여부 (fit-content 컴포넌트)
5. Preview 렌더러 읽기 → variant/size props가 React 컴포넌트에 전달되는지 확인

불일치 발견 시 테이블로 보고:
| 컴포넌트 | 레이어 | 이슈 | 심각도 |

코드를 수정하지 말고 보고만 하세요.
```

## Phase 3: 결과 수집 및 수정

모든 에이전트 완료 후:

1. 각 에이전트의 발견사항을 통합 테이블로 정리
2. CRITICAL/HIGH 이슈를 우선 수정
3. `pnpm run build:specs`와 `pnpm run codex:typecheck` 필요 여부를 확인하고 검증
4. 최종 결과 보고

## Evals

### Positive (발동해야 하는 경우)

- "전체 컴포넌트 정합성 체크해줘" → ✅ 전체 패밀리 병렬 검증
- "Forms 패밀리 일괄 검증" → ✅ 패밀리 단위 검증
- "Spec 대량 수정 후 전체 확인해봐" → ✅ 다수 컴포넌트 영향

### Negative (발동하면 안 되는 경우)

- "Button 하나만 확인해줘" → ❌ 단일 컴포넌트 → cross-check 사용
- "타입 에러 수정해줘" → ❌ 타입 작업, 렌더링 검증 불필요
- "TextField CSS만 수정했어" → ❌ 단일 경로 + 단일 컴포넌트 → cross-check 사용
