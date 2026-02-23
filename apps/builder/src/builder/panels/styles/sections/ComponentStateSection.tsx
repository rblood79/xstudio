/**
 * ComponentStateSection - 컴포넌트 상태 미리보기 섹션
 *
 * 선택된 컴포넌트의 상태(hover, pressed, focused, disabled 등)를
 * 캔버스에서 미리볼 수 있는 드롭다운을 제공한다.
 *
 * spec이 있는 컴포넌트가 선택된 경우에만 표시된다.
 */

import { memo, useCallback } from 'react';
import { useAtom } from 'jotai';
import { previewComponentStateAtom } from '../atoms/componentStateAtom';
import { PropertySelect } from '../../../components';
import { Activity } from 'lucide-react';
import type { ComponentState } from '@xstudio/specs';

const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'hover', label: 'Hover' },
  { value: 'pressed', label: 'Pressed' },
  { value: 'focused', label: 'Focused' },
  { value: 'disabled', label: 'Disabled' },
];

interface ComponentStateSectionProps {
  hasSpec: boolean;
}

export const ComponentStateSection = memo(function ComponentStateSection({
  hasSpec,
}: ComponentStateSectionProps) {
  const [previewState, setPreviewState] = useAtom(previewComponentStateAtom);

  const handleChange = useCallback(
    (value: string) => {
      if (!value || value === 'default') {
        setPreviewState(null);
      } else {
        setPreviewState(value as ComponentState);
      }
    },
    [setPreviewState],
  );

  if (!hasSpec) return null;

  return (
    <div className="property-row">
      <PropertySelect
        label="State"
        icon={Activity}
        value={previewState ?? 'default'}
        onChange={handleChange}
        options={STATE_OPTIONS}
      />
    </div>
  );
});
