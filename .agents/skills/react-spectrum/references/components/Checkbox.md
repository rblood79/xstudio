<!-- Source: https://react-spectrum.adobe.com/react-spectrum/Checkbox.html -->
<!-- Last fetched: 2026-04-05 -->

# Checkbox

## Description

Checkboxes allow users to select multiple items from a list of individual items, or to mark one individual item as selected.

## Installation

```bash
yarn add @adobe/react-spectrum
```

```javascript
import { Checkbox } from "@adobe/react-spectrum";
```

## Usage Examples

### Basic

```jsx
<Checkbox>Unsubscribe</Checkbox>
```

### Controlled and Uncontrolled

```jsx
function Example() {
  let [selected, setSelected] = React.useState(true);

  return (
    <Flex direction="row">
      <Checkbox defaultSelected>Subscribe (uncontrolled)</Checkbox>
      <Checkbox isSelected={selected} onChange={setSelected}>
        Subscribe (controlled)
      </Checkbox>
    </Flex>
  );
}
```

### Indeterminate State

```jsx
<Checkbox isIndeterminate>Subscribe</Checkbox>
```

The `isIndeterminate` prop presents a visually indeterminate state regardless of user interaction until explicitly set to false.

### HTML Forms

```jsx
<Checkbox name="newsletter" value="subscribe">
  Subscribe
</Checkbox>
```

### Validation

```jsx
<Checkbox isInvalid>I accept the terms and conditions</Checkbox>
```

### Disabled

```jsx
<Checkbox isDisabled>Subscribe</Checkbox>
```

### Emphasized

```jsx
<Checkbox isEmphasized defaultSelected>
  Subscribe
</Checkbox>
```

## Props API

| Name                  | Type                                                               | Default  | Description                                      |
| --------------------- | ------------------------------------------------------------------ | -------- | ------------------------------------------------ |
| `children`            | `ReactNode`                                                        | --       | Label text                                       |
| `isEmphasized`        | `boolean`                                                          | --       | Provides visual prominence                       |
| `isIndeterminate`     | `boolean`                                                          | --       | Visual-only indeterminate state                  |
| `value`               | `string`                                                           | --       | Value for HTML form submission                   |
| `defaultSelected`     | `boolean`                                                          | --       | Initial selection state (uncontrolled)           |
| `isSelected`          | `boolean`                                                          | --       | Selection state (controlled)                     |
| `isDisabled`          | `boolean`                                                          | --       | Disables the input                               |
| `isReadOnly`          | `boolean`                                                          | --       | Selectable but not changeable by user            |
| `isRequired`          | `boolean`                                                          | --       | Requires user input before form submission       |
| `isInvalid`           | `boolean`                                                          | --       | Indicates invalid value                          |
| `validationBehavior`  | `'aria' \| 'native'`                                               | `'aria'` | Validation approach (native prevents submission) |
| `validate`            | `(value: boolean) => ValidationError \| true \| null \| undefined` | --       | Custom validation function                       |
| `autoFocus`           | `boolean`                                                          | --       | Receives focus on render                         |
| `name`                | `string`                                                           | --       | Name attribute for form submission               |
| `form`                | `string`                                                           | --       | Associated `<form>` element ID                   |
| `id`                  | `string`                                                           | --       | Unique element identifier                        |
| `excludeFromTabOrder` | `boolean`                                                          | --       | Excluded from keyboard tab order                 |
| `aria-controls`       | `string`                                                           | --       | Controls referenced element(s)                   |
| `aria-label`          | `string`                                                           | --       | Accessible label string                          |
| `aria-labelledby`     | `string`                                                           | --       | ID of labeling element                           |
| `aria-describedby`    | `string`                                                           | --       | ID of describing element(s)                      |
| `aria-details`        | `string`                                                           | --       | ID of detailed description element(s)            |
| `aria-errormessage`   | `string`                                                           | --       | ID of error message element                      |
| `UNSAFE_className`    | `string`                                                           | --       | CSS class name (last resort)                     |
| `UNSAFE_style`        | `CSSProperties`                                                    | --       | Inline styles (last resort)                      |

(layout props omitted)

## Events

| Name            | Type                            | Description                                     |
| --------------- | ------------------------------- | ----------------------------------------------- |
| `onChange`      | `(isSelected: boolean) => void` | Triggered when selection state changes          |
| `onFocus`       | `(e: FocusEvent) => void`       | Triggered when element receives focus           |
| `onBlur`        | `(e: FocusEvent) => void`       | Triggered when element loses focus              |
| `onFocusChange` | `(isFocused: boolean) => void`  | Triggered when focus status changes             |
| `onKeyDown`     | `(e: KeyboardEvent) => void`    | Triggered on key press                          |
| `onKeyUp`       | `(e: KeyboardEvent) => void`    | Triggered on key release                        |
| `onPress`       | `(e: PressEvent) => void`       | Triggered on press release over target          |
| `onPressStart`  | `(e: PressEvent) => void`       | Triggered when press interaction starts         |
| `onPressEnd`    | `(e: PressEvent) => void`       | Triggered when press interaction ends           |
| `onPressChange` | `(isPressed: boolean) => void`  | Triggered when press state changes              |
| `onPressUp`     | `(e: PressEvent) => void`       | Triggered on press release regardless of origin |

## Accessibility

- When a visible label is not provided, an `aria-label` attribute must be supplied
- If another element provides the label, use `aria-labelledby` with the labeling element's ID
- Set `isInvalid` based on custom validation logic; communicate validation errors through additional UI elements

## Internationalization

Pass localized text to the `children` or `aria-label` prop. The component automatically flips layout for right-to-left languages like Hebrew and Arabic.
