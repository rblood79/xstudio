import { memo } from "react";
import type { ComponentSpec, FieldDef } from "@xstudio/specs";
import {
  PropertyInput,
  PropertySelect,
  PropertySizeToggle,
  PropertySwitch,
} from "../../../components";
import { inferLabel } from "./inferLabel";

interface SpecFieldProps {
  field: FieldDef;
  spec: ComponentSpec<Record<string, unknown>>;
  currentProps: Record<string, unknown>;
  onUpdate: (updatedProps: Record<string, unknown>) => void;
}

export const SpecField = memo(function SpecField({
  field,
  spec,
  currentProps,
  onUpdate,
}: SpecFieldProps) {
  const fieldKey = "key" in field && field.key ? field.key : undefined;
  const label = field.label ?? inferLabel(fieldKey ?? field.type);
  const icon = field.icon;
  const buildUpdate = (key: string, value: unknown) =>
    field.derivedUpdateFn
      ? field.derivedUpdateFn(value, currentProps)
      : { [key]: value };

  switch (field.type) {
    case "variant": {
      const key = field.key ?? "variant";
      const options = Object.keys(spec.variants).map((value) => ({
        value,
        label: inferLabel(value),
      }));

      return (
        <PropertySelect
          label={label}
          value={String(currentProps[key] ?? spec.defaultVariant)}
          onChange={(value) => onUpdate(buildUpdate(key, value))}
          options={options}
          icon={icon}
        />
      );
    }

    case "size": {
      const key = field.key ?? "size";
      const sizeKeys = Object.keys(spec.sizes);
      const sizeOptions = (field.options ?? sizeKeys.map((value) => ({
        value,
        label: value.toUpperCase(),
      }))).map((option) => ({
        id: option.value,
        label: option.label,
      }));

      return (
        <PropertySizeToggle
          label={label}
          value={String(currentProps[key] ?? spec.defaultSize)}
          onChange={(value) => onUpdate(buildUpdate(key, value))}
          options={sizeOptions}
        />
      );
    }

    case "boolean":
      return (
        <PropertySwitch
          label={label}
          isSelected={Boolean(currentProps[field.key])}
          onChange={(checked) => onUpdate(buildUpdate(field.key, checked))}
          icon={icon}
        />
      );

    case "enum":
      return (
        <PropertySelect
          label={label}
          value={String(currentProps[field.key] ?? "")}
          onChange={(value) => {
            const normalizedValue =
              field.emptyToUndefined && value === ""
                ? undefined
                : field.valueTransform === "number"
                  ? Number(value)
                  : value;
            onUpdate(buildUpdate(field.key, normalizedValue));
          }}
          options={field.options}
          icon={icon}
        />
      );

    case "string":
      return (
        <PropertyInput
          label={label}
          value={String(currentProps[field.key] ?? "")}
          onChange={(value) => {
            const normalizedValue =
              field.emptyToUndefined && value === "" ? undefined : value;
            onUpdate(buildUpdate(field.key, normalizedValue));
          }}
          placeholder={field.placeholder}
          multiline={field.multiline}
          icon={icon}
        />
      );

    case "number":
      return (
        <PropertyInput
          label={label}
          type="number"
          value={String(currentProps[field.key] ?? "")}
          onChange={(value) => {
            const normalizedValue = value === "" ? undefined : Number(value);
            onUpdate(buildUpdate(field.key, normalizedValue));
          }}
          min={field.min}
          max={field.max}
          icon={icon}
        />
      );

    default:
      return null;
  }
});
