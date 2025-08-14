import { Dialog as RACDialog, DialogProps } from 'react-aria-components';
import './components.css';

export function Dialog(props: DialogProps) {
  return <RACDialog {...props} className="react-aria-Dialog" />;
}
