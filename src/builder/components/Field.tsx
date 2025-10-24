import React from "react";
import { FieldErrorProps, Group, GroupProps, InputProps, LabelProps, FieldError as RACFieldError, Input as RACInput, Label as RACLabel, TextProps, Text as RACText } from "react-aria-components";
import type { FieldType } from "../../types/unified";

import "./styles/Field.css";

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

/**
 * DataField 컴포넌트 Props
 */
export interface DataFieldProps {
  /** 데이터 키 (예: "name", "email") */
  fieldKey?: string;
  /** 표시 레이블 */
  label?: string;
  /** 데이터 타입 */
  type?: FieldType;
  /** 데이터 값 */
  value?: unknown;
  /** 레이블 표시 여부 (기본: true) */
  showLabel?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 인라인 스타일 */
  style?: React.CSSProperties;
  /** 자식 요소 (커스텀 렌더링) */
  children?: React.ReactNode;
}

/**
 * DataField 컴포넌트
 *
 * ListBox, Select 등의 Collection 컴포넌트에서 데이터 필드를 표시하는 컴포넌트입니다.
 * 타입에 따라 적절한 포맷으로 데이터를 렌더링합니다.
 *
 * @example
 * ```tsx
 * <DataField fieldKey="name" label="이름" type="string" value="John Doe" />
 * <DataField fieldKey="email" label="이메일" type="email" value="john@example.com" />
 * <DataField fieldKey="avatar" type="image" value="https://example.com/avatar.jpg" />
 * ```
 */
export function DataField({
  fieldKey,
  label,
  type = "string",
  value,
  showLabel = true,
  className = "",
  style,
  children,
}: DataFieldProps): React.ReactElement {
  // 자식 요소가 있으면 우선 렌더링
  if (children) {
    return (
      <div
        className={`data-field data-field-custom ${className}`}
        style={style}
        data-field-key={fieldKey}
      >
        {showLabel && label && <span className="data-field-label">{label}</span>}
        <div className="data-field-value">{children}</div>
      </div>
    );
  }

  // 타입별 렌더링
  const renderValue = () => {
    // null/undefined 처리
    if (value === null || value === undefined) {
      return <span className="data-field-value-empty">-</span>;
    }

    switch (type) {
      case "boolean":
        return (
          <span className="data-field-value-boolean">
            {value ? "✓" : "✗"}
          </span>
        );

      case "number":
        return (
          <span className="data-field-value-number">
            {typeof value === "number" ? value.toLocaleString() : String(value)}
          </span>
        );

      case "date":
        return (
          <span className="data-field-value-date">
            {value instanceof Date
              ? value.toLocaleDateString()
              : String(value)}
          </span>
        );

      case "email":
        return (
          <a
            href={`mailto:${value}`}
            className="data-field-value-email"
            onClick={(e) => e.stopPropagation()}
          >
            {String(value)}
          </a>
        );

      case "url":
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="data-field-value-url"
            onClick={(e) => e.stopPropagation()}
          >
            {String(value)}
          </a>
        );

      case "image":
        return (
          <img
            src={String(value)}
            alt={label || fieldKey || "image"}
            className="data-field-value-image"
            loading="lazy"
          />
        );

      case "string":
      default:
        return <span className="data-field-value-string">{String(value)}</span>;
    }
  };

  return (
    <div
      className={`data-field data-field-${type} ${className}`}
      style={style}
      data-field-key={fieldKey}
    >
      {showLabel && label && <span className="data-field-label">{label}:</span>}
      <div className="data-field-value">{renderValue()}</div>
    </div>
  );
}
