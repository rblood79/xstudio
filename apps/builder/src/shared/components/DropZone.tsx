import {
  DropZone as AriaDropZone,
  DropZoneProps as AriaDropZoneProps,
  Text,
  composeRenderProps
} from 'react-aria-components';

import { Upload } from 'lucide-react';
import type { ComponentSize } from '../../types/componentVariants';

import './styles/DropZone.css';

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export type DropZoneVariant = 'default' | 'primary' | 'dashed';

export interface DropZoneProps extends AriaDropZoneProps {
  /**
   * M3 variant
   * @default 'default'
   */
  variant?: DropZoneVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  /**
   * Label text displayed in the drop zone
   */
  label?: string;
  /**
   * Description text
   */
  description?: string;
}

/**
 * DropZone Component with Material Design 3 support
 *
 * M3 Features:
 * - 3 variants: default, primary, dashed
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Drag and drop file handling
 * - Visual feedback on drag over
 * - Accessible keyboard interaction
 * - Custom content support
 *
 * @example
 * <DropZone variant="dashed" onDrop={handleDrop}>
 *   <Text slot="label">Drop files here</Text>
 * </DropZone>
 */
export function DropZone({
  variant = 'default',
  size = 'md',
  label,
  description,
  children,
  ...props
}: DropZoneProps) {
  const dropZoneClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      const classes = ['react-aria-DropZone'];
      if (className) classes.push(className);
      if (renderProps.isDropTarget) classes.push('is-drop-target');
      if (renderProps.isFocusVisible) classes.push('is-focus-visible');
      return classes.join(' ');
    }
  );

  return (
    <AriaDropZone
      {...props}
      className={dropZoneClassName}
      data-variant={variant}
      data-size={size}
    >
      {children || (
        <div className="dropzone-content">
          <Upload className="dropzone-icon" />
          {label && <Text slot="label">{label}</Text>}
          {description && <Text slot="description">{description}</Text>}
        </div>
      )}
    </AriaDropZone>
  );
}
