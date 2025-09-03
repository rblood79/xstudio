import React from 'react';
import { FieldErrorProps, Group, GroupProps, InputProps, LabelProps, FieldError as RACFieldError, Input as RACInput, Label as RACLabel, Text, TextProps } from "react-aria-components";


export function Label(props: LabelProps) {
  return <RACLabel {...props} className="react-aria-Label" />;
}

export function Description(props: TextProps) {
  return <Text {...props} slot="description" className="react-aria-Text" />;
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
