import {
    Radio as AriaRadio,
    RadioProps as AriaRadioProps,
} from 'react-aria-components';

import './components.css';

export interface RadioProps extends AriaRadioProps {
    children?: React.ReactNode;
}

export function Radio({
    children,
    ...props
}: RadioProps) {
    return (
        <AriaRadio {...props} className='react-aria-Radio'>
            {children}
        </AriaRadio>
    );
} 