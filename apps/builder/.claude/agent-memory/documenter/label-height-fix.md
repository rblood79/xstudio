---
name: Label height 정합성 버그 수정 (2026-03-25)
description: DFS Label size injection 조건을 fontSize→lineHeight 기준으로 변경, DatePicker/DateRangePicker LABEL_DELEGATION_PARENT_TAGS 누락 수정
type: project
---

## 근본 원인

여러 factory(TextField, Select, ComboBox, NumberField 등)가 Label에 `fontSize: 14`를 미리 설정.
DFS injection 조건이 `labelStyle.fontSize == null`이어서 lineHeight 주입이 스킵됨.
결과: `fontSize * 1.5 = 21px` fallback → CSS Preview(20px)와 불일치.

DatePicker/DateRangePicker가 `LABEL_DELEGATION_PARENT_TAGS`와 `LABEL_SIZE_DELEGATION_CONTAINERS`에 누락되어
Label height가 24px(fallback fontSize=16)으로 잘못 계산됨.

## 수정 내역

| 위치                         | 변경 전                           | 변경 후                                                                |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `fullTreeLayout.ts:812`      | `labelStyle.fontSize == null`     | `labelStyle.lineHeight == null`                                        |
| `fullTreeLayout.ts:1252`     | `cs.fontSize != null`             | `cs.lineHeight != null`                                                |
| `fullTreeLayout.ts:1078`     | `Math.ceil(childFs * 1.5)`        | LABEL_SIZE_STYLE lineHeight 역참조                                     |
| `fullTreeLayout.ts:770,1196` | DatePicker/DateRangePicker 미포함 | LABEL_DELEGATION_PARENT_TAGS + LABEL_SIZE_DELEGATION_CONTAINERS에 추가 |
| `utils.ts:1993`              | `Math.ceil(fontSize * 1.5)`       | `parseLineHeight` 우선 사용                                            |

## CSS Preview 근거

```
--text-sm: 0.875rem = 14px
--text-sm--line-height: calc(1.25 / 0.875) = 1.42857
14px × 1.42857 = 20px  (CSS Preview 정답)
fontSize * 1.5 = 21px  (기존 fallback — 틀림)
```

**Why:** factory에서 fontSize가 미리 주입되어 있어도 lineHeight가 없으면 LabelSpec 기준값을 주입해야 함.
**How to apply:** Label DFS injection 조건 및 getChildElements 래퍼 스킵 조건 모두 `lineHeight == null` 기준으로 일관되게 유지.
새 field 컴포넌트 추가 시 반드시 `LABEL_DELEGATION_PARENT_TAGS`에 등록.
