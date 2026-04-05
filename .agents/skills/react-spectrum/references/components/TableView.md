<!-- Source: https://react-spectrum.adobe.com/react-spectrum/TableView.html -->
<!-- Last fetched: 2026-04-05 -->

# TableView

Tables are containers for displaying information. They allow users to quickly scan, sort, compare, and take action on large amounts of data.

```jsx
import {
  Cell,
  Column,
  Row,
  TableView,
  TableBody,
  TableHeader,
} from "@adobe/react-spectrum";

<TableView
  aria-label="Example table with static contents"
  selectionMode="multiple"
>
  <TableHeader>
    <Column>Name</Column>
    <Column>Type</Column>
    <Column align="end">Date Modified</Column>
  </TableHeader>
  <TableBody>
    <Row>
      <Cell>Games</Cell>
      <Cell>File folder</Cell>
      <Cell>6/7/2020</Cell>
    </Row>
    <Row>
      <Cell>Program Files</Cell>
      <Cell>File folder</Cell>
      <Cell>4/7/2021</Cell>
    </Row>
  </TableBody>
</TableView>;
```

## Dynamic Collections

```jsx
let columns = [
  { name: "Name", uid: "name" },
  { name: "Type", uid: "type" },
  { name: "Date Modified", uid: "date" },
];

let rows = [
  { id: 1, name: "Games", date: "6/7/2020", type: "File folder" },
  { id: 2, name: "Program Files", date: "4/7/2021", type: "File folder" },
  { id: 3, name: "bootmgr", date: "11/20/2010", type: "System file" },
  { id: 4, name: "log.txt", date: "1/18/2016", type: "Text Document" },
];

<TableView aria-label="Example table with dynamic content" maxWidth="size-6000">
  <TableHeader columns={columns}>
    {(column) => (
      <Column key={column.uid} align={column.uid === "date" ? "end" : "start"}>
        {column.name}
      </Column>
    )}
  </TableHeader>
  <TableBody items={rows}>
    {(item) => <Row>{(columnKey) => <Cell>{item[columnKey]}</Cell>}</Row>}
  </TableBody>
</TableView>;
```

## Selection

### Multiple Selection

```jsx
<TableView
  aria-label="Example table with multiple selection"
  selectionMode="multiple"
  defaultSelectedKeys={["2", "4"]}
>
  <TableHeader>
    <Column>Name</Column>
    <Column>Type</Column>
    <Column align="end">Level</Column>
  </TableHeader>
  <TableBody>
    <Row key="1">
      <Cell>Charizard</Cell>
      <Cell>Fire, Flying</Cell>
      <Cell>67</Cell>
    </Row>
    <Row key="2">
      <Cell>Blastoise</Cell>
      <Cell>Water</Cell>
      <Cell>56</Cell>
    </Row>
  </TableBody>
</TableView>
```

### Controlled Selection

```jsx
import type {Selection} from '@adobe/react-spectrum';

function PokemonTable(props) {
  let [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set([2]));

  return (
    <TableView
      aria-label="Table with controlled selection"
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      {...props}
    >
      {/* Table content */}
    </TableView>
  );
}
```

### Highlight Selection Style

```jsx
<PokemonTable selectionMode="multiple" selectionStyle="highlight" />
```

### Disabled Rows

```jsx
<PokemonTable selectionMode="multiple" disabledKeys={[3]} />
```

## Row Actions

```jsx
<TableView
  aria-label="Pokemon table with row actions"
  selectionMode="multiple"
  onAction={(key) => alert(`Opening item ${key}...`)}
>
  {/* Table content */}
</TableView>
```

### Row Links

```jsx
<TableView aria-label="Bookmarks" selectionMode="multiple">
  <TableHeader>
    <Column>Name</Column>
    <Column>URL</Column>
    <Column>Date added</Column>
  </TableHeader>
  <TableBody>
    <Row href="https://adobe.com/" target="_blank">
      <Cell>Adobe</Cell>
      <Cell>https://adobe.com/</Cell>
      <Cell>January 28, 2023</Cell>
    </Row>
  </TableBody>
</TableView>
```

## Asynchronous Loading

```jsx
import { useAsyncList } from "react-stately";

function AsyncTable() {
  let columns = [
    { name: "Name", key: "name" },
    { name: "Height", key: "height" },
    { name: "Mass", key: "mass" },
    { name: "Birth Year", key: "birth_year" },
  ];

  let list = useAsyncList({
    async load({ signal, cursor }) {
      if (cursor) {
        cursor = cursor.replace(/^http:\/\//i, "https://");
      }
      let res = await fetch(
        cursor || `https://swapi.py4e.com/api/people/?search=`,
        { signal },
      );
      let json = await res.json();
      return { items: json.results, cursor: json.next };
    },
  });

  return (
    <TableView aria-label="example async loading table" height="size-3000">
      <TableHeader columns={columns}>
        {(column) => (
          <Column align={column.key !== "name" ? "end" : "start"}>
            {column.name}
          </Column>
        )}
      </TableHeader>
      <TableBody
        items={list.items}
        loadingState={list.loadingState}
        onLoadMore={list.loadMore}
      >
        {(item) => (
          <Row key={item.name}>{(key) => <Cell>{item[key]}</Cell>}</Row>
        )}
      </TableBody>
    </TableView>
  );
}
```

## Sorting

```jsx
import { useCollator } from "@adobe/react-spectrum";

function AsyncSortTable() {
  let collator = useCollator({ numeric: true });

  let list = useAsyncList({
    async load({ signal }) {
      let res = await fetch(`https://swapi.py4e.com/api/people/?search`, {
        signal,
      });
      let json = await res.json();
      return { items: json.results };
    },
    async sort({ items, sortDescriptor }) {
      return {
        items: items.sort((a, b) => {
          let first = a[sortDescriptor.column];
          let second = b[sortDescriptor.column];
          let cmp = collator.compare(first, second);
          if (sortDescriptor.direction === "descending") {
            cmp *= -1;
          }
          return cmp;
        }),
      };
    },
  });

  return (
    <TableView
      aria-label="Example table with client side sorting"
      sortDescriptor={list.sortDescriptor}
      onSortChange={list.sort}
      height="size-3000"
    >
      <TableHeader>
        <Column key="name" allowsSorting>
          Name
        </Column>
        <Column key="height" allowsSorting>
          Height
        </Column>
        <Column key="mass" allowsSorting>
          Mass
        </Column>
        <Column key="birth_year" allowsSorting>
          Birth Year
        </Column>
      </TableHeader>
      <TableBody items={list.items} loadingState={list.loadingState}>
        {(item) => (
          <Row key={item.name}>
            {(columnKey) => <Cell>{item[columnKey]}</Cell>}
          </Row>
        )}
      </TableBody>
    </TableView>
  );
}
```

## Column Widths

```jsx
<TableView aria-label="Example table for column widths" maxWidth={320}>
  <TableHeader>
    <Column defaultWidth="1fr" align="start">
      Name
    </Column>
    <Column maxWidth={80}>Type</Column>
    <Column width={80}>Size</Column>
    <Column minWidth={100} align="end">
      Date Modified
    </Column>
  </TableHeader>
  <TableBody>
    <Row>
      <Cell>2021406_Proposal</Cell>
      <Cell>PDF</Cell>
      <Cell>86 KB</Cell>
      <Cell>April 12</Cell>
    </Row>
  </TableBody>
</TableView>
```

## Column Resizing

```jsx
<TableView
  aria-label="TableView with resizable columns"
  maxWidth={320}
  height={210}
>
  <TableHeader>
    <Column key="file" allowsResizing maxWidth={500}>
      File Name
    </Column>
    <Column key="size" width={80}>
      Size
    </Column>
    <Column key="date" allowsResizing minWidth={100}>
      Date Modified
    </Column>
  </TableHeader>
  <TableBody>
    <Row>
      <Cell>2022-Roadmap-Proposal-Revision-012822-Copy(2)</Cell>
      <Cell>214 KB</Cell>
      <Cell>November 27, 2022 at 4:56PM</Cell>
    </Row>
  </TableBody>
</TableView>
```

## Drag and Drop

```jsx
import { useDragAndDrop, useListData } from "@adobe/react-spectrum";

function DragIntoTable() {
  let columns = [
    { name: "Name", id: "name" },
    { name: "Type", id: "type" },
    { name: "Date Modified", id: "date" },
  ];

  let sourceList = useListData({
    initialItems: [
      { id: "1", type: "file", name: "Adobe Photoshop", date: "6/7/2020" },
      { id: "2", type: "file", name: "Adobe XD", date: "4/7/2021" },
    ],
  });

  let { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => {
        let item = sourceList.getItem(key);
        return {
          "custom-app-type": JSON.stringify(item),
          "text/plain": item.name,
        };
      }),
  });

  return (
    <TableView
      aria-label="Draggable TableView"
      selectionMode="multiple"
      width="size-5000"
      height="size-2400"
      dragAndDropHooks={dragAndDropHooks}
    >
      <TableHeader columns={columns}>
        {(column) => (
          <Column
            key={column.id}
            align={column.id === "date" ? "end" : "start"}
          >
            {column.name}
          </Column>
        )}
      </TableHeader>
      <TableBody items={sourceList.items}>
        {(item) => <Row>{(columnKey) => <Cell>{item[columnKey]}</Cell>}</Row>}
      </TableBody>
    </TableView>
  );
}
```

## Layout

TableView should not be placed in a scrollable container. Use Flex for proper layout:

```jsx
<Flex height="size-5000" width="100%" direction="column" gap="size-150">
  <ActionButton alignSelf="start">Add</ActionButton>
  <TableView flex aria-label="Example table">
    {/* Table content */}
  </TableView>
</Flex>
```

## Row Headers

```jsx
<TableView aria-label="Example table with static contents">
  <TableHeader>
    <Column isRowHeader>First Name</Column>
    <Column isRowHeader>Last Name</Column>
    <Column align="end">Age</Column>
  </TableHeader>
  <TableBody>
    <Row>
      <Cell>John</Cell>
      <Cell>Doe</Cell>
      <Cell>45</Cell>
    </Row>
  </TableBody>
</TableView>
```

## TableView Props

| Name                     | Type                                              | Default      | Description                     |
| ------------------------ | ------------------------------------------------- | ------------ | ------------------------------- |
| `aria-label`             | `string`                                          | required     | Accessible label for the table. |
| `aria-labelledby`        | `string`                                          | --           | ID of labeling element.         |
| `selectionMode`          | `'none' \| 'single' \| 'multiple'`                | `'none'`     | Selection behavior.             |
| `selectedKeys`           | `Set<string> \| 'all'`                            | --           | Controlled selected row keys.   |
| `defaultSelectedKeys`    | `Set<string> \| 'all'`                            | --           | Default selected rows.          |
| `onSelectionChange`      | `(keys: Selection) => void`                       | --           | Selection change callback.      |
| `disabledKeys`           | `Iterable<string>`                                | --           | Keys of disabled rows.          |
| `disallowEmptySelection` | `boolean`                                         | `false`      | Prevent deselecting all rows.   |
| `selectionStyle`         | `'checkbox' \| 'highlight'`                       | `'checkbox'` | Visual selection style.         |
| `sortDescriptor`         | `SortDescriptor`                                  | --           | Current sort state.             |
| `onSortChange`           | `(desc: SortDescriptor) => void`                  | --           | Sort change callback.           |
| `onAction`               | `(key: string) => void`                           | --           | Row action callback.            |
| `onResize`               | `(widths: Map) => void`                           | --           | Column resize callback.         |
| `onResizeEnd`            | `(widths: Map) => void`                           | --           | Column resize end callback.     |
| `dragAndDropHooks`       | `DragAndDropHooks`                                | --           | Drag and drop configuration.    |
| `loadingState`           | `'loading' \| 'loadingMore' \| 'idle' \| 'error'` | `'idle'`     | Async load state.               |
| `onLoadMore`             | `() => void`                                      | --           | Infinite scroll callback.       |
| `width`                  | `string \| number`                                | --           | Table width.                    |
| `height`                 | `string \| number`                                | --           | Table height.                   |
| `maxWidth`               | `string \| number`                                | --           | Maximum width.                  |
| `flex`                   | `boolean \| string \| number`                     | --           | Flex grow value.                |

## Column Props

| Name             | Type                           | Default   | Description                          |
| ---------------- | ------------------------------ | --------- | ------------------------------------ |
| `key`            | `string`                       | required  | Unique column identifier.            |
| `align`          | `'start' \| 'center' \| 'end'` | `'start'` | Content alignment.                   |
| `isRowHeader`    | `boolean`                      | `false`   | Use as row header for accessibility. |
| `allowsSorting`  | `boolean`                      | `false`   | Enable column sorting.               |
| `allowsResizing` | `boolean`                      | `false`   | Enable column resizing.              |
| `width`          | `string \| number`             | --        | Fixed column width.                  |
| `defaultWidth`   | `string \| number`             | --        | Initial uncontrolled width.          |
| `minWidth`       | `string \| number`             | --        | Minimum column width.                |
| `maxWidth`       | `string \| number`             | --        | Maximum column width.                |

## Row Props

| Name     | Type     | Default  | Description                    |
| -------- | -------- | -------- | ------------------------------ |
| `key`    | `string` | required | Unique row identifier.         |
| `href`   | `string` | --       | Link destination URL.          |
| `target` | `string` | --       | Link target (e.g., '\_blank'). |

## Cell Props

| Name      | Type     | Default | Description                |
| --------- | -------- | ------- | -------------------------- |
| `colSpan` | `number` | `1`     | Number of columns spanned. |

## Events

| Name                | Type                             | Description                                          |
| ------------------- | -------------------------------- | ---------------------------------------------------- |
| `onSelectionChange` | `(keys: Selection) => void`      | Fires when selected rows change.                     |
| `onSortChange`      | `(desc: SortDescriptor) => void` | Fires when sort column/direction changes.            |
| `onAction`          | `(key: string) => void`          | Fires when a row is activated.                       |
| `onResize`          | `(widths: Map) => void`          | Fires during column resizing.                        |
| `onResizeEnd`       | `(widths: Map) => void`          | Fires when column resizing completes.                |
| `onLoadMore`        | `() => void`                     | Fires when reaching scroll end for infinite loading. |

## Accessibility

Customize which columns serve as row headers using `isRowHeader` on Column. An `aria-label` must be provided to the TableView.

## Internationalization

Text content within TableView supports localization. For RTL languages (Hebrew, Arabic), layout automatically flips.
