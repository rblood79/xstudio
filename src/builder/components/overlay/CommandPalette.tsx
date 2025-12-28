/**
 * CommandPalette - 커맨드 팔레트 컴포넌트
 *
 * Cmd+K로 열리는 검색 가능한 명령어 팔레트
 * 모든 단축키를 검색하고 실행할 수 있음
 *
 * @since Phase 7 구현 (2025-12-29)
 *
 * @example
 * ```tsx
 * // BuilderCore에서 사용
 * <CommandPalette />
 * ```
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DialogTrigger,
  Modal,
  Dialog,
  ListBox,
  ListBoxItem,
  ModalOverlay,
} from 'react-aria-components';
import { Search } from 'lucide-react';
import {
  SHORTCUT_DEFINITIONS,
  type ShortcutId,
} from '../../config/keyboardShortcuts';
import {
  formatShortcut,
  useKeyboardShortcutsRegistry,
  type ShortcutCategory,
} from '../../hooks/useKeyboardShortcutsRegistry';
import { iconProps } from '../../../utils/ui/uiConstants';
import './CommandPalette.css';

// ============================================
// Types
// ============================================

interface CommandItem {
  id: ShortcutId;
  label: string;
  category: ShortcutCategory;
  shortcut: string;
}

export interface CommandPaletteProps {
  /** 외부에서 상태 제어 시 사용 */
  isOpen?: boolean;
  /** 외부에서 상태 제어 시 사용 */
  onOpenChange?: (isOpen: boolean) => void;
}

// ============================================
// Constants
// ============================================

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  system: '시스템',
  navigation: '탐색',
  panels: '패널',
  canvas: '캔버스',
  tools: '도구',
  properties: '속성',
  events: '이벤트',
  nodes: '노드',
};

// ============================================
// Component
// ============================================

export function CommandPalette({
  isOpen: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CommandPaletteProps = {}) {
  // State
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Controlled vs Uncontrolled
  const isOpen = controlledOpen ?? internalOpen;

  // 열림 상태 변경 핸들러 (검색어 초기화 포함)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setSearch(''); // 열릴 때 검색어 초기화
      }
      if (controlledOnOpenChange) {
        controlledOnOpenChange(open);
      } else {
        setInternalOpen(open);
      }
    },
    [controlledOnOpenChange]
  );

  // 모든 명령어 목록 생성
  const allCommands: CommandItem[] = useMemo(() => {
    return Object.entries(SHORTCUT_DEFINITIONS).map(([id, def]) => ({
      id: id as ShortcutId,
      label: def.i18n?.ko || def.description,
      category: def.category,
      shortcut: formatShortcut({ key: def.key, modifier: def.modifier }),
    }));
  }, []);

  // 검색 결과 필터링
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands;

    const query = search.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.id.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        cmd.shortcut.toLowerCase().includes(query)
    );
  }, [allCommands, search]);

  // Cmd+K로 열기
  useKeyboardShortcutsRegistry(
    [
      {
        key: 'k',
        modifier: 'cmd',
        handler: () => {
          handleOpenChange(true);
        },
        preventDefault: true,
        priority: 95,
        category: 'system',
        description: 'Open command palette',
      },
    ],
    [handleOpenChange],
    { capture: true }
  );

  // 열릴 때 입력창에 포커스
  useEffect(() => {
    if (isOpen) {
      // 약간의 지연 후 포커스 (모달 애니메이션 완료 후)
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 명령 실행
  const executeCommand = useCallback(
    (commandId: ShortcutId) => {
      console.log(`[CommandPalette] Execute: ${commandId}`);

      // 팔레트 닫기
      handleOpenChange(false);

      // TODO: 실제 핸들러 실행
      // 현재는 로그만 출력
      // 실제 구현 시 useGlobalKeyboardShortcuts의 handlers를 공유하거나
      // 별도의 command registry를 만들어야 함
    },
    [handleOpenChange]
  );

  // 키보드 내비게이션
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleOpenChange(false);
      }
    },
    [handleOpenChange]
  );

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
      <ModalOverlay className="command-palette-overlay">
        <Modal className="command-palette-modal">
          <Dialog aria-label="Command Palette" onKeyDown={handleKeyDown}>
            {/* Search Input */}
            <div className="command-palette-search">
              <Search
                size={iconProps.size}
                className="command-palette-search-icon"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="명령어 검색..."
                className="command-palette-input"
                aria-label="Search commands"
              />
            </div>

            {/* Command List */}
            {filteredCommands.length > 0 ? (
              <ListBox
                aria-label="Commands"
                className="command-palette-list"
                selectionMode="single"
                onAction={(key) => executeCommand(key as ShortcutId)}
              >
                {filteredCommands.map((cmd) => (
                  <ListBoxItem
                    key={cmd.id}
                    id={cmd.id}
                    textValue={cmd.label}
                    className="command-palette-item"
                  >
                    <div className="command-palette-item-content">
                      <span className="command-palette-item-label">
                        {cmd.label}
                      </span>
                      <span className="command-palette-item-category">
                        {CATEGORY_LABELS[cmd.category]}
                      </span>
                    </div>
                    <kbd className="command-palette-kbd">{cmd.shortcut}</kbd>
                  </ListBoxItem>
                ))}
              </ListBox>
            ) : (
              <div className="command-palette-empty">
                "{search}"에 대한 결과가 없습니다
              </div>
            )}

            {/* Footer */}
            <div className="command-palette-footer">
              <div className="command-palette-hints">
                <span className="command-palette-hint">
                  <kbd>↑↓</kbd> 이동
                </span>
                <span className="command-palette-hint">
                  <kbd>↵</kbd> 실행
                </span>
                <span className="command-palette-hint">
                  <kbd>esc</kbd> 닫기
                </span>
              </div>
              <span>{filteredCommands.length}개 명령어</span>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

export default CommandPalette;
