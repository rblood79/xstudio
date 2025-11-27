import {
    Radio as AriaRadio,
    RadioProps as AriaRadioProps,
    composeRenderProps
} from 'react-aria-components';
import { useFocusRing } from '@react-aria/focus';
import { mergeProps } from '@react-aria/utils';
import { tv } from 'tailwind-variants';

import './styles/Radio.css';

export interface RadioProps extends AriaRadioProps {
    children?: React.ReactNode;
}

const radioStyles = tv({
  base: 'react-aria-Radio',
  variants: {
    isFocusVisible: {
      true: 'focus-visible',
      false: '',
    },
  },
});

export function Radio({
    children,
    ...props
}: RadioProps) {
    const { focusProps, isFocusVisible } = useFocusRing();

    return (
        <AriaRadio
            {...mergeProps(props, focusProps)}
            data-focus-visible={isFocusVisible}
            className={composeRenderProps(
                props.className,
                (className, renderProps) => radioStyles({
                    ...renderProps,
                    isFocusVisible,
                    className
                })
            )}
        >
            {children}
        </AriaRadio>
    );
} 