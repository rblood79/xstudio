/**
 * FillTypeSelector - Fill 대분류 탭 선택기
 *
 * 설계문서 기준: [Color] [Gradient] [Image] 3탭 구조
 * 공유 ToggleButtonGroup (React-Aria) 기반으로 UI 일관성 확보
 *
 * @since 2026-02-10 Color Picker Phase 1
 * @updated 2026-02-11 ToggleButtonGroup 전환
 */

import { memo, useCallback } from 'react';
import { ToggleButtonGroup, ToggleButton } from '@xstudio/shared/components';
import { Circle, Blend, Image } from 'lucide-react';
import type { Selection } from 'react-aria-components';

import './FillTypeSelector.css';

/** 대분류 Fill 카테고리 */
export type FillCategory = 'color' | 'gradient' | 'image';

interface FillTypeSelectorProps {
  value: FillCategory;
  onChange: (category: FillCategory) => void;
}

export const FillTypeSelector = memo(function FillTypeSelector({
  value,
  onChange,
}: FillTypeSelectorProps) {
  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === 'all') return;
      const selected = Array.from(keys)[0] as FillCategory | undefined;
      if (selected) onChange(selected);
    },
    [onChange],
  );

  return (
    <ToggleButtonGroup
      aria-label="Fill type"
      selectionMode="single"
      disallowEmptySelection
      indicator
      variant="primary"
      selectedKeys={new Set([value])}
      onSelectionChange={handleSelectionChange}
      className="fill-type-selector"
    >
      <ToggleButton id="color">
        <Circle size={14} strokeWidth={2} />
        <span>Color</span>
      </ToggleButton>
      <ToggleButton id="gradient">
        <Blend size={14} strokeWidth={2} />
        <span>Gradient</span>
      </ToggleButton>
      <ToggleButton id="image">
        <Image size={14} strokeWidth={2} />
        <span>Image</span>
      </ToggleButton>
    </ToggleButtonGroup>
  );
});
