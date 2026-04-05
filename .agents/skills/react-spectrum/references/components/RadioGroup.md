<!-- Source: https://react-spectrum.adobe.com/react-spectrum/RadioGroup.html -->
<!-- Last fetched: 2026-04-05 -->

# RadioGroup

Radio buttons allow users to select a single option from a list of mutually exclusive options. All possible options are exposed up front for users to compare.

```jsx
import { RadioGroup, Radio } from "@adobe/react-spectrum";

<RadioGroup label="Favorite pet">
  <Radio value="dogs">Dogs</Radio>
  <Radio value="cats">Cats</Radio>
</RadioGroup>;
```

**Note:** A Radio cannot be used outside of a RadioGroup.

## Value

### Uncontrolled

```jsx
<RadioGroup label="Are you a wizard?" defaultValue="yes">
  <Radio value="yes">Yes</Radio>
  <Radio value="no">No</Radio>
</RadioGroup>
```

### Controlled

```jsx
function Example() {
  let [selected, setSelected] = React.useState("yes");

  return (
    <RadioGroup
      label="Are you a wizard?"
      value={selected}
      onChange={setSelected}
    >
      <Radio value="yes">Yes</Radio>
      <Radio value="no">No</Radio>
    </RadioGroup>
  );
}
```

### HTML Forms

```jsx
<RadioGroup label="Favorite pet" name="pet">
  <Radio value="dogs">Dogs</Radio>
  <Radio value="cats">Cats</Radio>
</RadioGroup>
```

## Labeling

```jsx
<Flex gap="size-300" wrap>
  <RadioGroup label="Favorite avatar">
    <Radio value="wizard">Wizard</Radio>
    <Radio value="dragon">Dragon</Radio>
  </RadioGroup>

  <RadioGroup label="Favorite avatar" isRequired necessityIndicator="icon">
    <Radio value="wizard">Wizard</Radio>
    <Radio value="dragon">Dragon</Radio>
  </RadioGroup>

  <RadioGroup label="Favorite avatar" isRequired necessityIndicator="label">
    <Radio value="wizard">Wizard</Radio>
    <Radio value="dragon">Dragon</Radio>
  </RadioGroup>

  <RadioGroup label="Favorite avatar" necessityIndicator="label">
    <Radio value="wizard">Wizard</Radio>
    <Radio value="dragon">Dragon</Radio>
  </RadioGroup>
</Flex>
```

## Orientation

```jsx
<RadioGroup label="Favorite avatar" orientation="horizontal">
  <Radio value="wizard">Wizard</Radio>
  <Radio value="dragon">Dragon</Radio>
</RadioGroup>
```

## Label Position and Alignment

```jsx
<RadioGroup label="Favorite avatar" labelPosition="side" labelAlign="end">
  <Radio value="wizard">Wizard</Radio>
  <Radio value="dragon">Dragon</Radio>
</RadioGroup>
```

## Help Text (Description & Error Messages)

```jsx
function Example() {
  let [selected, setSelected] = React.useState("dogs");
  let isValid = selected === "dogs";

  return (
    <RadioGroup
      aria-label="Favorite pet"
      onChange={setSelected}
      isInvalid={!isValid}
      description="Please select a pet."
      errorMessage={
        selected === "cats" ? "No cats allowed." : "Please select dogs."
      }
    >
      <Radio value="dogs">Dogs</Radio>
      <Radio value="cats">Cats</Radio>
      <Radio value="dragons">Dragons</Radio>
    </RadioGroup>
  );
}
```

## Contextual Help

```jsx
import { Content, ContextualHelp, Heading } from "@adobe/react-spectrum";

<RadioGroup
  label="T-shirt size"
  contextualHelp={
    <ContextualHelp variant="info">
      <Heading>Size and fit</Heading>
      <Content>Our sizes run small. Choose a size up from your usual.</Content>
    </ContextualHelp>
  }
>
  <Radio value="S">Small</Radio>
  <Radio value="M">Medium</Radio>
  <Radio value="L">Large</Radio>
</RadioGroup>;
```

## Validation

```jsx
import { Form, ButtonGroup, Button } from "@adobe/react-spectrum";

<Form validationBehavior="native">
  <RadioGroup label="Favorite pet" name="pet" isRequired>
    <Radio value="dogs">Dog</Radio>
    <Radio value="cats">Cat</Radio>
    <Radio value="dragon">Dragon</Radio>
  </RadioGroup>
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

## Disabled

```jsx
<RadioGroup label="Favorite avatar" isDisabled>
  <Radio value="wizard">Wizard</Radio>
  <Radio value="dragon">Dragon</Radio>
</RadioGroup>;

{
  /* Individual radio disabled */
}
<RadioGroup label="Favorite avatar">
  <Radio value="wizard">Wizard</Radio>
  <Radio value="dragon" isDisabled>
    Dragon
  </Radio>
</RadioGroup>;
```

## Read Only

```jsx
<RadioGroup label="Favorite avatar" defaultValue="wizard" isReadOnly>
  <Radio value="wizard">Wizard</Radio>
  <Radio value="dragon">Dragon</Radio>
</RadioGroup>
```

## Emphasized

```jsx
<RadioGroup label="Favorite avatar" defaultValue="dragon" isEmphasized>
  <Radio value="wizard">Wizard</Radio>
  <Radio value="dragon">Dragon</Radio>
</RadioGroup>
```

## RadioGroup Props

| Name                 | Type                                                              | Default      | Description                                                    |
| -------------------- | ----------------------------------------------------------------- | ------------ | -------------------------------------------------------------- |
| `children`           | `ReactElement<RadioProps> \| ReactElement<RadioProps>[]`          | --           | Radio elements contained within the group.                     |
| `isEmphasized`       | `boolean`                                                         | --           | Provides visual prominence with blue styling vs. default gray. |
| `orientation`        | `'vertical' \| 'horizontal'`                                      | `'vertical'` | Alignment axis for Radio elements.                             |
| `value`              | `string \| null`                                                  | --           | Current value (controlled).                                    |
| `defaultValue`       | `string \| null`                                                  | --           | Default value (uncontrolled).                                  |
| `isDisabled`         | `boolean`                                                         | --           | Disables the input.                                            |
| `isReadOnly`         | `boolean`                                                         | --           | Selection is immutable but focusable.                          |
| `name`               | `string`                                                          | --           | HTML form element name.                                        |
| `isRequired`         | `boolean`                                                         | --           | User input required before submission.                         |
| `isInvalid`          | `boolean`                                                         | --           | Marks input value as invalid.                                  |
| `validationBehavior` | `'aria' \| 'native'`                                              | `'aria'`     | Native HTML validation vs. ARIA marking.                       |
| `validate`           | `(value: string) => ValidationError \| true \| null \| undefined` | --           | Custom validation function.                                    |
| `label`              | `ReactNode`                                                       | --           | Label content.                                                 |
| `description`        | `ReactNode`                                                       | --           | Field hint or requirements.                                    |
| `errorMessage`       | `ReactNode \| (v: ValidationResult) => ReactNode`                 | --           | Error message text.                                            |
| `form`               | `string`                                                          | --           | Associated `<form>` id.                                        |
| `labelPosition`      | `'top' \| 'side'`                                                 | `'top'`      | Label position relative to group.                              |
| `labelAlign`         | `'start' \| 'end'`                                                | `'start'`    | Label horizontal alignment.                                    |
| `necessityIndicator` | `'icon' \| 'label'`                                               | `'icon'`     | Required/optional display method.                              |
| `contextualHelp`     | `ReactNode`                                                       | --           | ContextualHelp element next to label.                          |
| `showErrorIcon`      | `boolean`                                                         | --           | Renders error icon if present.                                 |

### RadioGroup Events

| Name            | Type                              | Description                       |
| --------------- | --------------------------------- | --------------------------------- |
| `onChange`      | `(value: string) => void`         | Triggered when selection changes. |
| `onFocus`       | `(e: FocusEvent<Target>) => void` | Element receives focus.           |
| `onBlur`        | `(e: FocusEvent<Target>) => void` | Element loses focus.              |
| `onFocusChange` | `(isFocused: boolean) => void`    | Focus status changes.             |

### RadioGroup Accessibility Props

| Name                | Type     | Description                          |
| ------------------- | -------- | ------------------------------------ |
| `id`                | `string` | Element's unique identifier.         |
| `aria-label`        | `string` | Labels the current element.          |
| `aria-labelledby`   | `string` | References labeling element id(s).   |
| `aria-describedby`  | `string` | References describing element id(s). |
| `aria-details`      | `string` | References detailed description.     |
| `aria-errormessage` | `string` | References error message element.    |

### Layout/Spacing/Sizing/Positioning Props (all Responsive)

Layout: `flex`, `flexGrow`, `flexShrink`, `flexBasis`, `alignSelf`, `justifySelf`, `order`, `gridArea`, `gridColumn`, `gridRow`, `gridColumnStart`, `gridColumnEnd`, `gridRowStart`, `gridRowEnd`

Spacing: `margin`, `marginTop`, `marginBottom`, `marginStart`, `marginEnd`, `marginX`, `marginY`

Sizing: `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`

Positioning: `position`, `top`, `bottom`, `left`, `right`, `start`, `end`, `zIndex`, `isHidden`

Advanced: `UNSAFE_className`, `UNSAFE_style`

## Radio Props

| Name         | Type        | Description                            |
| ------------ | ----------- | -------------------------------------- |
| `value`      | `string`    | Value used when submitting HTML forms. |
| `children`   | `ReactNode` | Label text/renderable node.            |
| `isDisabled` | `boolean`   | Disabled state; selection immutable.   |
| `autoFocus`  | `boolean`   | Receives focus on render.              |

### Radio Events

| Name            | Type                              | Description                            |
| --------------- | --------------------------------- | -------------------------------------- |
| `onFocus`       | `(e: FocusEvent<Target>) => void` | Element receives focus.                |
| `onBlur`        | `(e: FocusEvent<Target>) => void` | Element loses focus.                   |
| `onFocusChange` | `(isFocused: boolean) => void`    | Focus status changes.                  |
| `onKeyDown`     | `(e: KeyboardEvent) => void`      | Key press detected.                    |
| `onKeyUp`       | `(e: KeyboardEvent) => void`      | Key release detected.                  |
| `onPress`       | `(e: PressEvent) => void`         | Press released over target.            |
| `onPressStart`  | `(e: PressEvent) => void`         | Press interaction starts.              |
| `onPressEnd`    | `(e: PressEvent) => void`         | Press interaction ends.                |
| `onPressChange` | `(isPressed: boolean) => void`    | Press state changes.                   |
| `onPressUp`     | `(e: PressEvent) => void`         | Press released (regardless of target). |

## Accessibility

If a visible label isn't specified for a RadioGroup, an `aria-label` must be provided for accessibility. If labeled by a separate element, use `aria-labelledby` with the labeling element's id. Radio elements should always have visible labels.

## Internationalization

Localized strings should be passed to the `label` prop and Radio children. For RTL languages (Hebrew, Arabic), Radio automatically positions to the right of text. The `necessityIndicator="label"` prop provides automatic localization for "(required)" or "(optional)".
