import {
  Button as RACButton,
  type ButtonProps as RACButtonProps,
} from "react-aria-components";
import "./SwatchIconButton.css";

export interface SwatchIconButtonProps extends Omit<
  RACButtonProps,
  "className"
> {
  /** Additional CSS class */
  className?: string;
}

export function SwatchIconButton({
  className,
  children,
  ...props
}: SwatchIconButtonProps) {
  return (
    <RACButton
      {...props}
      className={
        className ? `swatch-icon-button ${className}` : "swatch-icon-button"
      }
    >
      <span className="swatch-icon-inner">{children}</span>
    </RACButton>
  );
}
