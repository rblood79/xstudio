/**
 * OperatorToggle - AND/OR 연산자 토글
 *
 * 조건 그룹의 연산자를 토글하는 컴포넌트
 */

import { Button } from 'react-aria-components';

interface OperatorToggleProps {
  /** 현재 연산자 */
  value: 'AND' | 'OR';

  /** 연산자 변경 핸들러 */
  onChange: (operator: 'AND' | 'OR') => void;
}

/**
 * AND/OR 연산자 토글 컴포넌트
 *
 * @example
 * <OperatorToggle
 *   value={conditions.operator}
 *   onChange={(op) => setOperator(op)}
 * />
 */
export function OperatorToggle({ value, onChange }: OperatorToggleProps) {
  const toggleOperator = () => {
    onChange(value === 'AND' ? 'OR' : 'AND');
  };

  return (
    <div className="operator-toggle">
      <Button
        className="toggle-button"
        onPress={toggleOperator}
        aria-label={`Change to ${value === 'AND' ? 'OR' : 'AND'}`}
      >
        {value}
      </Button>
    </div>
  );
}
