import {
  Switch as AriaSwitch,
  SwitchProps as AriaSwitchProps
} from 'react-aria-components';
import './styles/Switch.css';

export interface SwitchProps extends Omit<AriaSwitchProps, 'children'> {
  children: React.ReactNode;
}

export function Switch({ children, ...props }: SwitchProps) {
  return (
    (
      <AriaSwitch {...props} className='react-aria-Switch'>
        <div className="indicator" />
        {children}
      </AriaSwitch>
    )
  );
}
