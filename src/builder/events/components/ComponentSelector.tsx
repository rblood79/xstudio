import {
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Label,
} from "react-aria-components";
import { useComponentRegistry } from "@/builder/stores/componentRegistry";

export interface ComponentSelectorProps {
  /** Selected component ID (customId or element ID) */
  value?: string;

  /** Callback when selection changes */
  onChange: (componentId: string) => void;

  /** Optional: Filter by component type */
  filterByType?: string[];

  /** Optional: Label text */
  label?: string;

  /** Optional: Placeholder text */
  placeholder?: string;
}

/**
 * ComponentSelector - 페이지 내 컴포넌트 선택 UI
 *
 * Component Registry에서 사용 가능한 컴포넌트 목록을 가져와 선택할 수 있게 합니다.
 *
 * @example
 * <ComponentSelector
 *   value={config.targetId}
 *   onChange={(targetId) => updateConfig({ targetId })}
 *   filterByType={["ListBox", "GridList"]}
 *   label="Target Component"
 * />
 */
export function ComponentSelector({
  value,
  onChange,
  filterByType,
  label = "Target Component",
  placeholder = "Select a component",
}: ComponentSelectorProps) {
  const components = useComponentRegistry((state) => state.components);

  // 타입 필터 적용
  const filteredComponents = filterByType
    ? components.filter((c) => filterByType.includes(c.tag))
    : components;

  // 타입별로 그룹화
  const componentsByType = filteredComponents.reduce(
    (acc, component) => {
      if (!acc[component.tag]) {
        acc[component.tag] = [];
      }
      acc[component.tag].push(component);
      return acc;
    },
    {} as Record<string, typeof filteredComponents>
  );

  return (
    <div className="component-selector">
      <div className="field">
        <Label className="field-label">{label}</Label>
        <Select
          selectedKey={value || ""}
          onSelectionChange={(key) => onChange(key as string)}
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              <ListBoxItem key="" id="">
                {placeholder}
              </ListBoxItem>

              {Object.entries(componentsByType).map(([type, components]) => (
                <div key={type} className="component-group">
                  <div className="group-header">{type}</div>
                  {components.map((component) => (
                    <ListBoxItem
                      key={component.customId || component.id}
                      id={component.customId || component.id}
                    >
                      {component.customId || `${component.tag} (${component.id.slice(0, 8)})`}
                    </ListBoxItem>
                  ))}
                </div>
              ))}

              {filteredComponents.length === 0 && (
                <ListBoxItem key="empty" id="empty" isDisabled>
                  No components available
                  {filterByType && ` (filtered by: ${filterByType.join(", ")})`}
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {value && (
        <p className="field-hint">
          Selected:{" "}
          {filteredComponents.find(
            (c) => c.customId === value || c.id === value
          )?.customId || value}
        </p>
      )}
    </div>
  );
}
