/**
 * ShortcutTooltip - 단축키 표시 툴팁 컴포넌트
 *
 * 버튼 hover 시 해당 단축키를 표시하는 툴팁
 * react-aria-components의 TooltipTrigger와 Tooltip 사용
 *
 * @since Phase 7 구현 (2025-12-29)
 *
 * @example
 * ```tsx
 * <ShortcutTooltip shortcutId="undo">
 *   <Button onPress={handleUndo}>
 *     <Undo2 />
 *   </Button>
 * </ShortcutTooltip>
 * ```
 */

import { TooltipTrigger, Tooltip } from 'react-aria-components';
import {
  SHORTCUT_DEFINITIONS,
  type ShortcutId,
} from '../../config/keyboardShortcuts';
import { formatShortcut } from '../../hooks/useKeyboardShortcutsRegistry';
import './ShortcutTooltip.css';

// ============================================
// Types
// ============================================

export interface ShortcutTooltipProps {
  /** 단축키 ID */
  shortcutId: ShortcutId;
  /** 트리거 요소 (Button 등) */
  children: React.ReactElement;
  /** 툴팁 지연 시간 (ms) */
  delay?: number;
  /** 툴팁 위치 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 커스텀 라벨 (description 대신 사용) */
  label?: string;
}

// ============================================
// Component
// ============================================

export function ShortcutTooltip({
  shortcutId,
  children,
  delay = 700,
  placement = 'top',
  label,
}: ShortcutTooltipProps) {
  const def = SHORTCUT_DEFINITIONS[shortcutId];

  // 정의되지 않은 단축키면 children만 반환
  if (!def) {
    return children;
  }

  const display = formatShortcut({ key: def.key, modifier: def.modifier });
  const description = label || def.i18n?.ko || def.description;

  return (
    <TooltipTrigger delay={delay}>
      {children}
      <Tooltip placement={placement} className="shortcut-tooltip">
        <span className="shortcut-tooltip-label">{description}</span>
        <kbd className="shortcut-tooltip-kbd">{display}</kbd>
      </Tooltip>
    </TooltipTrigger>
  );
}

export default ShortcutTooltip;
