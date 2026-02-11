/**
 * VariableBindingButton - 색상 변수 바인딩 버튼
 *
 * Phase 4: 디자인 토큰 색상 변수 참조
 * - 클릭 → 색상 토큰 목록 팝오버
 * - 선택 → "$--css-variable" 형태로 저장
 * - 현재 바인딩 표시 + 해제
 *
 * @since 2026-02-11 Phase 4
 */

import { memo, useCallback, useMemo } from 'react';
import { DialogTrigger, Button as AriaButton } from 'react-aria-components';
import { Link2, Link2Off } from 'lucide-react';
import { Popover } from '@xstudio/shared/components/Popover';
import { useTokens } from '../../../../stores/themeStore';
import type { DesignToken } from '../../../../types/theme';
import { iconSmall } from '../../../../utils/ui/uiConstants';

import './VariableBindingButton.css';

interface VariableBindingButtonProps {
  /** 현재 색상 값 (hex8 또는 "$--변수명") */
  value: string;
  /** 변수 바인딩/해제 시 호출 */
  onChange: (value: string) => void;
}

/** "$--" 접두사 패턴 매칭 */
function isVariableRef(value: string): boolean {
  return value.startsWith('$--');
}

/** "$--css-variable" → "css-variable" */
function getVariableName(value: string): string {
  return value.slice(3);
}

/** 토큰의 색상 값을 hex6로 추출 */
function getTokenColorHex(token: DesignToken): string {
  const val = token.value;
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'r' in val) {
    const { r, g, b } = val as { r: number; g: number; b: number };
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  if (val && typeof val === 'object' && 'h' in val) {
    // HSL → 간이 변환 (미리보기용)
    return '#888888';
  }
  return '#000000';
}

export const VariableBindingButton = memo(function VariableBindingButton({
  value,
  onChange,
}: VariableBindingButtonProps) {
  const tokens = useTokens();
  const isBound = isVariableRef(value);
  const boundVarName = isBound ? getVariableName(value) : '';

  // 색상 타입 토큰만 필터
  const colorTokens = useMemo(
    () => tokens.filter((t) => t.type === 'color'),
    [tokens],
  );

  const handleSelect = useCallback(
    (token: DesignToken) => {
      const cssVar = token.css_variable ?? `--${token.name.replace(/\./g, '-')}`;
      onChange(`$${cssVar}`);
    },
    [onChange],
  );

  const handleUnbind = useCallback(() => {
    // 바인딩 해제 시 기본 검정색으로 복원
    onChange('#000000FF');
  }, [onChange]);

  return (
    <div className="variable-binding">
      {isBound && (
        <div className="variable-binding__badge">
          <span className="variable-binding__var-name">{boundVarName}</span>
          <button
            type="button"
            className="variable-binding__unbind"
            onClick={handleUnbind}
            aria-label="Unbind variable"
          >
            <Link2Off size={10} strokeWidth={2} />
          </button>
        </div>
      )}

      <DialogTrigger>
        <AriaButton
          className="variable-binding__btn"
          aria-label="Bind to variable"
          isDisabled={colorTokens.length === 0}
        >
          <Link2
            size={iconSmall.size}
            strokeWidth={iconSmall.strokeWidth}
            color={isBound ? undefined : iconSmall.color}
          />
        </AriaButton>
        <Popover
          placement="bottom end"
          className="variable-binding__popover"
          showArrow={false}
        >
          <div className="variable-binding__list">
            <div className="variable-binding__list-header">Color Variables</div>
            {colorTokens.length === 0 && (
              <div className="variable-binding__empty">No color tokens available</div>
            )}
            {colorTokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                isActive={isBound && boundVarName === (token.css_variable?.slice(2) ?? token.name.replace(/\./g, '-'))}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </Popover>
      </DialogTrigger>
    </div>
  );
});

/** 개별 토큰 행 */
const TokenRow = memo(function TokenRow({
  token,
  isActive,
  onSelect,
}: {
  token: DesignToken;
  isActive: boolean;
  onSelect: (token: DesignToken) => void;
}) {
  const colorHex = useMemo(() => getTokenColorHex(token), [token]);
  const displayName = token.css_variable
    ? token.css_variable.slice(2)
    : token.name.replace(/\./g, '-');

  const handleClick = useCallback(() => {
    onSelect(token);
  }, [token, onSelect]);

  return (
    <button
      type="button"
      className="variable-binding__token-row"
      data-active={isActive || undefined}
      onClick={handleClick}
    >
      <div
        className="variable-binding__token-swatch"
        style={{ backgroundColor: colorHex }}
      />
      <span className="variable-binding__token-name">{displayName}</span>
    </button>
  );
});
