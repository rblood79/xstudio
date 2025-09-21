# xstudio Project Analysis Report
Generated on: Sun Sep 21 07:36:17 UTC 2025

## Project Structure
src/
├── .DS_Store
├── App.css
├── App.tsx
├── assets
│   └── react.svg
├── auth
│   ├── Signin.tsx
│   ├── index.css
│   └── index.tsx
├── builder
│   ├── .DS_Store
│   ├── ai
│   │   ├── index.css
│   │   └── index.tsx
│   ├── components
│   │   ├── Button.tsx
│   │   ├── Calendar.tsx
│   │   ├── Card.tsx
│   │   ├── Checkbox.tsx
│   │   ├── CheckboxGroup.tsx
│   │   ├── ComboBox.tsx
│   │   ├── ComponentList.css
│   │   ├── ComponentList.tsx
│   │   ├── DateField.tsx
│   │   ├── DatePicker.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── Dialog.tsx
│   │   ├── DynamicComponentLoader.tsx
│   │   ├── Field.tsx
│   │   ├── Form.tsx
│   │   ├── GridList.tsx
│   │   ├── ListBox.tsx
│   │   ├── Modal.tsx
│   │   ├── Panel.tsx
│   │   ├── Popover.tsx
│   │   ├── Radio.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── Select.tsx
│   │   ├── Slider.tsx
│   │   ├── Switch.tsx
│   │   ├── Table.tsx
│   │   ├── Tabs.tsx
│   │   ├── TagGroup.tsx
│   │   ├── TextField.tsx
│   │   ├── TimeField.tsx
│   │   ├── ToggleButton.tsx
│   │   ├── ToggleButtonGroup.tsx
│   │   ├── Tree.tsx
│   │   ├── components.css
│   │   ├── index.css
│   │   ├── index.tsx
│   │   ├── list.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── dataset
│   │   ├── index.css
│   │   └── index.tsx
│   ├── factories
│   │   └── ComponentFactory.ts
│   ├── monitor
│   │   ├── index.css
│   │   └── index.tsx
│   ├── hooks
│   │   ├── useElementCreator.ts
│   │   ├── useErrorHandler.ts
│   │   ├── useIframeMessenger.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useMemoryMonitor.ts
│   │   ├── usePageManager.ts
│   │   ├── useThemeManager.ts
│   │   └── useValidation.ts
│   ├── index.tsx
│   ├── inspector
│   │   ├── design
│   │   │   ├── index.css
│   │   │   └── index.tsx
│   │   ├── events
│   │   │   ├── index.css
│   │   │   └── index.tsx
│   │   ├── index.css
│   │   ├── index.tsx
│   │   └── properties
│   │       ├── PropertyPanel.tsx
│   │       ├── components
│   │       │   ├── PropertyCheckbox.tsx
│   │       │   ├── PropertyFieldset.tsx
│   │       │   ├── PropertyInput.tsx
│   │       │   ├── PropertySelect.tsx
│   │       │   └── index.ts
│   │       ├── editors
│   │       │   ├── ButtonEditor.tsx
│   │       │   ├── CardEditor.tsx
│   │       │   ├── CheckboxEditor.tsx
│   │       │   ├── CheckboxGroupEditor.tsx
│   │       │   ├── ComboBoxEditor.tsx
│   │       │   ├── ComboBoxItemEditor.tsx
│   │       │   ├── GridListEditor.tsx
│   │       │   ├── GridListItemEditor.tsx
│   │       │   ├── ListBoxEditor.tsx
│   │       │   ├── ListBoxItemEditor.tsx
│   │       │   ├── PanelEditor.tsx
│   │       │   ├── RadioEditor.tsx
│   │       │   ├── RadioGroupEditor.tsx
│   │       │   ├── SelectEditor.tsx
│   │       │   ├── SelectItemEditor.tsx
│   │       │   ├── SliderEditor.tsx
│   │       │   ├── SwitchEditor.tsx
│   │       │   ├── TabEditor.tsx
│   │       │   ├── TableEditor.tsx
│   │       │   ├── TabsEditor.tsx
│   │       │   ├── TagEditor.tsx
│   │       │   ├── TagGroupEditor.tsx
│   │       │   ├── TextFieldEditor.tsx
│   │       │   ├── ToggleButtonEditor.tsx
│   │       │   ├── ToggleButtonGroupEditor.tsx
│   │       │   ├── TreeEditor.tsx
│   │       │   ├── TreeItemEditor.tsx
│   │       │   └── index.ts
│   │       ├── index.css
│   │       ├── index.tsx
│   │       └── types
│   │           └── editorTypes.ts
│   ├── library
│   │   ├── index.css
│   │   └── index.tsx
│   ├── main
│   │   ├── BuilderCore-original.tsx
│   │   ├── BuilderCore.tsx
│   │   ├── BuilderHeader.tsx
│   │   ├── BuilderViewport.tsx
│   │   ├── BuilderWorkspace.tsx
│   │   ├── index.css
│   │   └── index.ts
│   ├── nodes
│   │   ├── Layers.tsx
│   │   ├── Pages.tsx
│   │   ├── index.css
│   │   └── index.tsx
│   ├── overlay
│   │   ├── index.css
│   │   └── index.tsx
│   ├── preview
│   │   ├── index.module.css
│   │   └── index.tsx
│   ├── setting
│   │   ├── index.css
│   │   └── index.tsx
│   ├── sidebar
│   │   ├── SidebarNav.tsx
│   │   ├── index.css
│   │   └── index.tsx
│   ├── stores
│   │   ├── commandDataStore.ts
│   │   ├── elements.ts
│   │   ├── history.ts
│   │   ├── index.ts
│   │   ├── memoryMonitor.ts
│   │   ├── selection.ts
│   │   └── theme.ts
│   ├── theme
│   │   ├── ColorPicker.tsx
│   │   ├── ColorSpectrum.tsx
│   │   ├── ThemeEditor.css
│   │   ├── ThemeEditor.tsx
│   │   ├── ThemeInitializer.tsx
│   │   ├── components
│   │   │   ├── ThemeHeader.tsx
│   │   │   ├── ThemePreview.tsx
│   │   │   ├── TokenForm.tsx
│   │   │   └── TokenList.tsx
│   │   ├── cssVars.ts
│   │   ├── index.css
│   │   ├── index.tsx
│   │   └── themeApi.ts
│   ├── user
│   │   ├── index.css
│   │   └── index.tsx
│   └── utils
│       ├── HierarchyManager.ts
│       └── memoryMonitor.ts
├── dashboard
│   ├── index.css
│   └── index.tsx
├── demo
│   └── HistoryDemo.tsx
├── env
│   └── supabase.client.ts
├── hooks
│   └── useTheme.ts
├── index.css
├── main.tsx
├── services
│   └── api
│       ├── BaseApiService.ts
│       ├── ElementsApiService.ts
│       ├── ErrorHandler.ts
│       ├── PagesApiService.ts
│       ├── ProjectsApiService.ts
│       └── index.ts
├── stories
│   ├── Button.stories.tsx
│   ├── Button.tsx
│   ├── Configure.mdx
│   ├── Form.stories.tsx
│   ├── Header.stories.ts
│   ├── Header.tsx
│   ├── ListBox.stories.tsx
│   ├── Page.stories.ts
│   ├── Page.tsx
│   ├── Popover.stories.tsx
│   ├── RadioGroup.stories.tsx
│   ├── Select.stories.tsx
│   ├── TextField.stories.tsx
│   ├── ToggleButton.stories.tsx
│   ├── ToggleButtonGroup.stories.tsx
│   ├── assets
│   │   ├── accessibility.png
│   │   ├── accessibility.svg
│   │   ├── addon-library.png
│   │   ├── assets.png
│   │   ├── avif-test-image.avif
│   │   ├── context.png
│   │   ├── discord.svg
│   │   ├── docs.png
│   │   ├── figma-plugin.png
│   │   ├── github.svg
│   │   ├── share.png
│   │   ├── styling.png
│   │   ├── testing.png
│   │   ├── theming.png
│   │   ├── tutorials.svg
│   │   └── youtube.svg
│   ├── header.css
│   └── page.css
├── types
│   ├── componentProps.ts
│   ├── events.ts
│   ├── store.ts
│   ├── supabase.ts
│   ├── theme.ts
│   └── unified.ts
├── utils
│   ├── elementUtils.ts
│   ├── eventEngine.ts
│   ├── eventHandlers.ts
│   ├── iframeMessenger.ts
│   ├── labels.ts
│   ├── messaging.ts
│   ├── style.ts
│   ├── themeUtils.ts
│   └── uiConstants.ts
└── vite-env.d.ts

39 directories, 214 files

## Package.json Dependencies
{
  "dependencies": {
    "@lucide/lab": "^0.1.2",
    "@storybook/addon-interactions": "^8.6.12",
    "@supabase/supabase-js": "^2.49.1",
    "@tailwindcss/forms": "^0.5.10",
    "@tailwindcss/postcss": "^4.1.3",
    "autoprefixer": "^10.4.21",
    "clsx": "^2.1.1",
    "immer": "^10.1.1",
    "lodash": "^4.17.21",
    "lucide-react": "^0.542.0",
    "postcss": "^8.5.3",
    "pretendard": "^1.3.9",
    "react": "^19.0.0",
    "react-aria-components": "^1.7.1",
    "react-dom": "^19.0.0",
    "react-router": "^7.3.0",
    "react-router-dom": "^7.4.0",
    "tailwind-merge": "^3.2.0",
    "tailwind-variants": "^1.0.0",
    "tailwindcss": "^4.1.3",
    "tailwindcss-react-aria-components": "^2.0.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@chromatic-com/storybook": "^3.2.6",
    "@eslint/js": "^9.21.0",
    "@storybook/addon-essentials": "^8.6.12",
    "@storybook/addon-onboarding": "^8.6.12",
    "@storybook/blocks": "^8.6.12",
    "@storybook/experimental-addon-test": "^8.6.12",
    "@storybook/react": "^8.6.12",
    "@storybook/react-vite": "^8.6.12",
    "@storybook/test": "^8.6.12",
    "@types/lodash": "^4.17.16",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react-swc": "^3.8.0",
    "@vitest/browser": "^3.1.1",
    "@vitest/coverage-v8": "^3.1.1",
    "eslint": "^9.21.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "eslint-plugin-storybook": "^0.12.0",
    "globals": "^15.15.0",
    "playwright": "^1.51.1",
    "storybook": "^8.6.12",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.24.1",
    "vite": "^6.2.0",
    "vitest": "^3.1.1"
  }
}

## File Patterns
     19 index.tsx
     19 index.css
      5 index.ts
      2 theme.ts
      2 memoryMonitor.ts
      2 Button.tsx
      2 .DS_Store
      1 youtube.svg
      1 vite-env.d.ts
      1 utils.ts
      1 useValidation.ts
      1 useThemeManager.ts
      1 useTheme.ts
      1 usePageManager.ts
      1 useMemoryMonitor.ts
      1 useKeyboardShortcuts.ts
      1 useIframeMessenger.ts
      1 useErrorHandler.ts
      1 useElementCreator.ts
      1 unified.ts
      1 uiConstants.ts
      1 types.ts
      1 tutorials.svg
      1 theming.png
      1 themeUtils.ts
      1 themeApi.ts
      1 testing.png
      1 supabase.ts
      1 supabase.client.ts
      1 styling.png
      1 style.ts
      1 store.ts
      1 share.png
      1 selection.ts
      1 react.svg
      1 page.css
      1 messaging.ts
      1 main.tsx
      1 list.ts
      1 labels.ts
      1 index.module.css
      1 iframeMessenger.ts
      1 history.ts
      1 header.css
      1 github.svg
      1 figma-plugin.png
      1 events.ts
      1 eventHandlers.ts
      1 eventEngine.ts
      1 elements.ts
      1 elementUtils.ts
      1 editorTypes.ts
      1 docs.png
      1 discord.svg
      1 cssVars.ts
      1 context.png
      1 components.css
      1 componentProps.ts
      1 commandDataStore.ts
      1 avif-test-image.avif
      1 assets.png
      1 addon-library.png
      1 accessibility.svg
      1 accessibility.png
      1 TreeItemEditor.tsx
      1 TreeEditor.tsx
      1 Tree.tsx
      1 TokenList.tsx
      1 TokenForm.tsx
      1 ToggleButtonGroupEditor.tsx
      1 ToggleButtonGroup.tsx
      1 ToggleButtonGroup.stories.tsx
      1 ToggleButtonEditor.tsx
      1 ToggleButton.tsx
      1 ToggleButton.stories.tsx
      1 TimeField.tsx
      1 ThemePreview.tsx
      1 ThemeInitializer.tsx
      1 ThemeHeader.tsx
      1 ThemeEditor.tsx
      1 ThemeEditor.css
      1 TextFieldEditor.tsx
      1 TextField.tsx
      1 TextField.stories.tsx
      1 TagGroupEditor.tsx
      1 TagGroup.tsx
      1 TagEditor.tsx
      1 TabsEditor.tsx
      1 Tabs.tsx
      1 TableEditor.tsx
      1 Table.tsx
      1 TabEditor.tsx
      1 SwitchEditor.tsx
      1 Switch.tsx
      1 SliderEditor.tsx
      1 Slider.tsx
      1 Signin.tsx
      1 SidebarNav.tsx
      1 SelectItemEditor.tsx
      1 SelectEditor.tsx
      1 Select.tsx
      1 Select.stories.tsx
      1 RadioGroupEditor.tsx
      1 RadioGroup.tsx
      1 RadioGroup.stories.tsx
      1 RadioEditor.tsx
      1 Radio.tsx
      1 PropertySelect.tsx
      1 PropertyPanel.tsx
      1 PropertyInput.tsx
      1 PropertyFieldset.tsx
      1 PropertyCheckbox.tsx
      1 ProjectsApiService.ts
      1 Popover.tsx
      1 Popover.stories.tsx
      1 PanelEditor.tsx
      1 Panel.tsx
      1 PagesApiService.ts
      1 Pages.tsx
      1 Page.tsx
      1 Page.stories.ts
      1 Modal.tsx
      1 ListBoxItemEditor.tsx
      1 ListBoxEditor.tsx
      1 ListBox.tsx
      1 ListBox.stories.tsx
      1 Layers.tsx
      1 HistoryDemo.tsx
      1 HierarchyManager.ts
      1 Header.tsx
      1 Header.stories.ts
      1 GridListItemEditor.tsx
      1 GridListEditor.tsx
      1 GridList.tsx
      1 Form.tsx
      1 Form.stories.tsx
      1 Field.tsx
      1 ErrorHandler.ts
      1 ElementsApiService.ts
      1 DynamicComponentLoader.tsx
      1 Dialog.tsx
      1 DateRangePicker.tsx
      1 DatePicker.tsx
      1 DateField.tsx
      1 Configure.mdx
      1 ComponentList.tsx
      1 ComponentList.css
      1 ComponentFactory.ts
      1 ComboBoxItemEditor.tsx
      1 ComboBoxEditor.tsx
      1 ComboBox.tsx
      1 ColorSpectrum.tsx
      1 ColorPicker.tsx
      1 CheckboxGroupEditor.tsx
      1 CheckboxGroup.tsx
      1 CheckboxEditor.tsx
      1 Checkbox.tsx
      1 CardEditor.tsx
      1 Card.tsx
      1 Calendar.tsx
      1 ButtonEditor.tsx
      1 Button.stories.tsx
      1 BuilderWorkspace.tsx
      1 BuilderViewport.tsx
      1 BuilderHeader.tsx
      1 BuilderCore.tsx
      1 BuilderCore-original.tsx
      1 BaseApiService.ts
      1 App.tsx
      1 App.css
