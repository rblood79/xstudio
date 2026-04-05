<!-- Source: https://react-spectrum.adobe.com/react-spectrum/Calendar.html -->
<!-- Last fetched: 2026-04-05 -->

# Calendar

## Description

Calendars display a grid of days in one or more months and allow users to select a single date. Supports multiple calendar systems, international localization, and customizable date validation.

**Version:** Added in 3.19.0

## Installation

```bash
yarn add @adobe/react-spectrum
```

```jsx
import { Calendar } from "@adobe/react-spectrum";
```

## Usage Examples

### Basic

```jsx
<Calendar aria-label="Event date" />
```

### Controlled and Uncontrolled

```jsx
import { parseDate } from "@internationalized/date";

function Example() {
  let [value, setValue] = React.useState(parseDate("2020-02-03"));

  return (
    <Flex gap="size-300" wrap>
      <Calendar
        aria-label="Date (uncontrolled)"
        defaultValue={parseDate("2020-02-03")}
      />
      <Calendar
        aria-label="Date (controlled)"
        value={value}
        onChange={setValue}
      />
    </Flex>
  );
}
```

### International Calendar Systems

```jsx
import { Provider } from "@adobe/react-spectrum";

function Example() {
  let [date, setDate] = React.useState(null);
  return (
    <Provider locale="hi-IN-u-ca-indian">
      <Calendar aria-label="Date" value={date} onChange={setDate} />
      <p>Selected date: {date?.toString()}</p>
    </Provider>
  );
}
```

### Date Range Validation

```jsx
import { isWeekend, today, getLocalTimeZone } from "@internationalized/date";
import { useLocale } from "@adobe/react-spectrum";

function Example() {
  let now = today(getLocalTimeZone());
  let disabledRanges = [
    [now, now.add({ days: 5 })],
    [now.add({ days: 14 }), now.add({ days: 16 })],
  ];

  let { locale } = useLocale();
  let isDateUnavailable = (date) =>
    isWeekend(date, locale) ||
    disabledRanges.some(
      (interval) =>
        date.compare(interval[0]) >= 0 && date.compare(interval[1]) <= 0,
    );

  return (
    <Calendar
      aria-label="Appointment date"
      minValue={today(getLocalTimeZone())}
      isDateUnavailable={isDateUnavailable}
    />
  );
}
```

### Controlled Focus

```jsx
import { CalendarDate } from "@internationalized/date";

function Example() {
  let defaultDate = new CalendarDate(2021, 7, 1);
  let [focusedDate, setFocusedDate] = React.useState(defaultDate);

  return (
    <Flex direction="column" alignItems="start" gap="size-200">
      <ActionButton onPress={() => setFocusedDate(defaultDate)}>
        Reset focused date
      </ActionButton>
      <Calendar focusedValue={focusedDate} onFocusChange={setFocusedDate} />
    </Flex>
  );
}
```

### Multiple Visible Months

```jsx
<Calendar aria-label="Event date" visibleMonths={3} />
```

### Disabled / Read-Only

```jsx
<Calendar aria-label="Event date" isDisabled />

<Calendar
  aria-label="Event date"
  value={today(getLocalTimeZone())}
  isReadOnly
/>
```

## Props API

| Name                  | Type                                                          | Default     | Description                                                |
| --------------------- | ------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `value`               | `DateValue \| null`                                           | --          | Current selected date (controlled)                         |
| `defaultValue`        | `DateValue \| null`                                           | --          | Initial selected date (uncontrolled)                       |
| `visibleMonths`       | `number`                                                      | `1`         | Number of months to display simultaneously (1-3 supported) |
| `createCalendar`      | `(identifier: CalendarIdentifier) => Calendar`                | --          | Function to create Calendar instance for given identifier  |
| `minValue`            | `DateValue \| null`                                           | --          | Earliest selectable date                                   |
| `maxValue`            | `DateValue \| null`                                           | --          | Latest selectable date                                     |
| `isDateUnavailable`   | `(date: DateValue) => boolean`                                | --          | Callback to mark specific dates as unavailable             |
| `isDisabled`          | `boolean`                                                     | `false`     | Disables all interactions                                  |
| `isReadOnly`          | `boolean`                                                     | `false`     | Prevents value changes while maintaining focusability      |
| `autoFocus`           | `boolean`                                                     | `false`     | Automatically focuses on mount                             |
| `focusedValue`        | `DateValue \| null`                                           | --          | Controls which date has focus                              |
| `defaultFocusedValue` | `DateValue \| null`                                           | --          | Initial focused date (uncontrolled)                        |
| `isInvalid`           | `boolean`                                                     | --          | Marks current selection as invalid                         |
| `errorMessage`        | `ReactNode`                                                   | --          | Error message displayed when invalid                       |
| `pageBehavior`        | `'visible' \| 'single'`                                       | `'visible'` | Pagination advances by visible months or single month      |
| `firstDayOfWeek`      | `'sun' \| 'mon' \| 'tue' \| 'wed' \| 'thu' \| 'fri' \| 'sat'` | --          | Week start day (locale-dependent if unset)                 |
| `selectionAlignment`  | `'start' \| 'center' \| 'end'`                                | `'center'`  | Alignment of visible months relative to selection          |
| `id`                  | `string`                                                      | --          | Unique element identifier                                  |
| `aria-label`          | `string`                                                      | --          | Accessible label (required)                                |
| `aria-labelledby`     | `string`                                                      | --          | ID of labeling element                                     |
| `aria-describedby`    | `string`                                                      | --          | ID of describing element                                   |
| `aria-details`        | `string`                                                      | --          | ID of detailed description                                 |
| `UNSAFE_className`    | `string`                                                      | --          | CSS class name (last resort)                               |
| `UNSAFE_style`        | `CSSProperties`                                               | --          | Inline styles (last resort)                                |

(layout props omitted)

## Events

| Name            | Type                                          | Description                     |
| --------------- | --------------------------------------------- | ------------------------------- |
| `onChange`      | `(value: MappedDateValue<DateValue>) => void` | Fired when user selects a date  |
| `onFocusChange` | `(date: CalendarDate) => void`                | Fired when focused date changes |

## Date Value Types

The component accepts and returns date objects from the `@internationalized/date` package:

- **CalendarDate:** Date without time component
- **CalendarDateTime:** Date with time (time uneditable in Calendar)
- **ZonedDateTime:** Date and time with timezone

All returned dates preserve the type of the initial `value`/`defaultValue` prop, maintaining time components if provided.

## Accessibility

- **Required:** An `aria-label` must be provided for screen reader support
- **Alternative:** Use `aria-labelledby` with ID of labeling element
- **Internationalization:** Layout automatically flips for RTL languages; dates format according to user locale
- **Keyboard Navigation:** Full keyboard support for date selection and month navigation
- **Focus Management:** Respects `autoFocus` prop and maintains focus state
