<!-- Source: https://react-spectrum.adobe.com/react-spectrum/ComboBox.html -->
<!-- Last fetched: 2026-04-05 -->

# ComboBox

A ComboBox combines a text input with a picker menu, enabling users to filter a list of options to match a query.

Available since v3.12.0.

## Installation

```bash
yarn add @adobe/react-spectrum
```

```jsx
import { ComboBox, Item, Section } from "@adobe/react-spectrum";
```

## Basic Example

```jsx
<ComboBox label="Favorite Animal">
  <Item key="red panda">Red Panda</Item>
  <Item key="cat">Cat</Item>
  <Item key="dog">Dog</Item>
  <Item key="aardvark">Aardvark</Item>
  <Item key="kangaroo">Kangaroo</Item>
  <Item key="snake">Snake</Item>
</ComboBox>
```

## Dynamic Collections

```jsx
function Example() {
  let options = [
    { id: 1, name: "Aerospace" },
    { id: 2, name: "Mechanical" },
    { id: 3, name: "Civil" },
  ];
  let [majorId, setMajorId] = React.useState(null);

  return (
    <ComboBox
      label="Pick an engineering major"
      defaultItems={options}
      onSelectionChange={setMajorId}
    >
      {(item) => <Item>{item.name}</Item>}
    </ComboBox>
  );
}
```

## Value Management

### Uncontrolled Input Value

```jsx
<ComboBox
  label="Adobe product"
  defaultItems={options}
  defaultInputValue="Adobe XD"
>
  {(item) => <Item>{item.name}</Item>}
</ComboBox>
```

### Controlled Input Value

```jsx
<ComboBox
  label="Pick an Adobe product"
  defaultItems={options}
  inputValue={value}
  onInputChange={setValue}
>
  {(item) => <Item>{item.name}</Item>}
</ComboBox>
```

### Custom Values

The `allowsCustomValue` prop permits users to provide input that doesn't match existing options:

```jsx
<ComboBox label="Preferred fruit" defaultItems={options} allowsCustomValue>
  {(item) => <Item key={item.name}>{item.name}</Item>}
</ComboBox>
```

### HTML Form Integration

```jsx
<ComboBox label="Ice cream flavor" name="iceCream" allowsCustomValue>
  <Item>Chocolate</Item>
  <Item>Mint</Item>
  <Item>Strawberry</Item>
  <Item>Vanilla</Item>
</ComboBox>
```

The `formValue` prop determines whether text or the item key is submitted ("text" by default).

## Selection

### Uncontrolled Selection

```jsx
<ComboBox
  label="Pick an Adobe product"
  defaultItems={options}
  defaultSelectedKey={9}
>
  {(item) => <Item>{item.name}</Item>}
</ComboBox>
```

### Controlled Selection

```jsx
import type {Key} from '@adobe/react-spectrum';

function Example() {
  let [productId, setProductId] = React.useState<Key>(9);
  return (
    <ComboBox
      label="Pick an Adobe product"
      defaultItems={options}
      selectedKey={productId}
      onSelectionChange={selected => setProductId(selected)}
    >
      {item => <Item>{item.name}</Item>}
    </ComboBox>
  );
}
```

## Sections

```jsx
<ComboBox label="Preferred fruit or vegetable">
  <Section title="Fruit">
    <Item key="Apple">Apple</Item>
    <Item key="Banana">Banana</Item>
    <Item key="Orange">Orange</Item>
  </Section>
  <Section title="Vegetable">
    <Item key="Cabbage">Cabbage</Item>
    <Item key="Broccoli">Broccoli</Item>
    <Item key="Carrots">Carrots</Item>
  </Section>
</ComboBox>
```

## Links in Items

```jsx
<ComboBox label="Tech company websites">
  <Item href="https://adobe.com/" target="_blank">
    Adobe
  </Item>
  <Item href="https://apple.com/" target="_blank">
    Apple
  </Item>
  <Item href="https://google.com/" target="_blank">
    Google
  </Item>
</ComboBox>
```

## Complex Items

```jsx
<ComboBox label="Select action">
  <Item textValue="Add to queue">
    <Add />
    <Text>Add to queue</Text>
    <Text slot="description">Add to current watch queue.</Text>
  </Item>
  <Item textValue="Add review">
    <Draw />
    <Text>Add review</Text>
    <Text slot="description">Post a review for the episode.</Text>
  </Item>
</ComboBox>
```

## Asynchronous Loading

```jsx
import { useAsyncList } from "react-stately";

function AsyncLoadingExample() {
  let list = useAsyncList({
    async load({ signal, cursor, filterText }) {
      let res = await fetch(
        cursor || `https://swapi.py4e.com/api/people/?search=${filterText}`,
        { signal },
      );
      let json = await res.json();
      return { items: json.results, cursor: json.next };
    },
  });

  return (
    <ComboBox
      label="Star Wars Character Lookup"
      items={list.items}
      inputValue={list.filterText}
      onInputChange={list.setFilterText}
      loadingState={list.loadingState}
      onLoadMore={list.loadMore}
    >
      {(item) => <Item key={item.name}>{item.name}</Item>}
    </ComboBox>
  );
}
```

## Events

```jsx
function Example() {
  let [value, setValue] = React.useState("");
  let [majorId, setMajorId] = React.useState("");

  return (
    <>
      <p>Current selected major id: {majorId}</p>
      <p>Current input text: {value}</p>
      <ComboBox
        label="Pick an engineering major"
        defaultItems={options}
        selectedKey={majorId}
        onSelectionChange={setMajorId}
        onInputChange={setValue}
      >
        {(item) => <Item>{item.name}</Item>}
      </ComboBox>
    </>
  );
}
```

## Validation

```jsx
import { Form, ButtonGroup, Button } from "@adobe/react-spectrum";

<Form validationBehavior="native" maxWidth="size-3000">
  <ComboBox label="Favorite animal" name="animal" isRequired>
    <Item>Aardvark</Item>
    <Item>Cat</Item>
    <Item>Dog</Item>
    <Item>Kangaroo</Item>
    <Item>Panda</Item>
    <Item>Snake</Item>
  </ComboBox>
  <ButtonGroup>
    <Button type="submit" variant="primary">
      Submit
    </Button>
    <Button type="reset" variant="secondary">
      Reset
    </Button>
  </ButtonGroup>
</Form>;
```

## Menu Trigger Options

Control when the menu displays using `menuTrigger`:

```jsx
<ComboBox label="Select action" menuTrigger="focus">
  <Item textValue="Add to queue">...</Item>
</ComboBox>

<ComboBox label="Select action" menuTrigger="manual">
  <Item textValue="Add to queue">...</Item>
</ComboBox>
```

## Props API

### Core Props

| Name                 | Type                             | Default    | Description                            |
| -------------------- | -------------------------------- | ---------- | -------------------------------------- |
| `children`           | `CollectionChildren<object>`     | --         | Collection content                     |
| `menuTrigger`        | `'input' \| 'focus' \| 'manual'` | `'input'`  | Interaction opening the menu           |
| `isQuiet`            | `boolean`                        | --         | Quiet styling                          |
| `align`              | `'start' \| 'end'`               | `'start'`  | Menu alignment relative to input       |
| `direction`          | `'bottom' \| 'top'`              | `'bottom'` | Menu render direction                  |
| `loadingState`       | `LoadingState`                   | --         | Loading progress indicator state       |
| `shouldFlip`         | `boolean`                        | `true`     | Auto-flip when space limited           |
| `menuWidth`          | `DimensionValue`                 | --         | Menu width (min equals combobox width) |
| `formValue`          | `'text' \| 'key'`                | `'text'`   | Form submission value type             |
| `shouldFocusWrap`    | `boolean`                        | --         | Circular keyboard navigation           |
| `defaultItems`       | `Iterable<object>`               | --         | Uncontrolled items                     |
| `items`              | `Iterable<object>`               | --         | Controlled items                       |
| `inputValue`         | `string`                         | --         | Controlled input value                 |
| `defaultInputValue`  | `string`                         | --         | Uncontrolled default input             |
| `allowsCustomValue`  | `boolean`                        | --         | Allow non-matching input values        |
| `disabledKeys`       | `Iterable<Key>`                  | --         | Non-interactive items                  |
| `selectedKey`        | `Key \| null`                    | --         | Controlled selection                   |
| `defaultSelectedKey` | `Key \| null`                    | --         | Uncontrolled initial selection         |

### State Props

| Name                 | Type                                                                               | Default  | Description                |
| -------------------- | ---------------------------------------------------------------------------------- | -------- | -------------------------- |
| `isDisabled`         | `boolean`                                                                          | --       | Disable input              |
| `isReadOnly`         | `boolean`                                                                          | --       | Read-only mode             |
| `isRequired`         | `boolean`                                                                          | --       | Required field validation  |
| `validationBehavior` | `'aria' \| 'native'`                                                               | `'aria'` | Form validation approach   |
| `validate`           | `(value: ComboBoxValidationValue) => ValidationError \| true \| null \| undefined` | --       | Custom validation function |
| `validationState`    | `ValidationState`                                                                  | --       | Valid/invalid visual state |
| `autoFocus`          | `boolean`                                                                          | --       | Focus on render            |

### Label Props

| Name                 | Type                                              | Default   | Description                |
| -------------------- | ------------------------------------------------- | --------- | -------------------------- |
| `label`              | `ReactNode`                                       | --        | Label content              |
| `description`        | `ReactNode`                                       | --        | Field description/hint     |
| `errorMessage`       | `ReactNode \| (v: ValidationResult) => ReactNode` | --        | Error message display      |
| `name`               | `string`                                          | --        | Input element name         |
| `form`               | `string`                                          | --        | Associated `<form>` id     |
| `labelPosition`      | `'top' \| 'side'`                                 | `'top'`   | Label positioning          |
| `labelAlign`         | `'start' \| 'end'`                                | `'start'` | Label horizontal alignment |
| `necessityIndicator` | `'icon' \| 'label'`                               | `'icon'`  | Required indicator display |
| `contextualHelp`     | `ReactNode`                                       | --        | ContextualHelp element     |

### Events

| Name                | Type                                                         | Description                                |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `onOpenChange`      | `(isOpen: boolean, menuTrigger?: MenuTriggerAction) => void` | Menu open state change with trigger action |
| `onInputChange`     | `(value: string) => void`                                    | Input value change handler                 |
| `onSelectionChange` | `(key: Key \| null) => void`                                 | Selection change handler                   |
| `onLoadMore`        | `() => any`                                                  | Infinite scroll/load more trigger          |
| `onFocus`           | `(e: FocusEvent<HTMLInputElement>) => void`                  | Element receives focus                     |
| `onBlur`            | `(e: FocusEvent<HTMLInputElement>) => void`                  | Element loses focus                        |
| `onFocusChange`     | `(isFocused: boolean) => void`                               | Focus status change                        |
| `onKeyDown`         | `(e: KeyboardEvent) => void`                                 | Key press handler                          |
| `onKeyUp`           | `(e: KeyboardEvent) => void`                                 | Key release handler                        |

### Layout Props (summary)

`flex`, `flexGrow`, `flexShrink`, `flexBasis`, `alignSelf`, `justifySelf`, `order`, `gridArea`, `gridColumn`, `gridRow`, `gridColumnStart`, `gridColumnEnd` -- all `Responsive<>` typed.

### Spacing Props (summary)

`margin`, `marginTop`, `marginBottom`, `marginStart`, `marginEnd`, `marginX`, `marginY` -- all `Responsive<DimensionValue>`.

### Sizing Props (summary)

`width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight` -- all `Responsive<DimensionValue>`.

### Positioning Props (summary)

`position`, `top`, `bottom`, `left`, `right`, `start`, `end`, `zIndex`, `isHidden` -- all `Responsive<>` typed.

### Advanced Props

| Name               | Type            | Description                 |
| ------------------ | --------------- | --------------------------- |
| `UNSAFE_className` | `string`        | CSS className (last resort) |
| `UNSAFE_style`     | `CSSProperties` | Inline styles (last resort) |

## Accessibility

- Provide `label` prop or use `aria-label`/`aria-labelledby` for unlabeled instances
- Required fields display via `isRequired` prop with `necessityIndicator` option
- Right-to-left languages automatically flip layout
- Mobile tray includes accessible search filtering
- Keyboard navigation: arrow keys, Enter for selection, Escape to close
