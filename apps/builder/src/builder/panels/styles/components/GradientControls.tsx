/**
 * GradientControls - 그래디언트 타입별 속성 편집 컨트롤
 *
 * Gradient Phase 2
 * - Linear: Rotation (0~360)
 * - Radial: Center X/Y, Radius width/height
 * - Angular: Center X/Y, Rotation
 *
 * @since 2026-02-10 Gradient Phase 2
 */

import { memo, useCallback } from 'react';
import type {
  FillItem,
  LinearGradientFillItem,
  RadialGradientFillItem,
  AngularGradientFillItem,
} from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';

import './GradientControls.css';

interface GradientControlsProps {
  fill: LinearGradientFillItem | RadialGradientFillItem | AngularGradientFillItem;
  onChange: (updates: Partial<FillItem>) => void;
}

function useNumberInput(
  onCommit: (value: number) => void,
  min: number,
  max: number,
) {
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed));
        onCommit(clamped);
      }
    },
    [onCommit, min, max],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  return { handleBlur, handleKeyDown };
}

const LinearControls = memo(function LinearControls({
  fill,
  onChange,
}: {
  fill: LinearGradientFillItem;
  onChange: (updates: Partial<FillItem>) => void;
}) {
  const handleRotation = useCallback(
    (value: number) => {
      onChange({ rotation: value } as Partial<LinearGradientFillItem>);
    },
    [onChange],
  );

  const { handleBlur, handleKeyDown } = useNumberInput(handleRotation, 0, 360);

  return (
    <>
      <span className="gradient-controls__label">Rotation</span>
      <div className="gradient-controls__row">
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={360}
          step={1}
          defaultValue={Math.round(fill.rotation)}
          key={fill.rotation}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label="Rotation"
        />
        <span className="gradient-controls__suffix">&deg;</span>
      </div>
    </>
  );
});

const RadialControls = memo(function RadialControls({
  fill,
  onChange,
}: {
  fill: RadialGradientFillItem;
  onChange: (updates: Partial<FillItem>) => void;
}) {
  const handleCenterX = useCallback(
    (value: number) => {
      onChange({
        center: { ...fill.center, x: value / 100 },
      } as Partial<RadialGradientFillItem>);
    },
    [fill.center, onChange],
  );

  const handleCenterY = useCallback(
    (value: number) => {
      onChange({
        center: { ...fill.center, y: value / 100 },
      } as Partial<RadialGradientFillItem>);
    },
    [fill.center, onChange],
  );

  const handleRadiusW = useCallback(
    (value: number) => {
      onChange({
        radius: { ...fill.radius, width: value / 100 },
      } as Partial<RadialGradientFillItem>);
    },
    [fill.radius, onChange],
  );

  const handleRadiusH = useCallback(
    (value: number) => {
      onChange({
        radius: { ...fill.radius, height: value / 100 },
      } as Partial<RadialGradientFillItem>);
    },
    [fill.radius, onChange],
  );

  const cxInput = useNumberInput(handleCenterX, 0, 100);
  const cyInput = useNumberInput(handleCenterY, 0, 100);
  const rwInput = useNumberInput(handleRadiusW, 0, 100);
  const rhInput = useNumberInput(handleRadiusH, 0, 100);

  return (
    <>
      <span className="gradient-controls__label">Center</span>
      <div className="gradient-controls__row">
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(fill.center.x * 100)}
          key={`cx-${fill.center.x}`}
          onBlur={cxInput.handleBlur}
          onKeyDown={cxInput.handleKeyDown}
          aria-label="Center X"
        />
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(fill.center.y * 100)}
          key={`cy-${fill.center.y}`}
          onBlur={cyInput.handleBlur}
          onKeyDown={cyInput.handleKeyDown}
          aria-label="Center Y"
        />
        <span className="gradient-controls__suffix">%</span>
      </div>
      <span className="gradient-controls__label">Radius</span>
      <div className="gradient-controls__row">
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(fill.radius.width * 100)}
          key={`rw-${fill.radius.width}`}
          onBlur={rwInput.handleBlur}
          onKeyDown={rwInput.handleKeyDown}
          aria-label="Radius width"
        />
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(fill.radius.height * 100)}
          key={`rh-${fill.radius.height}`}
          onBlur={rhInput.handleBlur}
          onKeyDown={rhInput.handleKeyDown}
          aria-label="Radius height"
        />
        <span className="gradient-controls__suffix">%</span>
      </div>
    </>
  );
});

const AngularControls = memo(function AngularControls({
  fill,
  onChange,
}: {
  fill: AngularGradientFillItem;
  onChange: (updates: Partial<FillItem>) => void;
}) {
  const handleCenterX = useCallback(
    (value: number) => {
      onChange({
        center: { ...fill.center, x: value / 100 },
      } as Partial<AngularGradientFillItem>);
    },
    [fill.center, onChange],
  );

  const handleCenterY = useCallback(
    (value: number) => {
      onChange({
        center: { ...fill.center, y: value / 100 },
      } as Partial<AngularGradientFillItem>);
    },
    [fill.center, onChange],
  );

  const handleRotation = useCallback(
    (value: number) => {
      onChange({ rotation: value } as Partial<AngularGradientFillItem>);
    },
    [onChange],
  );

  const cxInput = useNumberInput(handleCenterX, 0, 100);
  const cyInput = useNumberInput(handleCenterY, 0, 100);
  const rotInput = useNumberInput(handleRotation, 0, 360);

  return (
    <>
      <span className="gradient-controls__label">Center</span>
      <div className="gradient-controls__row">
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(fill.center.x * 100)}
          key={`cx-${fill.center.x}`}
          onBlur={cxInput.handleBlur}
          onKeyDown={cxInput.handleKeyDown}
          aria-label="Center X"
        />
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={100}
          step={1}
          defaultValue={Math.round(fill.center.y * 100)}
          key={`cy-${fill.center.y}`}
          onBlur={cyInput.handleBlur}
          onKeyDown={cyInput.handleKeyDown}
          aria-label="Center Y"
        />
        <span className="gradient-controls__suffix">%</span>
      </div>
      <span className="gradient-controls__label">Rotation</span>
      <div className="gradient-controls__row">
        <input
          type="number"
          className="gradient-controls__sub-input"
          min={0}
          max={360}
          step={1}
          defaultValue={Math.round(fill.rotation)}
          key={fill.rotation}
          onBlur={rotInput.handleBlur}
          onKeyDown={rotInput.handleKeyDown}
          aria-label="Rotation"
        />
        <span className="gradient-controls__suffix">&deg;</span>
      </div>
    </>
  );
});

export const GradientControls = memo(function GradientControls({
  fill,
  onChange,
}: GradientControlsProps) {
  return (
    <div className="gradient-controls">
      {fill.type === FillType.LinearGradient && (
        <LinearControls fill={fill as LinearGradientFillItem} onChange={onChange} />
      )}
      {fill.type === FillType.RadialGradient && (
        <RadialControls fill={fill as RadialGradientFillItem} onChange={onChange} />
      )}
      {fill.type === FillType.AngularGradient && (
        <AngularControls fill={fill as AngularGradientFillItem} onChange={onChange} />
      )}
    </div>
  );
});
