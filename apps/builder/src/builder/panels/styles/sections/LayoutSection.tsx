/**
 * LayoutSection - Layout 스타일 편집 섹션
 *
 * Flex direction, Alignment, Gap, Padding, Margin 편집
 * 4방향 확장 모드: direction-alignment-grid 스타일 패턴 사용
 *
 * 🚀 Phase 3: Jotai 기반 Fine-grained Reactivity
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 */

import { useState, memo } from 'react';
import { PropertySection, PropertyUnitInput } from '../../../components';
import { ToggleButton, ToggleButtonGroup, Button } from '../../../../shared/components';
import { Input } from 'react-aria-components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import {
  Square,
  Maximize2,
  Minimize2,
  Frame,
  LayoutGrid,
  SquareSquare,
  StretchHorizontal,
  StretchVertical,
  AlignHorizontalSpaceAround,
  GalleryHorizontal,
  WrapText,
  CornerDownLeft,
  ArrowRightToLine,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useLayoutValuesJotai } from '../hooks/useLayoutValuesJotai';
import { useResetStyles } from '../hooks/useResetStyles';
import { useAtomValue } from 'jotai';
import {
  flexDirectionKeysAtom,
  flexAlignmentKeysAtom,
  justifyContentSpacingKeysAtom,
  flexWrapKeysAtom,
} from '../atoms/styleAtoms';

// 4방향 값 추출은 이제 useLayoutValues 훅에서 처리됨

/**
 * 4방향 입력 그리드 컴포넌트
 * direction-alignment-grid 스타일 패턴 사용
 */
interface FourWayGridProps {
  values: { top: string; right: string; bottom: string; left: string };
  onChange: (direction: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => void;
  allowNegative?: boolean;
}

function FourWayGrid({ values, onChange }: FourWayGridProps) {
  const handleChange = (direction: 'Top' | 'Right' | 'Bottom' | 'Left', inputValue: string) => {
    // 숫자만 추출하고 px 단위 추가
    const numericValue = inputValue.replace(/[^0-9.-]/g, '');
    if (numericValue === '' || numericValue === '-') {
      onChange(direction, '');
    } else {
      onChange(direction, `${numericValue}px`);
    }
  };

  const getDisplayValue = (value: string) => {
    // px 제거하고 숫자만 표시
    return value.replace('px', '');
  };

  return (
    <div className="four-way-grid">
      <Input
        className="react-aria-Input four-way-top"
        value={getDisplayValue(values.top)}
        onChange={(e) => handleChange('Top', e.target.value)}
        placeholder="T"
        aria-label="Top"
      />
      <Input
        className="react-aria-Input four-way-left"
        value={getDisplayValue(values.left)}
        onChange={(e) => handleChange('Left', e.target.value)}
        placeholder="L"
        aria-label="Left"
      />
      <Input
        className="react-aria-Input four-way-right"
        value={getDisplayValue(values.right)}
        onChange={(e) => handleChange('Right', e.target.value)}
        placeholder="R"
        aria-label="Right"
      />
      <Input
        className="react-aria-Input four-way-bottom"
        value={getDisplayValue(values.bottom)}
        onChange={(e) => handleChange('Bottom', e.target.value)}
        placeholder="B"
        aria-label="Bottom"
      />
    </div>
  );
}

/**
 * 🚀 Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 * - 🚀 selectedElementAtom 직접 구독 제거 - alignment atoms 사용
 */
const LayoutSectionContent = memo(function LayoutSectionContent() {
  const [isSpacingExpanded, setIsSpacingExpanded] = useState(false);

  const {
    handleFlexDirection,
    handleFlexAlignment,
    handleJustifyContentSpacing,
    handleFlexWrap,
  } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStyleRAF, updateStyleIdle } = useOptimizedStyleActions();

  // 🚀 Phase 3: Jotai atom에서 직접 값 구독
  const styleValues = useLayoutValuesJotai();

  // 🚀 Phase 3: alignment keys atoms 사용 (selectedElementAtom 직접 구독 제거)
  const flexDirectionKeys = useAtomValue(flexDirectionKeysAtom);
  const flexAlignmentKeys = useAtomValue(flexAlignmentKeysAtom);
  const justifyContentSpacingKeys = useAtomValue(justifyContentSpacingKeysAtom);
  const flexWrapKeys = useAtomValue(flexWrapKeysAtom);

  // 🚀 Phase 1: FourWayGrid는 타이핑이므로 Idle 업데이트 사용
  const handlePaddingChange = (direction: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => {
    updateStyleIdle(`padding${direction}`, value);
  };

  const handleMarginChange = (direction: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => {
    updateStyleIdle(`margin${direction}`, value);
  };

  if (!styleValues) return null;

  // 4방향 값은 훅에서 가져옴
  const paddingValues = {
    top: styleValues.paddingTop,
    right: styleValues.paddingRight,
    bottom: styleValues.paddingBottom,
    left: styleValues.paddingLeft,
  };
  const marginValues = {
    top: styleValues.marginTop,
    right: styleValues.marginRight,
    bottom: styleValues.marginBottom,
    left: styleValues.marginLeft,
  };

  return (
    <>
      <div className="layout-direction">
        <div className="direction-controls flex-direction">
          <legend className="fieldset-legend">Direction</legend>
          <ToggleButtonGroup
            aria-label="Flex direction"
            indicator
            selectedKeys={flexDirectionKeys}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              handleFlexDirection(value);
            }}
          >
            <ToggleButton id="block">
              <Square
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
            <ToggleButton id="row">
              <StretchVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
            <ToggleButton id="column">
              <StretchHorizontal
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="direction-alignment-grid flex-alignment">
          <legend className="fieldset-legend">Alignment</legend>
          <ToggleButtonGroup
            aria-label="Flex alignment"
            indicator
            selectionMode="single"
            selectedKeys={flexAlignmentKeys}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                // 🚀 Phase 3: styleValues에서 직접 값 사용
                handleFlexAlignment(value, styleValues.flexDirection);
              }
            }}
          >
            <ToggleButton id="leftTop">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="centerTop">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="rightTop">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="leftCenter">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="centerCenter">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="rightCenter">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="leftBottom">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="centerBottom">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="rightBottom">
              <span className="alignment-dot" />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="fieldset-actions">
          <Button>
            <LayoutGrid
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </Button>
        </div>
        <div className="justify-control justify-content">
          <legend className="fieldset-legend">Justify</legend>
          <ToggleButtonGroup
            aria-label="Justify content alignment"
            indicator
            selectionMode="single"
            selectedKeys={justifyContentSpacingKeys}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                handleJustifyContentSpacing(value);
              }
            }}
          >
            <ToggleButton id="space-around">
              <AlignHorizontalSpaceAround
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
            <ToggleButton id="space-between">
              <GalleryHorizontal
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
            <ToggleButton id="space-evenly">
              <AlignHorizontalSpaceAround
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="justify-control flex-wrap">
          <legend className="fieldset-legend">Wrap</legend>
          <ToggleButtonGroup
            aria-label="Flex wrap"
            indicator
            selectionMode="single"
            selectedKeys={flexWrapKeys}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                handleFlexWrap(value);
              }
            }}
          >
            <ToggleButton id="wrap">
              <WrapText
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
            <ToggleButton id="wrap-reverse">
              <CornerDownLeft
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
            <ToggleButton id="nowrap">
              <ArrowRightToLine
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <PropertyUnitInput
          icon={LayoutGrid}
          label="Gap"
          className="displayGap"
          value={styleValues.gap}
          units={['reset', 'px', 'rem', 'em']}
          onChange={(value) => updateStyleImmediate('gap', value)}
          onDrag={(value) => updateStyleRAF('gap', value)}
          min={0}
          max={500}
        />
      </div>

      {/* Spacing Section: Padding & Margin */}
      {!isSpacingExpanded ? (
        /* 축소 모드: 단일 입력 */
        <div className="layout-container">
          <PropertyUnitInput
            icon={SquareSquare}
            label="Padding"
            className="padding"
            value={styleValues.padding}
            units={['reset', 'px', 'rem', 'em']}
            onChange={(value) => updateStyleImmediate('padding', value)}
            onDrag={(value) => updateStyleRAF('padding', value)}
            min={0}
            max={500}
          />
          <PropertyUnitInput
            icon={Frame}
            label="Margin"
            className="margin"
            value={styleValues.margin}
            units={['reset', 'px', 'rem', 'em']}
            onChange={(value) => updateStyleImmediate('margin', value)}
            onDrag={(value) => updateStyleRAF('margin', value)}
            min={0}
            max={500}
          />
          <div className="fieldset-actions actions-spacing">
            <Button
              onPress={() => setIsSpacingExpanded(true)}
              aria-label="Expand spacing to 4-way input"
            >
              <Maximize2
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>
        </div>
      ) : (
        /* 확장 모드: 4방향 그리드 입력 */
        <div className="layout-container layout-container-expanded">
          <fieldset className="properties-aria property-unit-input layout-padding">
            <legend className="fieldset-legend">Padding</legend>
            <div className="react-aria-Group layout-spacing">
              <FourWayGrid
                values={paddingValues}
                onChange={handlePaddingChange}
              />
            </div>
          </fieldset>
          <fieldset className="properties-aria property-unit-input layout-margin">
            <legend className="fieldset-legend">Margin</legend>
            <div className="react-aria-Group layout-spacing">
              <FourWayGrid
                values={marginValues}
                onChange={handleMarginChange}
                allowNegative
              />
            </div>
          </fieldset>
          <div className="fieldset-actions actions-spacing">
            <Button
              onPress={() => setIsSpacingExpanded(false)}
              aria-label="Collapse spacing to single input"
            >
              <Minimize2
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>
        </div>
      )}
    </>
  );
});

/**
 * LayoutSection - 외부 래퍼
 * - PropertySection만 관리
 * - 🚀 Phase 3: Jotai 기반 - props 불필요
 * - 🚀 Phase 4.2c: useResetStyles 경량 훅 사용
 */
export const LayoutSection = memo(function LayoutSection() {
  const resetStyles = useResetStyles();

  const handleReset = () => {
    resetStyles([
      'display', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'gap',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    ]);
  };

  return (
    <PropertySection id="layout" title="Layout" onReset={handleReset}>
      <LayoutSectionContent />
    </PropertySection>
  );
});
