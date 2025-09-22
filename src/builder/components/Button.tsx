import { composeRenderProps, Button as RACButton, ButtonProps as RACButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';
import './components.css'; // 기존 CSS import 유지

export interface ButtonProps extends RACButtonProps {
  variant?: 'primary' | 'secondary' | 'surface' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const button = tv({
  extend: focusRing,
  base: 'react-aria-Button',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      surface: 'surface',
      outline: 'outline',
      ghost: 'ghost',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'sm',
  }
});

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      type={props.type} // Add this line to pass the type prop
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          const generatedClass = button({ ...renderProps, variant: props.variant, size: props.size, className });
          return generatedClass;
        }
      )}
    />
  );
}

export { Slider } from './Slider';
