import React from "react";
import { tv } from "tailwind-variants";
import type { CardVariant, ComponentSizeSubset } from "../../types/builder/componentVariants.types";
import './styles/Card.css';

export type CardAssetType = 'file' | 'folder' | 'image' | 'video' | 'audio';
export type CardOrientation = 'horizontal' | 'vertical';

export interface CardProps {
  id?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;

  // Variants & Styling
  variant?: CardVariant | 'gallery' | 'quiet';
  size?: ComponentSizeSubset;
  orientation?: CardOrientation;
  isQuiet?: boolean;
  isDisabled?: boolean;

  // Selection
  isSelectable?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelectionChange?: (isSelected: boolean) => void;

  // Content
  heading?: string;
  subheading?: string;
  title?: string;
  description?: string;
  footer?: string | React.ReactNode;

  // Asset
  asset?: CardAssetType;
  assetSrc?: string;
  preview?: string; // Image preview URL

  // Actions
  actions?: React.ReactNode;

  // Interactions
  onClick?: () => void;
  onPress?: () => void;
  href?: string;
  target?: '_blank' | '_self';

  // Accessibility
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  role?: string;
}

const card = tv({
  base: "react-aria-Card",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      surface: "surface",
      elevated: "elevated",
      outlined: "outlined",
      gallery: "gallery",
      quiet: "quiet",
    },
    size: {
      sm: "sm",
      md: "md",
      lg: "lg",
    },
    orientation: {
      horizontal: "horizontal",
      vertical: "vertical",
    },
    isQuiet: {
      true: "quiet",
    },
    isDisabled: {
      true: "disabled",
    },
    isSelectable: {
      true: "selectable",
    },
    isSelected: {
      true: "selected",
    },
    isFocused: {
      true: "focused",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    orientation: "vertical",
  },
});

// Asset Icon Component
function AssetIcon({ type }: { type: CardAssetType }) {
  const icons = {
    file: '📄',
    folder: '📁',
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
  };

  return <span className="card-asset-icon">{icons[type]}</span>;
}

export function Card({
  id,
  children,
  className,
  style,
  variant = "default",
  size = "md",
  orientation = "vertical",
  isQuiet = false,
  isDisabled = false,
  isSelectable = false,
  isSelected = false,
  isFocused = false,
  onSelectionChange,
  heading,
  subheading,
  title,
  description,
  footer,
  asset,
  assetSrc,
  preview,
  actions,
  onClick,
  onPress,
  href,
  target,
  role,
  ...props
}: CardProps) {
  const handleClick = () => {
    if (isDisabled) return;

    if (isSelectable && onSelectionChange) {
      onSelectionChange(!isSelected);
    }

    onClick?.();
    onPress?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const cardClassName = card({
    variant,
    size,
    orientation,
    isQuiet,
    isDisabled,
    isSelectable,
    isSelected,
    isFocused,
    className,
  });

  const CardElement = href ? 'a' : 'div';

  const elementProps = {
    id,
    className: cardClassName,
    style,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    role: role || (isSelectable ? 'button' : href ? 'link' : undefined),
    tabIndex: isDisabled ? -1 : (isSelectable || onClick || href) ? 0 : undefined,
    'aria-disabled': isDisabled,
    'aria-selected': isSelectable ? isSelected : undefined,
    ...(href ? { href, target } : {}),
    ...props,
  };

  return (
    <CardElement {...elementProps}>
      {/* Asset Section (for gallery/file variants) */}
      {asset && (
        <div className="card-asset">
          {assetSrc ? (
            <img src={assetSrc} alt={title || heading || ''} className="card-asset-image" />
          ) : (
            <AssetIcon type={asset} />
          )}
        </div>
      )}

      {/* Preview Image (for gallery variant) */}
      {preview && variant === 'gallery' && (
        <div className="card-preview">
          <img src={preview} alt={title || heading || ''} className="card-preview-image" />
        </div>
      )}

      {/* Header Section */}
      {(heading || subheading || title) && (
        <div className="card-header">
          {heading && <div className="card-heading">{heading}</div>}
          {subheading && <div className="card-subheading">{subheading}</div>}
          {title && !heading && <div className="card-title">{title}</div>}

          {/* Actions Menu (top-right) */}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}

      {/* Content Section */}
      <div className="card-content">
        {description && <div className="card-description">{description}</div>}
        {children}
      </div>

      {/* Footer Section */}
      {footer && (
        <div className="card-footer">
          {typeof footer === 'string' ? <span>{footer}</span> : footer}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelectable && isSelected && (
        <div className="card-selection-indicator" aria-hidden="true">
          <span className="selection-checkmark">✓</span>
        </div>
      )}
    </CardElement>
  );
}

export { Card as MyCard };
