/**
 * OperatorPicker - 조건 연산자 선택기
 *
 * 조건 비교 연산자 (equals, contains, is_empty 등)를 선택하는 드롭다운
 */

import { Select, SelectValue, Button, Popover, ListBox, ListBoxItem } from 'react-aria-components';
import { ChevronDown } from 'lucide-react';
import { iconSmall } from '../../../../utils/ui/uiConstants';
import type { ConditionOperator } from '../../../events/types/eventBlockTypes';
import { CONDITION_OPERATOR_META } from '../../../events/types/eventBlockTypes';

interface OperatorPickerProps {
  /** 현재 선택된 연산자 */
  value: ConditionOperator;

  /** 연산자 변경 핸들러 */
  onChange: (operator: ConditionOperator) => void;
}

/**
 * 연산자 카테고리별 그룹
 */
const OPERATOR_GROUPS: { label: string; operators: ConditionOperator[] }[] = [
  {
    label: 'Comparison',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal'],
  },
  {
    label: 'String',
    operators: ['contains', 'not_contains', 'starts_with', 'ends_with', 'matches_regex'],
  },
  {
    label: 'Check',
    operators: ['is_empty', 'is_not_empty', 'is_true', 'is_false', 'is_null', 'is_not_null'],
  },
];

/**
 * 조건 연산자 선택기 컴포넌트
 *
 * @example
 * <OperatorPicker
 *   value={condition.operator}
 *   onChange={(op) => updateCondition({ operator: op })}
 * />
 */
export function OperatorPicker({ value, onChange }: OperatorPickerProps) {
  const meta = CONDITION_OPERATOR_META[value];

  return (
    <Select
      className="operator-picker"
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as ConditionOperator)}
      aria-label="Condition operator"
    >
      <Button className="operator-picker-button">
        <SelectValue>
          {meta.label}
        </SelectValue>
        <ChevronDown size={iconSmall.size} />
      </Button>

      <Popover className="operator-picker-popover">
        <ListBox className="operator-picker-list">
          {OPERATOR_GROUPS.map((group) => (
            <div key={group.label} className="operator-group">
              <div className="operator-group-label">{group.label}</div>
              {group.operators.map((op) => {
                const opMeta = CONDITION_OPERATOR_META[op];
                return (
                  <ListBoxItem
                    key={op}
                    id={op}
                    className="operator-item"
                    textValue={opMeta.label}
                  >
                    <span className="operator-symbol">{opMeta.label}</span>
                    <span className="operator-description">{opMeta.description}</span>
                  </ListBoxItem>
                );
              })}
            </div>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
