import { ToggleButton as RACToggleButton, ToggleButtonProps } from 'react-aria-components';
import './styles/ToggleButton.css';

export function ToggleButton(props: ToggleButtonProps) {
  return <RACToggleButton {...props} className='react-aria-ToggleButton' />;
}
