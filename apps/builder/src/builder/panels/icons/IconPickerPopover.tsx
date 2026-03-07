/**
 * IconPickerPopover - 아이콘 검색/선택 팝오버
 *
 * Lucide 아이콘 그리드 + 검색
 * React Aria DialogTrigger + Popover 기반
 */

import { memo, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogTrigger, Popover, Input } from "react-aria-components";
import { IconPreview } from "./components/IconPreview";
import { useIconSearch } from "./hooks/useIconSearch";

const GRID_ICON_SIZE = 20;
const VISIBLE_ROWS = 8;
const CELL_SIZE = 32;

interface IconPickerPopoverProps {
  /** 현재 선택된 아이콘 이름 */
  value?: string;
  /** 아이콘 선택 콜백 */
  onSelect: (iconName: string) => void;
  /** 트리거 요소 */
  children: React.ReactNode;
}

export const IconPickerPopover = memo(function IconPickerPopover({
  value,
  onSelect,
  children,
}: IconPickerPopoverProps) {
  return (
    <DialogTrigger>
      {children}
      <Popover placement="bottom start" className="icon-picker-popover">
        <Dialog className="icon-picker-dialog">
          <IconPickerContent value={value} onSelect={onSelect} />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
});

const IconPickerContent = memo(function IconPickerContent({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (iconName: string) => void;
}) {
  const { query, setQuery, filteredIcons } = useIconSearch();
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleIconClick = useCallback(
    (name: string) => {
      onSelect(name);
    },
    [onSelect],
  );

  return (
    <>
      <div className="icon-picker-search">
        <Input
          ref={searchRef}
          placeholder="Search icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="icon-picker-search-input"
          aria-label="Search icons"
        />
      </div>
      <div className="icon-picker-count">{filteredIcons.length} icons</div>
      <div
        ref={gridRef}
        className="icon-picker-grid"
        role="listbox"
        aria-label="Icons"
        style={{
          maxHeight: VISIBLE_ROWS * CELL_SIZE,
        }}
      >
        {filteredIcons.map((name) => (
          <button
            key={name}
            role="option"
            aria-selected={name === value}
            className={`icon-picker-item${name === value ? " selected" : ""}`}
            title={name}
            onClick={() => handleIconClick(name)}
          >
            <IconPreview name={name} size={GRID_ICON_SIZE} />
          </button>
        ))}
      </div>
    </>
  );
});
