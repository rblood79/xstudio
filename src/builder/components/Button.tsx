import { Button as RACButton, ButtonProps } from 'react-aria-components';
import './components.css';

export function Button(props: ButtonProps) {
  return <RACButton {...props} className='react-aria-Button' />;
}

export * from './Slider';
