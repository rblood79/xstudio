import React from 'react';
import { FieldErrorProps, Group, GroupProps, InputProps, LabelProps, FieldError as RACFieldError, Input as RACInput, Label as RACLabel, TextProps, Text as RACText } from "react-aria-components";


export function Label(props: LabelProps) {
  return <RACLabel {...props} className="react-aria-Label" />;
}

export function Text(props: TextProps) {
  return <RACText {...props} className="react-aria-Text" />;
}

export function Description(props: TextProps) {
  return <RACText {...props} slot="description" className="react-aria-Description" />;
}

export function FieldError(props: FieldErrorProps) {
  return <RACFieldError {...props} className="react-aria-FieldError" />
}

export function FieldGroup(props: GroupProps) {
  return <Group {...props} className='react-aria-FieldGroup' />;
}

export function Input(props: InputProps) {
  return <RACInput {...props} className="react-aria-Input" />
}
