import { Modal as RACModal, ModalOverlayProps } from 'react-aria-components';
import './components.css';

export function Modal(props: ModalOverlayProps) {
  return <RACModal {...props} className="react-aria-Modal" />;
}
