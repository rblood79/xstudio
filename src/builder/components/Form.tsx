import {Form as RACForm, FormProps} from 'react-aria-components';
import './styles/Form.css';

export function Form(props: FormProps) {
  return <RACForm {...props} className="react-aria-Form" />;
}
