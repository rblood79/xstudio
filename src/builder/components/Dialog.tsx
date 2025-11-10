import { Dialog as RACDialog, DialogProps } from 'react-aria-components';
import './styles/Dialog.css';

/**
 * Dialog Component
 *
 * A dialog component that should be used within a Modal overlay.
 * The Modal component handles focus management, so this component
 * focuses on content structure and accessibility.
 *
 * Features:
 * - Semantic HTML structure
 * - Proper ARIA attributes (role="dialog")
 * - Keyboard accessibility (inherited from Modal)
 *
 * @example
 * <Modal>
 *   <Dialog>
 *     <Heading>Dialog Title</Heading>
 *     <p>Dialog content goes here</p>
 *     <Button onPress={close}>Close</Button>
 *   </Dialog>
 * </Modal>
 */
export function Dialog(props: DialogProps) {
  return <RACDialog {...props} className="react-aria-Dialog" />;
}
