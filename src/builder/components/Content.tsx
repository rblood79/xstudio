import {
  Heading as AriaHeading,
  HeadingProps,
  Text as AriaText,
  TextProps,
} from "react-aria-components";

import './styles/Content.css';

export function Heading(props: HeadingProps) {
  return <AriaHeading {...props} className="react-aria-Heading" />;
}

export function Text(props: TextProps) {
  return <AriaText {...props} className="react-aria-Text" />;
}
