import { memo } from "react";
import type { ComponentSpec, FieldDef } from "@xstudio/specs";
import {
  PropertyIconPicker,
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
  const getValueAtPath = (path: readonly string[]) =>
    path.reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === "object" && segment in acc) {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, currentProps);

  const buildPathUpdate = (path: readonly string[], value: unknown) => {
    const [head, ...rest] = path;

    if (!head) {
      return {};
    }

    if (rest.length === 0) {
      return { [head]: value };
    }

    const currentHead =
      currentProps[head] && typeof currentProps[head] === "object"
        ? (currentProps[head] as Record<string, unknown>)
        : {};

    let nestedValue: unknown = value;
    for (let index = rest.length - 1; index >= 0; index -= 1) {
      const segment = rest[index];
      nestedValue = { [segment]: nestedValue };
    }

    return {
      [head]: {
        ...currentHead,
        ...(nestedValue as Record<string, unknown>),
      },
    };
  };

  const resolveCurrentValue = (key: string) =>
    field.updatePath ? getValueAtPath(field.updatePath) : currentProps[key];

  const buildUpdate = (key: string, value: unknown) => {
    if (field.derivedUpdateFn) {
      return field.derivedUpdateFn(value, currentProps);
    }

    if (field.updatePath) {
      return buildPathUpdate(field.updatePath, value);
    }

    return { [key]: value };
  };

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
          value={String(resolveCurrentValue(key) ?? spec.defaultVariant)}
          onChange={(value) => onUpdate(buildUpdate(key, value))}
          options={options}
          icon={icon}
        />
      );
    }

    case "size": {
      const key = field.key ?? "size";
      const sizeKeys = Object.keys(spec.sizes);
      const sizeOptions = (
        field.options ??
        sizeKeys.map((value) => ({
          value,
          label: value.toUpperCase(),
        }))
      ).map((option) => ({
        id: option.value,
        label: option.label,
      }));

      return (
        <PropertySizeToggle
          label={label}
          value={String(resolveCurrentValue(key) ?? spec.defaultSize)}
          onChange={(value) => onUpdate(buildUpdate(key, value))}
          options={sizeOptions}
        />
      );
    }

    case "boolean":
      return (
        <PropertySwitch
          label={label}
          isSelected={Boolean(resolveCurrentValue(field.key))}
          onChange={(checked) => onUpdate(buildUpdate(field.key, checked))}
          icon={icon}
        />
      );

    case "enum":
      return (
        <PropertySelect
          label={label}
          value={String(resolveCurrentValue(field.key) ?? "")}
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
          value={String(resolveCurrentValue(field.key) ?? "")}
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
          value={String(resolveCurrentValue(field.key) ?? "")}
          onChange={(value) => {
            const normalizedValue = value === "" ? undefined : Number(value);
            onUpdate(buildUpdate(field.key, normalizedValue));
          }}
          min={field.min}
          max={field.max}
          icon={icon}
        />
      );

    case "icon": {
      const handleIconChange = (iconName: string) => {
        onUpdate(buildUpdate(field.key, iconName));
      };
      const handleIconClear = () => {
        const updates: Record<string, unknown> = { [field.key]: undefined };
        if (field.clearKeys) {
          for (const clearKey of field.clearKeys) {
            updates[clearKey] = undefined;
          }
        }
        onUpdate(updates);
      };
      return (
        <PropertyIconPicker
          label={label}
          value={resolveCurrentValue(field.key) as string | undefined}
          onChange={handleIconChange}
          onClear={handleIconClear}
        />
      );
    }

    default:
      return null;
  }
});
