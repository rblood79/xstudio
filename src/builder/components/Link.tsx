import {
  composeRenderProps,
  Link as RACLink,
  LinkProps as RACLinkProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import type {
  ButtonVariant,
  ComponentSize,
} from "../../types/builder/componentVariants.types";
import "./styles/Link.css";

export interface LinkProps extends RACLinkProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  /**
   * Whether the link is external (opens in new tab)
   * Automatically adds rel="noopener noreferrer" for security
   */
  isExternal?: boolean;
  /**
   * Whether to show external link icon
   */
  showExternalIcon?: boolean;
}

const link = tv({
  base: "react-aria-Link",
  variants: {
    variant: {
      default: "",
      primary: "primary",
      secondary: "secondary",
      surface: "surface",
      outline: "outline",
      ghost: "ghost",
    },
    size: {
      xs: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    },
    isFocusVisible: {
      true: "focus-visible",
      false: "",
    },
    isExternal: {
      true: "external",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export function Link(props: LinkProps) {
  const { focusProps, isFocusVisible } = useFocusRing();
  const { isExternal, showExternalIcon = true, ...restProps } = props;

  // External link security: automatically add rel="noopener noreferrer"
  const externalProps = isExternal
    ? {
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : {};

  const allProps = mergeProps(restProps as object, focusProps as object, externalProps);

  return (
    <RACLink
      {...(allProps as RACLinkProps)}
      data-focus-visible={isFocusVisible}
      data-external={isExternal}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => {
          return link({
            ...renderProps,
            variant: props.variant,
            size: props.size,
            isFocusVisible,
            isExternal,
            className,
          });
        }
      )}
    >
      {composeRenderProps(props.children, (children) => (
        <>
          {children}
          {isExternal && showExternalIcon && (
            <svg
              className="link-external-icon"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          )}
        </>
      ))}
    </RACLink>
  );
}
