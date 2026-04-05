<!-- Source: https://react-spectrum.adobe.com/react-spectrum/Switch.html -->
<!-- Last fetched: 2026-04-05 -->

# Switch

Switches allow users to turn an individual option on or off. They are usually used to activate or deactivate a specific setting. Switches are best used for communicating activation (e.g. on/off states), while checkboxes are best used for communicating selection.

```jsx
import { Switch } from "@adobe/react-spectrum";

<Switch>Low power mode</Switch>;
```

## Value

### Uncontrolled

```jsx
<Switch defaultSelected>Low power mode (uncontrolled)</Switch>
```

### Controlled

```jsx
function Example() {
  let [selected, setSelection] = React.useState(false);

  return (
    <Switch isSelected={selected} onChange={setSelection}>
      Low power mode (controlled)
    </Switch>
  );
}
```

### HTML Forms

```jsx
<Switch name="power" value="low">
  Low power mode
</Switch>
```

## Events

```jsx
function Example() {
  let [selected, setSelection] = React.useState(false);

  return (
    <>
      <Switch onChange={setSelection}>Switch Label</Switch>
      <div>The Switch is on: {selected.toString()}</div>
    </>
  );
}
```

## Disabled

```jsx
<Switch isDisabled>Switch Label</Switch>
```

## Emphasized

```jsx
<Switch isEmphasized defaultSelected>
  Switch Label
</Switch>
```

## Read Only

```jsx
<Switch isReadOnly isSelected>
  Switch Label
</Switch>
```

## Props

| Name                  | Type        | Default | Description                                    |
| --------------------- | ----------- | ------- | ---------------------------------------------- |
| `children`            | `ReactNode` | --      | Content rendered as the Switch's label.        |
| `isSelected`          | `boolean`   | --      | Whether the Switch is selected (controlled).   |
| `defaultSelected`     | `boolean`   | --      | Whether the Switch is selected (uncontrolled). |
| `isEmphasized`        | `boolean`   | --      | Provides visual prominence.                    |
| `isDisabled`          | `boolean`   | --      | Disables the input.                            |
| `isReadOnly`          | `boolean`   | --      | Selected but unchangeable by user.             |
| `name`                | `string`    | --      | Form input name attribute.                     |
| `value`               | `string`    | --      | Form input value attribute.                    |
| `form`                | `string`    | --      | Associate with `<form>` by id.                 |
| `autoFocus`           | `boolean`   | --      | Receive focus on render.                       |
| `id`                  | `string`    | --      | Unique element identifier.                     |
| `excludeFromTabOrder` | `boolean`   | --      | Exclude from keyboard tab order.               |

### Events

| Name            | Type                            | Description                         |
| --------------- | ------------------------------- | ----------------------------------- |
| `onChange`      | `(isSelected: boolean) => void` | Fires when selection state changes. |
| `onFocus`       | `(e: FocusEvent) => void`       | Fires when element receives focus.  |
| `onBlur`        | `(e: FocusEvent) => void`       | Fires when element loses focus.     |
| `onFocusChange` | `(isFocused: boolean) => void`  | Fires on focus status change.       |
| `onKeyDown`     | `(e: KeyboardEvent) => void`    | Fires on key press.                 |
| `onKeyUp`       | `(e: KeyboardEvent) => void`    | Fires on key release.               |

### Accessibility Props

| Name               | Type     | Description                      |
| ------------------ | -------- | -------------------------------- |
| `aria-label`       | `string` | Labels the current element.      |
| `aria-labelledby`  | `string` | References labeling element.     |
| `aria-controls`    | `string` | References controlled element.   |
| `aria-describedby` | `string` | References describing element.   |
| `aria-details`     | `string` | References detailed description. |

### Layout/Spacing/Sizing/Positioning Props (all Responsive)

Layout: `flex`, `flexGrow`, `flexShrink`, `flexBasis`, `alignSelf`, `justifySelf`, `order`, `gridArea`, `gridColumn`, `gridRow`, `gridColumnStart`, `gridColumnEnd`, `gridRowStart`, `gridRowEnd`

Spacing: `margin`, `marginTop`, `marginBottom`, `marginStart`, `marginEnd`, `marginX`, `marginY`

Sizing: `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`

Positioning: `position`, `top`, `bottom`, `left`, `right`, `start`, `end`, `zIndex`, `isHidden`

Advanced: `UNSAFE_className`, `UNSAFE_style`

## Accessibility

When a visible label isn't provided, use `aria-label`. For elements labeled separately, use `aria-labelledby`.

## Internationalization

Pass localized text to `children` or `aria-label`. The layout automatically flips for RTL languages like Hebrew and Arabic.
