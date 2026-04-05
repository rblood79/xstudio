<!-- Source: https://react-spectrum.adobe.com/react-spectrum/TextField.html -->
<!-- Last fetched: 2026-04-05 -->

# TextField

TextFields are text inputs that allow users to input custom text entries with a keyboard. Various decorations can be displayed around the field to communicate the entry requirements.

**Added in:** 3.0.0

```tsx
import { TextField } from "@adobe/react-spectrum";
```

## Usage Examples

### Basic

```jsx
<TextField label="Name" />
```

### Uncontrolled

```jsx
<TextField label="Email (Uncontrolled)" defaultValue="me@email.com" />
```

### Controlled

```jsx
function Example() {
  let [value, setValue] = React.useState("me@email.com");
  return (
    <TextField label="Email (Controlled)" value={value} onChange={setValue} />
  );
}
```

### HTML Forms Integration

```jsx
<TextField label="Email" name="email" type="email" />
```

### Validation (Native)

```jsx
<Form validationBehavior="native" maxWidth="size-3000">
  <TextField label="Email" name="email" type="email" isRequired />
  <ButtonGroup>
    <Button type="submit" variant="primary">
      Submit
    </Button>
    <Button type="reset" variant="secondary">
      Reset
    </Button>
  </ButtonGroup>
</Form>
```

### Visual Options

```jsx
// Quiet style
<TextField label="Email" isQuiet />

// Disabled
<TextField label="Email" isDisabled />

// Read-only (focusable, content selectable)
<TextField label="Email" defaultValue="abc@adobe.com" isReadOnly />

// Label positioning
<TextField label="Search" labelPosition="side" labelAlign="end" />

// Custom width
<TextField label="Email" width="size-3600" maxWidth="100%" />
```

### Help Text and Contextual Help

```jsx
<TextField
  label="Name"
  defaultValue="John"
  validationState="valid"
  description="Enter your name."
/>

<TextField
  label="Name"
  validationState="invalid"
  errorMessage="Empty input is not allowed."
/>

<TextField
  label="Password"
  type="password"
  contextualHelp={
    <ContextualHelp>
      <Heading>Need help?</Heading>
      <Content>If you're having trouble, contact support.</Content>
    </ContextualHelp>
  }
/>
```

## Props API

### Input Properties

| Name           | Type                                                                                  | Default  | Description                    |
| -------------- | ------------------------------------------------------------------------------------- | -------- | ------------------------------ |
| `value`        | `string`                                                                              | --       | Current value (controlled)     |
| `defaultValue` | `string`                                                                              | --       | Default value (uncontrolled)   |
| `label`        | `ReactNode`                                                                           | --       | Label content                  |
| `icon`         | `ReactElement \| null`                                                                | --       | Icon displayed at input start  |
| `type`         | `'text' \| 'search' \| 'url' \| 'tel' \| 'email' \| 'password' \| string`             | `'text'` | Input type                     |
| `name`         | `string`                                                                              | --       | HTML form field name           |
| `autoComplete` | `string`                                                                              | --       | Autocomplete behavior hint     |
| `maxLength`    | `number`                                                                              | --       | Maximum character count        |
| `minLength`    | `number`                                                                              | --       | Minimum character count        |
| `pattern`      | `string`                                                                              | --       | Regex validation pattern       |
| `inputMode`    | `'none' \| 'text' \| 'tel' \| 'url' \| 'email' \| 'numeric' \| 'decimal' \| 'search'` | --       | Virtual keyboard hint          |
| `autoCorrect`  | `string`                                                                              | --       | Autocorrection behavior        |
| `spellCheck`   | `string`                                                                              | --       | Spell-check setting            |
| `enterKeyHint` | `'enter' \| 'done' \| 'go' \| 'next' \| 'previous' \| 'search' \| 'send'`             | --       | Enter key label                |
| `form`         | `string`                                                                              | --       | Associated `<form>` element ID |

### State Properties

| Name                 | Type                                                              | Default  | Description                         |
| -------------------- | ----------------------------------------------------------------- | -------- | ----------------------------------- |
| `isDisabled`         | `boolean`                                                         | --       | Disables the input                  |
| `isReadOnly`         | `boolean`                                                         | --       | Makes input read-only but focusable |
| `isRequired`         | `boolean`                                                         | --       | Marks field as required             |
| `isQuiet`            | `boolean`                                                         | --       | Applies quiet styling               |
| `autoFocus`          | `boolean`                                                         | --       | Focuses on render                   |
| `validationBehavior` | `'aria' \| 'native'`                                              | `'aria'` | Validation approach                 |
| `validationState`    | `'valid' \| 'invalid'`                                            | --       | Visual validation state             |
| `validate`           | `(value: string) => ValidationError \| true \| null \| undefined` | --       | Custom validation function          |

### Label & Help

| Name                 | Type                                              | Default   | Description                         |
| -------------------- | ------------------------------------------------- | --------- | ----------------------------------- |
| `labelPosition`      | `'top' \| 'side'`                                 | `'top'`   | Label placement                     |
| `labelAlign`         | `'start' \| 'end'`                                | `'start'` | Label horizontal alignment          |
| `necessityIndicator` | `'icon' \| 'label'`                               | `'icon'`  | Required indicator display          |
| `description`        | `ReactNode`                                       | --        | Helper text hint                    |
| `errorMessage`       | `ReactNode \| (v: ValidationResult) => ReactNode` | --        | Error message display               |
| `contextualHelp`     | `ReactNode`                                       | --        | Associated ContextualHelp component |

### Accessibility Props

| Name                    | Type                                                             | Description                       |
| ----------------------- | ---------------------------------------------------------------- | --------------------------------- |
| `id`                    | `string`                                                         | Unique identifier                 |
| `excludeFromTabOrder`   | `boolean`                                                        | Removes from keyboard tab order   |
| `aria-label`            | `string`                                                         | Accessible label                  |
| `aria-labelledby`       | `string`                                                         | Associated label element ID       |
| `aria-describedby`      | `string`                                                         | Associated description element ID |
| `aria-details`          | `string`                                                         | Associated details element ID     |
| `aria-errormessage`     | `string`                                                         | Associated error message ID       |
| `aria-activedescendant` | `string`                                                         | Active composite child ID         |
| `aria-autocomplete`     | `'none' \| 'inline' \| 'list' \| 'both'`                         | Autocomplete prediction type      |
| `aria-haspopup`         | `boolean \| 'menu' \| 'listbox' \| 'tree' \| 'grid' \| 'dialog'` | Popup availability                |
| `aria-controls`         | `string`                                                         | Controlled element ID             |

### Layout/Spacing/Sizing/Positioning Props (abbreviated)

Standard Responsive layout props: `flex`, `flexGrow`, `flexShrink`, `flexBasis`, `alignSelf`, `justifySelf`, `order`, `gridArea`, `gridColumn`, `gridRow`, etc. Standard spacing: `margin`, `marginTop`, `marginBottom`, `marginStart`, `marginEnd`, `marginX`, `marginY`. Standard sizing: `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`. Standard positioning: `position`, `top`, `bottom`, `left`, `right`, `start`, `end`, `zIndex`, `isHidden`.

### Advanced Props

| Name               | Type            | Description                |
| ------------------ | --------------- | -------------------------- |
| `UNSAFE_className` | `string`        | CSS class (last resort)    |
| `UNSAFE_style`     | `CSSProperties` | Inline style (last resort) |

## Events

| Name                  | Type                                        | Description                         |
| --------------------- | ------------------------------------------- | ----------------------------------- |
| `onChange`            | `(value: T) => void`                        | Triggered when value changes        |
| `onFocus`             | `(e: FocusEvent<T>) => void`                | Triggered on focus                  |
| `onBlur`              | `(e: FocusEvent<T>) => void`                | Triggered on blur                   |
| `onFocusChange`       | `(isFocused: boolean) => void`              | Triggered when focus state changes  |
| `onKeyDown`           | `(e: KeyboardEvent) => void`                | Triggered on key press              |
| `onKeyUp`             | `(e: KeyboardEvent) => void`                | Triggered on key release            |
| `onCopy`              | `ClipboardEventHandler<HTMLInputElement>`   | Triggered on copy                   |
| `onCut`               | `ClipboardEventHandler<HTMLInputElement>`   | Triggered on cut                    |
| `onPaste`             | `ClipboardEventHandler<HTMLInputElement>`   | Triggered on paste                  |
| `onCompositionStart`  | `CompositionEventHandler<HTMLInputElement>` | Triggered at composition start      |
| `onCompositionEnd`    | `CompositionEventHandler<HTMLInputElement>` | Triggered at composition end        |
| `onCompositionUpdate` | `CompositionEventHandler<HTMLInputElement>` | Triggered during composition        |
| `onSelect`            | `ReactEventHandler<HTMLInputElement>`       | Triggered on text selection         |
| `onBeforeInput`       | `FormEventHandler<HTMLInputElement>`        | Triggered before input modification |
| `onInput`             | `FormEventHandler<HTMLInputElement>`        | Triggered on input modification     |

## Accessibility

- Provide visible `label` or `aria-label`
- Use `aria-labelledby` when labeled by separate element
- Localize all text including labels
- Unlike `isDisabled`, `isReadOnly` remains focusable and content is selectable/copyable
