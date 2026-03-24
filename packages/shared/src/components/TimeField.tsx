/**
 * TimeField Component - Material Design 3
 *
 * M3 Variants: primary, secondary, tertiary, error, filled
 * Sizes: sm, md, lg
 */

import {
  DateInput,
  DateSegment,
  FieldError,
  Label,
  Text,
  TimeField as AriaTimeField,
  TimeFieldProps as AriaTimeFieldProps,
  TimeValue,
  ValidationResult,
  composeRenderProps,
} from "react-aria-components";
import type { ComponentSize } from "../types";
import { type NecessityIndicator, renderNecessityIndicator } from "./Field";

import "./styles/TimeField.css";

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface TimeFieldProps<
  T extends TimeValue,
> extends AriaTimeFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /**
   * 시간 형식
   * - 12: 12시간 형식 (AM/PM)
   * - 24: 24시간 형식
   * @default 24
   */
  hourCycle?: 12 | 24;
  /**
   * 플레이스홀더 텍스트
   */
  placeholder?: string;
  // S2 props
  variant?: string;
  size?: ComponentSize;
  necessityIndicator?: NecessityIndicator;
}

export function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  hourCycle = 24,
  placeholder,
  variant = "default",
  size = "md",
  necessityIndicator,
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField
      {...props}
      className={composeRenderProps(props.className, (className) =>
        className
          ? `react-aria-TimeField ${className}`
          : "react-aria-TimeField",
      )}
      data-variant={variant}
      data-size={size}
      hourCycle={hourCycle}
    >
      {label && (
        <Label>
          {label}
          {renderNecessityIndicator(necessityIndicator, props.isRequired)}
        </Label>
      )}
      <DateInput className="react-aria-DateInput inset">
        {(segment) => (
          <DateSegment
            segment={segment}
            data-placeholder={!segment.isPlaceholder ? undefined : placeholder}
          />
        )}
      </DateInput>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTimeField>
  );
}
