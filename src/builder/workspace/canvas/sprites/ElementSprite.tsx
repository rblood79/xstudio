/**
 * Element Sprite
 *
 * 🚀 Phase 10 B1.2: Element 타입별 스프라이트 디스패처
 *
 * Element의 tag에 따라 적절한 Sprite 컴포넌트로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

import { memo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import { BoxSprite } from './BoxSprite';
import { TextSprite } from './TextSprite';
import { ImageSprite } from './ImageSprite';

// ============================================
// Types
// ============================================

export interface ElementSpriteProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onDoubleClick?: (elementId: string) => void;
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

// Note: TEXT_TAGS, IMAGE_TAGS에 포함되지 않은 모든 태그는 BoxSprite로 렌더링됨

// ============================================
// Sprite Type Detection
// ============================================

type SpriteType = 'box' | 'text' | 'image';

function getSpriteType(tag: string): SpriteType {
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
 * Element의 tag에 따라 적절한 Sprite를 렌더링합니다.
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
}: ElementSpriteProps) {
  const spriteType = getSpriteType(element.tag);

  switch (spriteType) {
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
