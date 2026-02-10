/**
 * GradientEditor - 메인 그래디언트 편집기 컨테이너
 *
 * 설계문서 구조:
 * GradientEditor
 * ├── GradientTypeToggle [Linear] [Radial] [Angular]
 * ├── GradientBar (미리보기 + 스톱 드래그)
 * ├── ColorPickerPanel (활성 스톱 색상 편집)
 * ├── GradientControls (rotation/center/radius)
 * └── GradientStopList (스톱 목록)
 *
 * @since 2026-02-10 Gradient Phase 2
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { ArrowUpRight, Target, RotateCw, type LucideIcon } from 'lucide-react';
import type {
  FillItem,
  GradientStop,
  LinearGradientFillItem,
  RadialGradientFillItem,
  AngularGradientFillItem,
} from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import { hex8ToRgba, rgbaToHex8 } from '../utils/colorUtils';
import { GradientBar } from './GradientBar';
import { ColorPickerPanel } from './ColorPickerPanel';
import { GradientControls } from './GradientControls';
import { GradientStopList } from './GradientStopList';

import './GradientEditor.css';

type GradientFill =
  | LinearGradientFillItem
  | RadialGradientFillItem
  | AngularGradientFillItem;

/** 그래디언트 하위 타입 */
type GradientSubType = FillType.LinearGradient | FillType.RadialGradient | FillType.AngularGradient;

interface GradientEditorProps {
  fill: GradientFill;
  onChange: (updates: Partial<FillItem>) => void;
  onChangeEnd: (updates: Partial<FillItem>) => void;
  /** 그래디언트 하위 타입 변경 (Linear ↔ Radial ↔ Angular) */
  onSubTypeChange: (subType: GradientSubType) => void;
}

// ============================================
// GradientTypeToggle (내부 컴포넌트)
// ============================================

const GRADIENT_SUB_TYPES: { type: GradientSubType; label: string; icon: LucideIcon }[] = [
  { type: FillType.LinearGradient, label: 'Linear', icon: ArrowUpRight },
  { type: FillType.RadialGradient, label: 'Radial', icon: Target },
  { type: FillType.AngularGradient, label: 'Angular', icon: RotateCw },
];

const GradientTypeToggle = memo(function GradientTypeToggle({
  value,
  onChange,
}: {
  value: GradientSubType;
  onChange: (type: GradientSubType) => void;
}) {
  return (
    <div className="gradient-type-toggle" role="radiogroup" aria-label="Gradient type">
      {GRADIENT_SUB_TYPES.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          className="gradient-type-toggle__btn"
          role="radio"
          aria-checked={value === type}
          aria-label={label}
          data-active={value === type || undefined}
          onClick={() => onChange(type)}
          title={label}
        >
          <Icon size={12} strokeWidth={2} />
          <span className="gradient-type-toggle__label">{label}</span>
        </button>
      ))}
    </div>
  );
});

// ============================================
// 유틸리티
// ============================================

/**
 * 스톱 배열에서 CSS 그래디언트 문자열 생성
 * (미리보기 바 전용: 항상 90deg linear)
 */
function buildGradientCss(stops: GradientStop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const parts = sorted.map(
    (s) => `${s.color.slice(0, 7)} ${(s.position * 100).toFixed(1)}%`,
  );
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

/** 두 hex8 색상의 선형 보간 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hex8ToRgba(color1);
  const c2 = hex8ToRgba(color2);
  return rgbaToHex8({
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
    a: c1.a + (c2.a - c1.a) * t,
  });
}

/** 지정된 position에서의 보간 색상 계산 */
function getColorAtPosition(stops: GradientStop[], position: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return '#000000FF';
  if (position <= sorted[0].position) return sorted[0].color;
  if (position >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (position >= sorted[i].position && position <= sorted[i + 1].position) {
      const range = sorted[i + 1].position - sorted[i].position;
      const t = range === 0 ? 0 : (position - sorted[i].position) / range;
      return interpolateColor(sorted[i].color, sorted[i + 1].color, t);
    }
  }
  return sorted[sorted.length - 1].color;
}

// ============================================
// 메인 컴포넌트
// ============================================

export const GradientEditor = memo(function GradientEditor({
  fill,
  onChange,
  onChangeEnd,
  onSubTypeChange,
}: GradientEditorProps) {
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  const stops = fill.stops;
  const activeStop = stops[activeStopIndex] ?? stops[0];

  const gradientCss = useMemo(() => buildGradientCss(stops), [stops]);

  // --- Gradient sub-type toggle ---
  const handleSubTypeChange = useCallback(
    (subType: GradientSubType) => {
      if (subType !== fill.type) {
        onSubTypeChange(subType);
      }
    },
    [fill.type, onSubTypeChange],
  );

  // --- Stop drag ---
  const handleStopMove = useCallback(
    (index: number, position: number) => {
      const newStops = stops.map((s, i) =>
        i === index ? { ...s, position } : s,
      );
      onChange({ stops: newStops } as Partial<FillItem>);
    },
    [stops, onChange],
  );

  const handleStopMoveEnd = useCallback(
    (index: number, position: number) => {
      const newStops = stops.map((s, i) =>
        i === index ? { ...s, position } : s,
      );
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [stops, onChangeEnd],
  );

  // --- Stop add ---
  const handleStopAdd = useCallback(
    (position: number) => {
      const color = getColorAtPosition(stops, position);
      const newStops = [...stops, { color, position }];
      setActiveStopIndex(newStops.length - 1);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [stops, onChangeEnd],
  );

  const handleStopAddFromList = useCallback(() => {
    const midPosition = stops.length >= 2
      ? (stops[stops.length - 2].position + stops[stops.length - 1].position) / 2
      : 0.5;
    const color = getColorAtPosition(stops, midPosition);
    const newStops = [...stops, { color, position: midPosition }];
    setActiveStopIndex(newStops.length - 1);
    onChangeEnd({ stops: newStops } as Partial<FillItem>);
  }, [stops, onChangeEnd]);

  // --- Stop remove ---
  const handleStopRemove = useCallback(
    (index: number) => {
      if (stops.length <= 2) return;
      const newStops = stops.filter((_, i) => i !== index);
      const newIndex = Math.min(activeStopIndex, newStops.length - 1);
      setActiveStopIndex(newIndex);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [stops, activeStopIndex, onChangeEnd],
  );

  // --- Stop color change ---
  const handleColorChange = useCallback(
    (color: string) => {
      const newStops = stops.map((s, i) =>
        i === activeStopIndex ? { ...s, color } : s,
      );
      onChange({ stops: newStops } as Partial<FillItem>);
    },
    [stops, activeStopIndex, onChange],
  );

  const handleColorChangeEnd = useCallback(
    (color: string) => {
      const newStops = stops.map((s, i) =>
        i === activeStopIndex ? { ...s, color } : s,
      );
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [stops, activeStopIndex, onChangeEnd],
  );

  // --- Stop position from list ---
  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newStops = stops.map((s, i) =>
        i === index ? { ...s, position } : s,
      );
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [stops, onChangeEnd],
  );

  // --- Stop select ---
  const handleStopSelect = useCallback((index: number) => {
    setActiveStopIndex(index);
  }, []);

  return (
    <div className="gradient-editor">
      <GradientTypeToggle
        value={fill.type as GradientSubType}
        onChange={handleSubTypeChange}
      />

      <GradientBar
        stops={stops}
        gradientCss={gradientCss}
        activeStopIndex={activeStopIndex}
        onStopSelect={handleStopSelect}
        onStopMove={handleStopMove}
        onStopMoveEnd={handleStopMoveEnd}
        onStopAdd={handleStopAdd}
        onStopRemove={handleStopRemove}
      />

      {activeStop && (
        <ColorPickerPanel
          value={activeStop.color}
          onChange={handleColorChange}
          onChangeEnd={handleColorChangeEnd}
        />
      )}

      <div className="gradient-editor__divider" />

      <GradientControls fill={fill} onChange={onChangeEnd} />

      <div className="gradient-editor__divider" />

      <GradientStopList
        stops={stops}
        activeStopIndex={activeStopIndex}
        onStopSelect={handleStopSelect}
        onStopPositionChange={handleStopPositionChange}
        onStopAdd={handleStopAddFromList}
        onStopRemove={handleStopRemove}
      />
    </div>
  );
});
