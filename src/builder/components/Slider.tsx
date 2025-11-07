import {
    Label,
    Slider as AriaSlider,
    SliderOutput,
    SliderProps as AriaSliderProps,
    SliderThumb,
    SliderTrack,
    composeRenderProps
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { ComponentSizeSubset, SliderVariant } from '../../types/componentVariants';

import './styles/Slider.css';

export interface SliderProps<T> extends AriaSliderProps<T> {
    label?: string;
    thumbLabels?: string[];
    /**
     * Visual variant of the slider
     * @default 'default'
     */
    variant?: SliderVariant;
    /**
     * Size of the slider
     * @default 'md'
     */
    size?: ComponentSizeSubset;
}

const sliderStyles = tv({
    base: 'react-aria-Slider',
    variants: {
        variant: {
            default: '',
            primary: 'primary',
            secondary: 'secondary',
            surface: 'surface',
        },
        size: {
            sm: 'sm',
            md: 'md',
            lg: 'lg',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'md',
    },
});

export function Slider<T extends number | number[]>(
    { label, thumbLabels, variant = 'default', size = 'md', ...props }: SliderProps<T>
) {
    const sliderClassName = composeRenderProps(
        props.className,
        (className) => sliderStyles({ variant, size, className })
    );

    return (
        <AriaSlider {...props} className={sliderClassName}>
            {label && <Label>{label}</Label>}
            <SliderOutput>
                {({ state }) =>
                    state.values.map((_, i) => state.getThumbValueLabel(i)).join(' – ')}
            </SliderOutput>
            <SliderTrack>
                {({ state }) =>
                    state.values.map((_, i) => (
                        <SliderThumb key={i} index={i} aria-label={thumbLabels?.[i]} />
                    ))}
            </SliderTrack>
        </AriaSlider>
    );
}
