import { Dialog as RACDialog, DialogProps } from 'react-aria-components';
import './styles/Dialog.css';

export function Dialog(props: DialogProps) {
  return <RACDialog {...props} className="react-aria-Dialog" />;
}
