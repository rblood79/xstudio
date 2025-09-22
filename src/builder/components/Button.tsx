import { Button as AriaButton, ButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { forwardRef } from 'react';
import './components.css'; // 기존 CSS import 유지

const buttonVariants = tv({
  base: 'px-4 py-2 rounded-md font-medium transition-colors',
  variants: {
    variant: {
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      surface: 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200',
    },
    size: {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <AriaButton
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Slider } from './Slider';
