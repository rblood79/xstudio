<!-- Source: https://react-spectrum.adobe.com/react-spectrum/TreeView.html -->
<!-- Last fetched: 2026-04-05 -->

# TreeView

A TreeView provides users with a way to navigate nested hierarchical information in a tree structure.

```tsx
import { TreeView, TreeViewItem } from "@adobe/react-spectrum";
```

## Basic Example

```jsx
<TreeView
  aria-label="Example tree with static contents"
  defaultExpandedKeys={["documents", "photos"]}
  height="size-4600"
  maxWidth="size-6000"
>
  <TreeViewItem id="documents" textValue="Documents">
    <TreeViewItemContent>
      <Text>Documents</Text>
      <Folder />
    </TreeViewItemContent>
    <TreeViewItem id="project-a" textValue="Project A">
      <TreeViewItemContent>
        <Text>Project A</Text>
        <Folder />
      </TreeViewItemContent>
    </TreeViewItem>
  </TreeViewItem>
</TreeView>
```

## Dynamic Collections

```jsx
type MyItem = {
  id: string;
  name: string;
  icon: JSX.Element;
  childItems?: MyItem[];
};

const DynamicTreeItem = (props) => (
  <TreeViewItem id={props.id} textValue={props.name}>
    <TreeViewItemContent>
      <Text>{props.name}</Text>
      {props.icon}
    </TreeViewItemContent>
    <Collection items={props.childItems}>
      {(item) => <DynamicTreeItem {...item} />}
    </Collection>
  </TreeViewItem>
);

<TreeView
  aria-label="Dynamic tree"
  height="size-3000"
  maxWidth="size-6000"
  items={items}
>
  {(item) => <DynamicTreeItem {...item} />}
</TreeView>
```

## Expansion Control

### Uncontrolled

```jsx
<TreeView defaultExpandedKeys={["projects", "reports"]}>{/* items */}</TreeView>
```

### Controlled

```jsx
function ControlledExpansion() {
  const [expandedKeys, setExpandedKeys] = useState(
    new Set(["projects", "reports"]),
  );
  return (
    <TreeView expandedKeys={expandedKeys} onExpandedChange={setExpandedKeys}>
      {/* items */}
    </TreeView>
  );
}
```

## Selection Modes

### Multiple Selection

```jsx
<TreeView
  selectionMode="multiple"
  defaultSelectedKeys={["document-a", "document-b"]}
>
  {/* items */}
</TreeView>
```

### Single Selection

```jsx
<TreeView selectionMode="single">{/* items */}</TreeView>
```

### With Highlight Style

```jsx
<TreeView
  selectionMode="multiple"
  selectionStyle="highlight"
  defaultSelectedKeys={["document-a"]}
>
  {/* items */}
</TreeView>
```

## Item Actions

```jsx
<TreeView
  selectionMode="multiple"
  onAction={(key) => alert(`Opening item ${key}...`)}
>
  {/* items */}
</TreeView>
```

## Links

```jsx
<TreeViewItem href="https://adobe.com/" id="adobe" textValue="Adobe">
  <TreeViewItemContent>
    <Text>Adobe</Text>
  </TreeViewItemContent>
</TreeViewItem>
```

## Action Groups

```jsx
<TreeViewItem textValue={item.name}>
  <TreeViewItemContent>
    <Text>{item.name}</Text>
    <ActionGroup onAction={(key) => alert(`Action: ${key}`)}>
      <Item key="edit" textValue="Edit">
        <Edit />
      </Item>
      <Item key="delete" textValue="Delete">
        <Delete />
      </Item>
    </ActionGroup>
  </TreeViewItemContent>
</TreeViewItem>
```

## Empty State

```jsx
<TreeView
  renderEmptyState={() => (
    <IllustratedMessage>
      <NotFound />
      <Heading>No results</Heading>
    </IllustratedMessage>
  )}
>
  {[]}
</TreeView>
```

## Props

### TreeView Props

| Name                     | Type                               | Default            | Description                           |
| ------------------------ | ---------------------------------- | ------------------ | ------------------------------------- |
| `children`               | `ReactNode \| (item) => ReactNode` | --                 | Tree contents, static or dynamic      |
| `items`                  | `Iterable<T>`                      | --                 | Data items for dynamic collections    |
| `renderEmptyState`       | `() => JSX.Element`                | --                 | Content when tree is empty            |
| `selectionMode`          | `'single' \| 'multiple'`           | --                 | Selection behavior                    |
| `selectionStyle`         | `'checkbox' \| 'highlight'`        | --                 | Selection appearance                  |
| `defaultSelectedKeys`    | `Iterable<Key>`                    | --                 | Initial selected items (uncontrolled) |
| `selectedKeys`           | `Iterable<Key>`                    | --                 | Selected items (controlled)           |
| `defaultExpandedKeys`    | `Iterable<Key>`                    | --                 | Initially expanded items              |
| `expandedKeys`           | `Iterable<Key>`                    | --                 | Expanded items (controlled)           |
| `disabledKeys`           | `Iterable<Key>`                    | --                 | Non-interactive items                 |
| `disallowEmptySelection` | `boolean`                          | --                 | Require at least one selection        |
| `escapeKeyBehavior`      | `'clearSelection' \| 'none'`       | `'clearSelection'` | Escape key handling                   |
| `disabledBehavior`       | `'all'`                            | `'all'`            | Disabled item interaction scope       |
| `autoFocus`              | `boolean \| FocusStrategy`         | --                 | Auto-focus tree or item               |
| `shouldSelectOnPressUp`  | `boolean`                          | --                 | Select on key release                 |

### TreeViewItem Props

| Name             | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| `id`             | `Key`               | Unique item identifier            |
| `textValue`      | `string`            | Text representation for typeahead |
| `children`       | `ReactNode`         | Item contents and children        |
| `isDisabled`     | `boolean`           | Disables interaction              |
| `href`           | `string`            | Link URL                          |
| `hrefLang`       | `string`            | Hint about linked URL language    |
| `target`         | `string`            | Link target window                |
| `rel`            | `string`            | Link relationship                 |
| `download`       | `boolean \| string` | Download suggestion               |
| `ping`           | `string`            | URLs to ping on navigation        |
| `referrerPolicy` | `string`            | Referrer policy for links         |
| `routerOptions`  | `RouterOptions`     | Client-side router config         |
| `hasChildItems`  | `boolean`           | Indicates item has children       |
| `aria-label`     | `string`            | Accessibility label               |

### TreeViewItemContent Props

| Name       | Type        | Description  |
| ---------- | ----------- | ------------ |
| `children` | `ReactNode` | Item content |

### Events

| Event               | Type                        | Description                  |
| ------------------- | --------------------------- | ---------------------------- |
| `onSelectionChange` | `(keys: Selection) => void` | Fires when selection changes |
| `onExpandedChange`  | `(keys: Set<Key>) => void`  | Fires when expansion changes |
| `onAction`          | `(key: Key) => void`        | Fires on item action         |

### TreeViewItem Events

| Event           | Type                           | Description              |
| --------------- | ------------------------------ | ------------------------ |
| `onAction`      | `() => void`                   | Item action triggered    |
| `onPress`       | `(e: PressEvent) => void`      | Press released over item |
| `onPressStart`  | `(e: PressEvent) => void`      | Press interaction begins |
| `onPressEnd`    | `(e: PressEvent) => void`      | Press interaction ends   |
| `onPressChange` | `(isPressed: boolean) => void` | Press state changes      |
| `onPressUp`     | `(e: PressEvent) => void`      | Press released anywhere  |

### Layout Props

`flex`, `flexGrow`, `flexShrink`, `flexBasis`, `alignSelf`, `justifySelf`, `order`, `gridArea`, `gridColumn`, `gridRow`

### Spacing Props

`margin`, `marginTop`, `marginBottom`, `marginStart`, `marginEnd`, `marginX`, `marginY`

### Sizing Props

`width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`

### Positioning Props

`position`, `top`, `bottom`, `left`, `right`, `start`, `end`, `zIndex`, `isHidden`

### Accessibility Props

| Name               | Type     | Description                     |
| ------------------ | -------- | ------------------------------- |
| `id`               | `string` | Element identifier              |
| `aria-label`       | `string` | Accessibility label (required)  |
| `aria-labelledby`  | `string` | Label element ID                |
| `aria-describedby` | `string` | Description element ID          |
| `aria-details`     | `string` | Detailed description element ID |

### Advanced Props

| Name               | Type            | Description    |
| ------------------ | --------------- | -------------- |
| `UNSAFE_className` | `string`        | CSS class name |
| `UNSAFE_style`     | `CSSProperties` | Inline styles  |

## Accessibility

An `aria-label` or `aria-labelledby` is required on TreeView for accessibility. RTL languages automatically flip layout. Keyboard navigation follows ARIA tree practices.

## Testing

```jsx
import { User } from "@react-spectrum/test-utils";

const testUtilUser = new User({ interactionType: "mouse" });
const treeTester = testUtilUser.createTester("Tree", {
  root: getByTestId("test-tree"),
  interactionType: "keyboard",
});

await treeTester.toggleRowSelection({ row: 0 });
await treeTester.toggleRowExpansion({ row: 1 });
await treeTester.triggerRowAction({ row: 2 });
```

### Tester Methods

- `findRow(opts)` -- Get row by index or text
- `toggleRowSelection(opts)` -- Toggle item selection
- `toggleRowExpansion(opts)` -- Toggle item expansion
- `triggerRowAction(opts)` -- Trigger item action
- `cells(opts)` -- Get table cells

### Tester Properties

- `tree` -- Root element
- `rows` -- All row elements
- `selectedRows` -- Selected row elements
