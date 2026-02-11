/**
 * GradientEditor - 메인 그래디언트 편집기 컨테이너
 *
 * 설계문서 구조:
 * GradientEditor
 * ├── Select (Gradient SubType: Linear/Radial/Angular/Mesh)
 * ├── GradientBar (미리보기 + 스톱 드래그)
 * ├── ColorPickerPanel (활성 스톱 색상 편집)
 * ├── GradientControls (rotation/center/radius)
 * └── GradientStopList (스톱 목록)
 *
 * @since 2026-02-10 Gradient Phase 2
 */

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Key } from 'react-aria-components';
import { Select, SelectItem } from '@xstudio/shared/components';
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

/** 그래디언트 하위 타입 (Mesh 포함) */
type GradientSubType = FillType.LinearGradient | FillType.RadialGradient | FillType.AngularGradient | FillType.MeshGradient;

interface GradientEditorProps {
  fill: GradientFill;
  /** Canvas preview during drag (→ updateFillPreview → elementsMap만 업데이트, selectedElementProps 미변경) */
  onChange?: (updates: Partial<FillItem>) => void;
  onChangeEnd: (updates: Partial<FillItem>) => void;
  /** 그래디언트 하위 타입 변경 (Linear ↔ Radial ↔ Angular) */
  onSubTypeChange: (subType: GradientSubType) => void;
}

// ============================================
// Gradient SubType Select 옵션
// ============================================

const GRADIENT_SUB_TYPE_OPTIONS: { id: GradientSubType; name: string }[] = [
  { id: FillType.LinearGradient, name: 'Linear' },
  { id: FillType.RadialGradient, name: 'Radial' },
  { id: FillType.AngularGradient, name: 'Angular' },
  { id: FillType.MeshGradient, name: 'Mesh' },
];

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

  // 🚀 Performance: Solid color 방식 적용
  // 드래그 중: onChange → updateFillPreview → elementsMap만 업데이트 (Canvas 프리뷰)
  //            selectedElementProps 미변경 → fillsAtom 재계산 없음 → 부모 리렌더 없음
  // 드래그 종료: onChangeEnd → updateFill → 히스토리 + DB 저장
  // Stop 위치 드래그: localStops 상태로 핸들 위치 관리 + onChange로 Canvas 프리뷰
  // Color 드래그: ColorPickerPanelInner.localColor가 UI 담당 + onChange로 Canvas 프리뷰
  const [localStops, setLocalStops] = useState<GradientStop[]>(fill.stops);

  // 외부(store)에서 stops가 변경되면 로컬 상태 동기화
  useEffect(() => {
    setLocalStops(fill.stops);
  }, [fill.stops]);

  // Ref: stable callback에서 최신 localStops 접근 (dependency 없이)
  const localStopsRef = useRef(localStops);
  localStopsRef.current = localStops;

  const activeStop = localStops[activeStopIndex] ?? localStops[0];

  // 🚀 Performance: ColorPickerPanel에 전달하는 color는 안정적 참조 유지
  // ColorPickerPanel은 key={value}로 remount하므로, 드래그 중 color 변경 시
  // 이 값을 업데이트하면 매 프레임 remount 발생 → 극심한 랙
  // 드래그 중에는 committedStopColor를 유지하고, 종료 시에만 갱신
  const [committedStopColor, setCommittedStopColor] = useState(activeStop?.color ?? '#000000FF');

  // 활성 스톱이 변경되면 (다른 스톱 선택) committed color 동기화
  useEffect(() => {
    setCommittedStopColor(activeStop?.color ?? '#000000FF');
  }, [activeStopIndex, fill.stops]);

  const gradientCss = useMemo(() => buildGradientCss(localStops), [localStops]);

  // --- Gradient sub-type select ---
  const handleSubTypeChange = useCallback(
    (key: Key | null) => {
      const subType = key as GradientSubType | null;
      if (subType && subType !== fill.type) {
        onSubTypeChange(subType);
      }
    },
    [fill.type, onSubTypeChange],
  );

  // --- Stop drag (로컬 UI + Canvas preview) ---
  const handleStopMove = useCallback(
    (index: number, position: number) => {
      setLocalStops((prev) =>
        prev.map((s, i) => (i === index ? { ...s, position } : s)),
      );
      // Canvas preview (updateFillPreview → elementsMap만 업데이트)
      if (onChange) {
        const newStops = localStopsRef.current.map((s, i) =>
          i === index ? { ...s, position } : s,
        );
        onChange({ stops: newStops } as Partial<FillItem>);
      }
    },
    [onChange],
  );

  // --- Stop drag 종료 (store 커밋) ---
  const handleStopMoveEnd = useCallback(
    (index: number, position: number) => {
      const newStops = localStops.map((s, i) =>
        i === index ? { ...s, position } : s,
      );
      setLocalStops(newStops);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [localStops, onChangeEnd],
  );

  // --- Stop add ---
  const handleStopAdd = useCallback(
    (position: number) => {
      const color = getColorAtPosition(localStops, position);
      const newStops = [...localStops, { color, position }];
      setActiveStopIndex(newStops.length - 1);
      setLocalStops(newStops);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [localStops, onChangeEnd],
  );

  const handleStopAddFromList = useCallback(() => {
    const midPosition = localStops.length >= 2
      ? (localStops[localStops.length - 2].position + localStops[localStops.length - 1].position) / 2
      : 0.5;
    const color = getColorAtPosition(localStops, midPosition);
    const newStops = [...localStops, { color, position: midPosition }];
    setActiveStopIndex(newStops.length - 1);
    setLocalStops(newStops);
    onChangeEnd({ stops: newStops } as Partial<FillItem>);
  }, [localStops, onChangeEnd]);

  // --- Stop remove ---
  const handleStopRemove = useCallback(
    (index: number) => {
      if (localStops.length <= 2) return;
      const newStops = localStops.filter((_, i) => i !== index);
      const newIndex = Math.min(activeStopIndex, newStops.length - 1);
      setActiveStopIndex(newIndex);
      setLocalStops(newStops);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [localStops, activeStopIndex, onChangeEnd],
  );

  // --- Stop color change (Solid color 방식: Canvas preview만) ---
  // ColorPickerPanelInner의 localColor가 ColorArea/Slider UI 업데이트 담당
  // setLocalStops 미호출 → GradientEditor/GradientBar/GradientStopList 리렌더 없음
  // onChange → updateFillPreview → Canvas만 업데이트 (selectedElementProps 미변경)
  const handleColorChange = useCallback(
    (color: string) => {
      if (onChange) {
        const newStops = localStopsRef.current.map((s, i) =>
          i === activeStopIndex ? { ...s, color } : s,
        );
        onChange({ stops: newStops } as Partial<FillItem>);
      }
    },
    [activeStopIndex, onChange],
  );

  // --- Stop color change 종료 (store 커밋 + committedStopColor 갱신) ---
  const handleColorChangeEnd = useCallback(
    (color: string) => {
      const newStops = localStops.map((s, i) =>
        i === activeStopIndex ? { ...s, color } : s,
      );
      setLocalStops(newStops);
      setCommittedStopColor(color);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [localStops, activeStopIndex, onChangeEnd],
  );

  // --- Stop position from list ---
  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newStops = localStops.map((s, i) =>
        i === index ? { ...s, position } : s,
      );
      setLocalStops(newStops);
      onChangeEnd({ stops: newStops } as Partial<FillItem>);
    },
    [localStops, onChangeEnd],
  );

  // --- Stop select ---
  const handleStopSelect = useCallback((index: number) => {
    setActiveStopIndex(index);
  }, []);

  return (
    <div className="gradient-editor">
      <Select
        aria-label="Gradient type"
        size="sm"
        selectedKey={fill.type}
        onSelectionChange={handleSubTypeChange}
        items={GRADIENT_SUB_TYPE_OPTIONS}
        className="gradient-type-select"
      >
        {(item) => <SelectItem>{item.name}</SelectItem>}
      </Select>

      <GradientBar
        stops={localStops}
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
          value={committedStopColor}
          onChange={handleColorChange}
          onChangeEnd={handleColorChangeEnd}
        />
      )}

      <div className="gradient-editor__divider" />

      <GradientControls fill={fill} onChange={onChangeEnd} />

      <div className="gradient-editor__divider" />

      <GradientStopList
        stops={localStops}
        activeStopIndex={activeStopIndex}
        onStopSelect={handleStopSelect}
        onStopPositionChange={handleStopPositionChange}
        onStopAdd={handleStopAddFromList}
        onStopRemove={handleStopRemove}
      />
    </div>
  );
});
