import { memo, useCallback, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type {
  ItemsManagerField,
  ItemsManagerFieldItemSchema,
} from "@composition/specs";
import { useStore } from "../../../stores";
import { EVENT_REGISTRY } from "../../../../types/events/events.registry";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyIconPicker,
} from "../../../components";

// ADR-055: EVENT_REGISTRY에서 select 옵션 파생
const EVENT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "— none —" },
  ...Object.entries(EVENT_REGISTRY).map(([key, def]) => ({
    value: key,
    label: def.label,
  })),
];

interface ItemsManagerProps {
  elementId: string;
  field: ItemsManagerField;
}

interface ItemRowProps {
  itemId: string;
  item: Record<string, unknown>;
  schema: ItemsManagerFieldItemSchema[];
  labelKey: string;
  onUpdate: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}

const ItemRow = memo(function ItemRow({
  itemId: _itemId,
  item,
  schema,
  labelKey,
  onUpdate,
  onRemove,
}: ItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const label = String(item[labelKey] ?? "—");

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate({ [key]: value });
    },
    [onUpdate],
  );

  return (
    <div className="items-manager-row">
      <div className="items-manager-row-header">
        <button
          className="tab-edit-button items-manager-expand"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="tab-title">{label}</span>
        <button
          className="tab-edit-button"
          aria-label="Remove item"
          onClick={onRemove}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div className="items-manager-row-fields">
          {schema.map((schemaField) => {
            const currentValue = item[schemaField.key];

            switch (schemaField.type) {
              case "string":
                return (
                  <PropertyInput
                    key={schemaField.key}
                    label={schemaField.label}
                    value={String(currentValue ?? "")}
                    onChange={(value) =>
                      handleFieldChange(
                        schemaField.key,
                        value === "" ? undefined : value,
                      )
                    }
                  />
                );

              case "boolean":
                return (
                  <PropertySwitch
                    key={schemaField.key}
                    label={schemaField.label}
                    isSelected={Boolean(currentValue)}
                    onChange={(checked) =>
                      handleFieldChange(schemaField.key, checked)
                    }
                  />
                );

              case "icon":
                return (
                  <PropertyIconPicker
                    key={schemaField.key}
                    label={schemaField.label}
                    value={currentValue as string | undefined}
                    onChange={(iconName) =>
                      handleFieldChange(schemaField.key, iconName || undefined)
                    }
                    onClear={() =>
                      handleFieldChange(schemaField.key, undefined)
                    }
                  />
                );

              case "event-id":
                return (
                  <PropertySelect
                    key={schemaField.key}
                    label={schemaField.label}
                    value={String(currentValue ?? "")}
                    onChange={(value) =>
                      handleFieldChange(
                        schemaField.key,
                        value === "" ? undefined : value,
                      )
                    }
                    options={EVENT_OPTIONS}
                  />
                );

              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
});

const EMPTY_ITEMS: Record<string, unknown>[] = [];

export const ItemsManager = memo(function ItemsManager({
  elementId,
  field,
}: ItemsManagerProps) {
  const itemsKey = field.itemsKey;
  const labelKey = field.labelKey ?? "label";

  const rawItems = useStore((state) => {
    const el = state.elementsMap.get(elementId);
    const val = (el?.props as Record<string, unknown> | undefined)?.[itemsKey];
    return Array.isArray(val)
      ? (val as Record<string, unknown>[])
      : EMPTY_ITEMS;
  });

  const handleAdd = useCallback(() => {
    void useStore
      .getState()
      .addItem(elementId, itemsKey, field.defaultItem as Record<string, unknown>);
  }, [elementId, itemsKey, field.defaultItem]);

  const handleRemove = useCallback(
    (itemId: string) => {
      void useStore.getState().removeItem(elementId, itemsKey, itemId);
    },
    [elementId, itemsKey],
  );

  const handleUpdate = useCallback(
    (itemId: string, patch: Record<string, unknown>) => {
      void useStore.getState().updateItem(elementId, itemsKey, itemId, patch);
    },
    [elementId, itemsKey],
  );

  return (
    <div className="children-manager">
      <div className="tab-overview">
        <p className="tab-overview-text">Total: {rawItems.length}</p>
      </div>

      {rawItems.length > 0 && (
        <div className="tabs-list">
          {rawItems.map((item) => {
            const itemId = String(item.id ?? "");
            return (
              <ItemRow
                key={itemId}
                itemId={itemId}
                item={item}
                schema={field.itemSchema}
                labelKey={labelKey}
                onUpdate={(patch) => handleUpdate(itemId, patch)}
                onRemove={() => handleRemove(itemId)}
              />
            );
          })}
        </div>
      )}

      <div className="tab-actions">
        <button className="control-button add" onClick={handleAdd}>
          <Plus size={14} />
          Add {field.itemTypeName}
        </button>
      </div>
    </div>
  );
});
