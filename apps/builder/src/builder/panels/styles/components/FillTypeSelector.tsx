/**
 * FillTypeSelector - Fill 대분류 탭 선택기
 *
 * 설계문서 기준: [Color] [Gradient] [Image] 3탭 구조
 * Pencil 앱 스타일 popover 상단 탭
 *
 * @since 2026-02-10 Color Picker Phase 1
 * @updated 2026-02-10 Phase 2 - 3탭 구조로 재설계
 */

import { memo, useCallback } from 'react';
import { Circle, Blend, Image, type LucideIcon } from 'lucide-react';

import './FillTypeSelector.css';

/** 대분류 Fill 카테고리 */
export type FillCategory = 'color' | 'gradient' | 'image';

interface FillTypeSelectorProps {
  value: FillCategory;
  onChange: (category: FillCategory) => void;
}

const FILL_CATEGORIES: { category: FillCategory; label: string; icon: LucideIcon; disabled: boolean }[] = [
  { category: 'color', label: 'Color', icon: Circle, disabled: false },
  { category: 'gradient', label: 'Gradient', icon: Blend, disabled: false },
  { category: 'image', label: 'Image', icon: Image, disabled: true },
];

export const FillTypeSelector = memo(function FillTypeSelector({
  value,
  onChange,
}: FillTypeSelectorProps) {
  const handleClick = useCallback(
    (category: FillCategory) => {
      onChange(category);
    },
    [onChange],
  );

  return (
    <div className="fill-type-selector" role="tablist" aria-label="Fill type">
      {FILL_CATEGORIES.map(({ category, label, icon: Icon, disabled }) => (
        <button
          key={category}
          type="button"
          className="fill-type-selector__btn"
          role="tab"
          aria-selected={value === category}
          aria-label={label}
          data-active={value === category || undefined}
          disabled={disabled}
          onClick={() => handleClick(category)}
          title={disabled ? `${label} (coming soon)` : label}
        >
          <Icon size={14} strokeWidth={2} />
          <span className="fill-type-selector__label">{label}</span>
        </button>
      ))}
    </div>
  );
});
