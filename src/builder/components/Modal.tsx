import { Modal as RACModal, ModalOverlayProps } from 'react-aria-components';
import './styles/Modal.css';

export function Modal(props: ModalOverlayProps) {
  return <RACModal {...props} className="react-aria-Modal" />;
}
