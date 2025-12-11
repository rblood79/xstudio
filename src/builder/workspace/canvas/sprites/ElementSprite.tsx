/**
 * Element Sprite
 *
 * 🚀 Phase 10 B1.2: Element 타입별 스프라이트 디스패처
 * 🚀 Phase 11 B2.5: Layout 컨테이너 및 UI 컴포넌트 확장
 *
 * Element의 tag와 style에 따라 적절한 Sprite 컴포넌트로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-11 Phase 11 B2.5 - Layout/UI 확장
 */

import { memo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import { BoxSprite } from './BoxSprite';
import { TextSprite } from './TextSprite';
import { ImageSprite } from './ImageSprite';
import { PixiButton, PixiCheckbox, PixiRadio } from '../ui';
import { isFlexContainer, isGridContainer } from '../layout';
import type { CSSStyle } from './styleConverter';

// ============================================
// Types
// ============================================

export interface ElementSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

// ============================================
// Tag to Sprite Mapping
// ============================================

/**
 * 텍스트 관련 태그들
 */
const TEXT_TAGS = new Set([
  'Text',
  'Heading',
  'Label',
  'Paragraph',
  'Link',
  'Strong',
  'Em',
  'Code',
  'Pre',
  'Blockquote',
  'ListItem',
]);

/**
 * 이미지 관련 태그들
 */
const IMAGE_TAGS = new Set(['Image', 'Avatar', 'Logo', 'Icon', 'Thumbnail']);

/**
 * UI 컴포넌트 태그들 (Phase 11 B2.4)
 */
const UI_BUTTON_TAGS = new Set(['Button', 'FancyButton', 'SubmitButton']);
const UI_CHECKBOX_TAGS = new Set(['Checkbox', 'CheckBox', 'Switch', 'Toggle']);
const UI_RADIO_TAGS = new Set(['RadioGroup', 'Radio']);

// Note: TEXT_TAGS, IMAGE_TAGS, UI_*_TAGS에 포함되지 않은 모든 태그는 BoxSprite로 렌더링됨

// ============================================
// Sprite Type Detection
// ============================================

type SpriteType = 'box' | 'text' | 'image' | 'button' | 'checkbox' | 'radio' | 'flex' | 'grid';

function getSpriteType(element: Element): SpriteType {
  const tag = element.tag;
  const style = element.props?.style as CSSStyle | undefined;

  // UI 컴포넌트 우선 체크 (Phase 11 B2.4)
  if (UI_BUTTON_TAGS.has(tag)) return 'button';
  if (UI_CHECKBOX_TAGS.has(tag)) return 'checkbox';
  if (UI_RADIO_TAGS.has(tag)) return 'radio';

  // 레이아웃 컨테이너 체크 (Phase 11 B2.5)
  // display: flex/grid인 경우에도 현재는 BoxSprite로 렌더링
  // (레이아웃 계산은 별도로 처리)
  if (isFlexContainer(element)) return 'flex';
  if (isGridContainer(element)) return 'grid';

  // 기본 타입
  if (TEXT_TAGS.has(tag)) return 'text';
  if (IMAGE_TAGS.has(tag)) return 'image';

  return 'box';
}

// ============================================
// Component
// ============================================

/**
 * ElementSprite
 *
 * Element의 tag와 style에 따라 적절한 Sprite를 렌더링합니다.
 *
 * @example
 * <ElementSprite
 *   element={element}
 *   isSelected={selectedIds.includes(element.id)}
 *   onClick={handleElementClick}
 * />
 */
export const ElementSprite = memo(function ElementSprite({
  element,
  isSelected,
  onClick,
  onDoubleClick,
  onChange,
}: ElementSpriteProps) {
  const spriteType = getSpriteType(element);

  switch (spriteType) {
    // UI 컴포넌트 (Phase 11 B2.4)
    case 'button':
      return (
        <PixiButton
          element={element}
          isSelected={isSelected}
          onClick={onClick}
        />
      );

    case 'checkbox':
      return (
        <PixiCheckbox
          element={element}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, checked) => onChange(id, checked) : undefined}
        />
      );

    case 'radio':
      return (
        <PixiRadio
          element={element}
          isSelected={isSelected}
          onClick={onClick}
          onChange={onChange ? (id, value) => onChange(id, value) : undefined}
        />
      );

    // 레이아웃 컨테이너 (Phase 11 B2.5)
    // Flex/Grid 컨테이너도 BoxSprite로 렌더링 (배경/테두리 표시)
    // 실제 레이아웃 계산은 BuilderCanvas에서 @pixi/layout으로 처리
    case 'flex':
    case 'grid':
      return <BoxSprite element={element} isSelected={isSelected} onClick={onClick} />;

    // 기본 타입
    case 'text':
      return (
        <TextSprite
          element={element}
          isSelected={isSelected}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      );

    case 'image':
      return <ImageSprite element={element} isSelected={isSelected} onClick={onClick} />;

    case 'box':
    default:
      return <BoxSprite element={element} isSelected={isSelected} onClick={onClick} />;
  }
});

export default ElementSprite;
